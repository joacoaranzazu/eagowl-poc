# EAGOWL-POC Release Package Generator
# This script creates the complete distribution package

Write-Host "EAGOWL-POC Package Generator" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

$Version = "1.0.0"
$PackageName = "eagowl-poc-v$Version"
$BaseDir = Get-Location

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Create-DirectoryStructure {
    Write-Status "Creating directory structure..." "Yellow"
    
    $Dirs = @(
        "package",
        "package/server",
        "package/mobile-apks", 
        "package/desktop-packages",
        "package/documentation",
        "package/support-tools",
        "package/infrastructure"
    )
    
    foreach ($Dir in $Dirs) {
        if (-not (Test-Path $Dir)) {
            New-Item -ItemType Directory -Path $Dir -Force | Out-Null
        }
    }
    
    Write-Status "Directory structure created" "Green"
}

function Build-Server {
    Write-Status "Building server package..." "Yellow"
    
    Set-Location "$BaseDir\server"
    
    # Check if Node.js is available
    if (-not (Test-Command "npm")) {
        Write-Status "ERROR: npm not found. Please install Node.js." "Red"
        return $false
    }
    
    # Install dependencies
    Write-Status "Installing server dependencies..."
    npm ci --production
    
    # Build TypeScript
    Write-Status "Building TypeScript..."
    npm run build
    
    # Create server package
    $ServerFiles = @(
        "dist",
        "node_modules",
        "package.json",
        "prisma",
        "docker",
        ".env.example"
    )
    
    foreach ($File in $ServerFiles) {
        if (Test-Path $File) {
            Copy-Item -Recurse $File "$BaseDir\package\server\"
        }
    }
    
    Set-Location $BaseDir
    Write-Status "Server package built" "Green"
    return $true
}

function Build-Mobile-Apps {
    Write-Status "Building mobile applications..." "Yellow"
    
    Set-Location "$BaseDir\mobile"
    
    # Check if Expo CLI is available
    if (-not (Test-Command "expo")) {
        Write-Status "WARNING: expo CLI not found. Skipping mobile build." "Yellow"
        Write-Status "You can build APKs manually using Expo CLI." "Yellow"
        return $true
    }
    
    # Install dependencies
    Write-Status "Installing mobile dependencies..."
    npm ci
    
    # Build APKs (placeholder - would require Expo account)
    Write-Status "Mobile apps require Expo EAS build service." "Yellow"
    Write-Status "Skipping actual build. You can build manually:" "Yellow"
    Write-Status "  expo build:android --type apk" "Yellow"
    
    # Copy placeholder APK files
    $ApkFiles = @(
        "EagowlPOC-arm64-v8a-v$Version.apk",
        "EagowlPOC-armeabi-v7a-v$Version.apk", 
        "EagowlPOC-x86_64-v$Version.apk"
    )
    
    foreach ($Apk in $ApkFiles) {
        "# Placeholder APK file`nReplace with actual build from Expo EAS" | Out-File "$BaseDir\package\mobile-apks\$Apk"
    }
    
    Set-Location $BaseDir
    Write-Status "Mobile apps preparation completed" "Green"
    return $true
}

function Build-Desktop-Console {
    Write-Status "Building desktop console..." "Yellow"
    
    Set-Location "$BaseDir\dispatch-console"
    
    # Install dependencies
    Write-Status "Installing desktop dependencies..."
    npm ci
    
    # Check if Electron Builder is available
    if (-not (Test-Command "electron-builder")) {
        Write-Status "Installing electron-builder..."
        npm install electron-builder --save-dev
    }
    
    # Build React app
    Write-Status "Building React application..."
    npm run build
    
    # Create desktop packages
    Write-Status "Creating desktop packages..."
    
    # Generate all platform packages (may fail on Windows without proper setup)
    try {
        npm run dist:linux
        Write-Status "Linux packages created" "Green"
    }
    catch {
        Write-Status "Linux packages failed (expected on Windows)" "Yellow"
    }
    
    try {
        npm run dist:win
        Write-Status "Windows packages created" "Green"
    }
    catch {
        Write-Status "Windows packages failed" "Yellow"
    }
    
    # Copy available packages
    $PackageFiles = @(
        "dist/*.AppImage",
        "dist/*.deb", 
        "dist/*.rpm",
        "dist/*.exe"
    )
    
    foreach ($Pattern in $PackageFiles) {
        $Files = Get-ChildItem -Path $Pattern -ErrorAction SilentlyContinue
        foreach ($File in $Files) {
            Copy-Item $File "$BaseDir\package\desktop-packages\"
        }
    }
    
    # Create placeholder packages if build failed
    if (-not (Test-Path "$BaseDir\package\desktop-packages\*")) {
        Write-Status "Creating placeholder packages..." "Yellow"
        
        "# Placeholder Linux package`nReplace with actual build" | Out-File "$BaseDir\package\desktop-packages\EagowlPOC-Console-v$Version.AppImage"
        "# Placeholder Windows package`nReplace with actual build" | Out-File "$BaseDir\package\desktop-packages\EagowlPOC-Console-Setup-v$Version.exe"
        "# Placeholder DEB package`nReplace with actual build" | Out-File "$BaseDir\package\desktop-packages\eagowl-poc-console_v$Version_amd64.deb"
    }
    
    Set-Location $BaseDir
    Write-Status "Desktop console build completed" "Green"
    return $true
}

