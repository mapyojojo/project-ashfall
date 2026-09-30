/* Project Ashfall: all visuals and audio are generated locally. No dependencies. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ARENA = 1560, HALF = ARENA / 2, END_TIME = 720;
  let W = 1280, H = 720, dpr = 1, state = 'title', run = null, last = 0, ambient = 0;
  let soundOn = true, audio = null, seed = 0, frame = 0;
  const keys = new Set(), mouse = { x: 900, y: 360, down: false, active: false };
  let meta = { marks: 0, best: 0, wins: 0, runs: 0, relic: 0 };
  try { Object.assign(meta, JSON.parse(localStorage.getItem('ashfall.v1')) || {}); } catch {}
  const relics = [
    { name: '旅人の護符', need: 0, detail: '最大耐久 +10', apply: p => { p.maxHp += 10; p.hp += 10; } },
    { name: '灰織りの針', need: 5, detail: '灰紋の回収幅 +6', apply: p => { p.collectWidth += 6; } },
    { name: '灰の中継衛星', need: 12, detail: '射撃で刻んだ灰紋を増やす衛星 1基', apply: p => { p.orbits++; } },
    { name: '割れた銃身', need: 25, detail: '仕込み弾 +1 / 射撃間隔 +12%', apply: p => { p.shots++; p.fireRate *= 1.12; } }
  ];
  function rng() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
  const random = (a, b) => a + rng() * (b - a);
  const pick = a => a[Math.floor(rng() * a.length)];
  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();
  function tone(freq, duration, shape = 'sine', volume = .05, slide = 1) {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const now = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = shape; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now + duration);
  }
  function initAudio() { try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch {} }
  function toggleSound() { soundOn = !soundOn; $('soundButton').textContent = `音声 ${soundOn ? 'ON' : 'OFF'}`; if (soundOn) initAudio(); }
  function screen(id) { ['title','help','upgrade','pause','result'].forEach(s => { $(s).hidden = s !== id; }); $('hud').hidden = !run || id === 'title' || (id === 'help' && !run); }
  function saveMeta() { try { localStorage.setItem('ashfall.v1', JSON.stringify(meta)); } catch {} }
  function titleRecord() {
    meta.relic = clamp(Number(meta.relic) || 0, 0, 3);
    if (meta.marks < relics[meta.relic].need) meta.relic = 0;
    const next = relics.find(r => r.need > meta.marks);
    $('recordText').textContent = meta.runs ? `残火印 ${meta.marks} · 最長 ${timeText(meta.best)} · 炉心破壊 ${meta.wins} 回${next ? ` · ${next.need}印で「${next.name}」解放` : ' · 全装備解放'}` : '12分の戦闘 + 最終ボス / 1ラン約12〜16分';
    $('relicButton').textContent = `持ち込み：${relics[meta.relic].name} / ${relics[meta.relic].detail} ↻`;
  }
  function newPlayer() {
    return { x: 0, y: 0, r: 13, hp: 100, maxHp: 100, speed: 225, aim: 0, damage: .8,
      fireRate: .18, shotTimer: 0, shots: 1, spread: .17, pierce: 0, bounce: 0, bulletSpeed: 800,
      ashPerHit: 1, ashCap: 3, ashDuration: 10, ashSpill: 0, seedSlow: 0,
      dashCd: 2.6, dashDistance: 310, dashTimer: 0, dashTime: 0, dashVx: 0, dashVy: 0, dashStart: null,
      collectWidth: 20, stitchWidth: 58, stitchPower: 1, stitchSlow: 0, stitchEcho: 0, stitchHeal: 0,
      invuln: 0, orbits: 0, magnet: 175, regen: 0,
      xp: 0, level: 1, xpNeed: 14, autoFire: false, upgrades: {}, walk: 0 };
  }
  function start() {
    initAudio(); keys.clear(); mouse.down = false;
    seed = ((Date.now() ^ 0x6d2b79f5) >>> 0) || 1;
    run = { time: 0, player: newPlayer(), enemies: [], bullets: [], hostile: [], ashes: [], orbs: [],
      stitches: [], particles: [], texts: [], hazards: [], pickups: [], kills: 0, ashUsed: 0,
      stitchKills: 0, bosses: 0, spawnTimer: .3, shake: 0, flash: 0, camX: 0, camY: 0,
      announced: '', announceTimer: 0, eliteWave: 0, finalSpawned: false, boss: null,
      nextId: 1, cards: [], pending: 0, statsTimer: 0, upgradesTaken: 0, ended: false,
      leap: null, leapRequested: false, leaps: 0, poweredLeaps: 0, dryLeaps: 0, seededHits: 0,
      damageTotals: { bullet: 0, stitch: 0, orbit: 0 }, lastLeap: null, leapFlash: 0, hitStop: 0,
      onboarding: { stage: 0, firstSeed: null, firstLeap: null, firstKill: null, completeAt: null } };
    relics[meta.relic].apply(run.player);
    state = 'playing'; screen(null); updateBuild();
    // A real, small encounter puts the first prepared enemy within a single leap.
    for(const [x,y] of [[140,-18],[210,8],[280,35]])spawnEnemy('crawler',x,y).wake=3;
    run.spawnTimer=7;announce('',0);updateHud();
  }
  function goTitle() { run = null; state = 'title'; keys.clear(); mouse.down = false; screen('title'); titleRecord(); }
  function pause() { if (state === 'playing') { state = 'paused'; run.leapRequested=false; mouse.down = false; keys.clear(); screen('pause'); } else if (state === 'paused') resume(); }
  function resume() { if (state === 'paused') { state = 'playing'; keys.clear(); screen(null); } }
  function announce(text, seconds = 3) { run.announced = text; run.announceTimer = seconds; $('announcement').textContent = text; }
  function timeText(t) { const s = Math.floor(t); return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; }
  function finish(win) {
    if (run.ended) return;
    run.ended = true; state = 'result'; keys.clear(); mouse.down = false;
    const marks = run.time >= 30 ? Math.floor(run.time / 75) + run.bosses * 2 + (win ? 6 : 1) : 0;
    const before = meta.marks; meta.marks += marks; meta.runs++; meta.best = Math.max(meta.best, run.time); if (win) meta.wins++;
    saveMeta(); screen('result');
    $('resultEyebrow').textContent = win ? 'THE FURNACE FALLS SILENT' : 'THE FIRE FADES';
    $('resultTitle').textContent = win ? '炉心は、沈黙した。' : '灰へ還る。';
    $('resultCopy').textContent = win ? '仕込み、見極め、突破した。炉に小さな夜明けが戻る。' : '撃って灰を仕込み、群れをリープで縫う。次は、その経路を変えてみよう。';
    $('resultStats').innerHTML = `<div><strong>${timeText(run.time)}</strong><span>生存時間</span></div><div><strong>${run.kills}</strong><span>討伐数</span></div><div><strong>${run.stitchKills}</strong><span>灰縫い討伐</span></div>`;
    $('resultBuild').innerHTML = Object.entries(run.player.upgrades).map(([id,n]) => `<span class="chip">${UPGRADES.find(u=>u.id===id).name} ${n}</span>`).join('') || '<span class="chip">初期装備のみ</span>';
    const unlocked = relics.filter(r => r.need > before && r.need <= meta.marks);
    const total=Object.values(run.damageTotals).reduce((a,b)=>a+b,0);
    $('metaText').textContent = `灰縫いダメージ ${total?Math.round(run.damageTotals.stitch/total*100):0}% · 起爆 ${run.poweredLeaps}回 / 空振り ${run.dryLeaps}回。残火印 +${marks} / 合計 ${meta.marks}。${unlocked.map(r => '「'+r.name+'」解放！').join(' ')}`;
    tone(win ? 440 : 160, .6, 'triangle', .1, win ? 2 : .3);
  }
  const UPGRADES = [
    { id:'scatter', name:'扇に蒔く灰', cat:'PRIME / 扇状配置', max:3, desc:'仕込み弾 +2。横に並ぶ敵へ灰紋を分散。広く仕込んで、群れを横切る経路を作る。', apply:p=>{p.shots+=2;p.spread+=.025;} },
    { id:'pierce', name:'灰の串', cat:'PRIME / 直線配置', max:3, desc:'仕込み弾がさらに2体を貫通。奥の敵まで灰紋を付け、一直線のリープにまとめる。', apply:p=>{p.pierce+=2;p.bulletSpeed*=1.08;} },
    { id:'ricochet', name:'隣へ渡す灰', cat:'PRIME / 連鎖配置', max:3, desc:'近くの別の敵へ跳弾 +1。照準の外へ灰紋を広げる。銃の威力は増えない。', apply:p=>p.bounce++ },
    { id:'rapid', name:'細い灰雨', cat:'PRIME / 仕込み速度', max:3, desc:'射撃間隔 -18%。短い仕込みで次のリープへ。灰紋の上限は変わらない。', apply:p=>p.fireRate*=.82 },
    { id:'heavy', name:'濃灰の刻印', cat:'PRIME / 濃い灰', max:3, desc:'1命中の灰紋 +1、蓄積上限 +2。射撃間隔 +12%。少数の敵に濃い灰を仕込む。', apply:p=>{p.ashPerHit++;p.ashCap+=2;p.fireRate*=1.12;} },
    { id:'width', name:'長い縫い針', cat:'LEAP / 経路', max:3, desc:'リープ距離 +40、灰紋の回収幅 +6、燃焼帯の幅 +14。深い敵群をまとめて縫う。', apply:p=>{p.dashDistance+=40;p.collectWidth+=6;p.stitchWidth+=14;} },
    { id:'quick', name:'返し縫い', cat:'LEAP / 再仕込み', max:3, desc:'リープ待機時間 -14%、移動速度 +4%。往復して、仕込みと起爆を短い周期で回す。', apply:p=>{p.dashCd*=.86;p.speed*=1.04;} },
    { id:'frost', name:'留める白灰', cat:'PRIME / 配置制御', max:2, desc:'命中した敵を短く減速。起爆前も足止めし、動く灰紋を狙った経路に留める。', apply:p=>{p.seedSlow+=.45;p.stitchSlow=2.2;} },
    { id:'echo', name:'二重の縫い目', cat:'LEAP / 起爆', max:2, desc:'燃焼帯が0.5秒後に再起爆。初段は50%、次の段階は75%の威力。灰のないリープでは発動しない。', apply:p=>p.stitchEcho++ },
    { id:'heal', name:'危地の息継ぎ', cat:'RETURN / 突破報酬', max:2, desc:'灰のあるリープで敵2体以上を横切るか、弾3発以上を抜けると耐久 +4。次の段階は +8。', apply:p=>p.stitchHeal+=4 },
    { id:'orbit', name:'灰の中継衛星', cat:'PRIME / 仕込み補助', max:3, desc:'衛星 +1。射撃で灰紋を付けた敵に接触して、その灰を増やす。未刻印の敵には働かず、直接攻撃もしない。', apply:p=>p.orbits++ },
    { id:'spill', name:'零れる灰', cat:'PRIME / 地面配置', max:2, desc:'満杯の敵へ命中すると足元に灰を落とす。灰は6秒残り、通常移動では拾えない。次の段階で落ちる間隔を短縮。', apply:p=>p.ashSpill++ },
    { id:'vital', name:'消えない心臓', cat:'RETURN / 耐久', max:3, desc:'最大耐久 +20、耐久を30回復。突破の後、次の仕込みへ立て直す。', apply:p=>{p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+30);} },
    { id:'magnet', name:'残火の呼び声', cat:'RETURN / 成長回収', max:2, desc:'青い経験値の回収距離 +60、移動速度 +4%。橙の灰は引き寄せない。', apply:p=>{p.magnet+=60;p.speed*=1.04;} },
    { id:'regen', name:'火種の余韻', cat:'RETURN / 周期回復', max:2, desc:'灰のあるリープ後4秒間、毎秒耐久 +0.5。仕込みと起爆を続けるほど回復も続く。', apply:p=>p.regen+=.5 },
    { id:'ember', name:'尽きない残火', cat:'RETURN / 最終強化', max:999, requires:p=>UPGRADES.filter(u=>u.id!=='ember').every(u=>(p.upgrades[u.id]||0)>=u.max), desc:'すべての強化を終えた者へ。灰縫いの威力 +8%、耐久を20回復。', apply:p=>{p.stitchPower*=1.08;p.hp=Math.min(p.maxHp,p.hp+20);} }
  ];
  function rollUpgrades() {
    const p = run.player;
    const available = UPGRADES.filter(u => (p.upgrades[u.id]||0)<u.max && (!u.requires||u.requires(p)));
    const cards = [];
    // All three opening choices change how the same prime/leap cycle is set up.
    if(run.upgradesTaken===0)cards.push(...['scatter','pierce','heavy'].map(id=>available.find(u=>u.id===id)).filter(Boolean));
    else {
      for(const category of ['PRIME','LEAP','RETURN']){const pool=available.filter(u=>u.cat.startsWith(category));if(pool.length)cards.push(pick(pool));}
    }
    while(cards.length < Math.min(3, available.length)) { const u = pick(available); if(!cards.includes(u)) cards.push(u); }
    for(let i=cards.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
    run.cards = cards; state = 'upgrade'; mouse.down = false; keys.clear(); screen('upgrade');
    $('upgradeSub').textContent = `LV ${p.level} · 耐久 ${Math.ceil(p.hp)} / ${p.maxHp} · 戦闘は一時停止中`;
    $('upgradeCards').innerHTML = cards.map((u,i)=>`<button class="upgrade-card" data-card="${i}"><span class="category">${u.cat}</span><span class="number">0${i+1}</span><h3>${u.name}</h3><p>${u.desc}</p><span class="rank">段階 ${(p.upgrades[u.id]||0)+1} / ${u.max}</span></button>`).join('');
    $('upgradeCards').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>chooseUpgrade(Number(b.dataset.card))));
    tone(620,.15,'triangle',.06,1.5);
  }
  function chooseUpgrade(index) {
    if(state!=='upgrade' || !run.cards[index])return;
    const p=run.player,u=run.cards[index]; u.apply(p);p.upgrades[u.id]=(p.upgrades[u.id]||0)+1;
    run.upgradesTaken++;run.pending--;state='playing';screen(null);keys.clear();
    updateBuild(); updateHud();
    if(run.pending>0)rollUpgrades();
  }
  function addXp(n) {
    const p=run.player;p.xp+=n;
    while(p.xp>=p.xpNeed) {
      p.xp-=p.xpNeed;p.level++;p.xpNeed=Math.round(14+Math.pow(p.level,1.45)*9);run.pending++;
    }
  }
  function updateBuild() { $('buildChips').innerHTML=Object.entries(run.player.upgrades).map(([id,n])=>`<span class="chip">${UPGRADES.find(u=>u.id===id).name} ${n}</span>`).join(''); }
  function updateHud() {
    const p=run.player;
    $('hpText').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('hpBar').style.width=`${p.hp/p.maxHp*100}%`;
    $('xpBar').style.width=`${p.xp/p.xpNeed*100}%`;$('levelText').textContent=`LV ${p.level}`;
    $('timeText').textContent=timeText(run.time);$('phaseText').textContent=run.finalSpawned?'炉心 / 最終決戦':run.time<240?'灰の庭':run.time<480?'燃える回廊':'炉心への道';
    $('dashBar').style.width=`${clamp(1-p.dashTimer/p.dashCd,0,1)*100}%`;$('dashText').textContent=p.dashTimer<=0?'READY':`${p.dashTimer.toFixed(1)}s`;
    $('killText').textContent=run.kills;$('announcement').style.opacity=clamp(run.announceTimer,0,1);
    const preview=predictLeap();
    $('primeText').textContent=`灰紋 ${run.enemies.filter(e=>!e.dead&&e.ash>0).length}体`;
    $('routeText').textContent=preview.ash?`経路の灰 ${preview.ash} / ${preview.targets}体`:'灰紋のある敵を横切る';
    const lesson=run.onboarding;
    $('coach').hidden=lesson.completeAt!==null&&run.time>lesson.completeAt+10;
    $('coach').dataset.stage=String(lesson.stage);
    $('coachHint').textContent=lesson.stage===0?'左クリックで敵に灰紋を仕込む':lesson.stage===1?'橙の印を SPACE で横切る':'撃って仕込む → リープで決着';
    const boss=run.boss&&!run.boss.dead?run.boss:null;$('bossHud').hidden=!boss;
    if(boss){$('bossName').textContent=boss.type==='boss'?'炉心 / THE LAST FURNACE':'灰の番人';$('bossHp').textContent=`${Math.ceil(boss.hp/boss.maxHp*100)}%`;$('bossBar').style.width=`${boss.hp/boss.maxHp*100}%`;}
  }
  function particle(x,y,color,n=8,speed=110,size=3) {
    for(let i=0;i<n&&run.particles.length<650;i++){const a=random(0,TAU),s=random(speed*.25,speed);run.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color,life:random(.18,.5),max:.5,size:random(size*.4,size)});}
  }
  function floating(x,y,text,color='#ffbb86') { if(run.texts.length<65)run.texts.push({x,y,text,color,life:.8}); }
  function segmentDistance(x,y,ax,ay,bx,by) {const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-ax-dx*t,y-ay-dy*t);}
  function movementDirection() {
    const dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    const dy=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    return {dx,dy};
  }
  function ashLimit(e) {return run.player.ashCap+(e.type==='boss'||e.type==='elite'?6:0);}
  function seedEnemy(e,amount=run.player.ashPerHit) {
    if(e.dead||e.seedCooldown>0)return;
    const p=run.player,before=e.ash;
    e.ash=Math.min(ashLimit(e),e.ash+amount);e.ashLife=p.ashDuration;e.seedCooldown=.065;e.seedFlash=.12;
    if(p.seedSlow)e.slow=Math.max(e.slow,p.seedSlow);
    if(e.ash>before){
      run.seededHits++;particle(e.x,e.y,'#cd9c68',2,35,2);
      if(run.onboarding.firstSeed===null){run.onboarding.firstSeed=run.time;run.onboarding.stage=1;floating(e.x,e.y-e.r-26,'灰紋 / SPACE','#ffc584');tone(480,.12,'triangle',.035,1.25);}
    } else if(p.ashSpill&&e.spillCooldown<=0){
      run.ashes.push({x:e.x,y:e.y,value:1,life:6,r:12,phase:random(0,TAU),hint:0});e.spillCooldown=p.ashSpill===1?.9:.5;
    }
  }
  function predictLeap(dx,dy) {
    const p=run.player;if(dx===undefined){({dx,dy}=movementDirection());}
    if(!dx&&!dy){dx=Math.cos(p.aim);dy=Math.sin(p.aim);}
    const m=Math.hypot(dx,dy)||1;
    const route={ax:p.x,ay:p.y,bx:clamp(p.x+dx/m*p.dashDistance,-HALF+20,HALF-20),by:clamp(p.y+dy/m*p.dashDistance,-HALF+20,HALF-20),ash:0,targets:0,danger:0};
    for(const e of run.enemies){if(e.dead)continue;const d=segmentDistance(e.x,e.y,route.ax,route.ay,route.bx,route.by);if(e.ash&&d<p.collectWidth+e.r){route.ash+=e.ash;route.targets++;}if(d<e.r+p.r+4)route.danger++;}
    for(const a of run.ashes)if(segmentDistance(a.x,a.y,route.ax,route.ay,route.bx,route.by)<p.collectWidth+12)route.ash+=a.value;
    return route;
  }
  function stitchDamage(count,local=0,danger=0) {
    return count?(32+16*Math.min(count,12)+26*local)*run.player.stitchPower*(1+Math.min(.6,danger*.12)):0;
  }
  function gatherLeap(ax,ay,bx,by) {
    const p=run.player,l=run.leap;
    for(const e of run.enemies){
      if(e.dead)continue;
      const d=segmentDistance(e.x,e.y,ax,ay,bx,by);
      if(d<e.r+p.r+4)l.crossings.add(e.id);
      if(e.ash&&d<p.collectWidth+e.r&&!l.targets.has(e.id)){
        l.count+=e.ash;l.targets.set(e.id,e.ash);e.ash=0;e.ashLife=0;e.stitchHold=Math.max(e.stitchHold,p.dashTime+.2);
        particle(e.x,e.y,'#ffdba3',8,100,3);
      }
    }
    run.ashes=run.ashes.filter(a=>{if(segmentDistance(a.x,a.y,ax,ay,bx,by)<p.collectWidth+12){l.count+=a.value;particle(a.x,a.y,'#ffdba3',6,80);return false;}return true;});
    for(const b of run.hostile)if(b.life>0&&segmentDistance(b.x,b.y,ax,ay,bx,by)<p.r+b.r+5){b.life=0;l.bulletsCut++;particle(b.x,b.y,'#b6e6d6',3,80);}
    for(const h of run.hazards)if(h.timer>0&&segmentDistance(h.x,h.y,ax,ay,bx,by)<h.r+p.r)l.hazards.add(h);
  }
  function hurtPlayer(dmg) {
    const p=run.player;if(p.invuln>0||p.dashTime>0)return;
    p.hp=Math.max(0,p.hp-dmg);p.invuln=.85;run.flash=.2;run.shake=Math.max(run.shake,7);
    particle(p.x,p.y,'#f97964',12,140);tone(90,.16,'sawtooth',.065,.5);
    if(p.hp<=0)finish(false);
  }
  function hurtEnemy(e,dmg,source='bullet',kx=0,ky=0) {
    if(e.dead)return;
    // Preparation can scrape at most 15% of a foe's health; it can never deliver the kill.
    if(source==='bullet')dmg=Math.max(0,Math.min(dmg,e.hp-e.maxHp*.85));
    const actual=Math.min(e.hp,Math.max(0,dmg));
    run.damageTotals[source]=(run.damageTotals[source]||0)+actual;
    e.hp-=dmg;e.hit=source==='stitch'?.12:0;e.kx+=kx;e.ky+=ky;
    if(e.hp<=0) {
      e.dead=true;run.kills++;if(source==='stitch')run.stitchKills++;
      const boss=e.type==='boss'||e.type==='elite';
      particle(e.x,e.y,boss?'#ffc384':'#ed895d',boss?55:7,boss?260:110,boss?6:3);
      // Kills reward experience, not free fuel: the next cycle needs new preparation.
      const xp=e.type==='boss'?150:e.type==='elite'?55:e.type==='brute'?5:e.type==='shooter'?3:2;
      run.orbs.push({x:e.x,y:e.y,value:xp,life:75,pull:false});
      if(boss||rng()<.032)run.pickups.push({x:e.x,y:e.y,life:25,heal:boss?30:12});
      if(e.type==='splitter')for(let i=0;i<3;i++)spawnEnemy('mite',e.x+random(-24,24),e.y+random(-24,24));
      if(boss){run.bosses++;run.shake=14;tone(75,.5,'sawtooth',.12,.2);if(e.type==='boss')finish(true);else announce('番人を撃破 / 残火と回復を回収せよ');}
      else if(frame%3===0)tone(random(160,240),.045,'triangle',.018,.4);
      if(source==='stitch'&&run.onboarding.firstKill===null){run.onboarding.firstKill=run.time;run.onboarding.completeAt=run.time;run.onboarding.stage=2;}
    }
  }
  const TYPES = {
    crawler:{hp:30,speed:88,r:13,damage:10,color:'#c9a898'},
    runner:{hp:22,speed:149,r:10,damage:9,color:'#f1a163'},
    shooter:{hp:45,speed:65,r:15,damage:12,color:'#ba91bd'},
    brute:{hp:125,speed:52,r:24,damage:20,color:'#b58c67'},
    splitter:{hp:68,speed:82,r:18,damage:13,color:'#bad09a'},
    mite:{hp:14,speed:162,r:7,damage:6,color:'#c8d58f'},
    elite:{hp:1200,speed:65,r:35,damage:16,color:'#ffb575'},
    boss:{hp:10500,speed:47,r:55,damage:26,color:'#ff946b'}
  };
  function spawnEnemy(type,x,y) {
    const t=TYPES[type],p=run.player;
    if(x===undefined){const a=random(0,TAU),radius=Math.max(W,H)*.6+random(80,160);x=clamp(p.x+Math.cos(a)*radius,-HALF+30,HALF-30);y=clamp(p.y+Math.sin(a)*radius,-HALF+30,HALF-30);if(Math.hypot(x-p.x,y-p.y)<330){x=clamp(p.x+(p.x>0?-530:530),-HALF+30,HALF-30);y=clamp(p.y+random(-350,350),-HALF+30,HALF-30);}}
    const scale=1+run.time/900;
    const hp=type==='boss'?t.hp:type==='elite'?t.hp*(1+run.eliteWave*.48):t.hp*scale;
    const e={id:run.nextId++,type,x,y,hp,maxHp:hp,speed:t.speed*(type==='boss'||type==='elite'?1:1+run.time/2200),r:t.r,damage:t.damage,color:t.color,
      kx:0,ky:0,hit:0,slow:0,attack:random(.7,2),phase:random(0,TAU),dead:false,wind:0,charge:0,vx:0,vy:0,orbitHit:0,
      ash:0,ashLife:0,seedCooldown:0,seedFlash:0,spillCooldown:0,stitchHold:0,wake:0};
    run.enemies.push(e);if(type==='boss'||type==='elite')run.boss=e;return e;
  }
  function spawnWave(dt) {
    if(run.time>=END_TIME&&!run.finalSpawned){run.finalSpawned=true;run.enemies.forEach(e=>e.dead=true);run.hostile=[];run.hazards=[];spawnEnemy('boss',0,-280);announce('炉心、覚醒 / 灰紋を刻み、リープで断て。',5);tone(80,.8,'sawtooth',.1,1.3);}
    const wave=Math.min(3,Math.floor(run.time/180));
    if(wave>run.eliteWave&&!run.finalSpawned){run.eliteWave=wave;spawnEnemy('elite');announce('灰の番人 / 接近と環状弾に注意',4);}
    run.spawnTimer-=dt;
    const maxEnemies=run.finalSpawned?55:135;
    if(run.spawnTimer<=0&&run.enemies.length<maxEnemies){
      const stage=Math.floor(run.time/90),count=run.finalSpawned?2:1+Math.floor(stage/3);
      for(let i=0;i<count;i++) {
        let pool=stage<1?['crawler','crawler','runner']:stage<2?['crawler','runner','shooter']:stage<3?['crawler','runner','shooter','brute']:['crawler','runner','shooter','brute','splitter'];
        spawnEnemy(pick(pool));
      }
      run.spawnTimer=run.finalSpawned?2.3:Math.max(.28,1.0-run.time/1000);
    }
  }
  function startDash(dx,dy) {
    const p=run.player;if(state!=='playing'||p.dashTimer>0||p.dashTime>0)return;
    if(!dx&&!dy){dx=Math.cos(p.aim);dy=Math.sin(p.aim);}
    const m=Math.hypot(dx,dy);p.dashVx=dx/m*p.dashDistance/.18;p.dashVy=dy/m*p.dashDistance/.18;p.dashTime=.18;p.dashTimer=p.dashCd;p.dashStart={x:p.x,y:p.y};p.invuln=Math.max(p.invuln,.4);
    run.leaps++;run.leap={count:0,targets:new Map(),crossings:new Set(),bulletsCut:0,hazards:new Set()};
    gatherLeap(p.x,p.y,p.x,p.y);
    tone(220,.13,'triangle',.045,3);
  }
  function endDash() {
    const p=run.player,a=p.dashStart;if(!a)return;p.dashStart=null;
    const leap=run.leap,count=leap.count;
    const danger=leap.crossings.size+Math.min(3,Math.floor(leap.bulletsCut/3))+Math.min(2,leap.hazards.size);
    run.lastLeap={time:run.time,count,targets:leap.targets.size,crossings:leap.crossings.size,bulletsCut:leap.bulletsCut,danger};
    if(count){run.poweredLeaps++;if(run.onboarding.firstLeap===null)run.onboarding.firstLeap=run.time;}
    else run.dryLeaps++;
    run.ashUsed+=count;
    // The stitch also sweeps up experience along its path: attacking and growing share a route.
    for(const orb of run.orbs)if(segmentDistance(orb.x,orb.y,a.x,a.y,p.x,p.y)<p.stitchWidth+55){addXp(orb.value);orb.life=0;}
    run.orbs=run.orbs.filter(orb=>orb.life>0);
    if(count){p.dashTimer=Math.max(.65,p.dashTimer-Math.min(1.65,count*.075+danger*.14));floating(p.x,p.y-38,`${danger>=2?'突破 / ':''}灰 ×${count}`, '#ffdb9f');}
    if(count&&(leap.crossings.size>=2||leap.bulletsCut>=3)){const recovery=2+p.stitchHeal;p.hp=Math.min(p.maxHp,p.hp+recovery);floating(p.x,p.y-57,`突破 +${recovery}`,'#87e2d3');}
    for(const h of run.pickups)if(segmentDistance(h.x,h.y,a.x,a.y,p.x,p.y)<p.collectWidth+25){p.hp=Math.min(p.maxHp,p.hp+h.heal);h.life=0;floating(p.x,p.y-25,`+${h.heal}`,'#87e2d3');}
    run.pickups=run.pickups.filter(h=>h.life>0);
    const line={ax:a.x,ay:a.y,bx:p.x,by:p.y,width:p.stitchWidth,count,damage:stitchDamage(count,0,danger),targets:leap.targets,danger,timer:.08,life:1.12,exploded:false,echoed:false,hitIds:new Set()};
    run.stitches.push(line);
    if(count&&p.stitchSlow)for(const e of run.enemies)if(segmentDistance(e.x,e.y,a.x,a.y,p.x,p.y)<line.width+e.r)e.slow=p.stitchSlow;
    p.invuln=Math.max(p.invuln,.22+Math.min(.18,danger*.035));run.leap=null;
  }
  function shoot() {
    const p=run.player;
    for(let i=0;i<p.shots;i++) {
      const angle=p.aim+(i-(p.shots-1)/2)*p.spread;
      run.bullets.push({x:p.x+Math.cos(angle)*20,y:p.y+Math.sin(angle)*20,vx:Math.cos(angle)*p.bulletSpeed,vy:Math.sin(angle)*p.bulletSpeed,
        r:2.5,life:1.25,damage:p.damage,pierce:p.pierce,bounce:p.bounce,hitIds:new Set(),dead:false});
    }
    p.shotTimer=Math.max(.10,p.fireRate);
    tone(random(380,410),.025,'triangle',.006,.8);
  }
  function hostile(x,y,a,speed=190,damage=12,r=5) {run.hostile.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:7,damage,r});}
  function ring(e,count,speed,offset=0) {for(let i=0;i<count;i++)hostile(e.x,e.y,offset+i/count*TAU,speed,e.type==='boss'?16:9,5);}
  function bossAttack(e,dt) {
    const p=run.player,ang=Math.atan2(p.y-e.y,p.x-e.x),late=e.hp<e.maxHp*.5;
    e.attack-=dt;
    if(e.attack<=0) {
      const mode=Math.floor(e.phase++)%3;
      if(mode===0){ring(e,e.type==='boss'?late?22:16:12,late?205:160,ambient*.4);e.attack=e.type==='elite'?3.4:late?1.9:2.8;tone(110,.2,'triangle',.06,2);}
      else if(mode===1){const n=e.type==='boss'?late?7:5:3;for(let i=0;i<n;i++){const a=i/n*TAU;const x=i===0?p.x:clamp(p.x+Math.cos(a)*160,-HALF+80,HALF-80),y=i===0?p.y:clamp(p.y+Math.sin(a)*160,-HALF+80,HALF-80);run.hazards.push({x,y,r:e.type==='boss'?82:64,timer:1.15,life:1.6,hit:false,damage:e.type==='boss'?24:16});}e.attack=e.type==='elite'?3.6:late?2:3;}
      else {e.wind=.8;e.charge=e.type==='boss'?.85:.65;e.vx=Math.cos(ang)*(e.type==='boss'?410:290);e.vy=Math.sin(ang)*(e.type==='boss'?410:290);e.attack=e.type==='elite'?4.5:late?2.8:4;}
    }
  }
  function updateEnemies(dt) {
    const p=run.player;
    for(const e of run.enemies) {
      if(e.dead)continue;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.orbitHit=Math.max(0,e.orbitHit-dt);
      e.seedCooldown=Math.max(0,e.seedCooldown-dt);e.seedFlash=Math.max(0,e.seedFlash-dt);e.spillCooldown=Math.max(0,e.spillCooldown-dt);e.stitchHold=Math.max(0,e.stitchHold-dt);e.wake=Math.max(0,e.wake-dt);
      if(e.ash){e.ashLife-=dt;if(e.ashLife<=0){e.ash--;e.ashLife=1.8;}}
      const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
      let movement=1;
      if(e.type==='boss'||e.type==='elite')bossAttack(e,dt);
      if(e.stitchHold>0||e.wake>0)movement=0;
      else if(e.wind>0){e.wind-=dt;movement=0;}
      else if(e.charge>0){e.charge-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;movement=0;}
      if(e.type==='runner') {
        e.attack-=dt;
        if(e.attack<=0&&e.charge<=0&&e.wind<=0&&d<350){e.wind=.45;e.charge=.4;e.vx=nx*420;e.vy=ny*420;e.attack=3.4;}
      }
      if(e.type==='shooter') {
        movement=d<245?-.5:d<380?0:1;e.attack-=dt;
        if(e.attack<=0&&d<640){const a=Math.atan2(dy,dx);for(let j=-1;j<=1;j++)hostile(e.x,e.y,a+j*.15,170,11);e.attack=2.8;particle(e.x,e.y,'#cc92bd',5,80);}
      }
      const speed=e.speed*(e.slow>0?.4:1)*(run.time<12?.55:1);
      e.x+=nx*speed*dt*movement+e.kx*dt;e.y+=ny*speed*dt*movement+e.ky*dt;e.kx*=Math.exp(-9*dt);e.ky*=Math.exp(-9*dt);
      e.x=clamp(e.x,-HALF+e.r,HALF-e.r);e.y=clamp(e.y,-HALF+e.r,HALF-e.r);
      if(d<p.r+e.r)hurtPlayer(e.damage);
      if(p.orbits>0&&e.ash>0&&p.dashTime<=0&&e.orbitHit<=0){for(let i=0;i<p.orbits;i++){const a=run.time*2.8+i/p.orbits*TAU,rad=85;if(Math.hypot(e.x-p.x-Math.cos(a)*rad,e.y-p.y-Math.sin(a)*rad)<e.r+12){seedEnemy(e,1);e.orbitHit=.45;break;}}}
    }
    // A local grid keeps separation and projectile collision bounded as waves grow.
    const grid=new Map();
    for(const e of run.enemies){if(e.dead)continue;const key=`${Math.floor(e.x/70)},${Math.floor(e.y/70)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(e);}
    for(const e of run.enemies){if(e.dead)continue;const gx=Math.floor(e.x/70),gy=Math.floor(e.y/70);for(let ix=-1;ix<=1;ix++)for(let iy=-1;iy<=1;iy++)for(const o of grid.get(`${gx+ix},${gy+iy}`)||[]){if(o.id<=e.id)continue;const dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy)||.1,target=(e.r+o.r)*.84;if(d<target){const push=(target-d)*.28;const nx=dx/d,ny=dy/d;e.x+=nx*push;e.y+=ny*push;o.x-=nx*push;o.y-=ny*push;}}}
    return grid;
  }
  function updateBullets(dt,grid) {
    for(const b of run.bullets) {
      if(b.dead)continue;const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.life<=0||Math.abs(b.x)>HALF+40||Math.abs(b.y)>HALF+40){b.dead=true;continue;}
      const minX=Math.floor((Math.min(ox,b.x)-60)/70),maxX=Math.floor((Math.max(ox,b.x)+60)/70),minY=Math.floor((Math.min(oy,b.y)-60)/70),maxY=Math.floor((Math.max(oy,b.y)+60)/70);
      outer:for(let gx=minX;gx<=maxX;gx++)for(let gy=minY;gy<=maxY;gy++)for(const e of grid.get(`${gx},${gy}`)||[]) {
        if(e.dead||b.hitIds.has(e.id)||segmentDistance(e.x,e.y,ox,oy,b.x,b.y)>e.r+b.r)continue;
        b.hitIds.add(e.id);seedEnemy(e);hurtEnemy(e,b.damage,'bullet',b.vx*.005,b.vy*.005);
        if(b.pierce>0){b.pierce--;continue;}
        if(b.bounce>0){let target=null,near=260;for(const o of run.enemies){const d=dist(o,e);if(!o.dead&&!b.hitIds.has(o.id)&&d<near){near=d;target=o;}}if(target){const a=Math.atan2(target.y-e.y,target.x-e.x),s=Math.hypot(b.vx,b.vy);b.x=e.x;b.y=e.y;b.vx=Math.cos(a)*s;b.vy=Math.sin(a)*s;b.bounce--;b.damage*=.75;break outer;}}
        b.dead=true;break outer;
      }
    }
    run.bullets=run.bullets.filter(b=>!b.dead);
    for(const b of run.hostile){const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(segmentDistance(run.player.x,run.player.y,ox,oy,b.x,b.y)<b.r+run.player.r){hurtPlayer(b.damage);b.life=0;}}
    run.hostile=run.hostile.filter(b=>b.life>0&&Math.abs(b.x)<HALF+60&&Math.abs(b.y)<HALF+60);
  }
  function updateStitches(dt) {
    const p=run.player;
    for(const s of run.stitches) {
      s.timer-=dt;s.life-=dt;
      if((!s.exploded&&s.timer<=0)||(s.count&&s.exploded&&!s.echoed&&p.stitchEcho&&s.timer<=-.5)) {
        const echo=s.exploded;if(echo)s.echoed=true;else s.exploded=true;
        if(s.count)for(const e of run.enemies)if(!e.dead&&segmentDistance(e.x,e.y,s.ax,s.ay,s.bx,s.by)<s.width+e.r){hurtEnemy(e,stitchDamage(s.count,s.targets.get(e.id)||0,s.danger)*(echo?(p.stitchEcho===1?.5:.75):1),'stitch');s.hitIds.add(e.id);if(p.stitchSlow)e.slow=p.stitchSlow;}
        const length=Math.hypot(s.bx-s.ax,s.by-s.ay),steps=Math.max(3,Math.ceil(length/24));for(let i=0;i<=steps;i++){const t=i/steps;particle(s.ax+(s.bx-s.ax)*t,s.ay+(s.by-s.ay)*t,s.count?'#ffba76':'#758b87',s.count?5:2,s.count?160:60,4);}
        if(s.count){run.shake=Math.max(run.shake,Math.min(12,5+s.count*.6));run.leapFlash=.15;run.hitStop=.045;tone(70,.23,'sawtooth',.08,.35);tone(260,.12,'triangle',.055,2.1);}else tone(120,.05,'triangle',.012,.6);
      }
      // A fueled stitch burns briefly; enemies walking into it are struck once too.
      if(s.exploded&&s.count&&s.life>0)for(const e of run.enemies)if(!e.dead&&!s.hitIds.has(e.id)&&segmentDistance(e.x,e.y,s.ax,s.ay,s.bx,s.by)<s.width+e.r){s.hitIds.add(e.id);hurtEnemy(e,s.damage,'stitch');if(p.stitchSlow)e.slow=p.stitchSlow;}
    }
    run.stitches=run.stitches.filter(s=>s.life>0);
    for(const h of run.hazards){h.timer-=dt;h.life-=dt;if(h.timer<=0&&!h.hit){h.hit=true;particle(h.x,h.y,'#ff7163',20,180,5);if(dist(h,p)<h.r+p.r)hurtPlayer(h.damage||24);}}
    run.hazards=run.hazards.filter(h=>h.life>0);
  }
  function update(dt) {
    if(state!=='playing')return;
    const p=run.player;run.time+=dt;frame++;
    run.announceTimer=Math.max(0,run.announceTimer-dt);run.shake*=Math.exp(-10*dt);run.flash=Math.max(0,run.flash-dt);run.leapFlash=Math.max(0,run.leapFlash-dt);
    p.invuln=Math.max(0,p.invuln-dt);p.dashTimer=Math.max(0,p.dashTimer-dt);p.shotTimer-=dt;
    if(run.lastLeap?.count&&run.time-run.lastLeap.time<4)p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);
    let dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dy=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    if(mouse.active)p.aim=Math.atan2(mouse.y-H/2+run.camY-p.y,mouse.x-W/2+run.camX-p.x);
    if(run.leapRequested){run.leapRequested=false;startDash(dx,dy);}
    if(p.dashTime>0){const ax=p.x,ay=p.y,t=Math.min(dt,p.dashTime);p.x+=p.dashVx*t;p.y+=p.dashVy*t;p.dashTime-=dt;particle(p.x,p.y,run.leap.count?'#ffd09a':'#aac6b5',2,40,4);p.x=clamp(p.x,-HALF+20,HALF-20);p.y=clamp(p.y,-HALF+20,HALF-20);gatherLeap(ax,ay,p.x,p.y);if(p.dashTime<=0)endDash();}
    else if(dx||dy){const len=Math.hypot(dx,dy);p.x+=dx/len*p.speed*dt;p.y+=dy/len*p.speed*dt;p.walk+=dt*12;}
    p.x=clamp(p.x,-HALF+20,HALF-20);p.y=clamp(p.y,-HALF+20,HALF-20);
    if(p.dashTime<=0&&(mouse.down||p.autoFire)&&p.shotTimer<=0)shoot();
    spawnWave(dt);const grid=updateEnemies(dt);if(state!=='playing')return;
    updateBullets(dt,grid);if(state!=='playing')return;updateStitches(dt);if(state!=='playing')return;
    for(const ash of run.ashes){ash.life-=dt;ash.hint=Math.max(0,(ash.hint||0)-dt);if(dist(ash,p)<26&&!ash.hint&&p.dashTime<=0){ash.hint=3;floating(ash.x,ash.y-24,'SPACEで回収','#ffc584');}}run.ashes=run.ashes.filter(a=>a.life>0);if(run.ashes.length>300)run.ashes.splice(0,run.ashes.length-300);
    for(const o of run.orbs){o.life-=dt;const d=dist(o,p);if(d<p.magnet)o.pull=true;if(o.pull){const s=Math.min(d,520*dt);o.x+=(p.x-o.x)/(d||1)*s;o.y+=(p.y-o.y)/(d||1)*s;}if(d<20){addXp(o.value);o.life=0;tone(720,.025,'sine',.009,1.2);}}
    run.orbs=run.orbs.filter(o=>o.life>0);
    for(const h of run.pickups){h.life-=dt;const d=dist(h,p);if(d<p.magnet*.65){const s=Math.min(d,340*dt);h.x+=(p.x-h.x)/(d||1)*s;h.y+=(p.y-h.y)/(d||1)*s;}if(d<28){p.hp=Math.min(p.maxHp,p.hp+h.heal);h.life=0;floating(p.x,p.y-25,`+${h.heal}`,'#87e2d3');tone(500,.12,'triangle',.04,1.4);}}
    run.pickups=run.pickups.filter(h=>h.life>0);
    for(const q of run.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.exp(-4*dt);q.vy*=Math.exp(-4*dt);}run.particles=run.particles.filter(q=>q.life>0);
    for(const t of run.texts){t.life-=dt;t.y-=dt*34;}run.texts=run.texts.filter(t=>t.life>0);
    run.enemies=run.enemies.filter(e=>!e.dead);
    run.camX+=(p.x-run.camX)*(1-Math.exp(-8*dt));run.camY+=(p.y-run.camY)*(1-Math.exp(-8*dt));
    run.statsTimer-=dt;if(run.statsTimer<=0){updateHud();run.statsTimer=.08;}
    if(run.pending>0&&state==='playing')rollUpgrades();
  }
  function circle(x,y,r,color,stroke=null,width=1) {ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function line(ax,ay,bx,by,color,width=1) {ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function polygon(x,y,r,n,angle,color,stroke) {ctx.beginPath();for(let i=0;i<n;i++){const a=angle+i/n*TAU;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
  function drawFloor(camX,camY) {
    ctx.fillStyle='#111c21';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-camX,H/2-camY);
    const minX=Math.floor((camX-W/2)/80)*80,maxX=camX+W/2,minY=Math.floor((camY-H/2)/80)*80,maxY=camY+H/2;
    ctx.lineWidth=1;ctx.strokeStyle='#72918709';ctx.beginPath();for(let x=minX;x<maxX;x+=80){ctx.moveTo(x,minY);ctx.lineTo(x,maxY);}for(let y=minY;y<maxY;y+=80){ctx.moveTo(minX,y);ctx.lineTo(maxX,y);}ctx.stroke();
    circle(0,0,290,null,'#72918712',2);circle(0,0,310,null,'#7291870b',1);circle(0,0,95,null,'#72918713',2);
    for(let i=0;i<12;i++){const a=i/12*TAU;line(Math.cos(a)*290,Math.sin(a)*290,Math.cos(a)*310,Math.sin(a)*310,'#72918724',3);}
    ctx.strokeStyle='#82a19130';ctx.lineWidth=4;ctx.strokeRect(-HALF,-HALF,ARENA,ARENA);
    for(let i=0;i<32;i++){const x=((i*379)%1470)-735,y=((i*613)%1470)-735;line(x,y,x+14,y-7,'#526c621a',2);circle(x+24,y+8,2,'#617f6820');}
    for(let i=0;i<4;i++){const x=i<2?-HALF:HALF,y=i%2?-HALF:HALF;polygon(x,y,80,4,Math.PI/4,'#17282d','#506d5d55');circle(x,y,20,'#af805044');}
    ctx.restore();
  }
  function drawEnemy(e) {
    const {x,y,r,type}=e;circle(x,y+r*.65,r*.85,'#00000035');
    const col=e.hit>0?'#fff1da':e.color;ctx.save();ctx.translate(x,y);
    const aim=run?Math.atan2(run.player.y-y,run.player.x-x):ambient;
    if(e.wind>0){line(0,0,Math.cos(aim)*280,Math.sin(aim)*280,'#ff706b66',2);circle(0,0,r+9,null,'#ff8976',2);}
    if(type==='boss'||type==='elite') {
      const n=type==='boss'?8:6;polygon(0,0,r,n,ambient*.2,'#3d2a29',col);polygon(0,0,r*.72,n,-ambient*.32,'#1d2127',col);circle(0,0,r*.34,'#f6bc78');circle(0,0,r*.18,'#fff3d2');
      for(let i=0;i<n;i++){const a=i/n*TAU+ambient*.2;line(Math.cos(a)*r*.6,Math.sin(a)*r*.6,Math.cos(a)*r*1.18,Math.sin(a)*r*1.18,col,4);}
      if(e.hp<e.maxHp*.5&&type==='boss')circle(0,0,r+14,null,'#fc776660',2);
    } else if(type==='shooter') {polygon(0,0,r,4,Math.PI/4,'#3b2d42',col);circle(0,0,5,'#f4c7e4');line(0,0,Math.cos(aim)*21,Math.sin(aim)*21,col,4);}
    else if(type==='brute'){polygon(0,0,r,6,Math.PI/6,'#443c32',col);polygon(0,0,r*.6,6,Math.PI/6,'#25292a','#847e66');circle(Math.cos(aim)*8,Math.sin(aim)*8,5,'#f9c183');}
    else if(type==='splitter'){polygon(0,0,r,5,ambient*.5,'#354332',col);for(let i=0;i<3;i++){const a=i/3*TAU;circle(Math.cos(a)*7,Math.sin(a)*7,3,'#dbecb2');}}
    else if(type==='runner'){polygon(0,0,r*1.3,3,aim,'#6d4833',col);circle(Math.cos(aim)*4,Math.sin(aim)*4,3,'#ffe5b2');}
    else {const bob=Math.sin(ambient*7+e.phase)*1.5;polygon(0,bob,r,5,aim,'#433e39',col);line(-r*.8,-r*.4,-r-4,-r-2,col,2);line(-r*.8,r*.4,-r-4,r+2,col,2);circle(Math.cos(aim)*r*.45,Math.sin(aim)*r*.45,3,'#ffd6a4');}
    if(e.slow>0)circle(0,0,r+3,null,'#a7d6df77',2);ctx.restore();
    if(e.ash){
      const limit=ashLimit(e),full=e.ash>=limit,shown=Math.min(limit,9),filled=Math.ceil(e.ash/limit*shown);
      const color=full?'#ffbf77':'#c9a578';
      circle(x,y,r+7+Math.sin(ambient*5)*1.3,null,full?'#ffb66b99':'#c9a57855',full?2:1);
      for(let i=0;i<shown;i++)polygon(x+(i-(shown-1)/2)*7,y-r-16,2.8,4,Math.PI/4,i<filled?color:'#26393d',i<filled?null:'#657777');
      if(limit>3){ctx.fillStyle=color;ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(`灰 ${e.ash}`,x,y-r-26);}
      if(e.seedFlash>0)circle(x,y,r+10,null,'#f4bb7855',2);
    }
    if(e.hp<e.maxHp&&type!=='boss'&&type!=='elite'){ctx.fillStyle='#0a1217';ctx.fillRect(x-r,y-r-10,r*2,3);ctx.fillStyle=col;ctx.fillRect(x-r,y-r-10,r*2*e.hp/e.maxHp,3);}
  }
  function drawPlayer(p) {
    ctx.save();ctx.translate(p.x,p.y);
    if(p.invuln>0&&Math.floor(p.invuln*16)%2===0)ctx.globalAlpha=.5;
    circle(0,11,15,'#00000055');
    ctx.rotate(p.aim);
    const stride=Math.sin(p.walk)*3;line(-6,-6,-13-stride,-7,'#738c87',5);line(-6,6,-13+stride,7,'#738c87',5);
    polygon(-2,0,16,3,Math.PI,'#92a99e','#c7d5bc');circle(0,0,9,'#253a3e','#9cd3ca',2);line(5,-4,12,-4,'#efd8b2',4);line(9,4,25,4,'#8a9e96',6);line(23,4,30,4,'#ffa66a',4);circle(4,0,3,'#c2f8e2');
    ctx.restore();
    if(p.dashTimer<=0)circle(p.x,p.y,23,null,'#ffb67a40',1);
    for(let i=0;i<p.orbits;i++){const a=run.time*2.8+i/p.orbits*TAU,rad=85,x=p.x+Math.cos(a)*rad,y=p.y+Math.sin(a)*rad;circle(x,y,11,'#c8a07615');polygon(x,y,6,4,a,'#b0a28a','#dfc39c');}
  }
  function drawLeapGuide() {
    const p=run.player;if(p.dashTime>0)return;
    const r=predictLeap(),ready=p.dashTimer<=0,col=ready&&r.ash?'#ffbb78':'#87a3a0';
    const angle=Math.atan2(r.by-r.ay,r.bx-r.ax),length=Math.hypot(r.bx-r.ax,r.by-r.ay);
    ctx.save();ctx.globalAlpha=ready?r.ash?.85:.33:.12;
    if(r.ash)line(r.ax,r.ay,r.bx,r.by,col+'10',p.collectWidth*2);
    ctx.setLineDash([7,9]);line(r.ax,r.ay,r.bx,r.by,col,1.3);ctx.setLineDash([]);
    for(let d=70;d<length;d+=70){const x=r.ax+Math.cos(angle)*d,y=r.ay+Math.sin(angle)*d;line(x-Math.cos(angle-.5)*6,y-Math.sin(angle-.5)*6,x,y,col,1.5);line(x-Math.cos(angle+.5)*6,y-Math.sin(angle+.5)*6,x,y,col,1.5);}
    polygon(r.bx,r.by,7,3,angle,col);
    for(const e of run.enemies)if(e.ash&&!e.dead&&segmentDistance(e.x,e.y,r.ax,r.ay,r.bx,r.by)<p.collectWidth+e.r)circle(e.x,e.y,e.r+12,null,col,2);
    if(ready&&r.ash){ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffcd93';ctx.fillText(`SPACE / 灰 ${r.ash}`,r.bx,r.by-20);}
    ctx.restore();
    if(run.onboarding.firstSeed===null&&run.time<12){const e=run.enemies.find(e=>!e.dead);if(e){circle(e.x,e.y,e.r+12,null,'#a9c0bb66',1);ctx.fillStyle='#a9c0bb';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('左クリック / 仕込む',e.x,e.y-e.r-22);}}
  }
  function drawGame() {
    const shake=run.shake,cx=run.camX+(Math.random()-.5)*shake,cy=run.camY+(Math.random()-.5)*shake;
    drawFloor(cx,cy);ctx.save();ctx.translate(W/2-cx,H/2-cy);
    const visible=o=>Math.abs(o.x-cx)<W/2+100&&Math.abs(o.y-cy)<H/2+100;
    drawLeapGuide();
    for(const a of run.ashes){if(!visible(a))continue;const alpha=Math.min(1,a.life/3);ctx.globalAlpha=alpha;circle(a.x,a.y,a.r+8,'#ff965218');for(let i=0;i<3;i++){const angle=a.phase+i/3*TAU;polygon(a.x+Math.cos(angle)*5,a.y+Math.sin(angle)*5,4,3,angle,'#ae7158');}circle(a.x,a.y,2+Math.sin(ambient*4+a.phase)*.5,'#ffc58c');ctx.globalAlpha=1;}
    for(const s of run.stitches){ctx.lineCap='round';const active=s.exploded,safe=!s.count,col=safe?'#89a396':active?'#ffc584':'#ffe1b0';ctx.globalAlpha=clamp(s.life*1.5,0,1)*(safe?.25:1);line(s.ax,s.ay,s.bx,s.by,col+'18',s.width*2);if(!safe){line(s.ax,s.ay,s.bx,s.by,'#ffae6350',18);line(s.ax,s.ay,s.bx,s.by,'#ffe3ae',active?6:3);}else line(s.ax,s.ay,s.bx,s.by,col,1);if(active&&!safe&&s.life>.85){circle(s.ax,s.ay,(1.12-s.life)*160,null,'#ffcc8688',2);circle(s.bx,s.by,(1.12-s.life)*160,null,'#ffcc8688',2);}ctx.globalAlpha=1;ctx.lineCap='butt';}
    for(const h of run.hazards){circle(h.x,h.y,h.r,'#ff5b5218','#fc796880',2);if(h.timer>0){circle(h.x,h.y,h.r*(1-h.timer/1.15),null,'#ff9e86',2);line(h.x-12,h.y,h.x+12,h.y,'#ff8e76',2);line(h.x,h.y-12,h.x,h.y+12,'#ff8e76',2);}else circle(h.x,h.y,h.r*clamp(h.life/.45,0,1),'#ff986333');}
    for(const o of run.orbs){if(!visible(o))continue;polygon(o.x,o.y,o.value>5?7:4,4,Math.PI/4,'#8ac9c5');}
    for(const h of run.pickups){if(!visible(h))continue;circle(h.x,h.y,12,'#264c44','#84e2b4',1);line(h.x-5,h.y,h.x+5,h.y,'#b5f7d3',3);line(h.x,h.y-5,h.x,h.y+5,'#b5f7d3',3);}
    for(const e of run.enemies)if(visible(e))drawEnemy(e);
    for(const b of run.bullets){line(b.x-b.vx*.009,b.y-b.vy*.009,b.x,b.y,'#8caaa7',1.5);circle(b.x,b.y,1.5,'#bdd0c6');}
    for(const b of run.hostile){circle(b.x,b.y,b.r+3,'#ff71822a');circle(b.x,b.y,b.r,'#e98694');circle(b.x,b.y,2,'#ffe6d7');}
    drawPlayer(run.player);
    for(const q of run.particles){ctx.globalAlpha=clamp(q.life/q.max,0,1);circle(q.x,q.y,q.size,q.color);}ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.font='bold 13px sans-serif';for(const t of run.texts){ctx.globalAlpha=clamp(t.life*2,0,1);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);}ctx.globalAlpha=1;
    // Offscreen boss marker prevents an unseen guardian from stalling a run.
    if(run.boss&&!run.boss.dead&&!visible(run.boss)){const e=run.boss,dx=e.x-cx,dy=e.y-cy,a=Math.atan2(dy,dx),r=Math.min((W/2-50)/Math.abs(Math.cos(a)||.001),(H/2-150)/Math.abs(Math.sin(a)||.001));polygon(cx+Math.cos(a)*r,cy+Math.sin(a)*r,10,3,a,'#ffab75');}
    ctx.restore();
    const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.7);vignette.addColorStop(0,'#050b1000');vignette.addColorStop(1,'#050b1080');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    if(run.flash>0){ctx.fillStyle=`rgba(255,84,63,${run.flash*.45})`;ctx.fillRect(0,0,W,H);}
    if(run.leapFlash>0){ctx.fillStyle=`rgba(255,217,153,${run.leapFlash*.55})`;ctx.fillRect(0,0,W,H);}
    if(mouse.active&&state==='playing'){const x=mouse.x,y=mouse.y;circle(x,y,7,null,'#d2d9bd88',1);line(x-11,y,x-5,y,'#d2d9bdbb');line(x+5,y,x+11,y,'#d2d9bdbb');line(x,y-11,x,y-5,'#d2d9bdbb');line(x,y+5,x,y+11,'#d2d9bdbb');}
    canvas.style.cursor=state==='playing'?'none':'default';
  }
  function drawTitle() {
    drawFloor(-220,60);ctx.save();const x=W*.76,y=H*.49,r=Math.min(W*.19,H*.35);ctx.translate(x,y);
    const glow=ctx.createRadialGradient(0,0,10,0,0,r*1.5);glow.addColorStop(0,'#b968332e');glow.addColorStop(1,'#b9683300');ctx.fillStyle=glow;ctx.fillRect(-r*1.5,-r*1.5,r*3,r*3);
    circle(0,0,r*1.05,null,'#83978a33',1);circle(0,0,r*1.18,null,'#83978a17',1);
    polygon(0,0,r,8,ambient*.045,'#18252a','#7a8d7755');polygon(0,0,r*.82,8,-ambient*.03,'#101b20','#e4965844');polygon(0,0,r*.62,6,ambient*.1,'#332c27','#cb956355');
    for(let i=0;i<8;i++){const a=i/8*TAU+ambient*.045;line(Math.cos(a)*r*.82,Math.sin(a)*r*.82,Math.cos(a)*r*1.04,Math.sin(a)*r*1.04,'#ffbd7c55',5);}
    circle(0,0,r*.32,'#d28b3b18','#fbba7277',2);polygon(0,0,r*.22,3,-Math.PI/2,'#ffba7530','#ffbd8a');polygon(0,0,r*.11,3,Math.PI/2,'#ffd69e');
    for(let i=0;i<38;i++){const a=i*2.399+ambient*.1,rr=r*(.3+(i%9)/9),px=Math.cos(a)*rr,py=Math.sin(a)*rr-Math.sin(ambient+i)*6;circle(px,py,i%3===0?2:1,'#ffc18b88');}
    ctx.restore();canvas.style.cursor='default';
  }
  function loop(now) {
    const dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;ambient+=dt;
    if(run&&run.hitStop>0&&state==='playing')run.hitStop=Math.max(0,run.hitStop-dt);else update(dt);
    if(run)drawGame();else drawTitle();requestAnimationFrame(loop);
  }
  const playingKeyCodes=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyF','KeyP','Escape','Digit1','Digit2','Digit3']);
  addEventListener('keydown',e=>{
    if(playingKeyCodes.has(e.code))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='KeyM'){toggleSound();return;}
    if(e.code==='Escape'||e.code==='KeyP'){if(state==='help'){state=run?'paused':'title';screen(run?'pause':'title');}else pause();return;}
    if(state==='upgrade'&&['Digit1','Digit2','Digit3'].includes(e.code)){chooseUpgrade(Number(e.code.slice(-1))-1);return;}
    if(state==='playing'){keys.add(e.code);if(e.code==='Space')run.leapRequested=true;if(e.code==='KeyF'){run.player.autoFire=!run.player.autoFire;announce(`自動仕込み ${run.player.autoFire?'ON':'OFF'}`,1.5);}}
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;});
  canvas.addEventListener('mousedown',e=>{if(e.button===0&&state==='playing'){mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;initAudio();}});
  addEventListener('mouseup',()=>{mouse.down=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('blur',()=>{keys.clear();mouse.down=false;if(state==='playing')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();last=performance.now();});
  $('startButton').onclick=start;$('restartButton').onclick=start;$('titleButton').onclick=goTitle;$('quitButton').onclick=goTitle;
  $('pauseButton').onclick=pause;$('resumeButton').onclick=resume;$('soundButton').onclick=toggleSound;$('pauseSound').onclick=toggleSound;
  $('helpButton').onclick=()=>{state='help';screen('help');};$('closeHelp').onclick=()=>{state=run?'paused':'title';screen(run?'pause':'title');};
  $('fullscreenButton').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
  $('relicButton').onclick=()=>{const unlocked=relics.filter(r=>r.need<=meta.marks).length;meta.relic=(meta.relic+1)%unlocked;saveMeta();titleRecord();};
  titleRecord();requestAnimationFrame(loop);
  // Explicit test mode exposes mechanics for deterministic verification, never used in normal play.
  if(new URLSearchParams(location.search).has('test'))window.AshfallTest={
    start,update,spawnEnemy,hurtEnemy,hurtPlayer,startDash,endDash,seedEnemy,predictLeap,stitchDamage,addXp,chooseUpgrade,rollUpgrades,finish,goTitle,pause,resume,
    segmentDistance,UPGRADES,TYPES,keys,mouse,drawGame,updateHud,
    get run(){return run;},get state(){return state;},get meta(){return meta;},get audioState(){return audio?.state;},seed(v){seed=v||1;},
    step(seconds){for(let t=0;t<seconds;t+=1/60)update(Math.min(1/60,seconds-t));},
    apply(id){const u=UPGRADES.find(u=>u.id===id);if(!u)throw new Error(id);u.apply(run.player);run.player.upgrades[id]=(run.player.upgrades[id]||0)+1;updateBuild();updateHud();}
  };
})();
