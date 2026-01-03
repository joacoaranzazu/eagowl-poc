@echo on
REM ====================================================================
REM EAGOWL-POC Installation Script for Windows
REM This script installs and configures the complete EAGOWL-POC platform
REM ====================================================================

setlocal enabledelayedexpansion
set "INSTALL_DIR=C:\eagowl-poc"
set "SERVICE_NAME=EAGOWLPOC"
set "MIN_RAM=8192"
set "MIN_DISK=100000"
set "LOG_FILE=%TEMP%\eagowl-poc-install.log"

REM Function to log messages
:log
echo [%date% %time%] %~1 >> "%LOG_FILE%"
echo %~1
goto :eof

REM Function to display colored messages
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

call :info "Starting EAGOWL-POC Installation for Windows"
call :log "=== EAGOWL-POC Installation Started ==="

REM Check Windows version
call :info "Checking Windows version..."
ver | findstr /i "10\.0\." >nul
if %errorlevel% equ 0 (
    call :info "Windows 10/11 detected - Supported"
) else (
    ver | findstr /i "6\." >nul
    if %errorlevel% equ 0 (
        call :warning "Windows Server 2008/2012/2016/2019 detected"
    ) else (
        call :error "Unsupported Windows version"
        goto :error_exit
    )
)

REM Check system requirements
call :info "Checking system requirements..."

REM Check RAM
for /f "skip=1 tokens=4" %%a in ('wmic computersystem get TotalPhysicalMemory /value 2^>nul') do (
    set /a "RAM_MB=%%a/1048576"
)
if %RAM_MB% lss %MIN_RAM% (
    call :error "Insufficient RAM. Required: %MIN_RAM%MB, Available: %RAM_MB%MB"
    goto :error_exit
)
call :info "RAM check passed: %RAM_MB%MB available"

REM Check disk space
for /f "tokens=3" %%a in ('dir c:\ /-c ^| find "bytes free"') do set DISK_FREE=%%a
set /a "DISK_MB=%DISK_FREE:~0,-3%"
if %DISK_MB% lss %MIN_DISK% (
    call :error "Insufficient disk space. Required: %MIN_DISK%MB, Available: %DISK_MB%MB"
    goto :error_exit
)
call :info "Disk space check passed: %DISK_MB%MB available"

REM Install Chocolatey if not present
call :info "Checking for Chocolatey..."
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    call :info "Installing Chocolatey package manager..."
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    call :log "Chocolatey installation completed"
) else (
    call :info "Chocolatey is already installed"
)

REM Install Docker Desktop
call :info "Checking Docker Desktop installation..."
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    call :info "Installing Docker Desktop..."
    choco install docker-desktop -y
    call :log "Docker Desktop installation completed"
    
    REM Start Docker Desktop
    call :info "Starting Docker Desktop..."
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    REM Wait for Docker to start
    call :info "Waiting for Docker to start (60 seconds)..."
    timeout /t 60 /nobreak
    
    REM Test Docker connection
    call :info "Testing Docker connection..."
    for /l %%i in (1,1,10) do (
        docker version >nul 2>&1
        if !errorlevel! equ 0 (
            call :info "Docker is running successfully"
            goto :docker_ready
        )
        call :warning "Docker not ready, retrying... (attempt %%i/10)"
        timeout /t 10 /nobreak >nul
    )
    call :error "Docker failed to start properly"
    goto :error_exit
) else (
    call :info "Docker Desktop is already installed"
)

:docker_ready

REM Install Git (needed for some operations)
call :info "Checking Git installation..."
git --version >nul 2>&1
if %errorlevel% neq 0 (
    call :info "Installing Git..."
    choco install git -y
    call :log "Git installation completed"
) else (
    call :info "Git is already installed"
)

REM Create installation directory
call :info "Creating installation directory..."
if exist "%INSTALL_DIR%" (
    call :warning "Installation directory already exists, backing up..."
    if exist "%INSTALL_DIR%-backup" rmdir /s /q "%INSTALL_DIR%-backup" >nul 2>&1
    move "%INSTALL_DIR%" "%INSTALL_DIR%-backup" >nul 2>&1
)
mkdir "%INSTALL_DIR%" >nul 2>&1
cd /d "%INSTALL_DIR%"

REM Download or extract EAGOWL-POC package
call :info "Setting up EAGOWL-POC files..."

REM Check if package exists in parent directory
if exist "..\eagowl-poc-v1.0.tar.gz" (
    call :info "Using local EAGOWL-POC package"
    copy "..\eagowl-poc-v1.0.tar.gz" "."
) else (
    call :info "EAGOWL-POC package not found. Please ensure eagowl-poc-v1.0.tar.gz is in parent directory"
    goto :error_exit
)

