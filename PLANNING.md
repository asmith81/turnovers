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
  
  // Structured data being built
  structuredData: {
    projectInfo: {
      address: string,
      date: string,
      assessor: string
    },
    workItems: [
      {
        id: string,
        category: "paint" | "floor" | "repair" | "clean" | "other",
        room: string,
        description: string,
        quantity: number,
        unit: "sqft" | "walls" | "each",
        unitPrice: number,
        total: number
      }
    ],
    notes: string
  },
  
  // Generated outputs
  englishScope: string,
  spanishScope: string,
  
  // UI state
  isProcessing: boolean,
  currentStep: "input" | "review" | "approve" | "submitted"
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

## Known Limitations / Future Work

- No offline support (Phase 2)
- No photo/floor plan upload (Phase 2)
- No historical search (Phase 3)
- No analytics dashboard (Phase 3)
- No multi-client support (not needed)

