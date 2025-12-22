import { google } from 'googleapis';
import { uploadSketchToDrive, uploadPhotosToDrive } from './driveUpload';
import { stripMarkdown } from './markdownUtils';

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
 * 
 * Creates a NEW blank sheet with programmatic structure:
 * Row 1: WO# and Unit # (2x height, B:C & E:I merges)
 * Row 2: Address and Unit info (2x height, B:C & E:I merges)
 * Row 3: Scope labels (default height, A:D & E:I merges)
 * Row 4: Scope content EN/ES (DYNAMIC height, A:D & E:I merges)
 * Row 5: "Unit Layout" header (default height, A:I merge)
 * Row 6: Sketch image (15x height, A:I merge)
 * Row 7+: Work items table
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

    const rawWorkOrderNumber = structuredData.workOrderNumber || `WO-${Date.now()}`;
    const newSheetName = sanitizeSheetName(rawWorkOrderNumber);

    // Delete existing sheet with same name if exists
    const existingSheetId = await findSheetByName(sheets, spreadsheetId, newSheetName);
    if (existingSheetId !== null) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ deleteSheet: { sheetId: existingSheetId } }] }
        });
      } catch (deleteError) {
        console.warn(`Warning: Could not delete existing sheet "${newSheetName}":`, deleteError.message);
      }
    }

    // Create a NEW blank sheet
    const addSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: newSheetName,
              gridProperties: { rowCount: 200, columnCount: 9 }
            }
          }
        }]
      }
    });
    const newSheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
    console.log(`Created new sheet: ${newSheetName} (ID: ${newSheetId})`);

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

    // ===== STRUCTURE SETUP: Row heights, merges, content =====
    const DEFAULT_ROW_HEIGHT = 21; // Google Sheets default

    // Step 1: Set row heights
    const rowHeightRequests = [
      // Row 1: 2x height (WO# / Unit#)
      { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: DEFAULT_ROW_HEIGHT * 2 }, fields: 'pixelSize' } },
      // Row 2: 2x height (Address / SQ FT)
      { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: DEFAULT_ROW_HEIGHT * 2 }, fields: 'pixelSize' } },
      // Row 3: default height (scope labels)
      { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: DEFAULT_ROW_HEIGHT }, fields: 'pixelSize' } },
      // Row 4: will be auto-resized (scope content)
      // Row 5: default height (Unit Layout header)
      { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: DEFAULT_ROW_HEIGHT }, fields: 'pixelSize' } },
      // Row 6: 15x height (sketch area)
      { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: DEFAULT_ROW_HEIGHT * 15 }, fields: 'pixelSize' } }
    ];

    // Step 2: Set up merges
    const mergeRequests = [
      // Row 1: B1:C1 (WO# value), E1:I1 (Unit# value)
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 1, endColumnIndex: 3 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 4, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } },
      // Row 2: B2:C2 (Address value), E2:I2 (SQ FT / Layout)
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 3 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 4, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } },
      // Row 3: A3:D3 (Overview label), E3:I3 (Spanish label)
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 4, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } },
      // Row 4: A4:D4 (English scope), E4:I4 (Spanish scope)
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 4, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } },
      // Row 5: A5:I5 (Unit Layout header)
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } },
      // Row 6: A6:I6 (Sketch area)
      { mergeCells: { range: { sheetId: newSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } }
    ];

    // Apply row heights and merges
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [...rowHeightRequests, ...mergeRequests] }
    });

    // Step 3: Write cell content
    const cellData = [
      // Row 1
      { range: `'${newSheetName}'!A1`, values: [['WO#']] },
      { range: `'${newSheetName}'!B1`, values: [[safeString(rawWorkOrderNumber)]] },
      { range: `'${newSheetName}'!D1`, values: [['Unit #']] },
      { range: `'${newSheetName}'!E1`, values: [[safeString(structuredData.unitNumber)]] },
      // Row 2
      { range: `'${newSheetName}'!A2`, values: [['Address']] },
      { range: `'${newSheetName}'!B2`, values: [[safeString(structuredData.address)]] },
      { range: `'${newSheetName}'!D2`, values: [['Unit SQ FT']] },
      { range: `'${newSheetName}'!E2`, values: [[`${safeString(structuredData.unitSquareFeet)}          Unit Layout: ${safeString(structuredData.unitLayout)}`]] },
      // Row 3: Labels
      { range: `'${newSheetName}'!A3`, values: [['Overview']] },
      { range: `'${newSheetName}'!E3`, values: [['Spanish']] },
      // Row 4: Scope content
      { range: `'${newSheetName}'!A4`, values: [[safeString(stripMarkdown(englishScope))]] },
      { range: `'${newSheetName}'!E4`, values: [[safeString(stripMarkdown(spanishScope))]] },
      // Row 5: Unit Layout header
      { range: `'${newSheetName}'!A5`, values: [['Unit Layout']] }
    ];

    // Add sketch if available
    if (sketchResult && sketchResult.directUrl) {
      cellData.push({ range: `'${newSheetName}'!A6`, values: [[`=IMAGE("${sketchResult.directUrl}", 1)`]] });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data: cellData }
    });

    // Step 4: Apply formatting
    const formatRequests = [
      // Row 1 & 2: Bold labels (A and D columns)
      { repeatCell: { range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } },
      { repeatCell: { range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 3, endColumnIndex: 4 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } },
      // Row 3: Bold, centered labels
      { repeatCell: { range: { sheetId: newSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 9 }, cell: { userEnteredFormat: { textFormat: { bold: true }, horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat(textFormat.bold,horizontalAlignment)' } },
      // Row 4: Text wrap for scope
      { repeatCell: { range: { sheetId: newSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 9 }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } }, fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)' } },
      // Row 5: Bold, centered, gray (Unit Layout header)
      { repeatCell: { range: { sheetId: newSheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 9 }, cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 12 }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 } } }, fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,backgroundColor)' } },
      // Row 6: Centered (sketch)
      { repeatCell: { range: { sheetId: newSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 9 }, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } }, fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)' } },
      // Auto-resize row 4 (scope) to fit content
      { autoResizeDimensions: { dimensions: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 3, endIndex: 4 } } }
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: formatRequests }
    });

    // ===== WORK ITEMS TABLE - Starts at row 7 =====
    const HEADER_ROW = 7;
    const HEADER_ROW_IDX = HEADER_ROW - 1; // 0-indexed
    
    const workItems = Array.isArray(structuredData.workItems) 
      ? structuredData.workItems.filter(item => item !== null && item !== undefined)
      : [];

    // Sort work items by category for grouping
    const sortedWorkItems = [...workItems].sort((a, b) => 
      safeString(a.category).localeCompare(safeString(b.category))
    );

    // Table headers
    const headers = [['Category', 'Item', 'Description', 'Unit', 'Amount', 'Multiplier', 'Price Per Unit', 'Total', 'Notes']];

    // Build work item rows with Multiplier always = 1
    const workItemRows = sortedWorkItems.map(item => {
      const amount = safeNumber(item.multiplier);
      const multiplier = 1; // Always 1
      const pricePerUnit = safeNumber(item.pricePerUnit);
      const total = safeNumber(item.total) || (amount * multiplier * pricePerUnit);
      
      return [
        safeString(item.category),
        safeString(item.item),
        safeString(item.description),
        safeString(item.unit),
        amount,
        multiplier,
        pricePerUnit,
        total,
        safeString(item.notes)
      ];
    });

    // Calculate grand total
    const grandTotal = sortedWorkItems.reduce((sum, item) => 
      sum + (safeNumber(item.total) || (safeNumber(item.multiplier) * safeNumber(item.pricePerUnit))), 0
    );
    
    // Total row
    const totalRow = [['', '', '', '', '', '', 'TOTAL:', grandTotal, '']];

    // Calculate row positions (table starts at row 7)
    const dataStartRow = HEADER_ROW + 1; // Row 8
    const dataEndRow = dataStartRow + workItemRows.length - 1;
    const totalRowNum = workItemRows.length > 0 ? dataEndRow + 1 : HEADER_ROW + 1;

    // Step 2: Write headers, work items, and total row
    const tableData = [
      { range: `'${newSheetName}'!A${HEADER_ROW}:I${HEADER_ROW}`, values: headers }
    ];
    
    if (workItemRows.length > 0) {
      tableData.push({ 
        range: `'${newSheetName}'!A${dataStartRow}:I${dataEndRow}`, 
        values: workItemRows 
      });
    }
    
    tableData.push({ 
      range: `'${newSheetName}'!A${totalRowNum}:I${totalRowNum}`, 
      values: totalRow 
    });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: tableData
      }
    });

    // Step 3: Find category groups for merging
    const categoryMerges = [];
    if (sortedWorkItems.length > 0) {
      let currentCategory = sortedWorkItems[0].category;
      let startIdx = 0;
      
      for (let i = 1; i <= sortedWorkItems.length; i++) {
        const itemCategory = i < sortedWorkItems.length ? sortedWorkItems[i].category : null;
        
        if (itemCategory !== currentCategory) {
          // End of category group
          if (i - startIdx > 1) {
            // More than one row with same category - merge
            categoryMerges.push({
              mergeCells: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: HEADER_ROW_IDX + 1 + startIdx, // Data starts after header
                  endRowIndex: HEADER_ROW_IDX + 1 + i,
                  startColumnIndex: 0, // Column A
                  endColumnIndex: 1
                },
                mergeType: 'MERGE_ALL'
              }
            });
          }
          currentCategory = itemCategory;
          startIdx = i;
        }
      }
    }

    // Step 4: Apply formatting and category merges
    const tableFormatRequests = [
      // Bold outer border for entire table
      {
        updateBorders: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX,
            endRowIndex: HEADER_ROW_IDX + workItemRows.length + 2, // header + data + total
            startColumnIndex: 0,
            endColumnIndex: 9
          },
          top: { style: 'SOLID_MEDIUM', color: { red: 0, green: 0, blue: 0 } },
          bottom: { style: 'SOLID_MEDIUM', color: { red: 0, green: 0, blue: 0 } },
          left: { style: 'SOLID_MEDIUM', color: { red: 0, green: 0, blue: 0 } },
          right: { style: 'SOLID_MEDIUM', color: { red: 0, green: 0, blue: 0 } }
        }
      },
      // Header row: bold border, bold text, light gray background
      {
        updateBorders: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX,
            endRowIndex: HEADER_ROW_IDX + 1,
            startColumnIndex: 0,
            endColumnIndex: 9
          },
          bottom: { style: 'SOLID_MEDIUM', color: { red: 0, green: 0, blue: 0 } }
        }
      },
      {
        repeatCell: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX,
            endRowIndex: HEADER_ROW_IDX + 1,
            startColumnIndex: 0,
            endColumnIndex: 9
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              verticalAlignment: 'MIDDLE',
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor,verticalAlignment,horizontalAlignment)'
        }
      },
      // Total row: bold border top, medium gray background, bold text
      {
        updateBorders: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX + workItemRows.length + 1,
            endRowIndex: HEADER_ROW_IDX + workItemRows.length + 2,
            startColumnIndex: 0,
            endColumnIndex: 9
          },
          top: { style: 'SOLID_MEDIUM', color: { red: 0, green: 0, blue: 0 } }
        }
      },
      {
        repeatCell: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX + workItemRows.length + 1,
            endRowIndex: HEADER_ROW_IDX + workItemRows.length + 2,
            startColumnIndex: 0,
            endColumnIndex: 9
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.7, green: 0.7, blue: 0.7 }
            }
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)'
        }
      },
      // Light borders for body cells
      ...(workItemRows.length > 0 ? [{
        updateBorders: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX + 1,
            endRowIndex: HEADER_ROW_IDX + workItemRows.length + 1,
            startColumnIndex: 0,
            endColumnIndex: 9
          },
          innerHorizontal: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
          innerVertical: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } }
        }
      }] : []),
      // Enable text wrapping for all data cells (auto row height)
      ...(workItemRows.length > 0 ? [{
        repeatCell: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX + 1,
            endRowIndex: HEADER_ROW_IDX + workItemRows.length + 1,
            startColumnIndex: 0,
            endColumnIndex: 9
          },
          cell: {
            userEnteredFormat: {
              wrapStrategy: 'WRAP',
              verticalAlignment: 'TOP'
            }
          },
          fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)'
        }
      }] : []),
      // Format Total column (H) as currency
      {
        repeatCell: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX + 1,
            endRowIndex: HEADER_ROW_IDX + workItemRows.length + 2,
            startColumnIndex: 7,
            endColumnIndex: 8
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' }
            }
          },
          fields: 'userEnteredFormat.numberFormat'
        }
      },
      // Format Price Per Unit column (G) as currency
      {
        repeatCell: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX + 1,
            endRowIndex: HEADER_ROW_IDX + workItemRows.length + 1,
            startColumnIndex: 6,
            endColumnIndex: 7
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' }
            }
          },
          fields: 'userEnteredFormat.numberFormat'
        }
      },
      // Category column: vertical alignment middle (for merged cells)
      {
        repeatCell: {
          range: {
            sheetId: newSheetId,
            startRowIndex: HEADER_ROW_IDX + 1,
            endRowIndex: HEADER_ROW_IDX + workItemRows.length + 1,
            startColumnIndex: 0,
            endColumnIndex: 1
          },
          cell: {
            userEnteredFormat: {
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat.verticalAlignment'
        }
      },
      // Add category merge requests
      ...categoryMerges
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: tableFormatRequests }
    });

    // ===== ADD PHOTO GALLERY after work items table =====
    // Photos are embedded like the sketch, with 4x6 sizing and notes rows
    // Smart page break calculation pushes photos to start on page 2
    let photoGalleryEndRow = totalRowNum;
    
    if (photoResults.length > 0) {
      const successfulPhotos = photoResults.filter(p => !p.error && p.directUrl);
      
      if (successfulPhotos.length > 0) {
        console.log(`Adding ${successfulPhotos.length} photos to sheet...`);
        
        // Photo sizing: 4" x 6" at 72 points per inch = 288 x 432 points
        const PHOTO_ROW_HEIGHT = 432; // 6 inches
        const NOTES_ROW_HEIGHT = 50;  // Space for notes
        
        // ===== SMART PAGE BREAK CALCULATION =====
        // Letter size portrait with 0.75" margins = 9.5" usable height
        // At 72 pixels per inch = 684 pixels per page
        const PAGE_HEIGHT_PX = 684;
        
        // Estimate content height based on known row heights
        // Row 1: 42px (2x default)
        // Row 2: 42px (2x default)  
        // Row 3: 21px (scope label)
        // Row 4: ~80px estimated (scope content, auto-sized)
        // Row 5: 21px (Unit Layout header)
        // Row 6: 315px (sketch area, 15x default)
        // Row 7: 21px (table header)
        // Work item rows: ~25px each (with text wrap)
        // Total row: 25px
        
        const HEADER_HEIGHT = 42 + 42 + 21 + 80 + 21 + 315 + 21; // = 542px
        const WORK_ITEM_ROW_HEIGHT = 25;
        const TOTAL_ROW_HEIGHT = 25;
        
        const workItemCount = workItemRows.length;
        const estimatedContentHeight = HEADER_HEIGHT + (workItemCount * WORK_ITEM_ROW_HEIGHT) + TOTAL_ROW_HEIGHT;
        
        // Calculate how much of page 1 is used
        const usedOnPage1 = estimatedContentHeight % PAGE_HEIGHT_PX;
        
        // Calculate spacer needed to fill remainder of page 1
        // Add a small buffer (20px) to ensure we're definitely on page 2
        let pageBreakSpacer = PAGE_HEIGHT_PX - usedOnPage1 + 20;
        
        // If content already spills to page 2, use minimal spacer
        if (estimatedContentHeight > PAGE_HEIGHT_PX) {
          // Content is already on page 2, just need to get to top of next page
          pageBreakSpacer = PAGE_HEIGHT_PX - usedOnPage1 + 20;
        }
        
        // Ensure minimum spacer of 50px for visual separation
        pageBreakSpacer = Math.max(pageBreakSpacer, 50);
        
        console.log(`Page break calculation: content=${estimatedContentHeight}px, used=${usedOnPage1}px, spacer=${pageBreakSpacer}px`);
        
        // Add page break spacer row after TOTAL
        const pageBreakRow = totalRowNum + 2;
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                updateDimensionProperties: {
                  range: {
                    sheetId: newSheetId,
                    dimension: 'ROWS',
                    startIndex: pageBreakRow - 1,
                    endIndex: pageBreakRow
                  },
                  properties: { pixelSize: Math.round(pageBreakSpacer) },
                  fields: 'pixelSize'
                }
              }
            ]
          }
        });
        
        // Start photos after the page break spacer
        let currentRow = pageBreakRow + 1;
        
        // Add "Site Photos" header (starts at top of new page)
        const photoHeaderRow = currentRow;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${newSheetName}'!A${photoHeaderRow}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['📷 Site Photos']]
          }
        });
        
        // Format header: merge A-I, bold, centered, gray background
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                mergeCells: {
                  range: {
                    sheetId: newSheetId,
                    startRowIndex: photoHeaderRow - 1,
                    endRowIndex: photoHeaderRow,
                    startColumnIndex: 0,
                    endColumnIndex: 9
                  },
                  mergeType: 'MERGE_ALL'
                }
              },
              {
                repeatCell: {
                  range: {
                    sheetId: newSheetId,
                    startRowIndex: photoHeaderRow - 1,
                    endRowIndex: photoHeaderRow,
                    startColumnIndex: 0,
                    endColumnIndex: 9
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: true, fontSize: 14 },
                      horizontalAlignment: 'CENTER',
                      verticalAlignment: 'MIDDLE',
                      backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                    }
                  },
                  fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,backgroundColor)'
                }
              },
              {
                updateDimensionProperties: {
                  range: {
                    sheetId: newSheetId,
                    dimension: 'ROWS',
                    startIndex: photoHeaderRow - 1,
                    endIndex: photoHeaderRow
                  },
                  properties: { pixelSize: 30 },
                  fields: 'pixelSize'
                }
              }
            ]
          }
        });
        
        currentRow++;
        
        // Add each photo with notes row
        for (let i = 0; i < successfulPhotos.length; i++) {
          const photo = successfulPhotos[i];
          const photoRow = currentRow;
          const notesRow = currentRow + 1;
          
          // Get caption from the original photo data
          const originalPhoto = photos.find(p => p.name === photo.originalName);
          const caption = originalPhoto?.caption || photo.caption || '';
          
          // Write photo IMAGE formula and notes
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
              valueInputOption: 'USER_ENTERED',
              data: [
                {
                  range: `'${newSheetName}'!A${photoRow}`,
                  values: [[`=IMAGE("${photo.directUrl}", 1)`]]
                },
                {
                  range: `'${newSheetName}'!A${notesRow}`,
                  values: [[caption || `Photo ${i + 1} notes:`]]
                }
              ]
            }
          });
          
          // Format photo row and notes row
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                // Merge photo row A-I
                {
                  mergeCells: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: photoRow - 1,
                      endRowIndex: photoRow,
                      startColumnIndex: 0,
                      endColumnIndex: 9
                    },
                    mergeType: 'MERGE_ALL'
                  }
                },
                // Photo row height (6 inches = 432 pixels)
                {
                  updateDimensionProperties: {
                    range: {
                      sheetId: newSheetId,
                      dimension: 'ROWS',
                      startIndex: photoRow - 1,
                      endIndex: photoRow
                    },
                    properties: { pixelSize: PHOTO_ROW_HEIGHT },
                    fields: 'pixelSize'
                  }
                },
                // Photo row formatting: centered
                {
                  repeatCell: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: photoRow - 1,
                      endRowIndex: photoRow,
                      startColumnIndex: 0,
                      endColumnIndex: 9
                    },
                    cell: {
                      userEnteredFormat: {
                        horizontalAlignment: 'CENTER',
                        verticalAlignment: 'MIDDLE',
                        backgroundColor: { red: 1, green: 1, blue: 1 }
                      }
                    },
                    fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,backgroundColor)'
                  }
                },
                // Merge notes row A-I
                {
                  mergeCells: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: notesRow - 1,
                      endRowIndex: notesRow,
                      startColumnIndex: 0,
                      endColumnIndex: 9
                    },
                    mergeType: 'MERGE_ALL'
                  }
                },
                // Notes row formatting: text wrap, light gray background
                {
                  repeatCell: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: notesRow - 1,
                      endRowIndex: notesRow,
                      startColumnIndex: 0,
                      endColumnIndex: 9
                    },
                    cell: {
                      userEnteredFormat: {
                        horizontalAlignment: 'CENTER',
                        verticalAlignment: 'TOP',
                        wrapStrategy: 'WRAP',
                        textFormat: { fontSize: 10, italic: true },
                        backgroundColor: { red: 0.98, green: 0.98, blue: 0.98 }
                      }
                    },
                    fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,textFormat,backgroundColor)'
                  }
                },
                // Notes row minimum height
                {
                  updateDimensionProperties: {
                    range: {
                      sheetId: newSheetId,
                      dimension: 'ROWS',
                      startIndex: notesRow - 1,
                      endIndex: notesRow
                    },
                    properties: { pixelSize: NOTES_ROW_HEIGHT },
                    fields: 'pixelSize'
                  }
                },
                // Add bottom border to notes row for visual separation
                {
                  updateBorders: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: notesRow - 1,
                      endRowIndex: notesRow,
                      startColumnIndex: 0,
                      endColumnIndex: 9
                    },
                    bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } }
                  }
                }
              ]
            }
          });
          
          currentRow += 2; // Move past photo row and notes row
        }
        
        photoGalleryEndRow = currentRow - 1;
        console.log(`Photo gallery added, ends at row ${photoGalleryEndRow}`);
      }
    }

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
