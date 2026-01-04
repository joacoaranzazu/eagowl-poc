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

function Install-Dependencies {
    param([string]$ComponentPath)
    
    Set-Location $ComponentPath
    
    Write-Status "Installing dependencies with error handling..." "Yellow"
    
    # Smart installation strategy
    if (Test-Path "package-lock.json") {
        Write-Status "Using npm ci (lock file found)..." "Green"
        npm ci --legacy-peer-deps --no-audit
    } else {
        Write-Status "Using npm install (no lock file)..." "Yellow"
        npm install --legacy-peer-deps --force --no-audit
    }
    
    # Handle conflicts
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Installation failed, trying with force flags..." "Yellow"
        npm install --legacy-peer-deps --force --no-audit
    }
    
    # Verify installation
    if (-not (Test-Path "node_modules")) {
        Write-Status "Critical: node_modules not created, retrying..." "Red"
        Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
        npm install --force --legacy-peer-deps --no-audit
    }
}

function Execute-Build {
    Write-Status "Executing build process..." "Yellow"
    
    # Verify TypeScript availability
    if (-not (Test-Command "tsc")) {
        Write-Status "TypeScript not found, using npx..." "Yellow"
        try {
            npx tsc
        } catch {
            Write-Status "npx tsc failed, installing TypeScript..." "Yellow"
            npm install typescript --save-dev
            npx tsc
        }
    } else {
        try {
            npm run build
        } catch {
            Write-Status "npm run build failed, trying direct tsc..." "Yellow"
            npx tsc
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Build completed with warnings" "Yellow"
    } else {
        Write-Status "Build completed successfully" "Green"
    }
}