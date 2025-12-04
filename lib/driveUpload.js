import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Create OAuth2 client with user's access token
 * @param {string} accessToken - User's OAuth access token from session
 */
function getOAuthClient(accessToken) {
  if (!accessToken) {
    throw new Error('No access token provided. User must be logged in.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

/**
 * Find or create a folder in Google Drive
 * @param {object} drive - Google Drive API client
 * @param {string} folderName - Name of the folder to find/create
 * @param {string} parentId - Optional parent folder ID
 * @returns {string} Folder ID
 */
async function findOrCreateFolder(drive, folderName, parentId = null) {
  // Search for existing folder
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Create new folder
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentId) {
    folderMetadata.parents = [parentId];
  }

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });

  return folder.data.id;
}

/**
 * Convert base64 data URL to buffer
 * @param {string} dataUrl - Base64 data URL (e.g., "data:image/png;base64,...")
 * @returns {object} { buffer, mimeType }
 */
function dataUrlToBuffer(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  return { buffer, mimeType };
}

/**
 * Upload a sketch (floor plan) to Google Drive
 * @param {string} sketchDataUrl - Base64 data URL of the sketch
 * @param {string} fileName - Name for the file (without extension)
 * @param {string} accessToken - User's OAuth access token
 * @returns {object} { fileId, directUrl, fileName }
 */
export async function uploadSketchToDrive(sketchDataUrl, fileName, accessToken) {
  if (!sketchDataUrl) {
    throw new Error('No sketch data provided');
  }

  const UPLOAD_TIMEOUT = 30000; // 30 second timeout

  try {
    const auth = getOAuthClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    // Wrap upload in timeout to prevent indefinite hangs
    const uploadWithTimeout = async () => {
      // Convert data URL to buffer
      const { buffer, mimeType } = dataUrlToBuffer(sketchDataUrl);

      // Find or create the Turnovers_Sketches folder
      const folderId = await findOrCreateFolder(drive, 'Turnovers_Sketches');

      // Create readable stream from buffer
      const bufferStream = new Readable();
      bufferStream.push(buffer);
      bufferStream.push(null);

      // Upload file
      const file = await drive.files.create({
        requestBody: {
          name: `${fileName}.png`,
          parents: [folderId]
        },
        media: {
          mimeType: mimeType,
          body: bufferStream
        },
        fields: 'id, webViewLink'
      });

      const fileId = file.data.id;

      // Set file to be viewable by anyone with the link
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return fileId;
    };

    // Race between upload and timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Sketch upload timeout (${UPLOAD_TIMEOUT/1000}s)`)), UPLOAD_TIMEOUT);
    });

    const fileId = await Promise.race([uploadWithTimeout(), timeoutPromise]);
    
    // Get the direct download URL for embedding in Sheets
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return {
      fileId: fileId,
      directUrl: directUrl,
      fileName: `${fileName}.png`
    };

  } catch (error) {
    console.error('Drive upload error:', error);
    throw new Error(`Failed to upload sketch: ${error.message}`);
  }
}

/**
 * Upload multiple photos to Google Drive with progress tracking
 * 
 * Key lessons from production photo upload systems:
 * - Upload photos separately (not embedded in JSON)
 * - Add delays between uploads to prevent rate limiting/hanging
 * - Add timeouts to prevent indefinite hangs
 * - Continue on individual failures
 * 
 * @param {Array} photos - Array of photo objects { url, name, caption }
 * @param {string} workOrderNumber - Work order for folder organization
 * @param {string} accessToken - User's OAuth access token
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Array} Array of { fileId, directUrl, fileName, caption }
 */
export async function uploadPhotosToDrive(photos, workOrderNumber, accessToken, onProgress = null) {
  if (!photos || photos.length === 0) {
    return [];
  }

  const results = [];
  const DELAY_BETWEEN_UPLOADS = 500; // 500ms delay to prevent rate limiting/hanging
  const UPLOAD_TIMEOUT = 30000; // 30 second timeout per photo

  try {
    const auth = getOAuthClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    // Find or create the parent folder structure once
    const parentFolderId = await findOrCreateFolder(drive, 'Turnovers_Photos');
    const workOrderFolderId = await findOrCreateFolder(
      drive, 
      workOrderNumber || 'Unassigned', 
      parentFolderId
    );

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      // Update progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: photos.length,
          photoName: photo.name
        });
      }

      try {
        // Generate a clean filename with index
        const extension = photo.name?.split('.').pop() || 'jpg';
        const baseName = photo.name?.replace(/\.[^/.]+$/, '') || 'photo';
        const fileName = `${workOrderNumber}_${String(i + 1).padStart(2, '0')}_${baseName}.${extension}`;

        // Wrap upload in timeout to prevent indefinite hangs
        const uploadWithTimeout = async () => {
          // Convert data URL to buffer
          const { buffer, mimeType } = dataUrlToBuffer(photo.url);

          // Create readable stream from buffer
          const bufferStream = new Readable();
          bufferStream.push(buffer);
          bufferStream.push(null);

          // Upload file
          const file = await drive.files.create({
            requestBody: {
              name: fileName,
              parents: [workOrderFolderId],
              description: photo.caption || ''
            },
            media: {
              mimeType: mimeType,
              body: bufferStream
            },
            fields: 'id, webViewLink'
          });

          const fileId = file.data.id;

          // Set file to be viewable by anyone with the link
          await drive.permissions.create({
            fileId: fileId,
            requestBody: {
              role: 'reader',
              type: 'anyone'
            }
          });

          return fileId;
        };

        // Race between upload and timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Photo upload timeout (${UPLOAD_TIMEOUT/1000}s)`)), UPLOAD_TIMEOUT);
        });

        const fileId = await Promise.race([uploadWithTimeout(), timeoutPromise]);
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        results.push({
          fileId: fileId,
          directUrl: directUrl,
          fileName: fileName,
          originalName: photo.name,
          caption: photo.caption || ''
        });

        // Add delay before next upload (except for last one)
        if (i < photos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_UPLOADS));
        }

      } catch (photoError) {
        console.error(`Failed to upload photo ${photo.name}:`, photoError.message);
        // Continue with remaining photos - don't fail entire batch
        results.push({
          fileName: photo.name,
          error: photoError.message
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Photo batch upload error:', error);
    throw new Error(`Failed to upload photos: ${error.message}`);
  }
}

/**
 * Test Drive connection and permissions
 * @param {string} accessToken - User's OAuth access token
 * @returns {object} { success, folderId, error }
 */
export async function testDriveConnection(accessToken) {
  try {
    const auth = getOAuthClient(accessToken);
    const drive = google.drive({ version: 'v3', auth });

    // Try to list files (just to test connection)
    await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)'
    });

    // Try to find/create the sketches folder
    const folderId = await findOrCreateFolder(drive, 'Turnovers_Sketches');

    return {
      success: true,
      sketchesFolderId: folderId
    };
  } catch (error) {
    console.error('Drive connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