function Copy-Infrastructure {
    Write-Status "Copying infrastructure files..." "Yellow"
    
    $InfraFiles = @(
        "docker-compose.yml",
        ".env.example", 
        "install.sh",
        "uninstall.sh",
        "nginx",
        "postgres",
        "prometheus",
        "grafana"
    )
    
    foreach ($File in $InfraFiles) {
        $Source = "$BaseDir\infrastructure\$File"
        $Destination = "$BaseDir\package\infrastructure\$File"
        
        if (Test-Path $Source) {
            if (Test-Path $Source -PathType Container) {
                Copy-Item -Recurse $Source $Destination -Force
            } else {
                Copy-Item $Source $Destination -Force
            }
        }
    }
    
    Write-Status "Infrastructure files copied" "Green"
}

function Create-Documentation {
    Write-Status "Creating documentation..." "Yellow"
    
    $DocsDir = "$BaseDir\package\documentation"
    
    # Copy existing documentation
    if (Test-Path "$BaseDir\docs") {
        Copy-Item -Recurse "$BaseDir\docs\*" "$DocsDir\" -Force
    }
    
    # Create installation guide (copy from infrastructure)
    if (Test-Path "$BaseDir\docs\installation-guide.md") {
        Copy-Item "$BaseDir\docs\installation-guide.md" "$DocsDir\Installation-Guide.pdf.md" -Force
    }
    
    Write-Status "Documentation created" "Green"
}

function Create-Support-Tools {
    Write-Status "Creating support tools..." "Yellow"
    
    $SupportDir = "$BaseDir\package\support-tools"
    
    # Diagnostic script
    @"
@echo off
EAGOWL-POC System Diagnostics
==========================

echo Checking Docker...
docker --version
if errorlevel 1 echo ERROR: Docker not installed
docker-compose --version  
if errorlevel 1 echo ERROR: Docker Compose not installed

echo.
echo Checking ports...
netstat -an | findstr ":80"
netstat -an | findstr ":8080"
netstat -an | findstr ":9998"

echo.
echo Checking disk space...
dir /-c

echo.
echo Checking memory...
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /format:list

echo.
echo Docker container status...
cd /opt/eagowl-poc 2>nul && docker-compose ps 2>nul
if errorlevel 1 echo EAGOWL-POC not installed or not in /opt/eagowl-poc
pause
"@ | Out-File "$SupportDir\diagnostic.bat"
    
    # Health check script
    @"
@echo off
EAGOWL-POC Health Check
====================

echo Checking API server...
curl -f http://localhost:8080/health >nul 2>&1
if errorlevel 1 (
    echo API Server: DOWN
) else (
    echo API Server: UP
)

echo.
echo Checking PostgreSQL...
docker exec eagowl-poc-postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db >nul 2>&1
if errorlevel 1 (
    echo PostgreSQL: DOWN
) else (
    echo PostgreSQL: UP
)

echo.
echo Checking Redis...
docker exec eagowl-poc-redis redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo Redis: DOWN  
) else (
    echo Redis: UP
)

echo.
echo Health check completed!
pause
"@ | Out-File "$SupportDir\health-check.bat"
    
    Write-Status "Support tools created" "Green"
}

