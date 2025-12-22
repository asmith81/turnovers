# Turnovers - Property Assessment App

A Next.js application for creating property turnover assessments with AI assistance, photo documentation, and automatic Google Sheets integration.

## Features

- 🎤 **Voice & Text Input** - Record or type assessment details
- 🤖 **AI-Powered** - Claude processes natural language into structured data
- 📊 **Auto-Generated Sheets** - Creates formatted Google Sheets with work items
- 📷 **Photo Gallery** - Upload and manage site photos
- ✏️ **Floor Plan Sketches** - Draw layout sketches directly in the app
- 🌐 **Bilingual Scopes** - Generates English and Spanish scope descriptions
- 📄 **PDF Export** - Generate formatted PDFs with photos from within Google Sheets

## Tech Stack

- **Frontend**: Next.js, React
- **AI**: Anthropic Claude API
- **Storage**: Google Sheets, Google Drive
- **Auth**: NextAuth.js with Google OAuth

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env.local`**
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret
   GOOGLE_SHEETS_ID=your-sheet-id
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open** http://localhost:3000

## Documentation

| File | Description |
|------|-------------|
| [PLANNING.md](./PLANNING.md) | Architecture and design decisions |
| [NEXT_STEPS.md](./NEXT_STEPS.md) | OAuth setup guide |
| [SETUP_OAUTH.md](./SETUP_OAUTH.md) | Google OAuth configuration |
| [APPS_SCRIPT_GUIDE.md](./APPS_SCRIPT_GUIDE.md) | Apps Script setup (legacy) |
| [TEMPLATE_MAPPING.md](./TEMPLATE_MAPPING.md) | Sheet cell mappings |
| [PDF_GENERATION_SCRIPT.md](./PDF_GENERATION_SCRIPT.md) | PDF export from Google Sheets |

## PDF Generation

The app includes an Apps Script that adds PDF export capabilities to generated Google Sheets:

- **Print Area**: Columns A:I, letter size, portrait orientation
- **Page Breaks**: Automatically after TOTAL row (or row 6/4 as fallback)
- **Photo Gallery**: 4"×6" photos with 0.5" notes space, 2 per page
- **Auto-Save**: PDFs saved to "PDFs" folder alongside the master sheet

See [PDF_GENERATION_SCRIPT.md](./PDF_GENERATION_SCRIPT.md) for setup instructions.

## Project Structure

```
turnovers/
├── components/          # React components
│   ├── ConversationView.js
│   ├── DataTable.js
│   ├── InputSection.js
│   ├── PhotoGallery.js
│   ├── SketchCanvas.js
│   └── ...
├── lib/                 # Utility functions
│   ├── anthropic.js     # Claude API client
│   ├── sheets.js        # Google Sheets integration
│   ├── driveUpload.js   # Google Drive uploads
│   └── ...
├── pages/               # Next.js pages & API routes
│   ├── api/
│   │   ├── auth/
│   │   ├── process.js
│   │   ├── submit.js
│   │   └── ...
│   └── index.js
├── scripts/             # Google Apps Script files
│   └── PDFGenerator.gs
└── *.md                 # Documentation
```

## License

Private - Company Use Only

---

*Last updated: December 2024*
