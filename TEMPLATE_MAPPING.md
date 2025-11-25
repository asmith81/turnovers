# Google Sheet Template Mapping

## Source Template
File: `Turnover Information - Copy of Master.csv`

## Cell Mappings

### Project Header Section

| Data Field | Google Sheet Location | Example Value |
|------------|----------------------|---------------|
| Work Order # | B1:C2 | "28867" |
| Unit # | E1:I2 | "301" |
| Address | B3:C4 | "1448 Park road NW" |
| Unit SQ FT | E3:G4 | "511" |
| Unit Layout | I3:I4 | "2 bedrooms Unit" |

### Scope of Work

| Data Field | Google Sheet Location | Notes |
|------------|----------------------|-------|
| English Scope | A6:D10 | Full paragraph description |
| Spanish Scope | E6:I10 | Full paragraph description in Spanish |

### Floor Plan Sketch

| Data Field | Google Sheet Location | Notes |
|------------|----------------------|-------|
| Sketch Image | A12:I27 | Embedded image from Drive URL |

### Work Items Table (starts row 30)

| Column | Data Field | Valid Values | Example |
|--------|-----------|--------------|---------|
| A | Category | See `PRICING_CATALOG` | "Painting" |
| B | Item | Category-specific items | "Clean Walls" |
| C | Description | Type of work | "Clean" |
| D | Unit | SF, LF, EA, SET | "SF" |
| E | (empty in template) | - | - |
| F | Multiplier | Number (quantity) | 300 |
| G | Price Per Unit | From catalog | $0.15 |
| H | Total | Calculated: F × G | $45.00 |
| I | Notes | Spanish/English text | "Limpiar el resto..." |

## Data Validation Rules

### Category (Column A)
Must be one of:
- Painting
- Floor & Molding
- Doors & Windows
- Other
- Outlets No Wiring
- Light Switch No Wiring
- Electrical Installation
- Plumbing Installation
- Plumbing Repairs
- Clean Up

### Item (Column B)
Depends on Category. See `lib/pricingCatalog.js` for full mapping.

Examples:
- **Painting**: "Clean Walls", "Patch Hole", "Prep & Paint Walls 2 Coats", "Prep & Paint Ceiling 2 Coats"
- **Floor & Molding**: "Flooring", "Vinyl Plank Flooring", "Base Molding 4\"", "Vinyl Base 4\""
- **Plumbing Installation**: "Faucet", "Shower Head", "Toilet", "Towel Bar"

### Description (Column C)
Common values:
- Clean
- Paint
- Install
- Remove & Install
- Demolition
- Repair
- Repairs
- Refinish
- Other

### Unit (Column D)
- **SF** = Square Foot
- **LF** = Linear Foot
- **EA** = Each
- **SET** = Set

### Price Lookup Logic

Price is automatically determined by: `Category` + `Item` + `Description`

Example:
```javascript
Category: "Painting"
Item: "Clean Walls"
Description: "Clean"
→ Price Per Unit: $0.15 / SF
```

Some items include materials cost:
```javascript
Category: "Plumbing Installation"
Item: "Faucet"
Description: "Remove & Install"
→ Price Per Unit: $65.00 + Materials / EA
```

## Apps Script Write Format

When writing to Google Sheets via Apps Script:

```javascript
// Project Info (rows 1-4)
sheet.getRange('B1:C2').setValue(workOrderNumber);
sheet.getRange('E1:I2').setValue(unitNumber);
sheet.getRange('B3:C4').setValue(address);
sheet.getRange('E3:G4').setValue(unitSquareFeet);
sheet.getRange('I3:I4').setValue(unitLayout);

// Scopes (rows 6-10)
sheet.getRange('A6:D10').setValue(englishScope);
sheet.getRange('E6:I10').setValue(spanishScope);

// Sketch (rows 12-27)
// Insert image from Drive URL at A12:I27

// Work Items (starting row 30, but first row is header at row 30)
// Start data at row 31
for (let i = 0; i < workItems.length; i++) {
  const row = 31 + i;
  sheet.getRange(row, 1).setValue(workItem.category);      // Column A
  sheet.getRange(row, 2).setValue(workItem.item);          // Column B
  sheet.getRange(row, 3).setValue(workItem.description);   // Column C
  sheet.getRange(row, 4).setValue(workItem.unit);          // Column D
  // Column E is empty
  sheet.getRange(row, 6).setValue(workItem.multiplier);    // Column F
  sheet.getRange(row, 7).setValue(workItem.pricePerUnit);  // Column G
  sheet.getRange(row, 8).setFormula(`=F${row}*G${row}`);   // Column H (Total)
  sheet.getRange(row, 9).setValue(workItem.notes);         // Column I
}
```

## Photo Storage

Photos are uploaded separately to "Turnovers Photos" folder in Drive.
Photo URLs can be:
1. Listed in the Notes field
2. Stored in a separate column (if template extended)
3. Linked in a separate "Photos" sheet

Current recommendation: Store in Notes field as hyperlinks or in separate tracking.

---

*Last updated: November 2025*

