/**
 * Pricing catalog extracted from turnover template
 * Used for validation and LLM-assisted data entry
 */

export const UNIT_TYPES = {
  SF: 'SF', // Square Foot
  LF: 'LF', // Linear Foot
  EA: 'EA', // Each
  SET: 'SET' // Set
};

export const UNIT_LABELS = {
  SF: 'Square Foot',
  LF: 'Linear Foot',
  EA: 'Each',
  SET: 'Set'
};

export const DESCRIPTION_TYPES = [
  'Clean',
  'Paint',
  'Install',
  'Remove & Install',
  'Demolition',
  'Repair',
  'Repairs',
  'Refinish',
  'Other'
];

export const PRICING_CATALOG = {
  'Painting': [
    { item: 'Clean Walls', description: 'Clean', unit: 'SF', pricePerUnit: 0.15 },
    { item: 'Clean Ceiling', description: 'Clean', unit: 'SF', pricePerUnit: 0.20 },
    { item: 'Patch small hole (2")', description: 'Install', unit: 'EA', pricePerUnit: 4.00 },
    { item: 'Patch Hole', description: 'Install', unit: 'SF', pricePerUnit: 15.50 },
    { item: 'Prep & Paint Walls 2 Coats', description: 'Paint', unit: 'SF', pricePerUnit: 0.68 },
    { item: 'Extra Coat of Paint', description: 'Paint', unit: 'SF', pricePerUnit: 0.35 },
    { item: 'Prep & Paint Ceiling 2 Coats', description: 'Paint', unit: 'SF', pricePerUnit: 0.73 },
  ],
  'Floor & Molding': [
    { item: 'Flooring', description: 'Demolition', unit: 'SF', pricePerUnit: 1.20 },
    { item: 'Vinyl Plank Flooring', description: 'Install', unit: 'SF', pricePerUnit: 3.85 },
    { item: 'Base Molding 4"', description: 'Remove & Install', unit: 'LF', pricePerUnit: 3.86 },
    { item: 'Base Molding 4"', description: 'Clean', unit: 'LF', pricePerUnit: 0.27 },
    { item: 'Base Molding 4"', description: 'Paint', unit: 'LF', pricePerUnit: 0.66 },
    { item: 'Vinyl Base 4"', description: 'Remove & Install', unit: 'LF', pricePerUnit: 3.50 },
    { item: 'Vinyl Base 4"', description: 'Clean', unit: 'LF', pricePerUnit: 0.50 },
    { item: 'Shoe Molding', description: 'Remove & Install', unit: 'LF', pricePerUnit: 2.75 },
    { item: 'Shoe Molding', description: 'Clean', unit: 'LF', pricePerUnit: 0.18 },
    { item: 'Shoe Molding', description: 'Paint', unit: 'LF', pricePerUnit: 0.70 },
  ],
  'Doors & Windows': [
    { item: 'Paint Window Frame', description: 'Paint', unit: 'LF', pricePerUnit: 1.00 },
    { item: 'Clean Window Frame', description: 'Clean', unit: 'LF', pricePerUnit: 0.50 },
    { item: 'Repair Blind Chain', description: 'Repair', unit: 'EA', pricePerUnit: 20.00 },
    { item: 'Paint 36" Door', description: 'Paint', unit: 'EA', pricePerUnit: 40.00 },
    { item: 'Paint up to 6\' Closet Door', description: 'Paint', unit: 'EA', pricePerUnit: 90.00 },
    { item: 'Clean Doors', description: 'Clean', unit: 'EA', pricePerUnit: 10.00 },
    { item: 'Paint Frame Only', description: 'Paint', unit: 'EA', pricePerUnit: 25.00 },
    { item: 'Remove and Install Door w/frame', description: 'Remove & Install', unit: 'EA', pricePerUnit: 120.00, materialsCost: true },
    { item: 'Remove and Install Door Hardware', description: 'Remove & Install', unit: 'EA', pricePerUnit: 45.00, materialsCost: true },
  ],
  'Other': [
    { item: 'Countertop Butcherblock', description: 'Remove & Install', unit: 'SF', pricePerUnit: 30.00 },
    { item: 'Countertop Butcherblock', description: 'Refinish', unit: 'SF', pricePerUnit: 6.00 },
    { item: 'Shower Curtain Hooks', description: 'Install', unit: 'SET', pricePerUnit: 25.00 },
    { item: 'Shower Curtain', description: 'Install', unit: 'EA', pricePerUnit: 20.00 },
    { item: 'Blinds', description: 'Remove & Install, HD Contractor Grade', unit: 'SF', pricePerUnit: 5.47 },
    { item: 'Blinds', description: 'Clean', unit: 'SF', pricePerUnit: 0.60 },
    { item: 'Other repairs', description: 'Repair', unit: 'EA', pricePerUnit: 0.00 }, // Custom pricing
  ],
  'Outlets No Wiring': [
    { item: '120V Outlet', description: 'Remove & Install', unit: 'EA', pricePerUnit: 60.00 },
    { item: 'Plate Only', description: 'Remove & Install', unit: 'EA', pricePerUnit: 12.00 },
    { item: 'GFCI Outlet', description: 'Remove & Install', unit: 'EA', pricePerUnit: 90.00 },
  ],
  'Light Switch No Wiring': [
    { item: 'Single', description: 'Remove & Install', unit: 'EA', pricePerUnit: 41.00 },
    { item: 'Plate Only', description: 'Remove & Install', unit: 'EA', pricePerUnit: 11.00 },
    { item: 'Double', description: 'Remove & Install', unit: 'EA', pricePerUnit: 57.00 },
    { item: 'Triple', description: 'Remove & Install', unit: 'EA', pricePerUnit: 85.00 },
    { item: 'Dimmer', description: 'Remove & Install', unit: 'EA', pricePerUnit: 75.00 },
  ],
  'Electrical Installation': [
    { item: 'Light Fixture', description: 'Remove & Install', unit: 'EA', pricePerUnit: 60.00, materialsCost: true },
    { item: 'Garbage Disposal', description: 'Remove & Install', unit: 'EA', pricePerUnit: 90.00, materialsCost: true },
    { item: 'Range Hood Vented', description: 'Remove & Install', unit: 'EA', pricePerUnit: 140.00, materialsCost: true },
    { item: 'Range Hood Ventless', description: 'Remove & Install', unit: 'EA', pricePerUnit: 130.00, materialsCost: true },
    { item: 'Bathroom Exhaust', description: 'Remove & Install', unit: 'EA', pricePerUnit: 75.00, materialsCost: true },
    { item: 'Smoke Detector Wired', description: 'Remove & Install', unit: 'EA', pricePerUnit: 45.00, materialsCost: true },
    { item: 'Smoke Detector Batteries', description: 'Remove & Install', unit: 'EA', pricePerUnit: 35.00, materialsCost: true },
  ],
  'Plumbing Installation': [
    { item: 'Floor Mounted toilet w/ tank', description: 'Remove & Install', unit: 'EA', pricePerUnit: 160.00, materialsCost: true },
    { item: 'Wall Mounted Toilet w/Flush Valve', description: 'Remove & Install', unit: 'EA', pricePerUnit: 180.00, materialsCost: true },
    { item: 'Urinal', description: 'Remove & Install', unit: 'EA', pricePerUnit: 170.00, materialsCost: true },
    { item: 'Seat', description: 'Remove & Install', unit: 'EA', pricePerUnit: 30.00, materialsCost: true },
    { item: 'Faucet', description: 'Remove & Install', unit: 'EA', pricePerUnit: 65.00, materialsCost: true },
    { item: 'Drain Basket', description: 'Remove & Install', unit: 'EA', pricePerUnit: 50.00, materialsCost: true },
    { item: 'Shower Head', description: 'Remove & Install', unit: 'EA', pricePerUnit: 35.00, materialsCost: true },
    { item: 'Shower Rod', description: 'Remove & Install', unit: 'EA', pricePerUnit: 40.00, materialsCost: true },
    { item: 'Shower Faucet Set', description: 'Remove & Install', unit: 'EA', pricePerUnit: 95.00, materialsCost: true },
    { item: 'Soap Dispenser', description: 'Remove & Install', unit: 'EA', pricePerUnit: 35.00, materialsCost: true },
    { item: 'Towel Bar', description: 'Remove & Install', unit: 'EA', pricePerUnit: 30.00, materialsCost: true },
  ],
  'Plumbing Repairs': [
    { item: 'Install or Replace New Sloan or Similar Brand Flush Valve', description: 'Repairs', unit: 'EA', pricePerUnit: 155.00, materialsCost: true },
    { item: 'General Plumbing Repairs (faucet rebuild, replace fill valve, toilet tank rebuild, handle repairs, replace P traps)', description: 'Repairs', unit: 'EA', pricePerUnit: 45.00, materialsCost: true },
    { item: 'Tub Stopper', description: 'Remove & Install', unit: 'EA', pricePerUnit: 25.00 },
    { item: 'Caulking', description: 'Remove & Install', unit: 'LF', pricePerUnit: 7.00 },
  ],
  'Clean Up': [
    { item: 'General Clean', description: 'Clean', unit: 'SF', pricePerUnit: 0.10 },
    { item: 'Refrigerator', description: 'Clean', unit: 'EA', pricePerUnit: 45.00 },
    { item: 'Oven', description: 'Clean', unit: 'EA', pricePerUnit: 45.00 },
    { item: 'Wall Coverings', description: 'Clean', unit: 'SF', pricePerUnit: 1.00 },
    { item: 'Replace Batteries', description: 'Other', unit: 'EA', pricePerUnit: 15.00 },
    { item: 'Outlet & Switch Plates', description: 'Clean', unit: 'EA', pricePerUnit: 2.00 },
  ],
};

