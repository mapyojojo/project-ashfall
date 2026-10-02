const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./harness.cjs');
let passed=0;
function test(name,fn){fn();console.log('PASS',name);passed++;}
function foe(a,type='brute',x=140,y=0,ash=0){const e=a.spawnEnemy(type,x,y);e.speed=0;e.wake=1000;e.attack=1000;e.hp=e.maxHp=30000;if(ash)a.seedEnemy(e,ash);return e;}
function leap(a,dx=1,seconds=.60){a.startDash(dx,0);a.step(seconds);return a.run.lastLeap;}
function setupDense({targets=1,ash=6,rank=1,pressure=0,point=0,type='brute'}={}){
 const a=engine();a.apply('heavy');a.apply('heavy');for(let i=0;i<rank;i++)a.apply('dense');for(let i=0;i<pressure;i++)a.apply('pressure');for(let i=0;i<point;i++)a.apply('point');
 const foes=Array.from({length:targets},(_,i)=>foe(a,type,70+i*75,0,Math.ceil(ash/targets)));return {a,foes};
}
test('heavy changes only ash per hit and capacity, never propagation or firing rate',()=>{
 const a=engine(),rate=a.run.player.fireRate;for(let i=0;i<3;i++)a.apply('heavy');const e=foe(a),other=foe(a,'brute',150,70);a.seedEnemy(e,99);
 assert.equal(a.run.player.ashPerHit,4);assert.equal(a.run.player.ashCap,9);assert.equal(a.run.player.fireRate,rate);assert.equal(other.ash,0);assert.equal(a.run.seedLinks.length,0);
});
test('propagation alone uses rank-based neighbors, a cooldown and no recursion',()=>{
 for(let rank=1;rank<=3;rank++){const a=engine();for(let i=0;i<rank;i++)a.apply('propagation');const e=foe(a,'brute',0),others=Array.from({length:6},(_,i)=>foe(a,'brute',70,i*16-40));a.seedEnemy(e,3);assert.equal(others.filter(e=>e.ash===1).length,rank+1);assert.equal(a.run.seedLinks.length,rank+1);e.seedCooldown=0;a.seedEnemy(e,1);assert.equal(a.run.seedLinks.length,rank+1);}
});
test('healing and ward upgrades are independent for triple and dense successes',()=>{
 for(const success of ['triple','dense'])for(const id of [null,'heal','ward']){
  const a=engine();a.run.player.hp=50;if(id)a.apply(id);if(success==='dense'){a.apply('heavy');a.apply('heavy');foe(a,'brute',140,0,6);}else for(const x of [80,170,260])foe(a,'brute',x,0,2);
  const base=engine().wardSpec(6,success==='dense'?1:3);leap(a,1,.2);assert.equal(a.run.player.hp,id==='heal'?54:50);const w=a.run.wards[0];assert.equal(w.r,base.radius+(id==='ward'?25:0));assert.ok(Math.abs(w.max-base.life-(id==='ward'?.15:0))<1e-8);
 }
});
test('white ash slows only upon actual explosion, including a reverse pass',()=>{
 const a=engine();a.apply('frost');a.apply('frost');a.apply('echo');const e=foe(a);a.run.player.autoFire=true;a.step(.3);a.run.player.autoFire=false;assert.equal(e.slow,0);
 a.startDash(1,0);a.step(.24);assert.ok(e.slow<1);assert.equal(a.run.stitches[0].exploded,false);a.step(.20);assert.ok(e.slow>2.5);a.step(.55);assert.ok(e.slow>2.5);
});
test('retired ground ash has no candidate, state, UI or save migration dependency',()=>{
 const a=engine({savedMeta:{marks:42,relic:3,wins:4,runs:9,best:780}});assert.ok(!a.UPGRADES.some(u=>u.id==='spill'));assert.equal(a.run.ashes,undefined);assert.equal(a.meta.marks,42);assert.equal(a.meta.relic,3);assert.equal(a.meta.wins,4);a.run.upgradesTaken=1;for(let i=0;i<100;i++){a.rollUpgrades();assert.ok(!a.run.cards.some(u=>u.id==='spill'));}
 for(const file of ['game.js','upgrades.js','index.html'])assert.ok(!fs.readFileSync(path.join(__dirname,'..',file),'utf8').includes('零れる灰'));
});
test('shards are limited per stitch and in flight; echoes and point blasts do not repeat them',()=>{
 for(const rank of [1,2]){const a=engine();for(let i=0;i<rank;i++)a.apply('shards');a.apply('echo');foe(a,'brute',100,0,3);for(let i=0;i<25;i++)foe(a,'brute',40+i*10,100+(i%2)*25);leap(a,1,1.2);assert.ok(a.run.shardsFired>0);assert.ok(a.run.shardsFired<=(rank===1?6:9));assert.equal(a.run.stitches[0].shardShots,a.run.shardsFired);}
 const a=engine();a.apply('shards');a.apply('shards');for(let i=0;i<60;i++)foe(a,'brute',i*2,100);const s={shardShots:0,shardTargets:new Set()};for(let i=0;i<20;i++)a.scatterShards(s,100,0);assert.equal(s.shardShots,9);
 for(let i=0;i<20;i++)a.scatterShards({shardShots:0,shardTargets:new Set()},100,0);assert.equal(a.run.bullets.filter(b=>b.shard).length,36);
});
test('shards seek incomplete marks, seed exactly one ash and deal negligible damage',()=>{
 const a=engine();a.apply('heavy');a.apply('shards');const full=foe(a,'brute',40,30,5),empty=foe(a,'brute',100,60);const s={shardShots:0,shardTargets:new Set()};a.scatterShards(s,0,0);assert.equal(a.run.bullets.length,1);assert.equal(a.run.bullets[0].guideTarget.id,empty.id);a.step(.25);assert.equal(empty.ash,1);assert.ok(empty.maxHp-empty.hp<.1);assert.equal(full.ash,5);
});
test('dense success requires one or two fresh targets and six ash, never a triple',()=>{
 const a=engine();for(const [targets,ash,success] of [[0,9,false],[1,1,false],[1,5,false],[1,6,true],[2,5,false],[2,6,true],[3,6,false],[3,12,false]])assert.equal(a.denseSpec(targets,ash).success,success);
 for(const targets of [1,2,3]){const {a}=setupDense({targets,ash:6});const l=leap(a,1,.2);assert.equal(l.dense,targets<=2);assert.equal(l.combo,targets===3);assert.ok(!(l.dense&&l.combo));}
});
test('dense ranks increase actual single and double damage by the advertised amount',()=>{
 for(const targets of [1,2])for(const rank of [1,2,3]){const base=setupDense({targets,rank:0}),boost=setupDense({targets,rank});leap(base.a);leap(boost.a);const multiplier=boost.a.denseSpec(targets,6).multiplier;assert.ok(Math.abs(boost.a.run.damageTotals.stitch/base.a.run.damageTotals.stitch-multiplier)<1e-8);}
});
test('carried fuel cannot satisfy dense, pressure, recovery or early stitch fresh ash rules',()=>{
 const a=engine();for(const id of ['dense','heal','pressure','fast'])a.apply(id);a.run.player.hp=50;a.run.player.bonusStitch={fuel:9,life:2,depth:1};foe(a,'brute',100,0,1);const l=leap(a,1,.2);assert.equal(l.count,10);assert.equal(l.freshAsh,1);assert.equal(l.dense,false);assert.equal(a.run.player.hp,50);assert.equal(a.pressureMultiplier(1),1);
});
test('ash pressure applies the captured target amount to guardians and the furnace',()=>{
 for(const type of ['elite','boss'])for(const ash of [5,6,9,12]){function scenario(pressure){const {a,foes}=setupDense({type,ash,rank:0,pressure});leap(a);return foes[0].maxHp-foes[0].hp;}
  const ratio=scenario(2)/scenario(0);assert.ok(Math.abs(ratio-(1+2*(ash>=12?.35:ash>=9?.25:ash>=6?.15:0)))<1e-8);
 }
 const a=engine();a.apply('pressure');assert.equal(a.pressureMultiplier(3),1);
});
test('point blast hits only the one captured target and stays separate from full-route echo',()=>{
 for(const rank of [1,2]){const {a,foes}=setupDense({point:rank});const side=foe(a,'brute',140,95);a.apply('echo');a.apply('echo');leap(a,1,1.25);assert.equal(a.run.stitches[0].pointPops,rank);assert.ok(a.run.stitches[0].echoIds.has(side.id));assert.ok(!a.run.stitches[0].hitIds.has(side.id));assert.ok(foes[0].hp<side.hp);}
 const {a}=setupDense({targets:2,point:2});leap(a,1,1.25);assert.equal(a.run.stitches[0].pointPops,0);
});
test('point rank damage matches the promised extra hits without requiring dense upgrade',()=>{
 const base=setupDense({rank:0}),one=setupDense({rank:0,point:1}),two=setupDense({rank:0,point:2});for(const s of [base,one,two])leap(s.a,1,1.25);assert.ok(Math.abs(one.a.run.damageTotals.stitch/base.a.run.damageTotals.stitch-1.45)<1e-8);assert.ok(Math.abs(two.a.run.damageTotals.stitch/base.a.run.damageTotals.stitch-2.2)<1e-8);
});
test('early stitch strongly reduces earned cooldown but leaves a positive floor',()=>{
 function scenario(rank,ash){const a=engine();a.apply('heavy');a.apply('heavy');for(let i=0;i<rank;i++)a.apply('fast');foe(a,'boss',140,0,ash);leap(a,1,.18);return a.run.player.dashTimer;}
 assert.ok(scenario(0,9)-scenario(2,9)>.65);assert.ok(scenario(2,12)>=.39);const dry=engine();dry.apply('fast');leap(dry,1,.18);assert.ok(dry.run.player.dashTimer>2.3);
});
test('short ranks have exact route and base cooldown ratios, with unchanged width',()=>{
 const a=engine();a.apply('short');assert.ok(Math.abs(a.run.player.dashDistance-248)<1e-8);assert.ok(Math.abs(a.run.player.dashCd-1.95)<1e-8);a.apply('short');assert.ok(Math.abs(a.run.player.dashDistance-201.5)<1e-8);assert.ok(Math.abs(a.run.player.dashCd-1.56)<1e-8);assert.equal(a.run.player.collectWidth,20);assert.equal(a.run.player.stitchWidth,58);assert.equal(a.run.player.dashDuration,.12);const route=a.predictLeap(1,0);leap(a,1,.12);assert.equal(a.run.player.x,route.bx);
});
test('long and short needles exclude each other in rolls and stale UI choices',()=>{
 for(const [chosen,blocked] of [['short','width'],['width','short']]){const a=engine();a.apply(chosen);a.run.upgradesTaken=1;for(let i=0;i<200;i++){a.rollUpgrades();assert.ok(!a.run.cards.some(u=>u.id===blocked));}a.run.cards=[a.UPGRADES.find(u=>u.id===blocked)];a.chooseUpgrade(0);assert.equal(a.run.player.upgrades[blocked],undefined);assert.ok(a.upgradeCard(a.UPGRADES.find(u=>u.id===chosen),0).includes('同時取得できない'));}
});
test('chain requires return stitch, fresh target count and stops after the third attack',()=>{
 for(const rank of [1,2]){const a=engine();a.apply('quick');for(let i=0;i<rank;i++)a.apply('chain');const group=[80,170,260].map(x=>foe(a,'brute',x,0,3));leap(a,1,.2);assert.equal(a.run.player.bonusStitch.depth,1);
  for(const e of group.slice(0,rank===1?3:2)){e.seedCooldown=0;a.seedEnemy(e,3);}leap(a,-1,.2);assert.equal(a.run.player.bonusStitch.depth,2);
  for(const e of group){e.seedCooldown=0;a.seedEnemy(e,3);}leap(a,1,.2);assert.equal(a.run.chainLeaps,1);assert.equal(a.run.bonusLeaps,1);assert.equal(a.run.player.bonusStitch,null);assert.equal(a.run.leaps,3);a.startDash(-1,0);assert.equal(a.run.leaps,3);
 }
 const a=engine();const chain=a.UPGRADES.find(u=>u.id==='chain');assert.equal(a.eligible(chain,a.run.player),false);a.apply('quick');a.apply('chain');[80,170,260].forEach(x=>foe(a,'brute',x,0,3));leap(a,1,.2);leap(a,-1,.2);assert.equal(a.run.player.bonusStitch,null);
});
test('weight stays at most 1.25 and real draws remain mixed',()=>{
 const a=engine();for(const id of ['scatter','pierce','propagation'])a.apply(id);a.run.upgradesTaken=3;a.seed(600601);const counts={spread:0,dense:0,flow:0,common:0};let mixed=0;
 for(const u of a.UPGRADES)assert.ok(a.weight(u,a.run.player)>=1&&a.weight(u,a.run.player)<=1.25);
 for(let i=0;i<4000;i++){a.rollUpgrades();assert.equal(new Set(a.run.cards.map(u=>u.id)).size,3);a.run.cards.forEach(u=>counts[u.family]++);if(new Set(a.run.cards.map(u=>u.family)).size>1)mixed++;}
 const share=counts.spread/12000;assert.ok(share>.25&&share<.40,JSON.stringify(counts));assert.ok(counts.dense>2000&&counts.flow>2000&&counts.common>1000);assert.ok(mixed>3000);
});
test('catalog has staged labels and live hints; endurance still immediately helps',()=>{
 const a=engine();assert.equal(a.UPGRADES.filter(u=>u.id!=='ember').length,22);for(const u of a.UPGRADES.filter(u=>u.id!=='ember')){assert.equal(u.stages.length,u.max);assert.ok(a.upgradeCard(u,0).includes(`family-tag ${u.family}`));}a.run.player.hp=25;a.apply('vital');assert.equal(a.run.player.hp,55);assert.equal(a.run.player.maxHp,130);a.finish(false);assert.ok(a.elements.get('resultBuild').innerHTML.includes('密縫い 0回 / 連環縫い 0回'));
});
console.log(`${passed} v0.6 build tests passed.`);
