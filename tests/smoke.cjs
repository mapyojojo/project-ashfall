const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function engine() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { hidden: false, textContent: '', innerHTML: '', style: {}, dataset: {},
      getContext: () => ({ setTransform() {} }), addEventListener() {}, querySelectorAll: () => [] });
    return elements.get(id);
  };
  const storage = {};
  const sandbox = { console, Math, Date, Set, Map, URLSearchParams, innerWidth: 1280, innerHeight: 720,
    devicePixelRatio: 1, location: { search: '?test' }, performance: { now: () => 0 },
    localStorage: { getItem: k => storage[k] || null, setItem: (k,v) => storage[k] = v },
    document: { getElementById: element, addEventListener() {}, documentElement: {} },
    addEventListener() {}, requestAnimationFrame() {} };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), sandbox, { filename: 'game.js' });
  sandbox.AshfallTest.start(); sandbox.AshfallTest.seed(123456);
  return sandbox.AshfallTest;
}
let passed = 0;
function test(name, fn) { fn(); console.log('PASS', name); passed++; }

test('starts a playable run with isolated test API', () => {
  const a=engine();assert.equal(a.state,'playing');assert.equal(a.run.player.hp,110);assert.equal(a.run.player.level,1);
});
test('aimed shooting kills, creates ash and experience', () => {
  const a=engine(),e=a.spawnEnemy('crawler',100,0);a.run.spawnTimer=100;a.mouse.down=true;a.step(1);
  assert.ok(e.dead);assert.ok(a.run.kills>=1);assert.ok(a.run.ashes.length>0);assert.ok(a.run.orbs.length>0||a.run.player.xp>0);
});
test('dash collects ash and detonates along its full path', () => {
  const a=engine();a.run.spawnTimer=100;a.run.ashes.push({x:90,y:0,value:3,life:20});const e=a.spawnEnemy('brute',120,0);
  e.speed=0;a.startDash(1,0);a.step(.2);assert.equal(a.run.ashUsed,3);assert.equal(a.run.ashes.length,0);
  assert.equal(a.run.stitches[0].damage,84);assert.ok(a.run.player.dashTimer<2.6-.2);
  a.step(.4);assert.ok(e.hp<e.maxHp-70);
});
test('dash invulnerability prevents contact damage', () => {
  const a=engine();a.startDash(1,0);a.hurtPlayer(90);assert.equal(a.run.player.hp,110);
});
test('fueled stitches hit late arrivals only once', () => {
  const a=engine();a.run.spawnTimer=100;a.run.ashes.push({x:60,y:0,value:1,life:20});a.startDash(1,0);a.step(.6);
  const e=a.spawnEnemy('brute',100,0);e.hp=e.maxHp=500;e.speed=0;a.update(.01);assert.equal(e.hp,464);a.update(.01);assert.equal(e.hp,464);
});
test('dash sweeps experience and health along its path', () => {
  const a=engine();a.run.spawnTimer=100;a.run.player.hp=50;a.run.orbs.push({x:100,y:0,value:4,life:75,pull:false});a.run.pickups.push({x:140,y:0,heal:12,life:25});
  a.startDash(1,0);a.step(.2);assert.equal(a.run.player.xp,4);assert.equal(a.run.player.hp,62);assert.equal(a.run.orbs.length,0);assert.equal(a.run.pickups.length,0);
});
test('stitch damage scales and contributes to its own kill statistic', () => {
  const a=engine();a.run.spawnTimer=100;const e=a.spawnEnemy('crawler',100,0);e.speed=0;
  a.run.ashes.push({x:60,y:0,value:2,life:20});a.startDash(1,0);a.step(.6);assert.ok(e.dead);assert.equal(a.run.stitchKills,1);
});
test('upgrade interrupts combat and applies exactly one choice', () => {
  const a=engine();a.addXp(20);a.update(.01);assert.equal(a.state,'upgrade');const time=a.run.time;a.update(3);assert.equal(a.run.time,time);
  const id=a.run.cards[0].id;a.chooseUpgrade(0);assert.equal(a.state,'playing');assert.equal(a.run.player.upgrades[id],1);
  a.chooseUpgrade(0);assert.equal(a.run.player.upgrades[id],1);
});
test('multiple levels queue separate choices without losing experience', () => {
  const a=engine();a.addXp(200);a.update(.01);const n=a.run.pending;assert.ok(n>1);
  for(let i=0;i<n;i++)a.chooseUpgrade(0);assert.equal(a.state,'playing');assert.equal(a.run.upgradesTaken,n);
});
test('first level presents three different offensive builds', () => {
  const a=engine();a.addXp(20);a.update(.01);assert.deepEqual(Array.from(a.run.cards,u=>u.id).sort(),['orbit','scatter','width']);
});
test('exhausted upgrades still produce a selectable late-game card', () => {
  const a=engine();for(const u of a.UPGRADES)if(u.id!=='ember')a.run.player.upgrades[u.id]=u.max;
  a.run.upgradesTaken=40;a.run.pending=1;a.rollUpgrades();assert.equal(a.run.cards.length,1);assert.equal(a.run.cards[0].id,'ember');a.chooseUpgrade(0);assert.equal(a.state,'playing');
});
test('every upgrade changes its intended mechanic', () => {
  for(const u of engine().UPGRADES){const a=engine();if(u.id==='orbitPower')a.apply('orbit');const before=JSON.stringify(a.run.player);a.apply(u.id);assert.notEqual(JSON.stringify(a.run.player),before,u.id);}
  const a=engine();a.apply('scatter');assert.equal(a.run.player.shots,3);a.apply('pierce');assert.equal(a.run.player.pierce,2);
  a.apply('ricochet');assert.equal(a.run.player.bounce,1);a.apply('echo');assert.equal(a.run.player.stitchEcho,1);
});
test('stitch recovery, slowdown and echo activate', () => {
  const a=engine();a.run.spawnTimer=100;a.apply('heal');a.apply('frost');a.apply('echo');a.run.player.hp=50;
  a.run.ashes.push({x:60,y:0,value:3,life:20});const e=a.spawnEnemy('brute',110,0);e.hp=e.maxHp=500;e.speed=0;
  a.startDash(1,0);a.step(.2);assert.equal(a.run.player.hp,54);assert.ok(e.slow>2);
  a.step(.9);assert.ok(e.hp<380);assert.ok(a.run.stitches[0].echoed);
});
test('splitters create three fast enemies on death', () => {
  const a=engine(),e=a.spawnEnemy('splitter',200,0);a.hurtEnemy(e,999);assert.equal(a.run.enemies.filter(e=>e.type==='mite').length,3);
});
test('boss threshold spawns final encounter and handles victory once', () => {
  const a=engine();a.run.time=719.99;a.update(.02);assert.equal(a.run.boss.type,'boss');assert.ok(a.run.finalSpawned);
  a.hurtEnemy(a.run.boss,1e9,'stitch');assert.equal(a.state,'result');assert.equal(a.meta.wins,1);
  a.finish(true);assert.equal(a.meta.wins,1);assert.ok(a.meta.marks>=15);
});
test('each three-minute guardian encounter appears', () => {
  const a=engine();for(let wave=1;wave<=3;wave++){a.run.time=180*wave;a.update(.01);assert.equal(a.run.eliteWave,wave);assert.equal(a.run.boss.type,'elite');a.hurtEnemy(a.run.boss,1e9);}
  assert.equal(a.run.bosses,3);
});
test('loss and restart reset transient state, preserve progression', () => {
  const a=engine();a.run.time=95;a.hurtPlayer(1e9);assert.equal(a.state,'result');assert.ok(a.meta.marks>0);
  const marks=a.meta.marks;a.start();assert.equal(a.run.time,0);assert.equal(a.run.kills,0);assert.equal(a.meta.marks,marks);assert.equal(a.state,'playing');
});
test('pause and title transitions stop simulation', () => {
  const a=engine();a.pause();assert.equal(a.state,'paused');a.update(1);assert.equal(a.run.time,0);a.resume();assert.equal(a.state,'playing');a.goTitle();assert.equal(a.run,null);
});
test('arena bounds, normalized diagonals and dash cooldown', () => {
  const a=engine();a.run.spawnTimer=100;a.keys.add('KeyD');a.keys.add('KeyS');a.update(.1);assert.ok(Math.abs(Math.hypot(a.run.player.x,a.run.player.y)-22.5)<.01);
  a.run.player.x=779;a.startDash(1,0);a.step(.2);assert.ok(a.run.player.x<=760);const x=a.run.player.x;a.startDash(-1,0);assert.equal(a.run.player.x,x);
});
test('all enemy attack patterns and long-session arrays stay finite', () => {
  const a=engine();a.run.spawnTimer=100;for(const type of Object.keys(a.TYPES))a.spawnEnemy(type,300,100);
  for(let i=0;i<1200;i++){a.run.player.invuln=100;a.update(1/60);}
  assert.ok(a.run.hostile.length>0);assert.ok(a.run.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.hp)));
  assert.ok(a.run.particles.length<=650);assert.ok(a.run.hostile.length<300);
});
console.log(`\n${passed} mechanical tests passed.`);
module.exports = { engine };
