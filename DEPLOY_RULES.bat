@echo off
title Michu Stays - Deploy Security Rules
color 0A
echo.
echo  ==========================================
echo   MICHU STAYS - Deploying Security Rules
echo  ==========================================
echo.
echo  Deploying Firestore and Storage rules...
echo  This fixes:
echo    - Chat permissions (guests and managers)
echo    - Announcement publishing
echo.

cd /d "%~dp0"
call firebase deploy --only firestore:rules,storage

echo.
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo  ==========================================
    echo   SUCCESS! Rules deployed.
    echo   Refresh your browser and test again.
    echo  ==========================================
) else (
    color 0C
    echo  ==========================================
    echo   FAILED. Make sure firebase CLI is installed.
    echo   Run: npm install -g firebase-tools
    echo  ==========================================
)
echo.
pause
