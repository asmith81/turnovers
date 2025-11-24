import { generateScopes } from '../../lib/anthropic';
import { writeToSheet } from '../../lib/sheets';

/**
 * POST /api/submit
 * 
 * Generate scopes and submit to Google Sheets
 * 
 * Request body:
 * {
 *   structuredData: object
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   sheetUrl: string,
 *   rowNumber: number,
 *   englishScope: string,
 *   spanishScope: string,
 *   error?: string
 * }
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { structuredData } = req.body;

    // Validate input
    if (!structuredData || typeof structuredData !== 'object') {
      return res.status(400).json({ error: 'structuredData is required and must be an object' });
    }

    // Validate required fields
    if (!structuredData.workItems || !Array.isArray(structuredData.workItems)) {
      return res.status(400).json({ error: 'structuredData.workItems is required and must be an array' });
    }

    if (structuredData.workItems.length === 0) {
      return res.status(400).json({ error: 'At least one work item is required' });
    }

    // Generate English and Spanish scopes
    const { englishScope, spanishScope } = await generateScopes(structuredData);

    // Write to Google Sheet
    const sheetResult = await writeToSheet({
      structuredData,
      englishScope,
      spanishScope
    });

    // Return success response
    return res.status(200).json({
      ...sheetResult,
      englishScope,
      spanishScope
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

