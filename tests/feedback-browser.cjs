const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
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
 const snapshot=()=>evaluate(`FeedbackComparison.scenes.map(a=>({kind:a.run.stitches[0]?.feedback??'preview',targets:a.run.lastLeap?.targets,ash:a.run.lastLeap?.freshAsh,multiplier:a.run.stitches[0]?.denseMultiplier,hitStop:a.run.hitStop,pointPops:a.run.stitches[0]?.pointPops,impacts:a.run.impacts.map(q=>({kind:q.feedback,focus:!!q.focus,point:!!q.point,echo:!!q.echo,strength:q.strength})),wards:a.run.wards.map(w=>({radius:w.r,max:w.max})),damage:a.run.damageTotals.stitch}))`);
 const render=async(ms,power='base')=>{await evaluate(`document.getElementById('time').value=${ms};document.getElementById('power').value='${power}';FeedbackComparison.render()`);return snapshot();};
 try{
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:740,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://localhost:4173/tests/feedback-comparison.html'});
  for(let i=0;i<30;i++){await wait(100);if(await evaluate('window.FeedbackComparison?.ready===3'))break;}
  assert.equal(await evaluate('FeedbackComparison.ready'),3);
  await render(0);await shot('feedback-preview.png');
  await render(180);await shot('feedback-landing.png');
  const main=await render(430);assert.deepEqual(main.map(s=>s.kind),['normal','triple','dense']);
  assert.ok(main[1].impacts.some(q=>q.kind==='triple'));assert.ok(main[2].impacts.some(q=>q.focus&&q.kind==='dense'&&q.strength===0));
  assert.equal(main[2].multiplier,1);await shot('feedback-comparison.png');
  const safety=await render(500);assert.ok(safety[1].wards[0].radius>safety[2].wards[0].radius);await shot('feedback-safety.png');
  const boosted=await render(430,'boost');assert.equal(boosted[2].multiplier,1.75);assert.ok(boosted[2].impacts.some(q=>q.focus&&q.strength>0));await shot('feedback-boosted.png');
  const beforePoint=await render(490,'point');assert.equal(beforePoint[2].pointPops,0);
  const point=await render(710,'point');assert.equal(point[2].pointPops,1);assert.ok(point[2].impacts.some(q=>q.point&&q.kind==='point'));await shot('feedback-point.png');
  const second=await render(940,'point');assert.equal(second[2].pointPops,2);
  console.log('PASS actual canvas comparison: preview, landing, main blast, safety, boosted dense and delayed point');

  // Observe the actual Web Audio graph, not only the profile helper.
  await evaluate(`(()=>{for(const f of document.querySelectorAll('iframe')){const w=f.contentWindow,p=w.AudioContext.prototype,events=[];w.feedbackAudioEvents=events;
    for(const name of ['createOscillator','createBiquadFilter','createGain']){const original=p[name];p[name]=function(...args){const node=original.apply(this,args);events.push({name,node});return node;};}
   }})()`);
  const button=await evaluate(`(()=>{const r=document.getElementById('play').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...button,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...button,button:'left',clickCount:1});
  // Button activates all contexts; isolate dedicated blast calls after the live replay.
  await wait(5400);
  const sounds=await evaluate(`(()=>{const frames=[...document.querySelectorAll('iframe')];return frames.map((f,i)=>{const w=f.contentWindow,a=w.AshfallTest;w.feedbackAudioEvents.length=0;a.blastSound(['normal','triple','dense'][i]);return {kind:['normal','triple','dense'][i],state:a.audioState,filters:w.feedbackAudioEvents.filter(e=>e.name==='createBiquadFilter').map(e=>({type:e.node.type,frequency:e.node.frequency.value})),gains:w.feedbackAudioEvents.filter(e=>e.name==='createGain').map(e=>e.node.gain.value)};});})()`);
  assert.ok(sounds.every(s=>s.state==='running'&&s.filters.length===1));
  assert.deepEqual(sounds.map(s=>s.filters[0]),[{type:'lowpass',frequency:700},{type:'bandpass',frequency:1500},{type:'lowpass',frequency:480}]);
  assert.ok(sounds[2].gains.at(-1)<sounds[0].gains.at(-1));
  console.log('PASS live replay and activated Web Audio: airy triple bandpass, low dense compression, original normal filter');
  assert.equal(errors.length,0,JSON.stringify(errors));
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  fs.writeFileSync(path.join(root,'feedback-verification.json'),JSON.stringify({version:'0.6.1',date:new Date().toISOString(),baseline:'2be9dce',sourceSHA256:hash('game.js'),upgradesSHA256:hash('upgrades.js'),browser:(await send('Browser.getVersion')).product,runtimeErrors:errors.length,main,safety,boosted,beforePoint,point,second,sounds,limits:'Actual browser canvas snapshots and live Web Audio graph verified. Visual inspection is separate; audio perception and feel require a human playtest. Deterministic combat parity ignores intentional hitstop wall time.'},null,2));
 }finally{ws.close();for(const p of pending.values())clearTimeout(p.timer);}
})().catch(e=>{console.error(e);process.exitCode=1;});
