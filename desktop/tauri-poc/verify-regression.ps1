# Preserve existing parity artifacts while recording this sprint's results.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$evidence = Join-Path $root ('work/tauri-poc/regression-' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds())
[void][IO.Directory]::CreateDirectory($evidence)
$saved = @{}
foreach ($name in @('public-parity-verification.json','v08-parity-verification.json')) {
    $saved[$name] = [IO.File]::ReadAllBytes((Join-Path $root $name))
}
Push-Location $root
try {
    & npm test *> (Join-Path $evidence 'npm-test.log')
    $testCode = $LASTEXITCODE
    foreach ($name in $saved.Keys) { Copy-Item -LiteralPath (Join-Path $root $name) -Destination (Join-Path $evidence $name) }
    & powershell -NoProfile -ExecutionPolicy Bypass -File ./tests/build-itch.ps1 *> (Join-Path $evidence 'itch-test.log')
    $itchCode = $LASTEXITCODE
    Get-Content -Encoding UTF8 (Join-Path $evidence 'npm-test.log') | Select-Object -Last 4
    Get-Content -Encoding UTF8 (Join-Path $evidence 'itch-test.log')
    Write-Output "Evidence: $evidence; npm=$testCode; itch=$itchCode"
    if ($testCode -ne 0 -or $itchCode -ne 0) { throw 'Regression checks failed.' }
} finally {
    foreach ($name in $saved.Keys) { [IO.File]::WriteAllBytes((Join-Path $root $name), $saved[$name]) }
    Pop-Location
}
