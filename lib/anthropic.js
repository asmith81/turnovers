import Anthropic from '@anthropic-ai/sdk';
import { PRICING_CATALOG, findPricing } from './pricingCatalog';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Tool definition for structured data extraction
const updateTurnoverDataTool = {
  name: 'update_turnover_data',
  description: 'Update the turnover assessment data with extracted information from the conversation. Call this tool whenever you have new information to add or update.',
  input_schema: {
    type: 'object',
    properties: {
      workOrderNumber: {
        type: 'string',
        description: 'Work order number (e.g., "28867")'
      },
      unitNumber: {
        type: 'string',
        description: 'Unit number (e.g., "301")'
      },
      address: {
        type: 'string',
        description: 'Property address (e.g., "1448 Park Road NW")'
      },
      unitSquareFeet: {
        type: 'string',
        description: 'Total square footage of unit (e.g., "511")'
      },
      unitLayout: {
        type: 'string',
        description: 'Layout description (e.g., "2 bedrooms Unit", "Studio", "1 bedroom")'
      },
      workItems: {
        type: 'array',
        description: 'List of work items to be completed',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['Painting', 'Floor & Molding', 'Doors & Windows', 'Other', 'Outlets No Wiring', 'Light Switch No Wiring', 'Electrical Installation', 'Plumbing Installation', 'Plumbing Repairs', 'Clean Up'],
              description: 'Work category'
            },
            item: {
              type: 'string',
              description: 'Specific item from the pricing catalog (e.g., "Clean Walls", "Prep & Paint Walls 2 Coats", "Faucet")'
            },
            description: {
              type: 'string',
              enum: ['Clean', 'Paint', 'Install', 'Remove & Install', 'Demolition', 'Repair', 'Repairs', 'Refinish', 'Other'],
              description: 'Type of work to be performed'
            },
            unit: {
              type: 'string',
              enum: ['SF', 'LF', 'EA', 'SET'],
              description: 'Unit of measurement: SF (square foot), LF (linear foot), EA (each), SET (set)'
            },
            multiplier: {
              type: 'number',
              description: 'Quantity of units (e.g., 300 for 300 SF, 1 for 1 faucet)'
            },
            notes: {
              type: 'string',
              description: 'Additional notes in English or Spanish (e.g., location, special instructions)'
            }
          },
          required: ['category', 'item', 'description', 'unit', 'multiplier']
        }
      },
      isComplete: {
        type: 'boolean',
        description: 'Set to true when you have gathered enough information to generate a complete scope of work'
      }
    },
    required: ['workItems']
  }
};

/**
 * Build the pricing catalog reference for the system prompt
 */
function buildPricingReference() {
  let ref = 'PRICING CATALOG REFERENCE:\n\n';
  for (const [category, items] of Object.entries(PRICING_CATALOG)) {
    ref += `${category}:\n`;
    items.forEach(item => {
      ref += `  - "${item.item}" (${item.description}) - ${item.unit} @ $${item.pricePerUnit.toFixed(2)}${item.materialsCost ? ' + Materials' : ''}\n`;
    });
    ref += '\n';
  }
  return ref;
}

/**
 * Process user input and extract/update structured data using tool use
 * @param {string} userInput - The user's text input
 * @param {object} currentData - Current structured data object
 * @param {array} conversationHistory - Array of previous messages
 * @returns {object} { updatedData, assistantMessage, isComplete }
 */
