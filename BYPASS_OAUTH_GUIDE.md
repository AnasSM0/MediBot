# Bypassing OAuth to Access Previous Chats

## Quick Solution

Since OAuth is misconfigured, you can use **Anonymous Mode** to access the chat interface. However, your previous chats are tied to your authenticated user account, so we need a hybrid approach.

## Option 1: Enable Anonymous Mode (Immediate Access)

### Steps:

1. **Verify Environment Variables**
   
   Make sure your `.env` file (in `e:\work\MediBot\.env`) contains:
   ```env
   ALLOW_ANON=true
   NEXT_PUBLIC_ALLOW_ANON=true
   ```

2. **Restart Docker Containers**
   ```cmd
   cd e:\work\MediBot\MediBot
   docker-compose down
   docker-compose up --build
   ```

3. **Access Chat**
   - Go to: `http://localhost:3000/chat`
   - You should now be able to access the chat interface without signing in
   - **Note**: The sidebar won't show your previous sessions in anonymous mode

## Option 2: Access Previous Sessions Directly

### Find Your Session IDs:

1. **Run the Database Query Script**
   ```cmd
   cd e:\work\MediBot\MediBot\backend
   python query_sessions.py
   ```

   This will show:
   - All users in the database
   - All chat sessions with their IDs
   - Which user owns which sessions

2. **Access Sessions via URL**
   
   Once you have your session IDs, you can access them directly:
   ```
   http://localhost:3000/chat?session=<YOUR_SESSION_ID>
   ```

   For example:
   ```
   http://localhost:3000/chat?session=abc123-def456-ghi789
   ```

## Option 3: Fix OAuth (Permanent Solution)

### For Google OAuth:

1. **Verify Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to: APIs & Services > Credentials
   - Find your OAuth 2.0 Client ID
   - Make sure the **Authorized redirect URIs** include:
     ```
     http://localhost:3000/api/auth/callback/google
     ```

2. **Update `.env` File**
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id
   GOOGLE_CLIENT_SECRET=your-actual-client-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Restart Containers**
   ```cmd
   docker-compose down
   docker-compose up --build
   ```

## Option 4: Create a Direct Database Session (Advanced)

If you want to manually create a session in the database to authenticate as yourself:

1. **Find Your User ID** (from `query_sessions.py` output)

2. **Create a Session Token** (requires manual database insertion)
   - This is complex and not recommended
   - Better to fix OAuth or use anonymous mode

## Recommended Approach

**For immediate access to chat:**
- Use **Option 1** (Anonymous Mode)

**To access your previous chats:**
- Use **Option 2** (Direct URL access with session IDs)

**For long-term solution:**
- Fix OAuth using **Option 3**

## Files Modified

1. `frontend/middleware.ts` - Bypasses authentication when `ALLOW_ANON=true`
2. `.env` - Added `NEXT_PUBLIC_ALLOW_ANON=true`
3. `backend/query_sessions.py` - Script to find your session IDs

## Troubleshooting

**If chat still requires signin:**
1. Make sure both `ALLOW_ANON=true` AND `NEXT_PUBLIC_ALLOW_ANON=true` are set
2. Rebuild the frontend: `docker-compose up --build frontend`
3. Clear browser cache and cookies for localhost:3000

**If you can't see previous chats:**
- Previous chats are tied to your authenticated user account
- Use the `query_sessions.py` script to find session IDs
- Access them directly via URL

**If the backend rejects requests:**
- Check that `ALLOW_ANON=true` (without NEXT_PUBLIC_ prefix) is set for backend
- Restart backend container
