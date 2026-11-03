# Empêche la mise en veille tant que le pipeline (run-all.sh ou alloschool download) tourne. Ne change aucun réglage.
# Lancer : powershell -NoProfile -ExecutionPolicy Bypass -File keep-awake.ps1
Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$ES_CONTINUOUS = [uint32]0x80000000; $ES_SYSTEM_REQUIRED = [uint32]0x00000001
while ($true) {
  $busy = @(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'run-all\.sh|reformulate\.mjs|alloschool\.mjs download|labs\.mjs|qcm\.mjs' }).Count
  if ($busy -gt 0) { [void][Win32.Power]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED) }
  else { [void][Win32.Power]::SetThreadExecutionState($ES_CONTINUOUS); break }
  Start-Sleep -Seconds 120
}
