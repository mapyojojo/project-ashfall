const assert=require('node:assert/strict');
// Deliberate scenes verify projectile clearing independently from scheduled ground attacks.
module.exports=async function hazardScene({evaluate,shot}){
 const setup=`const a=AshfallTest;a.start();a.seed(20261001);a.run.onboarding.disabled=true;a.run.enemies=[];a.run.spawnTimer=100;a.run.time=240;a.run.eliteWave=1;a.run.player.autoFire=false;a.mouse.active=false;a.run.player.aim=0;`;
 const freeze=async expression=>evaluate(`(()=>{const a=AshfallTest;if(a.state==='paused')a.resume();${expression};a.pause();document.getElementById('pause').hidden=true;a.updateHud();a.drawGame();})()`);
 await evaluate(`(()=>{${setup}a.apply('ward');a.apply('ward');a.run.player.hp=100;a.run.player.x=310;const boss=a.spawnEnemy('boss',-500,350);boss.speed=0;boss.phase=1;boss.attack=0;a.update(.001);a.run.player.x=0;for(const x of [80,170,260]){const e=a.spawnEnemy('brute',x,0);e.hp=e.maxHp=1000;e.speed=0;e.wake=1000;a.seedEnemy(e,3);}for(const [x,y] of [[330,80],[420,-50],[650,200]])a.run.hostile.push({x,y,vx:-30,vy:0,r:5,damage:10,life:7});a.startDash(1,0);a.pause();})()`);
 const snapshot=()=>evaluate('({hp:AshfallTest.run.player.hp,wardActive:AshfallTest.run.wards.length>0,cleared:AshfallTest.run.bulletsCleared,bullets:AshfallTest.run.hostile.length,hazards:AshfallTest.run.hazards.map(h=>({x:h.x,y:h.y,timer:h.timer,life:h.life,hit:h.hit,damage:h.damage}))})');
 await freeze('a.step(.2)');const landing=await snapshot();assert.equal(landing.cleared,2);assert.equal(landing.bullets,1);assert.equal(landing.hazards.length,5);assert.ok(landing.hazards.every(h=>!h.hit&&h.timer>.9));await shot('ward-ground-warning.png');
 await freeze('a.step(.5)');const warning=await snapshot();assert.ok(warning.wardActive&&warning.hazards.every(h=>!h.hit&&h.timer>.4));
 await freeze('a.step(.5)');const impact=await snapshot();assert.ok(impact.wardActive);assert.equal(impact.hazards.length,5);assert.ok(impact.hazards.every(h=>h.hit));assert.equal(landing.hp-impact.hp,24);await shot('ward-ground-impact.png');
 await evaluate(`(()=>{${setup}for(const x of [80,170,260]){const e=a.spawnEnemy('crawler',x,0);e.speed=0;a.seedEnemy(e,3);}a.startDash(1,0);a.step(.2);a.run.hazards.push({x:a.run.player.x,y:a.run.player.y,r:64,timer:.45,life:1,hit:false,damage:16});a.pause();})()`);
 await freeze('a.step(.2)');const added=await snapshot();assert.ok(added.wardActive&&added.hazards.length===1&&!added.hazards[0].hit);await shot('ward-new-ground-warning.png');
 await freeze('a.step(.26)');const addedImpact=await snapshot();assert.ok(addedImpact.wardActive&&addedImpact.hazards[0].hit);assert.equal(added.hp-addedImpact.hp,16);
 return {landing,warning,impact,added,addedImpact};
};