REM Extract package (requires 7-Zip or tar)
call :info "Extracting EAGOWL-POC package..."
tar --version >nul 2>&1
if %errorlevel% equ 0 (
    tar -xzf eagowl-poc-v1.0.tar.gz
) else (
    call :info "tar not available, trying 7-Zip..."
    7z x eagowl-poc-v1.0.tar.gz -so | tar -xf -
    if %errorlevel% neq 0 (
        call :error "Failed to extract package. Please install 7-Zip or tar for Windows"
        goto :error_exit
    )
)

REM Copy infrastructure files
call :info "Copying infrastructure files..."
xcopy /e /i infrastructure\* . >nul 2>&1

REM Generate secure passwords
call :info "Generating secure passwords..."
call :generate_password POSTGRES_PASSWORD
call :generate_password REDIS_PASSWORD
call :generate_password JWT_SECRET
call :generate_password TURN_PASSWORD
call :generate_password GRAFANA_PASSWORD

REM Create .env file with secure passwords
call :info "Creating environment configuration..."
(
echo # EAGOWL-POC Environment Configuration
echo # Generated automatically by install script on %date% %time%
echo.
echo # Database Configuration
echo POSTGRES_DB=eagowl_poc_db
echo POSTGRES_USER=eagowl_poc_user
echo POSTGRES_PASSWORD=!POSTGRES_PASSWORD!
echo POSTGRES_PORT=5432
echo.
echo # Redis Configuration
echo REDIS_PASSWORD=!REDIS_PASSWORD!
echo REDIS_PORT=6379
echo.
echo # Security Configuration
echo JWT_SECRET=!JWT_SECRET!
echo CORS_ORIGIN=http://localhost:3000,http://localhost:3001
echo.
echo # Network Ports Configuration
echo HTTP_PORT=80
echo HTTPS_PORT=443
echo API_PORT=8080
echo WS_PORT=9998
echo METRICS_PORT=9090
echo PROMETHEUS_PORT=9091
echo GRAFANA_PORT=3001
echo.
echo # WebRTC STUN/TURN Configuration
echo STUN_SERVER=stun:stun.l.google.com:19302
echo TURN_USERNAME=eagowl_user
echo TURN_PASSWORD=!TURN_PASSWORD!
echo.
echo # Grafana Configuration
echo GRAFANA_USER=admin
echo GRAFANA_PASSWORD=!GRAFANA_PASSWORD!
echo.
echo # Logging Configuration
echo LOG_LEVEL=info
echo LOG_FORMAT=json
echo.
echo # Storage Paths
echo MEDIA_STORAGE_PATH=/app/storage/media
echo RECORDING_PATH=/app/storage/recordings
echo.
echo # Configuration
echo NODE_ENV=production
echo DEBUG=false
) > .env

call :log "Environment configuration created with secure passwords"

REM Store passwords securely
call :info "Storing credentials securely..."
(
echo EAGOWL-POC Installation Credentials
echo ==================================
echo Generated: %date% %time%
echo.
echo PostgreSQL:
echo   Database: eagowl_poc_db
echo   User: eagowl_poc_user
echo   Password: !POSTGRES_PASSWORD!
echo.
echo Redis:
echo   Password: !REDIS_PASSWORD!
echo.
echo JWT Secret:
echo   Secret: !JWT_SECRET!
echo.
echo STUN/TURN:
echo   Username: eagowl_user
echo   Password: !TURN_PASSWORD!
echo.
echo Grafana:
echo   User: admin
echo   Password: !GRAFANA_PASSWORD!
echo.
echo IMPORTANT: Keep this file secure and make a backup!
) > passwords.txt
attrib +h passwords.txt >nul 2>&1

call :info "Credentials saved to: %INSTALL_DIR%\passwords.txt"

REM Create backup directory
call :info "Creating backup directory..."
if not exist "C:\eagowl-poc-backups" mkdir "C:\eagowl-poc-backups"

REM Start Docker services
call :info "Starting EAGOWL-POC services..."
docker-compose up -d

REM Wait for services to start
call :info "Waiting for services to initialize..."
timeout /t 60 /nobreak >nul

REM Check if services are running
call :info "Verifying services..."
docker-compose ps | find "Up" >nul
if %errorlevel% neq 0 (
    call :error "Some services failed to start"
    docker-compose logs
    goto :error_exit
)

call :info "All Docker services started successfully"

REM Wait for database to be ready
call :info "Waiting for database to be ready..."
set timeout=60
:wait_db
docker exec eagowl-poc-postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db >nul 2>&1
if %errorlevel% equ 0 (
    call :info "Database is ready"
) else (
    set /a timeout-=1
    if !timeout! gtr 0 (
        timeout /t 2 /nobreak >nul
        goto :wait_db
    ) else (
        call :error "Database failed to start within timeout period"
        goto :error_exit
    )
)

REM Run database migrations
call :info "Running database migrations..."
docker exec eagowl-poc-api-server npm run prisma:migrate >nul 2>&1

