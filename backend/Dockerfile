# ============================================
# BASE IMAGE POLICY
# ============================================
# ✅ APPROVED: python:3.11-slim, node:20-alpine
# ❌ REJECTED: ubuntu, python:latest, debian, python (non-slim)
#
# This Dockerfile uses ONLY approved base images.
# Any changes must maintain compliance with the base image policy.
# ============================================

# ============================================
# PRODUCTION REQUIREMENTS
# ============================================
# ✅ Non-root user (appuser:1001)
# ✅ Expose only required ports (8000)
# ✅ No debug flags
# ✅ No hot reload
# ✅ Multiple uvicorn workers
# ✅ Production logging
# ============================================

# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.11-slim AS builder

# Set build environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build dependencies (needed for compiling Python packages)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies to a virtual environment
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ============================================
# Stage 2: Runtime
# ============================================
FROM python:3.11-slim AS runtime

# ============================================
# Production Environment Variables
# ============================================
# PYTHONDONTWRITEBYTECODE: Prevents .pyc file creation (smaller image)
# PYTHONUNBUFFERED: Forces stdout/stderr to be unbuffered (real-time logs)
# PATH: Adds venv to PATH for direct python/pip access
# PYTHONPATH: Sets app directory as Python module root
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app

WORKDIR /app

# ============================================
# Create Non-Root User (Security)
# ============================================
# Running as root is a security risk
# appuser:1001 has minimal privileges
RUN groupadd -r appuser && \
    useradd -r -g appuser -u 1001 appuser && \
    chown -R appuser:appuser /app

# Copy virtual environment from builder (no build tools!)
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv

# ============================================
# Copy Application Files
# ============================================
# Only copy necessary files (no tests, no docs, no dev files)
COPY --chown=appuser:appuser main.py .
COPY --chown=appuser:appuser check_env.py .
COPY --chown=appuser:appuser database.py .
COPY --chown=appuser:appuser models.py .
COPY --chown=appuser:appuser chat_memory.py .
COPY --chown=appuser:appuser chat_summarizer.py .
COPY --chown=appuser:appuser medical_lookup.py .
COPY --chown=appuser:appuser api_monitor.py .

# Copy application directories
COPY --chown=appuser:appuser routes/ ./routes/
COPY --chown=appuser:appuser services/ ./services/
COPY --chown=appuser:appuser utils/ ./utils/
COPY --chown=appuser:appuser alembic/ ./alembic/
COPY --chown=appuser:appuser evaluation/ ./evaluation/
COPY --chown=appuser:appuser run_eval.py .

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R appuser:appuser /app/logs

# ============================================
# Switch to Non-Root User
# ============================================
# All subsequent commands run as appuser (UID 1001)
USER appuser

# ============================================
# Expose Only Required Ports
# ============================================
# Port 8000: FastAPI application
# No other ports exposed (security)
EXPOSE 8000

# ============================================
# Health Check
# ============================================
# Checks /healthz endpoint every 30 seconds
# Fails after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz').read()" || exit 1

# ============================================
# Production Command (uvicorn)
# ============================================
# PRODUCTION CONFIGURATION:
# - NO --reload flag (hot reload disabled)
# - NO --debug flag (debug mode disabled)
# - Multiple workers for concurrency
# - Proper host binding (0.0.0.0)
# - Production log level
# - Graceful shutdown timeout
#
# Workers: 2-4 workers (2 * CPU cores + 1 is recommended)
# For single-core container: 2 workers
# For multi-core: Adjust WEB_CONCURRENCY env var
#
# Flags explained:
# --host 0.0.0.0       : Bind to all interfaces (required for Docker)
# --port 8000          : Listen on port 8000
# --workers 2          : Run 2 worker processes (concurrency)
# --log-level info     : Production logging (not debug)
# --access-log         : Enable access logs
# --no-access-log      : Disable access logs (uncomment for less verbosity)
# --timeout-keep-alive : Keep-alive timeout (default: 5)
# --limit-concurrency  : Max concurrent connections per worker
#
# Environment variables:
# WEB_CONCURRENCY      : Override worker count (export WEB_CONCURRENCY=4)
# UVICORN_LOG_LEVEL    : Override log level (export UVICORN_LOG_LEVEL=warning)
CMD ["sh", "-c", "python check_env.py && uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2} --log-level ${UVICORN_LOG_LEVEL:-info} --timeout-keep-alive 5 --limit-concurrency 1000"]

# ============================================
# Alternative: Gunicorn with Uvicorn Workers
# ============================================
# For even better production performance, use gunicorn:
# 
# 1. Add to requirements.txt:
#    gunicorn==21.2.0
#
# 2. Replace CMD with:
#    CMD ["sh", "-c", "python check_env.py && gunicorn main:app --workers ${WEB_CONCURRENCY:-2} --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120 --graceful-timeout 30 --log-level ${UVICORN_LOG_LEVEL:-info}"]
#
# Gunicorn benefits:
# - Better worker management
# - Graceful restarts
# - More robust process handling
# - Industry standard for production
# ============================================



