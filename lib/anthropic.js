import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Process user input and extract/update structured data
 * @param {string} userInput - The user's text input
 * @param {object} currentData - Current structured data object
 * @param {array} conversationHistory - Array of previous messages
 * @returns {object} { updatedData, assistantMessage, isComplete }
 */
export async function processWithLLM(userInput, currentData, conversationHistory) {
  // Define the expected structure for work items
  const dataSchema = {
    projectInfo: {
      address: '',
      date: '',
      assessor: ''
    },
    workItems: [],
    notes: ''
  };

  // Build the system prompt
  const systemPrompt = `You are helping a field worker document a construction job site assessment.

Your job is to:
1. Extract structured information from their descriptions
2. Ask clarifying questions for any missing details
3. Fill in this data structure:

${JSON.stringify(dataSchema, null, 2)}

Work items should include:
- category: "paint" | "floor" | "repair" | "clean" | "other"
- room: which room/area
- description: clear description of work needed
- quantity: numeric amount
- unit: "sqft" | "walls" | "each"
- unitPrice: dollar amount per unit (ask if not provided)

Current data state:
${JSON.stringify(currentData, null, 2)}

Rules:
- Be conversational and friendly
- Ask one question at a time
- When you have enough information, say you're ready to generate the scope
- Extract room names, quantities, and work types from natural language
- If user mentions "3 walls", create 1 work item with quantity: 3, unit: "walls"
`;

  // Build messages array
  const messages = [
    ...conversationHistory,
    {
      role: 'user',
      content: userInput
    }
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Parse the response to extract updated data
    // For now, we'll use a simple approach - ask Claude to provide structured output
    // In next iteration, we can use tool use for more reliable extraction
    
    // Check if Claude thinks we're done
    const isComplete = assistantMessage.toLowerCase().includes('ready to generate') || 
                       assistantMessage.toLowerCase().includes('have all the information');

    return {
      updatedData: currentData, // TODO: Actually parse and update data from LLM response
      assistantMessage,
      isComplete
    };

  } catch (error) {
    console.error('Anthropic API error:', error);
    throw new Error(`LLM processing failed: ${error.message}`);
  }
}

/**
 * Generate English and Spanish scope of work descriptions
 * @param {object} structuredData - The complete structured data
 * @returns {object} { englishScope, spanishScope }
 */
export async function generateScopes(structuredData) {
  const englishPrompt = `Generate a clear, detailed scope of work in English based on this data:

${JSON.stringify(structuredData, null, 2)}

Write a professional paragraph that describes all work to be completed. Be specific about locations, quantities, and materials. This will be read by subcontractors.`;

  const spanishPrompt = `Generate a clear, detailed scope of work in Spanish based on this data:

${JSON.stringify(structuredData, null, 2)}

Write a professional paragraph that describes all work to be completed. Be specific about locations, quantities, and materials. Use proper construction terminology in Spanish. This will be read by Spanish-speaking subcontractors.`;

  try {
    // Generate both in parallel
    const [englishResponse, spanishResponse] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: englishPrompt }]
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: spanishPrompt }]
      })
    ]);

    return {
      englishScope: englishResponse.content[0].text,
      spanishScope: spanishResponse.content[0].text
    };

  } catch (error) {
    console.error('Scope generation error:', error);
    throw new Error(`Scope generation failed: ${error.message}`);
  }
}

