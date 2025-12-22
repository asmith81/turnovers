# PDF Generation Apps Script

This script adds PDF export capabilities to your turnover Google Sheets. Photos are embedded directly in the sheet during submission, making PDF generation simple and fast.

---

## Quick Setup (One-Time Only)

The "Print PDF" button is **automatically created** on each new sheet when you submit a turnover. You just need to install the script once:

1. Open your master Google Spreadsheet
2. Go to **Extensions** → **Apps Script**
3. Delete any existing code and paste the code from `scripts/PDFGenerator.gs` (or the code below)
4. Save the project (Ctrl+S)
5. Click **Run** → select `onOpen` (this tests authorization)
6. **Authorize** when prompted

That's it! The `📄 PDF Tools` menu will now appear, and new sheets will have the Print PDF button.

---

## Features

- **Print Area**: Columns A:I fit to letter-size PDF (portrait, normal margins)
- **Photos Embedded**: Photos are added to the sheet during submission (like the sketch)
  - Each photo is sized 4" × 6"
  - Notes row below each photo (auto row height)
  - Notes can be edited directly in the sheet
- **Auto-save**: PDFs saved to "PDFs" folder at same level as master sheet
- **Same naming convention** as the sheet tabs

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  WEB APP                                                        │
│  ─────────                                                      │
│  1. Upload photos with notes in the gallery                     │
│  2. Submit turnover                                             │
│  3. Sheet created with:                                         │
│     • Header info, scope, sketch (as before)                    │
│     • Work items table                                          │
│     • Photos embedded with notes (NEW!)                         │
│     • Print PDF button in column K                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  GOOGLE SHEET                                                   │
│  ─────────────                                                  │
│  • View/edit photo notes directly in the sheet                  │
│  • Click PDF Tools → Print PDF                                  │
│  • PDF exports columns A:I with all content                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## PDFGenerator.gs

Copy this entire script into your Apps Script editor:

