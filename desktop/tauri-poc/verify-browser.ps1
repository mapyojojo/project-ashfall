#Requires -Version 5.1
# Run existing UI/i18n assertions in a snapshot, preserving repository sources and old evidence.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$checkRoot = Join-Path $root ('work/tauri-poc/browser-' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds())
$snapshot = Join-Path $checkRoot 'source'
$profile = Join-Path $checkRoot 'edge-profile'
$edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$nodePath = (& node -p process.execPath).Trim()
foreach ($port in @(4173, 9226)) {
    $probe = [Net.Sockets.TcpClient]::new()
    try { $probe.Connect('127.0.0.1', $port); throw "Port $port is already occupied; preserve the existing process." }
    catch [Net.Sockets.SocketException] {} finally { $probe.Dispose() }
}
[void][IO.Directory]::CreateDirectory((Join-Path $snapshot 'docs/screenshots'))
$files = @('index.html','style.css','version.js','storage.js','i18n/ja.js','i18n/en.js','i18n.js','upgrades.js','relics.js','audio.js','ui.js','input.js','game.js','server.js')
foreach ($file in $files) {
    $destination = Join-Path $snapshot $file
    [void][IO.Directory]::CreateDirectory((Split-Path -Parent $destination))
    Copy-Item -LiteralPath (Join-Path $root $file) -Destination $destination
}
Copy-Item -LiteralPath (Join-Path $root 'tests') -Destination (Join-Path $snapshot 'tests') -Recurse
# This machine exceeded the original 150-400ms navigation/fullscreen waits. Change only
# those waits in ignored copies; leave repository tests and all assertions intact.
foreach ($test in @('public-browser.cjs','i18n-browser.cjs')) {
    $testPath = Join-Path $snapshot "tests/$test"
    $text = [IO.File]::ReadAllText($testPath)
    foreach ($milliseconds in @(150,300,350,400)) {
        $text = $text.Replace("await wait($milliseconds);", 'await wait(1500);')
    }
    [IO.File]::WriteAllText($testPath, $text, [Text.UTF8Encoding]::new($false))
}
$server = $null
$edge = $null
$oldPort = $env:ASHFALL_CDP_PORT
try {
    $server = Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $snapshot 'server.js') + '"') -WorkingDirectory $snapshot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $checkRoot 'server.log') -RedirectStandardError (Join-Path $checkRoot 'server-error.log')
    $edge = Start-Process -FilePath $edgePath -WindowStyle Hidden -PassThru -ArgumentList '--headless=new','--disable-gpu','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--remote-debugging-port=9226',"--user-data-dir=$profile",'--no-first-run','http://localhost:4173/?test'
    $env:ASHFALL_CDP_PORT = '9226'
    $ready = $false
    for ($attempt = 0; $attempt -lt 100; $attempt++) {
        try {
            $targets = Invoke-RestMethod 'http://127.0.0.1:9226/json'
            if ($targets | Where-Object { $_.type -eq 'page' -and $_.url.StartsWith('http://localhost:4173/') }) { $ready = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 100
    }
    if (-not $ready) { throw 'Dedicated Edge target did not appear.' }
    Start-Sleep -Milliseconds 500
    foreach ($test in @('public-browser.cjs','i18n-browser.cjs')) {
        $ErrorActionPreference = 'Continue'
        & node (Join-Path $snapshot "tests/$test") *> (Join-Path $checkRoot "$test.log")
        $code = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        Get-Content -Encoding UTF8 (Join-Path $checkRoot "$test.log")
        if ($code -ne 0) { throw "Existing browser test failed: $test (exit $code)" }
    }
    Write-Output "Evidence: $checkRoot"
} finally {
    $env:ASHFALL_CDP_PORT = $oldPort
    if ($edge -and -not $edge.HasExited) { Stop-Process -Id $edge.Id }
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id }
}
