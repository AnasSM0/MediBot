"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # We use IF NOT EXISTS to be safe if tables were created by the old main.py logic
    # Users Table
    op.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        provider VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);")

    # Chat Sessions
    op.execute("""
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200),
        summary TEXT,
        mode VARCHAR(50) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_id ON chat_sessions (user_id);")

    # Messages
    op.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR PRIMARY KEY,
        session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_session_id ON messages (session_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_created_at ON messages (created_at);")

    # ChatHistory (Legacy)
    op.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR,
        role VARCHAR,
        message TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_chat_history_id ON chat_history (id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_chat_history_session_id ON chat_history (session_id);")


def downgrade() -> None:
    # Not dropping to preserve data during tests
    pass
