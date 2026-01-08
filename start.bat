@echo off
REM MediBot Startup Script (Docker Redis Version)
REM This script starts all required services for the MediBot application

echo ========================================
echo Starting MediBot Application
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)

REM Start Redis using Docker Compose
echo [1/4] Starting Redis Server (Docker)...
docker-compose up -d redis
timeout /t 3 /nobreak >nul

REM Activate Python virtual environment and start backend
echo [2/4] Starting Backend (FastAPI)...
start "MediBot Backend" cmd /k "cd /d %~dp0backend && call ..\venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

REM Start Frontend (Next.js)
echo [3/4] Starting Frontend (Next.js)...
start "MediBot Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo Redis:    localhost:6379
echo.
echo Press any key to open the application in your browser...
pause >nul

REM Open browser
start http://localhost:3000

echo.
echo To stop all services:
echo - Close the Backend and Frontend terminal windows
echo - Run: docker-compose down
echo.
pause
