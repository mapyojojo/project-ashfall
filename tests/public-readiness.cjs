const {combatSource}=require('./combat-source.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const { engine } = require('./harness.cjs');
const { version } = require('../version.js');
const root = path.resolve(__dirname, '..'), baseline = 'b3f9265eef10ada6c728feb85896a235814c71d9';
let passed = 0;
const checks = [];
function test(name, fn) { fn(); passed++; checks.push(name); console.log('PASS', name); }
test('pause help preserves the run and returns to pause; sound labels agree after button and key input', () => {
  const a = engine({ intro: true }), run = a.run;
  a.pause(); a.elements.get('pauseHelp').onclick();
  assert.equal(a.state, 'help'); a.step(1); assert.equal(a.run.time, 0);
  a.elements.get('closeHelp').onclick(); assert.equal(a.state, 'paused'); assert.equal(a.run, run);
  a.elements.get('pauseSound').onclick();
  assert.equal(a.elements.get('soundButton').textContent, '音声 OFF');
  assert.equal(a.elements.get('pauseSound').textContent, '音声 OFF [M]');
  a.events.window.keydown({ code: 'KeyM', preventDefault() {} });
  assert.equal(a.elements.get('pauseSound').textContent, '音声 ON [M]');
  a.elements.get('resumeButton').onclick(); assert.equal(a.state, 'playing'); assert.equal(a.run, run);
  a.finish(false); a.elements.get('restartButton').onclick(); assert.notEqual(a.run, run);
  assert.equal(a.run.time, 0); assert.equal(a.run.upgradesTaken, 0);
});
test('offline entry uses the shared release version without fetching metadata', () => {
  const a = engine(), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.equal(a.elements.get('versionLabel').textContent, `v${version}`);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['version.js','storage.js','i18n/ja.js','i18n/en.js','i18n.js','upgrades.js','relics.js','audio.js','ui.js','input.js','game.js']);
  for (const file of scripts) assert.ok(fs.existsSync(path.join(root, file)));
});
let source, catalogSource;
try {
  const read = file => cp.execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'show', `${baseline}:${file}`], { cwd: root, stdio: ['ignore','pipe','ignore'] }).toString();
  source = read('game.js'); catalogSource = read('upgrades.js');
} catch { console.log('SKIP repository-only v0.6.3 combat comparison: baseline unavailable.'); }
if (source) {
  test('all upgrade effects, eligibility, weights, enemy definitions and combat functions match v0.6.3', () => {
    const before = engine({ source, catalogSource }), after = engine();
    const catalog = a => Array.from(a.UPGRADES, u => ({ id:u.id, name:u.name, family:u.family, max:u.max, excludes:u.excludes, apply:u.apply.toString(), requires:u.requires?.toString() }));
    const expectedCatalog = catalog(before).map(u => u.id === 'dense' ? { ...u, name:'密縫いの極意' } : u);
    assert.deepEqual(catalog(after), expectedCatalog);
    assert.equal(JSON.stringify(after.TYPES), JSON.stringify(before.TYPES));
    for (const key of ['update','spawnEnemy','hurtEnemy','hurtPlayer','startDash','endDash','seedEnemy','predictLeap','stitchDamage','denseSpec','pressureMultiplier','wardSpec','frontCrossing','lineDamage','addXp','scatterShards','assistedAngle','weight','eligible'])
      assert.equal(combatSource(after[key]), combatSource(before[key]), key);
  });
  const snapshot = a => JSON.stringify({ state:a.state, meta:a.meta, run:a.run }, (key,value) => {
    // These fields contain player copy, with no combat behavior. All other run state is compared.
    if (key === 'announced') return undefined;
    if (key === 'cards') return value.map(u => u.id);
    if (Object.prototype.toString.call(value) === '[object Set]') return [...value];
    if (Object.prototype.toString.call(value) === '[object Map]') return [...value];
    return value;
  });
  for (const [name, marks, upgrades] of [
    ['normal',[3,0,0],[]], ['triple',[2,2,2],['ward','heal']], ['dense',[0,6,0],['dense']],
    ['dense/pressure/point',[0,9,0],['dense','pressure','point','point']],
    ['propagation/shards/echo',[2,2,2],['propagation','shards','echo']],
    ['return/chain',[2,2,2],['quick','chain','chain','fast']], ['short',[2,2,2],['short','fast']]
  ]) test(`${name}: every frame, future enemies and upgrade RNG match v0.6.3`, () => {
    const before = engine({ source, catalogSource }), after = engine();
    for (const a of [before, after]) {
      a.apply('heavy'); a.apply('heavy');
      for (const id of upgrades) a.apply(id);
      [80,170,220].forEach((x,i) => { const e=a.spawnEnemy('brute',x,0); e.speed=0; e.wake=1000; e.hp=e.maxHp=10000; if(marks[i])a.seedEnemy(e,marks[i]); });
      a.startDash(1,0);
    }
    for (let frame=0; frame<360; frame++) {
      for (const a of [before,after]) {
        if (frame===45) a.events.window.keydown({code:'KeyF',preventDefault(){}});
        if (frame===80||frame===160) { for(const e of a.run.enemies)a.seedEnemy(e,3); if(a.run.player.bonusStitch)a.startDash(frame===80?-1:1,0); }
        a.update(1/60);
      }
      assert.equal(snapshot(after),snapshot(before),`frame ${frame}`);
    }
    for(let i=0;i<20;i++)for(const a of [before,after])a.spawnEnemy(i%2?'runner':'shooter');
    before.rollUpgrades();after.rollUpgrades();assert.equal(snapshot(after),snapshot(before));
  });
}
const hash = file => require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
fs.writeFileSync(path.join(root,'public-parity-verification.json'),JSON.stringify({version,baseline,baselineAvailable:!!source,date:new Date().toISOString(),sourceSHA256:hash('game.js'),upgradesSHA256:hash('upgrades.js'),checks,limits:'Player copy is excluded from announced text and card metadata. All combat state and future RNG are compared; full runs are in balance-verification.json.'},null,2));
console.log(`${passed} public readiness checks passed.`);