/**
 * Get all categories
 */
export function getCategories() {
  return Object.keys(PRICING_CATALOG);
}

/**
 * Get items for a specific category
 */
export function getItemsForCategory(category) {
  return PRICING_CATALOG[category] || [];
}

/**
 * Get all unique items (across all categories)
 */
export function getAllItems() {
  const items = new Set();
  Object.values(PRICING_CATALOG).forEach(categoryItems => {
    categoryItems.forEach(item => items.add(item.item));
  });
  return Array.from(items);
}

/**
 * Find pricing info for a specific item
 */
export function findPricing(category, item, description) {
  const categoryItems = PRICING_CATALOG[category];
  if (!categoryItems) return null;
  
  return categoryItems.find(
    i => i.item === item && (!description || i.description === description)
  );
}

/**
 * Get default price for an item
 */
export function getDefaultPrice(category, item, description) {
  const pricing = findPricing(category, item, description);
  return pricing ? pricing.pricePerUnit : 0;
}

/**
 * Check if item requires materials cost
 */
export function requiresMaterialsCost(category, item, description) {
  const pricing = findPricing(category, item, description);
  return pricing ? pricing.materialsCost === true : false;
}

/**
 * Format price for display
 */
export function formatPrice(price, materialsCost = false) {
  const formatted = `$${price.toFixed(2)}`;
  return materialsCost ? `${formatted} + Materials` : formatted;
}

