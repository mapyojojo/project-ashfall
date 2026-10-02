const assert=require('node:assert/strict');
// Explicit scene setup isolates render phases; it is separate from natural play validation.
module.exports=async function effectScene({evaluate,shot}){
 await evaluate(`(()=>{const a=AshfallTest;a.start();a.seed(654321);a.run.onboarding.disabled=true;a.run.enemies=[];a.run.spawnTimer=100;a.run.player.autoFire=false;a.run.player.hp=70;a.mouse.active=false;a.run.player.aim=0;for(const x of [80,170,260]){const e=a.spawnEnemy('brute',x,0);e.speed=0;e.wake=1000;a.seedEnemy(e,3);}a.updateHud();a.startDash(1,0);a.pause();})()`);
 const freeze=async seconds=>{
  await evaluate(`(()=>{const a=AshfallTest;if(a.state==='paused')a.resume();a.step(${seconds});a.pause();document.getElementById('pause').hidden=true;a.drawGame();})()`);
  return evaluate('(()=>{const a=AshfallTest,s=a.run.stitches[0];return {time:a.run.time,kills:a.run.kills,harvests:a.run.harvests.length,ash:a.run.leap?.count??s?.count,nodes:s?.nodes??0,progress:s?.progress??0,hp:a.run.player.hp};})()');
 };
 const collected=await freeze(.08);assert.ok(collected.harvests>0&&collected.ash>0);await shot('stitch-collect.png');
 const windup=await freeze(.14);assert.equal(windup.nodes,0);assert.equal(windup.kills,0);assert.equal(windup.hp,70);await shot('stitch-windup.png');
 const front=await freeze(.17);assert.ok(front.nodes>0&&front.nodes<11);assert.ok(front.kills>0&&front.kills<3);await shot('stitch-front.png');
 const finish=await freeze(.18);assert.equal(finish.nodes,11);assert.equal(finish.kills,3);await shot('stitch-finish.png');
 return {collected,windup,front,finish};
};
