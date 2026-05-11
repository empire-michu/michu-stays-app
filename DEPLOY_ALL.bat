@echo off
echo =========================================================
echo  MICHU STAYS - Deploying Everything (Rules + New Website)
echo =========================================================
echo.
echo This will fix BOTH the announcement publishing AND the chat features on the live site!
echo Deploying Firestore rules, Storage rules, and Hosting (the website UI)...
echo.
echo === Deploying to 'michu-stays'...
call firebase deploy --only firestore:rules,storage,hosting

echo.
if %errorlevel% neq 0 (
    echo =========================================================
    echo  ERROR! Deployment failed. Please show this to me!
    echo =========================================================
) else (
    echo =========================================================
    echo  SUCCESS! Everything deployed!
    echo  Refresh michustays.pro.et and test the chat and announcements again.
    echo =========================================================
)
echo.
pause
