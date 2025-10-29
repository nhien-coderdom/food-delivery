# Simple Strapi Check Script
Write-Host "Checking Strapi Backend..." -ForegroundColor Cyan

# Check if port 1337 is in use
$port = netstat -ano | Select-String ":1337"
if ($port) {
    Write-Host "OK: Strapi is running on port 1337" -ForegroundColor Green
} else {
    Write-Host "ERROR: Strapi is NOT running!" -ForegroundColor Red
    Write-Host "Start it with: cd backend ; npm run develop" -ForegroundColor Yellow
    exit
}

# Test API
Write-Host "`nTesting API endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:1337/api/restaurants?populate=image" -UseBasicParsing
    Write-Host "OK: API is working" -ForegroundColor Green
    
    $data = $response.Content | ConvertFrom-Json
    $count = $data.data.Count
    Write-Host "Found $count restaurants" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Cannot connect to API" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host "`nDone!" -ForegroundColor Cyan
