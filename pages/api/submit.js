import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { writeToSheet } from '../../lib/sheets';

/**
 * POST /api/submit
 * 
 * Submit turnover data, scopes, sketch, and photos to Google Sheets/Drive
 * Uses the logged-in user's OAuth token for API access
 * 
 * Request body:
 * {
 *   structuredData: object,
 *   englishScope: string,
 *   spanishScope: string,
 *   sketch: string (base64 data URL, optional),
 *   photos: Array<{ url: string, name: string, caption: string }> (optional)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   sheetUrl: string,
 *   sheetName: string,
 *   sketchUrl: string (if sketch was uploaded),
 *   photoUrls: Array (if photos were uploaded),
 *   error?: string
 * }
 */

// Increase body size limit for sketch + photos uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Allow up to 50MB for sketch + multiple photos
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user's session (includes access token)
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated. Please sign in.' });
    }

    if (!session.accessToken) {
      return res.status(401).json({ error: 'No access token. Please sign out and sign in again.' });
    }

    const { structuredData, englishScope, spanishScope, sketch, photos } = req.body;

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

    // Write to Google Sheet using user's OAuth token
    const sheetResult = await writeToSheet({
      structuredData,
      englishScope,
      spanishScope,
      sketch: sketch || null,
      photos: photos || []
    }, session.accessToken);

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
