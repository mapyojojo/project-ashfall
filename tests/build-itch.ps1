#Requires -Version 5.1
# Packaging regression only; no game simulation or Node.js dependency.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$buildScript = Join-Path $projectRoot 'scripts/build-itch.ps1'
$fixtureRoot = Join-Path $projectRoot ('work/itch-build-test-' + [Guid]::NewGuid().ToString('N'))
$expected = @('index.html','style.css','version.js','storage.js','i18n/ja.js','i18n/en.js','i18n.js','upgrades.js','relics.js','audio.js','ui.js','input.js','debug-ui.js','game.js')
$version = [regex]::Match([IO.File]::ReadAllText((Join-Path $projectRoot 'version.js')), 'version\s*:\s*[''"]([^''"]+)[''"]').Groups[1].Value
$passed = 0

function Assert-That($Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}
function Invoke-Build([string]$Script, [string]$WorkingDirectory) {
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = (Get-Process -Id $PID).Path
    $info.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $Script + '"'
    $info.WorkingDirectory = $WorkingDirectory
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = [Diagnostics.Process]::Start($info)
    try {
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        return @{ ExitCode = $process.ExitCode; Output = $stdout.Result + $stderr.Result }
    } finally { $process.Dispose() }
}
function Assert-Archive([string]$Zip, [string]$SourceRoot, [string[]]$Files) {
    $archive = [IO.Compression.ZipFile]::OpenRead($Zip)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName } | Sort-Object)
        Assert-That (($names -join '|') -eq (($Files | Sort-Object) -join '|')) "Unexpected archive entries: $($names -join ', ')"
        Assert-That ($null -ne $archive.GetEntry('index.html')) 'index.html is not at the ZIP root.'
        foreach ($entry in $archive.Entries) {
            $stream = $entry.Open()
            $hash = [Security.Cryptography.SHA256]::Create()
            try { $actual = [BitConverter]::ToString($hash.ComputeHash($stream)).Replace('-', '') }
            finally { $hash.Dispose(); $stream.Dispose() }
            $original = (Get-FileHash -LiteralPath (Join-Path $SourceRoot $entry.FullName) -Algorithm SHA256).Hash
            Assert-That ($actual -eq $original) "Changed archive content: $($entry.FullName)"
        }
    } finally { $archive.Dispose() }
}
function Pass([string]$Name) { $script:passed++; Write-Host "PASS $Name" }

