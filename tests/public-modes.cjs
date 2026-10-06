// Boot through the real runtime without using AshfallTest to observe public behavior.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./harness.cjs');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const marker='const DEVELOPMENT_MODES_ENABLED = true;';
assert.equal(source.split(marker).length,2);
const publicSource=process.env.ASHFALL_PUBLIC_DIR
 ?fs.readFileSync(path.join(process.env.ASHFALL_PUBLIC_DIR,'game.js'),'utf8')
 :source.replace(marker,'const DEVELOPMENT_MODES_ENABLED = false;');
assert.equal(publicSource,source.replace(marker,'const DEVELOPMENT_MODES_ENABLED = false;'));
let passed=0;
for(const query of ['', '?debug', '?test', '?test&debug'])for(const language of ['ja','en']){
 const saved={marks:100,best:741,wins:2,runs:8,relic:2,unknown:{keep:true}};
 const {sandbox,elements,storage}=engine({source:publicSource,query,language,savedMeta:saved,bootOnly:true});
 const el=id=>elements.get(id);
 assert.equal(sandbox.AshfallTest,undefined);
 for(const id of ['debugOpen','debugClose','debugGrant','debugAdvance','debugBossSpawn','debugEnemySpawn','debugInvincible'])assert.equal(el(id)?.onclick,undefined);
 assert.equal(sandbox.AshfallI18n.getLanguage(),language);
 // Retired loadout correction must follow normal saving, including with ?debug.
 assert.deepEqual(JSON.parse(storage['ashfall.v1']),{...saved,relic:0});
 el('startButton').onclick();
 assert.equal(el('timeText').textContent,'00:00');
 assert.equal(el('levelText').textContent,'LV 1');
 el('pauseButton').onclick();assert.equal(el('pause').hidden,false);
 el('quitButton').onclick();assert.equal(el('title').hidden,false);
 assert.equal(sandbox.AshfallTest,undefined);
 assert.deepEqual(JSON.parse(storage['ashfall.v1']),{...saved,relic:0});
 const nextLanguage=language==='ja'?'en':'ja';el(nextLanguage==='ja'?'languageJa':'languageEn').onclick();
 assert.equal(storage['ashfall.language'],nextLanguage);
 passed++;console.log('PASS public modes disabled, normal run/save/language:',query||'(no query)',language);
}
for(const query of ['?debug','?test','?test&debug']){
 const {sandbox,elements}=engine({query,bootOnly:true});
 assert.equal(typeof sandbox.AshfallTest,query.includes('test')?'object':'undefined');
 assert.equal(typeof elements.get('debugOpen')?.onclick,query.includes('debug')?'function':'undefined');
 passed++;console.log('PASS development source retains modes:',query);
}
console.log(`${passed} public mode checks passed.`);