REM Create Windows service
call :info "Creating Windows service..."
sc delete "%SERVICE_NAME%" >nul 2>&1

REM Create service batch file
(
@echo off
cd /d "%INSTALL_DIR%"
docker-compose up -d
) > eagowl-service.bat

REM Install service
sc create "%SERVICE_NAME%" binPath= "cmd /c \"%INSTALL_DIR%\eagowl-service.bat\"" start= auto >nul 2>&1
sc description "%SERVICE_NAME%" "EAGOWL-POC Platform Service" >nul 2>&1

if %errorlevel% equ 0 (
    call :info "Windows service created successfully"
    sc start "%SERVICE_NAME%" >nul 2>&1
) else (
    call :warning "Failed to create Windows service. You can start manually using eagowl-service.bat"
)

REM Create startup shortcuts
call :info "Creating desktop shortcuts..."
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%PUBLIC%\Desktop\EAGOWL-POC Console.lnk'); $Shortcut.TargetPath = 'http://localhost'; $Shortcut.Save()"

REM Configure Windows Firewall
call :info "Configuring Windows Firewall..."
netsh advfirewall firewall add rule name="EAGOWL-POC HTTP" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
netsh advfirewall firewall add rule name="EAGOWL-POC HTTPS" dir=in action=allow protocol=TCP localport=443 >nul 2>&1
netsh advfirewall firewall add rule name="EAGOWL-POC API" dir=in action=allow protocol=TCP localport=8080 >nul 2>&1
netsh advfirewall firewall add rule name="EAGOWL-POC WebSocket" dir=in action=allow protocol=TCP localport=9998 >nul 2>&1

call :info "Windows Firewall rules configured"

REM Create backup script
(
@echo off
echo EAGOWL-POC Backup Script
echo ======================
set BACKUP_DIR=C:\eagowl-poc-backups
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo Creating backup...
cd /d "%INSTALL_DIR%"

REM Backup PostgreSQL database
docker exec eagowl-poc-postgres pg_dump -U eagowl_poc_user eagowl_poc_db > "%BACKUP_DIR%\postgres_%TIMESTAMP%.sql" 2>nul

REM Backup Redis data
docker exec eagowl-poc-redis redis-cli --rdb - > "%BACKUP_DIR%\redis_%TIMESTAMP%.rdb" 2>nul

REM Backup media files
tar -czf "%BACKUP_DIR%\media_%TIMESTAMP%.tar.gz" storage\media 2>nul

echo Backup completed: %TIMESTAMP%
pause
) > backup.bat

REM Create Task Scheduler entry for backups
call :info "Setting up automatic backups..."
schtasks /create /tn "EAGOWL-POC Backup" /tr "%INSTALL_DIR%\backup.bat" /sc daily /st 02:00 /f >nul 2>&1

REM Show completion message
call :info "Installation completed successfully!"
call :log "=== EAGOWL-POC Installation Completed Successfully ==="

echo.
echo ====================== EAGOWL-POC ======================
call :info "Access Information:"
echo   Web Console: http://localhost
echo   API Server: http://localhost:8080  
echo   WebSocket: ws://localhost:9998
echo   Grafana: http://localhost:3001 (admin/!GRAFANA_PASSWORD!)
echo.
echo ====================== Useful Commands ======================
call :info "Management Commands:"
echo   View logs: docker-compose logs -f
echo   Stop services: docker-compose down
echo   Start services: docker-compose up -d
echo   Restart services: docker-compose restart
echo   Manual backup: backup.bat
echo   Service management: services.msc (search for EAGOWLPOC)
echo.
echo ====================== Files ======================
call :info "Important Files:"
echo   Configuration: %INSTALL_DIR%\.env
echo   Credentials: %INSTALL_DIR%\passwords.txt (hidden file)
echo   Installation: %INSTALL_DIR%\eagowl-service.bat
echo   Logs: docker-compose logs
echo.
echo ====================== Security ======================
call :warning "IMPORTANT SECURITY NOTES:"
echo   1. Keep the passwords.txt file secure and backed up
echo   2. Change default passwords after first login
echo   3. Configure SSL certificates for production use
echo   4. Review firewall rules regularly
echo   5. Monitor system logs for suspicious activity
echo.

call :info "EAGOWL-POC is now installed and running!"
echo.

REM Ask to open web console
set /p choice="Do you want to open the EAGOWL-POC web console now? (Y/N): "
if /i "%choice%"=="Y" (
    start http://localhost
)

goto :end

:generate_password
setlocal
set "chars=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "password="
for /l %%i in (1,1,32) do (
    set /a "rand=!random! %% 62"
    set "char=!chars:~!rand!,1!"
    set "password=!password!!char!"
)
endlocal & set "%1=%password%"
goto :eof

:error_exit
call :error "Installation failed. Check the log file: %LOG_FILE%"
pause
exit /b 1

:end
call :info "EAGOWL-POC installation script completed"
endlocal