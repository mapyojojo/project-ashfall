'use strict';
// Exercise the actual release ZIP. CDP is supplied externally to WebView2;
// production main.rs never accepts test/debug switches or exposes commands.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawn, execFileSync} = require('node:child_process');
const {root, work: base, collect, sha256} = require('./assets.cjs');
const version = require(path.join(root, 'version.js')).version;
const tauri = require('./package.json').devDependencies['@tauri-apps/cli'];
const name = `project-ashfall-v${version}-tauri-${tauri}-win-x64-poc`;
const work = path.join(base, 'verify-' + Date.now());
const unpacked = path.join(work, 'unpacked'), moved = path.join(work, '移動先 moved');
const port = 9237, origin = 'http://tauri.localhost';
const report = {date: new Date().toISOString(), version, tauri, work, checks: [], failures: [], limits: ['CDP from external WebView2 environment; physical input/audio judgement remains human.', 'Enemy/result and localStorage denial scenarios use explicit fixtures.', 'Offline is renderer emulation; clean PC physical disconnection is untested.']};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const pass = name => {report.checks.push(name); console.log('PASS ' + name);};
const saveReport = () => fs.writeFileSync(path.join(work,'verification.json'),JSON.stringify(report,null,2));
process.on('exit', code => {report.nodeExitCode = code; if(fs.existsSync(work))saveReport();});
const errors = [], pending = new Map(), responses = new Map();
let child, ws, next = 0;
function native(action, pid, ids) {
  return execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'native-check.ps1'), '-Action', action, '-TargetId', String(pid || 0), ...(ids ? ['-ProcessIds', ids.join(',')] : [])], {encoding: 'utf8'}).trim();
}
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++next, timer = setTimeout(() => {pending.delete(id); reject(Error(method + ' timed out'));}, 20000);
    pending.set(id, {resolve, reject, timer});
    ws.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression, userGesture = false) {
  const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true, userGesture});
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) {if (await evaluate(expression)) return; await wait(100);}
  throw Error('Condition not reached: ' + expression);
}
async function launch(folder, test = false) {
  const env = {...process.env};
  // Only a test-specific profile adjacent to the freshly extracted EXE is used.
  env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = `--remote-debugging-port=${port} --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding`;
  delete env.WEBVIEW2_USER_DATA_FOLDER;
  delete env.WEBVIEW2_BROWSER_EXECUTABLE_FOLDER;
  child = spawn(path.join(folder, 'Ashfall-Tauri-PoC.exe'), [], {env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  child.on('error', e => report.failures.push(String(e)));
  for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => fs.appendFileSync(path.join(work, 'app.log'), bytes));
  let target;
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw Error('App exited before CDP: ' + child.exitCode);
    try {target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page' && t.url.startsWith(origin));} catch {}
    if (target) break;
    await wait(100);
  }
  assert.ok(target, 'release page target');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {ws.onopen = resolve; ws.onerror = reject;});
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    const item = pending.get(message.id);
    if (item) {pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(JSON.stringify(message.error))) : item.resolve(message.result);}
    else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    else if (message.method === 'Network.responseReceived') responses.set(message.params.response.url, message.params);
  };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await until('document.readyState === "complete" && !!window.AshfallI18n');
  if (test) {
    await send('Page.navigate', {url: origin + '/index.html?test'});
    await until('!!window.AshfallTest');
  }
}
async function close() {
  if (!child) return;
  const tree = JSON.parse(native('tree', child.pid));
  report.lastProcessTree = tree;
  assert.ok(!tree.some(p => p.ProcessId === process.pid), 'verifier must not be in app tree');
  report.phase = 'native-close'; saveReport();
  native('close', child.pid);
  ws?.close(); ws = undefined;
  for (let i = 0; i < 100 && child.exitCode === null; i++) await wait(100);
  assert.notEqual(child.exitCode, null, 'native WM_CLOSE terminates app');
  const ids = tree.map(p => p.ProcessId);
  let alive;
  for (let i = 0; i < 30; i++) {alive = JSON.parse(native('alive', 0, ids)); if (!alive.length) break; await wait(100);}
  assert.deepEqual(alive, [], 'all captured child processes terminate');
  child = undefined;
}
async function click(selector) {
  const position = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', ...position, button: 'left', clickCount: 1});
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', ...position, button: 'left', clickCount: 1});
}
async function key(code, key) {
  await send('Input.dispatchKeyEvent', {type: 'keyDown', code, key});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', code, key});
}
async function reload() {await send('Page.reload'); await until('!!window.AshfallTest');}
async function shot(name) {
  const result = await send('Page.captureScreenshot', {format: 'png'});
  fs.writeFileSync(path.join(work, name + '.png'), Buffer.from(result.data, 'base64'));
}
function profileSize(folder) {
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).reduce((n, e) => n + (e.isDirectory() ? walk(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
  return walk(path.join(folder, 'data'));
}
(async () => {
  fs.mkdirSync(work, {recursive: true});
  let occupied = false;
  try {await fetch(`http://127.0.0.1:${port}/json`); occupied = true;} catch {}
  assert.equal(occupied, false, 'dedicated CDP port must be unused');
  const zip = path.join(root, 'dist', name + '.zip');
  report.zipSha256 = sha256(fs.readFileSync(zip));
  execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($env:ASHFALL_TAURI_ZIP, $env:ASHFALL_TAURI_UNPACK)'], {env: {...process.env, ASHFALL_TAURI_ZIP: zip, ASHFALL_TAURI_UNPACK: unpacked}});
  report.manifest = JSON.parse(fs.readFileSync(path.join(unpacked, 'assets.json')));
  assert.deepEqual(report.manifest.files, collect());
  assert.equal(fs.existsSync(path.join(unpacked, 'data')), false);
  assert.ok(fs.statSync(path.join(unpacked, 'THIRD-PARTY-NOTICES.txt')).size);
  pass('ZIP extraction, source manifest and notices, no profile bundled');
  const plainEnv = {...process.env};
  for (const variable of ['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS','WEBVIEW2_USER_DATA_FOLDER','WEBVIEW2_BROWSER_EXECUTABLE_FOLDER']) delete plainEnv[variable];
  child = spawn(path.join(unpacked,'Ashfall-Tauri-PoC.exe'),[],{env:plainEnv,windowsHide:true,stdio:'ignore'});
  let normalWindow;
  for(let i=0;i<30;i++){
    assert.equal(child.exitCode,null,'normal startup stays running');
    normalWindow=JSON.parse(native('window',child.pid));
    if(normalWindow.handle && normalWindow.title.includes('Ashfall'))break;
    await wait(200);
  }
  assert.ok(normalWindow.handle,'normal native window');
  let debug=false;try{await fetch(`http://127.0.0.1:${port}/json`);debug=true;}catch{}
  assert.equal(debug,false,'no verifier debug port without external environment');
  report.normalWindow=normalWindow;
  await close();report.firstProfileBytes=profileSize(unpacked);
  pass('no-argument/no-CDP-environment normal launch and native shutdown; initial profile measured');
  await launch(unpacked);
  report.userAgent = await evaluate('navigator.userAgent');
  report.origin = await evaluate('location.origin');
  assert.equal(report.origin, origin);
  assert.equal(await evaluate('typeof window.AshfallTest'), 'undefined');
  assert.equal(await evaluate('typeof require'), 'undefined');
  assert.equal(await evaluate('typeof window.__TAURI__'), 'undefined');
  await shot('normal-title-ja');
  pass('release startup with normal URL, no game test API, stable origin and no global native API');
  await close();
  pass('native window close and all captured processes exit');
  await launch(unpacked, true);
  responses.clear(); await reload(); await wait(500);
  for (const file of report.manifest.files.filter(f => f.path !== 'index.html')) {
    const response = responses.get(origin + '/' + file.path);
    assert.ok(response, 'embedded resource response: ' + file.path);
    const body = await send('Network.getResponseBody', {requestId: response.requestId});
    assert.equal(sha256(Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8')), file.sha256, 'embedded bytes: ' + file.path);
  }
  pass('all 12 embedded JS/CSS resource hashes match source; HTML is processed by Tauri for CSP');
  const meta = {marks: 31, best: 741, wins: 2, runs: 8, relic: 3, future: {preserve: true}};
  await evaluate(`localStorage.setItem('ashfall.v1', ${JSON.stringify(JSON.stringify(meta))})`); await reload();
  for (const language of ['en', 'ja', 'en']) {
    await click(language === 'ja' ? '#languageJa' : '#languageEn');
    assert.equal(await evaluate('document.documentElement.lang'), language);
    assert.equal(await evaluate('localStorage.getItem("ashfall.v1")'), JSON.stringify(meta));
    await shot('title-' + language);
  }
  pass('real language clicks preserve exact meta bytes, unknown field and relic number');
  await send('Emulation.setDeviceMetricsOverride', {width: 1024, height: 640, deviceScaleFactor: 1, mobile: false});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await shot('title-en-1024'); await send('Emulation.clearDeviceMetricsOverride');
  await click('#fullscreenButton'); await until('!!document.fullscreenElement'); await wait(1000);
  await click('#startButton'); await until('AshfallTest.state === "playing"'); await wait(1500);
  assert.ok(await evaluate('AshfallTest.run.time') > 0);
  assert.equal(await evaluate('AshfallTest.audioState'), 'running'); await shot('playing');
  pass('1024 layout, native fullscreen, live Canvas and Web Audio');
  await evaluate('window.requestAnimationFrame=()=>0'); await wait(100);
  await evaluate('AshfallTest.run.onboarding.disabled=true');
  for (const [code, value, axis, direction] of [['KeyD','d','x',1],['KeyA','a','x',-1],['KeyW','w','y',-1],['KeyS','s','y',1],['ArrowRight','ArrowRight','x',1],['ArrowLeft','ArrowLeft','x',-1],['ArrowUp','ArrowUp','y',-1],['ArrowDown','ArrowDown','y',1]]) {
    const before = await evaluate(`AshfallTest.run.player.${axis}`);
    await send('Input.dispatchKeyEvent', {type: 'keyDown', code, key: value});
    await evaluate('AshfallTest.update(.1)'); await send('Input.dispatchKeyEvent', {type: 'keyUp', code, key: value});
    assert.ok((await evaluate(`AshfallTest.run.player.${axis}`) - before) * direction > 0, code);
  }
  await evaluate(`(()=>{const a=AshfallTest;a.run.player.dashTimer=0;a.run.enemies=[];const r=a.predictLeap();const e=a.spawnEnemy('crawler',(r.ax+r.bx)/2,(r.ay+r.by)/2);e.wake=10;a.seedEnemy(e,3,false);})()`);
  await key('Space',' '); assert.equal(await evaluate('AshfallTest.run.leapRequested'), true);
  await evaluate('AshfallTest.step(.6)');
  assert.ok(await evaluate('AshfallTest.run.poweredLeaps>0 && AshfallTest.run.ashUsed>0 && AshfallTest.run.damageTotals.stitch>0'));
  await evaluate('AshfallTest.run.player.dashTimer=0');
  await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:950,y:350});
  await send('Input.dispatchMouseEvent', {type:'mousePressed',x:950,y:350,button:'left',clickCount:1});
  assert.equal(await evaluate('AshfallTest.run.leapRequested'), true);
  assert.equal(await evaluate('AshfallTest.mouse.x'), 950);
  await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:950,y:350,button:'left',clickCount:1});
  pass('WASD/arrows, aim/click/SPACE and Ash Stitch with marked-enemy fixture');
  await evaluate('document.exitFullscreen()'); await until('AshfallTest.state === "paused"');
  await key('KeyP','p'); assert.equal(await evaluate('AshfallTest.state'), 'playing');
  await key('KeyP','p'); assert.equal(await evaluate('AshfallTest.state'), 'paused');
  await click('#resumeButton'); await evaluate('window.dispatchEvent(new Event("blur"))');
  assert.equal(await evaluate('AshfallTest.state'), 'paused');
  pass('fullscreen exit pause, P/resume and synthetic blur');
  await evaluate('AshfallTest.finish(false)'); report.expectedMeta = await evaluate('AshfallTest.meta');
  assert.equal(report.expectedMeta.runs, 9); assert.deepEqual(report.expectedMeta.future, meta.future);
  await close(); await launch(unpacked, true);
  assert.deepEqual(await evaluate('AshfallTest.meta'), report.expectedMeta);
  assert.equal(await evaluate('AshfallI18n.getLanguage()'), 'en');
  pass('native close/restart retain result meta, unknown field and independent language');
  const second = spawn(path.join(unpacked,'Ashfall-Tauri-PoC.exe'), [], {windowsHide:true, stdio:'ignore'});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{second.kill();reject(Error('second instance was not rejected'));},10000);second.on('error',reject);second.on('exit',code=>{clearTimeout(timer);assert.notEqual(code,0);resolve();});});
  assert.deepEqual(await evaluate('AshfallTest.meta'), report.expectedMeta);
  pass('second instance rejected before profile access, original remains intact');
  assert.equal(await evaluate('window.open("https://example.invalid/")'), null);
  await send('Page.navigate', {url:'https://example.invalid/'}); await wait(300);
  assert.equal(await evaluate('location.origin'), origin);
  await send('Page.navigate', {url:origin + ':4173/'}); await wait(300);
  assert.equal(await evaluate('location.origin'), origin);
  assert.equal(await evaluate('Notification.requestPermission()'), 'denied');
  report.nativePermissionError = await evaluate(`window.__TAURI_INTERNALS__.invoke('plugin:window|set_title',{label:'main',title:'Unexpected native access'}).then(()=>'',e=>String(e))`);
  assert.match(report.nativePermissionError,/not allowed|denied/i);
  const htmlResponse = responses.get(origin + '/index.html?test');
  const htmlBody = await send('Network.getResponseBody',{requestId:htmlResponse.requestId});
  const htmlText = htmlBody.base64Encoded ? Buffer.from(htmlBody.body,'base64').toString() : htmlBody.body;
  report.embeddedCsp = htmlText.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i)?.[0] || htmlResponse.response.headers;
  assert.ok(/content-security-policy/i.test(JSON.stringify(report.embeddedCsp)),'embedded CSP');
  pass('external/alternate-port navigation, popup, notification and ungranted native command denied; CSP present');
  await send('Network.emulateNetworkConditions', {offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await reload(); await click('#startButton'); await wait(500);
  assert.equal(await evaluate('AshfallTest.state'), 'playing');
  pass('renderer offline-emulated reload/start with existing Evergreen runtime');
  await send('Network.emulateNetworkConditions', {offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  report.phase = 'after-offline'; saveReport(); await close(); report.finalProfileBytes = profileSize(unpacked);
  report.phase = 'copy-profile'; saveReport();
  console.log('Copying closed profile to Japanese/space path');
  execFileSync('powershell.exe',['-NoProfile','-Command','Copy-Item -LiteralPath $env:ASHFALL_TAURI_COPY_SOURCE -Destination $env:ASHFALL_TAURI_COPY_DESTINATION -Recurse'],{env:{...process.env,ASHFALL_TAURI_COPY_SOURCE:unpacked,ASHFALL_TAURI_COPY_DESTINATION:moved},stdio:'inherit'});
  report.phase='launch-moved';saveReport();await launch(moved,true);
  assert.deepEqual(await evaluate('AshfallTest.meta'), report.expectedMeta);
  assert.equal(await evaluate('AshfallI18n.getLanguage()'), 'en');
  pass('closed folder copy to Japanese/space path retains meta and language on same PC');
  await close();
  fs.copyFileSync(path.join(unpacked,'Ashfall-Tauri-PoC.exe'),path.join(moved,'Ashfall-Tauri-PoC.exe'));
  await launch(moved,true); assert.deepEqual(await evaluate('AshfallTest.meta'),report.expectedMeta);
  pass('same-version EXE replacement preserves adjacent profile');
  await send('Page.addScriptToEvaluateOnNewDocument', {source:'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Denied","SecurityError")}})'});
  await reload(); assert.equal(await evaluate('AshfallTest.state'),'title');
  await click('#startButton'); assert.equal(await evaluate('AshfallTest.state'),'playing');
  pass('storage-denial fixture still starts game; native disk denial remains separate');
  await close();
  assert.deepEqual(errors, [], 'no runtime exceptions'); report.result='PASS';
})().catch(async e=>{report.result='FAIL';report.failures.push(String(e.stack||e));console.error(e);process.exitCode=1;
  if(ws?.readyState===WebSocket.OPEN){try{report.failureState=await evaluate('({state:window.AshfallTest?.state,url:location.href,fullscreen:!!document.fullscreenElement,width:innerWidth,height:innerHeight})');await shot('failure');}catch{}}
}).finally(async()=>{
  saveReport();
  if(child && child.exitCode===null){try{await close();}catch(e){report.cleanupFailure=String(e);try{execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});}catch{}}}
  for(const item of pending.values())clearTimeout(item.timer);
  report.runtimeExceptions=errors;
  fs.writeFileSync(path.join(work,'verification.json'),JSON.stringify(report,null,2));
  console.log('Evidence: '+work);
});
