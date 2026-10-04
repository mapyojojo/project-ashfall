const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./harness.cjs');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
const japanese=/[一-龯ぁ-んァ-ン]/;
test('both dictionaries have identical keys and interpolation names; all references resolve',()=>{
  const a=engine(),{ja,en}=a.locales;
  assert.deepEqual(Object.keys(ja).sort(),Object.keys(en).sort());
  const params=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  for(const key of Object.keys(ja)){assert.ok(ja[key]&&en[key],key);assert.deepEqual(params(ja[key]),params(en[key]),key);if(key!=='language.ja')assert.ok(!japanese.test(en[key]),key);}
  const root=path.resolve(__dirname,'..');
  for(const file of ['index.html','game.js','ui.js','input.js','upgrades.js','relics.js']){
    const source=fs.readFileSync(path.join(root,file),'utf8');
    assert.ok(!japanese.test(source),file+' has no embedded Japanese copy');
    for(const match of source.matchAll(/(?:\bt\('([^']+)'(?=[,)])|data-i18n(?:-html|-title|-aria)?="([^"]+)")/g))assert.ok((match[1]||match[2]) in ja,match[1]||match[2]);
  }
});
test('browser default, persisted choice, invalid preference and rejected storage',()=>{
  for(const [browserLanguage,expected] of [['ja-JP','ja'],['ja','ja'],['en-US','en'],['fr-FR','en']])assert.equal(engine({language:null,browserLanguage}).i18n.getLanguage(),expected);
  assert.equal(engine({language:'en',browserLanguage:'ja-JP'}).i18n.getLanguage(),'en');
  assert.equal(engine({language:'ja',browserLanguage:'en-US'}).i18n.getLanguage(),'ja');
  assert.equal(engine({language:'invalid',browserLanguage:'en-US'}).i18n.getLanguage(),'en');
  const a=engine({storageDenied:true});a.i18n.setLanguage('en');assert.equal(a.i18n.getLanguage(),'en');a.finish(false);a.goTitle();assert.equal(a.state,'title');
});
test('title buttons switch immediately and persist through a new engine without changing v1 save bytes',()=>{
  const meta={marks:31,best:741,wins:2,runs:8,relic:3,legacyExtra:'preserved'},storage={'ashfall.v1':JSON.stringify(meta)};
  const a=engine({language:null,savedStorage:storage});a.goTitle();
  a.elements.get('languageEn').onclick();assert.equal(a.i18n.getLanguage(),'en');assert.equal(a.elements.get('soundButton').textContent,'Sound ON');
  assert.equal(storage['ashfall.v1'],JSON.stringify(meta));assert.equal(storage['ashfall.language'],'en');
  const b=engine({language:null,savedStorage:storage,browserLanguage:'ja-JP'});assert.equal(b.i18n.getLanguage(),'en');assert.deepEqual(JSON.parse(JSON.stringify(b.meta)),meta);
  assert.equal(b.run.player.shots,2);assert.equal(b.run.player.fireRate,.18*1.12);
  b.goTitle();b.showRelics();const cards=b.elements.get('relicChoices').innerHTML;assert.ok(cards.includes('data-relic="3"'));assert.ok(!cards.includes('data-relic="2"'));assert.ok(!cards.includes('disabled'));
  b.elements.get('languageJa').onclick();assert.equal(b.elements.get('soundButton').textContent,'音声 ON');assert.equal(storage['ashfall.v1'],JSON.stringify(meta));
});
test('every card, level, synergy, loadout, HUD, result and pause refresh in both languages without rerolling',()=>{
  const a=engine({savedMeta:{marks:40,runs:5,best:800,wins:1,relic:1}});a.apply('heavy');a.apply('quick');a.apply('pierce');a.apply('short');
  a.addXp(20);a.update(.01);const ids=Array.from(a.run.cards,u=>u.id),before=JSON.stringify(a.run.player),pending=a.run.pending;
  for(const language of ['en','ja','en','ja']){
    a.i18n.setLanguage(language);assert.deepEqual(Array.from(a.run.cards,u=>u.id),ids);assert.equal(JSON.stringify(a.run.player),before);assert.equal(a.run.pending,pending);
    for(const u of a.UPGRADES){const card=a.upgradeCard(u,0);assert.ok(card.includes(a.i18n.t(u.nameKey)));assert.ok(card.includes(a.i18n.t(u.descKey)));if(language==='en')assert.ok(!japanese.test(card),u.id);}
    for(const id of ['relicChoices','buildChips','coachHint','primeText','phaseText'])assert.ok(a.elements.get(id)[id==='relicChoices'||id==='buildChips'?'innerHTML':'textContent']);
  }
  a.chooseUpgrade(0);a.pause();const run=a.run;a.i18n.setLanguage('en');assert.equal(a.state,'paused');assert.equal(a.run,run);a.resume();a.finish(true);
  const meta=JSON.stringify(a.meta);
  for(const language of ['ja','en','ja']){
    a.i18n.setLanguage(language);assert.equal(JSON.stringify(a.meta),meta,'result refresh never awards Sigils twice');
    assert.equal(a.elements.get('resultTitle').textContent,a.i18n.t('result.winTitle'));
    for(const id of ['resultStats','resultBuild'])if(language==='en')assert.ok(!japanese.test(a.elements.get(id).innerHTML),id);
  }
});
test('fallback and invalid language calls are deterministic and preserve interpolation values',()=>{
  const a=engine();assert.equal(a.i18n.setLanguage('xx'),false);assert.equal(a.i18n.getLanguage(),'ja');assert.equal(a.i18n.t('missing.key'),'missing.key');
  assert.equal(a.i18n.t('title.nextUnlock',{need:25,name:'$&'}),' · 25印で「$&」解放');
});
console.log(`${passed} i18n checks passed.`);
