@echo off
REM ====================================================================
REM Riffmax launcher — opens backend (FastAPI) and frontend (Next.js)
REM in two separate Command Prompt windows.
REM Close those windows (or press Ctrl+C inside each) to stop.
REM ====================================================================

echo.
echo Starting Riffmax...
echo   Backend  -^> http://localhost:8000
echo   Frontend -^> http://localhost:3000
echo.
echo Two Command Prompt windows will open. Leave them running.
echo.

REM --- Backend ---
start "Riffmax Backend" cmd /k "cd /d C:\Users\DATA ENG. OLA\Documents\Claude\Projects\AUTO AI WEBSITE BUILDER\backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

REM Small delay so the two windows don't compete for focus
timeout /t 2 /nobreak >nul

REM --- Frontend ---
start "Riffmax Frontend" cmd /k "cd /d C:\Users\DATA ENG. OLA\Documents\Claude\Projects\AUTO AI WEBSITE BUILDER\frontend && npm run dev"

REM This launcher window can close itself
exit
