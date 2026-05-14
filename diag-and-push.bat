@echo off
REM diag-and-push.bat — verbose git diagnostics + commit + push.
REM Captures everything to diagnose why pushes are silently doing nothing.

cd /d "C:\Users\DATA ENG. OLA\Documents\Claude\Projects\AUTO AI WEBSITE BUILDER"

echo ============================================================
echo CURRENT REMOTE
echo ============================================================
git remote -v

echo.
echo ============================================================
echo CURRENT BRANCH AND HEAD
echo ============================================================
git branch --show-current
git log -1 --oneline

echo.
echo ============================================================
echo FILE STATE: frontend/lib/supabase/middleware.ts (line 20)
echo Should say: setAll(cookiesToSet: CookieToSet[])
echo ============================================================
findstr /n "setAll" frontend\lib\supabase\middleware.ts

echo.
echo ============================================================
echo FILE STATE: frontend/app/page.tsx (voice input)
echo Should say: SpeechRecognitionEvent
echo ============================================================
findstr /n "SpeechRecognitionEvent" frontend\app\page.tsx

echo.
echo ============================================================
echo GIT STATUS (verbose)
echo ============================================================
git status

echo.
echo ============================================================
echo CLEANUP locks + STAGE EVERYTHING + COMMIT + PUSH
echo ============================================================
if exist ".git\index.lock" del ".git\index.lock"
git config user.email "sherifolaide2030@gmail.com"
git config user.name  "Sherif Olaide"
git add -A
git commit -m "Tighten voice input typing; ensure middleware/server CookieToSet types" --allow-empty
git push origin main

echo.
echo ============================================================
echo DONE. Latest commit on origin should now match local:
echo ============================================================
git log -1 --oneline

echo.
echo Press any key to close this window.
pause >nul
