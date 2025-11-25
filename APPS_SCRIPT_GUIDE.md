# Apps Script Setup Guide

This guide walks through setting up the Google Apps Script backend to handle photo uploads, sketch uploads, and form submissions.

---

## Prerequisites

1. Google Account with access to:
   - Google Sheets
   - Google Drive
   - Google Apps Script

2. Create a Google Sheet for storing submissions

---

## Step 1: Create Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Name it: "Turnovers API"

---

## Step 2: Add OAuth Scopes

Create `appsscript.json` file:

```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ]
}
```

**Critical:** Without explicit OAuth scopes, Drive upload will fail with "Permission denied" errors.

---

## Step 3: Main Script (Code.gs)

```javascript
// Configuration
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // Get from Sheet URL
const PHOTOS_FOLDER_NAME = 'Turnovers Photos';
const SKETCHES_FOLDER_NAME = 'Turnovers Sketches';

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    // Parse request (sent as text/plain to avoid CORS preflight)
    const data = JSON.parse(e.postData.contents);
    
    Logger.log('Received action: ' + data.action);
    
    // Route to appropriate handler
    switch(data.action) {
      case 'uploadPhoto':
        return handlePhotoUpload(data.photo);
      case 'uploadSketch':
        return handleSketchUpload(data.sketch);
      case 'submitForm':
        return handleFormSubmission(data);
      default:
        return buildErrorResponse('Unknown action: ' + data.action);
    }
    
  } catch (error) {
    Logger.log('ERROR in doPost: ' + error.toString());
    return buildErrorResponse('Server error: ' + error.message);
  }
}

/**
 * Upload a single photo to Drive
 */
function handlePhotoUpload(photo) {
  try {
    Logger.log('Starting photo upload: ' + photo.name);
    
    // Get or create photos folder
    const folder = getOrCreateFolder(PHOTOS_FOLDER_NAME);
    
    // Convert base64 to blob
    const base64Data = photo.data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/jpeg',
      photo.name
    );
    
    Logger.log('Blob created, size: ' + blob.getBytes().length + ' bytes');
    
    // Upload to Drive
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    file.setDescription(photo.caption || 'Job site photo');
    
    Logger.log('Photo uploaded successfully: ' + file.getName());
    
    return buildSuccessResponse({
      driveUrl: file.getUrl(),
      fileId: file.getId(),
      fileName: file.getName()
    });
    
  } catch (error) {
    Logger.log('ERROR uploading photo: ' + error.toString());
    return buildErrorResponse('Photo upload failed: ' + error.message);
  }
}

/**
 * Upload floor plan sketch to Drive
 */
function handleSketchUpload(sketch) {
  try {
    Logger.log('Starting sketch upload: ' + sketch.name);
    
    // Get or create sketches folder
    const folder = getOrCreateFolder(SKETCHES_FOLDER_NAME);
    
    // Convert base64 to blob
    const base64Data = sketch.data.split(',')[1]; // Remove data:image/png;base64, prefix
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/png',
      sketch.name
    );
    
    Logger.log('Blob created, size: ' + blob.getBytes().length + ' bytes');
    
    // Upload to Drive
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    file.setDescription('Floor plan sketch');
    
    Logger.log('Sketch uploaded successfully: ' + file.getName());
    
    return buildSuccessResponse({
      driveUrl: file.getUrl(),
      fileId: file.getId(),
      fileName: file.getName()
    });
    
  } catch (error) {
    Logger.log('ERROR uploading sketch: ' + error.toString());
    return buildErrorResponse('Sketch upload failed: ' + error.message);
  }
}

/**
 * Submit form data to Google Sheet
 */
function handleFormSubmission(data) {
  try {
    Logger.log('Starting form submission...');
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    // Prepare row data
    const row = [
      new Date(),                                    // Timestamp
      data.structuredData.projectInfo.address || '', // Address
      data.structuredData.projectInfo.assessor || '',// Assessor
      data.englishScope || '',                       // English scope
      data.spanishScope || '',                       // Spanish scope
      data.photoUrls ? data.photoUrls.join('\n') : '', // Photo URLs (one per line)
      data.sketchUrl || '',                          // Sketch URL
      JSON.stringify(data.structuredData.workItems)  // Work items as JSON
    ];
    
    // Append row
    sheet.appendRow(row);
    
    const rowNumber = sheet.getLastRow();
    Logger.log('Form submitted successfully to row: ' + rowNumber);
    
    return buildSuccessResponse({
      rowNumber: rowNumber,
      photosRecorded: data.photoUrls ? data.photoUrls.length : 0
    });
    
  } catch (error) {
    Logger.log('ERROR submitting form: ' + error.toString());
    return buildErrorResponse('Form submission failed: ' + error.message);
  }
}

/**
 * Get or create a Drive folder
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    Logger.log('Creating new folder: ' + folderName);
    return DriveApp.createFolder(folderName);
  }
}

/**
 * Build success response
 */
function buildSuccessResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      ...data
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Build error response
 */
function buildErrorResponse(errorMessage) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: errorMessage
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Step 4: Deploy as Web App

1. Click **Deploy** → **New Deployment**
2. Settings:
   - Type: **Web app**
   - Execute as: **Me** (your account)
   - Who has access: **Anyone** (for public form) or **Anyone with the link**
3. Click **Deploy**
4. Copy the **Web app URL** (looks like: `https://script.google.com/macros/s/...`)
5. Authorize permissions when prompted

