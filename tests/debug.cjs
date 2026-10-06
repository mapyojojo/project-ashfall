const assert=require('node:assert/strict');
const {engine}=require('./harness.cjs');
let passed=0;
function test(name,fn){fn();console.log('PASS',name);passed++;}
const create=options=>{const a=engine({debug:true,...options});a.debug.open();return a;};
const act=(a,name,value)=>a.debug.act(name,value);
test('normal startup has no debug API, handlers, badge, save suppression or invincibility',()=>{
 const a=engine();assert.equal(a.debug,undefined);assert.equal(a.elements.get('debugOpen')?.onclick,undefined);
 a.finish(true);assert.equal(JSON.parse(a.storage['ashfall.v1']).wins,1);
});
test('normal guardian/final scheduling and future RNG match the sprint baseline across all time thresholds',()=>{
 const cp=require('node:child_process'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const source=cp.execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show','fda91afc6024e3bad677a5874ded6200402530c9:game.js'],{cwd:root}).toString();
 const before=engine({source}),after=engine();
 for(const time of [0,179.99,180,359.99,360,539.99,540,719.99,720,721]){
  for(const a of [before,after]){a.run.time=time;a.update(.01);}
  assert.equal(JSON.stringify(after.run),JSON.stringify(before.run),'time '+time);
 }
 for(const a of [before,after]){a.spawnEnemy('runner');a.rollUpgrades();}
 assert.equal(JSON.stringify(after.run),JSON.stringify(before.run));
});
test('panel pauses combat, rejects outside actions and clears held input before closing to pause',()=>{
 const a=engine({debug:true});assert.equal(act(a,'advance',60).key,'debug.pauseFirst');
 a.keys.add('KeyD');a.mouse.down=true;a.run.leapRequested=true;a.debug.open();
 assert.equal(a.state,'debug');assert.equal(a.keys.size,0);assert.equal(a.mouse.down,false);assert.equal(a.run.leapRequested,false);
 const before=JSON.stringify(a.run);a.update(10);assert.equal(JSON.stringify(a.run),before);
 for(const code of ['KeyW','Space','KeyF','KeyP','KeyM','Digit1'])a.events.window.keydown({code,preventDefault(){}});
 assert.equal(JSON.stringify(a.run),before);assert.equal(a.state,'debug');assert.equal(a.keys.size,0);
 a.resume();assert.equal(a.state,'debug');a.debug.close();assert.equal(a.state,'paused');a.resume();assert.equal(a.state,'playing');
 a.addXp(100);a.rollUpgrades();assert.equal(act(a,'grant','heavy').key,'debug.pending');a.debug.open();assert.equal(a.state,'upgrade');
 a.finish(false);assert.equal(act(a,'enemy',{type:'crawler',count:1}).key,'debug.ended');a.goTitle();assert.equal(act(a,'invincible').key,'debug.noRun');
});
test('grants obey ranks, prerequisites and exclusion without XP, level or pending-card consumption',()=>{
 const a=create(),p=a.run.player;const xp=p.xp,level=p.level,pending=a.run.pending;
 assert.equal(act(a,'grant','missing').key,'debug.invalid');assert.equal(act(a,'grant','chain').key,'debug.requires');assert.equal(act(a,'grant','ember').key,'debug.requires');
 assert.equal(act(a,'grant','quick').key,'debug.applied');assert.equal(act(a,'grant','chain').key,'debug.applied');
 act(a,'grant','width');assert.equal(act(a,'grant','short').key,'debug.excludes');
 for(let i=0;i<3;i++)act(a,'grant','heavy');assert.equal(act(a,'grant','heavy').key,'debug.max');
 assert.equal(p.ashPerHit,4);assert.equal(p.xp,xp);assert.equal(p.level,level);assert.equal(a.run.pending,pending);assert.equal(a.run.upgradesTaken,6);
 const reverse=create();act(reverse,'grant','short');assert.equal(act(reverse,'grant','width').key,'debug.excludes');
 for(const u of a.UPGRADES.filter(u=>u.id!=='ember'&&a.eligible(u,p)))while((p.upgrades[u.id]||0)<u.max)assert.equal(act(a,'grant',u.id).key,'debug.applied');
 assert.equal(act(a,'grant','ember').key,'debug.applied');assert.equal(a.run.upgradesTaken,Object.values(p.upgrades).reduce((a,b)=>a+b,0));
});
test('elapsed-only advance preserves all other simulation state and clamps at final spawn time',()=>{
 const a=create();a.spawnEnemy('brute',90,0);a.run.player.dashTimer=2;a.run.player.shotTimer=.5;a.run.player.hp=50;
 const snapshot=()=>JSON.stringify(a.run, (key,value)=>key==='time'?undefined:value),before=snapshot();
 for(const value of [-1,0,NaN,Infinity,'','oops',null,{},true])assert.equal(act(a,'advance',value).key,'debug.invalid');
 assert.equal(act(a,'advance','540.25').key,'debug.applied');assert.equal(a.run.time,540.25);assert.equal(snapshot(),before);assert.equal(a.elements.get('timeText').textContent,'09:00');
 a.debug.close();a.resume();a.update(0);assert.equal(a.run.enemies.filter(e=>!e.dead&&e.type==='elite').length,1);assert.equal(a.run.eliteWave,3);
 a.debug.open();act(a,'advance',10000);assert.equal(a.run.time,720);assert.equal(a.run.finalSpawned,false);assert.equal(act(a,'advance',1).key,'debug.timeMax');
 a.debug.close();a.resume();a.update(0);assert.equal(a.run.finalSpawned,true);assert.equal(a.run.enemies.filter(e=>!e.dead&&e.type==='boss').length,1);assert.equal(a.state,'playing');
});
test('manual guardians consume a scheduled slot, cannot duplicate and later time skips cannot stack bosses',()=>{
 const a=create();assert.equal(act(a,'boss','elite').key,'debug.applied');const guardian=a.run.boss;assert.equal(a.run.time,0);assert.equal(a.run.eliteWave,1);
 assert.equal(act(a,'boss','boss').key,'debug.bossAlive');assert.equal(act(a,'boss','elite').key,'debug.bossAlive');
 act(a,'advance',550);a.debug.close();a.resume();a.update(0);assert.equal(a.run.enemies.filter(e=>!e.dead&&e.type==='elite').length,1);assert.equal(a.run.boss,guardian);assert.equal(a.run.eliteWave,3);
 a.hurtEnemy(guardian,guardian.hp+1,'stitch');assert.equal(a.run.bosses,1);a.update(0);assert.equal(a.run.enemies.some(e=>!e.dead&&e.type==='elite'),false);
 a.debug.open();assert.equal(act(a,'boss','boss').key,'debug.applied');assert.equal(a.run.time,550);assert.equal(a.run.finalSpawned,true);
 act(a,'advance',1000);a.debug.close();a.resume();a.update(0);assert.equal(a.run.enemies.filter(e=>!e.dead&&e.type==='boss').length,1);
 a.hurtEnemy(a.run.boss,a.run.boss.hp+1,'stitch');assert.equal(a.state,'result');assert.equal(a.meta.wins,1);assert.equal(a.storage['ashfall.v1'],undefined);
});
test('enemy types, batch and living limits are enforced; positions and late stats use the real generator',()=>{
 const a=create();act(a,'advance',450);a.run.player.x=760;a.run.player.y=760;
 for(const type of ['boss','elite','missing','toString','__proto__'])assert.equal(act(a,'enemy',{type,count:1}).key,'debug.invalid');
 for(const count of [0,-1,26,1.5,Infinity,'',null,true])assert.equal(act(a,'enemy',{type:'crawler',count}).key,'debug.invalid');
 for(const type of a.debug.snapshot().enemies)assert.equal(act(a,'enemy',{type,count:1}).key,'debug.applied');
 for(const e of a.run.enemies){assert.ok(Math.abs(e.x)+e.r<780);assert.ok(Math.abs(e.y)+e.r<780);assert.equal(e.hp,a.TYPES[e.type].hp*1.5);}
 while(a.run.enemies.length<81)act(a,'enemy',{type:'crawler',count:25});
 assert.equal(act(a,'enemy',{type:'crawler',count:25}).key,'debug.enemyMax');
 a.run.enemies.forEach(e=>e.dead=true);assert.equal(act(a,'enemy',{type:'crawler',count:25}).key,'debug.applied');
});
test('invincibility protects contact, hostile bullets and hazards; movement, stitching, healing and OFF remain normal',()=>{
 const a=create();act(a,'invincible');a.debug.close();a.resume();const p=a.run.player;p.hp=50;
 a.spawnEnemy('crawler',p.x,p.y);a.run.hostile.push({x:p.x,y:p.y,vx:0,vy:0,r:5,life:2,damage:15});a.run.hazards.push({x:p.x,y:p.y,r:70,timer:0,life:1,damage:24,hit:false});
 a.keys.add('KeyD');a.update(.01);assert.equal(p.hp,50);assert.ok(p.x>0);assert.equal(p.invuln,0);
  const target=a.spawnEnemy('brute',100,0);a.seedEnemy(target,3);a.startDash(1,0);a.step(.2);assert.ok(a.run.leaps>0);
 a.run.pickups.push({x:p.x,y:p.y,life:10,heal:12});a.update(.01);assert.equal(p.hp,62);
 p.dashTime=0;p.invuln=0;a.debug.open();act(a,'invincible');a.debug.close();a.resume();a.hurtPlayer(10);assert.ok(p.hp<62);
 a.debug.open();act(a,'invincible');a.start();assert.equal(a.debug.snapshot().invincible,false);a.finish(false);a.start();assert.equal(a.debug.snapshot().invincible,false);
});
test('debug session preserves exact normal meta bytes through repair, loadout, win/loss, retry/title and language changes',()=>{
 for(const relic of [0,1,2,3,900]){
  const bytes=JSON.stringify({marks:100,best:740,wins:2,runs:8,relic,extra:{keep:true}}),storage={'ashfall.v1':bytes};
  const a=create({savedStorage:storage});a.goTitle();a.showRelics();a.selectRelic(3);a.start();a.debug.open();act(a,'advance',500);act(a,'invincible');a.finish(true);a.i18n.setLanguage('en');a.start();a.finish(false);a.goTitle();
  assert.equal(storage['ashfall.v1'],bytes);assert.equal(storage['ashfall.language'],'en');
  const normal=engine({savedStorage:storage,language:null});assert.equal(normal.debug,undefined);assert.equal(normal.run.player.upgrades.heavy,undefined);
 }
 const denied=create({storageDenied:true});act(denied,'advance',500);denied.finish(true);denied.goTitle();assert.equal(denied.state,'title');
});
test('locale switches only refresh presentation, preserve selections and never reapply an action',()=>{
 const a=create();a.elements.get('debugUpgrade').value='quick';act(a,'grant','quick');act(a,'advance',300);act(a,'enemy',{type:'runner',count:3});
 const before=JSON.stringify(a.run);a.i18n.setLanguage('en');a.i18n.setLanguage('ja');assert.equal(JSON.stringify(a.run),before);assert.equal(a.elements.get('debugUpgrade').value,'quick');
 a.document.hidden=true;a.events.document.visibilitychange();a.events.window.blur();assert.equal(a.state,'debug');assert.equal(JSON.stringify(a.run),before);
});
console.log(`${passed} developer debug checks passed.`);
