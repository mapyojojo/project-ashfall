const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function engine({intro=false,source=null,savedMeta=null,context=null,AudioContext=null}={}) {
  const elements=new Map(),events={window:{},canvas:{}};
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',innerHTML:'',style:{},dataset:{},getContext:()=>context||({setTransform(){}}),addEventListener(name,fn){if(id==='game')events.canvas[name]=fn;},querySelectorAll:()=>[]});return elements.get(id);};
  const storage=savedMeta?{'ashfall.v1':JSON.stringify(savedMeta)}:{};
  const sandbox={console,Math,Date,Set,Map,URLSearchParams,innerWidth:1280,innerHeight:720,devicePixelRatio:1,location:{search:'?test'},performance:{now:()=>0},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},document:{getElementById:element,addEventListener(){},documentElement:{}},addEventListener(name,fn){events.window[name]=fn;},requestAnimationFrame(){}};
  sandbox.window=sandbox;
  if(AudioContext)sandbox.AudioContext=AudioContext;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','upgrades.js'),'utf8'),sandbox,{filename:'upgrades.js'});
  vm.runInNewContext(source||fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8'),sandbox,{filename:'game.js'});
  const a=sandbox.AshfallTest;a.start();a.seed(123456);
  if(!intro){a.run.enemies=[];a.run.spawnTimer=100;a.run.player.autoFire=false;a.run.onboarding.disabled=true;}
  a.events=events;a.elements=elements;return a;
}
module.exports={engine};
