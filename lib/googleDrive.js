/**
 * Google Drive upload utilities
 * Based on lessons from PHOTO_UPLOAD_LESSONS_LEARNED.md
 * 
 * Key principles:
 * 1. Upload photos separately (not embedded in JSON)
 * 2. Add delays between uploads (500ms)
 * 3. Implement timeouts (30s per photo)
 * 4. Show progress feedback
 * 5. Return Drive URLs, not base64
 */

/**
 * Upload a single photo to Google Drive via Apps Script
 * @param {object} photo - Photo object with url (base64) and name
 * @param {string} appsScriptUrl - The deployed Apps Script web app URL
 * @returns {Promise<string>} Drive URL of uploaded photo
 */
export async function uploadPhotoToDrive(photo, appsScriptUrl) {
  const timeoutDuration = 30000; // 30 seconds
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Photo upload timeout (30s)')), timeoutDuration);
  });
  
  // Create upload promise
  const uploadPromise = fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain' // Avoids CORS preflight
    },
    body: JSON.stringify({
      action: 'uploadPhoto',
      photo: {
        name: photo.name,
        data: photo.url, // base64 string
        caption: photo.caption || ''
      }
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    return response.json();
  })
  .then(result => {
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    return result.driveUrl;
  });
  
  // Race between upload and timeout
  return Promise.race([uploadPromise, timeoutPromise]);
}

/**
 * Upload multiple photos with progress tracking
 * @param {Array} photos - Array of photo objects
 * @param {string} appsScriptUrl - The deployed Apps Script web app URL
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Array>} Array of Drive URLs
 */
export async function uploadPhotosWithProgress(photos, appsScriptUrl, onProgress) {
  const driveUrls = [];
  const DELAY_BETWEEN_UPLOADS = 500; // 500ms delay to prevent Apps Script concurrency issues
  
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
      const driveUrl = await uploadPhotoToDrive(photo, appsScriptUrl);
      driveUrls.push(driveUrl);
      
      // Add delay before next upload (except for last one)
      if (i < photos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_UPLOADS));
      }
    } catch (error) {
      console.error(`Failed to upload photo ${photo.name}:`, error);
      // Continue with remaining photos
      driveUrls.push(null); // Mark as failed
    }
  }
  
  return driveUrls;
}

/**
 * Upload sketch (floor plan) to Google Drive
 * @param {string} sketchBase64 - Base64 data URL of the sketch
 * @param {string} appsScriptUrl - The deployed Apps Script web app URL
 * @returns {Promise<string>} Drive URL of uploaded sketch
 */
export async function uploadSketchToDrive(sketchBase64, appsScriptUrl) {
  const timeoutDuration = 30000; // 30 seconds
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Sketch upload timeout (30s)')), timeoutDuration);
  });
  
  // Create upload promise
  const uploadPromise = fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain' // Avoids CORS preflight
    },
    body: JSON.stringify({
      action: 'uploadSketch',
      sketch: {
        name: `floor-plan-${Date.now()}.png`,
        data: sketchBase64 // base64 data URL
      }
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Sketch upload failed: ${response.status}`);
    }
    return response.json();
  })
  .then(result => {
    if (!result.success) {
      throw new Error(result.error || 'Sketch upload failed');
    }
    return result.driveUrl;
  });
  
  // Race between upload and timeout
  return Promise.race([uploadPromise, timeoutPromise]);
}

/**
 * Submit form data with photo URLs to Google Sheets
 * @param {object} formData - Form data including photoUrls array and sketchUrl
 * @param {string} appsScriptUrl - The deployed Apps Script web app URL
 * @returns {Promise<object>} Submission result
 */
export async function submitFormWithPhotoUrls(formData, appsScriptUrl) {
  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain' // Avoids CORS preflight
    },
    body: JSON.stringify({
      action: 'submitForm',
      ...formData
    })
  });
  
  if (!response.ok) {
    throw new Error(`Submission failed: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Submission failed');
  }
  
  return result;
}

