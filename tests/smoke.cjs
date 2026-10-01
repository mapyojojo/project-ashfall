const assert=require('node:assert/strict');
const {engine}=require('./harness.cjs');
let passed=0;
function test(name,fn){fn();console.log('PASS',name);passed++;}
function foe(a,type='crawler',x=140,y=0){const e=a.spawnEnemy(type,x,y);e.speed=0;return e;}
function mark(a,e,n=3){a.seedEnemy(e,n);}
test('opening shows automatic fire first, then a safe encounter within stitch range',()=>{
 const a=engine({intro:true});assert.equal(a.state,'playing');assert.equal(a.run.player.hp,110);
 a.step(1.5);assert.equal(a.run.enemies.length,0);assert.ok(a.run.bullets.length>0);assert.equal(a.run.onboarding.stage,0);assert.equal(a.elements.get('dashText').textContent,'仕込み');a.startDash(1,0);assert.equal(a.run.leaps,0);
 a.step(.11);assert.equal(a.run.enemies.length,3);assert.ok(a.run.enemies.every(e=>Math.hypot(e.x,e.y)<a.run.player.dashDistance&&e.wake>11));assert.ok(a.run.onboarding.stage<=1);
});
test('shooting primes a living foe before the first kill',()=>{
 const a=engine(),e=foe(a);a.run.player.autoFire=true;a.step(1);
 assert.equal(e.ash,3);assert.equal(e.dead,false);assert.ok(e.hp>=e.maxHp*.85);assert.equal(a.run.kills,0);assert.equal(a.run.player.xp,0);
 assert.ok(a.run.onboarding.firstSeed<1);assert.equal(a.run.onboarding.stage,1);
});
test('shooting alone cannot kill even with fully upgraded preparation',()=>{
 const a=engine(),e=foe(a,'brute');for(const id of ['scatter','pierce','ricochet','rapid','heavy'])for(let i=0;i<3;i++)a.apply(id);
 for(let i=0;i<2000;i++)a.hurtEnemy(e,99999,'bullet');assert.equal(e.dead,false);assert.equal(e.hp,e.maxHp*.85);assert.equal(a.run.kills,0);assert.equal(a.run.damageTotals.bullet,e.maxHp*.15);
});
test('ordinary movement never takes enemy-bound ash',()=>{
 const a=engine(),e=foe(a,'brute',40);mark(a,e);a.keys.add('KeyD');a.step(.15);assert.equal(e.ash,3);assert.equal(a.run.ashUsed,0);assert.equal(a.run.poweredLeaps,0);
});
test('an unprepared leap is an invulnerable escape, not an attack',()=>{
 const a=engine(),e=foe(a,'brute');a.startDash(1,0);a.hurtPlayer(90);a.step(.5);assert.equal(a.run.player.hp,110);assert.equal(e.hp,e.maxHp);assert.equal(a.run.dryLeaps,1);assert.equal(a.run.damageTotals.stitch,0);
});
test('prepared leap collects, kills, grows, and completes the lesson',()=>{
 const a=engine(),e=foe(a);mark(a,e);a.startDash(1,0);a.step(.4);
 assert.equal(e.ash,0);assert.ok(e.dead);assert.equal(a.run.ashUsed,3);assert.equal(a.run.stitchKills,1);assert.equal(a.run.poweredLeaps,1);
 assert.ok(a.run.player.xp>0||a.run.orbs.length>0);assert.equal(a.run.onboarding.stage,2);assert.ok(a.run.onboarding.firstKill<1);
});
test('leap capture requires crossing the foe, not merely a wide blast nearby',()=>{
 const a=engine(),e=foe(a,'brute',140,80);mark(a,e);a.startDash(1,0);a.step(.4);assert.equal(e.ash,3);assert.equal(a.run.ashUsed,0);assert.equal(e.hp,e.maxHp);
});
test('route preview agrees with captured ash and target count',()=>{
 const a=engine();for(const x of [80,170,260])mark(a,foe(a,'crawler',x),2);const prediction=a.predictLeap(1,0);assert.equal(prediction.ash,6);assert.equal(prediction.targets,3);
 a.startDash(1,0);a.step(.2);assert.equal(a.run.lastLeap.count,prediction.ash);assert.equal(a.run.lastLeap.targets,prediction.targets);
});
test('moving enemies are gathered along swept motion during a leap',()=>{
 const a=engine(),e=foe(a,'crawler',170,0);mark(a,e);a.startDash(1,0);a.update(.10);assert.equal(e.ash,0);assert.equal(a.run.leap.targets.get(e.id),3);assert.ok(e.stitchHold>0);
});
test('a group crossing earns more power and a shorter cooldown than a single crossing',()=>{
 const solo=engine();mark(solo,foe(solo),3);solo.startDash(1,0);solo.step(.2);
 const group=engine();for(const x of [80,170,260])mark(group,foe(group,'crawler',x),1);group.startDash(1,0);group.step(.2);
 assert.equal(group.run.lastLeap.count,solo.run.lastLeap.count);assert.ok(group.run.stitches[0].damage>solo.run.stitches[0].damage);assert.ok(group.run.player.dashTimer<solo.run.player.dashTimer);
});
test('hostile projectiles crossed by a leap are cleared exactly once',()=>{
 const a=engine();mark(a,foe(a));for(const x of [80,100,120])a.run.hostile.push({x,y:0,vx:0,vy:0,life:7,damage:12,r:5});a.startDash(1,0);a.step(.2);
 assert.equal(a.run.lastLeap.bulletsCut,3);assert.equal(a.run.hostile.length,0);assert.equal(a.run.player.hp,110);
});
test('crossing several foes grants the recovery upgrade, one safe foe does not',()=>{
 const a=engine();a.apply('heal');a.run.player.hp=50;for(const x of [80,170,260])mark(a,foe(a,'crawler',x),1);a.startDash(1,0);a.step(.2);assert.equal(a.run.player.hp,58);
 const b=engine();b.apply('heal');b.run.player.hp=50;mark(b,foe(b),3);b.startDash(1,0);b.step(.2);assert.equal(b.run.player.hp,50);
});
test('base recovery rewards a fueled dangerous crossing without requiring an upgrade',()=>{
 const a=engine();a.run.player.hp=50;for(const x of [80,170,260])mark(a,foe(a,'crawler',x),1);a.startDash(1,0);a.step(.2);assert.equal(a.run.player.hp,54);
 const b=engine();b.run.player.hp=50;for(const x of [90,210])foe(b,'crawler',x);b.startDash(1,0);b.step(.2);assert.equal(b.run.player.hp,50);
});
test('ground ash is generated by overflow and ordinary movement does not collect it',()=>{
 const a=engine(),e=foe(a,'brute',40);a.apply('spill');mark(a,e);a.step(.1);mark(a,e,1);assert.equal(a.run.ashes.length,1);
 a.keys.add('KeyD');a.step(.17);assert.equal(a.run.ashes.length,1);assert.equal(a.run.ashUsed,0);a.startDash(1,0);a.step(.2);assert.ok(a.run.ashUsed>=1);assert.equal(a.run.ashes.length,0);
});
test('ash is bounded, decays, and may be refreshed by a later hit',()=>{
 const a=engine(),e=foe(a,'brute');mark(a,e,999);assert.equal(e.ash,3);a.step(10.2);assert.ok(e.ash<3);a.seedEnemy(e,1);assert.equal(e.ash,3);assert.equal(e.ashLife,10);
});
test('bosses store more ash, supporting preparation without extra enemies',()=>{
 const a=engine(),e=foe(a,'boss');mark(a,e,99);assert.equal(e.ash,9);a.startDash(1,0);a.step(.5);assert.ok(e.hp<e.maxHp-300);assert.equal(e.ash,0);
});
test('kills do not supply infinite free ash for leap-only play',()=>{
 const a=engine(),e=foe(a);mark(a,e);a.startDash(1,0);a.step(.4);assert.ok(e.dead);assert.equal(a.run.ashes.length,0);
});
test('retired satellites are absent from choices; saved gear indices keep their identity',()=>{
 const a=engine({savedMeta:{marks:30,relic:2,wins:2,runs:5}});assert.equal(a.meta.relic,0);assert.equal(a.meta.marks,30);assert.equal(a.meta.wins,2);assert.equal(a.run.player.hp,110);
 assert.ok(a.UPGRADES.every(u=>u.id!=='orbit'));a.selectRelic(2);assert.equal(a.meta.relic,0);a.showRelics();assert.ok(!a.elements.get('relicChoices').innerHTML.includes('衛星'));
 const b=engine({savedMeta:{marks:30,relic:3}});assert.equal(b.meta.relic,3);assert.equal(b.run.player.shots,2);assert.equal(b.run.player.fireRate,.18*1.12);
});
test('burning stitch hits a late entrant once, not every frame',()=>{
 const a=engine();mark(a,foe(a));a.startDash(1,0);a.step(.4);const e=foe(a,'brute',140);e.hp=e.maxHp=500;a.update(.01);const hp=e.hp;assert.ok(hp<500);a.update(.01);assert.equal(e.hp,hp);
});
test('echo detonates only a fueled stitch and deals a second hit',()=>{
 const a=engine(),e=foe(a,'brute');e.hp=e.maxHp=1000;a.apply('echo');mark(a,e);a.startDash(1,0);a.step(.4);const hp=e.hp;a.step(.7);assert.ok(e.hp<hp);assert.ok(a.run.stitches[0].echoed);
 const b=engine(),f=foe(b,'brute');b.apply('echo');b.startDash(1,0);b.step(1);assert.equal(f.hp,f.maxHp);
});
test('experience and recovery are swept along the leap path',()=>{
 const a=engine();a.run.player.hp=50;a.run.orbs.push({x:100,y:0,value:4,life:75,pull:false});a.run.pickups.push({x:220,y:0,heal:12,life:25});a.startDash(1,0);a.step(.2);
 assert.equal(a.run.player.xp,4);assert.equal(a.run.player.hp,62);assert.equal(a.run.orbs.length,0);assert.equal(a.run.pickups.length,0);
});
test('cycle recovery does not reward idling or a dry leap',()=>{
 const a=engine();a.apply('regen');a.run.player.hp=50;a.step(1);assert.equal(a.run.player.hp,50);a.startDash(1,0);a.step(.3);assert.equal(a.run.player.hp,50);
 a.run.player.dashTimer=0;mark(a,foe(a,'crawler',a.run.player.x+100));a.startDash(1,0);a.step(.8);assert.ok(a.run.player.hp>50);
});
test('damage statistics count actual loss rather than overkill',()=>{
 const a=engine(),e=foe(a);a.hurtEnemy(e,10000,'stitch');assert.equal(a.run.damageTotals.stitch,30);
});
test('upgrades pause combat, then apply one selection exactly once',()=>{
 const a=engine();a.addXp(20);a.update(.01);assert.equal(a.state,'upgrade');const time=a.run.time;a.update(3);assert.equal(a.run.time,time);const id=a.run.cards[0].id;a.chooseUpgrade(0);assert.equal(a.state,'playing');assert.equal(a.run.player.upgrades[id],1);a.chooseUpgrade(0);assert.equal(a.run.player.upgrades[id],1);
});
test('first choice offers three arrangements of the same ash cycle',()=>{
 const a=engine();a.addXp(20);a.update(.01);assert.deepEqual(Array.from(a.run.cards,u=>u.id).sort(),['heavy','pierce','scatter']);
});
test('upgrade cards explain a live synergy with the current preparation',()=>{
 const a=engine();a.apply('pierce');a.run.upgradesTaken=1;let offered=false;for(let i=0;i<40;i++){a.run.pending=1;a.rollUpgrades();if(a.run.cards.some(u=>u.id==='ricochet')){offered=true;assert.ok(a.elements.get('upgradeCards').innerHTML.includes('今の貫通弾に、横への枝が付く'));break;}}assert.equal(offered,true);
});
test('multiple levels retain queued choices and leftover experience',()=>{
 const a=engine();a.addXp(200);a.update(.01);const n=a.run.pending;assert.ok(n>1);for(let i=0;i<n;i++)a.chooseUpgrade(0);assert.equal(a.state,'playing');assert.equal(a.run.upgradesTaken,n);
});
test('upgrades change mechanics without raising bullet damage',()=>{
 const a=engine(),damage=a.run.player.damage;for(const u of a.UPGRADES){const before=JSON.stringify(a.run.player);a.apply(u.id);assert.notEqual(JSON.stringify(a.run.player),before,u.id);assert.equal(a.run.player.damage,damage);}
 assert.equal(a.run.player.shots,3);assert.equal(a.run.player.pierce,2);assert.equal(a.run.player.bounce,1);assert.equal(a.run.player.ashPerHit,2);
});
test('all-max builds still get a selectable final upgrade',()=>{
 const a=engine();for(const u of a.UPGRADES)if(u.id!=='ember')a.run.player.upgrades[u.id]=u.max;a.run.upgradesTaken=40;a.run.pending=1;a.rollUpgrades();assert.equal(a.run.cards.length,1);assert.equal(a.run.cards[0].id,'ember');a.chooseUpgrade(0);assert.equal(a.state,'playing');
});
test('splitters still produce three small enemies',()=>{
 const a=engine(),e=foe(a,'splitter');a.hurtEnemy(e,999,'stitch');assert.equal(a.run.enemies.filter(e=>e.type==='mite').length,3);
});
test('all three guardians and the final boss still appear',()=>{
 const a=engine();for(let wave=1;wave<=3;wave++){a.run.time=180*wave;a.update(.01);assert.equal(a.run.boss.type,'elite');a.hurtEnemy(a.run.boss,1e9,'stitch');}
 a.run.time=719.99;a.update(.02);assert.equal(a.run.boss.type,'boss');a.hurtEnemy(a.run.boss,1e9,'stitch');assert.equal(a.state,'result');assert.equal(a.meta.wins,1);a.finish(true);assert.equal(a.meta.wins,1);
});
test('loss and restart clear run state while preserving meta progression',()=>{
 const a=engine();a.run.time=95;a.hurtPlayer(1e9);assert.equal(a.state,'result');const marks=a.meta.marks;assert.ok(marks>0);a.start();assert.equal(a.run.time,0);assert.equal(a.run.poweredLeaps,0);assert.equal(a.run.damageTotals.stitch,0);assert.equal(a.meta.marks,marks);
});
test('pause and title stop simulation',()=>{
 const a=engine();a.run.leapRequested=true;a.pause();a.update(1);assert.equal(a.run.time,0);assert.equal(a.run.leapRequested,false);a.resume();assert.equal(a.state,'playing');a.update(.01);assert.equal(a.run.leaps,0);a.goTitle();assert.equal(a.run,null);
});
test('diagonal normalization, walls, and cooldown remain consistent',()=>{
 const a=engine();a.keys.add('KeyD');a.keys.add('KeyS');a.update(.1);assert.ok(Math.abs(Math.hypot(a.run.player.x,a.run.player.y)-22.5)<.01);a.keys.clear();a.run.player.x=750;a.startDash(1,0);a.step(.2);assert.equal(a.run.player.x,760);const leaps=a.run.leaps;a.startDash(-1,0);assert.equal(a.run.leaps,leaps);
});
test('enemy patterns and bounded effects remain finite',()=>{
 const a=engine();for(const type of Object.keys(a.TYPES))a.spawnEnemy(type,300,100);for(let i=0;i<1200;i++){a.run.player.invuln=100;a.update(1/60);}
 assert.ok(a.run.hostile.length>0);assert.ok(a.run.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.hp)));assert.ok(a.run.particles.length<=650);assert.ok(a.run.hostile.length<300);
});
test('automatic preparation is enabled for an ordinary new run',()=>{
 const a=engine({intro:true});assert.equal(a.run.player.autoFire,true);a.step(2.5);assert.ok(a.run.enemies.some(e=>e.ash>0));assert.equal(a.run.kills,0);
});
test('cursor direction overrides held movement and matches the endpoint',()=>{
 const a=engine();a.mouse.active=true;a.mouse.x=640;a.mouse.y=50;a.keys.add('KeyD');a.run.player.aim=-Math.PI/2;
 const route=a.predictLeap();assert.ok(Math.abs(route.bx)<.001);assert.equal(route.by,-310);
 a.run.leapRequested=true;a.update(.01);assert.ok(Math.abs(a.run.player.x)<.001);a.mouse.x=1000;a.mouse.y=600;a.step(.17);
 assert.ok(Math.abs(a.run.player.x-route.bx)<.001);assert.ok(Math.abs(a.run.player.y-route.by)<.001);
});
test('diagonal wall preview and locked endpoint agree without bending',()=>{
 const a=engine();a.run.player.x=750;a.run.player.y=720;const route=a.predictLeap(1,1);a.startDash(1,1);a.step(.18);
 assert.equal(a.run.player.x,route.bx);assert.equal(a.run.player.y,route.by);assert.equal(route.bx,760);assert.equal(route.by,730);
});
test('fuse has a windup and advances from origin to endpoint',()=>{
 const a=engine(),near=foe(a,'brute',60),far=foe(a,'brute',260);near.hp=near.maxHp=1000;far.hp=far.maxHp=1000;mark(a,near);mark(a,far);
 a.startDash(1,0);a.step(.24);assert.equal(near.hp,1000);assert.equal(far.hp,1000);assert.equal(a.run.stitches[0].exploded,false);
 a.step(.11);assert.ok(near.hp<1000);assert.equal(far.hp,1000);assert.ok(a.run.stitches[0].nodes>0&&a.run.stitches[0].nodes<11);
 const hp=near.hp;a.step(.25);assert.ok(far.hp<1000);assert.equal(near.hp,hp);assert.equal(a.run.stitches[0].nodes,11);
});
test('two marked targets do not accidentally grant the explicit three-target reward',()=>{
 const a=engine();a.run.player.hp=50;for(const x of [90,210])mark(a,foe(a,'crawler',x));a.startDash(1,0);a.step(.2);assert.equal(a.run.player.hp,50);
});
test('opening contact damage is half strength and later damage returns',()=>{
 const a=engine();a.hurtPlayer(10);assert.equal(a.run.player.hp,105);a.run.player.invuln=0;a.run.time=240;a.hurtPlayer(10);assert.equal(a.run.player.hp,95);
});
test('first two minutes spawn no shooters and respect the lower crowd cap',()=>{
 const a=engine();a.run.player.invuln=1000;a.run.spawnTimer=0;a.step(119);assert.ok(a.run.enemies.length<=45);assert.ok(a.run.enemies.every(e=>e.type!=='shooter'));
});
test('a held left button performs one cursor stitch without repeating or enabling shots',()=>{
 const a=engine();a.keys.add('KeyD');a.events.canvas.mousedown({button:0,clientX:640,clientY:50});a.step(.2);
 assert.equal(a.run.leaps,1);assert.ok(Math.abs(a.run.stitches[0].bx)<.001);assert.equal(a.run.stitches[0].by,-310);
 a.step(3);assert.equal(a.run.leaps,1);assert.equal(a.run.bullets.length,0);
 a.events.window.mouseup({});a.events.canvas.mousedown({button:0,clientX:640,clientY:50});a.step(.01);assert.equal(a.run.leaps,2);
});
test('SPACE is a cursor-based alternative and pausing cancels click requests',()=>{
 const a=engine();a.mouse.active=true;a.mouse.x=1000;a.mouse.y=360;a.keys.add('KeyW');
 a.events.window.keydown({code:'Space',preventDefault(){}});a.step(.2);assert.equal(a.run.leaps,1);assert.equal(a.run.stitches[0].bx,310);assert.ok(Math.abs(a.run.stitches[0].by)<.001);
 a.run.player.dashTimer=0;a.events.canvas.mousedown({button:0,clientX:1000,clientY:360});a.pause();a.resume();a.step(.1);assert.equal(a.run.leaps,1);
});
test('a cursor pressed against a wall never consumes a zero-length stitch',()=>{
 const a=engine();a.run.player.x=760;a.startDash(1,0);assert.equal(a.run.leaps,0);assert.equal(a.run.player.dashTimer,0);assert.equal(a.run.player.dashTime,0);
});
test('shooters keep a legible two-shot fan after minute five',()=>{
 const a=engine();a.run.time=270;a.run.eliteWave=1;const e=foe(a,'shooter',300);e.attack=0;a.update(.01);assert.equal(a.run.hostile.length,1);assert.equal(Math.round(Math.hypot(a.run.hostile[0].vx,a.run.hostile[0].vy)),135);assert.equal(e.attack,4);
 a.run.hostile=[];a.run.time=300;e.attack=0;a.update(.01);assert.equal(a.run.hostile.length,2);assert.equal(e.attack,3.3);assert.ok(a.run.hostile[0].vy*a.run.hostile[1].vy<0);
});
test('the first five minutes do not double the number of enemies in a spawn',()=>{
 const a=engine();a.run.time=270;a.run.eliteWave=1;a.run.spawnTimer=0;a.update(.01);assert.equal(a.run.enemies.length,1);
 a.run.time=300;a.run.spawnTimer=0;a.update(.01);assert.equal(a.run.enemies.length,3);
});
test('landing protection requires fuel and grows with both marks and crossed foes',()=>{
 const dry=engine();dry.startDash(1,0);dry.step(.2);assert.equal(dry.run.wards.length,0);
 const solo=engine();mark(solo,foe(solo),1);solo.startDash(1,0);solo.step(.2);const small=solo.run.wards[0];
 const triple=engine();for(const x of [80,170,260])mark(triple,foe(triple,'crawler',x),1);triple.startDash(1,0);triple.step(.2);const wide=triple.run.wards[0];
 assert.ok(wide.r>small.r+60&&wide.max>small.max*2);assert.equal(triple.run.comboLeaps,1);assert.equal(solo.run.comboLeaps,0);
 const predicted=triple.wardSpec(3,3);assert.equal(wide.r,predicted.radius);assert.equal(wide.max,predicted.life);
});
test('landing ward clears nearby bullets, intercepts fast incoming bullets, then expires',()=>{
 const a=engine();mark(a,foe(a));const bullet=(x,y,vx=0)=>({x,y,vx,vy:0,life:7,damage:10,r:5});
 a.run.hostile.push(bullet(330,70),bullet(310,230));a.startDash(1,0);a.step(.2);
 assert.equal(a.run.bulletsCleared,1);assert.equal(a.run.hostile.length,1);
 a.run.hostile.push(bullet(500,0,-25000));a.update(.01);assert.equal(a.run.bulletsCleared,2);assert.equal(a.run.player.hp,110);
 a.step(.6);assert.equal(a.run.wards.length,0);a.run.player.invuln=0;a.run.hostile.push(bullet(a.run.player.x,a.run.player.y));a.update(.001);assert.equal(a.run.player.hp,105);
});
test('ground telegraphs survive triple, single and dry stitches without shortening their warning',()=>{
 function scenario(n){const a=engine();for(const x of [80,170,260].slice(0,n))mark(a,foe(a,'crawler',x),1);const h={x:340,y:80,r:55,timer:1,life:2,hit:false,damage:24};a.run.hazards.push(h);a.startDash(1,0);a.step(.2);return {a,h};}
 for(const n of [0,1,3]){const {a,h}=scenario(n);assert.equal(a.run.hazards.length,1);assert.equal(h.hit,false);assert.ok(Math.abs(h.timer-.8)<.001&&Math.abs(h.life-1.8)<.001);a.step(.3);assert.equal(h.hit,false);assert.ok(Math.abs(h.timer-.5)<.001);}
});
test('a new ground warning inside an active ward still detonates and damages after dash invulnerability',()=>{
 const a=engine();for(const x of [80,170,260])mark(a,foe(a,'crawler',x),3);a.startDash(1,0);a.step(.2);
 const h={x:a.run.player.x,y:a.run.player.y,r:82,timer:.45,life:1,hit:false,damage:24};a.run.hazards.push(h);a.step(.46);
 assert.ok(a.run.wards.length>0);assert.equal(h.hit,true);assert.equal(a.run.player.hp,98);const hp=a.run.player.hp;a.step(.1);assert.equal(a.run.player.hp,hp);
});
test('actual guardian and furnace area attacks remain intact inside an upgraded triple ward',()=>{
 for(const type of ['elite','boss']){
  const a=engine();a.apply('heal');a.apply('heal');a.run.player.x=310;const boss=foe(a,type,-500,400);boss.phase=1;boss.attack=0;a.update(.001);
  const warnings=Array.from(a.run.hazards);assert.equal(warnings.length,type==='elite'?3:5);a.run.player.x=0;
  for(const x of [80,170,260])mark(a,foe(a,'crawler',x),3);a.startDash(1,0);a.step(.2);
  assert.ok(warnings.every(h=>!h.hit&&h.timer>.9));assert.equal(a.run.hazards.length,warnings.length);
  a.step(1);assert.ok(a.run.wards.length>0);assert.ok(warnings.every(h=>h.hit));assert.equal(a.run.player.hp,type==='elite'?102:98);
 }
});
test('guardian and furnace flying rings are still cleared by the landing ward',()=>{
 for(const type of ['elite','boss']){
  const a=engine();const boss=foe(a,type,400,100);boss.phase=0;boss.attack=0;a.update(.001);assert.equal(a.run.hostile.length,type==='elite'?12:16);
  for(const x of [80,170,260])mark(a,foe(a,'crawler',x),3);a.startDash(1,0);a.step(.2);assert.equal(a.run.hostile.length,0);assert.ok(a.run.bulletsCleared>0);
 }
});
test('a recovery upgrade extends both landing safety and earned healing',()=>{
 const a=engine();const base=a.wardSpec(9,3);a.apply('heal');const rank1=a.wardSpec(9,3);a.apply('heal');const rank2=a.wardSpec(9,3);
 assert.equal(rank1.radius,base.radius+25);assert.equal(rank2.radius,base.radius+50);assert.ok(Math.abs(rank2.life-base.life-.3)<.001);
});
test('return stitch earns one fuel-carrying attack during cooldown without infinite chains',()=>{
 const a=engine();a.apply('quick');for(const x of [80,170,260])mark(a,foe(a,'brute',x),3);a.startDash(1,0);a.step(.2);
 assert.ok(a.run.player.bonusStitch&&a.run.player.dashTimer>0);assert.equal(a.run.player.bonusStitch.fuel,5);
 // Reverse through a freshly prepared group: even another triple may not regrant a token.
 for(const e of a.run.enemies){e.seedCooldown=0;mark(a,e,3);}a.startDash(-1,0);a.step(.2);
 assert.equal(a.run.bonusLeaps,1);assert.equal(a.run.poweredLeaps,2);assert.equal(a.run.player.bonusStitch,null);assert.ok(a.run.stitches[1].count>=5);
 const before=a.run.leaps;a.startDash(1,0);assert.equal(a.run.leaps,before);
});
test('return stitch requires three marked foes, and expires in game time',()=>{
 const single=engine();single.apply('quick');mark(single,foe(single));single.startDash(1,0);single.step(.2);assert.equal(single.run.player.bonusStitch,null);
 const a=engine();a.apply('quick');for(const x of [80,170,260])mark(a,foe(a,'crawler',x),1);a.startDash(1,0);a.step(.2);a.pause();const life=a.run.player.bonusStitch.life;a.update(5);assert.equal(a.run.player.bonusStitch.life,life);a.resume();a.step(2.01);assert.equal(a.run.player.bonusStitch,null);
});
test('full dense ash spreads to nearby foes, with bounded non-recursive contagion',()=>{
 const a=engine();a.apply('heavy');const source=foe(a,'brute',140),b=foe(a,'brute',160,40),c=foe(a,'brute',170,-40),far=foe(a,'brute',400,0);
 mark(a,source,4);assert.equal(b.ash,0);source.seedCooldown=0;mark(a,source,1);assert.equal(b.ash,2);assert.equal(c.ash,2);assert.equal(far.ash,0);assert.equal(a.run.seedLinks.length,2);
 source.seedCooldown=0;mark(a,source,1);assert.equal(b.ash,2);assert.equal(a.run.seedLinks.length,2);
 const unseeded=engine();unseeded.apply('heavy');const e=foe(unseeded,'brute',85);unseeded.step(1);assert.equal(e.ash,0);
});
test('dense contagion and ground overflow coexist on the same full foe',()=>{
 const a=engine();a.apply('heavy');a.apply('spill');const e=foe(a,'brute'),b=foe(a,'brute',170,40);mark(a,e,5);e.seedCooldown=0;mark(a,e,1);
 assert.equal(a.run.ashes.length,1);assert.equal(b.ash,2);assert.equal(e.ash,5);
});
test('piercing plus ricochet seeds the straight column and a visible side branch',()=>{
 const a=engine();a.apply('pierce');a.apply('ricochet');const first=foe(a,'brute',140),column=foe(a,'brute',260),side=foe(a,'brute',170,100);
 a.run.player.autoFire=true;a.step(.14);assert.ok(first.ash>0);assert.ok(a.run.bullets.some(b=>b.fork));assert.ok(a.run.seedLinks.some(l=>l.kind==='fork'));
 a.run.player.autoFire=false;a.step(.3);assert.ok(column.ash>0);assert.ok(side.ash>0);assert.equal(a.run.kills,0);
});
test('ricochet without piercing still redirects to a second foe',()=>{
 const a=engine();a.apply('ricochet');const first=foe(a),side=foe(a,'brute',170,100);a.run.player.autoFire=true;a.update(.18);a.run.player.autoFire=false;a.step(.3);assert.ok(first.ash>0&&side.ash>0);
});
test('extreme preparation combinations stay bounded and never replace the main attack',()=>{
 const a=engine();for(const id of ['scatter','pierce','ricochet','rapid','heavy','spill'])for(let i=0;i<3;i++)a.apply(id);
 for(let i=0;i<60;i++){const e=foe(a,'brute',50+(i%12)*45,(Math.floor(i/12)-2)*25);e.wake=1000;}a.run.player.autoFire=true;a.step(5);
 assert.equal(a.run.kills,0);assert.ok(a.run.bullets.length<450);assert.ok(a.run.seedLinks.length<=200);assert.ok(a.run.particles.length<=650);assert.ok(a.run.enemies.every(e=>e.ash<=a.run.player.ashCap));
});
test('forgiving preparation assists near misses without selecting off-direction foes',()=>{
 const a=engine(),near=foe(a,'crawler',200,24);const angle=a.assistedAngle(0);assert.ok(angle>0&&angle<Math.atan2(24,200));a.run.player.autoFire=true;a.step(.4);assert.ok(near.ash>0);
 const b=engine();foe(b,'crawler',200,100);foe(b,'crawler',-100,0);assert.equal(b.assistedAngle(0),0);b.run.player.autoFire=true;b.step(.5);assert.ok(b.run.enemies.every(e=>e.ash===0));
});
test('reverse echo starts at the endpoint and hits each foe once per pass',()=>{
 const a=engine();a.apply('echo');const near=foe(a,'brute',60),far=foe(a,'brute',260);for(const e of [near,far]){e.hp=e.maxHp=5000;mark(a,e);}
 a.startDash(1,0);a.step(.6);const nhp=near.hp,fhp=far.hp;a.step(.3);assert.ok(far.hp<fhp);assert.equal(near.hp,nhp);a.step(.3);assert.ok(near.hp<nhp);
 const after=near.hp;a.step(.1);assert.equal(near.hp,after);
});
test('second echo rank adds a wider return pass while the first pass stays narrow',()=>{
 const a=engine();a.apply('echo');a.apply('echo');mark(a,foe(a));const wide=foe(a,'brute',170,95);wide.hp=wide.maxHp=2000;a.startDash(1,0);a.step(.6);assert.equal(wide.hp,2000);a.step(.6);assert.ok(wide.hp<2000);
});
test('cooldown completion pulses locally and pause freezes its progress',()=>{
 const a=engine();a.run.player.dashTimer=.1;a.update(.05);assert.equal(a.run.player.readyFlash,0);a.pause();a.update(3);assert.ok(a.run.player.dashTimer>0);a.resume();a.update(.06);assert.equal(a.run.player.dashTimer,0);assert.ok(a.run.player.readyFlash>0);
 a.startDash(1,0);a.step(.2);assert.ok(a.run.player.dashCycle>=a.run.player.dashTimer&&a.run.player.dashCycle-a.run.player.dashTimer<.04);
});
test('guardian defeat grants a short collection break, then spawning resumes',()=>{
 const a=engine();a.run.time=180;a.run.eliteWave=1;const e=foe(a,'elite',500);a.hurtEnemy(e,1e9,'stitch');a.run.spawnTimer=0;a.step(3);assert.equal(a.run.enemies.length,0);a.step(1.1);assert.ok(a.run.enemies.length>0);
});
test('later waves cap crowd density and shooter pressure without changing enemy health',()=>{
 const a=engine();a.run.time=540;a.run.eliteWave=3;a.run.player.invuln=1000;for(let i=0;i<6;i++)foe(a,'shooter',600,100+i*5);for(let i=0;i<60;i++){a.run.spawnTimer=0;a.update(.001);}
 assert.ok(a.run.enemies.length<=75);assert.equal(a.run.enemies.filter(e=>e.type==='shooter').length,6);const e=foe(a,'brute',600);assert.ok(e.maxHp>125);
});
test('relic panel makes locked choices explicit and preserves selected unlocked equipment',()=>{
 const a=engine();a.goTitle();a.showRelics();assert.equal(a.state,'relics');assert.ok(a.elements.get('relicChoices').innerHTML.includes('未解放 · 残火印 25'));
 a.selectRelic(3);assert.equal(a.meta.relic,0);a.meta.marks=12;a.selectRelic(1);assert.equal(a.meta.relic,1);assert.equal(a.meta.marks,12);a.start();assert.equal(a.run.player.collectWidth,26);assert.equal(a.run.player.wardBoost,20);assert.equal(a.run.player.hp,100);
 a.goTitle();a.showRelics();a.events.window.keydown({code:'Escape',preventDefault(){}});assert.equal(a.state,'title');
});
test('restart resets wards, branches and earned bonus attacks',()=>{
 const a=engine();a.apply('quick');for(const x of [80,170,260])mark(a,foe(a,'crawler',x));a.startDash(1,0);a.step(.2);assert.ok(a.run.wards.length&&a.run.player.bonusStitch);a.start();assert.equal(a.run.wards.length,0);assert.equal(a.run.seedLinks.length,0);assert.equal(a.run.player.bonusStitch,null);assert.equal(a.run.bulletsCleared,0);
});
console.log(`\n${passed} mechanical tests passed.`);
require('./clarity.cjs');
