const assert=require('node:assert/strict'),{engine}=require('./harness.cjs');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
function foe(a,type,x,y=0){const e=a.spawnEnemy(type,x,y);e.speed=0;e.wake=1000;e.hp=e.maxHp=10000;return e;}
function scene(echo=0){const a=engine();for(let i=0;i<echo;i++)a.apply('echo');a.seedEnemy(foe(a,'brute',150),3);a.startDash(1,0);return a;}
test('a foe ahead of the main front is hit only when the front reaches it, once',()=>{
 const a=scene(),e=foe(a,'brute',230);a.step(.4);assert.equal(e.hp,10000);a.step(.11);assert.ok(e.hp<10000);const hp=e.hp;a.step(.5);assert.equal(e.hp,hp);
});
test('entry behind a still-moving main front causes no damage',()=>{
 const a=scene();a.step(.42);assert.ok(a.run.stitches[0].progress<1);const e=foe(a,'brute',70);a.step(.2);assert.equal(e.hp,10000);assert.ok(!a.run.stitches[0].hitIds.has(e.id));
});
test('afterglow after the main sweep can never damage a newly arriving foe',()=>{
 const a=scene();a.step(.7);assert.equal(a.run.stitches[0].progress,1);const e=foe(a,'brute',270);a.step(.4);assert.ok(a.run.stitches.length>0);assert.equal(e.hp,10000);
});
test('splitter children born after a hit are never retroactively swept in that same frame',()=>{
 const a=engine(),e=a.spawnEnemy('splitter',120,0);e.speed=0;e.wake=1000;a.seedEnemy(e,3);a.startDash(1,0);
 while(!a.run.kills)a.update(1/60);
 const children=a.run.enemies.filter(e=>e.type==='mite');assert.equal(children.length,3);assert.ok(children.every(e=>e.hp===e.maxHp));
});
test('reverse echo hits an ahead-of-front entrant only when its own front arrives',()=>{
 const a=scene(1);a.step(.8);const e=foe(a,'brute',70);a.step(.07);assert.equal(e.hp,10000);a.step(.19);assert.ok(e.hp<10000);assert.ok(a.run.stitches[0].echoIds.has(e.id));assert.ok(!a.run.stitches[0].hitIds.has(e.id));
});
test('entry behind an active reverse front and after its finish causes no damage',()=>{
 const a=scene(2);a.step(.9);const behind=foe(a,'brute',270);a.step(.2);const late=foe(a,'brute',70);a.step(.15);assert.equal(behind.hp,10000);assert.equal(late.hp,10000);
});
test('fast runner crossing the main front between two off-path samples is hit',()=>{
 const a=scene();a.step(.30);const e=foe(a,'runner',130,100);e.wake=0;e.attack=1000;e.charge=1;e.vx=0;e.vy=-1000;
 a.update(.2);assert.ok(e.y<-90);assert.ok(e.hp<10000);assert.ok(a.run.stitches[0].hitIds.has(e.id));
});
test('fast runner crossing the reverse front between two off-path samples is hit',()=>{
 const a=scene(1);a.step(.80);const e=foe(a,'runner',180,100);e.wake=0;e.attack=1000;e.charge=1;e.vx=0;e.vy=-1000;
 a.update(.2);assert.ok(e.y<-90);assert.ok(e.hp<10000);assert.ok(a.run.stitches[0].echoIds.has(e.id));assert.ok(!a.run.stitches[0].hitIds.has(e.id));
});
test('sub-frame warmup and sweep completion are clipped instead of using inactive motion',()=>{
 const a=engine(),s={ax:0,ay:0,bx:310,by:0,width:58};
 const late={x:70,y:0,stitchPrevX:70,stitchPrevY:200,r:10};
 assert.equal(a.frontCrossing(s,late,-.27,-.37),null);
 const early={x:100,y:200,stitchPrevX:100,stitchPrevY:0,r:10};
 assert.equal(a.frontCrossing(s,early,.09,-.01),null);
 const endpoint={x:310,y:0,r:10};assert.notEqual(a.frontCrossing(s,endpoint,-.27,-.37),null);
 assert.equal(a.frontCrossing(s,endpoint,-.28,-.31),null);
});
test('longitudinal endpoint crossings and co-moving transverse crossings stay continuous',()=>{
 const a=engine(),s={ax:0,ay:0,bx:310,by:0,width:58};
 assert.notEqual(a.frontCrossing(s,{x:-100,y:0,stitchPrevX:400,stitchPrevY:0,r:10},-.05,-.25),null);
 assert.notEqual(a.frontCrossing(s,{x:310,y:-100,stitchPrevX:0,stitchPrevY:100,r:10},0,-.28),null);
 assert.equal(a.frontCrossing(s,{x:150,y:100,stitchPrevX:150,stitchPrevY:100,r:10},0,-.28),null);
});
test('diagonal sweeps and short time steps hit the same static targets as coarse steps',()=>{
 for(const diagonal of [false,true]){
  const results=[];
  for(const dt of [1/120,1/30,.15]){
   const a=engine();a.apply('echo');const p=a.run.player;
   const e=foe(a,'brute',diagonal?120:170,diagonal?120:0);a.seedEnemy(e,3);a.startDash(1,diagonal?1:0);
   while(a.run.time<1.15)a.update(Math.min(dt,1.15-a.run.time));
   results.push({damage:10000-e.hp,hits:a.run.stitches[0].hitIds.has(e.id),echo:a.run.stitches[0].echoIds.has(e.id)});
  }
  assert.ok(results.every(r=>r.hits&&r.echo));assert.ok(results.every(r=>Math.abs(r.damage-results[0].damage)<1e-8));
 }
});
test('point puncture follows its captured target outside the route with unchanged delayed damage',()=>{
 const a=engine();a.apply('heavy');a.apply('heavy');a.apply('point');a.apply('point');const e=foe(a,'brute',150);a.seedEnemy(e,6);a.startDash(1,0);a.step(.5);
 const main=10000-e.hp,s=a.run.stitches[0];assert.equal(s.pointPops,0);e.y=250;e.kx=e.ky=0;
 a.step(.21);assert.equal(s.pointPops,1);assert.ok(Math.abs(10000-e.hp-main*1.6)<1e-8);
 const q=a.run.impacts.find(q=>q.point);assert.equal(q.y,e.y);
 a.step(.23);assert.equal(s.pointPops,2);assert.ok(Math.abs(10000-e.hp-main*2.2)<1e-8);
});
test('dense flashes occur across the main route; only captured targets carry the small marker',()=>{
 const a=engine();a.apply('heavy');a.apply('heavy');const marked=foe(a,'brute',80),other=foe(a,'brute',170);a.seedEnemy(marked,6);a.startDash(1,0);a.step(.44);
 assert.equal(a.run.stitches[0].feedback,'dense');assert.ok(a.run.impacts.some(q=>q.focus&&q.marker));assert.ok(a.run.impacts.some(q=>q.focus&&!q.marker));
 assert.ok(other.hp<10000);assert.ok(!a.run.impacts.some(q=>q.point));
});
console.log(`${passed} stitch timing checks passed.`);
