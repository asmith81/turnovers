import { generateScopes } from '../../lib/anthropic';

/**
 * POST /api/generate-scopes
 * 
 * Generate English and Spanish scopes without submitting
 * 
 * Request body:
 * {
 *   structuredData: object
 * }
 * 
 * Response:
 * {
 *   englishScope: string,
 *   spanishScope: string
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { structuredData } = req.body;

    if (!structuredData || typeof structuredData !== 'object') {
      return res.status(400).json({ error: 'structuredData is required' });
    }

    if (!structuredData.workItems || structuredData.workItems.length === 0) {
      return res.status(400).json({ error: 'At least one work item is required' });
    }

    const { englishScope, spanishScope } = await generateScopes(structuredData);

    return res.status(200).json({
      englishScope,
      spanishScope
    });

  } catch (error) {
    console.error('Error generating scopes:', error);
    return res.status(500).json({ 
      error: 'Failed to generate scopes',
      message: error.message 
    });
  }
}

