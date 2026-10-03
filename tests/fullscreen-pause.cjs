const assert=require('node:assert/strict');
const {engine}=require('./harness.cjs');
let passed=0;
const fullscreen=(a,active)=>{a.document.fullscreenElement=active?a.document.documentElement:null;a.events.document.fullscreenchange();};
const key=(a,code,repeat=false)=>{let prevented=0;a.events.window.keydown({code,repeat,preventDefault(){prevented++;}});return prevented;};
async function test(name,fn){await fn();passed++;console.log('PASS',name);}
(async()=>{
 await test('title and pause share fullscreen action; labels follow actual entry and exit',async()=>{
  const a=engine();a.goTitle();let entered=0,exited=0;
  a.document.documentElement.requestFullscreen=function(){assert.equal(this,a.document.documentElement);entered++;fullscreen(a,true);return Promise.resolve();};
  a.document.exitFullscreen=function(){assert.equal(this,a.document);exited++;fullscreen(a,false);return Promise.resolve();};
  assert.equal(a.elements.get('fullscreenButton').onclick,a.elements.get('pauseFullscreen').onclick);
  await a.elements.get('fullscreenButton').onclick();assert.equal(a.state,'title');assert.equal(a.run,null);
  for(const id of ['fullscreenButton','pauseFullscreen'])assert.equal(a.elements.get(id).textContent,'全画面を解除');
  a.start();assert.equal(a.state,'playing');const run=a.run;a.pause();
  await a.elements.get('pauseFullscreen').onclick();assert.equal(a.state,'paused');assert.equal(a.run,run);
  for(const id of ['fullscreenButton','pauseFullscreen'])assert.equal(a.elements.get(id).textContent,'全画面にする');
  await a.elements.get('pauseFullscreen').onclick();assert.equal(a.state,'paused');assert.equal(a.run,run);
  assert.equal(entered,2);assert.equal(exited,1);
 });
 await test('playing fullscreen exit pauses, clears pending input and freezes the same run',()=>{
  const a=engine(),run=a.run;fullscreen(a,true);assert.equal(a.state,'playing');
  a.keys.add('KeyW');a.mouse.down=true;run.leapRequested=true;
  fullscreen(a,false);assert.equal(a.state,'paused');assert.equal(a.run,run);assert.equal(a.elements.get('pause').hidden,false);
  assert.equal(run.leapRequested,false);assert.equal(a.mouse.down,false);assert.equal(a.keys.size,0);
  const before=JSON.stringify(run);a.update(2);assert.equal(JSON.stringify(run),before);
  key(a,'KeyP');assert.equal(a.state,'playing');assert.equal(a.run,run);assert.equal(run.leaps,0);
 });
 await test('Escape is never cancelled and cannot resume after fullscreen exit in either event order',()=>{
  for(const exitFirst of [false,true]){
   const a=engine();fullscreen(a,true);
   if(exitFirst)fullscreen(a,false);
   assert.equal(key(a,'Escape'),0);
   if(!exitFirst){assert.equal(a.state,'playing');fullscreen(a,false);}
   assert.equal(a.state,'paused');assert.equal(key(a,'Escape'),0);assert.equal(a.state,'paused');
   assert.equal(key(a,'KeyP'),1);assert.equal(a.state,'playing');
  }
  const a=engine();assert.equal(key(a,'Escape'),0);assert.equal(a.state,'paused');
  key(a,'Escape');assert.equal(a.state,'paused');a.elements.get('resumeButton').onclick();assert.equal(a.state,'playing');
 });
 await test('P pauses and resumes inside fullscreen without changing fullscreen or sound; repeats do not toggle',()=>{
  const a=engine(),run=a.run;fullscreen(a,true);a.elements.get('pauseSound').onclick();
  const sound=a.elements.get('soundButton').textContent;
  key(a,'KeyP');assert.equal(a.state,'paused');key(a,'KeyP',true);assert.equal(a.state,'paused');
  key(a,'KeyP');assert.equal(a.state,'playing');assert.equal(a.document.fullscreenElement,a.document.documentElement);
  assert.equal(a.run,run);assert.equal(a.elements.get('soundButton').textContent,sound);
  fullscreen(a,false);assert.equal(a.elements.get('soundButton').textContent,sound);assert.equal(a.elements.get('pauseSound').textContent,'音声 OFF [M]');
 });
 await test('exit events preserve title, help, loadout, upgrade choices, pause and result screens',()=>{
  for(const state of ['title','help','relics','upgrade','paused','result']){
   const a=engine();fullscreen(a,true);
   if(state==='title')a.goTitle();
   else if(state==='help')a.elements.get('helpButton').onclick();
   else if(state==='relics')a.showRelics();
   else if(state==='upgrade'){a.addXp(20);a.update(.01);}
   else if(state==='paused')a.pause();
   else a.finish(false);
   assert.equal(a.state,state);const run=a.run,before=JSON.stringify(run);
   fullscreen(a,false);a.events.document.fullscreenchange();
   assert.equal(a.state,state);assert.equal(a.run,run);assert.equal(JSON.stringify(run),before);
   if(state==='upgrade'){const id=a.run.cards[0].id;a.chooseUpgrade(0);assert.equal(a.run.player.upgrades[id],1);assert.equal(a.state,'playing');}
  }
 });
 await test('blur, hidden-tab and repeated exit notifications keep pause without accidentally resuming',()=>{
  for(const order of ['fullscreen-first','blur-first','visibility-first']){
   const a=engine(),run=a.run;fullscreen(a,true);
   if(order==='fullscreen-first')fullscreen(a,false);
   if(order==='blur-first')a.events.window.blur();
   a.document.hidden=true;a.events.document.visibilitychange();
   a.events.window.blur();fullscreen(a,false);a.events.document.fullscreenchange();
   assert.equal(a.state,'paused');assert.equal(a.run,run);
   a.document.hidden=false;a.events.document.visibilitychange();assert.equal(a.state,'paused');
   a.resume();assert.equal(a.state,'playing');
  }
 });
 await test('denied or unavailable fullscreen APIs leave the screen, run and labels intact',async()=>{
  const a=engine();a.pause();const run=a.run,before=JSON.stringify(run);
  a.document.documentElement.requestFullscreen=()=>Promise.reject(new Error('denied'));
  await a.elements.get('pauseFullscreen').onclick();assert.equal(a.state,'paused');assert.equal(JSON.stringify(run),before);assert.equal(a.elements.get('pauseFullscreen').textContent,'全画面にする');
  delete a.document.documentElement.requestFullscreen;await a.elements.get('pauseFullscreen').onclick();assert.equal(a.run,run);
  fullscreen(a,true);a.document.exitFullscreen=()=>Promise.reject(new Error('denied'));
  await a.elements.get('pauseFullscreen').onclick();assert.equal(a.state,'paused');assert.equal(a.elements.get('pauseFullscreen').textContent,'全画面を解除');
 });
 console.log(`${passed} fullscreen/pause checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
