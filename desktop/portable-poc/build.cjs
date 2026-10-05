'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const {version} = require(path.join(root, 'version.js'));
const expectedElectron = require('./package.json').devDependencies.electron;
if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('This PoC build supports Windows x64 only.');
const runtime = path.join(__dirname, 'node_modules/electron/dist');
if (fs.readFileSync(path.join(runtime, 'version'), 'utf8').trim() !== expectedElectron) throw Error('Unexpected Electron version; run npm ci here.');

// Follow the current static entrypoint instead of maintaining a second game copy.
const queue = ['index.html'], files = new Set();
while (queue.length) {
  const relative = queue.shift();
  if (files.has(relative)) continue;
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(root + path.sep)) throw Error('Asset leaves repository: ' + relative);
  const source = fs.readFileSync(absolute);
  files.add(relative);
  let references = [];
  if (relative.endsWith('.html')) {
    const html = source.toString().replace(/<!--[^]*?-->/g, '');
    for (const tag of html.matchAll(/<(?:script|link|img|source|audio|video)\b[^>]*>/gi)) {
      for (const attribute of tag[0].matchAll(/\b(?:src|href|poster)\s*=\s*(['"])(.*?)\1/gi)) references.push(attribute[2]);
    }
  } else if (relative.endsWith('.css')) {
    const css = source.toString().replace(/\/\*[^]*?\*\//g, '');
    for (const match of css.matchAll(/url\(\s*['"]?([^'"\)]+?)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/gi)) references.push(match[1] || match[2]);
  }
  for (const reference of references) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) {
      if (!reference.startsWith('data:')) throw Error('Remote asset prevents offline build: ' + reference);
      continue;
    }
    if (!reference || reference.startsWith('#')) continue;
    const target = path.resolve(path.dirname(absolute), decodeURIComponent(reference.split(/[?#]/)[0]));
    if (!target.startsWith(root + path.sep)) throw Error('Asset reference leaves repository: ' + reference);
    queue.push(path.relative(root, target).replaceAll('\\', '/'));
  }
}
const name = `project-ashfall-v${version}-electron-${expectedElectron}-win-x64-poc`;
const folder = path.join(root, 'dist', name), zip = folder + '.zip';
// Avoid replacing previous artifacts, or their data profiles, on a rebuild.
if (fs.existsSync(folder) || fs.existsSync(zip)) throw Error('Output already exists; preserve it and choose a fresh workspace for rebuilding: ' + folder);
fs.mkdirSync(path.dirname(folder), {recursive: true});
fs.cpSync(runtime, folder, {recursive: true});
fs.renameSync(path.join(folder, 'electron.exe'), path.join(folder, 'Ashfall-PoC.exe'));
fs.unlinkSync(path.join(folder, 'resources/default_app.asar'));
const application = path.join(folder, 'resources/app');
fs.mkdirSync(application, {recursive: true});
fs.copyFileSync(path.join(__dirname, 'main.cjs'), path.join(application, 'main.cjs'));
fs.writeFileSync(path.join(application, 'package.json'), JSON.stringify({name: 'ashfall-portable-poc', version: '0.0.0', main: 'main.cjs', private: true}, null, 2));
const manifest = {gameVersion: version, electron: expectedElectron, platform: 'win32', arch: 'x64', files: []};
for (const relative of [...files].sort()) {
  const source = path.join(root, relative), destination = path.join(application, 'game', relative);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(source, destination);
  const bytes = fs.readFileSync(source), copy = fs.readFileSync(destination);
  if (!bytes.equals(copy)) throw Error('Asset copy differs: ' + relative);
  manifest.files.push({path: relative, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(path.join(application, 'assets.json'), JSON.stringify(manifest, null, 2));
fs.copyFileSync(path.join(__dirname, 'README.md'), path.join(folder, 'README-POC.md'));
// Electron's LICENSE and LICENSES.chromium.html remain at the distribution root.
execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:ASHFALL_POC_FOLDER, $env:ASHFALL_POC_ZIP)'],
  {env: {...process.env, ASHFALL_POC_FOLDER: folder, ASHFALL_POC_ZIP: zip}, stdio: 'inherit'});
const walk = directory => fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [fs.statSync(path.join(directory, entry.name)).size]);
const sizes = walk(folder);
console.log(JSON.stringify({folder, zip, gameFiles: files.size, gameBytes: manifest.files.reduce((sum, file) => sum + file.bytes, 0), extractedFiles: sizes.length, extractedBytes: sizes.reduce((sum, size) => sum + size, 0), zipBytes: fs.statSync(zip).size}, null, 2));
