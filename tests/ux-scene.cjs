const assert=require('node:assert/strict');
module.exports=async function uxScene({evaluate,send,shot,wait,click}){
 await send('Page.reload');await wait(400);await click('startButton');await wait(180);
 assert.equal(await evaluate('AshfallTest.run.enemies.length'),0);assert.equal(await evaluate("document.getElementById('dashText').textContent"),'仕込み');await shot('intro-autofire.png');
 await send('Input.dispatchMouseEvent',{type:'mousePressed',x:980,y:450,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:980,y:450,button:'left',clickCount:1});await wait(80);assert.equal(await evaluate('AshfallTest.run.leaps'),0);
 await wait(1900);assert.ok(await evaluate('AshfallTest.run.enemies.some(e=>e.ash>0)'));assert.equal(await evaluate("document.getElementById('dashText').textContent"),'READY');await shot('prepared.png');
 // Explicit layout scene: offer relevant cards with a build that supports all three notes.
 await send('Emulation.setDeviceMetricsOverride',{width:1024,height:640,deviceScaleFactor:1,mobile:false});
 await evaluate(`(()=>{const a=AshfallTest;a.seed(600605);a.apply('pierce');a.apply('ricochet');a.apply('quick');a.run.upgradesTaken=2;a.run.pending=1;for(let i=0;i<100;i++){a.rollUpgrades();if(a.run.cards.every(u=>['ricochet','pierce','propagation','quick','echo','heal'].includes(u.id)))break;}})()`);await wait(80);
 assert.equal(await evaluate("Array.from(document.querySelectorAll('.upgrade-card')).some(e=>e.getBoundingClientRect().bottom>innerHeight)"),false);assert.ok(await evaluate("document.querySelectorAll('.synergy-note').length>=2"));await shot('compact-synergy-upgrades.png');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
};
