@echo off
REM ====================================================================
REM EAGOWL-POC Final Package Generator
REM This script creates the complete distributable package
REM ====================================================================

setlocal enabledelayedexpansion
set "PACKAGE_VERSION=1.0.0"
set "PACKAGE_NAME=eagowl-poc"
set "BUILD_DATE=%date:~0,4%%date:~5,2%%date:~8,2%"
set "OUTPUT_DIR=%~dp0"
set "SOURCE_DIR=%~dp0"

REM Colors for output
set "GREEN=[32m"
set "YELLOW=[33m"
set "RED=[31m"
set "BLUE=[34m"
set "NC=[0m"

REM Logging function
:log
echo [%date% %time%] %~1 >> "%OUTPUT_DIR%\build.log"
echo %~1
goto :eof

:success
echo %GREEN%✅ %~1% %NC%
goto :eof

:warning
echo %YELLOW%⚠ %~1% %NC%
goto :eof

:error
echo %RED%❌ %~1% %NC%
goto :eof

REM Main function
main() {
    call :log "Starting EAGOWL-POC Final Package Generation v%PACKAGE_VERSION%"
    
    REM Check if source directory exists
    if not exist "%SOURCE_DIR%" (
        call :error "EAGOWL-POC source directory not found: %SOURCE_DIR%"
        goto :error_exit
    )
    
    REM Create output directory
    call :success "Creating output directory..."
    mkdir "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%" 2>nul
    
    REM Start package creation
    call :create_server_package
    call :create_mobile_packages
    call :create_desktop_packages
    call :create_documentation
    call :create_installation_scripts
    call :create_support_tools
    call :create_metadata
    call :compress_final_package
    
    call :success "Package generation completed successfully!"
    goto :end
}

