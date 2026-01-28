@echo off
title Albert Desktop - Build
echo.
echo  ========================================
echo       Albert Desktop Build
echo  ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Dependencies not installed. Running setup first...
    call npm install
    echo.
)

echo Building AlbertDesktop.exe...
echo This may take a minute...
echo.

call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo.
echo [OK] Build complete!
echo.
echo Your executable is at:
echo dist\AlbertDesktop.exe
echo.
echo You can move this .exe anywhere you want.
echo It's portable - no installation needed!
echo.

:: Open dist folder
explorer dist

pause
