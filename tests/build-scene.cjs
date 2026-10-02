const assert=require('node:assert/strict');
// Explicit scenes complement the natural-input run; they do not measure player enjoyment.
module.exports=async function buildScene({evaluate,send,shot}){
 const init=`const a=AshfallTest;a.start();a.seed(6006);a.run.enemies=[];a.run.spawnTimer=100;a.run.onboarding.disabled=true;a.run.player.autoFire=false;a.mouse.active=false;`;
 const freeze=async body=>evaluate(`(()=>{${body}a.pause();document.getElementById('pause').hidden=true;a.updateHud();a.drawGame();})()`);
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await freeze(`${init}a.apply('heavy');a.apply('heavy');a.apply('dense');a.apply('pressure');a.apply('point');a.apply('frost');const e=a.spawnEnemy('boss',140,0);e.speed=0;e.attack=1000;a.seedEnemy(e,9);`);
 const densePreview=await evaluate('({route:AshfallTest.predictLeap(1,0),success:AshfallTest.denseSpec(1,9),bossAsh:AshfallTest.run.boss.ash})');assert.ok(densePreview.success.success);await shot('v06-dense-preview.png');
 await freeze(`const a=AshfallTest;a.resume();a.startDash(1,0);a.step(.7);`);
 const dense=await evaluate('({last:AshfallTest.run.lastLeap,damage:AshfallTest.run.damageTotals.stitch,pops:AshfallTest.run.stitches[0].pointPops,slow:AshfallTest.run.boss.slow})');assert.ok(dense.last.dense&&!dense.last.combo);assert.equal(dense.pops,1);assert.ok(dense.damage>800&&dense.slow>1);await shot('v06-point-blast.png');
 await freeze(`${init}a.apply('shards');a.apply('shards');a.apply('propagation');a.apply('quick');a.apply('echo');for(const x of [80,170,260]){const e=a.spawnEnemy('brute',x,0);e.hp=e.maxHp=3000;e.speed=0;e.wake=1000;a.seedEnemy(e,3);}for(let i=0;i<18;i++){const e=a.spawnEnemy('brute',30+i*15,100+(i%2)*20);e.speed=0;e.wake=1000;}a.startDash(1,0);a.step(.5);`);
 const spread=await evaluate('({shots:AshfallTest.run.shardsFired,inFlight:AshfallTest.run.bullets.filter(b=>b.shard).length,combo:AshfallTest.run.comboLeaps,bonus:AshfallTest.run.player.bonusStitch,sideAsh:AshfallTest.run.enemies.filter(e=>e.y>80).reduce((n,e)=>n+e.ash,0)})');assert.ok(spread.shots>0&&spread.shots<=9);assert.ok(spread.inFlight<=9);assert.ok(spread.sideAsh>0);assert.equal(spread.combo,1);assert.equal(spread.bonus.depth,1);await shot('v06-shards-spread.png');
 await freeze(`${init}a.apply('quick');a.apply('chain');a.apply('chain');a.apply('short');a.apply('fast');const group=[40,110,190].map(x=>{const e=a.spawnEnemy('brute',x,0);e.hp=e.maxHp=30000;e.speed=0;e.wake=1000;a.seedEnemy(e,3);return e;});a.startDash(1,0);a.step(.15);for(const e of group.slice(0,2)){e.seedCooldown=0;a.seedEnemy(e,3);}a.startDash(-1,0);a.step(.15);`);
 const token=await evaluate('({...AshfallTest.run.player.bonusStitch,route:AshfallTest.predictLeap(1,0),hud:document.getElementById("dashText").textContent})');assert.equal(token.depth,2);assert.equal(token.hud,'連環縫い');await shot('v06-chain-ready.png');
 await freeze(`const a=AshfallTest;a.resume();for(const e of a.run.enemies){e.seedCooldown=0;a.seedEnemy(e,3);}a.startDash(1,0);a.step(.15);`);
 const chain=await evaluate('({leaps:AshfallTest.run.leaps,returns:AshfallTest.run.bonusLeaps,chains:AshfallTest.run.chainLeaps,bonus:AshfallTest.run.player.bonusStitch,distance:AshfallTest.run.player.dashDistance})');assert.equal(chain.leaps,3);assert.equal(chain.returns,1);assert.equal(chain.chains,1);assert.equal(chain.bonus,null);assert.equal(chain.distance,248);
 // All three family labels, a prerequisite and the needle exclusion fit at compact size.
 await send('Emulation.setDeviceMetricsOverride',{width:1024,height:640,deviceScaleFactor:1,mobile:false});
 await evaluate(`(()=>{${init}a.run.pending=1;a.rollUpgrades();const ids=['propagation','dense','short'];document.getElementById('upgradeCards').innerHTML=ids.map((id,i)=>a.upgradeCard(a.UPGRADES.find(u=>u.id===id),i)).join('');})()`);
 const tags=await evaluate('Array.from(document.querySelectorAll(".family-tag"),e=>e.textContent)');assert.deepEqual(tags,['拡散','濃縮','連続']);assert.ok(await evaluate('Array.from(document.querySelectorAll(".upgrade-card")).every(e=>e.getBoundingClientRect().bottom<=innerHeight&&e.scrollHeight<=e.clientHeight+1)'));await shot('v06-family-cards.png');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 return {densePreview,dense,spread,token,chain,tags};
};