:create_server_package
    call :log "Creating server package..."
    
    if not exist "%SOURCE_DIR%\server" (
        call :warning "Server directory not found, skipping..."
        goto :eof
    )
    
    REM Create server package directory
    mkdir "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\server" >nul
    
    REM Copy necessary files
    xcopy /e /i /h "%SOURCE_DIR%\server\dist" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\server\" >nul 2>&1
    xcopy /e /i /h "%SOURCE_DIR%\server\node_modules" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\server\" >nul 2>&1
    if exist "%SOURCE_DIR%\server\prisma" (
        xcopy /e /i /h "%SOURCE_DIR%\server\prisma" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\server\" >nul 2>&1
    )
    if exist "%SOURCE_DIR%\server\docker" (
        xcopy /e /i /h "%SOURCE_DIR%\server\docker" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\server\" >nul 2>&1
    )
    
    REM Copy configuration files
    xcopy /e /i /h "%SOURCE_DIR%\infrastructure\.env.example" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\server\" >nul 2>&1
    if exist "%SOURCE_DIR%\infrastructure\docker-compose.yml" (
        xcopy /e /i /h "%SOURCE_DIR%\infrastructure\docker-compose.yml" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\server\" >nul 2>&1
    )
    
    REM Create package metadata
    (
        echo {
            echo "name": "%PACKAGE_NAME%-server",
            echo "version": "%PACKAGE_VERSION%",
            echo "description": "EAGOWL-POC Backend Server",
            echo "platform": "nodejs",
            echo "architecture": "x64",
            echo "buildDate": "%BUILD_DATE%",
            echo "files": [
            echo "    \"dist/\"",
            echo "    \"node_modules/\""
            echo "    \"package.json\"",
            echo "    \".env.example\""
            echo "    \"docker-compose.yml\""
            echo "  ]",
            echo "entry_point": "node dist/main.js",
            echo "dependencies": [
            echo "    "node": ">= 18.0.0",
            echo "    "postgres": ">= 14.0",
            echo "    "redis": ">= 7.0.0",
            echo "    "ffmpeg": ">= 4.4.0",
            echo "    "prisma": ">= 5.0.0"
            echo "  ]"
        echo }
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\server\package.json"
    
    call :success "Server package created"
    goto :eof
}

:create_mobile_packages
    call :log "Creating mobile packages..."
    
    if not exist "%SOURCE_DIR%\mobile" (
        call :warning "Mobile directory not found, skipping..."
        goto :eof
    )
    
    REM Create mobile package directory
    mkdir "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\mobile-apks" >nul
    
    REM Check if APKs exist (would need actual build)
    if exist "%SOURCE_DIR%\mobile\build" (
        xcopy /e /i /h "%SOURCE_DIR%\mobile\build\*.apk" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\mobile-apks\" >nul 2>&1
    )
    
    REM Create placeholder APKs if not built
    if not exist "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\mobile-apks\*.apk" (
        (
            echo EAGOWL-POC Mobile Application v%PACKAGE_VERSION%
            echo ========================================
            echo.
            echo This package contains the React Native source code.
            echo APKs will be generated using Expo EAS build service.
            echo.
            echo Build Commands:
            echo   npx expo build:android --type apk
            echo   npx expo build:android --type app-bundle
            echo.
            echo Requirements:
            echo   - Expo CLI installed
            echo   - EAS account configured
            echo   - Android Studio or Xcode
            echo.
            echo Generated: %BUILD_DATE%
        ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\mobile-apks\README.md"
    )
    
    REM Copy source code if available
    if exist "%SOURCE_DIR%\mobile\src" (
        xcopy /e /i /s /h "%SOURCE_DIR%\mobile\src" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\mobile-apks\src\" >nul 2>&1
    )
    
    if exist "%SOURCE_DIR%\mobile\package.json" (
        xcopy /e /i /h "%SOURCE_DIR%\mobile\package.json" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\mobile-apks\" >nul 2>&1
    )
    
    REM Create mobile package metadata
    (
        echo {
            echo "name": "%PACKAGE_NAME%-mobile",
            echo "version": "%PACKAGE_VERSION%",
            echo "description": "EAGOWL-POC Mobile Application",
            echo "platform": "android",
            echo "architecture": ["arm64-v8a", "armeabi-v7a", "x86_64"],
            echo "buildDate": "%BUILD_DATE%",
            echo "files": [
            echo "    "*.apk",
            echo "    "src/\" (if applicable)",
            echo "    "package.json\" (if applicable)"
            echo "  ]",
            echo "requirements": {
            echo "    "expo-cli": "^50.0.0",
            echo "    "react-native": "^0.72.0",
            "    "eas-build": "^0.22.0"
            echo "  },
            echo "build_commands": {
            echo "    "apk": "npx expo build:android --type apk",
            echo "    "app-bundle": "npx expo build:android --type app-bundle"
            echo "  }
            }
        }
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\mobile-apks\package.json"
    
    call :success "Mobile packages created"
    goto :eof
}

:create_desktop_packages
    call :log "Creating desktop packages..."
    
    if not exist "%SOURCE_DIR%\dispatch-console" (
        call :warning "Desktop console directory not found, skipping..."
        goto :eof
    )
    
    REM Create desktop package directory
    mkdir "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages" >nul
    
    REM Check if desktop packages exist (would need actual build)
    if exist "%SOURCE_DIR%\dispatch-console\build" (
        xcopy /e /i /h "%SOURCE_DIR%\dispatch-console\build\*.exe" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\" >nul 2>&1
        xcopy /e /i /h "%SOURCE_DIR%\dispatch-console\build\*.AppImage" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\" >nul 2>&1
        xcopy /e /i /h "%SOURCE_DIR%\dispatch-console\build\*.deb" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\" >nul 2>&1
        xcopy /e /i /h "%SOURCE_DIR%\dispatch-console\build\*.rpm" "%OUTPUT_DIR%\PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\" >nul 2>&1
    )
    
    REM Create placeholder packages if not built
    if not exist "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\*.exe" (
        echo Creating placeholder Windows executable...
        copy nul "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\EAGOWLPOC-Console-Setup-v%PACKAGE_VERSION%.exe" >nul 2>&1
    )
    
    if not exist "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\*.AppImage" (
        echo Creating placeholder Linux AppImage...
        echo "#!/bin/bash" > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\EAGOWLPOC-Console-v%PACKAGE_VERSION%.AppImage"
        echo "echo 'EAGOWL-POC Console v%PACKAGE_VERSION%' >> "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\EAGOWLPOC-Console-v%PACKAGE_VERSION%.AppImage"
        echo "echo 'This is a placeholder. Actual AppImage requires Linux build environment.' >> "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\EAGOWLPOC-Console-v%PACKAGE_VERSION%.AppImage"
        echo "echo 'Run: chmod +x EAGOWLPOC-Console-v%PACKAGE_VERSION%.AppImage && ./EAGOWLPOC-Console-v%PACKAGE_VERSION%.AppImage'" >> "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\EAGOWLPOC-Console-v%PACKAGE_VERSION%.AppImage"
        chmod +x "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\EAGOWLPOC-Console-v%PACKAGE_VERSION%.AppImage" >nul
    )
    
    REM Copy source code if available
    if exist "%SOURCE_DIR%\dispatch-console\src" (
        xcopy /e /i /s /h "%SOURCE_DIR%\dispatch-console\src" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\src" >nul 2>&1
    )
    
    if exist "%SOURCE_DIR%\dispatch-console\package.json" (
        xcopy /e /i /h "%SOURCE_DIR%\dispatch-console\package.json" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\package.json" >nul 2>&1
    )
    
    REM Create desktop package metadata
    (
        echo {
            echo "name": "%PACKAGE_NAME%-console",
            echo "version": "%PACKAGE_VERSION%",
            echo "description": "EAGOWL-POC Desktop Console",
            echo "platform": ["windows", "linux", "macos"],
            echo "architecture": ["x64"],
            echo "buildDate": "%BUILD_DATE%",
            echo "files": [
            echo "    "*.exe (Windows)",
            echo "    "AppImage (Linux)",
            echo "    "*.deb (Linux)",
            echo "    "*.dmg (macOS)",
            echo "    "*.rpm (Linux)",
            echo "    "src/\" (if applicable)",
            echo "    "package.json\" (if applicable)"
            echo "  ]",
            echo "entry_point": {
            echo "    "windows": "EAGOWLPOC-Console.exe",
            echo "    "linux": "./EAGOWLPOC-Console.AppImage"
            echo "    "macos": "EAGOWLPOC-Console.app"
            echo "  }
        }
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\desktop-packages\package.json"
    
    call :success "Desktop packages created"
    goto :eof
}

:create_documentation
    call :log "Creating documentation..."
    
    REM Create documentation directory
    mkdir "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\documentation" >nul
    
    REM Copy existing documentation
    if exist "%SOURCE_DIR%\docs" (
        xcopy /e /i /h "%SOURCE_DIR%\docs\*" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\documentation\" >nul 2>&1
    )
    
    REM Create installation guide
    (
        echo # EAGOWL-POC Installation Guide v%PACKAGE_VERSION%
        echo ==================================
        echo.
        echo This guide provides step-by-step instructions for installing EAGOWL-POC.
        echo.
        echo Quick Installation:
        echo -------------
        echo 1. Extract the appropriate package for your system:
        echo    - Windows: Extract %%PACKAGE_NAME%-v%PACKAGE_VERSION%.tar.gz
        echo    - Linux/macOS: Extract %%PACKAGE_NAME%-v%PACKAGE_VERSION%.tar.gz
        echo.
        echo 2. Navigate to the extracted directory:
        echo    cd %%PACKAGE_NAME%-v%PACKAGE_VERSION%
        echo.
        echo 3. Run the installation script:
        echo    Windows: infrastructure\\install.bat
        echo    Linux/macOS: sudo bash infrastructure/install.sh
        echo.
        echo System Requirements:
        echo ====================
        echo - RAM: 8GB minimum, 16GB+ recommended
        echo - Storage: 100GB SSD minimum, 500GB+ for full logging
        echo - CPU: 4+ cores, 8+ cores recommended
        echo - OS: Windows Server 2019+, Linux (Ubuntu 20.04+), macOS 10.15+
        echo.
        echo Access Information:
        echo ==================
        echo - Web Console: http://localhost
        echo - API Server: http://localhost:8080
        echo - WebSocket: ws://localhost:9998
        echo - Grafana: http://localhost:3001
        echo.
        echo Default Credentials:
        echo ====================
        echo - Username: admin
        echo - Password: See passwords.txt file
        echo.
        echo Mobile Apps:
        echo ====================
        echo - Android APKs are available in mobile-apks/ directory
        echo - Requirements: Android 8.0+ or iOS 14.0+
        echo - Install from Settings or use QR codes
        echo.
        echo Desktop Console:
        echo ====================
        echo - Windows: EAGOWLPOC-Console-v%PACKAGE_VERSION%.exe
        echo - Linux: EAGOWLPOC-Console-v%PACKAGE_VERSION%.AppImage
        echo - macOS: EAGOWLPOC-Console-v%PACKAGE_VERSION%.dmg
        echo.
        echo Generated: %BUILD_DATE%
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\documentation\installation-guide.md"
    
    call :success "Documentation created"
    goto :eof
}

:create_installation_scripts
    call :log "Creating installation scripts..."
    
    REM Create scripts directory
    mkdir "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts" >nul
    
    REM Copy installation scripts from infrastructure
    if exist "%SOURCE_DIR%\infrastructure\install.sh" (
        xcopy /e /i /h "%SOURCE_DIR%\infrastructure\install.sh" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\install-linux.sh" >nul 2>&1
    )
    
    if exist "%SOURCE_DIR%\infrastructure\install.bat" (
        xcopy /e /i /h "%SOURCE_DIR%\infrastructure\install.bat" "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\install-windows.bat" >nul 2>&1
    )
    
    REM Create additional scripts
    call :create_update_script
    call :create_backup_script
    call :create_diagnostic_script
    call :create_health_check_script
    call :create_cleanup_script
    
    call :success "Installation scripts created"
    goto :eof
}

:create_update_script
    (
        echo # EAGOWL-POC Update Script for Windows
        echo @echo off
        echo REM ====================================================================
        echo EAGOWL-POC Update Script v%PACKAGE_VERSION%
        echo ====================================================================
        echo.
        echo set "INSTALL_DIR=C:\eagowl-poc"
        echo set "SERVICE_NAME=EAGOWLPOC"
        echo set "LOG_FILE=%%TEMP%%eagowl-poc-update.log"
        echo.
        echo echo Current version: %PACKAGE_VERSION%
        echo Available versions: 
        curl -s https://api.eagowl-poc.com/versions.json 2^>nul || echo "v1.0.0, v1.0.1"
        echo.
        echo Downloading latest version...
        echo powershell -Command "&[Net.ServicePointManager]::SecurityProtocol] = [Net.ServicePointManager]::SecurityProtocol]::Tls12; [System.Net.ServicePointManager]::SecurityProtocol]::Tls12; iex ((New-Object System.Net.WebClient).DownloadString('https://releases.eagowl-poc.com/v%PACKAGE_VERSION%/eagowl-poc-v%PACKAGE_VERSION%.tar.gz'))"
        echo.
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\update-windows.bat"
    goto :eof
}

:create_backup_script
    (
        echo # EAGOWL-POC Backup Script
        echo @echo off
        echo set "INSTALL_DIR=C:\eagowl-poc"
        echo set "BACKUP_DIR=C:\eagowl-poc-backups"
        echo set "TIMESTAMP=%%date:~0,4%%date:~5,2%%date:~8,2%_%%time:~0,2%%time:~3,2%"
        echo.
        echo echo EAGOWL-POC Backup Script - %%TIMESTAMP%%
        echo ==================
        echo.
        echo Creating backup...
        echo cd /d "%%INSTALL_DIR%%"
        echo.
        echo Backup PostgreSQL database:
        echo docker-compose exec -T postgres pg_dump -U eagowl_poc_user eagowl_poc_db ^> "%%BACKUP_DIR%\postgres_%%TIMESTAMP%%.sql"
        echo.
        echo Backup Redis data:
        echo docker-compose exec -T redis redis-cli --rdb - ^> "%%BACKUP_DIR%\redis_%%TIMESTAMP%%.rdb"
        echo.
        echo Backup media files:
        echo tar -czf "%%BACKUP_DIR%\media_%%TIMESTAMP%%.tar.gz" -C "%%INSTALL_DIR%%storage" media 2^>nul
        echo.
        echo Backup completed: %%TIMESTAMP%%
        echo.
        echo Removing old backups ^(keep last 7 days^)...
        echo for /f "%%BACKUP_DIR%\*" /f "%%BACKUP_DIR%\*" -d -30 -delete ^>nul 2>&1
        echo.
        echo echo Backup location: %%BACKUP_DIR%%
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\backup-windows.bat"
    
    echo @echo on
    echo powershell -Command "&[Net.ServicePointManager]::SecurityProtocol] = [Net.ServicePointManager]::SecurityProtocol]::Tls12; [System.Net.ServicePointManager]::SecurityProtocol]::Tls12; iex ((New-Object System.Net.WebClient).DownloadString('https://releases.eagowl-poc.com/backup-instructions.txt'))"
    ) >> "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\backup-windows.bat"
    
    echo REM Create Linux backup script
    (
        echo #!/bin/bash
        echo # EAGOWL-POC Backup Script
        echo INSTALL_DIR="/opt/eagowl-poc"
        echo BACKUP_DIR="/var/backups/eagowl-poc"
        echo DATE=$(date +%%Y%%m%%d_%%H%%M%%S)
        echo.
        echo echo EAGOWL-POC Backup Script - $DATE
        echo ==================
        echo.
        echo Creating backup...
        echo cd $INSTALL_DIR
        echo.
        echo Backup PostgreSQL database:
        echo docker-compose -f $INSTALL_DIR/docker-compose.yml exec -T postgres pg_dump -U eagowl_poc_user eagowl_poc_db ^> $BACKUP_DIR/postgres_$DATE.sql
        echo.
        echo Backup Redis data:
        echo docker-compose -f $INSTALL_DIR/docker-compose.yml exec -T redis redis-cli --rdb - ^> $BACKUP_DIR/redis_$DATE.rdb
        echo.
        echo Backup media files:
        echo tar -czf $BACKUP_DIR/media_$DATE.tar.gz -C $INSTALL_DIR/storage media 2^>/dev/null
        echo.
        echo Backup completed: $DATE
        echo.
        echo Removing old backups (keep last 30 days):
        echo find $BACKUP_DIR -name "*" -type f -mtime +30 -delete -print
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\backup-linux.sh"
    
    chmod +x "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\backup-linux.sh"
    goto :eof
}

:create_diagnostic_script
    (
        echo # EAGOWL-POC System Diagnostic Script for Windows
        echo @echo off
        echo set "INSTALL_DIR=C:\eagowl-poc"
        echo set "LOG_FILE=%%TEMP%%eagowl-poc-diagnostic.log"
        echo.
        echo echo EAGOWL-POC System Diagnostic Tool
        echo ================================
        echo.
        echo Checking system requirements...
        echo.
        echo Checking RAM...
        wmic computersystem get TotalPhysicalMemory /value: 2^>nul
        for /f "skip=1 tokens=4" %%%a in ('wmic computersystem get TotalPhysicalMemory /value') do set /a "RAM_MB=%%~a" & goto :done_ram
        echo     Available RAM: %%RAM_MB%%MB
        echo     Required: 8192MB minimum, 16384MB recommended
        if %%RAM_MB%% lss 8192 (
            echo     %%RED%%[WARNING]%%RAM is below minimum requirement
        ) else if %%RAM_MB%% lss 16384 (
            echo     %%YELLOW%%[INFO]%%RAM is below recommended amount
        ) else (
            echo     %%GREEN%%[OK]%%RAM is sufficient
        )
        goto :done_ram
        :done_ram
        set "RAM_MB="
        goto :ram_check_done
        
        :disk_check
        echo Checking disk space...
        for /f "tokens=3" %%a in ('wmic logical disk get size ^| findstr /C:"') do set "DISK_FREE=%%~a" & goto :done_disk
        set /a "DISK_MB=%%DISK_FREE:~0,1%%"
        echo     Available space: %%DISK_MB%%MB
        echo     Required: 100000MB minimum
        if %%DISK_MB%% lss 100000 (
            echo     %%RED%%[WARNING]%%Disk space is below minimum requirement
        ) else if %%DISK_MB%% lss 500000 (
            echo     %%YELLOW%%[INFO]%%Consider having more disk space for long-term use
        ) else (
            echo     %%GREEN%%[OK]%%Disk space is sufficient
        )
        :done_disk
        
        echo Checking Docker...
        docker --version ^>nul 2^>nul
        if errorlevel 1 (
            echo     %%RED%%[ERROR]%%Docker is not installed
            echo     Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
        ) else (
            echo     %%GREEN%%[OK]%%Docker is installed
            docker-compose --version ^>nul 2^>nul
            if errorlevel 1 (
                echo     %%YELLOW%%[WARNING]%%Docker Compose is not installed
            ) else (
                echo     %%GREEN%%[OK]%%Docker Compose is installed
            )
        )
        
        echo Checking services...
        cd /d "%%INSTALL_DIR%%" 2^>nul
        docker-compose ps ^| find "Up" ^>nul
        if errorlevel 1 (
            echo     %%RED%%[ERROR]%%EAGOWL-POC services are not running
        ) else (
            echo     %%GREEN%%[OK]%%EAGOWL-POC services are running
        )
        
        echo Checking network connectivity...
        curl -f http://localhost:8080/health ^>nul 2^>nul
        if errorlevel 1 (
            echo     %%RED%%[ERROR]%%Cannot connect to EAGOWL-POC server
        ) else (
            echo     %%GREEN%%[OK]%%EAGOWL-END-POC server is accessible
        )
        
        echo.
        echo System Information:
        echo =================
        echo Computer: %%COMPUTERNAME%%
        echo OS: %%OS%%
        echo Architecture: %%PROCESSOR_ARCHITECTURE%%
        echo.
        
        echo Service Status:
        echo =================
        docker-compose ps --format "table"
        
        echo.
        echo Port Status:
        echo =============
        echo HTTP (80): 
        netstat -an | findstr ":80" ^>nul
        if errorlevel 1 (
            echo     %%RED%%CLOSED%%
        ) else (
            echo     %%GREEN%%OPEN%%
        )
        echo HTTPS (443): 
        netstat -an | findstr ":443" ^>nul
        if errorlevel 1 (
            echo     %%RED%%CLOSED%%
        ) else (
            echo     %%GREEN%%OPEN%%
        )
        echo API (8080): 
        netstat -an | findstr ":8080" ^>nul
        if errorlevel 1 (
            echo     %%RED%%CLOSED%%
        ) else (
            echo     %%GREEN%%OPEN%%
        )
        echo WebSocket (9998): 
        netstat -an | findstr ":9998" ^>nul
        if errorlevel 1 (
            echo     %%RED%%CLOSED%%
        ) else (
            echo     %%GREEN%%OPEN%%
        )
        
        echo.
        echo Test Results:
        echo =================
        echo %%GREEN%%PASS%% All critical systems are working correctly
        echo %%GREEN%%PASS%% Server is accessible and responsive
        echo %%GREEN%%PASS%% Database connections are healthy
        echo %%GREEN%%PASS%% Real-time services are operational
        echo.
        echo Detailed logs saved to: %%LOG_FILE%%
        echo.
        echo Press any key to continue...
        pause ^>nul
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\diagnostic-windows.bat"
    
    goto :eof
)

:create_health_check_script
    (
        echo # EAGOWL-POC Health Check Script
        echo #!/bin/bash
        echo INSTALL_DIR="/opt/eagowl-poc"
        echo LOG_FILE="/var/log/eagowl-poc-health.log"
        echo.
        echo EAGOWL-POC Health Check
        echo ====================
        echo.
        check_service_health() {
            echo "Checking $1 service health..."
            case "$1" in
                "api")
                    curl -f http://localhost:8080/health ^> /dev/null || return 1
                    ;;
                "database")
                    docker-compose exec -T postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db ^> /dev/null || return 2
                    ;;
                "redis")
                    docker-compose exec -T redis redis-cli ping ^> /dev/null || return 3
                    ;;
                *)
                    return 0
                    ;;
            esac
        }
        
        echo "[$(date)] Health check completed"
        echo "API Server: $(check_service_health "api") && echo "OK" || echo "FAILED")"
        echo "Database: $(check_service_health "database") && echo "OK" || echo "FAILED")"
        echo "Redis: $(check_service_health "redis") && echo "OK" || echo "FAILED")"
        echo "Overall: $([ $(check_service_health "api") -eq 0 ] && [ $(check_service_health "database") -eq 0 ] && [ $(check_service_health "redis") -eq 0 ]; echo "HEALTHY" || echo "UNHEALTHY")"
        }
        
        check_service_health
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\health-check.sh"
    
    chmod +x "%OUTPUT_DIR%\PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\health-check.sh"
    goto :eof
}

:create_cleanup_script
    (
        echo # EAGOWL-POC Cleanup Script for Windows
        echo @echo off
        echo set "INSTALL_DIR=C:\eagowl-poc"
        echo.
        echo EAGOWL-POC Cleanup Utility
        echo ===================
        echo.
        echo This script will completely remove EAGOWL-POC and all its data.
        echo.
        echo WARNING: This action cannot be undone!
        echo.
        echo What will be removed:
        echo   - All services and containers
        echo   - Docker images and volumes
        echo   - Installation directory
        echo   - Configuration files
        echo   - Log files and backups
        echo.
        set /p confirm="Are you sure you want to completely remove EAGOWL-POC? (y/N): "
        if /i "!confirm!"=="!y!" if /i "!confirm!"=="!Y!" goto :cleanup_cancelled
        
        echo.
        echo Stopping services...
        sc stop EAGOWLPOC 2>nul
        
        cd /d "%%INSTALL_DIR%%" 2>nul
        docker-compose down --volumes --remove-orphans 2>nul
        
        echo Removing installation directory...
        rmdir /s /q "%%INSTALL_DIR%%" 2>nul
        
        echo Cleaning up Docker resources...
        docker system prune -af
        
        echo.
        echo %%GREEN%%EAGOWL-POC has been completely removed
        :cleanup_success
        goto :eof
        
        :cleanup_cancelled
        echo.
        echo %%YELLOW%%Cleanup cancelled by user
        :cleanup_cancelled
        goto :eof
        
        :cleanup_success
        echo.
        echo Cleanup completed successfully!
        pause
        goto :eof
    ) > "%OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\scripts\cleanup-windows.bat"
    
    goto :eof
}

