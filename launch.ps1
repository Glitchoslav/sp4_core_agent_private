# LEGACY launcher.
# This menu targets removed historical entrypoints and is not part of the default runtime workflow.
# Keep only as archive-grade reference until it is moved out of the main runtime surface.

# SP4 v2.0 - Full Autonomy Launcher (PowerShell)

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   SP4 v2.0 - Full Autonomy Launcher" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[1] 🎯 Live Mission Test (RECOMMENDED)" -ForegroundColor Green
    Write-Host "[2] 🌐 Production Server" -ForegroundColor Yellow
    Write-Host "[3] 🎨 Demo Server" -ForegroundColor Yellow
    Write-Host "[4] 🧪 Test Planner" -ForegroundColor Blue
    Write-Host "[5] ⚡ Test Full Autonomy" -ForegroundColor Blue
    Write-Host "[6] 🚪 Exit" -ForegroundColor Red
    Write-Host ""
}

function Start-LiveMissionTest {
    Write-Host "`n🚀 Starting Live Mission Test...`n" -ForegroundColor Green
    node test_live_mission.js
    Write-Host "`nPress any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Start-ProductionServer {
    Write-Host "`n🌐 Starting Production Server...`n" -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server_production.js"
    Write-Host "✅ Server starting in new window..." -ForegroundColor Green
    Start-Sleep -Seconds 2
}

function Start-DemoServer {
    Write-Host "`n🎨 Starting Demo Server...`n" -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server_demo.js"
    Write-Host "✅ Server starting in new window..." -ForegroundColor Green
    Start-Sleep -Seconds 2
}

function Test-Planner {
    Write-Host "`n🧪 Testing Mission Planner...`n" -ForegroundColor Blue
    node test_planner.js
    Write-Host "`nPress any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Test-FullAutonomy {
    Write-Host "`n⚡ Testing Full Autonomy...`n" -ForegroundColor Blue
    node test_full_autonomy.js
    Write-Host "`nPress any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Vyber moznost (1-6)"
    
    switch ($choice) {
        "1" { Start-LiveMissionTest }
        "2" { Start-ProductionServer }
        "3" { Start-DemoServer }
        "4" { Test-Planner }
        "5" { Test-FullAutonomy }
        "6" { 
            Write-Host "`n👋 Bye!`n" -ForegroundColor Cyan
            break 
        }
        default { 
            Write-Host "`n❌ Neplatna volba!`n" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} while ($choice -ne "6")
