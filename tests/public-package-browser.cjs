// Verify the extracted public artifact over HTTP and file, with no game test API.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),directory=process.env.ASHFALL_PUBLIC_DIR;
assert.ok(directory,'Set ASHFALL_PUBLIC_DIR to a newly extracted public ZIP under this repository.');
const packaged=path.resolve(directory),relative=path.relative(root,packaged);
assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Extract under the repository for HTTP verification.');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8'),marker='const DEVELOPMENT_MODES_ENABLED = true;';
assert.equal(source.split(marker).length,2);
assert.equal(fs.readFileSync(path.join(packaged,'game.js'),'utf8'),source.replace(marker,'const DEVELOPMENT_MODES_ENABLED = false;'));
const out=path.join(root,'work/public-package-browser');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const targets=await(await fetch(`http://127.0.0.1:${process.env.ASHFALL_CDP_PORT||9223}/json`)).json();
 const target=targets.find(t=>t.type==='page'&&(t.url.startsWith('http://localhost:4173/')||t.url.startsWith('file:///')&&t.url.includes('/index.html')));
 assert.ok(target,'dedicated Ashfall browser');
 const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[],checks=[],cases=[];let next=0;
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error(method));},30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const navigate=async url=>{await send('Page.navigate',{url});for(let i=0;i<40;i++){await wait(100);if(await evaluate(`location.href===${JSON.stringify(url)}&&typeof AshfallI18n!=='undefined'&&document.getElementById('startButton').onclick!==null`))return;}throw Error('startup timeout '+url);};
 const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});};
 const key=async(code,value)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:value});await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:value});};
 const tick=async frames=>evaluate(`(()=>{for(let i=0;i<${frames};i++){window.__qaTime+=1000/60;window.__qaFrame(window.__qaTime);}})()`);
 const noModes=async()=>{
  assert.equal(await evaluate('typeof window.AshfallTest'),'undefined');
  for(const id of ['debugBadge','debugOpen','debugPanel'])assert.equal(await evaluate(`document.getElementById('${id}').hidden`),true,id);
  assert.equal(await evaluate("document.getElementById('debugAvailability').textContent"),'');
  for(const id of ['debugOpen','debugClose','debugGrant','debugAdvance','debugBossSpawn','debugEnemySpawn','debugInvincible'])assert.equal(await evaluate(`document.getElementById('${id}').onclick===null`),true,id);
  assert.equal(await evaluate("document.getElementById('debugUpgrade').onchange===null"),true);
 };
 const passed=name=>{checks.push(name);console.log('PASS',name);};
 let frameScript;
 try{
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  // Capture only the existing render callback; advance normal combat, never expose mechanics.
  frameScript=(await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__qaTime=performance.now();window.requestAnimationFrame=callback=>{window.__qaFrame=callback;return 1;};'})).identifier;
  const http=new URL(relative.split(path.sep).map(encodeURIComponent).join('/')+'/index.html','http://localhost:4173/').href;
  const bases=[http,pathToFileURL(path.join(packaged,'index.html')).href];
  for(const [mode,base] of bases.entries()){
   await navigate(base);
   for(const query of ['', '?debug', '?test', '?test&debug'])for(const language of ['ja','en']){
    const saved={marks:100,best:741,wins:2,runs:8,relic:2,unknown:{keep:true}};
    await evaluate(`localStorage.setItem('ashfall.v1',${JSON.stringify(JSON.stringify(saved))});localStorage.setItem('ashfall.language','${language}');`);
    await navigate(base+query);await noModes();
    assert.equal(await evaluate('document.documentElement.lang'),language);
    assert.equal(await evaluate("document.getElementById('title').hidden"),false);
    assert.equal(await evaluate("document.getElementById('startButton').textContent"),language==='ja'?'ゲーム開始 →':'Start game →');
    if(query==='?test&debug'){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,`${mode}-${language}-public-title.png`),Buffer.from(shot.data,'base64'));}
    const readMeta=async()=>JSON.parse(await evaluate("localStorage.getItem('ashfall.v1')"));
    assert.deepEqual(await readMeta(),{...saved,relic:0}); // Normal startup correction saves even with ?debug.
    await click('#relicButton');await click('[data-relic="3"]');await click('#closeRelics');
    assert.deepEqual(await readMeta(),{...saved,relic:3});
    await click('#startButton');await noModes();
    assert.equal(await evaluate("document.getElementById('timeText').textContent"),'00:00');
    assert.equal(await evaluate("document.getElementById('levelText').textContent"),'LV 1');
    const hudBefore=await evaluate("document.getElementById('hud').innerText");
    // Attempt all five hidden controls programmatically too; no listeners may act.
    await evaluate("for(const [id,value] of [['debugUpgrade','quick'],['debugBoss','boss'],['debugEnemy','runner']])document.getElementById(id).replaceChildren(new Option(value,value));document.getElementById('debugSeconds').value='720';document.getElementById('debugCount').value='25';for(const id of ['debugOpen','debugGrant','debugAdvance','debugBossSpawn','debugEnemySpawn','debugInvincible'])document.getElementById(id).click();");
    await noModes();assert.equal(await evaluate("document.getElementById('hud').innerText"),hudBefore);
    await key('KeyW','w');await tick(181);
    assert.equal(await evaluate("document.getElementById('timeText').textContent"),'00:03');
    await key('Space',' ');await key('KeyP','p');assert.equal(await evaluate("document.getElementById('pause').hidden"),false);
    await tick(120);assert.equal(await evaluate("document.getElementById('timeText').textContent"),'00:03');
    await noModes();await click('#resumeButton');
    if(query==='?test&debug'){
     await key('KeyP','p');await click('#pauseFullscreen');await wait(200);assert.equal(await evaluate('!!document.fullscreenElement'),true);
     await evaluate('document.exitFullscreen()');await wait(200);assert.equal(await evaluate("document.getElementById('pause').hidden"),false);await noModes();await click('#resumeButton');
     // Stationary natural damage must still end a public run and write its record.
     for(let batch=0;batch<60&&await evaluate("document.getElementById('result').hidden");batch++){
      assert.equal(await evaluate("document.getElementById('pause').hidden"),true,'combat fixture unexpectedly paused');
      await tick(120);
     }
     assert.equal(await evaluate("document.getElementById('result').hidden"),false,'normal combat must reach defeat without test/debug helpers');
     const result=await readMeta();assert.equal(result.runs,9);assert.ok(result.marks>=saved.marks);assert.equal(result.wins,2);assert.equal(result.best,741);assert.equal(result.relic,3);assert.deepEqual(result.unknown,saved.unknown);
     await noModes();await click('#restartButton');assert.equal(await evaluate("document.getElementById('timeText').textContent"),'00:00');assert.equal(await evaluate("document.getElementById('levelText').textContent"),'LV 1');
     await key('KeyP','p');assert.equal(await evaluate("document.getElementById('pause').hidden"),false);
    }else await key('KeyP','p');
    await click('#quitButton');await noModes();assert.equal(await evaluate("document.getElementById('title').hidden"),false);
    const other=language==='ja'?'en':'ja';await click(other==='ja'?'#languageJa':'#languageEn');
    assert.equal(await evaluate("localStorage.getItem('ashfall.language')"),other);
    const persisted=await readMeta();await navigate(base+query);await noModes();assert.equal(await evaluate('document.documentElement.lang'),other);assert.deepEqual(await readMeta(),persisted);
    cases.push({base,query,language,apiAbsent:true,controlsInactive:true,normalSave:true,resultRetry:query==='?test&debug'});
    passed(`${mode===0?'HTTP':'file'} ${query||'normal'} ${language}: public modes disabled; normal run/save/i18n`);
   }
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({date:new Date().toISOString(),browser:(await send('Browser.getVersion')).product,checks,cases,runtimeErrors:errors.length,limits:'CDP input and captured render callback. No AshfallTest or debug helpers. Human feel, physical input and other browsers unverified.'},null,2));
 }finally{if(frameScript)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:frameScript}).catch(()=>{});ws.close();for(const p of pending.values())clearTimeout(p.timer);}
})().catch(e=>{console.error(e);process.exitCode=1;});
