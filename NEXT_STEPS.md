# Next Steps - Getting OAuth Working

## ✅ What's Already Done:

1. ✅ Installed `next-auth` and `googleapis`
2. ✅ Created OAuth authentication flow
3. ✅ Added Google login button
4. ✅ Protected the app (requires login)
5. ✅ Set up session management

## 🔐 What YOU Need to Do:

### Step 1: Create `.env.local` File

In your project root (`c:\Users\alden\dev\turnovers\`), create a file called `.env.local`:

```bash
# Anthropic API (get from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Google OAuth 2.0 (you already have these!)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Google Sheets (from your sheet URL)
GOOGLE_SHEETS_ID=your-sheet-id-here

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run-openssl-rand-base64-32-to-generate-this
```

### Step 2: Generate NEXTAUTH_SECRET

Open PowerShell and run:
```powershell
# If you have openssl installed:
openssl rand -base64 32

# Or use this Node.js command:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output into `NEXTAUTH_SECRET` in `.env.local`

### Step 3: Configure OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. Click **Save**

### Step 4: Add Required Scopes

In the same OAuth client settings:
1. Go to **OAuth consent screen**
2. Click **Edit App**
3. In **Scopes**, make sure you have:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
4. Save changes

### Step 5: Test It!

Start the dev server:
```bash
npm run dev
```

Then open: http://localhost:3000

You should see:
1. **"Sign in with Google" button**
2. Click it → Google OAuth popup
3. Choose your account
4. Grant permissions
5. You'll be redirected back → Logged in!

## 🧪 Testing Authentication

Once logged in, open browser console and run:
```javascript
// Check session
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log)
```

You should see your user info and access token!

## ⚠️ Troubleshooting

### "redirect_uri_mismatch" error
→ Make sure you added `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs

### "invalid_client" error
→ Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`

### "Access blocked" error
→ Your OAuth consent screen might not be configured. Make sure:
   - User type is set (Internal or External)
   - Required scopes are added
   - App is published (or your email is added as test user)

### Can't see login button
→ Make sure `.env.local` exists and has correct variables
→ Restart `npm run dev` after creating/changing `.env.local`

## 📝 What Happens Next

Once you're logged in:
1. Your Google access token is stored in the session
2. We can use it to call Sheets API and Drive API
3. All uploads will be authorized as YOU
4. Data goes to your company's Google Sheets

## 🚀 After OAuth Works

We'll then:
1. Connect the Sheets API to write turnover data
2. Connect Drive API to upload photos/sketches
3. Test the full flow end-to-end
4. Deploy to production (Vercel/similar)

---

**Ready?** Create that `.env.local` file and let me know if you hit any issues!

*Last updated: November 2025*