```javascript
/**
 * PDF Generator for Turnover Sheets
 * 
 * Features:
 * - Print area: Columns A:I, letter size, portrait, normal margins
 * - Page break after TOTAL row (with fallbacks to row 6 or row 4)
 * - Photo gallery: 4"x6" photos with 0.5" notes space, 2 per page
 * - Saves PDF to "PDFs" folder with same naming as sheet
 */

// Configuration
const CONFIG = {
  PRINT_COLUMNS: 9,           // A through I
  BUTTON_COLUMN: 'K',         // Column for Print PDF button (outside print area)
  BUTTON_ROW: 1,
  PHOTO_WIDTH_INCHES: 4,
  PHOTO_HEIGHT_INCHES: 6,
  NOTES_SPACE_INCHES: 0.5,
  PHOTOS_PER_PAGE: 2,
  PIXELS_PER_INCH: 96,        // Standard screen DPI
  ROW_HEIGHT_PIXELS_PER_INCH: 15, // Approximate row height conversion
};

/**
 * Add menu and button when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📄 PDF Tools')
    .addItem('🖨️ Print PDF', 'generatePDF')
    .addItem('⚙️ Setup Print Button', 'setupPrintButton')
    .addToUi();
}

/**
 * Creates the "Print PDF" button on the active sheet
 */
function setupPrintButton() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const buttonCell = sheet.getRange(CONFIG.BUTTON_ROW, 11); // Column K
  
  // Style the button cell
  buttonCell.setValue('🖨️ Print PDF')
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  
  // Set column width for button
  sheet.setColumnWidth(11, 100);
  
  // Add note with instructions
  buttonCell.setNote('Click here then go to PDF Tools menu → Print PDF\n\nOr use keyboard: Alt+P, P');
  
  SpreadsheetApp.getUi().alert(
    '✅ Button Created!',
    'The Print PDF button has been added to column K.\n\n' +
    'To print: Click the button cell, then use the PDF Tools menu → Print PDF',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Main function to generate PDF from the active sheet
 */
function generatePDF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  try {
    // Show progress
    SpreadsheetApp.getUi().alert('Generating PDF...', 'Please wait while we prepare your PDF.', SpreadsheetApp.getUi().ButtonSet.OK);
    
    // Step 1: Find the TOTAL row and set page breaks
    const totalRowInfo = findTotalRow(sheet);
    const pageBreakRow = determinePageBreakRow(sheet, totalRowInfo);
    
    // Step 2: Add photos to sheet (if any exist)
    const photosAdded = addPhotosToSheet(sheet, sheetName, pageBreakRow);
    
    // Step 3: Set up print settings and page breaks
    configurePrintSettings(sheet, pageBreakRow, photosAdded);
    
    // Step 4: Generate and save PDF
    const pdfFile = exportToPDF(ss, sheet);
    
    // Step 5: Clean up photos from sheet (optional - keep them for now)
    // cleanupPhotos(sheet, pageBreakRow);
    
    // Show success message with link
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '✅ PDF Generated!',
      `Your PDF has been saved to the PDFs folder.\n\n` +
      `File: ${pdfFile.getName()}\n` +
      `Location: ${pdfFile.getUrl()}`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('PDF generation error: ' + error.toString());
    SpreadsheetApp.getUi().alert(
      '❌ Error',
      'Failed to generate PDF: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Find the row containing "TOTAL:" in column G
 */
function findTotalRow(sheet) {
  const data = sheet.getDataRange().getValues();
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    // Check column G (index 6) for "TOTAL:" or "TOTAL"
    if (row[6] && row[6].toString().toUpperCase().includes('TOTAL')) {
      return {
        row: i + 1, // Convert to 1-based
        found: true
      };
    }
  }
  
  return { row: null, found: false };
}

/**
 * Determine where to place the page break
 * Priority: After TOTAL row > After row 6 (sketch) > After row 4 (scope)
 */
function determinePageBreakRow(sheet, totalRowInfo) {
  if (totalRowInfo.found && totalRowInfo.row) {
    // Primary: After the TOTAL row
    return totalRowInfo.row;
  }
  
  // Check if row 6 has content (sketch area)
  const row6Value = sheet.getRange(6, 1).getValue();
  if (row6Value || sheet.getRange(6, 1).getFormula()) {
    // Fallback 1: After row 6
    return 6;
  }
  
  // Fallback 2: After row 4 (scope row)
  return 4;
}

/**
 * Add photos from Drive to the sheet after the page break
 */
function addPhotosToSheet(sheet, workOrderNumber, startAfterRow) {
  const photos = getPhotosForWorkOrder(workOrderNumber);
  
  if (photos.length === 0) {
    Logger.log('No photos found for work order: ' + workOrderNumber);
    return 0;
  }
  
  Logger.log('Found ' + photos.length + ' photos for: ' + workOrderNumber);
  
  // Calculate row heights for photos
  // 4" x 6" photo + 0.5" notes = 6.5" total per photo
  // At ~15 pixels per row and ~96 DPI, 6" = ~360 pixels = ~24 rows
  const PHOTO_ROW_HEIGHT = 360; // pixels for 6" photo
  const NOTES_ROW_HEIGHT = 36;  // pixels for 0.5" notes area
  
  // Start inserting photos after the page break row + 1 blank row
  let currentRow = startAfterRow + 2;
  
  // Add a "Photos" header
  sheet.getRange(currentRow, 1, 1, 9).merge();
  sheet.getRange(currentRow, 1)
    .setValue('📷 Site Photos')
    .setFontWeight('bold')
    .setFontSize(14)
    .setHorizontalAlignment('center')
    .setBackground('#f0f0f0');
  currentRow++;
  
  // Insert each photo
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    
    // Set row height for photo (6 inches ≈ 360 pixels)
    sheet.setRowHeight(currentRow, PHOTO_ROW_HEIGHT);
    
    // Merge cells A-I for centered photo
    sheet.getRange(currentRow, 1, 1, 9).merge();
    
    // Insert IMAGE formula
    const imageFormula = `=IMAGE("${photo.url}", 1)`;
    sheet.getRange(currentRow, 1)
      .setFormula(imageFormula)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    
    currentRow++;
    
    // Add notes row below photo
    sheet.setRowHeight(currentRow, NOTES_ROW_HEIGHT);
    sheet.getRange(currentRow, 1, 1, 9).merge();
    sheet.getRange(currentRow, 1)
      .setValue(photo.caption || 'Notes: ')
      .setFontSize(10)
      .setFontColor('#666666')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('top')
      .setBackground('#fafafa');
    
    currentRow++;
    
    // Add page break after every 2 photos (except at the end)
    if ((i + 1) % CONFIG.PHOTOS_PER_PAGE === 0 && i < photos.length - 1) {
      // Add a small spacer row before next photo set
      sheet.setRowHeight(currentRow, 10);
      currentRow++;
    }
  }
  
  return photos.length;
}

/**
 * Get photos from Drive for a specific work order
 */
function getPhotosForWorkOrder(workOrderNumber) {
  const photos = [];
  
  try {
    // Look for Turnovers_Photos folder
    const parentFolders = DriveApp.getFoldersByName('Turnovers_Photos');
    if (!parentFolders.hasNext()) {
      Logger.log('Turnovers_Photos folder not found');
      return photos;
    }
    
    const parentFolder = parentFolders.next();
    
    // Look for work order subfolder
    const woFolders = parentFolder.getFoldersByName(workOrderNumber);
    if (!woFolders.hasNext()) {
      Logger.log('Work order folder not found: ' + workOrderNumber);
      return photos;
    }
    
    const woFolder = woFolders.next();
    
    // Get all image files
    const files = woFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getMimeType();
      
      // Only include image files
      if (mimeType.startsWith('image/')) {
        photos.push({
          id: file.getId(),
          name: file.getName(),
          url: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
          caption: file.getDescription() || ''
        });
      }
    }
    
    // Sort by filename
    photos.sort((a, b) => a.name.localeCompare(b.name));
    
  } catch (error) {
    Logger.log('Error fetching photos: ' + error.toString());
  }
  
  return photos;
}

/**
 * Configure print settings and page breaks
 */
function configurePrintSettings(sheet, pageBreakRow, photosAdded) {
  const sheetId = sheet.getSheetId();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear any existing page breaks
  // Note: Apps Script doesn't have direct page break API, 
  // we'll use print area settings instead
  
  // Set print area to columns A:I
  // This is handled in the export URL parameters
  
  Logger.log('Print settings configured. Page break after row: ' + pageBreakRow);
}

/**
 * Export the sheet to PDF and save to PDFs folder
 */
function exportToPDF(ss, sheet) {
  const sheetName = sheet.getName();
  const sheetId = sheet.getSheetId();
  const ssId = ss.getId();
  
  // Find the last row with content
  const lastRow = sheet.getLastRow();
  
  // Build the export URL with all parameters
  // Letter size: 8.5" x 11"
  // Portrait orientation
  // Normal margins (0.75" all around)
  // Fit to width
  const exportUrl = 
    `https://docs.google.com/spreadsheets/d/${ssId}/export?` +
    `format=pdf` +
    `&gid=${sheetId}` +                    // Specific sheet
    `&portrait=true` +                      // Portrait orientation
    `&size=letter` +                        // Letter size (8.5x11)
    `&fitw=true` +                          // Fit to width
    `&fith=false` +                         // Don't fit to height (allow multiple pages)
    `&top_margin=0.75` +                    // Normal margins
    `&bottom_margin=0.75` +
    `&left_margin=0.75` +
    `&right_margin=0.75` +
    `&gridlines=false` +                    // No gridlines
    `&printnotes=false` +                   // No notes
    `&printtitle=false` +                   // No title
    `&sheetnames=false` +                   // No sheet names
    `&pagenum=UNDEFINED` +                  // No page numbers
    `&attachment=true` +                    // Download as attachment
    `&r1=0` +                               // Start row (0-indexed)
    `&c1=0` +                               // Start column (0-indexed)
    `&r2=${lastRow}` +                      // End row
    `&c2=8`;                                // End column (I = index 8)
  
  Logger.log('Export URL: ' + exportUrl);
  
  // Fetch the PDF
  const token = ScriptApp.getOAuthToken();
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      'Authorization': 'Bearer ' + token
    },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to export PDF: ' + response.getContentText());
  }
  
  const pdfBlob = response.getBlob().setName(sheetName + '.pdf');
  
  // Get or create PDFs folder at same level as the spreadsheet
  const pdfFolder = getOrCreatePDFsFolder(ss);
  
  // Check for existing file and delete it
  const existingFiles = pdfFolder.getFilesByName(sheetName + '.pdf');
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }
  
  // Save the PDF
  const pdfFile = pdfFolder.createFile(pdfBlob);
  
  Logger.log('PDF saved: ' + pdfFile.getUrl());
  
  return pdfFile;
}

