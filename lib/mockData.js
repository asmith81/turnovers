/**
 * Mock data and responses for frontend development
 */

export const mockResponses = [
  {
    trigger: /paint|wall/i,
    response: "I see you need some painting work done. Which room is this for?",
    updatedData: {
      workItems: [
        {
          id: '1',
          category: 'paint',
          room: '',
          description: 'Paint walls',
          quantity: '',
          unit: 'walls',
          unitPrice: '',
          total: ''
        }
      ]
    }
  },
  {
    trigger: /living|bedroom|kitchen|bathroom/i,
    response: "Got it. How many walls need painting?",
    updatedData: null // Will merge with existing
  },
  {
    trigger: /\d+/,
    response: "What's the square footage of these walls?",
    updatedData: null
  }
];

export const mockStructuredData = {
  projectInfo: {
    address: '123 Main St, Apt 4B',
    date: '2025-11-24',
    assessor: 'John Doe'
  },
  workItems: [
    {
      id: '1',
      category: 'paint',
      room: 'Living Room',
      description: 'Paint walls - water damage repair needed',
      quantity: 3,
      unit: 'walls',
      unitPrice: 150,
      total: 450
    },
    {
      id: '2',
      category: 'floor',
      room: 'Bedroom',
      description: 'Clean and polish hardwood floors',
      quantity: 250,
      unit: 'sqft',
      unitPrice: 2.50,
      total: 625
    }
  ],
  notes: 'North wall has water stain that needs primer before paint'
};

export const mockScopes = {
  english: `Complete the following work at 123 Main St, Apt 4B:

Living Room: Repair water damage and paint three walls (north, east, and west). North wall requires primer due to water staining. Paint color to match existing.

Bedroom: Clean and polish 250 square feet of hardwood flooring. Remove all debris and furniture protection upon completion.

All work must be completed in a professional manner with proper preparation and cleanup.`,
  
  spanish: `Completar el siguiente trabajo en 123 Main St, Apt 4B:

Sala de estar: Reparar daños por agua y pintar tres paredes (norte, este y oeste). La pared norte requiere imprimación debido a manchas de agua. El color de la pintura debe coincidir con el existente.

Dormitorio: Limpiar y pulir 250 pies cuadrados de piso de madera. Retirar todos los escombros y protección de muebles al finalizar.

Todo el trabajo debe completarse de manera profesional con la preparación y limpieza adecuadas.`
};

/**
 * Simulate API delay
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock the /api/process endpoint
 */
export async function mockProcessAPI(userInput, currentData, conversationHistory) {
  await delay(800); // Simulate network delay
  
  // Simple mock logic
  const lowerInput = userInput.toLowerCase();
  
  let response = "I understand. Can you tell me more details?";
  let updatedData = { ...currentData };
  let isComplete = false;
  
  // Check if user is saying they're done
  if (lowerInput.includes('done') || lowerInput.includes('that\'s all') || lowerInput.includes('finish')) {
    response = "Great! I have all the information I need. Ready to generate the scope of work.";
    isComplete = true;
  }
  
  return {
    updatedData,
    assistantMessage: response,
    isComplete
  };
}

/**
 * Mock the /api/submit endpoint
 */
export async function mockSubmitAPI(structuredData) {
  await delay(1500); // Simulate processing time
  
  return {
    success: true,
    sheetUrl: 'https://docs.google.com/spreadsheets/d/mock-sheet-id',
    rowNumber: 42,
    englishScope: mockScopes.english,
    spanishScope: mockScopes.spanish
  };
}

