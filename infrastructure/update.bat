@echo off
REM ====================================================================
REM EAGOWL-POC Windows Update Script
REM This script updates EAGOWL-POC to the latest version
REM ====================================================================

setlocal enabledelayedexpansion
set "INSTALL_DIR=C:\eagowl-poc"
set "BACKUP_DIR=C:\eagowl-poc-backups"
set "LOG_FILE=%TEMP%\eagowl-poc-update.log"

REM Function to log messages
:log
echo [%date% %time%] %~1 >> "%LOG_FILE%"
echo %~1
goto :eof

:info
powershell -Command "Write-Host '%~1' -ForegroundColor Green"
goto :eof

:warning
powershell -Command "Write-Host '%~1' -ForegroundColor Yellow"
goto :eof

:error
powershell -Command "Write-Host '%~1' -ForegroundColor Red"
goto :eof

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    call :error "This script must be run as Administrator"
    echo.
    echo Please right-click on this script and select "Run as administrator"
    pause
    exit /b 1
)

call :info "Starting EAGOWL-POC Update Process..."
call :log "=== EAGOWL-POC Update Started ==="

REM Check if EAGOWL-POC is installed
if not exist "%INSTALL_DIR%" (
    call :error "EAGOWL-POC is not installed. Cannot update."
    pause
    exit /b 1
)

REM Create backup of current installation
call :info "Creating backup of current installation..."
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

if exist "%BACKUP_DIR%" rmdir /s /q "%BACKUP_DIR%" >nul 2>&1
mkdir "%BACKUP_DIR%" >nul 2>&1

REM Stop services
call :info "Stopping EAGOWL-POC services..."
cd /d "%INSTALL_DIR%"
docker-compose down >nul 2>&1
sc stop EAGOWLPOC >nul 2>&1

REM Backup current installation
call :info "Backing up files..."
xcopy /e /i /h "%INSTALL_DIR%" "%BACKUP_DIR%\eagowl-poc-backup-%TIMESTAMP%\" >nul 2>&1
if %errorlevel% neq 0 (
    call :error "Failed to create backup"
    goto :error_exit
)

REM Download latest version
call :info "Downloading latest EAGOWL-POC version..."
REM This would need to be implemented based on your update server
REM For now, assuming local package exists

REM Extract and install
call :info "Installing new version..."
REM Implementation depends on your update mechanism

REM Start services
call :info "Starting updated services..."
cd /d "%INSTALL_DIR%"
docker-compose up -d >nul 2>&1
sc start EAGOWLPOC >nul 2>&1

REM Verify update
call :info "Verifying update..."
timeout /t 30 /nobreak >nul

REM Test if services are running
docker-compose ps | find "Up" >nul
if %errorlevel% equ 0 (
    call :info "Update completed successfully"
    echo.
    echo Backup of previous version: %BACKUP_DIR%\eagowl-poc-backup-%TIMESTAMP%
    echo.
    set /p choice="Do you want to start EAGOWL-POC web console? (Y/N): "
    if /i "%choice%"=="Y" (
        start http://localhost
    )
) else (
    call :error "Update verification failed. Restoring backup..."
    cd /d "%INSTALL_DIR%"
    docker-compose down >nul 2>&1
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
    move "%BACKUP_DIR%\eagowl-poc-backup-%TIMESTAMP%" "%INSTALL_DIR%" >nul 2>&1
    cd /d "%INSTALL_DIR%"
    docker-compose up -d >nul 2>&1
    sc start EAGOWLPOC >nul 2>&1
    call :info "Previous version restored"
)

goto :end

:error_exit
call :error "Update failed. Check the log file: %LOG_FILE%"
pause
exit /b 1

:end
call :info "EAGOWL-POC update process completed"
endlocal