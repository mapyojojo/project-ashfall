#Requires -Version 5.1
<#
.SYNOPSIS
Build and verify the runtime-only itch.io ZIP, using version.js as the version source.
.EXAMPLE
.\scripts\build-itch.ps1
.EXAMPLE
.\scripts\build-itch.ps1 -OpenFolder
#>
[CmdletBinding()]
param([switch]$OpenFolder)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$rootPrefix = $projectRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$versionSource = [IO.File]::ReadAllText((Join-Path $projectRoot 'version.js'))
$versionPattern = '\bversion\s*:\s*[''"](?<value>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)[''"]'
$versionMatches = [regex]::Matches($versionSource, $versionPattern)
if ($versionMatches.Count -ne 1) { throw 'Expected exactly one release version in version.js.' }
$version = $versionMatches[0].Groups['value'].Value

# Follow local HTML resources and CSS imports/URLs; never archive the repository tree.
$files = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$pending = [Collections.Generic.Queue[string]]::new()
$pending.Enqueue('index.html')
while ($pending.Count -gt 0) {
    $relative = $pending.Dequeue()
    if (-not $files.Add($relative)) { continue }
    $sourcePath = Join-Path $projectRoot $relative
    if (-not [IO.File]::Exists($sourcePath)) { throw "Missing runtime file: $relative" }
    $references = @()
    switch ([IO.Path]::GetExtension($sourcePath).ToLowerInvariant()) {
        '.html' {
            $html = [regex]::Replace([IO.File]::ReadAllText($sourcePath), '(?s)<!--.*?-->', '')
            foreach ($tag in [regex]::Matches($html, '<(?:script|link|img|source|audio|video)\b[^>]*>', 'IgnoreCase')) {
                foreach ($attribute in [regex]::Matches($tag.Value, '\b(?:src|href|poster)\s*=\s*([''"])(?<url>.*?)\1', 'IgnoreCase')) {
                    $references += [Net.WebUtility]::HtmlDecode($attribute.Groups['url'].Value)
                }
            }
        }
        '.css' {
            $css = [regex]::Replace([IO.File]::ReadAllText($sourcePath), '(?s)/\*.*?\*/', '')
            foreach ($match in [regex]::Matches($css, 'url\(\s*[''"]?(?<url>[^''")]+?)[''"]?\s*\)|@import\s+[''"](?<url>[^''"]+)[''"]', 'IgnoreCase')) {
                $references += $match.Groups['url'].Value
            }
        }
    }
    foreach ($reference in $references) {
        $reference = $reference.Trim()
        if (-not $reference -or $reference -match '^(?:[a-z][a-z0-9+.-]*:|//|#)') { continue }
        $resource = [Uri]::UnescapeDataString(($reference -split '[?#]', 2)[0])
        if ([IO.Path]::IsPathRooted($resource)) { throw "Use a relative runtime path: $reference" }
        $absolute = [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $sourcePath) $resource))
        if (-not $absolute.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Runtime reference leaves the project: $reference"
        }
        $pending.Enqueue($absolute.Substring($rootPrefix.Length).Replace('\', '/'))
    }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$dist = Join-Path $projectRoot 'dist'
[void][IO.Directory]::CreateDirectory($dist)
$zipPath = Join-Path $dist "project-ashfall-v$version-itch.zip"
$temporaryZip = Join-Path $dist ('.itch-' + [Guid]::NewGuid().ToString('N') + '.tmp')
try {
    $archive = [IO.Compression.ZipFile]::Open($temporaryZip, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($relative in ($files | Sort-Object)) {
            [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, (Join-Path $projectRoot $relative), $relative, [IO.Compression.CompressionLevel]::Optimal)
        }
    } finally { $archive.Dispose() }

    # Check the actual archive and read every entry before replacing an existing release.
    $archive = [IO.Compression.ZipFile]::OpenRead($temporaryZip)
    try {
        if ($archive.Entries.Count -ne $files.Count -or -not $archive.GetEntry('index.html')) {
            throw 'The ZIP must contain index.html at its root and exactly the runtime files.'
        }
        foreach ($entry in $archive.Entries) {
            if (-not $files.Contains($entry.FullName)) { throw "Unexpected ZIP entry: $($entry.FullName)" }
            $inputStream = $entry.Open()
            $hash = [Security.Cryptography.SHA256]::Create()
            try { $actualHash = [BitConverter]::ToString($hash.ComputeHash($inputStream)) }
            finally { $hash.Dispose(); $inputStream.Dispose() }
            $expectedHash = (Get-FileHash -LiteralPath (Join-Path $projectRoot $entry.FullName) -Algorithm SHA256).Hash
            if ($actualHash.Replace('-', '') -ne $expectedHash) { throw "ZIP content differs: $($entry.FullName)" }
        }
        $versionEntry = $archive.GetEntry('version.js')
        if (-not $versionEntry) { throw 'The ZIP must include version.js.' }
        $reader = [IO.StreamReader]::new($versionEntry.Open())
        try { $packedVersion = [regex]::Matches($reader.ReadToEnd(), $versionPattern) }
        finally { $reader.Dispose() }
        if ($packedVersion.Count -ne 1 -or $packedVersion[0].Groups['value'].Value -ne $version) {
            throw 'The archived release version does not match the ZIP filename.'
        }
    } finally { $archive.Dispose() }

    # NullString passes a real null backup path on Windows PowerShell 5.1.
    if ([IO.File]::Exists($zipPath)) { [IO.File]::Replace($temporaryZip, $zipPath, [NullString]::Value) }
    else { [IO.File]::Move($temporaryZip, $zipPath) }
} finally {
    if ([IO.File]::Exists($temporaryZip)) { [IO.File]::Delete($temporaryZip) }
}

Write-Host "Verified $($files.Count) runtime files; index.html is at the ZIP root; version $version."
Write-Output $zipPath
if ($OpenFolder) { Invoke-Item -LiteralPath $dist }
