const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const targets=await(await fetch('http://127.0.0.1:9223/json')).json(),target=targets.find(t=>t.type==='page');assert.ok(target);
 const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[];let next=0;
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(new Error(method));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'docs/screenshots',name),Buffer.from(r.data,'base64'));};
 try{
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://localhost:4173/?test'});await wait(400);
  const button=await evaluate("(()=>{const r=document.getElementById('startButton').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");await send('Input.dispatchMouseEvent',{type:'mousePressed',...button,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...button,button:'left',clickCount:1});assert.equal(await evaluate('AshfallTest.state'),'playing');
  const groundAttacks=await require('./hazard-scene.cjs')({evaluate,shot});console.log('PASS projectile clearing; existing and new ground warnings persist and inflict damage');
  const flow=await require('./flow-scene.cjs')({evaluate,shot:async()=>{}});console.log('PASS existing stitch flow with ground warning preserved');
  assert.equal(errors.length,0,JSON.stringify(errors));
  fs.writeFileSync(path.join(root,'hazard-verification.json'),JSON.stringify({version:'0.6',change:'Landing wards clear flying projectiles only; ground attacks keep warning, lifetime and damage.',date:new Date().toISOString(),upgradesSHA256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'upgrades.js'))).digest('hex'),sourceSHA256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'game.js'))).digest('hex'),runtimeErrors:errors.length,groundAttacks,flow,limits:'Short, explicitly set up browser scenes. No new seven-minute natural-input run.'},null,2));console.log('PASS zero browser runtime exceptions');
 }finally{ws.close();for(const p of pending.values())clearTimeout(p.timer);}
})().catch(e=>{console.error(e);process.exitCode=1;});
