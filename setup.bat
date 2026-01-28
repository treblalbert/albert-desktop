@echo off
title Albert Desktop - Setup
echo.
echo  ========================================
echo       Albert Desktop Setup
echo  ========================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please install it from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found
for /f "tokens=*" %%i in ('node -v') do echo     Version: %%i
echo.

:: Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

echo ========================================
echo.
echo Setup complete! You can now:
echo.
echo    npm start       - Run in dev mode
echo    npm run build   - Build .exe
echo.
echo The .exe will be created in the 'dist' folder.
echo.
pause
