$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email='admin@example.com'; password='admin123' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/login' -Method Post -Body $body -ContentType 'application/json' -WebSession $session -TimeoutSec 10
  Write-Output "LOGIN_OK: $($login | ConvertTo-Json -Depth 5)"
} catch {
  Write-Output "LOGIN_FAILED: $($_.Exception.Message)"
}
try {
  $me = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/me' -WebSession $session -TimeoutSec 10
  Write-Output "ME_OK: $($me | ConvertTo-Json -Depth 5)"
} catch {
  Write-Output "ME_FAILED: $($_.Exception.Message)"
}
