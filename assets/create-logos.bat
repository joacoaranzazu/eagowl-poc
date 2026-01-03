@echo off
REM EAGOWL-POC Logo Generation Script for Windows
REM This script generates all required logo variants from your source logo

echo EAGOWL-POC Logo Generator
echo ========================
echo.

REM Check if logo1.png exists
if not exist "%~dp0logo1.png" (
    echo ERROR: logo1.png not found!
    echo.
    echo Please place your EAGOWL-POC logo as 'logo1.png' in the assets directory.
    echo Required logo specifications:
    echo   - Format: PNG with transparency
    echo   - Size: At least 1024x1024 pixels  
    echo   - Colors: Primary green (#00ff88) and white/black variants
    echo   - Background: Transparent
    echo.
    echo Download and install Python with Pillow:
    echo   pip install Pillow
    echo.
    pause
    exit /b 1
)

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.6+ and try again
    pause
    exit /b 1
)

REM Check if Pillow is installed
python -c "import PIL" >nul 2>&1
if errorlevel 1 (
    echo Installing Pillow for image processing...
    python -m pip install Pillow
    if errorlevel 1 (
        echo ERROR: Failed to install Pillow
        pause
        exit /b 1
    )
)

REM Create output directories
echo Creating output directories...
if not exist "%~dp0logos" mkdir "%~dp0logos"
if not exist "%~dp0icons" mkdir "%~dp0icons"
if not exist "%~dp0splash" mkdir "%~dp0splash"

REM Run Python script
echo.
echo Generating logo variants...
python create-logos.py

if errorlevel 1 (
    echo.
    echo Logo generation failed!
    pause
    exit /b 1
)

echo.
echo Logo generation completed successfully!
echo.
echo Generated files:
echo   - Mobile icons: icons\icon-*.png
echo   - Desktop icons: icons\icon_*.png, icons\icon.ico
echo   - Web logos: logos\logo-*.png, logos\favicon.ico
echo   - Splash screens: splash\splash*.png
echo.
echo Next steps:
echo   1. Copy mobile icons to: mobile\assets\images\
echo   2. Copy desktop icons to: dispatch-console\assets\
echo   3. Copy web logos to appropriate web directories
echo   4. Update app.json and electron-builder configs
echo.
pause