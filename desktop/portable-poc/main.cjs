'use strict';
const {app, BrowserWindow, protocol, net, session} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

// Use Chromium's normal storage, with a separate profile beside the executable.
const profile = path.join(path.dirname(app.getPath('exe')), 'data');
fs.mkdirSync(profile, {recursive: true});
app.setName('Ashfall Portable PoC');
app.setPath('userData', profile);
app.setPath('sessionData', profile);
protocol.registerSchemesAsPrivileged([
  {scheme: 'ashfall', privileges: {standard: true, secure: true, supportFetchAPI: true}}
]);

app.whenReady().then(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets.json'), 'utf8'));
  const files = new Set(manifest.files.map(file => file.path));
  protocol.handle('ashfall', request => {
    const url = new URL(request.url);
    const relative = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
    if (url.host !== 'game' || !files.has(relative)) return new Response('', {status: 404});
    return net.fetch(pathToFileURL(path.join(__dirname, 'game', relative)).href);
  });
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'fullscreen'));
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 800, minHeight: 600, show: false,
    autoHideMenuBar: true, title: 'Project Ashfall — Portable PoC',
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true}
  });
  win.removeMenu();
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url);
    if (target.protocol !== 'ashfall:' || target.host !== 'game') event.preventDefault();
  });
  win.once('ready-to-show', () => {
    if (!(process.argv.includes('--ashfall-test') && process.argv.includes('--ashfall-hidden'))) win.show();
  });
  // The test API is enabled only when explicitly requested by the verifier.
  await win.loadURL('ashfall://game/index.html' + (process.argv.includes('--ashfall-test') ? '?test' : ''));
}).catch(error => { console.error(error); app.exit(1); });
app.on('window-all-closed', () => app.quit());
