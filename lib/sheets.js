import { google } from 'googleapis';

/**
 * Get authenticated Google Sheets client
 */
function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

/**
 * Write assessment data to Google Sheet
 * @param {object} data - Object containing structuredData, englishScope, spanishScope
 * @returns {object} { success, sheetUrl, rowNumber }
 */
export async function writeToSheet(data) {
  const { structuredData, englishScope, spanishScope } = data;

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // Prepare row data
    // This is a simple mapping - adjust to match your actual sheet structure
    const rowData = [
      structuredData.projectInfo.date || new Date().toLocaleDateString(),
      structuredData.projectInfo.address || '',
      structuredData.projectInfo.assessor || '',
      englishScope || '',
      spanishScope || '',
    ];

    // Add work items (flatten into columns)
    // Assuming max 10 work items for now
    for (let i = 0; i < 10; i++) {
      const item = structuredData.workItems[i];
      if (item) {
        rowData.push(
          item.category || '',
          item.room || '',
          item.description || '',
          item.quantity || '',
          item.unit || '',
          item.unitPrice || '',
          item.quantity && item.unitPrice ? item.quantity * item.unitPrice : ''
        );
      } else {
        // Empty cells for unused item slots
        rowData.push('', '', '', '', '', '', '');
      }
    }

    // Add notes at the end
    rowData.push(structuredData.notes || '');

    // Append the row
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:A', // Adjust sheet name if needed
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });

    // Extract row number from response
    const updatedRange = response.data.updates.updatedRange;
    const rowNumber = updatedRange.match(/\d+$/)?.[0];

    return {
      success: true,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      rowNumber: rowNumber ? parseInt(rowNumber) : null,
    };

  } catch (error) {
    console.error('Google Sheets API error:', error);
    throw new Error(`Failed to write to sheet: ${error.message}`);
  }
}

/**
 * Test the Google Sheets connection
 * @returns {boolean} true if connection successful
 */
export async function testConnection() {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // Try to read the sheet metadata
    await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return true;
  } catch (error) {
    console.error('Google Sheets connection test failed:', error);
    return false;
  }
}

