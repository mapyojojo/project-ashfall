const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {engine}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),baseline='028ca08';
let source;
try{source=cp.execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show',`${baseline}:game.js`],{cwd:root,stdio:['ignore','pipe','ignore']}).toString();}catch{}
if(!source){console.log('SKIP repository-only chain parity: v0.6.2 baseline unavailable.');process.exit(0);}
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
function drawing(){
 const calls=[];const ctx=new Proxy({}, {set(target,key,value){calls.push(['set',key,value]);target[key]=value;return true;},get(target,key){
  if(key in target)return target[key];
  if(key==='createRadialGradient')return (...args)=>{calls.push([key,...args]);return {addColorStop(...args){calls.push(['addColorStop',...args]);}};};
  if(key==='measureText')return text=>({width:text.length*6});
  return (...args)=>{calls.push([key,...args]);};
 }});return {ctx,calls};
}
class SilentAudio {
 constructor(){this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination={};this.events=[];}
 resume(){}
 node(kind){this.events.push(['create',kind]);const events=this.events,param=label=>{let value=0;return {get value(){return value;},set value(v){value=v;events.push([label,'value',v]);},setValueAtTime(...args){events.push([label,'set',...args]);},linearRampToValueAtTime(...args){events.push([label,'linear',...args]);},exponentialRampToValueAtTime(...args){events.push([label,'exponential',...args]);}};};
  const node={connect(){},start(...args){events.push(['start',kind,node.type,...args]);},stop(...args){events.push(['stop',kind,...args]);},frequency:param('frequency'),gain:param('gain'),Q:param('Q')};return node;}
 createOscillator(){return this.node('oscillator');}createGain(){return this.node('gain');}createWaveShaper(){return this.node('shaper');}createBufferSource(){return this.node('bufferSource');}createBiquadFilter(){return this.node('filter');}
 createBuffer(_,length){this.events.push(['buffer',length]);const data=new Float32Array(length);return {getChannelData:()=>data};}
}
function setup(source,marks,upgrades){
 let audio;class TestAudio extends SilentAudio{constructor(){super();audio=this;}}
 const render=drawing(),a=engine({source,context:render.ctx,AudioContext:TestAudio});
 a.apply('heavy');a.apply('heavy');for(const id of upgrades)a.apply(id);
 [80,170,260].forEach((x,i)=>{const e=a.spawnEnemy('brute',x,0);e.speed=0;e.wake=1000;e.hp=e.maxHp=10000;if(marks[i])a.seedEnemy(e,marks[i]);});
 a.run.player.hp=60;a.startDash(1,0);return {a,render,audio};
}
function snapshot(a){return JSON.stringify({state:a.state,meta:a.meta,run:a.run},(key,value)=>{
 // Only the new drawing-only spacing field differs. Impact counts and all other run fields stay included.
 if(key==='spacing')return undefined;
 const brand=Object.prototype.toString.call(value);if(brand==='[object Set]')return [...value];if(brand==='[object Map]')return [...value];return value;
});}
const scenes=[
 ['normal',[3,0,0],[]],['triple',[2,2,2],['heal','ward']],['base dense',[0,6,0],[]],
 ['two-target dense',[3,3,0],['dense','echo','echo']],
 ['dense/pressure/point',[0,9,0],['dense','dense','dense','pressure','pressure','pressure','point','point']],
 ['triple/echo/shards/contagion',[2,2,2],['echo','echo','shards','shards','propagation','quick','chain']],
 ['return/chain/fast',[2,2,2],['quick','chain','chain','fast','fast','heal']]
];
for(const [name,marks,upgrades] of scenes)test(`${name}: every combat frame, particles and future RNG match v0.6.2 with drawing/audio`,()=>{
 const {a:before}=setup(source,marks,upgrades),{a:after}=setup(null,marks,upgrades);
 let echoHits=0,pointPops=0;
 for(let tick=0;tick<360;tick++){
  for(const a of [before,after]){
   if(tick===60){const e=a.spawnEnemy('runner',190,150);e.wake=0;e.charge=1;e.vx=0;e.vy=-1000;}
   if(tick===72){for(const e of a.run.enemies)a.seedEnemy(e,3);if(a.run.player.bonusStitch)a.startDash(-1,0);}
   if(tick===144){for(const e of a.run.enemies)a.seedEnemy(e,3);if(a.run.player.bonusStitch)a.startDash(1,0);}
   if(tick===30){a.run.hazards.push({x:500,y:0,r:60,timer:1,life:1.45,damage:24,hit:false});for(let i=0;i<30;i++)a.run.hostile.push({x:300,y:i,vx:0,vy:0,r:4,life:2,damage:12});}
   // Different mute and drawing schedules must not consume or redirect the combat random stream.
   if(a===after&&tick===100)a.events.window.keydown({code:'KeyM',preventDefault(){}});
   if(a===after&&tick===180)a.events.window.keydown({code:'KeyM',preventDefault(){}});
   a.update(1/60);a.drawGame();if(a===after&&tick%7===0)a.drawGame();
  }
  assert.equal(snapshot(after),snapshot(before),`${name}, frame ${tick}`);
  for(const s of after.run.stitches){echoHits=Math.max(echoHits,s.echoIds.size);pointPops=Math.max(pointPops,s.pointPops);}
 }
 assert.ok(after.run.damageTotals.stitch>0);if(upgrades.includes('echo'))assert.ok(echoHits>0);if(upgrades.includes('point'))assert.equal(pointPops,2);
 if(name==='return/chain/fast')assert.ok(after.run.bonusLeaps>0&&after.run.chainLeaps>0);
 if(upgrades.includes('shards'))assert.ok(after.run.shardsFired>0);
 for(let i=0;i<20;i++)for(const a of [before,after])a.spawnEnemy(i%2?'runner':'shooter');
 assert.equal(snapshot(after),snapshot(before));
 before.rollUpgrades();after.rollUpgrades();assert.equal(snapshot(after),snapshot(before));
 assert.deepEqual(Array.from(after.run.cards,u=>u.id),Array.from(before.run.cards,u=>u.id));
});
test('normal chain drawing and sound commands are unchanged at start, middle and end',()=>{
 for(const seconds of [.28,.41,.54,.85]){
  const before=setup(source,[3,0,0],[]),after=setup(null,[3,0,0],[]);
  for(const {a,render} of [before,after]){a.step(seconds);a.run.shake=0;render.calls.length=0;a.drawGame();}
  assert.equal(JSON.stringify(after.render.calls),JSON.stringify(before.render.calls),`${seconds}s`);
  assert.equal(JSON.stringify(after.audio.events),JSON.stringify(before.audio.events),`normal sound ${seconds}s`);
 }
});
test('front crossing, damage, landing, combat loop and upgrade definitions are unchanged',()=>{
 const before=engine({source}),after=engine();
 for(const key of ['frontCrossing','lineDamage','stitchDamage','denseSpec','pressureMultiplier','wardSpec','endDash','update','scatterShards','weight','eligible'])assert.equal(after[key].toString(),before[key].toString(),key);
 const old=cp.execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show',`${baseline}:upgrades.js`],{cwd:root}).toString();
 const oldCatalog=engine({source,catalogSource:old});
 const combatCatalog=a=>Array.from(a.UPGRADES,u=>({id:u.id,name:u.name,family:u.family,max:u.max,excludes:u.excludes,requires:u.requires?.toString(),apply:u.apply.toString()}));
 assert.deepEqual(combatCatalog(after),combatCatalog(oldCatalog),'catalog behavior is unchanged; player copy may change');
});
console.log(`${passed} chain parity checks passed against ${baseline}.`);
