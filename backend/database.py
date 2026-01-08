import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from dotenv import load_dotenv

# Load environment variables from .env file if it exists (for local development)
# In Docker, environment variables are passed via docker-compose.yml
load_dotenv(override=False)

# Get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Validate that DATABASE_URL is set
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is not set. "
        "Please ensure it's defined in your .env file or docker-compose.yml"
    )

# Configure connection pool for production streaming
engine = create_async_engine(
    DATABASE_URL, 
    future=True, 
    echo=False, 
    pool_pre_ping=True,
    pool_size=20,          # Increased from default (5)
    max_overflow=10,       # Allow burst
    pool_timeout=30,       # Fail fast if pool exhausted
    pool_recycle=1800      # Recycle connections every 30 mins
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, autoflush=False, autocommit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_models() -> None:
    # In production, use Alembic. 
    # For dev bootstrap, we keep create_all but removing manual schema mutations.
    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
        except Exception:
            pass
        # We still sync metadata for dev convenience, but rely on Alembic for migrations
        await conn.run_sync(Base.metadata.create_all)


