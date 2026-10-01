const assert=require('node:assert/strict');
const {engine}=require('./harness.cjs');
let passed=0;
function test(name,fn){fn();console.log('PASS',name);passed++;}
function foe(a,type='crawler',x=140,y=0){const e=a.spawnEnemy(type,x,y);e.speed=0;return e;}
function mark(a,e,n=3){a.seedEnemy(e,n);}

test('ricochet corrects toward a fast moving enemy; the piercing shot stays straight',()=>{
 function scenario(piercing,guided){
  const a=engine();a.apply('ricochet');if(piercing)a.apply('pierce');const first=foe(a,'brute',140),side=foe(a,'runner',230,60),column=foe(a,'brute',360,0);
  side.charge=1;side.vx=0;side.vy=420;side.attack=10;a.run.player.autoFire=true;a.update(.01);a.run.player.autoFire=false;
  let corrected=false;for(let i=0;i<65;i++){
   if(!guided)for(const b of a.run.bullets)if(b.fork)b.guideTarget=null;
   a.update(.01);for(const b of a.run.bullets){if(!b.fork){assert.equal(b.vy,0);assert.equal(b.guideTarget,undefined);}else if(b.guideTarget){corrected=true;assert.ok(b.guideTime<=.38&&b.guideTurn<=.7);}}
  }
  return {a,first,side,column,corrected};
 }
 for(const piercing of [false,true]){const good=scenario(piercing,true),straight=scenario(piercing,false);assert.ok(good.side.ash>0);assert.equal(straight.side.ash,0);assert.ok(good.corrected);if(piercing)assert.ok(good.column.ash>0);assert.equal(good.a.run.kills,0);}
});

test('ricochet drops dead or passed targets, limits turning and never renews lifetime',()=>{
 const a=engine();a.apply('ricochet');foe(a,'brute');const target=foe(a,'crawler',240,80);a.run.player.autoFire=true;a.step(.14);a.run.player.autoFire=false;
 const b=a.run.bullets.find(b=>b.fork);assert.ok(b);const speed=Math.hypot(b.vx,b.vy),before=Math.atan2(b.vy,b.vx),life=b.life;
 target.y+=70;a.update(.01);const after=Math.atan2(b.vy,b.vx);assert.ok(Math.abs(after-before)<=.032001);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-speed)<1e-6);assert.ok(b.life<life);
 target.dead=true;const vx=b.vx,vy=b.vy;a.update(.01);assert.equal(b.guideTarget,null);assert.equal(b.vx,vx);assert.equal(b.vy,vy);a.step(1.3);assert.equal(a.run.bullets.length,0);
 const c=engine();c.apply('ricochet');foe(c,'brute');const missed=foe(c,'crawler',240,80);c.run.player.autoFire=true;c.step(.14);c.run.player.autoFire=false;const branch=c.run.bullets.find(b=>b.fork);missed.x=branch.x-100;missed.y=branch.y;c.update(.01);assert.equal(branch.guideTarget,null);
});

test('all cards show current, next and locked levels; a choice advances exactly once',()=>{
 const a=engine();for(const u of a.UPGRADES.filter(u=>u.max<=3)){
  for(let current=0;current<u.max;current++){
   const html=a.upgradeCard(u,0);assert.ok(html.includes(`data-current="${current}" data-next="${current+1}"`));assert.equal((html.match(/data-status="owned"/g)||[]).length,current);assert.equal((html.match(/data-status="next"/g)||[]).length,1);assert.equal((html.match(/data-status="locked"/g)||[]).length,u.max-current-1);assert.ok(html.includes(`現在 Lv${current}`)&&html.includes(`取得後 Lv${current+1}`));a.apply(u.id);
  }
 }
 const b=engine();b.addXp(20);b.update(.01);const u=b.run.cards[0];b.chooseUpgrade(0);assert.equal(b.run.player.upgrades[u.id],1);b.rollUpgrades();assert.ok(b.upgradeCard(u,0).includes('現在 Lv1 → <b>取得後 Lv2'));
 for(const u of b.UPGRADES)if(u.id!=='ember')b.run.player.upgrades[u.id]=u.max;b.run.upgradesTaken=40;b.rollUpgrades();assert.equal(b.run.cards[0].id,'ember');assert.equal((b.elements.get('upgradeCards').innerHTML.match(/upgrade-stage next/g)||[]).length,1);
});

