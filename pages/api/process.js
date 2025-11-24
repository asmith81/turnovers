import { processWithLLM } from '../../lib/anthropic';

/**
 * POST /api/process
 * 
 * Process user input through LLM to build structured data
 * 
 * Request body:
 * {
 *   userInput: string,
 *   currentData: object,
 *   conversationHistory: array
 * }
 * 
 * Response:
 * {
 *   updatedData: object,
 *   assistantMessage: string,
 *   isComplete: boolean
 * }
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userInput, currentData, conversationHistory } = req.body;

    // Validate input
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({ error: 'userInput is required and must be a string' });
    }

    // Provide defaults for optional parameters
    const data = currentData || {
      projectInfo: { address: '', date: '', assessor: '' },
      workItems: [],
      notes: ''
    };
    const history = conversationHistory || [];

    // Process with LLM
    const result = await processWithLLM(userInput, data, history);

    // Return the result
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in /api/process:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

