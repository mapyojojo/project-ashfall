// Reuse a dedicated CDP browser; never connect to a personal profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'work/debug-browser');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const targets=await(await fetch(`http://127.0.0.1:${process.env.ASHFALL_CDP_PORT||9223}/json`)).json();
 const target=targets.find(t=>t.type==='page'&&(t.url.startsWith('http://localhost:4173/')||t.url.startsWith('file:///')&&t.url.includes('/index.html')));assert.ok(target,'dedicated Ashfall browser');
 const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[],checks=[],startup=[];let next=0;
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error(method));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const navigate=async url=>{await send('Page.navigate',{url});for(let i=0;i<40;i++){await wait(100);if(await evaluate(`location.href===${JSON.stringify(url)}&&typeof AshfallI18n!=='undefined'&&document.getElementById('startButton').onclick!==null`))return;}throw Error('startup timeout '+url);};
 const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});};
 const key=async(code,value)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:value});await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:value});};
 const set=async(id,value)=>evaluate(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(value)};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('change',{bubbles:true}));`);
 const passed=name=>{checks.push(name);console.log('PASS',name);};
 let freezeScript;
 try {
  await send('Runtime.enable');await send('Page.enable');
  freezeScript=(await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.requestAnimationFrame=()=>0;'})).identifier;
  const bases=['http://localhost:4173/','file:///'+root.replaceAll('\\','/')+'/index.html'];
  if(process.env.ASHFALL_DEBUG_PACKAGED_DIR)bases.push('file:///'+path.resolve(process.env.ASHFALL_DEBUG_PACKAGED_DIR).replaceAll('\\','/')+'/index.html');
  for(const [mode,base] of bases.entries()){
   await navigate(base+'?test');
   const bytes=JSON.stringify({marks:100,best:741,wins:2,runs:8,relic:2,unknown:{keep:true}});
   await evaluate(`localStorage.setItem('ashfall.v1',${JSON.stringify(bytes)});localStorage.setItem('ashfall.language','ja');`);
   for(const language of ['ja','en']){
    // Seed only the preference in the preceding document. The new debug title
    // receives no click, key or language-change call before these assertions.
    await evaluate(`localStorage.setItem('ashfall.language',${JSON.stringify(language)});`);
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await navigate(base+'?debug');
    assert.equal(await evaluate('typeof window.AshfallTest'),'undefined');
    assert.equal(await evaluate('document.documentElement.lang'),language);
    assert.equal(await evaluate("document.getElementById('title').hidden"),false);
    assert.equal(await evaluate("document.getElementById('debugBadge').hidden"),false);
    assert.equal(await evaluate("document.getElementById('debugOpen').hidden"),false);
    assert.equal(await evaluate("document.getElementById('debugOpen').disabled"),true);
    assert.equal(await evaluate("document.getElementById('debugPanel').hidden"),true);
    const badge=await evaluate(`(()=>{const el=document.getElementById('debugBadge'),r=el.getBoundingClientRect(),style=getComputedStyle(el);return {text:el.innerText,visible:style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0&&r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight};})()`);
    assert.equal(badge.visible,true);assert.equal(badge.text,language==='ja'?'開発デバッグ · 無敵 OFF':'DEVELOPER DEBUG · Invincible OFF');
    assert.ok(await evaluate("document.getElementById('debugAvailability').innerText.length>0"));
    assert.equal(await evaluate("localStorage.getItem('ashfall.v1')"),bytes);
    assert.equal(await evaluate("localStorage.getItem('ashfall.language')"),language);
    startup.push({base,language,...badge});
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,`${mode}-${language}-initial-title.png`),Buffer.from(shot.data,'base64'));
   }
   passed(`${base}: Japanese/English debug title is visible immediately without interaction`);
   for(const [width,height] of [[1440,900],[1024,640],[640,480]])for(const language of ['ja','en']){
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await click(language==='ja'?'#languageJa':'#languageEn');await click('#startButton');await click('#debugOpen');
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    assert.equal(await evaluate("document.getElementById('debugPanel').hidden"),false);
    await set('debugUpgrade','quick');await click('#debugGrant');
    assert.ok(await evaluate("document.getElementById('buildChips').innerText.length>0"));
    await set('debugSeconds','180');await click('#debugAdvance');assert.equal(await evaluate("document.getElementById('timeText').textContent"),'03:00');
    await set('debugEnemy','runner');await set('debugCount','3');await click('#debugEnemySpawn');await click('#debugInvincible');
    await evaluate("document.getElementById('debugSeconds').focus()");
    for(const [code,value] of [['KeyW','w'],['Space',' '],['KeyP','p'],['KeyM','m'],['Digit1','1']])await key(code,value);
    assert.equal(await evaluate("document.getElementById('debugPanel').hidden"),false);
    const layout=await evaluate(`(()=>{const el=document.querySelector('.debug-panel'),r=el.getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&el.scrollWidth<=el.clientWidth+1,text:el.innerText};})()`);
    assert.ok(layout.fits,JSON.stringify(layout));if(language==='en')assert.ok(!/[一-龯ぁ-んァ-ン]/.test(layout.text));
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,`${mode}-${language}-${width}.png`),Buffer.from(shot.data,'base64'));
    await key('Escape','Escape');assert.equal(await evaluate("document.getElementById('pause').hidden"),false);
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await click('#resumeButton');await key('KeyP','p');await click('#quitButton');
    assert.equal(await evaluate("localStorage.getItem('ashfall.v1')"),bytes);
   }
   passed(`${base}: debug without test API, real UI/input, bilingual scroll layout and unchanged save`);
   await navigate(base+'?test&debug');await click('#startButton');await click('#debugOpen');
   await set('debugBoss','elite');await click('#debugBossSpawn');await click('#debugBossSpawn');assert.equal(await evaluate("AshfallTest.run.enemies.filter(e=>!e.dead&&e.type==='elite').length"),1);
   await set('debugSeconds','540');await click('#debugAdvance');await click('#debugClose');await click('#resumeButton');await evaluate('AshfallTest.update(0)');
   assert.equal(await evaluate("AshfallTest.run.enemies.filter(e=>!e.dead&&e.type==='elite').length"),1);
   await evaluate("AshfallTest.hurtEnemy(AshfallTest.run.boss,1e8,'stitch')");await click('#debugOpen');await set('debugBoss','boss');await click('#debugBossSpawn');await evaluate("AshfallTest.hurtEnemy(AshfallTest.run.boss,1e8,'stitch')");
   assert.equal(await evaluate('AshfallTest.state'),'result');assert.equal(await evaluate("localStorage.getItem('ashfall.v1')"),bytes);
   await click('#restartButton');assert.equal(await evaluate('AshfallTest.debug.snapshot().invincible'),false);await evaluate('AshfallTest.finish(false)');await click('#titleButton');
   assert.equal(await evaluate("localStorage.getItem('ashfall.v1')"),bytes);
   await navigate(base+'?test');assert.equal(await evaluate('typeof AshfallTest.debug'),'undefined');assert.equal(await evaluate("document.getElementById('debugBadge').hidden"),true);
   assert.equal(await evaluate("document.getElementById('debugOpen').hidden"),true);assert.equal(await evaluate("document.getElementById('debugAvailability').textContent"),'');
   await click('#startButton');assert.equal(await evaluate('AshfallTest.run.upgradesTaken'),0);passed(`${base}: manual/scheduled boss transitions, result/retry and normal reload isolation`);
  }
  await navigate('http://localhost:4173/?test&debug');await click('#startButton');await key('KeyP','p');await click('#pauseFullscreen');
  const fullscreen=await evaluate('!!document.fullscreenElement');
  if(fullscreen){await click('#debugOpen');await evaluate('document.exitFullscreen()');assert.equal(await evaluate('AshfallTest.state'),'debug');await click('#debugClose');assert.equal(await evaluate('AshfallTest.state'),'paused');}
  await evaluate("AshfallTest.resume();AshfallTest.debug.open();window.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('visibilitychange'))");assert.equal(await evaluate('AshfallTest.state'),'debug');
  assert.equal(errors.length,0,JSON.stringify(errors));passed('fullscreen exit, blur/visibility and zero browser exceptions');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({date:new Date().toISOString(),browser:(await send('Browser.getVersion')).product,checks,startup,fullscreen,runtimeErrors:errors.length,limits:'Frozen fixtures and CDP keyboard/mouse. Physical Escape, live combat feel and human usefulness remain Producer checks.'},null,2));
 } finally {if(freezeScript)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:freezeScript}).catch(()=>{});ws.close();for(const p of pending.values())clearTimeout(p.timer);}
})().catch(e=>{console.error(e);process.exitCode=1;});