try {
    [void][IO.Directory]::CreateDirectory($fixtureRoot)
    $result = Invoke-Build $buildScript $projectRoot
    Assert-That ($result.ExitCode -eq 0) $result.Output
    $zip = Join-Path $projectRoot "dist/project-ashfall-v$version-itch.zip"
    Assert-Archive $zip $projectRoot $expected
    Pass 'current version, exact 14 runtime files, root entry, content hashes and no development files'

    # Exercise an existing output and independence from the caller's working directory.
    $result = Invoke-Build $buildScript $fixtureRoot
    Assert-That ($result.ExitCode -eq 0) $result.Output
    Assert-Archive $zip $projectRoot $expected
    Assert-That (-not (Test-Path -LiteralPath (Join-Path $fixtureRoot 'dist'))) 'Output followed the caller working directory.'
    Pass 'existing output is replaced and paths follow the script location'

    foreach ($file in (@($expected) + 'scripts/build-itch.ps1')) {
        $destination = Join-Path $fixtureRoot $file
        [void][IO.Directory]::CreateDirectory((Split-Path -Parent $destination))
        [IO.File]::Copy((Join-Path $projectRoot $file), $destination)
    }
    $fixtureVersion = '9.8.7-test.1'
    $versionFile = Join-Path $fixtureRoot 'version.js'
    [IO.File]::WriteAllText($versionFile, [IO.File]::ReadAllText($versionFile).Replace("version: '$version'", "version: '$fixtureVersion'"))
    foreach ($file in @('docs/review.txt','tests/dev.ps1','work/scratch.txt','node_modules/dev.js','verification.json','server.js','README.md')) {
        $destination = Join-Path $fixtureRoot $file
        [void][IO.Directory]::CreateDirectory((Split-Path -Parent $destination))
        [IO.File]::WriteAllText($destination, 'not a runtime dependency')
    }
    [void][IO.Directory]::CreateDirectory((Join-Path $fixtureRoot 'assets/textures'))
    [IO.File]::WriteAllText((Join-Path $fixtureRoot 'assets/extra.js'), '// Additional referenced runtime file.')
    [IO.File]::WriteAllText((Join-Path $fixtureRoot 'assets/theme.css'), '@import "../style.css"; body { background: url("textures/test%20sprite.svg"); }')
    [IO.File]::WriteAllText((Join-Path $fixtureRoot 'assets/textures/test sprite.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    $htmlFile = Join-Path $fixtureRoot 'index.html'
    [IO.File]::WriteAllText($htmlFile, [IO.File]::ReadAllText($htmlFile).Replace('</body>', '<script src="assets/extra.js?v=2&amp;mode=test"></script><a href="docs/review.txt">Documentation</a><!-- <script src="server.js"></script> --></body>'))
    $cssFile = Join-Path $fixtureRoot 'style.css'
    [IO.File]::AppendAllText($cssFile, "`n" + '@import "assets/theme.css"; /* url("work/scratch.txt") */')
    $fixtureScript = Join-Path $fixtureRoot 'scripts/build-itch.ps1'
    $result = Invoke-Build $fixtureScript $projectRoot
    Assert-That ($result.ExitCode -eq 0) $result.Output
    $fixtureZip = Join-Path $fixtureRoot "dist/project-ashfall-v$fixtureVersion-itch.zip"
    Assert-Archive $fixtureZip $fixtureRoot (@($expected) + @('assets/extra.js','assets/theme.css','assets/textures/test sprite.svg'))
    Pass 'changed version, new HTML/CSS dependencies, nested paths, encoded filename, CSS cycle and excluded development files'

    [IO.File]::AppendAllText((Join-Path $fixtureRoot 'assets/extra.js'), "`n// Updated content for replacement verification.")
    $result = Invoke-Build $fixtureScript $projectRoot
    Assert-That ($result.ExitCode -eq 0) $result.Output
    Assert-Archive $fixtureZip $fixtureRoot (@($expected) + @('assets/extra.js','assets/theme.css','assets/textures/test sprite.svg'))
    Pass 'same-name replacement contains updated runtime bytes'

    $goodHash = (Get-FileHash -LiteralPath $fixtureZip).Hash
    [IO.File]::Delete((Join-Path $fixtureRoot 'audio.js'))
    $result = Invoke-Build $fixtureScript $projectRoot
    Assert-That ($result.ExitCode -ne 0 -and $result.Output.Contains('Missing runtime file: audio.js')) 'Missing runtime file did not fail clearly.'
    Assert-That ((Get-FileHash -LiteralPath $fixtureZip).Hash -eq $goodHash) 'A failed build damaged the existing ZIP.'
    Assert-That (@(Get-ChildItem -LiteralPath (Join-Path $fixtureRoot 'dist') -Force -Filter '*.tmp').Count -eq 0) 'Temporary ZIP was left behind.'
    Pass 'missing file fails without changing the previous ZIP or leaving a temporary archive'

    [IO.File]::Copy((Join-Path $projectRoot 'audio.js'), (Join-Path $fixtureRoot 'audio.js'))
    [IO.File]::AppendAllText($cssFile, "`n" + 'body { background: url("../../outside.txt"); }')
    $result = Invoke-Build $fixtureScript $projectRoot
    Assert-That ($result.ExitCode -ne 0 -and $result.Output.Contains('leaves the project')) 'Reference outside the project was not rejected.'
    Assert-That ((Get-FileHash -LiteralPath $fixtureZip).Hash -eq $goodHash) 'Rejected reference damaged the existing ZIP.'
    Pass 'references outside the project are rejected before replacement'
} finally {
    $workPrefix = [IO.Path]::GetFullPath((Join-Path $projectRoot 'work')) + [IO.Path]::DirectorySeparatorChar
    $resolvedFixture = [IO.Path]::GetFullPath($fixtureRoot)
    if (-not $resolvedFixture.StartsWith($workPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe fixture cleanup path.' }
    if (Test-Path -LiteralPath $resolvedFixture) { Remove-Item -LiteralPath $resolvedFixture -Recurse -Force }
}
Write-Host "$passed packaging checks passed."
