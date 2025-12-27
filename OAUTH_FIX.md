# OAuth Sign-In Error Fix

## Problem
When signing in with Google OAuth, you got a "Server Error" page with these errors:
```
TypeError: Cannot use 'in' operator to search for 'key' in require
AdapterError: Connection terminated unexpectedly
```

## Root Cause
The `DATABASE_URL` in your `.env` file uses the format `postgresql+asyncpg://...` which is for Python's async SQLAlchemy. However, the frontend's NextAuth uses the Node.js `pg` library, which expects the standard `postgresql://` format.

## Fix Applied

### Updated `frontend/src/lib/auth.ts`:

1. **URL Format Conversion**
   - Automatically converts `postgresql+asyncpg://` to `postgresql://`
   - This allows the same DATABASE_URL to work for both backend and frontend

2. **SSL Configuration**
   - Enabled SSL for NeonDB connections (detects `neon.tech` in URL)
   - Added proper SSL settings: `{ rejectUnauthorized: false }`

3. **Connection Pool Settings**
   - `max: 10` - Maximum 10 connections
   - `idleTimeoutMillis: 30000` - 30 second idle timeout
   - `connectionTimeoutMillis: 10000` - 10 second connection timeout

4. **Error Handling**
   - Added error event listener to prevent uncaught exceptions
   - Logs pool errors instead of crashing

## Next Steps

### 1. Restart the Frontend Container
```cmd
cd e:\work\MediBot\MediBot
docker-compose restart frontend
```

### 2. Test OAuth Sign-In
1. Go to `http://localhost:3000`
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. You should now be successfully signed in!

### 3. Verify Database Tables
The first time you sign in, NextAuth will create these tables:
- `users`
- `accounts`
- `sessions`
- `verification_tokens`

## Alternative: Use Anonymous Mode

If OAuth still doesn't work, you can use anonymous mode:

1. Make sure `.env` has:
   ```env
   ALLOW_ANON=true
   NEXT_PUBLIC_ALLOW_ANON=true
   ```

2. Go directly to: `http://localhost:3000/chat`

## Troubleshooting

### If you still get connection errors:

1. **Check DATABASE_URL format:**
   ```env
   DATABASE_URL=postgresql+asyncpg://user:pass@host/db?ssl=require
   ```
   The fix will auto-convert this to `postgresql://` for the frontend.

2. **Verify NeonDB is accessible:**
   ```cmd
   docker exec medibot-backend python -c "import os; print(os.getenv('DATABASE_URL'))"
   ```

3. **Check frontend logs:**
   ```cmd
   docker-compose logs frontend
   ```

### If OAuth redirect fails:

1. **Verify Google Cloud Console settings:**
   - Go to: https://console.cloud.google.com/
   - Navigate to: APIs & Services > Credentials
   - Check Authorized redirect URIs includes:
     ```
     http://localhost:3000/api/auth/callback/google
     ```

2. **Verify .env variables:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   ```

## Files Modified
- `frontend/src/lib/auth.ts` - Fixed database connection for NextAuth

## Technical Details

The error occurred because:
1. The `pg` library tried to parse the connection string
2. It encountered `postgresql+asyncpg://` which it doesn't recognize
3. This caused a parsing error in `pg/lib/connection.js`
4. The connection failed, triggering the AdapterError

The fix:
1. Detects and converts the URL format before creating the pool
2. Adds proper SSL configuration for cloud databases
3. Adds error handling to prevent crashes
4. Configures connection pool limits for stability
