import os
import sys

print("=" * 50)
print("Environment Variables Check")
print("=" * 50)

# Check for DATABASE_URL
database_url = os.getenv("DATABASE_URL")
if database_url:
    # Mask the password for security
    if "@" in database_url:
        parts = database_url.split("@")
        masked = parts[0].split(":")[:-1]
        print(f"DATABASE_URL: {':'.join(masked)}:****@{parts[1]}")
    else:
        print(f"DATABASE_URL: {database_url[:30]}...")
else:
    print("DATABASE_URL: NOT SET!")
    print("\nERROR: DATABASE_URL environment variable is required!")
    sys.exit(1)

# Check other important variables
print(f"OPENROUTER_API_KEY: {'SET' if os.getenv('OPENROUTER_API_KEY') else 'NOT SET'}")
print(f"GEMINI_API_KEY: {'SET' if os.getenv('GEMINI_API_KEY') else 'NOT SET'}")
print(f"NEXTAUTH_SECRET: {'SET' if os.getenv('NEXTAUTH_SECRET') else 'NOT SET'}")
print(f"FRONTEND_ORIGIN: {os.getenv('FRONTEND_ORIGIN', 'NOT SET')}")

print("=" * 50)
print("All required environment variables are set!")
print("=" * 50)
