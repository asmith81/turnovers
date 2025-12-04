import { writeToSheet } from '../../lib/sheets';

/**
 * POST /api/submit
 * 
 * Submit turnover data and scopes to Google Sheets
 * 
 * Request body:
 * {
 *   structuredData: object,
 *   englishScope: string,
 *   spanishScope: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   sheetUrl: string,
 *   rowNumber: number,
 *   error?: string
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { structuredData, englishScope, spanishScope } = req.body;

    // Validate input
    if (!structuredData || typeof structuredData !== 'object') {
      return res.status(400).json({ error: 'structuredData is required' });
    }

    if (!structuredData.workItems || structuredData.workItems.length === 0) {
      return res.status(400).json({ error: 'At least one work item is required' });
    }

    if (!englishScope || !spanishScope) {
      return res.status(400).json({ error: 'Both englishScope and spanishScope are required' });
    }

    // Write to Google Sheet
    const sheetResult = await writeToSheet({
      structuredData,
      englishScope,
      spanishScope
    });

    // Return success response
    return res.status(200).json({
      success: true,
      ...sheetResult
    });

  } catch (error) {
    console.error('Error in /api/submit:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
}
