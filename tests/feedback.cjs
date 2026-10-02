const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./harness.cjs');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}
function scene({marks=[3,0,0],upgrades=[],source=null}={}){
 const a=engine({source});a.apply('heavy');a.apply('heavy');
 for(const id of upgrades)a.apply(id);
 for(const [i,x] of [80,170,260].entries()){
  const e=a.spawnEnemy('brute',x,0);e.speed=0;e.wake=1000;e.hp=e.maxHp=10000;
  if(marks[i])a.seedEnemy(e,marks[i]);
 }
 a.startDash(1,0);return a;
}
test('explicit normal, triple and dense feedback follows mutually exclusive earned success',()=>{
 for(const [marks,kind] of [[[3,0,0],'normal'],[[2,2,2],'triple'],[[6,0,0],'dense'],[[3,3,0],'dense'],[[2,2,0],'normal']]){
  const a=scene({marks});a.step(.5);const s=a.run.stitches[0];
  assert.equal(s.feedback,kind);assert.equal(a.run.lastLeap.feedback,kind);
  assert.ok(!(a.run.lastLeap.combo&&a.run.lastLeap.dense));
  assert.ok(a.run.impacts.some(q=>q.feedback===kind&&!q.echo));
 }
});
test('unupgraded dense success has focused light and modest dedicated hit feel at multiplier one',()=>{
 const a=scene({marks:[6,0,0]});a.step(.37);
 assert.equal(a.run.player.upgrades.dense,undefined);assert.equal(a.run.stitches[0].denseMultiplier,1);
 assert.ok(a.run.impacts.some(q=>q.focus&&q.feedback==='dense'&&q.strength===0));
 assert.equal(a.run.hitStop,.070);assert.ok(a.run.hitStop>a.feedbackSpec('normal').hitStop);
});
test('dense and pressure multipliers subtly scale capped feedback without changing their values',()=>{
 const a=scene({marks:[6,0,0],upgrades:['dense','dense','dense','pressure','pressure','pressure']});a.step(.37);
 const s=a.run.stitches[0],f=a.feedbackSpec('dense',s.feedbackMultiplier);
 assert.equal(s.denseMultiplier,1.75);assert.equal(a.pressureMultiplier(6),1.45);
 assert.equal(s.feedbackMultiplier,1.75*1.45);assert.ok(f.strength>0&&f.strength<1);
 assert.ok(a.run.impacts.find(q=>q.focus).strength>0);assert.ok(a.run.hitStop>.070&&a.run.hitStop<=.088);
 const max=a.feedbackSpec('dense',100);assert.equal(max.strength,1);assert.ok(Math.abs(max.hitStop-.088)<1e-12);assert.equal(max.shake,8);
 assert.equal(a.feedbackSpec('dense',.5).strength,0);
});
test('triple sound opens upward while dense sound compresses downward with less high-frequency noise',()=>{
 const a=engine(),n=a.feedbackSpec('normal'),t=a.feedbackSpec('triple'),d=a.feedbackSpec('dense');
 assert.equal(n.hitStop,.045);assert.equal(t.hitStop,.065);
 assert.ok(t.slide>1&&d.slide<1);assert.ok(t.bass>d.bass);assert.ok(d.noise<n.noise);
 assert.equal(d.attack,.002);assert.equal(d.soundDuration,.12);assert.equal(d.noiseDuration,.045);
 assert.ok(d.soundDuration<n.soundDuration&&d.soundDuration<t.soundDuration);
});
test('point blast keeps its delayed timing, hit count and damage after focused main feedback',()=>{
 const a=scene({marks:[6,0,0],upgrades:['point','point']}),e=a.run.enemies[0];
 a.step(.47);const s=a.run.stitches[0],main=10000-e.hp;
 assert.ok(main>0&&s.pointPops===0);assert.ok(a.run.impacts.some(q=>q.focus));
 a.step(.23);assert.equal(s.pointPops,1);assert.ok(Math.abs(10000-e.hp-main*1.6)<1e-8);
 assert.ok(a.run.impacts.some(q=>q.point&&q.feedback==='point'));
 a.step(.24);assert.equal(s.pointPops,2);assert.ok(Math.abs(10000-e.hp-main*2.2)<1e-8);
 a.step(.5);assert.equal(s.pointPops,2);
});
test('triple dissolve light is capped separately and cannot clear ground attacks',()=>{
 const a=scene({marks:[2,2,2]});
 a.run.hazards.push({x:310,y:0,r:60,timer:1,life:1.45,damage:24,hit:false});
 for(let i=0;i<100;i++)a.run.hostile.push({x:310,y:60+i*.1,vx:0,vy:0,r:4,life:2,damage:12});
 a.step(.2);assert.equal(a.run.bulletsCleared,100);assert.equal(a.run.impacts.filter(q=>q.clear).length,24);
 assert.equal(a.run.hazards.length,1);assert.ok(Math.abs(a.run.hazards[0].timer-.8)<1e-9);
 const w=a.run.wards[0],spec=a.wardSpec(6,3,true);assert.equal(w.r,spec.radius);assert.equal(w.max,spec.life);
 a.step(.25);assert.ok(!a.run.impacts.some(q=>q.clear));
});

