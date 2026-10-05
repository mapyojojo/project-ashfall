'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {root, work, collect, sha256} = require('./assets.cjs');
const version = require(path.join(root,'version.js')).version;
function directory(folder, excluded = new Set()) {
  if(!fs.existsSync(folder))return null;
  let bytes=0,files=0;
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})) {
    if(excluded.has(entry.name))continue;
    const absolute=path.join(folder,entry.name);
    if(entry.isDirectory()){const child=directory(absolute);bytes+=child.bytes;files+=child.files;}
    else {bytes+=fs.statSync(absolute).size;files++;}
  }
  return {bytes,MiB:bytes/2**20,files};
}
const electronName=`project-ashfall-v${version}-electron-44.5.1-win-x64-poc`;
const electronFolder=path.join(root,'dist',electronName);
const tauriName=`project-ashfall-v${version}-tauri-2.12.1-win-x64-poc`;
const tauriFolder=path.join(root,'dist',tauriName);
const manifest=JSON.parse(fs.readFileSync(path.join(electronFolder,'resources/app/assets.json')));
assert.deepEqual(manifest.files,collect(),'Electron and current game asset manifest');
for(const file of manifest.files)assert.equal(sha256(fs.readFileSync(path.join(electronFolder,'resources/app/game',file.path))),file.sha256);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tauriFolder,'assets.json'))).files,manifest.files);
const size=file=>{const bytes=fs.statSync(file).size;return {bytes,MiB:bytes/2**20};};
const report={date:new Date().toISOString(),version,architecture:'x64',gameManifestIdentical:true,gameFiles:manifest.files.length,gameBytes:manifest.files.reduce((n,f)=>n+f.bytes,0),compression:'Both ZIPs: .NET System.IO.Compression.ZipFile.CreateFromDirectory default (Optimal); profile excluded',tauri:{exe:size(path.join(tauriFolder,'Ashfall-Tauri-PoC.exe')),zip:size(tauriFolder+'.zip'),zipSha256:sha256(fs.readFileSync(tauriFolder+'.zip')),extracted:directory(tauriFolder,new Set(['data'])),runtimeBundled:false},electron:{exe:size(path.join(electronFolder,'Ashfall-PoC.exe')),zip:size(electronFolder+'.zip'),zipSha256:sha256(fs.readFileSync(electronFolder+'.zip')),extracted:directory(electronFolder,new Set(['data'])),runtimeBundled:true,firstProfileBytes:null,profileNote:'First-use profile was not measured in Sprint 1; previous fixture profile is measured separately.'},webview2:{version:'154.0.4258.53',existingInstallation:directory('C:/Program Files (x86)/Microsoft/EdgeWebView/Application/154.0.4258.53'),additionalDownloadBytes:null,offlineInstallerBytes:null,fixedRuntimeBytes:null,note:'Existing shared Evergreen directory size is not an installer download size or standalone runtime redistribution size.'}};
report.electron.previousFixtureProfile=directory(path.join(root,'work/portable-build-feasibility/verify-1791192491564/unpacked/data'));
const verificationFolders=fs.readdirSync(work).filter(name=>name.startsWith('verify-')).sort();
for(const folder of verificationFolders.reverse()){
  const file=path.join(work,folder,'verification.json');if(!fs.existsSync(file))continue;
  const result=JSON.parse(fs.readFileSync(file));if(result.result!=='PASS' || result.zipSha256!==report.tauri.zipSha256)continue;
  report.tauri.firstProfileBytes=result.firstProfileBytes;report.tauri.finalFixtureProfileBytes=result.finalProfileBytes;report.tauri.profileEvidence=file;break;
}
for(const folder of fs.readdirSync(work).filter(name=>name.startsWith('profiles-')).sort().reverse()){
  const file=path.join(work,folder,'measurements.json');if(!fs.existsSync(file))continue;
  const result=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));if(!result.measurements.length)continue;
  if(!result.measurements.every(item=>item.zipSha256.toLowerCase()===report[item.name].zipSha256))continue;
  for(const item of result.measurements){report[item.name].firstProfileBytes=item.bytes;report[item.name].firstProfileMiB=item.MiB;report[item.name].firstProfileEvidence=file;}
  report.electron.profileNote=result.result==='PASS'?'Matched fresh normal title startup, two seconds before native close; size measurement only.':'Initial profile comparison incomplete: '+result.currentCandidate+': '+result.failure;
  report.initialProfiles={evidence:file,condition:result.purpose,result:result.result,failedCandidate:result.result==='PASS'?null:result.currentCandidate};break;
}
fs.writeFileSync(path.join(work,'size-comparison.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
