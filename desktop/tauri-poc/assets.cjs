'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const work = path.join(root, 'work/tauri-poc');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function collect() {
  const queue = ['index.html'], files = new Set();
  while (queue.length) {
    const relative = queue.shift();
    if (files.has(relative)) continue;
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(root + path.sep)) throw Error('Asset leaves repository: ' + relative);
    const source = fs.readFileSync(absolute);
    files.add(relative);
    const references = [];
    if (relative.endsWith('.html')) {
      for (const tag of source.toString().replace(/<!--[^]*?-->/g, '').matchAll(/<(?:script|link|img|source|audio|video)\b[^>]*>/gi)) {
        for (const attr of tag[0].matchAll(/\b(?:src|href|poster)\s*=\s*(['"])(.*?)\1/gi)) references.push(attr[2]);
      }
    } else if (relative.endsWith('.css')) {
      for (const match of source.toString().replace(/\/\*[^]*?\*\//g, '').matchAll(/url\(\s*['"]?([^'"\)]+?)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/gi)) references.push(match[1] || match[2]);
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
  return [...files].sort().map(relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    return {path: relative, bytes: bytes.length, sha256: sha256(bytes)};
  });
}
function prepare() {
  const files = collect(), destination = path.join(work, 'assets');
  fs.mkdirSync(destination, {recursive: true});
  // Refuse stale extra files rather than silently embedding previous content.
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.relative(destination, path.join(dir, e.name)).replaceAll('\\', '/')]);
  for (const existing of walk(destination)) if (!files.some(f => f.path === existing)) throw Error('Unexpected staged asset: ' + existing);
  for (const file of files) {
    const target = path.join(destination, file.path);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(root, file.path), target);
    if (sha256(fs.readFileSync(target)) !== file.sha256) throw Error('Asset copy mismatch: ' + file.path);
  }
  const manifest = {gameVersion: require(path.join(root, 'version.js')).version, files};
  fs.writeFileSync(path.join(work, 'assets.json'), JSON.stringify(manifest, null, 2));
  // Windows resources require an ICO. Generate a small PoC mark in code;
  // keep this build-only bitmap outside the canonical game assets.
  const size = 32, dibBytes = 40 + size * size * 4 + size * 4;
  const icon = Buffer.alloc(22 + dibBytes);
  icon.writeUInt16LE(1, 2); icon.writeUInt16LE(1, 4);
  icon[6] = size; icon[7] = size; icon.writeUInt16LE(1, 10); icon.writeUInt16LE(32, 12);
  icon.writeUInt32LE(dibBytes, 14); icon.writeUInt32LE(22, 18);
  icon.writeUInt32LE(40, 22); icon.writeInt32LE(size, 26); icon.writeInt32LE(size * 2, 30);
  icon.writeUInt16LE(1, 34); icon.writeUInt16LE(32, 36); icon.writeUInt32LE(size * size * 4, 42);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const stitch = x >= 5 && x <= 26 && Math.abs(x - y) <= 1;
    const mark = [9, 16, 23].some(n => Math.abs(x - n) + Math.abs(y - n) <= 3);
    const offset = 62 + ((size - 1 - y) * size + x) * 4;
    const color = stitch || mark ? [242, 168, 95] : [27, 29, 35];
    icon[offset] = color[2]; icon[offset + 1] = color[1]; icon[offset + 2] = color[0]; icon[offset + 3] = 255;
  }
  fs.writeFileSync(path.join(work, 'icon.ico'), icon);
  return manifest;
}
module.exports = {root, work, collect, prepare, sha256};
if (require.main === module) console.log(JSON.stringify(prepare(), null, 2));
