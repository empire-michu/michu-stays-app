@echo off
echo =========================================================
echo  MICHU STAYS - Releasing v1.54
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
git commit -m "Release v1.54 - TTI Optimization and Skeleton Loading"
git push

if %errorlevel% neq 0 (
    echo Git push failed!
    pause
    exit /b %errorlevel%
)

echo =========================================================
echo  SUCCESS! v1.54 Deployed and AAB generation triggered!
echo =========================================================
pause
