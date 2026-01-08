@echo off
REM Quick RAG Verification Script

echo ========================================
echo RAG Pipeline Verification
echo ========================================
echo.

REM 1. Check if FAISS index exists
echo [1/5] Checking FAISS index files...
if exist "backend\faiss_indexes\medical_index.faiss" (
    echo   ✓ FAISS index found
) else (
    echo   ✗ FAISS index NOT found
    echo   Run: python backend\services\faiss_builder.py
    pause
    exit /b 1
)

if exist "backend\faiss_indexes\medical_metadata.json" (
    echo   ✓ Metadata file found
) else (
    echo   ✗ Metadata file NOT found
    pause
    exit /b 1
)
echo.

REM 2. Check if DEBUG_RAG is enabled
echo [2/5] Checking DEBUG_RAG setting...
findstr /C:"DEBUG_RAG=true" .env >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   ✓ DEBUG_RAG is enabled
) else (
    echo   ⚠ DEBUG_RAG is disabled
    echo   Add DEBUG_RAG=true to your .env file for detailed logs
)
echo.

REM 3. Test FAISS directly
echo [3/5] Testing FAISS search...
python test_faiss.py
echo.

REM 4. Check if backend is running
echo [4/5] Checking if backend is running...
curl -s http://localhost:8000/healthz >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   ✓ Backend is running
) else (
    echo   ✗ Backend is NOT running
    echo   Start it with: start.bat
)
echo.

REM 5. Instructions
echo [5/5] Verification complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Start the application: start.bat
echo 2. Open http://localhost:3000
echo 3. Switch to "Doctor Mode" or "Deep Research"
echo 4. Ask: "What are the symptoms of diabetes?"
echo 5. Check the RAG Inspector panel in the UI
echo 6. Verify chunks are retrieved with good scores
echo.
echo To see the exact prompt sent to Gemini:
echo   curl http://localhost:8000/debug/rag
echo.
pause
