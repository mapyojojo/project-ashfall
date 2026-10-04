const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),{version}=require('../version.js');
(async()=>{
 const targets=await(await fetch(`http://127.0.0.1:${process.env.ASHFALL_CDP_PORT||9223}/json`)).json();
 const target=targets.find(t=>t.type==='page'&&(t.url.startsWith('http://localhost:4173/')||t.url.startsWith('file:///')&&t.url.includes('/index.html')));assert.ok(target,'dedicated Ashfall browser');
 const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[],checks=[],layouts=[];let next=0;
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>reject(Error(method)),15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const navigate=async url=>{await send('Page.navigate',{url});await wait(300);};
 const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});};
 const key=async(code,value)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:value});await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:value});};
 const passed=name=>{checks.push(name);console.log('PASS',name);};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'docs/screenshots',`v${version}-${name}.png`),Buffer.from(r.data,'base64'));};
 async function layout(screen,selector,language,width,height,screenshot=true){
   const check=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();const overflow=[el,...el.querySelectorAll('*')].filter(e=>e.clientWidth&&e.scrollWidth>e.clientWidth+2).map(e=>({tag:e.tagName,id:e.id,class:e.className,extra:e.scrollWidth-e.clientWidth}));return {bounds:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},overflow,scrollable:el.scrollHeight>el.clientHeight+1,text:el.innerText};})()`);
   assert.ok(check.bounds.left>=-1&&check.bounds.right<=width+1,screen+' horizontal bounds '+JSON.stringify(check));
   assert.ok(check.bounds.top>=-1&&check.bounds.bottom<=height+1,screen+' vertical bounds '+JSON.stringify(check));
   assert.deepEqual(check.overflow,[],screen+' horizontal overflow');
   if(language==='en')assert.ok(!/[一-龯ぁ-んァ-ン]/.test(check.text.replace('日本語','')),screen+' Japanese copy in English');
   layouts.push({screen,language,width,height,scrollable:check.scrollable});
   if(screenshot)await shot(`${language}-${width}-${screen}`);
 }
 let freezeScript;
 try{
   await send('Runtime.enable');await send('Page.enable');
   // Fixtures freeze animation only; all controls still use actual keyboard/mouse events.
   freezeScript=(await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.requestAnimationFrame=()=>0;'})).identifier;
   await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
   await navigate('http://localhost:4173/?test');
   const oldMeta={marks:31,best:741,wins:2,runs:8,relic:3};
   await evaluate(`localStorage.clear();localStorage.setItem('ashfall.v1',${JSON.stringify(JSON.stringify(oldMeta))});`);
   await navigate('http://localhost:4173/?test');
   assert.equal(await evaluate('AshfallI18n.getLanguage()'),await evaluate("/^ja(?:-|$)/i.test(navigator.language)?'ja':'en'"));
   await click('#languageEn');assert.equal(await evaluate('document.documentElement.lang'),'en');
   assert.equal(await evaluate('localStorage.getItem("ashfall.v1")'),JSON.stringify(oldMeta));
   await navigate('http://localhost:4173/?test');assert.equal(await evaluate('AshfallI18n.getLanguage()'),'en');
   assert.deepEqual(await evaluate('AshfallTest.meta'),oldMeta);
   passed('browser default, real title language click, reload persistence and unchanged v0.7.1 save bytes');
   for(const [width,height] of [[1440,900],[1024,640]]){
     await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
     for(const language of ['ja','en','ja']){
       await evaluate('AshfallTest.goTitle();AshfallTest.drawTitle()');await click(language==='ja'?'#languageJa':'#languageEn');
       const screenshot=language==='en'||layouts.filter(l=>l.screen==='title'&&l.width===width&&l.language==='ja').length===0;
       await layout('title','#title',language,width,height,screenshot);
       await click('#helpButton');await layout('help','.help-panel',language,width,height,screenshot);await click('#closeHelp');
       await click('#relicButton');await layout('loadout','.relic-panel',language,width,height,screenshot);
       assert.equal(await evaluate("document.querySelectorAll('.relic-card').length"),3);await click('[data-relic="3"]');await click('#closeRelics');
       await click('#startButton');assert.equal(await evaluate('AshfallTest.run.player.shots'),2);
       await evaluate("AshfallTest.apply('pierce');AshfallTest.apply('heavy');AshfallTest.apply('quick');AshfallTest.apply('chain');AshfallTest.apply('dense');AshfallTest.apply('pressure');AshfallTest.updateHud();AshfallTest.drawGame()");
       await layout('hud','#hud',language,width,height,screenshot);
       await key('KeyP','p');await layout('pause','#pause .panel',language,width,height,screenshot);
       await click('#pauseHelp');await layout('pause-help','.help-panel',language,width,height,false);await click('#closeHelp');await key('KeyP','p');
       await evaluate('AshfallTest.addXp(20);AshfallTest.update(.01)');
       const ids=await evaluate('AshfallTest.run.cards.map(u=>u.id)');
       for(const alternate of [language==='ja'?'en':'ja',language])await evaluate(`AshfallI18n.setLanguage('${alternate}')`);
       assert.deepEqual(await evaluate('AshfallTest.run.cards.map(u=>u.id)'),ids);
       await layout('upgrades','.upgrade-panel',language,width,height,screenshot);
       const all=await evaluate('AshfallTest.UPGRADES.map(u=>u.id)');
       for(let n=0;n<all.length;n+=3){await evaluate(`(()=>{const a=AshfallTest;a.run.cards=${JSON.stringify(all.slice(n,n+3))}.map(id=>a.UPGRADES.find(u=>u.id===id));AshfallI18n.setLanguage('${language==='ja'?'en':'ja'}');AshfallI18n.setLanguage('${language}');})()`);await layout('all-cards-'+n,'.upgrade-panel',language,width,height,false);}
       await key('Digit1','1');assert.equal(await evaluate('AshfallTest.state'),'playing');
       await evaluate('AshfallTest.finish(false)');await layout('result','.result-panel',language,width,height,screenshot);
       const meta=await evaluate('JSON.stringify(AshfallTest.meta)');await evaluate(`AshfallI18n.setLanguage('${language==='ja'?'en':'ja'}');AshfallI18n.setLanguage('${language}');`);assert.equal(await evaluate('JSON.stringify(AshfallTest.meta)'),meta);
       await click('#restartButton');await evaluate('AshfallTest.finish(true)');await layout('victory','.result-panel',language,width,height,screenshot);
     }
   }
   passed('all screens and all 23 upgrades fit in Japanese, English and Japanese again at 1440x900 and 1024x640');
   await evaluate("AshfallTest.goTitle();AshfallI18n.setLanguage('en')");await click('#fullscreenButton');await wait(150);assert.equal(await evaluate('!!document.fullscreenElement'),true);
   await click('#startButton');await key('KeyP','p');await click('#pauseFullscreen');await wait(150);assert.equal(await evaluate('AshfallTest.state'),'paused');
   await click('#pauseFullscreen');await wait(150);await key('KeyP','p');await evaluate('document.exitFullscreen()');await wait(150);assert.equal(await evaluate('AshfallTest.state'),'paused');await key('Escape','Escape');assert.equal(await evaluate('AshfallTest.state'),'paused');await key('KeyP','p');assert.equal(await evaluate('AshfallTest.state'),'playing');
   await key('KeyM','m');assert.equal(await evaluate('document.getElementById("pauseSound").textContent'),'Sound OFF [M]');
   passed('English fullscreen enter/exit, auto-pause, Escape, P and mute labels preserve control behavior');
   await navigate('file:///'+root.replaceAll('\\','/')+'/index.html?test');await click('#languageEn');await click('#startButton');assert.equal(await evaluate('AshfallTest.state'),'playing');
   assert.equal(await evaluate('document.getElementById("versionLabel").textContent'),`v${version}`);
   await key('KeyP','p');await click('#quitButton');await click('#languageJa');await navigate('file:///'+root.replaceAll('\\','/')+'/index.html?test');assert.equal(await evaluate('AshfallI18n.getLanguage()'),'ja');
   passed('offline file entry loads all modules, starts in English and saves a switch back to Japanese');
   assert.deepEqual(errors,[]);passed('zero browser runtime exceptions');
   fs.writeFileSync(path.join(root,'i18n-ui-verification.json'),JSON.stringify({version,browser:(await send('Browser.getVersion')).product,checks,layouts,runtimeErrors:errors.length,limits:'Deterministic UI fixtures and actual input. Panels may scroll vertically; all descendants are checked for horizontal clipping. Physical Escape, other engines and human English review remain manual checks.'},null,2));
 }finally{if(freezeScript)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:freezeScript});ws.close();for(const p of pending.values())clearTimeout(p.timer);}
})().catch(error=>{console.error(error);process.exitCode=1;});
