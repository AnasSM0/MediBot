import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/medibot")

engine = create_async_engine(DATABASE_URL, future=True, echo=False, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, autoflush=False, autocommit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_models() -> None:
    # Alembic is preferred in production; for dev bootstrap we ensure extensions and schemas exist.
    async with engine.begin() as conn:
        # Ensure uuid-ossp if needed; safe on Postgres where permitted.
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
        except Exception:
            # Ignore if not supported (e.g., Neon/Supabase restricted)
            pass
        from models import User, ChatSession, Message  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


