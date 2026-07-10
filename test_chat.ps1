# Quick test script for SP4 Core Agent chat
# Usage: .\test_chat.ps1 "Your message here"

param(
    [string]$Message = "Ahoj SP4"
)

$body = @{
    message = $Message
    mode = "core"
    context = @{
        source = "test"
        userName = "Tester"
    }
} | ConvertTo-Json -Depth 3

Write-Host "`n💬 POSIELAM: " -ForegroundColor Yellow -NoNewline
Write-Host $Message -ForegroundColor Cyan
Write-Host "⏳ Čakám na SP4..." -ForegroundColor DarkGray
Write-Host ""

try {
    $response = Invoke-RestMethod -Method POST -Uri 'http://localhost:3001/api/chat' -ContentType 'application/json' -Body $body -TimeoutSec 120
    
    Write-Host "✅ SP4 ODPOVEĎ:" -ForegroundColor Green
    Write-Host $response.reply
    Write-Host ""
    Write-Host "📊 Dĺžka: $($response.reply.Length) znakov" -ForegroundColor DarkGray
} catch {
    Write-Host "❌ ERROR: $_" -ForegroundColor Red
}
