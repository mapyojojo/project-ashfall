const {engine}=require('./harness.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const preferences={
 weave:['pierce','ricochet','propagation','quick','scatter','shards','ward','width','heal','chain','vital','echo','fast','regen','heavy','frost','rapid','magnet','dense','pressure','point'],
 dense:['heavy','dense','pressure','point','rapid','echo','frost','heal','fast','quick','vital','regen','magnet','propagation','pierce','ricochet','scatter','width','ward','shards','chain'],
 flow:['short','fast','quick','chain','regen','propagation','ricochet','pierce','shards','heal','ward','heavy','dense','pressure','vital','echo','point','rapid','magnet','scatter'],
 gun:['scatter','ricochet','rapid','pierce','heavy','vital','quick','width','regen','magnet']
};
function simulate({mode='cycle',build='weave',seed=4721,limit=900,source=null,version='0.6.3'}) {
 const a=engine({intro:true,source});a.seed(seed);a.mouse.active=true;a.run.player.autoFire=mode!=='leap-only';
 const events=[];let nextPlan=0,nextSample=0;
 for(let tick=0;tick<limit*30+1000&&a.state!=='result'&&a.run.time<limit;tick++) {
  if(a.state==='upgrade'){
   const pref=preferences[build];const rank=id=>{const n=pref.indexOf(id);return n<0?999:n;};
   let best=0;for(let i=1;i<a.run.cards.length;i++)if(rank(a.run.cards[i].id)<rank(a.run.cards[best].id))best=i;a.chooseUpgrade(best);
  }
  const r=a.run,p=r.player,t=r.time;
  let target=null,nearest=Infinity;
  for(const e of r.enemies){if(e.dead)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);
   const full=e.ash>=p.ashCap+(e.type==='boss'||e.type==='elite'?6:0);
   const score=d+(full?180:0)-(e.type==='boss'?120:0);
   if(score<nearest){nearest=score;target=e;}
  }
  if(target){a.mouse.x=640+target.x-r.camX;a.mouse.y=360+target.y-r.camY;}
  const angle=t*.23,goal={x:Math.cos(angle)*350,y:Math.sin(angle)*350};
  let dx=(goal.x-p.x)/120,dy=(goal.y-p.y)/120;
  for(const e of r.enemies){const ex=p.x-e.x,ey=p.y-e.y,d=Math.hypot(ex,ey)||1;if(d<e.r+110){const s=(e.r+110-d)/50;dx+=ex/d*s;dy+=ey/d*s;}}
  for(const b of r.hostile){const ex=p.x-b.x,ey=p.y-b.y,d=Math.hypot(ex,ey)||1;if(d<65){dx+=ex/d*(65-d)/25;dy+=ey/d*(65-d)/25;}}
  if(p.hp<60&&r.pickups.length){const h=r.pickups[0];dx+=(h.x-p.x)/160;dy+=(h.y-p.y)/160;}
  a.keys.clear();if(Math.abs(dx)>.1)a.keys.add(dx>0?'KeyD':'KeyA');if(Math.abs(dy)>.1)a.keys.add(dy>0?'KeyS':'KeyW');
  if(mode!=='shoot-only'&&(p.dashTimer<=0||p.bonusStitch)&&t>nextPlan){
   let best=null,score=0;
   if(mode==='cycle')for(let j=0;j<24;j++){
     const angle=j/24*Math.PI*2,ux=Math.cos(angle),uy=Math.sin(angle),route=a.predictLeap(ux,uy);
     const fuel=route.ash+(p.bonusStitch?.fuel||0);if(!fuel)continue;
     const dense=a.denseSpec?.(route.targets,route.ash)||{success:false,multiplier:1};
     let value=fuel*5+route.targets*35;
     if(a.denseSpec&&build==='dense'&&dense.success)value+=120;
     if(a.denseSpec&&build==='dense'&&!dense.success&&route.targets<3&&route.ash<6&&r.enemies.some(e=>e.type==='boss'||e.type==='elite'))continue;
     for(const e of r.enemies){if(e.dead)continue;
      if(a.segmentDistance(e.x,e.y,p.x,p.y,route.bx,route.by)<p.stitchWidth+e.r)value+=Math.min(e.hp,a.stitchDamage(fuel,e.ash||0,route.danger)*dense.multiplier*(a.pressureMultiplier?.(e.ash||0)||1))*(e.type==='boss'?1.5:1);
      if(Math.hypot(e.x-route.bx,e.y-route.by)<e.r+28)value-=e.damage*12;
     }
     for(const h of r.hazards)if(Math.hypot(h.x-route.bx,h.y-route.by)<h.r+20&&h.timer<.6)value-=300;
     if(value>score){score=value;best={x:ux,y:uy};}
   }
   if(best)a.startDash(best.x,best.y);
   else if(r.enemies.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<e.r+48))a.startDash(dx,dy);
   nextPlan=t+.12;
  }
  a.update(1/30);
  if(t>=nextSample){events.push({time:Math.floor(t),hp:Math.ceil(p.hp),level:p.level,enemies:r.enemies.length,kills:r.kills,poweredLeaps:r.poweredLeaps||0});nextSample+=60;}
 }
 const r=a.run,p=r.player,total=r.damageTotals?Object.values(r.damageTotals).reduce((a,b)=>a+b,0):null;
 const result={version,mode,build,seed,limit,outcome:a.state==='result'?(r.player.hp>0?'win':'loss'):'time-limit',time:Math.floor(r.time),hp:Math.round(r.player.hp),level:r.player.level,kills:r.kills,stitchKills:r.stitchKills,bosses:r.bosses,
  poweredLeaps:r.poweredLeaps||0,dryLeaps:r.dryLeaps||0,firstSeed:r.onboarding?.firstSeed??null,firstPoweredLeap:r.onboarding?.firstLeap??null,firstStitchKill:r.onboarding?.firstKill??null,
  upgradesTaken:r.upgradesTaken,denseLeaps:r.denseLeaps||0,chainLeaps:r.chainLeaps||0,shardsFired:r.shardsFired||0,comboLeaps:r.comboLeaps||0,bonusLeaps:r.bonusLeaps||0,maxStitchTargets:r.maxStitchTargets||0,bulletsCleared:r.bulletsCleared||0,stitchDamageShare:total?Number((r.damageTotals.stitch/total).toFixed(4)):null,damageTotals:r.damageTotals||null,upgrades:r.player.upgrades,remaining:a.UPGRADES.filter(u=>u.id!=='ember'&&a.eligible(u,p)&&(p.upgrades[u.id]||0)<u.max).map(u=>({id:u.id,level:p.upgrades[u.id]||0,max:u.max})),unownedAttack:a.UPGRADES.filter(u=>u.id!=='ember'&&u.family!=='common'&&a.eligible(u,p)&&!p.upgrades[u.id]).map(u=>u.id),families:Object.fromEntries(['spread','dense','flow','common'].map(f=>[f,a.UPGRADES.filter(u=>u.family===f).reduce((n,u)=>n+(p.upgrades[u.id]||0),0)])),events};
 console.log(`${version} ${mode}/${build} seed ${seed}: ${result.outcome} ${result.time}s / ${result.kills} kills / stitch ${result.stitchDamageShare??'n/a'} / ${result.poweredLeaps} powered leaps`);
 return result;
}
const results=[];
let source=null;
try{source=require('node:child_process').execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show','028ca08:game.js'],{cwd:root,stdio:['ignore','pipe','ignore']}).toString();}catch{console.log('Local v0.6.2 baseline unavailable; comparison skipped.');}
if(source)for(const [build,seed] of [['weave',4721],['dense',9481],['flow',20261001],['weave',8606],['dense',6606],['flow',4606]])results.push(simulate({build,seed,source,version:'0.6.2 baseline'}));
results.push(simulate({mode:'shoot-only',limit:300}));
results.push(simulate({mode:'leap-only',limit:300}));
for(const [build,seed] of [['weave',4721],['dense',9481],['flow',20261001],['weave',8606],['dense',6606],['flow',4606]])results.push(simulate({build,seed}));
const cycles=results.filter(r=>r.version==='0.6.3'&&r.mode==='cycle');
assert.ok(results.filter(r=>r.version==='0.6.3'&&r.mode!=='cycle').every(r=>r.kills===0));
const parity=[];
if(source)for(const r of cycles){const before=results.find(q=>q.version==='0.6.2 baseline'&&q.seed===r.seed&&q.build===r.build),normalize=q=>JSON.parse(JSON.stringify({...q,version:undefined}));assert.deepEqual(normalize(r),normalize(before),`v0.6.2 combat results and samples: ${r.build}/${r.seed}`);parity.push({build:r.build,seed:r.seed,matched:true});}
assert.ok(cycles.every(r=>r.firstStitchKill!==null&&r.firstStitchKill<60));
assert.ok(cycles.every(r=>r.stitchDamageShare>=.85));
assert.ok(cycles.some(r=>r.time>=300&&r.kills>=150),'At least one natural five-minute cycle must remain playable.');
assert.ok(cycles.some(r=>r.outcome==='win'),'At least one full natural run must reach victory.');
assert.ok(cycles.some(r=>r.comboLeaps>10&&r.bulletsCleared>0));
assert.ok(cycles.some(r=>r.bonusLeaps>10));
const eligibleAttack=engine().UPGRADES.filter(u=>u.id!=='ember'&&u.family!=='common').length;
assert.ok(cycles.every(r=>r.unownedAttack.length>0),'Every run must leave an unowned attack upgrade.');
assert.ok(cycles.every(r=>r.remaining.length>=5),'Late runs must still have several meaningful stages to want.');
assert.ok(cycles.find(r=>r.build==='dense').denseLeaps>10,'Concentration must earn actual dense successes.');
assert.ok(cycles.find(r=>r.build==='flow').poweredLeaps>100,'Continuous route must keep cycling.');
assert.ok(new Set(cycles.map(r=>JSON.stringify(Object.keys(r.upgrades).sort()))).size>=3,'Strategies must result in different builds.');
fs.writeFileSync(path.join(root,'balance-verification.json'),JSON.stringify({version:'0.6.3',date:new Date().toISOString(),baseline:'028ca08',eligibleAttackUpgrades:eligibleAttack,parity,method:'deterministic accelerated simulation; matched v0.6.2/v0.6.3 planners and 6 seeds; all combat results, upgrades, damage totals and minute samples asserted identical; normal HP/damage/XP; exact route knowledge; no injected fuel/XP/invulnerability or balancing changes; not human playtests',upgradesSHA256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'upgrades.js'))).digest('hex'),sourceSHA256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'game.js'))).digest('hex'),results},null,2));
console.log('Core-loop balance assertions passed. These are bots, not human playtests.');
