$ports = 3000, 4000

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

  foreach ($connection in $connections) {
    try {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
      Write-Host "Processo na porta $port finalizado."
    } catch {
      Write-Host "Nao foi possivel finalizar o processo na porta $port."
    }
  }
}