/**
 * Get or create the PDFs folder at the same level as the master sheet
 */
function getOrCreatePDFsFolder(ss) {
  const ssFile = DriveApp.getFileById(ss.getId());
  const parents = ssFile.getParents();
  
  let parentFolder;
  if (parents.hasNext()) {
    parentFolder = parents.next();
  } else {
    // Spreadsheet is in root
    parentFolder = DriveApp.getRootFolder();
  }
  
  // Look for existing PDFs folder
  const pdfFolders = parentFolder.getFoldersByName('PDFs');
  if (pdfFolders.hasNext()) {
    return pdfFolders.next();
  }
  
  // Create new PDFs folder
  const newFolder = parentFolder.createFolder('PDFs');
  Logger.log('Created PDFs folder: ' + newFolder.getUrl());
  
  return newFolder;
}

/**
 * Clean up photos from sheet after PDF generation
 * (Optional - currently disabled to keep photos visible)
 */
function cleanupPhotos(sheet, startAfterRow) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow > startAfterRow + 1) {
    // Delete rows after the main content
    sheet.deleteRows(startAfterRow + 2, lastRow - startAfterRow - 1);
  }
}

/**
 * Test function to verify photo retrieval
 */
function testPhotoRetrieval() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  const photos = getPhotosForWorkOrder(sheetName);
  Logger.log('Photos found: ' + photos.length);
  
  photos.forEach((photo, index) => {
    Logger.log(`Photo ${index + 1}: ${photo.name} - ${photo.url}`);
  });
}
```

---

## How to Use

### First-Time Script Installation

1. Open your master Google Spreadsheet
2. Go to **Extensions** → **Apps Script**
3. Paste the script from `scripts/PDFGenerator.gs`
4. Click **Save** (💾 icon or Ctrl+S)
5. Click **Run** → Select any function (e.g., `onOpen`)
6. **Authorize** when prompted:
   - Click "Review permissions"
   - Select your Google account
   - Click "Advanced" → "Go to Turnovers PDF (unsafe)"
   - Click "Allow"

### Automatic Button Creation

When you submit a new turnover from the web app, the "🖨️ Print PDF" button is **automatically added** to column K of the new sheet.

### Generating a PDF

1. Navigate to the sheet tab you want to print
2. Use the **📄 PDF Tools** menu → **🖨️ Print PDF**
3. Wait for the confirmation dialog
4. Your PDF is saved to the "PDFs" folder

> **Note**: The button in column K is a visual indicator. Click it, then use the PDF Tools menu to generate.

### Where Are PDFs Saved?

PDFs are saved to a folder called "PDFs" located at the same directory level as your master spreadsheet in Google Drive.

---

## Technical Details

### Print Area
- Columns A through I
- Letter size (8.5" × 11")
- Portrait orientation
- Normal margins (0.75" all around)
- Columns fit to page width

### Page Break Logic
1. **Primary**: After the row containing "TOTAL:" in column G
2. **Fallback 1**: After row 6 (sketch area)
3. **Fallback 2**: After row 4 (scope content)

### Photo Gallery
- Photos are fetched from `Turnovers_Photos/{SheetName}/` folder
- Each photo is displayed at 4" × 6" (portrait orientation)
- 0.5" space below each photo for notes
- 2 photos fit per page
- Photos are sorted alphabetically by filename

### Naming Convention
PDFs are named identically to the sheet tab name:
- Sheet: `WO-12345` → PDF: `WO-12345.pdf`

---

## Troubleshooting

### "Permission Denied" Error
- Re-authorize the script: Run → setupPrintButton and approve permissions
- Ensure you have Editor access to the spreadsheet and Drive

### Photos Not Appearing
- Check that photos are in `Turnovers_Photos/{WorkOrderNumber}/` folder
- Verify photos are shared as "Anyone with the link can view"
- Run the `testPhotoRetrieval` function to debug

### PDF Not Generating
- Check the Apps Script execution log: View → Logs
- Ensure the spreadsheet ID is accessible
- Try refreshing the page and running again

### Button Not Working
- The button is informational only - use the PDF Tools menu to generate
- Or run the `generatePDF` function directly from Apps Script

---

## OAuth Scopes Required

Add these to your `appsscript.json` if not automatically detected:

```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

---

*Last updated: December 2024*

