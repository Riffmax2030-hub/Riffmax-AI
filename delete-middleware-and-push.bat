@echo off
REM Deletes the deprecated middleware.ts (proxy.ts replaces it),
REM then commits + pushes. Vercel will redeploy.

cd /d "C:\Users\DATA ENG. OLA\Documents\Claude\Projects\AUTO AI WEBSITE BUILDER"

echo === Deleting frontend\middleware.ts ===
if exist "frontend\middleware.ts" (
    del "frontend\middleware.ts"
    echo Deleted.
) else (
    echo Already gone.
)

echo.
echo === git rm to record the deletion ===
git rm -f frontend/middleware.ts 2>nul

echo.
echo === Cleanup any stuck locks ===
if exist ".git\index.lock" del ".git\index.lock"

echo.
echo === Commit and push ===
git config user.email "sherifolaide2030@gmail.com"
git config user.name  "Sherif Olaide"
git add -A
git commit -m "Delete middleware.ts (replaced by proxy.ts in Next.js 16)"
git push origin main

echo.
echo === Done. Vercel should redeploy in 30 seconds. ===
pause >nul
