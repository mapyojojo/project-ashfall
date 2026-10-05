'use strict';
// CDP exercise of the actual packaged app; writes only to fresh ignored work folders.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {spawn, execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const {version} = require(path.join(root, 'version.js'));
const electron = require('./package.json').devDependencies.electron;
const name = `project-ashfall-v${version}-electron-${electron}-win-x64-poc`;
const zip = path.join(root, 'dist', name + '.zip');
const work = path.join(root, 'work/portable-build-feasibility', 'verify-' + Date.now());
const unpacked = path.join(work, 'unpacked'), moved = path.join(work, '移動先 moved');
const port = 9225, checks = [], errors = [], requests = [];
const report = {date: '2026-10-05 (Asia/Tokyo)', version, electron, work, checks, errors};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const pass = name => { checks.push(name); console.log('PASS ' + name); };
let child, ws, next = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++next, timer = setTimeout(() => {pending.delete(id); reject(Error(method + ' timed out'));}, 15000);
  pending.set(id, {resolve, reject, timer}); ws.send(JSON.stringify({id, method, params}));
});
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw Error('Condition not reached: ' + expression);
}
async function launch(folder) {
  // Use only the dedicated packaged app and its adjacent data directory.
  const env = {...process.env}; delete env.ELECTRON_RUN_AS_NODE;
  child = spawn(path.join(folder, 'Ashfall-PoC.exe'), ['--ashfall-test', '--ashfall-hidden', '--remote-debugging-port=' + port], {env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  child.on('error', error => errors.push(String(error)));
  child.stdout.on('data', bytes => fs.appendFileSync(path.join(work, 'app.log'), bytes));
  child.stderr.on('data', bytes => fs.appendFileSync(path.join(work, 'app.log'), bytes));
  let target;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw Error('App exited before CDP connection: ' + child.exitCode);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(target => target.type === 'page' && target.url.startsWith('ashfall://game/')); } catch {}
    if (target) break;
    await wait(100);
  }
  assert.ok(target, 'packaged page appears');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {ws.onopen = resolve; ws.onerror = reject;});
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timer);
      message.error ? item.reject(Error(JSON.stringify(message.error))) : item.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    else if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await until('!!window.AshfallTest');
}
async function close() {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({id: ++next, method: 'Runtime.evaluate', params: {expression: 'window.close()'}}));
    ws.close();
  }
  for (let attempt = 0; child && child.exitCode === null && attempt < 100; attempt++) await wait(100);
  assert.ok(!child || child.exitCode !== null, 'graceful process shutdown');
  child = undefined;
}
async function click(selector) {
  const position = await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});element.scrollIntoView({block:'nearest'});const r=element.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', ...position, button: 'left', clickCount: 1});
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', ...position, button: 'left', clickCount: 1});
}
async function key(code, key) {
  await send('Input.dispatchKeyEvent', {type: 'keyDown', code, key});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', code, key});
}
async function reload() {
  await send('Page.reload'); await wait(200); await until('!!window.AshfallTest');
}
async function shot(name) {
  const result = await send('Page.captureScreenshot', {format: 'png'});
  fs.writeFileSync(path.join(work, name + '.png'), Buffer.from(result.data, 'base64'));
}
(async () => {
  fs.mkdirSync(work, {recursive: true});
  // Fail before spawning if someone already uses the verification port.
  let occupied = false;
  try {await fetch(`http://127.0.0.1:${port}/json`); occupied = true;} catch {}
  assert.equal(occupied, false, 'dedicated CDP port must be free');
  execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($env:ASHFALL_POC_ZIP, $env:ASHFALL_POC_UNPACK)'], {env: {...process.env, ASHFALL_POC_ZIP: zip, ASHFALL_POC_UNPACK: unpacked}});
  const manifest = JSON.parse(fs.readFileSync(path.join(unpacked, 'resources/app/assets.json')));
  report.manifest = manifest;
  for (const file of manifest.files) {
    const original = fs.readFileSync(path.join(root, file.path));
    const packed = fs.readFileSync(path.join(unpacked, 'resources/app/game', file.path));
    assert.ok(packed.equals(original), 'unpacked source equality: ' + file.path);
    assert.equal(crypto.createHash('sha256').update(packed).digest('hex'), file.sha256);
  }
  for (const file of ['LICENSE', 'LICENSES.chromium.html']) assert.ok(fs.statSync(path.join(unpacked, file)).size > 0);
  assert.equal(fs.existsSync(path.join(unpacked, 'data')), false);
  pass('ZIP extraction, all 13 game assets match source, notices included, no profile bundled');
  await launch(unpacked);
  report.userAgent = await evaluate('navigator.userAgent');
  assert.equal(await evaluate('location.origin'), 'ashfall://game');
  assert.equal(await evaluate('typeof require'), 'undefined');
  pass('Windows packaged startup, stable origin and isolated renderer');
  const meta = {marks: 31, best: 741, wins: 2, runs: 8, relic: 3, future: {preserve: true}};
  await evaluate(`localStorage.setItem('ashfall.v1', ${JSON.stringify(JSON.stringify(meta))});`); await reload();
  for (const language of ['en', 'ja', 'en']) {
    await click(language === 'ja' ? '#languageJa' : '#languageEn');
    assert.equal(await evaluate('document.documentElement.lang'), language);
    assert.equal(await evaluate('localStorage.getItem("ashfall.v1")'), JSON.stringify(meta));
    await shot('title-' + language);
  }
  pass('real language clicks, unchanged meta bytes and unknown field');
  await send('Emulation.setDeviceMetricsOverride', {width: 1024, height: 640, deviceScaleFactor: 1, mobile: false});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await shot('title-en-1024');
  await send('Emulation.clearDeviceMetricsOverride');
  pass('1024x640 title has no horizontal page overflow');
  await click('#fullscreenButton'); await until('!!document.fullscreenElement');
  await click('#startButton'); await until('AshfallTest.state === "playing"');
  await wait(2500);
  assert.ok(await evaluate('AshfallTest.run.time') > 0);
  assert.equal(await evaluate('AshfallTest.audioState'), 'running');
  await shot('playing');
  pass('live Canvas loop and Web Audio running after start click');
  // Freeze future rAFs for deterministic observations; fixtures are explicit.
  await evaluate('window.requestAnimationFrame=()=>0'); await wait(100);
  await evaluate('AshfallTest.run.onboarding.disabled=true');
  for (const [code, value, axis, direction] of [['KeyD', 'd', 'x', 1], ['KeyA', 'a', 'x', -1], ['KeyW', 'w', 'y', -1], ['KeyS', 's', 'y', 1], ['ArrowRight', 'ArrowRight', 'x', 1], ['ArrowLeft', 'ArrowLeft', 'x', -1], ['ArrowUp', 'ArrowUp', 'y', -1], ['ArrowDown', 'ArrowDown', 'y', 1]]) {
    const before = await evaluate(`AshfallTest.run.player.${axis}`);
    await send('Input.dispatchKeyEvent', {type: 'keyDown', code, key: value});
    await evaluate('AshfallTest.update(.1)'); await send('Input.dispatchKeyEvent', {type: 'keyUp', code, key: value});
    assert.ok((await evaluate(`AshfallTest.run.player.${axis}`) - before) * direction > 0, code + ' movement');
  }
  await evaluate(`(()=>{const a=AshfallTest; a.run.player.dashTimer=0; a.run.enemies=[]; const route=a.predictLeap(); const e=a.spawnEnemy('crawler',(route.ax+route.bx)/2,(route.ay+route.by)/2);e.wake=10; a.seedEnemy(e,3,false);})()`);
  await key('Space', ' '); assert.equal(await evaluate('AshfallTest.run.leapRequested'), true);
  await evaluate('AshfallTest.step(.6)');
  assert.ok(await evaluate('AshfallTest.run.poweredLeaps > 0 && AshfallTest.run.ashUsed > 0 && AshfallTest.run.damageTotals.stitch > 0'));
  await evaluate('AshfallTest.run.player.dashTimer=0');
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 950, y: 350});
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: 950, y: 350, button: 'left', clickCount: 1});
  assert.equal(await evaluate('AshfallTest.run.leapRequested'), true);
  assert.equal(await evaluate('AshfallTest.mouse.x'), 950);
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: 950, y: 350, button: 'left', clickCount: 1});
  pass('WASD and arrow movement, aim, SPACE ash collection/blast and click request with explicit marked-enemy fixture');
  await evaluate('document.exitFullscreen()'); await until('AshfallTest.state === "paused"');
  await key('KeyP', 'p'); assert.equal(await evaluate('AshfallTest.state'), 'playing');
  await key('KeyP', 'p'); assert.equal(await evaluate('AshfallTest.state'), 'paused');
  await click('#resumeButton'); assert.equal(await evaluate('AshfallTest.state'), 'playing');
  await evaluate('window.dispatchEvent(new Event("blur"))');
  assert.equal(await evaluate('AshfallTest.state'), 'paused');
  pass('native fullscreen entry/exit, auto pause, P/resume and synthetic blur');
  await evaluate('AshfallTest.finish(false)');
  const expected = await evaluate('AshfallTest.meta');
  assert.equal(expected.runs, 9); assert.deepEqual(expected.future, meta.future);
  report.expectedMeta = expected;
  await close(); await launch(unpacked);
  assert.deepEqual(await evaluate('AshfallTest.meta'), expected);
  assert.equal(await evaluate('AshfallI18n.getLanguage()'), 'en');
  pass('graceful exit and process restart retain result meta and selected language');
  // Browser-level offline emulation; network interfaces are not changed.
  await send('Network.emulateNetworkConditions', {offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0});
  await reload(); await click('#startButton'); await wait(1000);
  assert.equal(await evaluate('AshfallTest.state'), 'playing');
  assert.ok(await evaluate('AshfallTest.run.time') > 0);
  pass('offline-emulated reload/start uses local packaged resources');
  await close();
  console.log('Copying closed profile and app to ' + moved);
  execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Copy-Item -LiteralPath $env:ASHFALL_POC_SOURCE -Destination $env:ASHFALL_POC_MOVED -Recurse'], {env: {...process.env, ASHFALL_POC_SOURCE: unpacked, ASHFALL_POC_MOVED: moved}});
  console.log('Launching moved copy');
  await launch(moved);
  assert.deepEqual(await evaluate('AshfallTest.meta'), expected);
  assert.equal(await evaluate('AshfallI18n.getLanguage()'), 'en');
  pass('closed profile copied with app to Unicode/spaced folder retains saves');
  const injection = await send('Page.addScriptToEvaluateOnNewDocument', {source: 'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("blocked fixture","SecurityError")}});'});
  await reload(); await click('#startButton'); await evaluate('AshfallTest.finish(false)');
  assert.equal(await evaluate('AshfallTest.state'), 'result');
  await send('Page.removeScriptToEvaluateOnNewDocument', {identifier: injection.identifier});
  pass('renderer storage-denied fixture can start and finish without exception');
  await close();
  report.remoteRequests = requests.filter(url => /^https?:/.test(url));
  assert.deepEqual(report.remoteRequests, []); assert.deepEqual(errors, []);
  pass('no renderer runtime exceptions or HTTP/HTTPS asset requests observed');
  report.result = 'PASS';
})().catch(error => {report.result = 'FAIL'; report.failure = error.stack; console.error(error); process.exitCode = 1;}).finally(async () => {
  if (child) {try {await close();} catch {child.kill();}}
  fs.writeFileSync(path.join(work, 'verification.json'), JSON.stringify(report, null, 2));
  console.log('Evidence: ' + path.join(work, 'verification.json'));
});
