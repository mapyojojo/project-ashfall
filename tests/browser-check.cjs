const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'..'),imageDir=path.join(out,'docs','screenshots');
(async()=>{
 const targets=await(await fetch('http://127.0.0.1:9223/json')).json(),target=targets.find(t=>t.type==='page');assert.ok(target);
 const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[],checks=[];let next=0;
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const key=async(code,keyValue)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:keyValue});await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:keyValue});};
 const click=async id=>{const p=await evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(imageDir,name),Buffer.from(r.data,'base64'));};
 const passed=name=>{checks.push(name);console.log('PASS',name);};
 try{
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://localhost:4173/'});await wait(500);
  assert.equal(await evaluate('typeof AshfallTest'),'undefined');assert.ok(await evaluate("document.querySelector('footer').textContent.includes('v0.4')"));assert.equal(await evaluate("document.body.textContent.includes('リープ')"),false);await shot('title.png');passed('normal build starts with consistent player terminology');
  await send('Page.navigate',{url:'http://localhost:4173/?test'});await wait(400);await click('helpButton');assert.equal(await evaluate('AshfallTest.state'),'help');await click('closeHelp');passed('title/help navigation');
  // Explicit meta setup checks selection; natural combat below starts with the default relic.
  await evaluate('AshfallTest.meta.marks=0;AshfallTest.meta.relic=0');await click('relicButton');assert.equal(await evaluate('AshfallTest.state'),'relics');assert.equal(await evaluate("document.querySelectorAll('.relic-card').length"),4);assert.equal(await evaluate("document.querySelectorAll('.relic-card:disabled').length"),3);assert.ok(await evaluate("document.getElementById('relicChoices').textContent.includes('残火印 25')"));await shot('relics-locked.png');
  await evaluate('AshfallTest.meta.marks=12;AshfallTest.showRelics()');const needle=await evaluate("(()=>{const r=document.querySelector('[data-relic=\"1\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");await send('Input.dispatchMouseEvent',{type:'mousePressed',...needle,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...needle,button:'left',clickCount:1});assert.equal(await evaluate('AshfallTest.meta.relic'),1);assert.equal(await evaluate("document.querySelector('.relic-card.selected').getAttribute('aria-pressed')"),'true');await shot('relics-selected.png');await click('closeRelics');
  await send('Page.reload');await wait(350);assert.equal(await evaluate('AshfallTest.meta.relic'),1);await click('startButton');assert.equal(await evaluate('AshfallTest.run.player.wardBoost'),20);await key('Escape','Escape');await click('quitButton');await evaluate('AshfallTest.meta.marks=0;AshfallTest.selectRelic(0)');passed('four relic choices show locked costs, selection, persistence and actual loadout');
  await click('startButton');await wait(180);assert.equal(await evaluate('AshfallTest.audioState'),'running');passed('player click activates local audio');
  assert.equal(await evaluate('AshfallTest.run.enemies.length'),0);assert.ok(await evaluate('AshfallTest.run.bullets.length>0'));await shot('intro-autofire.png');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:980,y:450,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:980,y:450,button:'left',clickCount:1});await wait(80);assert.equal(await evaluate('AshfallTest.run.leaps'),0);await wait(1500);assert.equal(await evaluate('AshfallTest.run.enemies.length'),3);passed('enemy-free automatic shots precede the safe encounter; reflex click cannot waste the first stitch');
  const target=await evaluate('(()=>{const a=AshfallTest,e=a.run.enemies[0];return {x:innerWidth/2+e.x-a.run.camX,y:innerHeight/2+e.y-a.run.camY};})()');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...target});await wait(650);
  const prime=await evaluate('({kills:AshfallTest.run.kills,ash:AshfallTest.run.enemies[0].ash,stage:AshfallTest.run.onboarding.stage,preview:AshfallTest.predictLeap().ash})');
  assert.equal(prime.kills,0);assert.ok(prime.ash>0&&prime.preview>0);assert.equal(prime.stage,1);await shot('prepared.png');passed('real shots create visible ash before any kill');
  const expected=await evaluate('AshfallTest.predictLeap()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyW',key:'w'});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...target,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...target,button:'left',clickCount:1});await wait(220);
  await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyW',key:'w'});await wait(350);
  assert.ok(await evaluate('AshfallTest.run.poweredLeaps===1&&AshfallTest.run.stitchKills>0'));assert.equal(await evaluate('AshfallTest.run.onboarding.stage'),2);assert.ok(await evaluate(`Math.abs(AshfallTest.run.stitches[0].bx-(${expected.bx}))<8&&Math.abs(AshfallTest.run.stitches[0].by-(${expected.by}))<8`));await shot('first-leap.png');passed('left click overrides held WASD, harvests ash and reaches preview endpoint');
  const learned=await evaluate('({...AshfallTest.run.onboarding,time:AshfallTest.run.time})');assert.ok(learned.firstKill<60);passed('opening cycle completes within first minute without state injection');
  await key('Escape','Escape');assert.equal(await evaluate('AshfallTest.state'),'paused');const pausedTime=await evaluate('AshfallTest.run.time');await wait(80);assert.equal(await evaluate('AshfallTest.run.time'),pausedTime);await click('resumeButton');passed('pause/resume stops game time');
  assert.equal(await evaluate('AshfallTest.run.player.autoFire'),true);await key('KeyF','f');assert.equal(await evaluate('AshfallTest.run.player.autoFire'),false);await key('KeyF','f');assert.equal(await evaluate('AshfallTest.run.player.autoFire'),true);passed('preparation defaults on and can be paused');
  // Seven game minutes of actual input, past both the first guardian and the five-minute ramp.
  // No writes to run state, HP, fuel, XP or the clock during natural combat.
 const goal=Number(process.env.ASHFALL_BROWSER_SECONDS||420),wallStart=Date.now(),held=new Set(),preference=['pierce','ricochet','quick','heavy','scatter','echo','heal','width','vital','frost','rapid','magnet','regen','spill','orbit'];
  let nextLog=30,upgradeSaved=false,minuteSaved=false,upgradeCount=0;
  while(Date.now()-wallStart<(goal+90)*1000){
   const status=await evaluate(`(()=>{const a=AshfallTest,r=a.run;if(a.state!=='playing')return {state:a.state,time:r?.time,cards:r?.cards.map(u=>u.id)};const p=r.player;let target=null,bestTarget=Infinity;for(const e of r.enemies){const d=Math.hypot(e.x-p.x,e.y-p.y),cap=p.ashCap+(e.type==='boss'||e.type==='elite'?6:0),s=d+(e.ash>=cap?180:0);if(!e.dead&&s<bestTarget){bestTarget=s;target=e;}}const angle=r.time*.23;let dx=(Math.cos(angle)*350-p.x)/120,dy=(Math.sin(angle)*350-p.y)/120;for(const e of r.enemies){const ex=p.x-e.x,ey=p.y-e.y,d=Math.hypot(ex,ey)||1;if(d<e.r+110){dx+=ex/d*(e.r+110-d)/50;dy+=ey/d*(e.r+110-d)/50;}}for(const b of r.hostile){const ex=p.x-b.x,ey=p.y-b.y,d=Math.hypot(ex,ey)||1;if(d<65){dx+=ex/d*(65-d)/25;dy+=ey/d*(65-d)/25;}}let route=null,value=0;if(p.dashTimer<=0||p.bonusStitch)for(let i=0;i<24;i++){const angle=i/24*Math.PI*2,ux=Math.cos(angle),uy=Math.sin(angle),s=a.predictLeap(ux,uy);const fuel=s.ash+(p.bonusStitch?.fuel||0);if(!fuel)continue;let score=fuel*5+s.targets*35;for(const e of r.enemies){if(a.segmentDistance(e.x,e.y,p.x,p.y,s.bx,s.by)<p.stitchWidth+e.r)score+=Math.min(e.hp,a.stitchDamage(fuel,e.ash||0,s.danger));if(Math.hypot(e.x-s.bx,e.y-s.by)<e.r+28)score-=e.damage*12;}if(score>value){value=score;route={ux,uy};}}return {state:a.state,time:r.time,hp:p.hp,kills:r.kills,powered:r.poweredLeaps,target:target?{x:innerWidth/2+target.x-r.camX,y:innerHeight/2+target.y-r.camY}:null,dx,dy,route:route?{x:innerWidth/2+p.x-r.camX+route.ux*300,y:innerHeight/2+p.y-r.camY+route.uy*300}:null};})()`);
   if(status.state==='result')throw new Error(`Natural browser player died at ${status.time.toFixed(1)} seconds.`);
   if(status.state==='upgrade'){
    if(!upgradeSaved){await shot('upgrades.png');upgradeSaved=true;}
    const low=await evaluate('AshfallTest.run.player.hp/AshfallTest.run.player.maxHp<.75');
    let best=0,rank=id=>{if(low&&id==='vital')return -2;if(low&&id==='heal')return -1;const n=preference.indexOf(id);return n<0?999:n;};for(let i=1;i<status.cards.length;i++)if(rank(status.cards[i])<rank(status.cards[best]))best=i;
    await key('Digit'+(best+1),String(best+1));upgradeCount++;held.clear();await wait(80);continue;
   }
   if(status.state!=='playing'){await wait(80);continue;}
   if(status.time>=goal)break;
   let desired=new Set();
   // Keep walking while attacking: WASD must never override the cursor route.
   if(Math.abs(status.dx)>.1)desired.add(status.dx>0?'KeyD':'KeyA');if(Math.abs(status.dy)>.1)desired.add(status.dy>0?'KeyS':'KeyW');
   for(const code of held)if(!desired.has(code))await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:code.slice(-1).toLowerCase()});
   for(const code of desired)if(!held.has(code))await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:code.slice(-1).toLowerCase()});held.clear();for(const code of desired)held.add(code);
   if(status.route){await send('Input.dispatchMouseEvent',{type:'mouseMoved',...status.route});await send('Input.dispatchMouseEvent',{type:'mousePressed',...status.route,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...status.route,button:'left',clickCount:1});}
   else if(status.target)await send('Input.dispatchMouseEvent',{type:'mouseMoved',...status.target});
   if(!minuteSaved&&status.time>=60){await shot('gameplay.png');minuteSaved=true;}
   if(status.time>=nextLog){console.log(`BROWSER ${status.time.toFixed(0)}s / HP ${Math.ceil(status.hp)} / ${status.kills} kills / ${status.powered} powered leaps`);nextLog+=30;}
   await wait(160);
  }
  for(const code of held)await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:code.slice(-1).toLowerCase()});
  const natural=await evaluate('(()=>{const r=AshfallTest.run,total=Object.values(r.damageTotals).reduce((a,b)=>a+b,0);return {time:r.time,hp:r.player.hp,kills:r.kills,level:r.player.level,bosses:r.bosses,poweredLeaps:r.poweredLeaps,comboLeaps:r.comboLeaps,bonusLeaps:r.bonusLeaps,bulletsCleared:r.bulletsCleared,upgrades:r.player.upgrades,damageTotals:r.damageTotals,stitchDamageShare:r.damageTotals.stitch/total,onboarding:r.onboarding};})()');
  assert.ok(natural.time>=goal);assert.ok(natural.hp>0&&natural.poweredLeaps>10);assert.ok(natural.stitchDamageShare>.85);assert.ok(upgradeCount>0);if(goal>=420)assert.ok(natural.bosses>0&&natural.comboLeaps>0&&natural.bulletsCleared>0);await shot('seven-minute.png');passed(`${goal} game seconds through actual keyboard/mouse input`);passed('natural upgrade choices through number keys');passed('natural damage is dominated by ash stitch');
  await key('Escape','Escape');await click('quitButton');await click('startButton');assert.equal(await evaluate('AshfallTest.run.poweredLeaps'),0);passed('title/restart reset cycle statistics');
  // Direct state setup below is reserved for stress, boss transitions and layout tests.
  await evaluate(`(()=>{const a=AshfallTest;a.run.time=719.99;a.update(.02);})()`);assert.equal(await evaluate('AshfallTest.run.boss.type'),'boss');await shot('boss.png');passed('existing final boss transition');
  await evaluate("AshfallTest.hurtEnemy(AshfallTest.run.boss,1e9,'stitch')");assert.equal(await evaluate('AshfallTest.state'),'result');await shot('victory.png');passed('victory screen');
  await click('restartButton');await evaluate('AshfallTest.hurtPlayer(1e9)');assert.equal(await evaluate('AshfallTest.state'),'result');passed('death and restart');
  await click('titleButton');await send('Emulation.setDeviceMetricsOverride',{width:1024,height:640,deviceScaleFactor:1,mobile:false});await wait(100);await shot('compact-title.png');
  await click('relicButton');await shot('compact-relics.png');assert.equal(await evaluate("Array.from(document.querySelectorAll('.relic-card')).some(e=>e.getBoundingClientRect().bottom>innerHeight)"),false);await key('Escape','Escape');passed('1024x640 relic selection panel and Escape navigation');
  await click('startButton');await evaluate('AshfallTest.addXp(20);AshfallTest.update(.01)');await wait(80);await shot('compact-upgrades.png');assert.equal(await evaluate("Array.from(document.querySelectorAll('.upgrade-card')).some(e=>e.getBoundingClientRect().bottom>innerHeight)"),false);passed('1024x640 title/upgrade layout');
  await evaluate('AshfallTest.chooseUpgrade(0)');await wait(80);assert.ok(await evaluate("document.getElementById('coach').getBoundingClientRect().right<innerWidth"));passed('compact coach and route HUD');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate(`(()=>{const a=AshfallTest;a.run.enemies=[];a.run.time=540;a.run.eliteWave=3;a.run.player.invuln=100;for(let i=0;i<130;i++){const e=a.spawnEnemy(['crawler','runner','shooter','brute','splitter'][i%5],Math.cos(i*2.4)*(180+i*3),Math.sin(i*2.4)*(180+i*3));a.seedEnemy(e,3);}a.run.player.ashSpill=2;for(let i=0;i<250;i++)a.run.ashes.push({x:(i%20)*20-200,y:Math.floor(i/20)*20-120,value:1,life:6,r:12,phase:i});a.drawGame();})()`);await wait(50);await shot('stress.png');passed('dense existing-enemy/fuel rendering');
  const satellite=await evaluate(`(()=>{const a=AshfallTest;a.start();a.run.enemies=[];a.run.spawnTimer=100;a.run.player.autoFire=false;a.apply('orbit');const e=a.spawnEnemy('brute',85,0);e.speed=0;a.update(.001);const before=e.ash;a.seedEnemy(e,1);e.seedCooldown=0;a.update(.1);return {before,after:e.ash,hp:e.hp,maxHp:e.maxHp};})()`);assert.equal(satellite.before,0);assert.equal(satellite.after,2);assert.equal(satellite.hp,satellite.maxHp);passed('satellite amplifies shot-marked enemies only');
  const phases=await require('./effect-scene.cjs')({evaluate,shot});passed('separate rendered harvest, windup, traveling front and final blast phases');
  const flow=await require('./flow-scene.cjs')({evaluate,shot});passed('rendered landing protection, bonus stitch, reverse echo, branch and contagion');
  await require('./ux-scene.cjs')({evaluate,send,shot,wait,click});passed('truthful intro readiness and compact cards with live synergy hints');
  await send('Page.navigate',{url:'file:///'+out.replaceAll('\\','/')+'/index.html?test'});await wait(400);await click('startButton');await wait(150);assert.equal(await evaluate('AshfallTest.state'),'playing');assert.equal(await evaluate("document.getElementById('dashText').textContent"),'仕込み');await shot('intro-autofire.png');passed('direct file startup with truthful introduction availability');
  assert.equal(errors.length,0,JSON.stringify(errors));passed('zero JavaScript runtime exceptions');
  fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({version:'0.4',date:'2026-10-01',browser:'Chromium headless shell 1243',passed:checks,runtimeErrors:errors.length,phases,flow,naturalInput:{goalSeconds:goal,wallSeconds:(Date.now()-wallStart)/1000,upgradesChosen:upgradeCount,...natural},limits:'Automated real-time input and visual inspection; not a human playtest. Relic/effects/stress/victory/layout tests use explicit test state setup.'},null,2));
  console.log(`Browser verification: ${checks.length} checks passed, 0 runtime errors.`);
 }finally{ws.close();for(const p of pending.values())clearTimeout(p.timer);}
})().catch(e=>{console.error(e);process.exitCode=1;});
