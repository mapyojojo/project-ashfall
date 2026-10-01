const assert=require('node:assert/strict');
// Explicit setups isolate each UX change. Natural combat is checked by browser-check.cjs.
module.exports=async function clarityScene({evaluate,send,shot}){
 const init=`const a=AshfallTest;a.start();a.seed(20261005);a.run.enemies=[];a.run.spawnTimer=100;a.run.onboarding.disabled=true;a.run.player.autoFire=false;a.mouse.active=false;`;
 const labels=async()=>evaluate(`(()=>{const a=AshfallTest,c=document.getElementById('game').getContext('2d'),original=c.fillText,text=[];c.fillText=function(t,...args){text.push(t);return original.call(this,t,...args);};try{a.updateHud();a.drawGame();}finally{c.fillText=original;}return text;})()`);
 await send('Emulation.setDeviceMetricsOverride',{width:1024,height:640,deviceScaleFactor:1,mobile:false});
 const ranks=[];
 // Inspect every finite card at every selectable rank in the actual DOM.
 for(const id of ['scatter','pierce','ricochet','rapid','heavy','width','quick','frost','echo','heal','spill','vital','magnet','regen']){
  await evaluate(`(()=>{${init}a.pause();document.getElementById('pause').hidden=true;})()`);
  const max=await evaluate(`AshfallTest.UPGRADES.find(u=>u.id==='${id}').max`);
  for(let current=0;current<max;current++){
   const record=await evaluate(`(()=>{const a=AshfallTest,u=a.UPGRADES.find(u=>u.id==='${id}');document.getElementById('upgrade').hidden=false;document.getElementById('upgradeCards').innerHTML=a.upgradeCard(u,0);const b=document.querySelector('.upgrade-card'),r=b.getBoundingClientRect();return {id:u.id,current:Number(b.dataset.current),next:Number(b.dataset.next),owned:b.querySelectorAll('[data-status="owned"]').length,selected:b.querySelectorAll('[data-status="next"]').length,locked:b.querySelectorAll('[data-status="locked"]').length,bottom:r.bottom,scroll:b.scrollHeight,height:b.clientHeight};})()`);
   assert.equal(record.current,current);assert.equal(record.next,current+1);assert.equal(record.owned,current);assert.equal(record.selected,1);assert.equal(record.locked,max-current-1);assert.ok(record.bottom<=640&&record.scroll<=record.height+1);ranks.push(record);
   if(id==='ricochet'&&current===1)await shot('v05-upgrade-stages.png');
   await evaluate(`AshfallTest.apply('${id}')`);
  }
 }
 // All three real offers remain visible together, including long descriptions and synergy notes.
 await evaluate(`(()=>{${init}a.apply('pierce');a.apply('ricochet');a.apply('quick');a.run.upgradesTaken=2;a.run.pending=1;for(let i=0;i<100;i++){a.rollUpgrades();if(a.run.cards.every(u=>['heavy','ricochet','pierce','quick','echo','heal','spill'].includes(u.id)))break;}a.drawGame();})()`);
 assert.equal(await evaluate(`Array.from(document.querySelectorAll('.upgrade-card')).some(b=>{const r=b.getBoundingClientRect();return r.bottom>innerHeight||b.scrollHeight>b.clientHeight+1;})`),false);await shot('v05-compact-upgrades.png');
 // Real mouse input selects the displayed stage, then the next offer reflects the acquired level.
 const choice=await evaluate(`(()=>{const a=AshfallTest,b=document.querySelector('.upgrade-card'),r=b.getBoundingClientRect();return {id:a.run.cards[0].id,next:Number(b.dataset.next),x:r.x+r.width/2,y:r.y+45};})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',x:choice.x,y:choice.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:choice.x,y:choice.y,button:'left',clickCount:1});assert.equal(await evaluate(`AshfallTest.run.player.upgrades['${choice.id}']`),choice.next);
 // Capture tutorial guide text before and after a real success sequence.
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await evaluate(`(()=>{${init}a.run.onboarding.disabled=false;a.run.onboarding.introduced=true;a.run.onboarding.firstSeed=2;a.run.onboarding.stage=1;a.run.time=2;const e=a.spawnEnemy('brute',140,0);e.speed=0;e.wake=1000;a.seedEnemy(e,3);a.pause();document.getElementById('pause').hidden=true;})()`);
 const beginner=await labels();assert.ok(beginner.includes('灰縫い · 着地で消弾'));await shot('v05-guide-beginner.png');
 const learned=await evaluate(`(()=>{const a=AshfallTest;a.resume();for(let i=0;i<3;i++){a.run.enemies=[];a.run.stitches=[];a.run.player.dashTimer=0;const e=a.spawnEnemy('crawler',a.run.player.x+(i%2?-100:100),0);e.speed=0;a.seedEnemy(e,3);a.startDash(i%2?-1:1,0);a.step(.4);}a.pause();document.getElementById('pause').hidden=true;a.updateHud();return {powered:a.run.poweredLeaps,help:a.showStitchHelp(),coach:document.getElementById('coach').hidden,route:document.getElementById('routeText').hidden};})()`);
 assert.equal(learned.powered,3);assert.equal(learned.help,false);assert.ok(learned.coach&&learned.route);const experienced=await labels();assert.ok(!experienced.some(t=>/着地点|着地で消弾|準備中|カーソルを重ねて/.test(t)));await shot('v05-guide-experienced.png');
 // Moving target comparison runs the real browser engine with/without branch guidance.
 const moving=await evaluate(`(()=>{const results=[];for(const piercing of [false,true])for(const guided of [false,true]){${init}a.apply('ricochet');if(piercing)a.apply('pierce');const first=a.spawnEnemy('brute',140,0),side=a.spawnEnemy('runner',230,60),column=a.spawnEnemy('brute',360,0);for(const e of [first,side,column])e.speed=0;side.charge=1;side.vx=0;side.vy=420;side.attack=10;a.run.player.autoFire=true;a.update(.01);a.run.player.autoFire=false;for(let i=0;i<65;i++){if(!guided)for(const b of a.run.bullets)if(b.fork)b.guideTarget=null;a.update(.01);}results.push({piercing,guided,sideAsh:side.ash,columnAsh:column.ash,kills:a.run.kills});}AshfallTest.pause();document.getElementById('pause').hidden=true;return results;})()`);
 for(const r of moving){assert.equal(r.sideAsh>0,r.guided);if(r.piercing)assert.ok(r.columnAsh>0);assert.equal(r.kills,0);}
 // Derive the result from actual actions, including path cuts and landing interception.
 const result=await evaluate(`(()=>{${init}a.apply('quick');for(const x of [80,170,260]){const e=a.spawnEnemy('brute',x,0);e.speed=0;a.seedEnemy(e,1);}for(const [x,y] of [[80,0],[100,0],[330,70]])a.run.hostile.push({x,y,vx:0,vy:0,life:7,damage:12,r:5});a.startDash(1,0);a.step(.2);a.startDash(-1,0);a.step(.2);a.finish(false);return {max:a.run.maxStitchTargets,triples:a.run.comboLeaps,returns:a.run.bonusLeaps,cleared:a.run.bulletsCleared,values:Array.from(document.querySelectorAll('#resultStats strong'),e=>parseInt(e.textContent)),labels:Array.from(document.querySelectorAll('#resultStats span'),e=>e.textContent)};})()`);
 assert.deepEqual(result.values,[3,1,1,3]);assert.equal(result.max,3);assert.equal(result.triples,1);assert.equal(result.returns,1);assert.equal(result.cleared,3);await shot('v05-result.png');
 await send('Emulation.setDeviceMetricsOverride',{width:1024,height:640,deviceScaleFactor:1,mobile:false});assert.ok(await evaluate(`document.querySelector('.result-panel').getBoundingClientRect().bottom<=innerHeight`));await shot('v05-compact-result.png');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 return {ranksTested:ranks.length,actualChoice:choice.id,beginner,learned,experienced,moving,result};
};