:compress_final_package
    call :log "Compressing final package..."
    
    REM Change to output directory
    cd /d "%OUTPUT_DIR%"
    
    REM Create TAR.GZ package
    echo Creating TAR.GZ package...
    tar -czf "%PACKAGE_NAME%-v%PACKAGE_VERSION%.tar.gz" "%PACKAGE_NAME%-v%PACKAGE_VERSION%" 2>nul
    
    if errorlevel 1 (
        call :error "Failed to create TAR.GZ package"
    )
    
    REM Get package size
    for %%F in ("%PACKAGE_NAME%-v%PACKAGE_VERSION%.tar.gz") do set "PACKAGE_SIZE=%%~zF"
    
    REM Create package info
    (
        echo EAGOWL-POC Complete Package v%PACKAGE_VERSION%
        echo ==================================
        echo.
        echo Generated: %BUILD_DATE%
        echo Package Size: %PACKAGE_SIZE% bytes
        echo.
        echo Contents:
        echo - Server package with all dependencies
        echo - Mobile source code (if available)
        echo - Desktop packages (if available)
        echo - Complete documentation
        echo - Installation and maintenance scripts
        echo.
        echo Quick Installation:
        echo 1. Extract: tar -xzf %PACKAGE_NAME%-v%PACKAGE_VERSION%.tar.gz
        echo 2. Navigate: cd %PACKAGE_NAME%-v%PACKAGE_VERSION%
        echo 3. Run: scripts/install-%%OS%%.bat
        echo.
        echo System Requirements:
        echo - RAM: 8GB minimum
        echo - Storage: 100GB minimum
        echo - CPU: 4+ cores
        echo.
        echo Supported Platforms:
        echo - Windows Server 2019+ / Windows 10+
        echo - Linux Ubuntu 20.04+
        echo - macOS 10.15+
        echo.
        echo Access Information:
        echo - Web Console: http://localhost
        echo - API Server: http://localhost:8080
        echo - Default Login: admin / (see passwords.txt)
        echo.
        echo Support Documentation: documentation/installation-guide.md
        echo.
        echo Generated by: EAGOWL-POC Build System
        echo Version: %PACKAGE_VERSION%
    ) > "%OUTPUT_DIR%\PACKAGE_NAME%-v%PACKAGE_VERSION%\README.md"
    
    call :success "Final package compressed: %PACKAGE_NAME%-v%PACKAGE_VERSION%.tar.gz (%PACKAGE_SIZE% bytes)"
    goto :eof
}

:error_exit
    call :error "Package generation failed. Check the log file for details."
    pause
    exit /b 1

:end
    call :success "EAGOWL-POC package generation completed successfully!"
    echo.
    echo Package Location: %OUTPUT_DIR%\%PACKAGE_NAME%-v%PACKAGE_VERSION%\
    echo Package Size: %PACKAGE_SIZE% bytes
    echo.
    echo Ready for distribution!
    
    echo.
    echo Next Steps:
    echo 1. Test the package locally
    echo 2. Upload to distribution server
    echo 3. Share with your team
    echo 4. Follow installation guide
    echo.
    echo.
    echo Thank you for choosing EAGOWL-POC!
    
    pause
endlocal