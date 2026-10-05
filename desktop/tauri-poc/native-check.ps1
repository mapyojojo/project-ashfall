param(
    [ValidateSet('close','tree','alive','window')][string]$Action,
    [int]$TargetId,
    [string]$ProcessIds
)
$ErrorActionPreference = 'Stop'
if ($Action -eq 'window') {
    $targetProcess = Get-Process -Id $TargetId -ErrorAction Stop
    ConvertTo-Json -InputObject @{ title = $targetProcess.MainWindowTitle; handle = $targetProcess.MainWindowHandle.ToInt64() } -Compress
} elseif ($Action -eq 'close') {
    $targetProcess = Get-Process -Id $TargetId -ErrorAction Stop
    if (-not $targetProcess.CloseMainWindow()) { throw 'Native window close failed.' }
} elseif ($Action -eq 'tree') {
    $rows = @(Get-CimInstance Win32_Process)
    $selected = @($TargetId)
    do {
        $previous = $selected.Count
        $selected += @($rows | Where-Object { $_.ParentProcessId -in $selected -and $_.ProcessId -notin $selected } | ForEach-Object { [int]$_.ProcessId })
    } while ($selected.Count -gt $previous)
    ConvertTo-Json -InputObject @($rows | Where-Object { $_.ProcessId -in $selected } | Select-Object ProcessId,ParentProcessId,Name) -Compress
} else {
    $ids = @($ProcessIds.Split(',') | ForEach-Object { [int]$_ })
    ConvertTo-Json -InputObject @(Get-Process -Id $ids -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.Id }) -Compress
}
