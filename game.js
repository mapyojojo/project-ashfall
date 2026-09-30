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
    { name: '灰織りの針', need: 5, detail: '灰縫いの幅 +24', apply: p => { p.stitchWidth += 24; } },
    { name: '小さな太陽', need: 12, detail: '自律火球 1基', apply: p => { p.orbits++; } },
    { name: '割れた銃身', need: 25, detail: '弾丸 +1 / 連射速度 -12%', apply: p => { p.shots++; p.fireRate *= 1.12; } }
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
    return { x: 0, y: 0, r: 13, hp: 100, maxHp: 100, speed: 225, aim: 0, damage: 17,
      fireRate: .22, shotTimer: 0, shots: 1, spread: .16, pierce: 0, bounce: 0, bulletSpeed: 740,
      dashCd: 2.6, dashTimer: 0, dashTime: 0, dashVx: 0, dashVy: 0, dashStart: null,
      stitchWidth: 48, stitchPower: 1, stitchSlow: 0, stitchEcho: 0, stitchHeal: 0,
      invuln: 0, orbits: 0, orbitPower: 1, orbitTimer: 0, magnet: 175, regen: 0,
      xp: 0, level: 1, xpNeed: 14, autoFire: false, upgrades: {}, walk: 0 };
  }
  function start() {
    initAudio(); keys.clear(); mouse.down = false;
    seed = ((Date.now() ^ 0x6d2b79f5) >>> 0) || 1;
    run = { time: 0, player: newPlayer(), enemies: [], bullets: [], hostile: [], ashes: [], orbs: [],
      stitches: [], particles: [], texts: [], hazards: [], pickups: [], kills: 0, ashUsed: 0,
      stitchKills: 0, bosses: 0, spawnTimer: .3, shake: 0, flash: 0, camX: 0, camY: 0,
      announced: '', announceTimer: 0, eliteWave: 0, finalSpawned: false, boss: null,
      nextId: 1, cards: [], pending: 0, statsTimer: 0, upgradesTaken: 0, ended: false };
    relics[meta.relic].apply(run.player);
    state = 'playing'; screen(null); announce('灰の庭 / 灰を縫え。火を生きろ。', 4); updateHud();
  }
  function goTitle() { run = null; state = 'title'; keys.clear(); mouse.down = false; screen('title'); titleRecord(); }
  function pause() { if (state === 'playing') { state = 'paused'; mouse.down = false; keys.clear(); screen('pause'); } else if (state === 'paused') resume(); }
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
    $('resultCopy').textContent = win ? '残り火は、あなたの手に。灰の庭に小さな夜明けが戻る。' : '倒した場所には灰が残る。次は、その軌跡を武器にしよう。';
    $('resultStats').innerHTML = `<div><strong>${timeText(run.time)}</strong><span>生存時間</span></div><div><strong>${run.kills}</strong><span>討伐数</span></div><div><strong>${run.stitchKills}</strong><span>灰縫い討伐</span></div>`;
    $('resultBuild').innerHTML = Object.entries(run.player.upgrades).map(([id,n]) => `<span class="chip">${UPGRADES.find(u=>u.id===id).name} ${n}</span>`).join('') || '<span class="chip">初期装備のみ</span>';
    const unlocked = relics.filter(r => r.need > before && r.need <= meta.marks);
    $('metaText').textContent = `残火印 +${marks} / 合計 ${meta.marks}。${unlocked.length ? unlocked.map(r => '「'+r.name+'」解放！').join(' ') : '次のランの持ち込み装備をタイトルで選べます。'}`;
    tone(win ? 440 : 160, .6, 'triangle', .1, win ? 2 : .3);
  }
  const UPGRADES = [
    { id:'scatter', name:'散火の銃身', cat:'GUN / 扇状射撃', max:3, desc:'弾丸 +2。扇状に撃つ。1発の威力 -12%。近距離で全弾を当てるビルドへ。', apply:p=>{p.shots+=2;p.damage*=.88;p.spread+=.035;} },
    { id:'pierce', name:'貫く残光', cat:'GUN / 貫通', max:3, desc:'貫通数 +2、弾速 +10%。群れの奥まで、一直線に灰を増やす。', apply:p=>{p.pierce+=2;p.bulletSpeed*=1.1;} },
    { id:'ricochet', name:'跳ねる火種', cat:'GUN / 連鎖', max:3, desc:'命中後、近くの別の敵へ跳弾 +1。跳弾の威力は75%。密集した敵ほど強い。', apply:p=>p.bounce++ },
    { id:'rapid', name:'せっかちな引き金', cat:'GUN / 連射', max:4, desc:'連射速度 +22%。灰を作る速度を上げる。', apply:p=>p.fireRate*=.82 },
    { id:'heavy', name:'重い火鉢', cat:'GUN / 大火力', max:3, desc:'弾丸ダメージ +45%、連射速度 -12%。一撃を重くする。', apply:p=>{p.damage*=1.45;p.fireRate*=1.12;} },
    { id:'width', name:'太陽の縫い目', cat:'STITCH / 広域', max:3, desc:'灰縫いの幅 +32、爆発威力 +35%。離れた灰も取り込み、広い帯を焼く。', apply:p=>{p.stitchWidth+=32;p.stitchPower*=1.35;} },
    { id:'quick', name:'二歩目の炎', cat:'STITCH / 高機動', max:3, desc:'ダッシュ待機時間 -20%。移動速度 +7%。灰を次々に縫い続ける。', apply:p=>{p.dashCd*=.8;p.speed*=1.07;} },
    { id:'frost', name:'白灰の足止め', cat:'STITCH / 制御', max:2, desc:'灰縫いで敵を3秒間、60%減速。爆発前から効く。次の段階で威力 +30%。', apply:p=>{if(p.stitchSlow)p.stitchPower*=1.3;p.stitchSlow=3;} },
    { id:'echo', name:'もう一つの軌跡', cat:'STITCH / 再爆発', max:2, desc:'灰縫いが再び爆発。最初は60%の威力、次の段階で100%。遅れて来る敵も焼く。', apply:p=>p.stitchEcho++ },
    { id:'heal', name:'灰からの息吹', cat:'STITCH / 回復', max:2, desc:'ダッシュで灰を3つ以上縫うと耐久を4回復。次の段階で8回復。危険な進路に報酬を。', apply:p=>p.stitchHeal+=4 },
    { id:'orbit', name:'小さな太陽', cat:'ORBIT / 接近戦', max:3, desc:'周囲を回る自律火球 +1。接触した敵にダメージ。包囲の中を走り抜ける武器。', apply:p=>p.orbits++ },
    { id:'orbitPower', name:'衛星の怒り', cat:'ORBIT / 育成', max:2, requires:p=>p.orbits>0, desc:'自律火球の威力 +60%、半径 +15%。火球で灰を作り、ダッシュへつなぐ。', apply:p=>p.orbitPower*=1.6 },
    { id:'vital', name:'消えない心臓', cat:'SURVIVAL / 耐久', max:3, desc:'最大耐久 +25、耐久を40回復。耐久が減っている時の立て直しに。', apply:p=>{p.maxHp+=25;p.hp=Math.min(p.maxHp,p.hp+40);} },
    { id:'magnet', name:'残火の呼び声', cat:'SURVIVAL / 回収', max:2, desc:'残火の回収距離 +90。移動速度 +6%。群れへ近づかずに成長する。', apply:p=>{p.magnet+=90;p.speed*=1.06;} },
    { id:'regen', name:'ゆっくり燃える', cat:'SURVIVAL / 再生', max:2, desc:'毎秒、耐久を0.5回復。長い戦闘で小さな傷を取り戻す。', apply:p=>p.regen+=.5 },
    { id:'ember', name:'尽きない残火', cat:'SURVIVAL / 最終強化', max:999, requires:p=>UPGRADES.filter(u=>u.id!=='ember').every(u=>(p.upgrades[u.id]||0)>=u.max), desc:'すべての強化を終えた者へ。弾丸と灰縫いの威力 +8%、耐久を20回復。', apply:p=>{p.damage*=1.08;p.stitchPower*=1.08;p.hp=Math.min(p.maxHp,p.hp+20);} }
  ];
  function rollUpgrades() {
    const p = run.player;
    const available = UPGRADES.filter(u => (p.upgrades[u.id]||0)<u.max && (!u.requires||u.requires(p)));
    const cards = [];
    // The first choice establishes three distinct play styles, rather than three passive boosts.
    if(run.upgradesTaken===0)cards.push(...['scatter','width','orbit'].map(id=>available.find(u=>u.id===id)));
    else {
      for(const category of ['STITCH','GUN']){const pool=available.filter(u=>u.cat.startsWith(category));if(pool.length)cards.push(pick(pool));}
      const support=available.filter(u=>!cards.includes(u)&&(u.cat.startsWith('ORBIT')||u.cat.startsWith('SURVIVAL')));if(support.length)cards.push(pick(support));
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
    const boss=run.boss&&!run.boss.dead?run.boss:null;$('bossHud').hidden=!boss;
    if(boss){$('bossName').textContent=boss.type==='boss'?'炉心 / THE LAST FURNACE':'灰の番人';$('bossHp').textContent=`${Math.ceil(boss.hp/boss.maxHp*100)}%`;$('bossBar').style.width=`${boss.hp/boss.maxHp*100}%`;}
  }
  function particle(x,y,color,n=8,speed=110,size=3) {
    for(let i=0;i<n&&run.particles.length<650;i++){const a=random(0,TAU),s=random(speed*.25,speed);run.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color,life:random(.18,.5),max:.5,size:random(size*.4,size)});}
  }
  function floating(x,y,text,color='#ffbb86') { if(run.texts.length<65)run.texts.push({x,y,text,color,life:.8}); }
  function segmentDistance(x,y,ax,ay,bx,by) {const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-ax-dx*t,y-ay-dy*t);}
  function hurtPlayer(dmg) {
    const p=run.player;if(p.invuln>0||p.dashTime>0)return;
    p.hp=Math.max(0,p.hp-dmg);p.invuln=.85;run.flash=.2;run.shake=Math.max(run.shake,7);
    particle(p.x,p.y,'#f97964',12,140);tone(90,.16,'sawtooth',.065,.5);
    if(p.hp<=0)finish(false);
  }
  function hurtEnemy(e,dmg,source='bullet',kx=0,ky=0) {
    if(e.dead)return;
    e.hp-=dmg;e.hit=.09;e.kx+=kx;e.ky+=ky;
    if(e.hp<=0) {
      e.dead=true;run.kills++;if(source==='stitch')run.stitchKills++;
      const boss=e.type==='boss'||e.type==='elite';
      particle(e.x,e.y,boss?'#ffc384':'#ed895d',boss?55:7,boss?260:110,boss?6:3);
      run.ashes.push({x:e.x,y:e.y,r:boss?20:11,life:boss?28:20,value:boss?5:1,phase:random(0,TAU)});
      const xp=e.type==='boss'?150:e.type==='elite'?55:e.type==='brute'?5:e.type==='shooter'?3:2;
      run.orbs.push({x:e.x,y:e.y,value:xp,life:75,pull:false});
      if(boss||rng()<.032)run.pickups.push({x:e.x,y:e.y,life:25,heal:boss?30:12});
      if(e.type==='splitter')for(let i=0;i<3;i++)spawnEnemy('mite',e.x+random(-24,24),e.y+random(-24,24));
      if(boss){run.bosses++;run.shake=14;tone(75,.5,'sawtooth',.12,.2);if(e.type==='boss')finish(true);else announce('番人を撃破 / 残火と回復を回収せよ');}
      else if(frame%3===0)tone(random(160,240),.045,'triangle',.018,.4);
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
      kx:0,ky:0,hit:0,slow:0,attack:random(.7,2),phase:random(0,TAU),dead:false,wind:0,charge:0,vx:0,vy:0,orbitHit:0};
    run.enemies.push(e);if(type==='boss'||type==='elite')run.boss=e;return e;
  }
  function spawnWave(dt) {
    if(run.time>=END_TIME&&!run.finalSpawned){run.finalSpawned=true;run.enemies.forEach(e=>{if(e.type!=='elite')e.dead=true;});run.hostile=[];run.hazards=[];spawnEnemy('boss',0,-280);announce('炉心、覚醒 / 赤い予告を避け、灰で断て。',5);tone(80,.8,'sawtooth',.1,1.3);}
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
    const m=Math.hypot(dx,dy);p.dashVx=dx/m*1250;p.dashVy=dy/m*1250;p.dashTime=.18;p.dashTimer=p.dashCd;p.dashStart={x:p.x,y:p.y};p.invuln=Math.max(p.invuln,.24);
    tone(200,.14,'triangle',.065,2.5);
  }
  function endDash() {
    const p=run.player,a=p.dashStart;if(!a)return;p.dashStart=null;
    let count=0;
    run.ashes=run.ashes.filter(ash=>{if(segmentDistance(ash.x,ash.y,a.x,a.y,p.x,p.y)<p.stitchWidth+35){count+=ash.value;particle(ash.x,ash.y,'#ffb578',5,80);return false;}return true;});
    run.ashUsed+=count;
    // The stitch also sweeps up experience along its path: attacking and growing share a route.
    for(const orb of run.orbs)if(segmentDistance(orb.x,orb.y,a.x,a.y,p.x,p.y)<p.stitchWidth+55){addXp(orb.value);orb.life=0;}
    run.orbs=run.orbs.filter(orb=>orb.life>0);
    if(count){p.dashTimer=Math.max(.25,p.dashTimer-Math.min(1.25,count*.16));run.shake=Math.max(run.shake,Math.min(8,count));floating(p.x,p.y-35,`灰 ×${count}`, '#ffd295');}
    if(count>=3&&p.stitchHeal){p.hp=Math.min(p.maxHp,p.hp+p.stitchHeal);floating(p.x,p.y-52,`+${p.stitchHeal}`,'#87e2d3');}
    for(const h of run.pickups)if(segmentDistance(h.x,h.y,a.x,a.y,p.x,p.y)<p.stitchWidth+35){p.hp=Math.min(p.maxHp,p.hp+h.heal);h.life=0;floating(p.x,p.y-25,`+${h.heal}`,'#87e2d3');}
    run.pickups=run.pickups.filter(h=>h.life>0);
    const line={ax:a.x,ay:a.y,bx:p.x,by:p.y,width:p.stitchWidth,count,damage:(12+count*24)*p.stitchPower,timer:.35,life:1.45,exploded:false,echoed:false,hitIds:new Set()};
    run.stitches.push(line);
    if(p.stitchSlow)for(const e of run.enemies)if(segmentDistance(e.x,e.y,a.x,a.y,p.x,p.y)<line.width+e.r)e.slow=p.stitchSlow;
  }
  function shoot() {
    const p=run.player;
    for(let i=0;i<p.shots;i++) {
      const angle=p.aim+(i-(p.shots-1)/2)*p.spread;
      run.bullets.push({x:p.x+Math.cos(angle)*20,y:p.y+Math.sin(angle)*20,vx:Math.cos(angle)*p.bulletSpeed,vy:Math.sin(angle)*p.bulletSpeed,
        r:3.4,life:1.25,damage:p.damage,pierce:p.pierce,bounce:p.bounce,hitIds:new Set(),dead:false});
    }
    p.shotTimer=Math.max(.055,p.fireRate);particle(p.x+Math.cos(p.aim)*25,p.y+Math.sin(p.aim)*25,'#ffbf7e',2,60,2);
    tone(random(360,420),.035,'square',.012,.45);
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
      const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
      let movement=1;
      if(e.type==='boss'||e.type==='elite')bossAttack(e,dt);
      if(e.wind>0){e.wind-=dt;movement=0;}
      else if(e.charge>0){e.charge-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;movement=0;}
      if(e.type==='runner') {
        e.attack-=dt;
        if(e.attack<=0&&e.charge<=0&&e.wind<=0&&d<350){e.wind=.45;e.charge=.4;e.vx=nx*420;e.vy=ny*420;e.attack=3.4;}
      }
      if(e.type==='shooter') {
        movement=d<245?-.5:d<380?0:1;e.attack-=dt;
        if(e.attack<=0&&d<640){const a=Math.atan2(dy,dx);for(let j=-1;j<=1;j++)hostile(e.x,e.y,a+j*.15,170,11);e.attack=2.8;particle(e.x,e.y,'#cc92bd',5,80);}
      }
      const speed=e.speed*(e.slow>0?.4:1);
      e.x+=nx*speed*dt*movement+e.kx*dt;e.y+=ny*speed*dt*movement+e.ky*dt;e.kx*=Math.exp(-9*dt);e.ky*=Math.exp(-9*dt);
      e.x=clamp(e.x,-HALF+e.r,HALF-e.r);e.y=clamp(e.y,-HALF+e.r,HALF-e.r);
      if(d<p.r+e.r)hurtPlayer(e.damage);
      if(p.orbits>0&&e.orbitHit<=0){for(let i=0;i<p.orbits;i++){const a=run.time*2.8+i/p.orbits*TAU,rad=85*Math.pow(p.orbitPower,.28);if(Math.hypot(e.x-p.x-Math.cos(a)*rad,e.y-p.y-Math.sin(a)*rad)<e.r+12){hurtEnemy(e,30*p.orbitPower,'orbit',Math.cos(a)*100,Math.sin(a)*100);e.orbitHit=.35;break;}}}
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
        b.hitIds.add(e.id);hurtEnemy(e,b.damage,'bullet',b.vx*.055,b.vy*.055);particle(b.x,b.y,'#f8c183',2,55,2);
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
      if((!s.exploded&&s.timer<=0)||(s.exploded&&!s.echoed&&p.stitchEcho&&s.timer<=-.5)) {
        const echo=s.exploded;if(echo)s.echoed=true;else s.exploded=true;
        for(const e of run.enemies)if(!e.dead&&segmentDistance(e.x,e.y,s.ax,s.ay,s.bx,s.by)<s.width+e.r){hurtEnemy(e,s.damage*(echo?(p.stitchEcho===1?.6:1):1),'stitch');s.hitIds.add(e.id);if(p.stitchSlow)e.slow=p.stitchSlow;}
        const length=Math.hypot(s.bx-s.ax,s.by-s.ay),steps=Math.max(3,Math.ceil(length/24));for(let i=0;i<=steps;i++){const t=i/steps;particle(s.ax+(s.bx-s.ax)*t,s.ay+(s.by-s.ay)*t,s.count?'#ffba76':'#758b87',s.count?5:2,s.count?160:60,4);}
        if(s.count){run.shake=Math.max(run.shake,Math.min(11,3+s.count));tone(65,.22,'sawtooth',.07,.4);}else tone(120,.06,'triangle',.02,.5);
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
    run.announceTimer=Math.max(0,run.announceTimer-dt);run.shake*=Math.exp(-10*dt);run.flash=Math.max(0,run.flash-dt);
    p.invuln=Math.max(0,p.invuln-dt);p.dashTimer=Math.max(0,p.dashTimer-dt);p.shotTimer-=dt;p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);
    let dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dy=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    if(mouse.active)p.aim=Math.atan2(mouse.y-H/2+run.camY-p.y,mouse.x-W/2+run.camX-p.x);
    if(keys.has('Space'))startDash(dx,dy);
    if(p.dashTime>0){const t=Math.min(dt,p.dashTime);p.x+=p.dashVx*t;p.y+=p.dashVy*t;p.dashTime-=dt;particle(p.x,p.y,'#aac6b5',2,40,4);p.x=clamp(p.x,-HALF+20,HALF-20);p.y=clamp(p.y,-HALF+20,HALF-20);if(p.dashTime<=0)endDash();}
    else if(dx||dy){const len=Math.hypot(dx,dy);p.x+=dx/len*p.speed*dt;p.y+=dy/len*p.speed*dt;p.walk+=dt*12;}
    p.x=clamp(p.x,-HALF+20,HALF-20);p.y=clamp(p.y,-HALF+20,HALF-20);
    if((mouse.down||p.autoFire)&&p.shotTimer<=0)shoot();
    spawnWave(dt);const grid=updateEnemies(dt);if(state!=='playing')return;
    updateBullets(dt,grid);if(state!=='playing')return;updateStitches(dt);if(state!=='playing')return;
    for(const ash of run.ashes)ash.life-=dt;run.ashes=run.ashes.filter(a=>a.life>0);if(run.ashes.length>300)run.ashes.splice(0,run.ashes.length-300);
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
    if(run.time<15&&run.time>5&&!mouse.down&&!p.autoFire&&run.kills===0)announce('左クリック長押しで射撃 / Fで自動射撃',1);
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
    for(let i=0;i<p.orbits;i++){const a=run.time*2.8+i/p.orbits*TAU,rad=85*Math.pow(p.orbitPower,.28),x=p.x+Math.cos(a)*rad,y=p.y+Math.sin(a)*rad;circle(x,y,15,'#ffac6a18');circle(x,y,8,'#f9b877');circle(x,y,4,'#fff2bf');}
  }
  function drawGame() {
    const shake=run.shake,cx=run.camX+(Math.random()-.5)*shake,cy=run.camY+(Math.random()-.5)*shake;
    drawFloor(cx,cy);ctx.save();ctx.translate(W/2-cx,H/2-cy);
    const visible=o=>Math.abs(o.x-cx)<W/2+100&&Math.abs(o.y-cy)<H/2+100;
    for(const a of run.ashes){if(!visible(a))continue;const alpha=Math.min(1,a.life/3);ctx.globalAlpha=alpha;circle(a.x,a.y,a.r+8,'#ff965218');for(let i=0;i<3;i++){const angle=a.phase+i/3*TAU;polygon(a.x+Math.cos(angle)*5,a.y+Math.sin(angle)*5,4,3,angle,'#ae7158');}circle(a.x,a.y,2+Math.sin(ambient*4+a.phase)*.5,'#ffc58c');ctx.globalAlpha=1;}
    for(const s of run.stitches){ctx.lineCap='round';const active=s.exploded,safe=!s.count,col=safe?'#89a396':active?'#ffc584':'#f99a63';ctx.globalAlpha=active?clamp(s.life*1.5,0,1):1;line(s.ax,s.ay,s.bx,s.by,col+'15',s.width*2);line(s.ax,s.ay,s.bx,s.by,col,active?4:2);if(!active){circle(s.ax,s.ay,8,null,col);circle(s.bx,s.by,8,null,col);}ctx.globalAlpha=1;ctx.lineCap='butt';}
    for(const h of run.hazards){circle(h.x,h.y,h.r,'#ff5b5218','#fc796880',2);if(h.timer>0){circle(h.x,h.y,h.r*(1-h.timer/1.15),null,'#ff9e86',2);line(h.x-12,h.y,h.x+12,h.y,'#ff8e76',2);line(h.x,h.y-12,h.x,h.y+12,'#ff8e76',2);}else circle(h.x,h.y,h.r*clamp(h.life/.45,0,1),'#ff986333');}
    for(const o of run.orbs){if(!visible(o))continue;polygon(o.x,o.y,o.value>5?7:4,4,Math.PI/4,'#8ac9c5');}
    for(const h of run.pickups){if(!visible(h))continue;circle(h.x,h.y,12,'#264c44','#84e2b4',1);line(h.x-5,h.y,h.x+5,h.y,'#b5f7d3',3);line(h.x,h.y-5,h.x,h.y+5,'#b5f7d3',3);}
    for(const e of run.enemies)if(visible(e))drawEnemy(e);
    for(const b of run.bullets){line(b.x-b.vx*.014,b.y-b.vy*.014,b.x,b.y,'#ffce8d',3);circle(b.x,b.y,2,'#fff6c9');}
    for(const b of run.hostile){circle(b.x,b.y,b.r+3,'#ff71822a');circle(b.x,b.y,b.r,'#e98694');circle(b.x,b.y,2,'#ffe6d7');}
    drawPlayer(run.player);
    for(const q of run.particles){ctx.globalAlpha=clamp(q.life/q.max,0,1);circle(q.x,q.y,q.size,q.color);}ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.font='bold 13px sans-serif';for(const t of run.texts){ctx.globalAlpha=clamp(t.life*2,0,1);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);}ctx.globalAlpha=1;
    // Offscreen boss marker prevents an unseen guardian from stalling a run.
    if(run.boss&&!run.boss.dead&&!visible(run.boss)){const e=run.boss,dx=e.x-cx,dy=e.y-cy,a=Math.atan2(dy,dx),r=Math.min((W/2-50)/Math.abs(Math.cos(a)||.001),(H/2-150)/Math.abs(Math.sin(a)||.001));polygon(cx+Math.cos(a)*r,cy+Math.sin(a)*r,10,3,a,'#ffab75');}
    ctx.restore();
    const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.7);vignette.addColorStop(0,'#050b1000');vignette.addColorStop(1,'#050b1080');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    if(run.flash>0){ctx.fillStyle=`rgba(255,84,63,${run.flash*.45})`;ctx.fillRect(0,0,W,H);}
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
    update(dt);if(run)drawGame();else drawTitle();requestAnimationFrame(loop);
  }
  const playingKeyCodes=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyF','KeyP','Escape','Digit1','Digit2','Digit3']);
  addEventListener('keydown',e=>{
    if(playingKeyCodes.has(e.code))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='KeyM'){toggleSound();return;}
    if(e.code==='Escape'||e.code==='KeyP'){if(state==='help'){state=run?'paused':'title';screen(run?'pause':'title');}else pause();return;}
    if(state==='upgrade'&&['Digit1','Digit2','Digit3'].includes(e.code)){chooseUpgrade(Number(e.code.slice(-1))-1);return;}
    if(state==='playing'){keys.add(e.code);if(e.code==='KeyF'){run.player.autoFire=!run.player.autoFire;announce(`自動射撃 ${run.player.autoFire?'ON':'OFF'}`,1.5);}}
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
    start,update,spawnEnemy,hurtEnemy,hurtPlayer,startDash,endDash,addXp,chooseUpgrade,rollUpgrades,finish,goTitle,pause,resume,
    segmentDistance,UPGRADES,TYPES,keys,mouse,
    get run(){return run;},get state(){return state;},get meta(){return meta;},get audioState(){return audio?.state;},seed(v){seed=v||1;},
    step(seconds){for(let t=0;t<seconds;t+=1/60)update(Math.min(1/60,seconds-t));},
    apply(id){const u=UPGRADES.find(u=>u.id===id);if(!u)throw new Error(id);u.apply(run.player);run.player.upgrades[id]=(run.player.upgrades[id]||0)+1;updateBuild();updateHud();}
  };
})();
