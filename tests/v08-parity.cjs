const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {engine}=require('./harness.cjs'),{combatSource}=require('./combat-source.cjs');
const root=path.resolve(__dirname,'..'),baseline='1058b3b1b7d1b884da9b3e24551b843a9d19cb41';
const read=file=>cp.execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show',`${baseline}:${file}`],{cwd:root}).toString();
// This baseline is required: failure to read it must fail the check, never skip.
const source=read('game.js'),catalogSource=read('upgrades.js');
let passed=0;const checks=[];function test(name,fn){fn();passed++;checks.push(name);console.log('PASS',name);}
const silentCtx=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
test('all exposed combat functions, enemy definitions and upgrade behavior match v0.7.1',()=>{
  const before=engine({source,catalogSource}),after=engine();
  assert.equal(JSON.stringify(after.TYPES),JSON.stringify(before.TYPES));
  const fields=['update','spawnEnemy','hurtEnemy','hurtPlayer','startDash','endDash','seedEnemy','predictLeap','stitchDamage','denseSpec','pressureMultiplier','wardSpec','frontCrossing','lineDamage','addXp','scatterShards','assistedAngle','weight','eligible','feedbackSpec'];
  for(const field of fields)assert.equal(combatSource(after[field]),combatSource(before[field]),field);
  const catalog=a=>Array.from(a.UPGRADES,u=>({id:u.id,family:u.family,max:u.max,excludes:u.excludes,apply:u.apply.toString(),requires:u.requires?.toString()}));
  assert.deepEqual(catalog(after),catalog(before));
  for(const u of after.UPGRADES){const old=before.UPGRADES.find(v=>v.id===u.id);for(const field of ['name','desc','cat','gain'])assert.equal(u[field],old[field]);assert.deepEqual(Array.from(u.stages),Array.from(old.stages));}
});
function snapshot(a,omitCopy){return JSON.stringify({state:a.state,meta:a.meta,run:a.run},(key,value)=>{
  if(key==='cards')return value.map(u=>u.id);
  if(omitCopy&&(key==='announced'||key==='text'))return undefined;
  const brand=Object.prototype.toString.call(value);if(brand==='[object Map]'||brand==='[object Set]')return [...value];return value;
});}
for(const language of ['ja','en'])for(const [name,marks,upgrades] of [
  ['normal',[3,0,0],[]],['triple',[2,2,2],['ward','heal']],['dense',[0,6,0],['dense']],
  ['pressure/point',[0,9,0],['dense','pressure','point','point']],['echo/shards/propagation',[2,2,2],['echo','echo','shards','propagation','quick']],
  ['return/chain',[2,2,2],['quick','chain','chain','fast','short']]
])test(`${language} ${name}: every frame and future RNG match with rendering and language switches`,()=>{
  const before=engine({source,catalogSource,context:silentCtx}),after=engine({language,context:silentCtx});
  for(const a of [before,after]){a.apply('heavy');a.apply('heavy');for(const id of upgrades)a.apply(id);[80,170,240].forEach((x,i)=>{const e=a.spawnEnemy('brute',x,0);e.hp=e.maxHp=10000;e.wake=1000;e.speed=0;if(marks[i])a.seedEnemy(e,marks[i]);});a.startDash(1,0);}
  for(let tick=0;tick<360;tick++){
    for(const a of [before,after]){
      if(tick===40){a.run.hazards.push({x:500,y:0,r:60,timer:1,life:1.45,damage:24,hit:false});for(let i=0;i<25;i++)a.run.hostile.push({x:300,y:i,vx:0,vy:0,r:4,life:2,damage:12});}
      if(tick===80||tick===160){for(const e of a.run.enemies)a.seedEnemy(e,3);if(a.run.player.bonusStitch)a.startDash(tick===80?-1:1,0);}
      if(a===after&&tick===100)a.i18n.setLanguage(language==='ja'?'en':'ja');
      if(a===after&&tick===180)a.i18n.setLanguage(language);
      if(tick===110||tick===200)a.events.window.keydown({code:'KeyM',preventDefault(){}});
      a.update(1/60);a.drawGame();
    }
    assert.equal(snapshot(after,true),snapshot(before,true),name+' frame '+tick);
  }
  for(let i=0;i<20;i++)for(const a of [before,after])a.spawnEnemy(i%2?'runner':'shooter');
  before.rollUpgrades();after.rollUpgrades();assert.equal(snapshot(after,true),snapshot(before,true));
});
test('Japanese combat messages remain identical to v0.7.1',()=>{
  const before=engine({source,catalogSource}),after=engine();for(const a of [before,after]){a.apply('heavy');a.apply('heavy');a.apply('dense');const e=a.spawnEnemy('brute',120,0);e.speed=0;e.wake=1000;e.hp=e.maxHp=10000;a.seedEnemy(e,6);a.startDash(1,0);a.step(.3);}assert.equal(snapshot(after,false),snapshot(before,false));
});
fs.writeFileSync(path.join(root,'v08-parity-verification.json'),JSON.stringify({version:require('../version.js').version,baseline,checks,limits:'Only player copy is normalized. Numeric combat source, per-frame state and future enemy/upgrade RNG are required to match. Full six-seed runs are checked separately.'},null,2));
console.log(`${passed} v0.7.1 parity checks passed.`);
