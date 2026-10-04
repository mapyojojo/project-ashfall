const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function engine({intro=false,source=null,catalogSource=null,savedMeta=null,savedStorage=null,language='ja',browserLanguage='ja-JP',storageDenied=false,context=null,AudioContext=null}={}) {
  const elements=new Map(),events={window:{},canvas:{},document:{}};
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',innerHTML:'',style:{},dataset:{},getContext:()=>context||({setTransform(){}}),addEventListener(name,fn){if(id==='game')events.canvas[name]=fn;},querySelectorAll:()=>[]});return elements.get(id);};
  const storage=savedStorage|| (savedMeta?{'ashfall.v1':JSON.stringify(savedMeta)}:{});
  if(language)storage['ashfall.language']=language;
  const sandbox={console,Math,Date,Set,Map,URLSearchParams,innerWidth:1280,innerHeight:720,devicePixelRatio:1,location:{search:'?test'},performance:{now:()=>0},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},document:{getElementById:element,addEventListener(name,fn){events.document[name]=fn;},documentElement:{},fullscreenElement:null,hidden:false},addEventListener(name,fn){events.window[name]=fn;},requestAnimationFrame(){}};
  sandbox.window=sandbox;
  sandbox.navigator={language:browserLanguage};
  if(storageDenied)sandbox.localStorage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  if(AudioContext)sandbox.AudioContext=AudioContext;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','version.js'),'utf8'),sandbox,{filename:'version.js'});
  for(const file of ['storage.js','i18n/ja.js','i18n/en.js','i18n.js','relics.js','audio.js','ui.js','input.js'])
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox,{filename:file});
  vm.runInNewContext((catalogSource||fs.readFileSync(path.join(__dirname,'..','upgrades.js'),'utf8')).replaceAll('\r\n','\n'),sandbox,{filename:'upgrades.js'});
  vm.runInNewContext((source||fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8')).replaceAll('\r\n','\n'),sandbox,{filename:'game.js'});
  const a=sandbox.AshfallTest;a.start();a.seed(123456);
  if(!intro){a.run.enemies=[];a.run.spawnTimer=100;a.run.player.autoFire=false;a.run.onboarding.disabled=true;}
  a.events=events;a.elements=elements;a.document=sandbox.document;a.i18n=sandbox.AshfallI18n;a.storage=storage;a.locales=sandbox.AshfallLocales;return a;
}
module.exports={engine};
