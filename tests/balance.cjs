const {engine}=require('./harness.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const preferences={
 weave:['pierce','scatter','ricochet','width','quick','heal','frost','vital','rapid','echo','magnet','heavy','regen','spill'],
 dense:['heavy','echo','rapid','quick','heal','vital','frost','width','regen','scatter','pierce','ricochet','spill','magnet'],
 spill:['spill','scatter','pierce','quick','heal','width','frost','rapid','vital','regen','echo','heavy','ricochet','magnet'],
 gun:['scatter','ricochet','rapid','pierce','heavy','vital','quick','width','regen','magnet']
};
function simulate({mode='cycle',build='weave',seed=4721,limit=900,source=null,version='0.5'}) {
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
     let value=fuel*5+route.targets*35;
     for(const e of r.enemies){if(e.dead)continue;
      if(a.segmentDistance(e.x,e.y,p.x,p.y,route.bx,route.by)<p.stitchWidth+e.r)value+=Math.min(e.hp,a.stitchDamage(fuel,e.ash||0,route.danger))*(e.type==='boss'?1.5:1);
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
 const r=a.run,total=r.damageTotals?Object.values(r.damageTotals).reduce((a,b)=>a+b,0):null;
 const result={version,mode,build,seed,limit,outcome:a.state==='result'?(r.player.hp>0?'win':'loss'):'time-limit',time:Math.floor(r.time),hp:Math.round(r.player.hp),level:r.player.level,kills:r.kills,stitchKills:r.stitchKills,bosses:r.bosses,
  poweredLeaps:r.poweredLeaps||0,dryLeaps:r.dryLeaps||0,firstSeed:r.onboarding?.firstSeed??null,firstPoweredLeap:r.onboarding?.firstLeap??null,firstStitchKill:r.onboarding?.firstKill??null,
  comboLeaps:r.comboLeaps||0,bonusLeaps:r.bonusLeaps||0,maxStitchTargets:r.maxStitchTargets||0,bulletsCleared:r.bulletsCleared||0,stitchDamageShare:total?Number((r.damageTotals.stitch/total).toFixed(4)):null,damageTotals:r.damageTotals||null,upgrades:r.player.upgrades,events};
 console.log(`${version} ${mode}/${build} seed ${seed}: ${result.outcome} ${result.time}s / ${result.kills} kills / stitch ${result.stitchDamageShare??'n/a'} / ${result.poweredLeaps} powered leaps`);
 return result;
}
const results=[];
try {
 const source=require('node:child_process').execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show','main:game.js'],{cwd:root,stdio:['ignore','pipe','ignore']}).toString();
 for(const [build,seed] of [['weave',4721],['dense',9481],['spill',20261001]])results.push(simulate({build,seed,source,version:'main baseline'}));
}catch{console.log('Local main baseline unavailable; comparison skipped.');}
results.push(simulate({mode:'shoot-only',limit:300}));
results.push(simulate({mode:'leap-only',limit:300}));
for(const [build,seed] of [['weave',4721],['dense',9481],['spill',20261001]])results.push(simulate({build,seed}));
const cycles=results.filter(r=>r.version==='0.5'&&r.mode==='cycle');
assert.ok(results.filter(r=>r.version==='0.5'&&r.mode!=='cycle').every(r=>r.kills===0));
assert.ok(cycles.every(r=>r.firstStitchKill!==null&&r.firstStitchKill<60));
assert.ok(cycles.every(r=>r.stitchDamageShare>=.85));
assert.ok(cycles.some(r=>r.time>=300&&r.kills>=150),'At least one natural five-minute cycle must remain playable.');
assert.ok(cycles.some(r=>r.outcome==='win'),'At least one full natural run must reach victory.');
assert.ok(cycles.some(r=>r.comboLeaps>10&&r.bulletsCleared>0));
assert.ok(cycles.some(r=>r.bonusLeaps>10));
fs.writeFileSync(path.join(root,'balance-verification.json'),JSON.stringify({version:'0.5',date:'2026-10-01',method:'deterministic accelerated simulation; local main baseline; normal HP/damage; exact route knowledge; no added fuel/XP/invulnerability; v0.5 bulletsCleared includes path and landing (main counts landing only)',sourceSHA256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'game.js'))).digest('hex'),results},null,2));
console.log('Core-loop balance assertions passed. These are bots, not human playtests.');
