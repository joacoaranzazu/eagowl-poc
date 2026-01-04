# Script de prueba para API EAGOWL-POC
# Uso: .\test-api.ps1

Write-Host "🔍 Probando API EAGOWL-POC..." -ForegroundColor Green

try {
    # Test Health Endpoint
    Write-Host "`n📡 Probando Health Endpoint..." -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
    Write-Host "✅ Health: $($health.status)" -ForegroundColor Green
    
    # Test API Endpoint  
    Write-Host "`n📊 Probando API Endpoint..." -ForegroundColor Yellow
    $api = Invoke-RestMethod -Uri "http://localhost:8080/api/test" -Method GET
    Write-Host "✅ API: $($api.message)" -ForegroundColor Green
    Write-Host "📊 Base de Datos Conectada: $($api.database.connected)" -ForegroundColor Cyan
    Write-Host "👥 Usuarios: $($api.database.users)" -ForegroundColor Cyan
    Write-Host "👥 Grupos: $($api.database.groups)" -ForegroundColor Cyan
    
    Write-Host "`n🎉 TODAS LAS PRUEBAS PASARON!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "🔧 Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "1. Verificar que los contenedores Docker estén corriendo" -ForegroundColor White
    Write-Host "2. Ejecutar: cd infrastructure && docker-compose ps" -ForegroundColor White
    Write-Host "3. Reiniciar contenedor: docker restart eagowl-poc-api" -ForegroundColor White
}