export async function processWithLLM(userInput, currentData, conversationHistory) {
  const pricingRef = buildPricingReference();
  
  const systemPrompt = `You are helping a field worker document a construction job site assessment for apartment turnovers.

YOUR WORKFLOW:
1. Have a natural conversation to gather information about the work needed
2. After EACH user message, call the update_turnover_data tool to save any new information
3. Ask clarifying questions when needed (one at a time)
4. When you have enough info, set isComplete to true in the tool call

INFORMATION TO GATHER:
- Work order number
- Unit number  
- Address
- Unit square footage
- Unit layout (studio, 1 bed, 2 bed, etc.)
- All work items with quantities and locations

WORK ITEMS - Map user descriptions to catalog items:
- "paint the walls" → category: "Painting", item: "Prep & Paint Walls 2 Coats"
- "clean the walls" → category: "Painting", item: "Clean Walls"
- "fix a hole in the wall" → category: "Painting", item: "Patch Hole" or "Patch small hole (2")"
- "new faucet" → category: "Plumbing Installation", item: "Faucet"
- "replace toilet" → category: "Plumbing Installation", item: "Floor Mounted toilet w/ tank"
- "install flooring" → category: "Floor & Molding", item: "Vinyl Plank Flooring"
- "clean the unit" → category: "Clean Up", item: "General Clean"

${pricingRef}

CURRENT DATA STATE:
${JSON.stringify(currentData, null, 2)}

RULES:
- ALWAYS call update_turnover_data tool after each message with current state
- Include ALL previous work items plus any new ones in each tool call
- Be conversational and friendly
- Ask about quantities in square feet (SF), linear feet (LF), or count (EA)
- Ask what room/location each work item is for (put in notes field)
- If user speaks Spanish, respond in Spanish but keep data fields in English
- Set isComplete: true when ready to generate the scope`;

  // Build messages - filter out any tool-related messages for the API
  const messages = [
    ...conversationHistory.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: userInput }
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools: [updateTurnoverDataTool],
      tool_choice: { type: 'auto' },
      messages: messages
    });

    // Process the response - extract both text and tool use
    let assistantMessage = '';
    let updatedData = { ...currentData };
    let isComplete = false;

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      } else if (block.type === 'tool_use' && block.name === 'update_turnover_data') {
        const toolInput = block.input;
        
        // Merge tool input into updated data
        if (toolInput.workOrderNumber) updatedData.workOrderNumber = toolInput.workOrderNumber;
        if (toolInput.unitNumber) updatedData.unitNumber = toolInput.unitNumber;
        if (toolInput.address) updatedData.address = toolInput.address;
        if (toolInput.unitSquareFeet) updatedData.unitSquareFeet = toolInput.unitSquareFeet;
        if (toolInput.unitLayout) updatedData.unitLayout = toolInput.unitLayout;
        
        // Process work items - add pricing from catalog
        if (toolInput.workItems && toolInput.workItems.length > 0) {
          updatedData.workItems = toolInput.workItems.map((item, index) => {
            const pricing = findPricing(item.category, item.item, item.description);
            const pricePerUnit = pricing ? pricing.pricePerUnit : 0;
            const materialsCost = pricing ? pricing.materialsCost : false;
            
            return {
              id: String(index + 1),
              category: item.category,
              item: item.item,
              description: item.description,
              unit: item.unit,
              multiplier: item.multiplier,
              pricePerUnit: pricePerUnit,
              total: item.multiplier * pricePerUnit,
              notes: item.notes || '',
              materialsCost: materialsCost
            };
          });
        }
        
        if (toolInput.isComplete) {
          isComplete = true;
        }
      }
    }

    // If no text response, generate a follow-up
    if (!assistantMessage.trim()) {
      assistantMessage = isComplete 
        ? "I have all the information I need. Ready to generate the scope of work!"
        : "Got it! What else needs to be done?";
    }

    return {
      updatedData,
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
  const workSummary = structuredData.workItems.map(item => 
    `- ${item.category}: ${item.item} (${item.description}) - ${item.multiplier} ${item.unit}${item.notes ? ` - ${item.notes}` : ''}`
  ).join('\n');

  const projectInfo = `
Project: ${structuredData.address || 'N/A'}
Unit: ${structuredData.unitNumber || 'N/A'}
Work Order: ${structuredData.workOrderNumber || 'N/A'}
Square Feet: ${structuredData.unitSquareFeet || 'N/A'}
Layout: ${structuredData.unitLayout || 'N/A'}
`;

  const englishPrompt = `Generate a clear, professional scope of work in English for this apartment turnover:

${projectInfo}

Work Items:
${workSummary}

Write 1-2 concise paragraphs describing all work to be completed. Be specific about locations, quantities, and what needs to be done. This will be read by subcontractors.`;

  const spanishPrompt = `Generate a clear, professional scope of work in Spanish for this apartment turnover:

${projectInfo}

Work Items:
${workSummary}

Write 1-2 concise paragraphs in Spanish describing all work to be completed. Be specific about locations, quantities, and what needs to be done. Use proper construction terminology in Spanish. This will be read by Spanish-speaking subcontractors.`;

  try {
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