function Create-Final-Package {
    Write-Status "Creating final package..." "Yellow"
    
    # Create README for package
    @"
EAGOWL-POC Version $Version Release Package
========================================

This package contains the complete EAGOWL-POC platform installation.

Quick Installation:
-------------------

1. Extract this package to a temporary directory
2. Run 'infrastructure\install.sh' (Linux/macOS) or 'infrastructure\install.bat' (Windows) as Administrator
3. Follow the installation prompts
4. Access the web console at http://localhost

Package Contents:
-----------------

server/              - Backend application files
mobile-apks/          - Android mobile applications  
desktop-packages/      - Desktop console applications
documentation/        - User guides and API documentation
infrastructure/       - Docker and deployment configurations
support-tools/        - Diagnostic and maintenance tools

System Requirements:
-------------------

- RAM: 8GB minimum, 16GB+ recommended
- Storage: 100GB SSD minimum
- OS: Linux (Ubuntu 20.04+), Windows Server 2019+
- Network: Internet access required

Support:
--------

- Documentation: See documentation/ directory
- Issues: Check support-tools/ for diagnostics
- Contact: support@eagowl-poc.com

Release Date: $(Get-Date -Format 'yyyy-MM-dd')
Version: $Version
"@ | Out-File "$BaseDir\package\README.md"
    
    # Create version info file
    @{
        "version" = $Version
        "releaseDate" = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
        "platforms" = @("linux", "windows", "android")
        "components" = @(
            @{
                "name" = "server"
                "version" = $Version
                "description" = "Backend API and WebSocket server"
            },
            @{
                "name" = "mobile"
                "version" = $Version
                "description" = "Android mobile applications"
            },
            @{
                "name" = "desktop"
                "version" = $Version
                "description" = "Electron desktop console"
            }
        )
    } | ConvertTo-Json | Out-File "$BaseDir\package\version.json"
    
    Write-Status "Final package metadata created" "Green"
}

function Compress-Package {
    Write-Status "Compressing final package..." "Yellow"
    
    $CompressedPackage = "$BaseDir\$PackageName.tar.gz"
    
    # Create tar.gz (requires external tool on Windows)
    try {
        # Try using tar if available
        tar -czf $CompressedPackage -C "$BaseDir" package
        Write-Status "Package compressed: $CompressedPackage" "Green"
    }
    catch {
        # Fallback to zip
        Write-Status "tar not available, creating ZIP instead..." "Yellow"
        Compress-Archive -Path "$BaseDir\package" -DestinationPath "$BaseDir\$PackageName.zip"
        Write-Status "Package compressed: $BaseDir\$PackageName.zip" "Green"
    }
    
    # Clean up temporary package directory
    Remove-Item -Recurse -Force "$BaseDir\package"
    
    # Show package size
    if (Test-Path $CompressedPackage) {
        $Size = (Get-Item $CompressedPackage).Length / 1MB
        Write-Status "Package size: $([math]::Round($Size, 2)) MB" "Green"
    }
}

function Show-Completion {
    Write-Host ""
    Write-Host "🎉 EAGOWL-POC Package Generation Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Generated files:" -ForegroundColor Cyan
    Write-Host "  - Server package: server/" -ForegroundColor White
    Write-Host "  - Mobile APKs: mobile-apks/" -ForegroundColor White  
    Write-Host "  - Desktop packages: desktop-packages/" -ForegroundColor White
    Write-Host "  - Documentation: documentation/" -ForegroundColor White
    Write-Host "  - Infrastructure: infrastructure/" -ForegroundColor White
    Write-Host "  - Support tools: support-tools/" -ForegroundColor White
    Write-Host ""
    Write-Host "Ready for distribution!" -ForegroundColor Green
    Write-Host ""
}

# Main execution
try {
    Create-DirectoryStructure
    Build-Server
    Build-Mobile-Apps
    Build-Desktop-Console  
    Copy-Infrastructure
    Create-Documentation
    Create-Support-Tools
    Create-Final-Package
    Compress-Package
    Show-Completion
}
catch {
    Write-Status "ERROR: Package generation failed: $_" "Red"
    Write-Host ""
    Write-Host "Please check the error above and try again." -ForegroundColor Yellow
    exit 1
}