---

## Step 5: Set Up Google Sheet

Create a sheet with these columns:

| Timestamp | Address | Assessor | English Scope | Spanish Scope | Photo URLs | Sketch URL | Work Items |
|-----------|---------|----------|---------------|---------------|------------|------------|------------|

---

## Step 6: Configure Frontend

Add to `.env.local`:

```
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

---

## Testing

### Test Photo Upload:
```bash
curl -X POST YOUR_APPS_SCRIPT_URL \
  -H "Content-Type: text/plain" \
  -d '{
    "action": "uploadPhoto",
    "photo": {
      "name": "test.jpg",
      "data": "data:image/jpeg;base64,/9j/4AAQ...",
      "caption": "Test photo"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "driveUrl": "https://drive.google.com/file/d/.../view",
  "fileId": "...",
  "fileName": "test.jpg"
}
```

### Test Sketch Upload:
```bash
curl -X POST YOUR_APPS_SCRIPT_URL \
  -H "Content-Type: text/plain" \
  -d '{
    "action": "uploadSketch",
    "sketch": {
      "name": "floor-plan.png",
      "data": "data:image/png;base64,iVBORw0KGg..."
    }
  }'
```

### Test Form Submission:
```bash
curl -X POST YOUR_APPS_SCRIPT_URL \
  -H "Content-Type: text/plain" \
  -d '{
    "action": "submitForm",
    "structuredData": {...},
    "photoUrls": ["https://drive.google.com/..."],
    "sketchUrl": "https://drive.google.com/...",
    "englishScope": "...",
    "spanishScope": "..."
  }'
```

---

## Troubleshooting

### "You do not have permission to call DriveApp"
- **Solution:** Add OAuth scopes to `appsscript.json` (see Step 2)
- Redeploy the web app

### Photos uploading but hanging on second photo
- **Solution:** Client-side is likely sending too fast
- Verify 500ms delays between uploads (already implemented in `lib/googleDrive.js`)

### CORS errors
- **Solution:** Use `Content-Type: text/plain` in fetch requests (already configured)

### Can't find uploaded files
- Check Drive folders: "Turnovers Photos" and "Turnovers Sketches"
- Check Apps Script logs: View → Logs

---

## Performance Notes

- **Photo upload time:** ~1-3 seconds per photo (50-100KB compressed)
- **Sketch upload time:** ~1-2 seconds (typically 50-200KB)
- **Form submission:** <1 second (small payload with just URLs)
- **Total time for 5 photos + sketch:** ~10-15 seconds

With progress feedback, users understand what's happening!

---

## Security Considerations

1. **Anyone can submit** - Consider adding:
   - API key authentication
   - Rate limiting
   - CAPTCHA for public forms

2. **Files are public** - Current sharing: "Anyone with link"
   - Change in `file.setSharing()` if needed

3. **No validation** - Consider adding:
   - File size limits (done client-side)
   - File type validation (done client-side)
   - Duplicate detection

---

*Last updated: November 2025*

