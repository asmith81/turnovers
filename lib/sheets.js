import { google } from 'googleapis';
import { uploadSketchToDrive, uploadPhotosToDrive } from './driveUpload';

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
 * Find a sheet by name and return its sheetId
 */
async function findSheetByName(sheets, spreadsheetId, sheetName) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets.find(
    s => s.properties.title === sheetName
  );
  return sheet ? sheet.properties.sheetId : null;
}

/**
 * Duplicate a sheet and rename it
 */
async function duplicateSheet(sheets, spreadsheetId, sourceSheetId, newName) {
  const duplicateResponse = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        duplicateSheet: {
          sourceSheetId: sourceSheetId,
          insertSheetIndex: 1,
          newSheetName: newName
        }
      }]
    }
  });

  const newSheetId = duplicateResponse.data.replies[0].duplicateSheet.properties.sheetId;
  return newSheetId;
}

/**
 * Sanitize sheet name to be valid for Google Sheets
 */
function sanitizeSheetName(name) {
  if (!name || typeof name !== 'string') {
    return `WO-${Date.now()}`;
  }
  
  let sanitized = name.replace(/['*?:/\\[\]]/g, '-');
  sanitized = sanitized.trim();
  
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  if (!sanitized) {
    sanitized = `WO-${Date.now()}`;
  }
  
  return sanitized;
}

/**
 * Safely get a numeric value, defaulting to 0
 */
function safeNumber(value) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Safely get a string value, defaulting to empty string
 */
function safeString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Write assessment data to Google Sheet
 * 1. Duplicate "Turnover_Master_Demo" sheet
 * 2. Rename to work order number
 * 3. Upload sketch to Drive (if provided)
 * 4. Upload photos to Drive (if provided)
 * 5. Populate cells with data including sketch image
 * 
 * @param {object} data - Object containing structuredData, englishScope, spanishScope, sketch, photos
 * @param {string} accessToken - User's OAuth access token
 * @returns {object} { success, sheetUrl, sheetName, sketchUrl, photoUrls }
 */
export async function writeToSheet(data, accessToken) {
  if (!data) {
    throw new Error('No data provided to writeToSheet');
  }

  const { structuredData, englishScope, spanishScope, sketch, photos } = data;
  
  if (!structuredData || typeof structuredData !== 'object') {
    throw new Error('Invalid structuredData: must be an object');
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_ID environment variable');
  }

  try {
    const auth = getOAuthClient(accessToken);
    const sheets = google.sheets({ version: 'v4', auth });
    const masterSheetName = 'Turnover_Master_Demo';

    const rawWorkOrderNumber = structuredData.workOrderNumber || `WO-${Date.now()}`;
    const newSheetName = sanitizeSheetName(rawWorkOrderNumber);

    // Find the master template sheet
    const masterSheetId = await findSheetByName(sheets, spreadsheetId, masterSheetName);
    if (masterSheetId === null) {
      throw new Error(`Master template sheet "${masterSheetName}" not found. Please create a sheet named "Turnover_Master_Demo" in your spreadsheet.`);
    }

    // Check if a sheet with this name already exists
    const existingSheetId = await findSheetByName(sheets, spreadsheetId, newSheetName);
    if (existingSheetId !== null) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteSheet: { sheetId: existingSheetId }
            }]
          }
        });
      } catch (deleteError) {
        console.warn(`Warning: Could not delete existing sheet "${newSheetName}":`, deleteError.message);
      }
    }

    // Duplicate the master sheet
    const newSheetId = await duplicateSheet(sheets, spreadsheetId, masterSheetId, newSheetName);

    // Upload sketch to Drive if provided
    let sketchResult = null;
    if (sketch) {
      try {
        console.log('Uploading sketch to Drive...');
        sketchResult = await uploadSketchToDrive(sketch, `FloorPlan_${newSheetName}`, accessToken);
        console.log('Sketch uploaded:', sketchResult.directUrl);
      } catch (sketchError) {
        console.error('Failed to upload sketch:', sketchError.message);
        // Continue without sketch - don't fail the entire submission
      }
    }

    // Upload photos to Drive if provided
    let photoResults = [];
    if (photos && photos.length > 0) {
      try {
        console.log(`Uploading ${photos.length} photos to Drive...`);
        photoResults = await uploadPhotosToDrive(photos, newSheetName, accessToken, (progress) => {
          console.log(`Uploading photo ${progress.current}/${progress.total}: ${progress.photoName}`);
        });
        const successCount = photoResults.filter(p => !p.error).length;
        console.log(`Photos uploaded: ${successCount}/${photos.length} successful`);
      } catch (photoError) {
        console.error('Failed to upload photos:', photoError.message);
        // Continue without photos - don't fail the entire submission
      }
    }

    // Build all cell updates
    const updates = [
      // Project Header Section
      {
        range: `'${newSheetName}'!B1`,
        values: [[safeString(rawWorkOrderNumber)]]
      },
      {
        range: `'${newSheetName}'!E1`,
        values: [[safeString(structuredData.unitNumber)]]
      },
      {
        range: `'${newSheetName}'!B3`,
        values: [[safeString(structuredData.address)]]
      },
      {
        range: `'${newSheetName}'!E3`,
        values: [[safeString(structuredData.unitSquareFeet)]]
      },
      {
        range: `'${newSheetName}'!I3`,
        values: [[safeString(structuredData.unitLayout)]]
      },
      // Scope of Work Section
      {
        range: `'${newSheetName}'!A6`,
        values: [[safeString(englishScope)]]
      },
      {
        range: `'${newSheetName}'!E6`,
        values: [[safeString(spanishScope)]]
      }
    ];

    // Add sketch image using IMAGE formula if uploaded successfully
    if (sketchResult && sketchResult.directUrl) {
      updates.push({
        range: `'${newSheetName}'!A12`,
        values: [[`=IMAGE("${sketchResult.directUrl}", 2)`]]
      });
    }

    // Work Items Table (starts at row 31, header is row 30)
    const workItems = Array.isArray(structuredData.workItems) 
      ? structuredData.workItems.filter(item => item !== null && item !== undefined)
      : [];

    if (workItems.length > 0) {
      const workItemRows = workItems.map(item => {
        const multiplier = safeNumber(item.multiplier);
        const pricePerUnit = safeNumber(item.pricePerUnit);
        const total = safeNumber(item.total) || (multiplier * pricePerUnit);
        
        return [
          safeString(item.category),
          safeString(item.item),
          safeString(item.description),
          safeString(item.unit),
          '',
          multiplier,
          pricePerUnit,
          total,
          safeString(item.notes)
        ];
      });

      updates.push({
        range: `'${newSheetName}'!A31:I${30 + workItemRows.length}`,
        values: workItemRows
      });
    }

    // Execute all updates in batch
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${newSheetId}`;

    return {
      success: true,
      sheetUrl,
      sheetName: newSheetName,
      sheetId: newSheetId,
      sketchUrl: sketchResult?.directUrl || null,
      photoUrls: photoResults.filter(p => !p.error).map(p => ({
        url: p.directUrl,
        fileName: p.fileName,
        caption: p.caption
      }))
    };

  } catch (error) {
    console.error('Google Sheets API error:', error);
    
    if (error.code === 403) {
      throw new Error('Permission denied. Make sure you have Editor access to the spreadsheet.');
    }
    if (error.code === 404) {
      throw new Error('Spreadsheet not found. Check that GOOGLE_SHEETS_ID is correct.');
    }
    if (error.code === 401) {
      throw new Error('Authentication expired. Please sign out and sign in again.');
    }
    
    throw new Error(`Failed to write to sheet: ${error.message}`);
  }
}

/**
 * Test the Google Sheets connection
 * @param {string} accessToken - User's OAuth access token
 * @returns {object} { success, sheets, error }
 */
export async function testConnection(accessToken) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      return { success: false, error: 'Missing GOOGLE_SHEETS_ID' };
    }

    const auth = getOAuthClient(accessToken);
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({ spreadsheetId });
    
    const sheetNames = response.data.sheets.map(s => s.properties.title);
    const hasMaster = sheetNames.includes('Turnover_Master_Demo');

    return { 
      success: true, 
      sheets: sheetNames,
      hasMasterTemplate: hasMaster,
      spreadsheetTitle: response.data.properties.title
    };
  } catch (error) {
    console.error('Google Sheets connection test failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}
