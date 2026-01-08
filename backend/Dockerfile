# syntax=docker/dockerfile:1
# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.11-slim AS builder

# Set build environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements
COPY requirements.txt .

# Install dependencies using persistent cache mount
# id=pip-cache ensures the 800MB+ libraries stay cached between builds
RUN --mount=type=cache,id=pip-cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================
# Stage 2: Final Runtime
# ============================================
FROM python:3.11-slim AS final

# Production Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app

WORKDIR /app

# Create Non-Root User for Security
RUN groupadd -r appuser && \
    useradd -r -g appuser -u 1001 appuser && \
    mkdir -p /app/logs && \
    chown -R appuser:appuser /app

# Copy ONLY the virtual environment from builder
# This is the step that usually hits the WSL RAM limit - ensure .wslconfig is set!
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv

# Copy Application Files
COPY --chown=appuser:appuser main.py .
COPY --chown=appuser:appuser check_env.py .
COPY --chown=appuser:appuser database.py .
COPY --chown=appuser:appuser models.py .
COPY --chown=appuser:appuser chat_memory.py .
COPY --chown=appuser:appuser chat_summarizer.py .
COPY --chown=appuser:appuser medical_lookup.py .
COPY --chown=appuser:appuser api_monitor.py .
COPY --chown=appuser:appuser run_eval.py .

# Copy application directories
COPY --chown=appuser:appuser routes/ ./routes/
COPY --chown=appuser:appuser services/ ./services/
COPY --chown=appuser:appuser utils/ ./utils/
COPY --chown=appuser:appuser alembic/ ./alembic/
COPY --chown=appuser:appuser evaluation/ ./evaluation/

# Switch to Non-Root User
USER appuser

EXPOSE 8000

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz').read()" || exit 1

# Production Execution
CMD ["sh", "-c", "python check_env.py && uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2} --log-level ${UVICORN_LOG_LEVEL:-info} --timeout-keep-alive 5 --limit-concurrency 1000"]