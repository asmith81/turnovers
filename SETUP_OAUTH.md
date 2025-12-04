# OAuth 2.0 Setup Guide

## Step 1: Get Your OAuth Credentials

You already have these from Google Cloud Console. Keep them secret!

1. **Client ID** - Looks like: `123456789-abc123.apps.googleusercontent.com`
2. **Client Secret** - Random string of characters

## Step 2: Configure Authorized Redirect URIs

In Google Cloud Console → Your OAuth 2.0 Client:

Add these redirect URIs:
```
http://localhost:3000/api/auth/callback/google
https://your-production-domain.com/api/auth/callback/google
```

(Change `your-production-domain.com` to your actual domain when deploying)

## Step 3: Create `.env.local` File

In your project root, create `.env.local` (this file is gitignored):

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here

# Google OAuth 2.0
GOOGLE_CLIENT_ID=paste-your-actual-client-id-here
GOOGLE_CLIENT_SECRET=paste-your-actual-client-secret-here

# Google Sheets
GOOGLE_SHEETS_ID=paste-your-sheet-id-from-url

# NextAuth (generate secret below)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-this-below
```

## Step 4: Generate NEXTAUTH_SECRET

Run this in your terminal:

```bash
openssl rand -base64 32
```

Or use this online: https://generate-secret.vercel.app/32

Copy the result into `NEXTAUTH_SECRET`

## Step 5: Get Your Google Sheet ID

From your Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/1abc123xyz/edit
                                      ^^^^^^^^^^^
                                      This is the ID
```

Paste that into `GOOGLE_SHEETS_ID`

## Step 6: Install Dependencies

```bash
npm install next-auth @auth/core googleapis
```

## Step 7: Start the App

```bash
npm run dev
```

Open http://localhost:3000 and you should see a "Login with Google" button!

## Security Notes

- ✅ `.env.local` is in `.gitignore` - never committed to git
- ✅ Client Secret never exposed to frontend
- ✅ Access tokens stored securely in session
- ❌ Never share credentials in chat, Slack, email, etc.

## Troubleshooting

### "redirect_uri_mismatch" error
→ Add the exact callback URL to your OAuth client in Google Cloud Console

### "invalid_client" error  
→ Check that Client ID and Secret are correct in `.env.local`

### Can't access Sheets/Drive
→ Make sure OAuth consent screen includes these scopes:
  - https://www.googleapis.com/auth/spreadsheets
  - https://www.googleapis.com/auth/drive.file

---

*Last updated: November 2025*