test('a live ricochet target cannot keep steering the projectile past the correction window',()=>{
 const a=engine();a.apply('ricochet');foe(a,'brute');const target=foe(a,'crawler',240,80);a.run.player.autoFire=true;a.step(.14);a.run.player.autoFire=false;
 const b=a.run.bullets.find(b=>b.fork);assert.ok(b);target.x=650;target.y=400;a.step(.4);assert.ok(b.guideTime<=0);assert.equal(b.dead,false);
 const vx=b.vx,vy=b.vy;target.x=200;target.y=600;a.update(.01);assert.equal(b.vx,vx);assert.equal(b.vy,vy);a.step(1);assert.equal(a.run.bullets.length,0);
});

test('beginner explanations end after earned stitches or a lesson, pause, and reset per run',()=>{
 const a=engine({intro:true});assert.equal(a.showStitchHelp(),true);assert.equal(a.elements.get('coach').hidden,false);
 a.run.player.autoFire=false;a.run.enemies=[];a.run.time=2;a.run.onboarding.introduced=true;a.run.onboarding.firstSeed=0;
 for(let i=0;i<3;i++){a.run.stitches=[];a.run.player.dashTimer=0;mark(a,foe(a,'crawler',a.run.player.x+(i%2?-100:100)));a.startDash(i%2?-1:1,0);a.step(.4);assert.equal(a.showStitchHelp(),i<2);}
 a.updateHud();assert.equal(a.elements.get('coach').hidden,true);assert.equal(a.elements.get('routeText').hidden,true);a.start();assert.equal(a.showStitchHelp(),true);
 a.run.onboarding.completeAt=a.run.time;a.pause();a.update(21);assert.equal(a.showStitchHelp(),true);a.resume();a.run.time=20;a.updateHud();assert.equal(a.showStitchHelp(),false);
 const b=engine({intro:true});b.run.time=180;assert.equal(b.showStitchHelp(),false);const c=engine();assert.equal(c.showStitchHelp(),false);
});

test('results count captured foes, triples, executed returns and both bullet clearing routes',()=>{
 const a=engine();a.apply('quick');for(const x of [80,170,260])mark(a,foe(a,'brute',x),1);
 for(const [x,y] of [[80,0],[100,0],[330,70]])a.run.hostile.push({x,y,vx:0,vy:0,life:7,damage:12,r:5});
 a.run.hazards.push({x:330,y:70,r:50,timer:1,life:2,hit:false,damage:24});a.startDash(1,0);a.step(.2);
 assert.equal(a.run.maxStitchTargets,3);assert.equal(a.run.comboLeaps,1);assert.equal(a.run.bonusLeaps,0);assert.equal(a.run.bulletsCleared,3);assert.equal(a.run.lastLeap.bulletsCut,2);assert.equal(a.run.hazards[0].hit,false);
 a.startDash(-1,0);a.step(.2);assert.equal(a.run.bonusLeaps,1);assert.equal(a.run.maxStitchTargets,3);assert.equal(a.run.bulletsCleared,3);a.finish(false);
 const html=a.elements.get('resultStats').innerHTML;assert.ok(html.includes('最大同時灰縫い')&&html.includes('三重縫い')&&html.includes('返し縫い')&&html.includes('消した敵弾'));assert.equal((html.match(/<strong>/g)||[]).length,4);assert.ok(!html.includes('討伐'));assert.ok(a.elements.get('resultCopy').textContent.includes('生存時間'));
 a.start();assert.equal(a.run.maxStitchTargets,0);assert.equal(a.run.comboLeaps,0);assert.equal(a.run.bonusLeaps,0);assert.equal(a.run.bulletsCleared,0);
});
console.log(`${passed} v0.5 clarity tests passed.`);
