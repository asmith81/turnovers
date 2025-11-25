# Turnovers - Planning Document

## Project Overview
Streamline field assessment workflow: voice/text input → structured data → Google Sheets → PDF scope document for subcontractors.

## Tech Stack Decision

### Frontend
**Choice**: Next.js 15 + React 18
**Why**:
- Server and client components in one framework
- Built-in API routes (no separate backend server needed)
- Easy deployment to Vercel (git push = deploy)
- Web Speech API works natively in Safari (iPad support)
- Can add PWA capabilities later if needed

**UI**: Plain CSS/Tailwind (TBD)
- Keep it simple, no component library needed for MVP

### Backend
**Choice**: Next.js API Routes (serverless functions)
**Why**:
- Serverless = no server management, scales automatically
- Colocated with frontend code
- Free tier on Vercel sufficient for 2-4 users
- Stateless by design (perfect for our use case)

### LLM
**Choice**: Anthropic Claude (via API)
**Why**:
- Excellent instruction following
- Good at structured data extraction
- Handles both English and Spanish well
- Tool use / function calling for structured outputs
- Cost effective (~$0.20-0.40 per job)

### Data Storage
**Choice**: NO DATABASE - Google Sheets is the destination
**Why**:
- Client already uses Google Sheets as their system of record
- No need to maintain separate database
- Sheets API provides all CRUD operations needed
- Session state held in browser (memory/localStorage)
- Serverless functions are stateless

### Authentication
**Phase 1**: None (private URL)
**Phase 2** (if needed): NextAuth.js with Google OAuth
**Why**:
- Only 2-4 users, private deployment
- Can add later if security becomes concern
- Keep MVP simple

## Architecture Pattern

```
Static Frontend (React)
    ↓ (HTTP POST)
Serverless API Routes
    ↓
Anthropic API + Google Sheets API
```

**Key principle**: Stateless backend, state held in frontend

## Data Model / Schema

### Frontend State (held in browser memory)
```javascript
{
  // Raw conversation
  conversationHistory: [
    { role: "user", content: "3 walls need paint" },
    { role: "assistant", content: "What room?" },
    { role: "user", content: "Living room" }
  ],
  
  // Structured data matching Google Sheet template
  structuredData: {
    workOrderNumber: string,           // B1:C2
    unitNumber: string,                // E1:I2
    address: string,                   // B3:C4
    unitSquareFeet: string,            // E3:G4
    unitLayout: string,                // I3:I4 (e.g., "2 bedrooms Unit")
    workItems: [
      {
        id: string,
        category: string,              // "Painting", "Floor & Molding", etc. (from catalog)
        item: string,                  // "Clean Walls", "Prep & Paint Walls 2 Coats", etc.
        description: string,           // "Clean", "Paint", "Install", etc.
        unit: "SF" | "LF" | "EA" | "SET",
        multiplier: number,            // Quantity
        pricePerUnit: number,          // From pricing catalog
        total: number,                 // multiplier × pricePerUnit
        notes: string,                 // Spanish or English notes
        materialsCost: boolean         // true if "+ Materials"
      }
    ]
  },
  
  // Generated outputs
  englishScope: string,                // A6:D10
  spanishScope: string,                // E6:I10
  
  // Media
  sketch: string (base64),             // A12:I27 (uploaded to Drive)
  photos: array,                       // Uploaded to Drive
  
  // UI state
  isProcessing: boolean,
  currentStep: "input" | "review" | "approve" | "submitted",
  activeTab: "data" | "sketch" | "photos"
}
```

### API Request/Response Formats

**POST /api/process**
```javascript
Request:
{
  userInput: string,
  currentData: { structuredData },
  conversationHistory: []
}

Response:
{
  updatedData: { structuredData },
  assistantMessage: string,
  isComplete: boolean  // true when no more questions needed
}
```

**POST /api/submit**
```javascript
Request:
{
  structuredData: { ... },
  englishScope: string,
  spanishScope: string
}

Response:
{
  success: boolean,
  sheetUrl: string,
  rowNumber: number,
  error?: string
}
```

### Google Sheets Schema
Matches client's existing template structure:

| Column | Type | Description |
|--------|------|-------------|
| Date | date | Assessment date |
| Address | text | Property address |
| Assessor | text | Field worker name |
| Scope (English) | text | Generated description |
| Scope (Spanish) | text | Generated description |
| Item 1 - Category | text | Paint/Floor/etc |
| Item 1 - Description | text | Details |
| Item 1 - Quantity | number | Amount |
| Item 1 - Unit | text | sqft/walls/each |
| Item 1 - Unit Price | currency | $ per unit |
| Item 1 - Total | formula | =Qty * UnitPrice |
| ... | ... | Repeat for items 2-N |
| Grand Total | formula | =SUM(totals) |
| Notes | text | Additional info |

**Note**: Column mapping will be configurable to match their existing template

## Development Phases

### Phase 1: Core Loop (Current)
- [ ] Text input (voice comes later)
- [ ] LLM conversation to fill structured data
- [ ] Display table view
- [ ] User feedback loop
- [ ] Generate EN/ES scopes
- [ ] Submit to Google Sheets

### Phase 2: Voice & UX
- [ ] Add Web Speech API for voice input
- [ ] Text-to-speech for questions
- [ ] Better UI/styling
- [ ] Loading states, error handling

