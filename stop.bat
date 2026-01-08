@echo off
REM Stop all MediBot services

echo Stopping MediBot services...

REM Stop Docker containers
docker-compose down

echo.
echo All services stopped.
echo You can close the Backend and Frontend terminal windows manually.
pause
