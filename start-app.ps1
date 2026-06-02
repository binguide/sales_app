$serverJob = Start-Job -ScriptBlock {
  Set-Location "C:\Users\Ghamdan\Documents\sales-app\server"
  node index.js
}
$clientJob = Start-Job -ScriptBlock {
  Set-Location "C:\Users\Ghamdan\Documents\sales-app\client"
  npx.cmd vite --host
}
Write-Host "Server PID: $($serverJob.Id)"
Write-Host "Client PID: $($clientJob.Id)"
Write-Host "Waiting..."
$serverJob | Wait-Job