### Phase 3: Automation
- [ ] Auto-generate PDF from Sheet
- [ ] Email delivery
- [ ] Approval workflow

## Key Design Decisions

### Why no database?
- Adds complexity (hosting, backups, migrations)
- Not needed - Google Sheets is already their database
- Stateless functions are simpler and cheaper
- Session state in browser is sufficient

### Why stateless backend?
- Each API call is independent
- Frontend sends full context every time
- No session management needed
- Serverless-friendly
- Scales infinitely

### Why conversation history in requests?
- Backend doesn't store state
- Frontend controls the full context
- Can refresh page and resume (via localStorage)
- Simpler debugging (see full context in request)

### Why separate English/Spanish scope generation?
- Different prompt optimization for each language
- Can be run in parallel
- Client may want to edit one without affecting other

## Environment Variables Required

```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_SHEETS_ID=1abc...xyz
GOOGLE_SERVICE_ACCOUNT_EMAIL=turnovers@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Testing Strategy

**Manual testing initially**:
1. Enter text, verify structured data extraction
2. Try incomplete data, verify LLM asks questions
3. Test approval flow
4. Verify Sheet population
5. Test error cases (API failures, invalid data)

**No automated tests for MVP** - keep it simple

## Success Metrics

- Time to complete assessment: < 10 minutes (vs 30-40 min currently)
- Data completeness: 100% of required fields filled
- Subcontractor understanding: Measured by reduced scope creep
- System reliability: > 95% successful submissions

## Photo & Sketch Upload Strategy

**Based on lessons from previous photo upload project:**

### Key Principles:
1. ❌ **Never embed base64 images in JSON** - Causes mobile failures
2. ✅ **Upload photos separately** - Each photo uploads independently to Drive
3. ✅ **Compress images client-side** - 800px max, 60% quality → 50-100KB per photo
4. ✅ **Add 500ms delays** between uploads - Prevents Apps Script concurrency issues
5. ✅ **30-second timeouts** per photo - Prevents hanging
6. ✅ **Show progress feedback** - "Uploading photo X of Y..."
7. ✅ **Use text/plain Content-Type** - Avoids CORS preflight complexity

### Upload Flow:
```
1. User adds photos → Compress locally → Show previews
2. User draws sketch → Store as canvas data URL → Show preview
3. Click Submit →
   a. Upload each photo to Drive (with 500ms delays)
      - "Uploading photo 1 of 5..."
      - "Uploading photo 2 of 5..."
   b. Get photo Drive URLs back
   c. Upload sketch to Drive (if exists)
      - "Uploading floor plan..."
   d. Get sketch Drive URL back
   e. Generate EN/ES scopes via API
   f. Submit to Sheets with URLs only (not base64!)
      Payload: {
        structuredData: {...},
        photoUrls: ['https://drive...', ...],  // ~50 bytes each
        sketchUrl: 'https://drive...',         // ~50 bytes
        englishScope: "...",
        spanishScope: "..."
      }
      Total: <5KB even with 10 photos + sketch!
4. Success!
```

### Implementation Files:
- `lib/imageCompression.js` - Client-side image compression
- `lib/googleDrive.js` - Separate photo upload utilities
- `components/PhotoGallery.js` - Compression on photo selection

### Apps Script Requirements:
```javascript
// Endpoint 1: Upload single photo
POST {action: 'uploadPhoto', photo: {name, data, caption}}
→ {success: true, driveUrl: '...', fileId: '...'}

// Endpoint 2: Upload sketch (floor plan)
POST {action: 'uploadSketch', sketch: {name, data}}
→ {success: true, driveUrl: '...', fileId: '...'}

// Endpoint 3: Submit form
POST {action: 'submitForm', structuredData, photoUrls: [...], sketchUrl, englishScope, spanishScope}
→ {success: true, rowNumber: 42}
```

### Apps Script Implementation Example:
```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  
  switch(data.action) {
    case 'uploadPhoto':
      return handlePhotoUpload(data.photo);
    case 'uploadSketch':
      return handleSketchUpload(data.sketch);
    case 'submitForm':
      return handleFormSubmission(data);
    default:
      return buildErrorResponse('Unknown action');
  }
}

function handleSketchUpload(sketch) {
  try {
    Logger.log('Uploading floor plan sketch...');
    
    // Get or create "Turnovers Sketches" folder
    const folder = getOrCreateFolder('Turnovers Sketches');
    
    // Convert base64 to blob
    const base64Data = sketch.data.split(',')[1]; // Remove data:image/png;base64, prefix
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/png',
      sketch.name
    );
    
    // Upload to Drive
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    Logger.log('Sketch uploaded: ' + file.getName());
    
    return buildSuccessResponse({
      driveUrl: file.getUrl(),
      fileId: file.getId(),
      fileName: file.getName()
    });
    
  } catch (error) {
    Logger.log('ERROR uploading sketch: ' + error.toString());
    return buildErrorResponse('Sketch upload failed: ' + error.message);
  }
}
```

### OAuth Scopes Required:
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ]
}
```

## Known Limitations / Future Work

- No offline support (Phase 2)
- Photo upload to Drive (implemented client-side, needs Apps Script endpoint)
- No historical search (Phase 3)
- No analytics dashboard (Phase 3)
- No multi-client support (not needed)

