# Rebuild the candidate from a fresh archived baseline plus explicit source overlay.
# This is not a committed clean checkout: the candidate remains uncommitted.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$evidence = Join-Path $root ('work/tauri-poc/rebuild-' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds())
$snapshot = Join-Path $evidence 'source'
[void][IO.Directory]::CreateDirectory($evidence)
& git -c "safe.directory=$($root.Replace('\','/'))" archive -o (Join-Path $evidence 'baseline.zip') 5f2a59ae4257c300c58a021380a880d3cce9f069
if ($LASTEXITCODE -ne 0) { throw 'Baseline archive failed' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $evidence 'baseline.zip'), $snapshot)
$runtime = @('index.html','style.css','version.js','storage.js','i18n/ja.js','i18n/en.js','i18n.js','upgrades.js','relics.js','audio.js','ui.js','input.js','game.js')
$candidateFiles = @(& git -c "safe.directory=$($root.Replace('\','/'))" ls-files --cached --others --exclude-standard desktop/tauri-poc)
if ($candidateFiles.Count -eq 0) { throw 'No PoC source overlay found' }
$hashes = @()
foreach ($file in @($runtime) + @($candidateFiles)) {
    $sourceFile = Join-Path $root $file
    $destinationFile = Join-Path $snapshot $file
    [void][IO.Directory]::CreateDirectory((Split-Path -Parent $destinationFile))
    Copy-Item -LiteralPath $sourceFile -Destination $destinationFile
    $hash = (Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash
    if ($hash -ne (Get-FileHash -LiteralPath $destinationFile -Algorithm SHA256).Hash) { throw "Snapshot mismatch: $file" }
    $hashes += @{ path = $file; sha256 = $hash }
}
$hashes | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 (Join-Path $evidence 'source-hashes.json')
$oldCargoHome = $env:CARGO_HOME
$oldOffline = $env:CARGO_NET_OFFLINE
try {
    $env:CARGO_HOME = Join-Path $root 'work/tauri-poc/cargo-home'
    $env:CARGO_NET_OFFLINE = 'true'
    & npm ci --offline --ignore-scripts --prefix (Join-Path $snapshot 'desktop/tauri-poc') --cache (Join-Path $root 'work/tauri-poc/npm-cache')
    if ($LASTEXITCODE -ne 0) { throw 'Offline npm ci failed' }
    & node (Join-Path $snapshot 'desktop/tauri-poc/build.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Fresh-source build failed' }
    Write-Output "Rebuild evidence: $evidence"
} finally {
    $env:CARGO_HOME = $oldCargoHome
    $env:CARGO_NET_OFFLINE = $oldOffline
}
