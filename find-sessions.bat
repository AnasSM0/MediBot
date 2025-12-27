@echo off
echo ============================================================
echo Querying Database for Your Previous Chat Sessions
echo ============================================================
echo.

echo Running query inside Docker container...
docker exec medibot-backend python query_sessions.py

echo.
echo ============================================================
echo To access a specific session, copy its ID and visit:
echo http://localhost:3000/chat?session=SESSION_ID
echo ============================================================
echo.

pause