// Audit protected numerical values against v0.6.2; feedback changes must preserve combat timing.
// A source archive can run the mechanics above without a local Git history.
const root=path.resolve(__dirname,'..'),baseline='028ca08';
let source;
try{source=require('node:child_process').execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show',`${baseline}:game.js`],{cwd:root,stdio:['ignore','pipe','ignore']}).toString();}catch{}
if(source){
 test('enemy definitions, success thresholds, damage multipliers and ward values match v0.6.2',()=>{
  const before=engine({source}),after=engine();assert.equal(JSON.stringify(after.TYPES),JSON.stringify(before.TYPES));
  for(let rank=0;rank<=3;rank++){
   if(rank)for(const a of [before,after]){a.apply('dense');a.apply('pressure');}
   for(const targets of [0,1,2,3,6])for(const ash of [0,1,5,6,9,12,18]){
    assert.equal(JSON.stringify(after.denseSpec(targets,ash)),JSON.stringify(before.denseSpec(targets,ash)));
    assert.equal(after.pressureMultiplier(ash),before.pressureMultiplier(ash));
    assert.equal(JSON.stringify(after.wardSpec(ash,targets)),JSON.stringify(before.wardSpec(ash,targets)));
    for(const danger of [0,2,8])assert.equal(after.stitchDamage(ash,6,danger),before.stitchDamage(ash,6,danger));
   }
  }
 });
 test('triple, dense, healing and return rewards at landing match v0.6.2',()=>{
  for(const marks of [[3,0,0],[2,2,2],[6,0,0],[3,3,0]]){
   const setup={marks,upgrades:['quick','chain','heal','ward','dense','pressure']};
   const before=scene({...setup,source}),after=scene(setup);
   for(const a of [before,after]){a.run.player.hp=60;a.step(.2);}
   const snapshot=a=>JSON.stringify({last:a.run.lastLeap,hp:a.run.player.hp,cd:a.run.player.dashTimer,bonus:a.run.player.bonusStitch,wards:a.run.wards});
   assert.equal(snapshot(after),snapshot(before));
  }
 });
 // Upgrade definitions, spawn odds and numerical stages must be byte-identical.
 const old=require('node:child_process').execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show',`${baseline}:upgrades.js`],{cwd:root});
 test('upgrade definitions, stages, eligibility and appearance weights are byte-identical to v0.6',()=>assert.ok(old.equals(fs.readFileSync(path.join(root,'upgrades.js')))));
}else console.log('SKIP repository-only v0.6 parity audit: baseline commit unavailable.');
console.log(`${passed} stitch feedback checks passed.`);
