@echo off
cls
echo ============================================================
echo                    MEDIBOT - STARTUP
echo ============================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking environment variables...
if not exist ..\.env (
    echo [ERROR] .env file not found in parent directory!
    echo Expected location: e:\work\MediBot\.env
    echo.
    pause
    exit /b 1
)

REM Verify critical environment variables
findstr /C:"DATABASE_URL" ..\.env >nul 2>&1
if errorlevel 1 (
    echo [WARNING] DATABASE_URL not found in .env file
)

findstr /C:"ALLOW_ANON=true" ..\.env >nul 2>&1
if errorlevel 1 (
    echo [WARNING] ALLOW_ANON not set to true - OAuth signin will be required
)

echo [OK] Environment file found
echo.

echo [2/4] Stopping any existing containers...
docker-compose down 2>nul
echo [OK] Cleanup complete
echo.

echo [3/4] Building and starting containers...
echo This may take a few minutes on first run...
echo.
docker-compose up --build -d

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start containers!
    echo Check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo.
echo ============================================================
echo                   STARTUP COMPLETE!
echo ============================================================
echo.
echo Services running:
docker-compose ps
echo.
echo ============================================================
echo                   ACCESS YOUR APP
echo ============================================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   Chat:     http://localhost:3000/chat
echo.
echo ============================================================
echo                   USEFUL COMMANDS
echo ============================================================
echo.
echo   View logs:           docker-compose logs -f
echo   Stop containers:     docker-compose down
echo   Restart:             docker-compose restart
echo   Find chat sessions:  docker exec medibot-backend python query_sessions.py
echo.
echo ============================================================
echo.
echo Press any key to view live logs (Ctrl+C to exit logs)...
pause >nul

echo.
echo Showing live logs (Press Ctrl+C to exit)...
echo.
docker-compose logs -f
