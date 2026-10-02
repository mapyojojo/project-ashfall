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
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'docs/screenshots',name.replace(/^feedback-/,'chain-').replace(/^timing-/,'chain-')),Buffer.from(r.data,'base64'));};
 const snapshot=()=>evaluate(`FeedbackComparison.scenes.map(a=>({kind:a.run.stitches[0]?.feedback??'preview',targets:a.run.lastLeap?.targets,ash:a.run.lastLeap?.freshAsh,multiplier:a.run.stitches[0]?.denseMultiplier,hitStop:a.run.hitStop,pointPops:a.run.stitches[0]?.pointPops,impacts:a.run.impacts.map(q=>({kind:q.feedback,focus:!!q.focus,marker:!!q.marker,point:!!q.point,echo:!!q.echo,strength:q.strength})),wards:a.run.wards.map(w=>({radius:w.r,max:w.max})),late:a.run.enemies.filter(e=>e.testLate).map(e=>({hp:e.hp,y:e.y,mainHit:a.run.stitches[0]?.hitIds.has(e.id)??false,echoHit:a.run.stitches[0]?.echoIds.has(e.id)??false})),damage:a.run.damageTotals.stitch}))`);
 const render=async(ms,power='base')=>{await evaluate(`document.getElementById('time').value=${ms};document.getElementById('power').value='${power}';FeedbackComparison.render()`);return snapshot();};
 try{
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:740,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://localhost:4173/tests/feedback-comparison.html'});
  for(let i=0;i<30;i++){await wait(100);if(await evaluate('window.FeedbackComparison?.ready===3'))break;}
  assert.equal(await evaluate('FeedbackComparison.ready'),3);
  await render(0);await shot('feedback-preview.png');
  const phases=[];
  for(const [ms,name] of [[280,'start'],[410,'middle'],[520,'end']]){
   await evaluate(`document.querySelector('#moments [data-time="${ms}"]').click()`);
   const phase=await evaluate(`FeedbackComparison.scenes.map(a=>({kind:a.run.stitches[0].feedback,nodes:a.run.stitches[0].nodes,progress:a.run.stitches[0].progress,indices:a.run.impacts.filter(q=>!q.focus&&!q.point&&!q.echo).map(q=>q.index)}))`);
   assert.equal(phase[0].nodes,phase[1].nodes);assert.equal(phase[0].nodes,phase[2].nodes);assert.deepEqual(phase[0].indices,phase[2].indices);
   phases.push({ms,...Object.fromEntries(['normal','triple','dense'].map((kind,i)=>[kind,phase[i]]))});await shot(`chain-${name}.png`);
  }
  assert.ok(phases[0].normal.nodes<phases[1].normal.nodes&&phases[1].normal.nodes<phases[2].normal.nodes);assert.ok(phases[2].normal.progress<1);
  await render(180);await shot('feedback-landing.png');
  const main=await render(430);assert.deepEqual(main.map(s=>s.kind),['normal','triple','dense']);
  assert.ok(main[1].impacts.some(q=>q.kind==='triple'));assert.ok(main[2].impacts.some(q=>q.focus&&q.kind==='dense'&&q.strength===0));
  assert.equal(main[2].multiplier,1);await shot('feedback-comparison.png');
  assert.ok(main[2].impacts.some(q=>q.focus&&q.marker));assert.ok(main[2].impacts.some(q=>q.focus&&!q.marker));
  const safety=await render(500);assert.ok(safety[1].wards[0].radius>safety[2].wards[0].radius);await shot('feedback-safety.png');
  const boosted=await render(430,'boost');assert.equal(boosted[2].multiplier,1.75);assert.ok(boosted[2].impacts.some(q=>q.focus&&q.strength>0));await shot('feedback-boosted.png');
  const beforePoint=await render(490,'point');assert.equal(beforePoint[2].pointPops,0);
  const point=await render(710,'point');assert.equal(point[2].pointPops,1);assert.ok(point[2].impacts.some(q=>q.point&&q.kind==='point'));await shot('feedback-point.png');
  const second=await render(940,'point');assert.equal(second[2].pointPops,2);
  console.log('PASS actual canvas comparison: preview, landing, main blast, safety, boosted dense and delayed point');
  await evaluate("document.getElementById('scenario').value='main'");const lateMain=await render(850);assert.ok(lateMain.every(s=>s.late[0].hp===20000&&s.late[0].y===0&&!s.late[0].mainHit));await shot('timing-late-main.png');
  await evaluate("document.getElementById('scenario').value='echo'");const lateEcho=await render(1250);assert.ok(lateEcho.every(s=>s.late[0].hp===20000&&!s.late[0].mainHit&&!s.late[0].echoHit));await shot('timing-late-echo.png');
  await evaluate("document.getElementById('scenario').value='feedback'");await render(430);
  console.log('PASS main and reverse afterglow: enemies enter with 20000 HP and receive no damage');

  // Observe the actual Web Audio graph, not only the profile helper.
  await evaluate(`(()=>{for(const f of document.querySelectorAll('iframe')){const w=f.contentWindow,p=w.AudioContext.prototype,events=[];w.feedbackAudioEvents=events;
    for(const name of ['createOscillator','createBiquadFilter','createGain','createWaveShaper','createBuffer']){const original=p[name];p[name]=function(...args){const node=original.apply(this,args),entry={name,node,args,automation:[]};events.push(entry);
     const param=name==='createOscillator'?node.frequency:name==='createGain'?node.gain:null;
     if(param)for(const method of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime']){const originalParam=param[method];param[method]=function(...args){entry.automation.push({method,value:args[0],time:args[1]});return originalParam.apply(this,args);};}
     return node;};}
   }})()`);
  const button=await evaluate(`(()=>{const r=document.getElementById('play').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...button,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...button,button:'left',clickCount:1});
  // Button activates all contexts; isolate dedicated blast calls after the live replay.
  await wait(5400);
  const sounds=await evaluate(`(()=>{const frames=[...document.querySelectorAll('iframe')];return frames.map((f,i)=>{const w=f.contentWindow,a=w.AshfallTest;w.feedbackAudioEvents.length=0;a.blastSound(['normal','triple','dense'][i]);const graphs=w.feedbackAudioEvents.slice();w.feedbackAudioEvents.length=0;a.stitchNodeSound(['normal','triple','dense'][i],3);return {kind:['normal','triple','dense'][i],state:a.audioState,profile:a.feedbackSpec(['normal','triple','dense'][i]),filters:graphs.filter(e=>e.name==='createBiquadFilter').map(e=>({type:e.node.type,frequency:e.node.frequency.value})),oscillators:graphs.filter(e=>e.name==='createOscillator').map(e=>({type:e.node.type,automation:e.automation})),shapers:graphs.filter(e=>e.name==='createWaveShaper').map(e=>({samples:e.node.curve.length,oversample:e.node.oversample})),buffers:graphs.filter(e=>e.name==='createBuffer').map(e=>e.node.duration),envelopes:graphs.filter(e=>e.name==='createGain').map(e=>e.automation),chain:w.feedbackAudioEvents.filter(e=>e.name==='createOscillator').map(e=>({type:e.node.type,automation:e.automation}))};});})()`);
  assert.ok(sounds.every(s=>s.state==='running'&&s.filters.length===1));
  assert.deepEqual(sounds.map(s=>s.filters[0]),[{type:'lowpass',frequency:700},{type:'bandpass',frequency:1500},{type:'bandpass',frequency:750}]);
  assert.deepEqual(sounds[0].oscillators.map(o=>o.type),['sine','triangle']);assert.deepEqual(sounds[1].oscillators.map(o=>o.type),['sine','triangle','sine','triangle']);assert.deepEqual(sounds[2].oscillators.map(o=>o.type),['sine','triangle','triangle']);
  assert.ok(sounds.every(s=>s.oscillators[0].automation[0].value===72&&s.oscillators[1].automation[0].value===140));
  assert.equal(sounds[2].shapers.length,1);assert.equal(sounds[0].shapers.length,0);assert.equal(sounds[1].shapers.length,0);
  assert.ok(sounds[2].buffers[0]<.046&&sounds[0].buffers[0]>.21);assert.equal(sounds[2].profile.soundDuration,.12);assert.equal(sounds[2].profile.attack,.002);
  const compressed=sounds[2].envelopes[2];assert.ok(Math.abs(compressed[1].time-compressed[0].time-.002)<1e-6);assert.ok(Math.abs(compressed.at(-1).time-compressed[0].time-.12)<1e-6);
  assert.deepEqual(sounds.map(s=>s.chain.length),[1,2,1]);assert.ok(sounds.every(s=>s.chain[0].automation.at(-1).value<s.chain[0].automation[0].value));assert.ok(sounds[1].chain[1].automation.at(-1).value>sounds[1].chain[1].automation[0].value);
  console.log('PASS live Web Audio: shared falling blast and chain motif; compressed dense layer and rising triple layer; 2ms dense attack retained');
  assert.equal(errors.length,0,JSON.stringify(errors));
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  fs.writeFileSync(path.join(root,'feedback-verification.json'),JSON.stringify({version:'0.6.3',date:new Date().toISOString(),baseline:'028ca08',sourceSHA256:hash('game.js'),upgradesSHA256:hash('upgrades.js'),browser:(await send('Browser.getVersion')).product,runtimeErrors:errors.length,phases,main,safety,boosted,beforePoint,point,second,lateMain,lateEcho,sounds,limits:'Actual browser canvas snapshots and live Web Audio graph verified. Exact v0.6.2 combat/RNG parity is tested separately; perceived impact, hierarchy and screen clutter require human playtests.'},null,2));
 }finally{ws.close();for(const p of pending.values())clearTimeout(p.timer);}
})().catch(e=>{console.error(e);process.exitCode=1;});
