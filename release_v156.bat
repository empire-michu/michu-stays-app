@echo off
echo =========================================================
echo  MICHU STAYS - Releasing v1.56
echo =========================================================

echo 1. Deploying to Firebase Hosting (Desktop and Mobile Web)
call firebase deploy --only hosting

if %errorlevel% neq 0 (
    echo Firebase deployment failed!
    pause
    exit /b %errorlevel%
)

echo 2. Committing to Git and Pushing to trigger GitHub Actions (AAB generation)
git add .
git commit -m "Release v1.56.0 - Backend Notification Fixes and Mobile Layout Adjustments"
git push

if %errorlevel% neq 0 (
    echo Git push failed!
    pause
    exit /b %errorlevel%
)

echo =========================================================
echo  SUCCESS! v1.56 Deployed and AAB generation triggered!
echo =========================================================
pause
