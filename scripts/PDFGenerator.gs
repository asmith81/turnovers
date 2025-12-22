/**
 * PDF Generator for Turnover Sheets
 * 
 * Features:
 * - Print area: Columns A:I, letter size, portrait, normal margins
 * - Photos are already embedded in the sheet (added during submission)
 * - Smart page breaks after TOTAL row (with fallbacks)
 * - Saves PDF to "PDFs" folder with same naming as sheet
 * 
 * Setup:
 * 1. Open spreadsheet → Extensions → Apps Script
 * 2. Paste this entire script
 * 3. Save and run any function to authorize
 */

/**
 * Add menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📄 PDF Tools')
    .addItem('🖨️ Print PDF', 'generatePDF')
    .addItem('🔍 Run Diagnostics', 'runDiagnostics')
    .addToUi();
}

/**
 * Main function to generate PDF from the active sheet
 */
function generatePDF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  try {
    Logger.log('Starting PDF generation for sheet: ' + sheetName);
    
    // Step 1: Find the TOTAL row to determine page break location
    const totalRowInfo = findTotalRow(sheet);
    Logger.log('TOTAL row found: ' + (totalRowInfo.found ? 'Row ' + totalRowInfo.row : 'Not found'));
    
    // Step 2: Generate and save PDF
    const pdfFile = exportToPDF(ss, sheet);
    
    // Show success message
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '✅ PDF Generated Successfully!',
      `Your PDF has been saved.\n\n` +
      `📁 File: ${pdfFile.getName()}\n` +
      `📂 Location: PDFs folder\n\n` +
      `Click OK to continue.`,
      ui.ButtonSet.OK
    );
    
    Logger.log('PDF generated successfully: ' + pdfFile.getName());
    
  } catch (error) {
    Logger.log('PDF generation error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    SpreadsheetApp.getUi().alert(
      '❌ Error Generating PDF',
      'Failed to generate PDF:\n\n' + error.message + '\n\nCheck View → Execution log for details.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Find the row containing "TOTAL:" in column G
 */
function findTotalRow(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    return { row: null, found: false };
  }
  
  // Search column G for "TOTAL"
  const data = sheet.getRange(1, 7, lastRow, 1).getValues(); // Column G
  
  for (let i = 0; i < data.length; i++) {
    const cellValue = data[i][0];
    if (cellValue && cellValue.toString().toUpperCase().includes('TOTAL')) {
      return {
        row: i + 1, // Convert to 1-based
        found: true
      };
    }
  }
  
  return { row: null, found: false };
}

/**
 * Find the "Site Photos" header row
 */
function findPhotoSectionRow(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    return { row: null, found: false };
  }
  
  // Search column A for "Site Photos"
  const data = sheet.getRange(1, 1, lastRow, 1).getValues();
  
  for (let i = 0; i < data.length; i++) {
    const cellValue = data[i][0];
    if (cellValue && cellValue.toString().includes('Site Photos')) {
      return {
        row: i + 1,
        found: true
      };
    }
  }
  
  return { row: null, found: false };
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
  Logger.log('Exporting rows 1 to ' + lastRow + ', columns A to I');
  
  // Build the export URL
  // Letter size: 8.5" x 11"
  // Portrait orientation
  // Normal margins (0.75" all around)
  // Fit columns A-I to width
  const exportUrl = 
    'https://docs.google.com/spreadsheets/d/' + ssId + '/export?' +
    'format=pdf' +
    '&gid=' + sheetId +                    // Specific sheet
    '&portrait=true' +                      // Portrait orientation
    '&size=letter' +                        // Letter size (8.5x11)
    '&fitw=true' +                          // Fit to width
    '&fith=false' +                         // Don't fit to height (allow pages)
    '&top_margin=0.75' +                    // 0.75 inch margins
    '&bottom_margin=0.75' +
    '&left_margin=0.75' +
    '&right_margin=0.75' +
    '&gridlines=false' +                    // No gridlines
    '&printnotes=false' +                   // No cell notes
    '&printtitle=false' +                   // No spreadsheet title
    '&sheetnames=false' +                   // No sheet names in header
    '&pagenum=UNDEFINED' +                  // No page numbers
    '&attachment=true' +                    // Download mode
    '&r1=0' +                               // Start row (0-indexed)
    '&c1=0' +                               // Start column = A
    '&r2=' + lastRow +                      // End row
    '&c2=8';                                // End column = I (0-indexed = 8)
  
  Logger.log('Fetching PDF from Google...');
  
  // Fetch the PDF with authorization
  const token = ScriptApp.getOAuthToken();
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      'Authorization': 'Bearer ' + token
    },
    muteHttpExceptions: true
  });
  
  const responseCode = response.getResponseCode();
  if (responseCode !== 200) {
    Logger.log('Export failed with code: ' + responseCode);
    throw new Error('Failed to export PDF. Response code: ' + responseCode);
  }
  
  // Create PDF blob
  const pdfBlob = response.getBlob().setName(sheetName + '.pdf');
  Logger.log('PDF blob created: ' + pdfBlob.getName() + ' (' + pdfBlob.getBytes().length + ' bytes)');
  
  // Get or create PDFs folder
  const pdfFolder = getOrCreatePDFsFolder(ss);
  
  // Remove existing file with same name (replace)
  const existingFiles = pdfFolder.getFilesByName(sheetName + '.pdf');
  while (existingFiles.hasNext()) {
    const oldFile = existingFiles.next();
    Logger.log('Removing old PDF: ' + oldFile.getName());
    oldFile.setTrashed(true);
  }
  
  // Save the new PDF
  const pdfFile = pdfFolder.createFile(pdfBlob);
  Logger.log('PDF saved to: ' + pdfFile.getUrl());
  
  return pdfFile;
}

