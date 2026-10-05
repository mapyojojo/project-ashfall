# Size measurement only: this does not resolve Electron QA residuals.
param([ValidateRange(5,30)][int]$StartupTimeoutSeconds = 20)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$evidence = Join-Path $root ('work/tauri-poc/profiles-' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds())
[void][IO.Directory]::CreateDirectory($evidence)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$savedEnvironment = @{}
foreach ($variable in @('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS','WEBVIEW2_USER_DATA_FOLDER','WEBVIEW2_BROWSER_EXECUTABLE_FOLDER','ELECTRON_RUN_AS_NODE')) {
    $savedEnvironment[$variable] = [Environment]::GetEnvironmentVariable($variable, 'Process')
    [Environment]::SetEnvironmentVariable($variable, $null, 'Process')
}
$report = @{ date = [DateTimeOffset]::Now.ToString('o'); purpose = 'Both first profiles: fresh ZIP, normal title window, two seconds before native close; size only, not independent QA'; measurements = @() }
$app = $null
try {
    foreach ($candidate in @(
        @{ name = 'tauri'; folder = 'project-ashfall-v0.8.0-tauri-2.12.1-win-x64-poc'; exe = 'Ashfall-Tauri-PoC.exe' },
        @{ name = 'electron'; folder = 'project-ashfall-v0.8.0-electron-44.5.1-win-x64-poc'; exe = 'Ashfall-PoC.exe' }
    )) {
        $folder = Join-Path $evidence $candidate.name
        $report.currentCandidate = $candidate.name
        [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $root "dist/$($candidate.folder).zip"), $folder)
        $app = Start-Process -FilePath (Join-Path $folder $candidate.exe) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $evidence "$($candidate.name)-stdout.log") -RedirectStandardError (Join-Path $evidence "$($candidate.name)-stderr.log")
        $windowReady = $false
        for ($i = 0; $i -lt $StartupTimeoutSeconds * 10; $i++) {
            $app.Refresh()
            if ($app.HasExited) { throw "$($candidate.name) startup exited early: $($app.ExitCode)" }
            if ($app.MainWindowHandle -ne 0) { $windowReady = $true; break }
            Start-Sleep -Milliseconds 100
        }
        if (-not $windowReady) { throw 'Native title window did not appear' }
        Start-Sleep -Seconds 2
        $tree = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'native-check.ps1') -Action tree -TargetId $app.Id | ConvertFrom-Json
        $treeIds = @($tree | ForEach-Object { [int]$_.ProcessId })
        $report.lastProcessTree = $tree
        if ($app.Id -notin $treeIds -or $PID -in $treeIds -or 0 -in $treeIds) { throw 'Invalid app process tree' }
        if (-not $app.CloseMainWindow()) { throw 'Native close failed' }
        if (-not $app.WaitForExit(10000)) { throw 'Native close did not terminate process' }
        $alive = @()
        for ($i = 0; $i -lt 100; $i++) {
            $alive = @(Get-Process -Id $treeIds -ErrorAction SilentlyContinue)
            if ($alive.Count -eq 0) { break }
            Start-Sleep -Milliseconds 100
        }
        if ($alive.Count -gt 0) { $report.survivingProcesses = @($alive | Select-Object Id,ProcessName); throw 'Measured profile may still be in use' }
        $entries = @(Get-ChildItem -LiteralPath (Join-Path $folder 'data') -File -Recurse)
        $bytes = ($entries | Measure-Object Length -Sum).Sum
        $measurement = @{ name = $candidate.name; bytes = $bytes; MiB = $bytes / 1MB; files = $entries.Count; zipSha256 = (Get-FileHash -LiteralPath (Join-Path $root "dist/$($candidate.folder).zip")).Hash }
        $report.measurements += $measurement
        Write-Output "$($candidate.name): $bytes bytes, $($measurement.MiB) MiB"
        $app = $null
    }
    $report.result = 'PASS'
} catch {
    $report.result = 'FAIL'; $report.failure = $_.Exception.Message
    throw
} finally {
    if ($app -and -not $app.HasExited) { & taskkill.exe /PID $app.Id /T /F | Out-Null }
    foreach ($variable in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($variable, $savedEnvironment[$variable], 'Process') }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 (Join-Path $evidence 'measurements.json')
    Write-Output "Evidence: $evidence"
}
