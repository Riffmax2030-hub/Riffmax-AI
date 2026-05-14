@echo off
REM ====================================================================
REM push-fix.bat — clean up any stuck git state, then commit + push
REM all pending changes. Double-click this when Vercel is failing on
REM code that you know is fixed locally.
REM ====================================================================

cd /d "C:\Users\DATA ENG. OLA\Documents\Claude\Projects\AUTO AI WEBSITE BUILDER"

echo.
echo === Cleaning any stuck git lock files ===
if exist ".git\index.lock" del ".git\index.lock"
if exist ".git\HEAD.lock"  del ".git\HEAD.lock"

echo.
echo === Setting your git identity (safe to re-run) ===
git config user.email "sherifolaide2030@gmail.com"
git config user.name  "Sherif Olaide"

echo.
echo === What's changed ===
git status --short

echo.
echo === Staging and committing ===
git add .
git commit -m "Fix TS: explicit CookieToSet types + middleware to proxy rename"

echo.
echo === Pushing to GitHub (Vercel + Railway will auto-redeploy) ===
git push origin main

echo.
echo === Done. Check Vercel + Railway dashboards in 30 seconds. ===
echo Press any key to close this window.
pause >nul
