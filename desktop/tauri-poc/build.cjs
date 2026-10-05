'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {root, work, prepare, sha256} = require('./assets.cjs');
if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('Windows x64 only.');
const manifest = prepare();
const cliVersion = require('./package.json').devDependencies['@tauri-apps/cli'];
const name = `project-ashfall-v${manifest.gameVersion}-tauri-${cliVersion}-win-x64-poc`;
const finalDestination = path.join(root, 'dist', name), finalZip = finalDestination + '.zip';
if (fs.existsSync(finalDestination) || fs.existsSync(finalZip)) throw Error('Preserve previous artifacts; build in a fresh checkout: ' + finalDestination);
const destination = path.join(work, 'package-' + Date.now(), name), zip = destination + '.zip';
const env = {...process.env, CARGO_HOME: process.env.CARGO_HOME || path.join(work, 'cargo-home'), CARGO_TARGET_DIR: path.join(work, 'target')};
const started = Date.now();
execFileSync(process.execPath, [require.resolve('@tauri-apps/cli/tauri.js'), 'build', '--no-bundle', '--target', 'x86_64-pc-windows-msvc', '--', '--locked'], {cwd: __dirname, env, stdio: 'inherit'});
fs.mkdirSync(destination, {recursive: true});
fs.copyFileSync(path.join(work, 'target/x86_64-pc-windows-msvc/release/ashfall-tauri-poc.exe'), path.join(destination, 'Ashfall-Tauri-PoC.exe'));
fs.writeFileSync(path.join(destination, 'assets.json'), JSON.stringify(manifest, null, 2));
fs.copyFileSync(path.join(__dirname, 'README.md'), path.join(destination, 'README-POC.md'));
// Record the licenses of the actual resolved Windows dependency graph.
const metadata = JSON.parse(execFileSync('cargo', ['metadata', '--locked', '--offline', '--format-version', '1', '--filter-platform', 'x86_64-pc-windows-msvc'], {cwd: path.join(__dirname, 'src-tauri'), env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}));
const resolved = new Set(metadata.resolve.nodes.map(n => n.id));
const notices = ['# Tauri PoC dependency notices', '', 'WebView2 Evergreen is supplied and updated separately by Microsoft; it is not bundled here.', 'License files below describe Rust dependencies in the resolved Windows graph. This is a PoC notice inventory; formal redistribution review remains pending.', ''];
for (const pkg of metadata.packages.filter(p => resolved.has(p.id)).sort((a, b) => a.name.localeCompare(b.name))) {
  notices.push(`## ${pkg.name} ${pkg.version}`, `License: ${pkg.license || 'see source'}; source: ${pkg.repository || pkg.source || 'this PoC'}`, '');
  const directory = path.dirname(pkg.manifest_path);
  const licenseFiles = fs.readdirSync(directory).filter(name => /^(?:licen[cs]e|copying|notice)(?:[._-]|$)/i.test(name));
  if (pkg.license_file && !licenseFiles.includes(pkg.license_file)) licenseFiles.push(pkg.license_file);
  for (const file of licenseFiles) {
    const license = path.join(directory, file);
    if (fs.statSync(license).isFile()) notices.push(`### ${file}`, '', fs.readFileSync(license, 'utf8'), '');
  }
}
fs.writeFileSync(path.join(destination, 'THIRD-PARTY-NOTICES.txt'), notices.join('\n'));
execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:ASHFALL_TAURI_FOLDER, $env:ASHFALL_TAURI_ZIP)'], {env: {...env, ASHFALL_TAURI_FOLDER: destination, ASHFALL_TAURI_ZIP: zip}, stdio: 'inherit'});
const entries = fs.readdirSync(destination).map(name => ({name, bytes: fs.statSync(path.join(destination, name)).size}));
const report = {folder: finalDestination, zip: finalZip, buildSeconds: (Date.now() - started) / 1000, gameVersion: manifest.gameVersion, cli: cliVersion, gameFiles: manifest.files.length, gameBytes: manifest.files.reduce((n, f) => n + f.bytes, 0), files: entries, extractedBytes: entries.reduce((n, f) => n + f.bytes, 0), zipBytes: fs.statSync(zip).size, zipSha256: sha256(fs.readFileSync(zip)), executableSha256: sha256(fs.readFileSync(path.join(destination, 'Ashfall-Tauri-PoC.exe'))), runtimeBundled: false};
fs.mkdirSync(path.dirname(finalDestination), {recursive: true});
fs.renameSync(destination, finalDestination);
fs.renameSync(zip, finalZip);
fs.writeFileSync(path.join(work, 'build-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