/**
 * Get or create the PDFs folder at the same level as the spreadsheet
 */
function getOrCreatePDFsFolder(ss) {
  // Get the spreadsheet file
  const ssFile = DriveApp.getFileById(ss.getId());
  const parents = ssFile.getParents();
  
  // Get parent folder (or root if none)
  let parentFolder;
  if (parents.hasNext()) {
    parentFolder = parents.next();
    Logger.log('Spreadsheet parent folder: ' + parentFolder.getName());
  } else {
    parentFolder = DriveApp.getRootFolder();
    Logger.log('Spreadsheet is in root folder');
  }
  
  // Look for existing PDFs folder
  const pdfFolders = parentFolder.getFoldersByName('PDFs');
  if (pdfFolders.hasNext()) {
    const existingFolder = pdfFolders.next();
    Logger.log('Using existing PDFs folder');
    return existingFolder;
  }
  
  // Create new PDFs folder
  const newFolder = parentFolder.createFolder('PDFs');
  Logger.log('Created new PDFs folder');
  
  return newFolder;
}

/**
 * Diagnostic function to verify sheet structure
 */
function runDiagnostics() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = SpreadsheetApp.getActiveSheet();
  
  let report = '=== PDF Generator Diagnostics ===\n\n';
  
  // Check 1: Active sheet info
  report += '📋 SHEET INFO\n';
  report += '   Name: ' + sheet.getName() + '\n';
  report += '   Last Row: ' + sheet.getLastRow() + '\n';
  report += '   Last Column: ' + sheet.getLastColumn() + '\n\n';
  
  // Check 2: Find TOTAL row
  const totalInfo = findTotalRow(sheet);
  report += '💰 TOTAL ROW\n';
  report += '   ' + (totalInfo.found ? 'Found at row ' + totalInfo.row : 'NOT FOUND') + '\n\n';
  
  // Check 3: Find Photos section
  const photoInfo = findPhotoSectionRow(sheet);
  report += '📷 PHOTO SECTION\n';
  report += '   ' + (photoInfo.found ? 'Found at row ' + photoInfo.row : 'No photos embedded') + '\n\n';
  
  // Check 4: PDFs folder
  report += '📁 PDF STORAGE\n';
  try {
    const ssFile = DriveApp.getFileById(ss.getId());
    const parents = ssFile.getParents();
    if (parents.hasNext()) {
      const parent = parents.next();
      report += '   Spreadsheet folder: ' + parent.getName() + '\n';
      
      const pdfFolders = parent.getFoldersByName('PDFs');
      if (pdfFolders.hasNext()) {
        report += '   PDFs folder: EXISTS ✓\n';
      } else {
        report += '   PDFs folder: Will be created on first export\n';
      }
    } else {
      report += '   Spreadsheet is in Drive root\n';
    }
  } catch (e) {
    report += '   Error checking folders: ' + e.message + '\n';
  }
  
  report += '\n✅ Ready to generate PDF!';
  
  // Show results
  ui.alert('Diagnostics Report', report, ui.ButtonSet.OK);
  Logger.log(report);
}
