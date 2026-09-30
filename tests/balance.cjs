const {engine}=require('./smoke.cjs');
const fs=require('node:fs');
const results=[];
for(const build of ['gun','stitch','orbit']) {
 const a=engine();a.seed(4721);a.mouse.active=true;a.run.player.autoFire=true;
 const preference=build==='gun'?['scatter','ricochet','rapid','pierce','heavy','vital','quick','width','regen','magnet','orbit']:build==='stitch'?['width','quick','echo','heal','frost','vital','rapid','scatter','regen','magnet','orbit']:['orbit','orbitPower','quick','vital','regen','width','scatter','rapid','magnet'];
 let nextDash=0,minHp=110,events=[];
 for(let tick=0;tick<30000&&a.state!=='result';tick++) {
  if(a.state==='upgrade'){let best=0;for(let i=1;i<a.run.cards.length;i++){const rank=x=>{const n=preference.indexOf(x);return n<0?999:n;};if(rank(a.run.cards[i].id)<rank(a.run.cards[best].id))best=i;}a.chooseUpgrade(best);}
  const r=a.run,p=r.player,t=r.time;
  let target=null,near=Infinity;for(const e of r.enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(!e.dead&&d<near){target=e;near=d;}}
  if(target){a.mouse.x=640+target.x-r.camX;a.mouse.y=360+target.y-r.camY;}
  // Circle the furnace, then repel locally from enemies and hostile bullets.
  const angle=t*.23,goal={x:Math.cos(angle)*350,y:Math.sin(angle)*350};
  let dx=(goal.x-p.x)/120,dy=(goal.y-p.y)/120;
  for(const e of r.enemies){const ex=p.x-e.x,ey=p.y-e.y,d=Math.hypot(ex,ey)||1;const buffer=build==='orbit'?65:125;if(d<e.r+buffer){const s=(e.r+buffer-d)/50;dx+=ex/d*s;dy+=ey/d*s;}}
  for(const b of r.hostile){const ex=p.x-b.x,ey=p.y-b.y,d=Math.hypot(ex,ey)||1;if(d<60){dx+=ex/d*(60-d)/25;dy+=ey/d*(60-d)/25;}}
  if(p.hp<60&&r.pickups.length){const h=r.pickups[0];dx+=(h.x-p.x)/160;dy+=(h.y-p.y)/160;}
  a.keys.clear();if(Math.abs(dx)>.1)a.keys.add(dx>0?'KeyD':'KeyA');if(Math.abs(dy)>.1)a.keys.add(dy>0?'KeyS':'KeyW');
  if(p.dashTimer<=0&&t>nextDash){
   let best=null,score=0;
   for(let j=0;j<24;j++){
     const angle=j/24*Math.PI*2,ex=Math.max(-760,Math.min(760,p.x+Math.cos(angle)*225)),ey=Math.max(-760,Math.min(760,p.y+Math.sin(angle)*225));
     let count=0;for(const ash of r.ashes)if(a.segmentDistance(ash.x,ash.y,p.x,p.y,ex,ey)<p.stitchWidth+35)count+=ash.value;
     let s=count*4;const damage=(12+count*24)*p.stitchPower;
     for(const e of r.enemies){if(a.segmentDistance(e.x,e.y,p.x,p.y,ex,ey)<p.stitchWidth+e.r)s+=Math.min(damage,e.hp)*(build==='stitch'?2:1);if(Math.hypot(e.x-ex,e.y-ey)<e.r+35)s-=e.damage*10;}
     if(s>score&&count){score=s;best={x:ex,y:ey};}
   }
   if(best)a.startDash(best.x-p.x,best.y-p.y);else if(r.enemies.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<e.r+60))a.startDash(dx,dy);
   nextDash=t+.4;
  }
  a.update(1/30);minHp=Math.min(minHp,p.hp);
  if(tick%1800===0)events.push({time:Math.floor(t),hp:Math.ceil(p.hp),level:p.level,enemies:r.enemies.length,kills:r.kills});
 }
 const r=a.run;const result={build,state:a.state,time:Math.floor(r.time),hp:Math.round(r.player.hp),level:r.player.level,kills:r.kills,stitchKills:r.stitchKills,ashUsed:r.ashUsed,bosses:r.bosses,upgrades:r.player.upgrades,events};results.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync(require('node:path').resolve(__dirname,'../balance-verification.json'),JSON.stringify(results,null,2));
