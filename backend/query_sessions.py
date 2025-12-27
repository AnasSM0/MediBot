"""
Script to help access previous chats by querying the database directly.
This bypasses OAuth and shows all users and their sessions.
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env file")
    exit(1)

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("=" * 60)
        print("MEDIBOT DATABASE QUERY - Users and Sessions")
        print("=" * 60)
        
        # Get all users
        print("\n📋 USERS:")
        print("-" * 60)
        result = await session.execute(text("""
            SELECT id, email, name, provider, created_at 
            FROM users 
            ORDER BY created_at DESC
        """))
        users = result.fetchall()
        
        if not users:
            print("No users found in database.")
        else:
            for user in users:
                print(f"\nUser ID: {user[0]}")
                print(f"  Email: {user[1]}")
                print(f"  Name: {user[2]}")
                print(f"  Provider: {user[3]}")
                print(f"  Created: {user[4]}")
        
        # Get all chat sessions
        print("\n\n💬 CHAT SESSIONS:")
        print("-" * 60)
        result = await session.execute(text("""
            SELECT cs.id, cs.user_id, cs.title, cs.created_at, u.email
            FROM chat_sessions cs
            LEFT JOIN users u ON cs.user_id = u.id
            ORDER BY cs.created_at DESC
            LIMIT 20
        """))
        sessions = result.fetchall()
        
        if not sessions:
            print("No chat sessions found.")
        else:
            for sess in sessions:
                print(f"\nSession ID: {sess[0]}")
                print(f"  User: {sess[4] or 'Unknown'}")
                print(f"  Title: {sess[2] or 'Untitled'}")
                print(f"  Created: {sess[3]}")
        
        # Get message count per session
        print("\n\n📊 MESSAGE STATISTICS:")
        print("-" * 60)
        result = await session.execute(text("""
            SELECT cs.id, cs.title, COUNT(m.id) as message_count, u.email
            FROM chat_sessions cs
            LEFT JOIN messages m ON cs.id = m.session_id
            LEFT JOIN users u ON cs.user_id = u.id
            GROUP BY cs.id, cs.title, u.email
            HAVING COUNT(m.id) > 0
            ORDER BY message_count DESC
            LIMIT 10
        """))
        stats = result.fetchall()
        
        if stats:
            for stat in stats:
                print(f"\nSession: {stat[1] or 'Untitled'} ({stat[0][:8]}...)")
                print(f"  User: {stat[3] or 'Unknown'}")
                print(f"  Messages: {stat[2]}")
        
        print("\n" + "=" * 60)
        print("To access your chats in anonymous mode:")
        print("1. Make sure ALLOW_ANON=true and NEXT_PUBLIC_ALLOW_ANON=true")
        print("2. Restart your Docker containers")
        print("3. Go to http://localhost:3000/chat")
        print("4. Your previous sessions won't show in sidebar (anonymous mode)")
        print("5. But you can access them via URL: /chat?session=<SESSION_ID>")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
