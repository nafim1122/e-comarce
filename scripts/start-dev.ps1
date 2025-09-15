Param(
  [int]$FrontPort = 5173,
  [int]$ApiPort = 5000,
  [int]$Retries = 30,
  [int]$DelaySec = 1
)

function Wait-ForUrl {
  param($url, $retries, $delay)
  for ($i = 0; $i -lt $retries; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      return $true
    } catch {
      Start-Sleep -Seconds $delay
    }
  }
  return $false
}

Write-Output "Starting dev servers (frontend -> 127.0.0.1:$FrontPort, backend -> 127.0.0.1:$ApiPort)"

# Start frontend (Vite) in repo root
$front = Start-Process -FilePath npm -ArgumentList 'run','dev','--','--host','127.0.0.1','--port',$FrontPort -WorkingDirectory (Get-Location) -NoNewWindow -PassThru
Write-Output "Started frontend (pid=$($front.Id))"

# Start backend in ./server
$serverProc = Start-Process -FilePath npm -ArgumentList 'run','dev' -WorkingDirectory (Join-Path (Get-Location) 'server') -NoNewWindow -PassThru
Write-Output "Started backend (pid=$($serverProc.Id))"

Write-Output "Waiting for frontend to respond..."
if (-not (Wait-ForUrl "http://127.0.0.1:$FrontPort/" $Retries $DelaySec)) {
  Write-Error "Frontend did not become ready after $Retries attempts"
  exit 2
}
Write-Output "Frontend ready"

Write-Output "Waiting for backend to respond..."
if (-not (Wait-ForUrl "http://127.0.0.1:$ApiPort/api/health" $Retries $DelaySec)) {
  Write-Error "Backend did not become ready after $Retries attempts"
  exit 3
}
Write-Output "Backend ready"

Write-Output "Dev servers started and healthy. Frontend: http://127.0.0.1:$FrontPort, Backend: http://127.0.0.1:$ApiPort"

exit 0
