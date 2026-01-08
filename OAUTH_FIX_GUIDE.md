# OAuth Sign-In Fix Guide

## 🔴 Problem: "Offline" Error During Google OAuth

When you click "Continue" after selecting your Google account, you see:
```json
{"error":"Offline","message":"No internet connection"}
```

This is **NOT** an internet issue - it's a NextAuth configuration problem.

## 🛠️ Root Cause

The error occurs because:
1. Google OAuth redirects back to your app
2. NextAuth tries to create a session
3. Frontend can't reach the backend API
4. NextAuth interprets this as "offline"

## ✅ Solution

### Step 1: Create `.env.local` in Frontend

Create this file: `frontend/.env.local`

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# Google OAuth (copy from main .env)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Database (copy from main .env)
DATABASE_URL=your-database-url

# Optional: Enable anonymous mode for testing
NEXT_PUBLIC_ALLOW_ANON=false
```

### Step 2: Update Main `.env` File

Ensure your main `.env` has:
```bash
# Frontend
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production
FRONTEND_ORIGIN=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret

# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
```

### Step 3: Verify Google OAuth Settings

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   ```

2. **Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google
   ```

### Step 4: Restart Everything

```bash
# Stop all services
.\stop.bat

# Start again
.\start.bat
```

## 🔍 Debugging Steps

### 1. Check Backend is Running
```bash
curl http://localhost:8000/healthz
```
Should return: `{"status":"healthy"}`

### 2. Check Frontend Environment
```bash
cd frontend
type .env.local
```

### 3. Check Browser Console
Press F12 during sign-in and look for:
- ❌ `Failed to fetch` errors
- ❌ CORS errors
- ❌ 500 errors from `/api/auth/callback/google`

### 4. Check Backend Logs
Look for errors when OAuth callback happens.

## 🎯 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Offline" error | Missing `NEXTAUTH_URL` | Add to `.env.local` |
| "Configuration" error | Wrong `NEXTAUTH_SECRET` | Generate new secret |
| "Redirect URI mismatch" | Google Console settings | Update redirect URIs |
| CORS error | Backend not allowing origin | Check `FRONTEND_ORIGIN` in backend `.env` |
| Database error | Frontend can't connect to DB | Ensure `DATABASE_URL` is correct |

## 🔐 Generate Secure NEXTAUTH_SECRET

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online
# Visit: https://generate-secret.vercel.app/32
```

Copy the output and use it as `NEXTAUTH_SECRET`.

## 📝 Complete .env.local Template

```bash
# ============================================
# Frontend Environment Variables
# ============================================

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=REPLACE_WITH_GENERATED_SECRET_FROM_ABOVE
AUTH_SECRET=REPLACE_WITH_SAME_SECRET_AS_NEXTAUTH_SECRET

# Google OAuth
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Database (for NextAuth adapter)
DATABASE_URL=postgresql://user:password@localhost:5432/medibot

# Optional Features
NEXT_PUBLIC_ALLOW_ANON=false
```

## ✅ Verification Checklist

After applying the fix:

- [ ] `.env.local` exists in `frontend/` folder
- [ ] `NEXTAUTH_URL=http://localhost:3000` is set
- [ ] `NEXTAUTH_SECRET` is a long random string
- [ ] Google OAuth credentials are correct
- [ ] Backend is running on port 8000
- [ ] Frontend is running on port 3000
- [ ] Google Console has correct redirect URI
- [ ] Browser console shows no errors

## 🧪 Test the Fix

1. **Clear browser cache and cookies**
   - Ctrl+Shift+Delete
   - Clear everything

2. **Restart services**
   ```bash
   .\stop.bat
   .\start.bat
   ```

3. **Try signing in**
   - Go to http://localhost:3000/signin
   - Click "Sign in with Google"
   - Select account
   - Click "Continue"
   - Should redirect to `/chat` successfully ✅

## 🆘 Still Not Working?

### Check These Logs:

**Frontend Terminal:**
```
[next-auth][error][OAUTH_CALLBACK_ERROR]
```

**Backend Terminal:**
```
POST /api/auth/callback/google - 500
```

**Browser Console:**
```
Failed to fetch
```

### Try This:

1. **Use a different browser** (incognito mode)
2. **Check firewall** - ensure localhost:8000 is accessible
3. **Disable antivirus** temporarily
4. **Check if another app is using port 3000 or 8000**

```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Check what's using port 8000
netstat -ano | findstr :8000
```

Your OAuth should now work! 🎉
