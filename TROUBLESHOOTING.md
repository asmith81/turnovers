# Turnovers - Troubleshooting & Lessons Learned

## Purpose
Document issues encountered during development and deployment, along with solutions and lessons learned.

---

## Setup & Configuration Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## LLM / API Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## Google Sheets API Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## Frontend / UI Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## Voice / Speech API Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## Deployment Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## Data Structure / Schema Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## Performance Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## User Feedback / UX Issues

### Issue: [Title]
**Date**: 
**Problem**: 
**Solution**: 
**Lesson**: 

---

## General Notes & Learnings

- 

---

## TODO / Reminders

- [ ] **ADD SECRETS TO .env.local** - Need to get:
  - ANTHROPIC_API_KEY (from Anthropic console)
  - GOOGLE_SHEETS_ID (from Google Sheets URL)
  - GOOGLE_SERVICE_ACCOUNT_EMAIL (from Google Cloud Console)
  - GOOGLE_PRIVATE_KEY (from service account JSON)
  
  See `.env.local.example` for format

- [ ] **APPS SCRIPT SETUP** - When connecting to real API:
  - Create Apps Script deployment (see APPS_SCRIPT_GUIDE.md)
  - Add OAuth scopes in appsscript.json:
    ```json
    {
      "oauthScopes": [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
      ]
    }
    ```
  - Implement uploadPhoto endpoint
  - Implement uploadSketch endpoint (NEW - for floor plan)
  - Implement submitForm endpoint
  - Create "Turnovers Photos" folder in Drive
  - Create "Turnovers Sketches" folder in Drive
  - Test with 1, 3, 5 photos
  - Test with sketch upload

- [ ] **PHOTO UPLOAD TESTING**:
  - Test on actual mobile device (not just desktop)
  - Test with multiple photos (1, 3, 5, 10)
  - Test with poor network conditions
  - Verify 500ms delays prevent concurrency issues
  - Verify 30s timeout prevents hangs

- 

---

## Quick Reference / Common Commands

```bash
# Development
npm run dev

# Build
npm run build

# Deploy
git push origin main

# View logs (Vercel)
vercel logs

# Test Google Sheets connection
# (add specific test command when created)
```

## Useful Links

- Anthropic API Docs: https://docs.anthropic.com/
- Google Sheets API Docs: https://developers.google.com/sheets/api
- Next.js API Routes: https://nextjs.org/docs/api-routes/introduction
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

