/* Project Ashfall: all visuals and audio are generated locally. No dependencies. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ARENA = 1560, HALF = ARENA / 2, END_TIME = 720;
  const debugEnabled = new URLSearchParams(location.search).has('debug');
  let debugUI = null, debugInvincible = false;
  let W = 1280, H = 720, dpr = 1, state = 'title', run = null, last = 0, ambient = 0;
  let seed = 0, frame = 0;
  const {t}=globalThis.AshfallI18n;
  const sfx=globalThis.AshfallAudio.create({feedbackSpec});
  const {tone,initAudio,stitchNodeSound,blastSound}=sfx;
  const ui=globalThis.AshfallUI.create({getRun:()=>run,getMeta:()=>meta,sfx,clamp,timeText,introBlocked,showStitchHelp,predictLeap,denseSpec,selectRelic,chooseUpgrade});
  const keys = new Set(), mouse = { x: 900, y: 360, down: false, active: false };
  let meta = globalThis.AshfallStorage.loadMeta();
  const {relics}=globalThis.AshfallRelics;
  function rng() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
  const random = (a, b) => a + rng() * (b - a);
  const pick = a => a[Math.floor(rng() * a.length)];
  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();

  function updateSoundLabels(...args) { return ui.updateSoundLabels(...args); }
  function toggleSound() { sfx.toggle(); updateSoundLabels(); }
  function updateFullscreenLabels(...args) { return ui.updateFullscreenLabels(...args); }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await document.documentElement.requestFullscreen?.();
    } catch { /* A denied or unavailable browser action leaves the current screen intact. */ }
  }
  function screen(...args) { const result=ui.screen(...args);debugUI?.refresh();return result; }
  function saveMeta() { if(!debugEnabled)globalThis.AshfallStorage.saveMeta(meta); }
  function titleRecord() {
    meta.relic = clamp(Number(meta.relic) || 0, 0, 3);
    if (relics[meta.relic].retired || meta.marks < relics[meta.relic].need) { meta.relic = 0; saveMeta(); }
    ui.titleRecord();
  }
  function showRelics() {
    state='relics';screen('relics');renderRelics();
  }
  function renderRelics(...args) { return ui.renderRelics(...args); }
  function selectRelic(index) {
    if(!relics[index]||relics[index].retired||meta.marks<relics[index].need)return;
    meta.relic=index;saveMeta();titleRecord();renderRelics();
  }
  function newPlayer() {
    return { x: 0, y: 0, r: 13, hp: 100, maxHp: 100, speed: 225, aim: 0, damage: .8,
      fireRate: .18, shotTimer: 0, shots: 1, spread: .17, pierce: 0, bounce: 0, bulletSpeed: 800,
      ashPerHit: 1, ashCap: 3, ashDuration: 10,
      dashCd: 2.6, dashDistance: 310, dashDuration: .18, dashTimer: 0, dashTime: 0, dashVx: 0, dashVy: 0, dashStart: null,
      collectWidth: 20, stitchWidth: 58, stitchPower: 1, stitchSlow: 0, stitchEcho: 0, stitchHeal: 0,
      invuln: 0, magnet: 175, regen: 0, wardBoost:0, wardDuration:0, readyFlash:0, dashCycle:2.6, bonusStitch:null,
      xp: 0, level: 1, xpNeed: 14, autoFire: true, upgrades: {}, walk: 0 };
  }
  function start() {
    debugInvincible = false;
    initAudio(); keys.clear(); mouse.down = false;
    seed = ((Date.now() ^ 0x6d2b79f5) >>> 0) || 1;
    run = { time: 0, player: newPlayer(), enemies: [], bullets: [], hostile: [], orbs: [],
      stitches: [], particles: [], texts: [], hazards: [], pickups: [], kills: 0, ashUsed: 0,
      stitchKills: 0, bosses: 0, spawnTimer: .3, shake: 0, flash: 0, camX: 0, camY: 0,
      announced: '', announceTimer: 0, eliteWave: 0, finalSpawned: false, boss: null,
      nextId: 1, cards: [], pending: 0, statsTimer: 0, upgradesTaken: 0, ended: false,
      leap: null, leapRequested: false, leaps: 0, poweredLeaps: 0, dryLeaps: 0, seededHits: 0,
      damageTotals: { bullet: 0, stitch: 0 }, lastLeap: null, leapFlash: 0, hitStop: 0, impacts: [], trails: [], harvests: [], wards:[],seedLinks:[], bulletsCleared:0, comboLeaps:0, denseLeaps:0, bonusLeaps:0, chainLeaps:0, shardsFired:0, maxStitchTargets:0, breather:0,
      onboarding: { stage: 0, introduced:false, disabled:false, firstSeed: null, firstLeap: null, firstKill: null, completeAt: null } };
    titleRecord();relics[meta.relic].apply(run.player);
    state = 'playing'; screen(null); updateBuild();
    // Let automatic shots establish the input grammar before any enemy appears.
    run.spawnTimer=20;announce('',0);updateHud();
  }
  function updateIntroduction() {
    const lesson=run.onboarding,p=run.player;if(lesson.disabled||lesson.introduced||run.time<1.6)return;
    lesson.introduced=true;
    for(const [distance,offset] of [[135,-10],[210,0],[280,12]]){
      const e=spawnEnemy('crawler',clamp(p.x+Math.cos(p.aim)*distance-Math.sin(p.aim)*offset,-HALF+35,HALF-35),clamp(p.y+Math.sin(p.aim)*distance+Math.cos(p.aim)*offset,-HALF+35,HALF-35));
      e.wake=12;e.intro=true;
    }
  }
  function introBlocked() {return !run.onboarding.disabled&&(run.time<1.6||(run.onboarding.firstSeed===null&&run.time<20));}
  function showStitchHelp() {
    const lesson=run.onboarding;
    return !lesson.disabled&&run.poweredLeaps<3&&run.time<180&&(lesson.completeAt===null||run.time<lesson.completeAt+20);
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
    ui.renderResult({win,marks,before});
    tone(win ? 440 : 160, .6, 'triangle', .1, win ? 2 : .3);
  }
  const {UPGRADES,families,eligible,weight,synergyNote:catalogSynergy}=globalThis.AshfallUpgrades;

  function upgradeCard(...args) { return ui.upgradeCard(...args); }
  function rollUpgrades() {
    const p = run.player;
    const available = UPGRADES.filter(u => (p.upgrades[u.id]||0)<u.max && eligible(u,p));
    const cards = [];
    const weightedPick=pool=>{let ticket=rng()*pool.reduce((n,u)=>n+weight(u,p),0);for(const u of pool){ticket-=weight(u,p);if(ticket<0)return u;}return pool[pool.length-1];};
    // One clear way into each family at the beginning; later choices are weighted without replacement.
    if(run.upgradesTaken===0)cards.push(...['pierce','heavy','short'].map(id=>available.find(u=>u.id===id)).filter(Boolean));
    while(cards.length<Math.min(3,available.length))cards.push(weightedPick(available.filter(u=>!cards.includes(u))));
    for(let i=cards.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
    run.cards = cards; state = 'upgrade'; mouse.down = false; keys.clear(); screen('upgrade');
    ui.renderUpgrades();
    tone(620,.15,'triangle',.06,1.5);
  }
  function chooseUpgrade(index) {
    if(state!=='upgrade' || !run.cards[index])return;
    const p=run.player,u=run.cards[index]; if(!eligible(u,p)||(p.upgrades[u.id]||0)>=u.max)return;grantUpgrade(u);
    run.pending--;state='playing';screen(null);keys.clear();
    announce(`${u.name} / ${upgradeGain(u.id)}`,3);floating(p.x,p.y-55,u.name,'#96ead8');
    updateBuild(); updateHud();
    if(run.pending>0)rollUpgrades();
  }
  function grantUpgrade(u) { const p=run.player;u.apply(p);p.upgrades[u.id]=(p.upgrades[u.id]||0)+1;run.upgradesTaken++; }
  function addXp(n) {
    const p=run.player;p.xp+=n;
    while(p.xp>=p.xpNeed) {
      p.xp-=p.xpNeed;p.level++;p.xpNeed=Math.round(14+Math.pow(p.level,1.45)*9);run.pending++;
    }
  }
  function buildChips(...args) { return ui.buildChips(...args); }
  function updateBuild(...args) { return ui.updateBuild(...args); }
  function upgradeGain(id) {return UPGRADES.find(u=>u.id===id).gain;}
  function synergyNote(id) {return catalogSynergy(id,run.player);}
  function updateHud(...args) { return ui.updateHud(...args); }
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
  function seedEnemy(e,amount=run.player.ashPerHit,spread=true) {
    if(e.dead||e.seedCooldown>0)return;
    const p=run.player,before=e.ash;
    e.ash=Math.min(ashLimit(e),e.ash+amount);e.ashLife=p.ashDuration;e.seedCooldown=.065;e.seedFlash=.12;
    if(e.ash>before){
      run.seededHits++;particle(e.x,e.y,'#cd9c68',2,35,2);
      if(run.onboarding.firstSeed===null){run.onboarding.firstSeed=run.time;run.onboarding.stage=1;floating(e.x,e.y-e.r-26,t('term.mark'),'#ffc584');tone(480,.12,'triangle',.035,1.25);}
    }
    const rank=p.upgrades.propagation||0;
    if(spread&&rank&&e.ash>=ashLimit(e)&&!(e.spreadCooldown>0)){
      e.spreadCooldown=.8;
      const neighbors=run.enemies.filter(o=>!o.dead&&o.id!==e.id&&dist(o,e)<145&&o.ash<ashLimit(o)).sort((a,b)=>dist(a,e)-dist(b,e)).slice(0,rank+1);
      for(const o of neighbors){const before=o.ash;seedEnemy(o,1,false);if(o.ash>before)run.seedLinks.push({ax:e.x,ay:e.y,bx:o.x,by:o.y,life:.3,kind:'spread'});}
    }
  }
  function predictLeap(dx,dy) {
    const p=run.player;
    if(dx===undefined&&mouse.active){dx=mouse.x-W/2+run.camX-p.x;dy=mouse.y-H/2+run.camY-p.y;}
    if(!dx&&!dy){dx=Math.cos(p.aim);dy=Math.sin(p.aim);}
    const m=Math.hypot(dx,dy)||1,ux=dx/m,uy=dy/m,edge=HALF-20;
    // Clip the ray at the first wall; independently clamping axes would rotate the route.
    const wallX=ux>0?(edge-p.x)/ux:ux<0?(-edge-p.x)/ux:Infinity;
    const wallY=uy>0?(edge-p.y)/uy:uy<0?(-edge-p.y)/uy:Infinity;
    const length=Math.max(0,Math.min(p.dashDistance,wallX,wallY));
    const route={ax:p.x,ay:p.y,bx:p.x+ux*length,by:p.y+uy*length,ash:0,targets:0,danger:0};
    for(const e of run.enemies){if(e.dead)continue;const d=segmentDistance(e.x,e.y,route.ax,route.ay,route.bx,route.by);if(e.ash&&d<p.collectWidth+e.r){route.ash+=e.ash;route.targets++;}if(d<e.r+p.r+4)route.danger++;}
    return route;
  }
  function stitchDamage(count,local=0,danger=0) {
    return count?(32+16*Math.min(count,12)+26*local)*run.player.stitchPower*(1+Math.min(.6,danger*.12)):0;
  }
  // Only newly captured enemy marks determine success and per-target pressure.
  function denseSpec(targets,ash,rank=run.player.upgrades.dense||0) {
    const success=targets>=1&&targets<=2&&ash>=6;
    return {success,multiplier:success&&rank?1+(targets===1?[0,.35,.55,.75][rank]:[0,.20,.30,.40][rank]):1};
  }
  function pressureMultiplier(ash,rank=run.player.upgrades.pressure||0) {return 1+rank*(ash>=12?.35:ash>=9?.25:ash>=6?.15:0);}
  function lineDamage(s,e,scale=1) {const local=s.targets.get(e.id)||0;return stitchDamage(s.count,local,s.danger)*(s.denseMultiplier||1)*pressureMultiplier(local)*scale;}
  function gatherLeap(ax,ay,bx,by) {
    const p=run.player,l=run.leap;
    for(const e of run.enemies){
      if(e.dead)continue;
      const d=segmentDistance(e.x,e.y,ax,ay,bx,by);
      if(d<e.r+p.r+4)l.crossings.add(e.id);
      if(e.ash&&d<p.collectWidth+e.r&&!l.targets.has(e.id)){
        l.count+=e.ash;l.freshAsh+=e.ash;l.targets.set(e.id,e.ash);e.ash=0;e.ashLife=0;e.stitchHold=Math.max(e.stitchHold,p.dashTime+.45);
        run.harvests.push({ax:e.x,ay:e.y,bx:p.x,by:p.y,life:.22});tone(620,.065,'sine',.025,1.8);
        particle(e.x,e.y,'#ffdba3',8,100,3);
      }
    }
    for(const b of run.hostile)if(b.life>0&&segmentDistance(b.x,b.y,ax,ay,bx,by)<p.r+b.r+5){b.life=0;l.bulletsCut++;run.bulletsCleared++;particle(b.x,b.y,'#b6e6d6',3,80);}
    for(const h of run.hazards)if(h.timer>0&&segmentDistance(h.x,h.y,ax,ay,bx,by)<h.r+p.r)l.hazards.add(h);
  }
  function hurtPlayer(dmg) {
    if(debugEnabled&&debugInvincible)return;
    const p=run.player;if(p.invuln>0||p.dashTime>0)return;
    p.hp=Math.max(0,p.hp-dmg*(.5+.5*clamp((run.time-120)/120,0,1)));p.invuln=.85;run.flash=.2;run.shake=Math.max(run.shake,7);
    particle(p.x,p.y,'#f97964',12,140);tone(90,.16,'sawtooth',.065,.5);
    if(p.hp<=0)finish(false);
  }
  function hurtEnemy(e,dmg,source='bullet',kx=0,ky=0) {
    if(e.dead)return;
    // Preparation can scrape at most 15% of a foe's health; it can never deliver the kill.
    if(source==='bullet')dmg=Math.max(0,Math.min(dmg,e.hp-e.maxHp*.85));
    const actual=Math.min(e.hp,Math.max(0,dmg));
    run.damageTotals[source]=(run.damageTotals[source]||0)+actual;
    e.hp-=dmg;e.hit=source==='stitch'?.18:0;e.kx+=kx;e.ky+=ky;
    if(e.hp<=0) {
      e.dead=true;run.kills++;if(source==='stitch')run.stitchKills++;
      const boss=e.type==='boss'||e.type==='elite';
      particle(e.x,e.y,boss?'#ffc384':'#ed895d',boss?55:7,boss?260:110,boss?6:3);
      // Kills reward experience, not free fuel: the next cycle needs new preparation.
      const xp=e.type==='boss'?150:e.type==='elite'?55:e.type==='brute'?5:e.type==='shooter'?3:2;
      run.orbs.push({x:e.x,y:e.y,value:xp,life:75,pull:false});
      if(boss||rng()<.032)run.pickups.push({x:e.x,y:e.y,life:25,heal:boss?30:12});
      if(e.type==='splitter')for(let i=0;i<3;i++)spawnEnemy('mite',e.x+random(-24,24),e.y+random(-24,24));
      if(boss){run.bosses++;run.shake=14;tone(75,.5,'sawtooth',.12,.2);if(e.type==='boss')finish(true);else {run.breather=4;announce(t('notice.guardianDown'));}}
      else if(frame%3===0)tone(random(160,240),.045,'triangle',.018,.4);
      if(source==='stitch'&&run.onboarding.firstKill===null){run.onboarding.firstKill=run.time;run.onboarding.completeAt=run.time;run.onboarding.stage=2;run.spawnTimer=3;for(const o of run.enemies)if(o.intro)o.wake=Math.min(o.wake,1);}
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
      kx:0,ky:0,hit:0,slow:0,attack:random(.7,2),phase:random(0,TAU),dead:false,wind:0,charge:0,vx:0,vy:0,
      ash:0,ashLife:0,seedCooldown:0,seedFlash:0,spreadCooldown:0,stitchHold:0,wake:0};
    run.enemies.push(e);if(type==='boss'||type==='elite')run.boss=e;return e;
  }
  function spawnFinalBoss() {
    run.finalSpawned=true;run.enemies.forEach(e=>e.dead=true);run.hostile=[];run.hazards=[];spawnEnemy('boss',0,-280);announce(t('notice.furnace'),5);tone(80,.8,'sawtooth',.1,1.3);
  }
  function spawnWave(dt) {
    if(!run.onboarding.disabled&&run.onboarding.firstKill===null&&run.time<20)return;
    if(run.time>=END_TIME&&!run.finalSpawned)spawnFinalBoss();
    const wave=Math.min(3,Math.floor(run.time/180));
    if(wave>run.eliteWave&&!run.finalSpawned){run.eliteWave=wave;if(!debugEnabled||!liveBoss()){spawnEnemy('elite');announce(t('notice.guardian'),4);}}
    if(run.breather>0)return;
    run.spawnTimer-=dt;
    const maxEnemies=run.finalSpawned?35:run.time<180?45:75;
    if(run.spawnTimer<=0&&run.enemies.length<maxEnemies){
      const stage=Math.floor(run.time/90),count=run.finalSpawned?1:run.time<300?1:Math.min(2,1+Math.floor(stage/3));
      for(let i=0;i<count&&run.enemies.length<maxEnemies;i++) {
        let pool=run.time<60?['crawler']:stage<2?['crawler','crawler','runner']:stage<3?['crawler','runner','shooter','brute']:['crawler','runner','shooter','brute','splitter'];
        const shooters=run.enemies.filter(e=>!e.dead&&e.type==='shooter').length;
        if(shooters>=Math.min(6,2+Math.floor(run.time/150)))pool=pool.filter(type=>type!=='shooter');
        spawnEnemy(pick(pool));
      }
      run.spawnTimer=run.finalSpawned?2.8:Math.max(.65,1.0-run.time/1000)+(run.time<180?.6*(1-run.time/240):0);
    }
  }
  function startDash(dx,dy) {
    const p=run.player,bonus=p.bonusStitch&&p.bonusStitch.life>0;
    if(state!=='playing'||(!bonus&&p.dashTimer>0)||p.dashTime>0)return;
    if(introBlocked())return;
    // Normal input always uses the cursor. Optional vectors serve deterministic simulations.
    const route=predictLeap(dx,dy);
    if(Math.hypot(route.bx-route.ax,route.by-route.ay)<1)return;
    p.dashVx=(route.bx-route.ax)/p.dashDuration;p.dashVy=(route.by-route.ay)/p.dashDuration;p.dashTime=p.dashDuration;
    const carried=bonus?p.bonusStitch.fuel:0,depth=bonus?p.bonusStitch.depth||1:0;if(bonus){p.bonusStitch=null;if(depth===2)run.chainLeaps++;else run.bonusLeaps++;}
    p.dashTimer=p.dashCd;p.dashCycle=p.dashCd;p.dashStart={x:p.x,y:p.y};p.invuln=Math.max(p.invuln,.4);
    run.leaps++;run.leap={count:carried,freshAsh:0,bonusDepth:depth,targets:new Map(),crossings:new Set(),bulletsCut:0,hazards:new Set(),route,bonus:!!bonus};
    gatherLeap(p.x,p.y,p.x,p.y);
    tone(180,.16,'triangle',.045,3.4);
  }
  function endDash() {
    const p=run.player,a=p.dashStart;if(!a)return;p.dashStart=null;
    const leap=run.leap,count=leap.count;
    const danger=leap.crossings.size+Math.min(3,Math.floor(leap.bulletsCut/3))+Math.min(2,leap.hazards.size);
    run.lastLeap={time:run.time,count,freshAsh:leap.freshAsh,bonusDepth:leap.bonusDepth,targets:leap.targets.size,crossings:leap.crossings.size,bulletsCut:leap.bulletsCut,danger};
    run.maxStitchTargets=Math.max(run.maxStitchTargets,leap.targets.size);
    if(count){run.poweredLeaps++;if(run.onboarding.firstLeap===null)run.onboarding.firstLeap=run.time;}
    else run.dryLeaps++;
    run.ashUsed+=count;
    // The stitch also sweeps up experience along its path: attacking and growing share a route.
    for(const orb of run.orbs)if(segmentDistance(orb.x,orb.y,a.x,a.y,p.x,p.y)<p.stitchWidth+55){addXp(orb.value);orb.life=0;}
    run.orbs=run.orbs.filter(orb=>orb.life>0);
    if(count)p.dashTimer=Math.max(.65,p.dashTimer-Math.min(1.65,count*.075+danger*.14));
    const combo=leap.targets.size>=3,dense=denseSpec(leap.targets.size,leap.freshAsh),fast=p.upgrades.fast||0;
    if(fast&&leap.freshAsh)p.dashTimer=Math.max(.40,p.dashTimer-Math.min(fast===1?.55:.90,leap.freshAsh*(fast===1?.045:.075)));
    if(combo){run.comboLeaps++;p.dashTimer=Math.max(fast?.40:.65,p.dashTimer-.35);floating(p.x,p.y-42,showStitchHelp()?t('guide.triple'):t('term.triple'),'#87e2d3');}
    if(dense.success){run.denseLeaps++;floating(p.x,p.y-42,t('notice.densePower',{bonus:dense.multiplier>1?t('notice.powerBonus',{percent:Math.round((dense.multiplier-1)*100)}):''}),'#ffc584');}
    const feedback=combo?'triple':dense.success?'dense':'normal';
    Object.assign(run.lastLeap,{combo,dense:dense.success,feedback});
    if((combo||dense.success)&&p.stitchHeal){p.hp=Math.min(p.maxHp,p.hp+p.stitchHeal);floating(p.x,p.y-64,`+${p.stitchHeal}`,'#87e2d3');}
    if(combo&&p.upgrades.quick&&leap.bonusDepth===0){p.bonusStitch={fuel:Math.min(9,Math.ceil(count*.5)),life:2,depth:1};p.readyFlash=.4;}
    const chain=p.upgrades.chain||0;
    if(chain&&leap.bonusDepth===1&&leap.targets.size>=(chain===1?3:2)){
      p.bonusStitch={fuel:Math.min(chain===1?9:12,Math.ceil(leap.freshAsh*(chain===1?.5:.65))),life:2,depth:2};p.readyFlash=.4;
    }
    if(count)createWard(count,leap.targets.size,combo);
    p.dashCycle=p.dashTimer;
    for(const h of run.pickups)if(segmentDistance(h.x,h.y,a.x,a.y,p.x,p.y)<p.collectWidth+25){p.hp=Math.min(p.maxHp,p.hp+h.heal);h.life=0;floating(p.x,p.y-25,`+${h.heal}`,'#87e2d3');}
    run.pickups=run.pickups.filter(h=>h.life>0);
    const line={ax:a.x,ay:a.y,bx:p.x,by:p.y,width:p.stitchWidth,count,denseMultiplier:dense.multiplier,pointTarget:dense.success&&leap.targets.size===1?run.enemies.find(e=>leap.targets.has(e.id)):null,pointPops:0,shardShots:0,shardTargets:new Set(),damage:stitchDamage(count,0,danger)*dense.multiplier,targets:leap.targets,danger,timer:.09,life:1.3,exploded:false,echoed:false,hitIds:new Set(),echoIds:new Set(),nodes:0,echoNodes:0,combo,progress:0,echoProgress:0};
    line.feedback=feedback;
    line.feedbackMultiplier=dense.multiplier*Math.max(1,...Array.from(leap.targets.values(),ash=>pressureMultiplier(ash)));
    run.stitches.push(line);
    p.invuln=Math.max(p.invuln,.22+Math.min(.18,danger*.035));run.leap=null;
  }
  function wardSpec(count,targets,combo=targets>=3) {
    const p=run.player,radius=Math.min(280,58+Math.min(count,12)*7+Math.min(targets,5)*14+(combo?40:0)+p.wardBoost);
    const life=(combo?.75:.35)+Math.min(count,12)*.015+p.wardDuration;
    return {radius,life};
  }
  function createWard(count,targets,combo) {
    const p=run.player,{radius,life}=wardSpec(count,targets,combo);
    const w={x:p.x,y:p.y,r:radius,life,max:life,combo,cleared:0};run.wards.push(w);
    for(const b of run.hostile)if(b.life>0&&dist(w,b)<radius+b.r)absorbBullet(w,b);
    run.hostile=run.hostile.filter(b=>b.life>0);
    for(const e of run.enemies)if(!e.dead&&dist(w,e)<radius+e.r){const d=dist(w,e)||1;e.kx+=(e.x-w.x)/d*80;e.ky+=(e.y-w.y)/d*80;e.slow=Math.max(e.slow,.6);if(e.type!=='boss'&&e.type!=='elite'){e.stitchHold=Math.max(e.stitchHold,.25);e.charge=0;}}
    tone(combo?380:300,.16,'sine',.025,1.6);
  }
  function absorbBullet(w,b) {
    if(b.life<=0)return;b.life=0;w.cleared++;run.bulletsCleared++;particle(b.x,b.y,'#9ee5dc',2,60,2);
    // Procedural light only: never consume combat RNG or crowd the particle pool.
    if(w.combo&&run.impacts.filter(q=>q.clear).length<24)run.impacts.push({x:b.x,y:b.y,life:.22,max:.22,feedback:'triple',clear:true});
  }
  function updateWards(dt) {
    // Only moving projectiles belong to this protection; ground telegraphs keep their timers.
    for(const w of run.wards){w.life-=dt;if(w.life<=0)continue;for(const b of run.hostile)if(b.life>0&&dist(w,b)<w.r+b.r)absorbBullet(w,b);}
    run.wards=run.wards.filter(w=>w.life>0);
  }
  function assistedAngle(angle) {
    const p=run.player;let best=null,value=Infinity;
    for(const e of run.enemies){if(e.dead)continue;const d=dist(e,p);if(d>650||d<25)continue;const delta=Math.atan2(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-angle),Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-angle));
      if(Math.abs(delta)>.12||Math.abs(Math.sin(delta)*d)>e.r+20)continue;const score=Math.abs(delta)*400+d*.04;if(score<value){value=score;best=delta;}}
    return angle+(best===null?0:best*.55);
  }
  function shoot() {
    const p=run.player;
    for(let i=0;i<p.shots;i++) {
      const angle=assistedAngle(p.aim+(i-(p.shots-1)/2)*p.spread);
      run.bullets.push({x:p.x+Math.cos(angle)*20,y:p.y+Math.sin(angle)*20,vx:Math.cos(angle)*p.bulletSpeed,vy:Math.sin(angle)*p.bulletSpeed,
        r:7,life:1.25,damage:p.damage,pierce:p.pierce,bounce:p.bounce,hitIds:new Set(),dead:false,fork:false});
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
      if(e.dead)continue;e.stitchPrevX=e.x;e.stitchPrevY=e.y;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);
      e.seedCooldown=Math.max(0,e.seedCooldown-dt);e.seedFlash=Math.max(0,e.seedFlash-dt);e.spreadCooldown=Math.max(0,e.spreadCooldown-dt);e.stitchHold=Math.max(0,e.stitchHold-dt);e.wake=Math.max(0,e.wake-dt);
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
        if(e.attack<=0&&d<640){const a=Math.atan2(dy,dx),gentle=run.time<300,n=gentle?1:2;for(let j=0;j<n;j++)hostile(e.x,e.y,a+(j-(n-1)/2)*.24,gentle?135:165,11);e.attack=gentle?4:3.3;particle(e.x,e.y,'#cc92bd',5,80);}
      }
      const speed=e.speed*(e.slow>0?.4:1)*(run.time<12?.55:run.time<180?.8:1);
      e.x+=nx*speed*dt*movement+e.kx*dt;e.y+=ny*speed*dt*movement+e.ky*dt;e.kx*=Math.exp(-9*dt);e.ky*=Math.exp(-9*dt);
      e.x=clamp(e.x,-HALF+e.r,HALF-e.r);e.y=clamp(e.y,-HALF+e.r,HALF-e.r);
      if(d<p.r+e.r)hurtPlayer(e.damage);
    }
    // A local grid keeps separation and projectile collision bounded as waves grow.
    const grid=new Map();
    for(const e of run.enemies){if(e.dead)continue;const key=`${Math.floor(e.x/70)},${Math.floor(e.y/70)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(e);}
    for(const e of run.enemies){if(e.dead)continue;const gx=Math.floor(e.x/70),gy=Math.floor(e.y/70);for(let ix=-1;ix<=1;ix++)for(let iy=-1;iy<=1;iy++)for(const o of grid.get(`${gx+ix},${gy+iy}`)||[]){if(o.id<=e.id)continue;const dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy)||.1,target=(e.r+o.r)*.84;if(d<target){const push=(target-d)*.28;const nx=dx/d,ny=dy/d;e.x+=nx*push;e.y+=ny*push;o.x-=nx*push;o.y-=ny*push;}}}
    return grid;
  }
  function guideRicochet(b,dt) {
    if(!b.fork||!b.guideTarget||b.guideTime<=0||b.guideTurn<=0)return;
    const target=b.guideTarget,speed=Math.hypot(b.vx,b.vy),angle=Math.atan2(b.vy,b.vx);
    b.guideTime=Math.max(0,b.guideTime-dt);
    const delta=Math.atan2(Math.sin(Math.atan2(target.y-b.y,target.x-b.x)-angle),Math.cos(Math.atan2(target.y-b.y,target.x-b.x)-angle));
    // One short correction toward the selected foe; never reacquire or circle a missed target.
    if(target.dead||b.hitIds.has(target.id)||Math.abs(delta)>Math.PI/2){b.guideTarget=null;return;}
    const turn=clamp(delta,-Math.min(3.2*dt,b.guideTurn),Math.min(3.2*dt,b.guideTurn));
    b.guideTurn-=Math.abs(turn);b.vx=Math.cos(angle+turn)*speed;b.vy=Math.sin(angle+turn)*speed;
  }
  function updateBullets(dt,grid) {
    const p=run.player;
    for(const b of run.bullets) {
      if(b.dead)continue;guideRicochet(b,dt);const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.life<=0||Math.abs(b.x)>HALF+40||Math.abs(b.y)>HALF+40){b.dead=true;continue;}
      const minX=Math.floor((Math.min(ox,b.x)-60)/70),maxX=Math.floor((Math.max(ox,b.x)+60)/70),minY=Math.floor((Math.min(oy,b.y)-60)/70),maxY=Math.floor((Math.max(oy,b.y)+60)/70);
      outer:for(let gx=minX;gx<=maxX;gx++)for(let gy=minY;gy<=maxY;gy++)for(const e of grid.get(`${gx},${gy}`)||[]) {
        if(e.dead||b.hitIds.has(e.id)||segmentDistance(e.x,e.y,ox,oy,b.x,b.y)>e.r+b.r)continue;
        if(b.shard&&e.ash>=ashLimit(e))continue;
        b.hitIds.add(e.id);seedEnemy(e,b.shard?1:p.ashPerHit);hurtEnemy(e,b.damage,'bullet',b.vx*.005,b.vy*.005);
        if(b.bounce>0){let target=null,near=360;const speed=Math.hypot(b.vx,b.vy);for(const o of run.enemies){const d=dist(o,e),forward=Math.abs((o.x-e.x)*b.vy/speed-(o.y-e.y)*b.vx/speed)<30;const score=d+(b.pierce>0&&forward?100:0);if(!o.dead&&!b.hitIds.has(o.id)&&d<260&&score<near){near=score;target=o;}}
          if(target){const angle=Math.atan2(target.y-e.y,target.x-e.x);run.seedLinks.push({ax:e.x,ay:e.y,bx:target.x,by:target.y,life:.2,kind:'fork'});
            if(b.pierce>0&&run.bullets.length<350){run.bullets.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:7,life:Math.min(.8,b.life),damage:b.damage,pierce:0,bounce:b.bounce-1,hitIds:new Set(b.hitIds),dead:false,fork:true,guideTarget:target,guideTime:.38,guideTurn:.7});b.bounce--;}
            else if(b.pierce<=0){b.x=e.x;b.y=e.y;b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed;b.bounce--;b.fork=true;b.guideTarget=target;b.guideTime=.38;b.guideTurn=.7;break outer;}
          }
        }
        if(b.pierce>0){b.pierce--;continue;}
        b.dead=true;break outer;
      }
    }
    run.bullets=run.bullets.filter(b=>!b.dead);
    for(const b of run.hostile){if(b.life<=0)continue;const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;const ward=run.wards.find(w=>w.life>0&&segmentDistance(w.x,w.y,ox,oy,b.x,b.y)<w.r+b.r);if(ward){absorbBullet(ward,b);continue;}if(segmentDistance(run.player.x,run.player.y,ox,oy,b.x,b.y)<b.r+run.player.r){hurtPlayer(b.damage);b.life=0;}}
    run.hostile=run.hostile.filter(b=>b.life>0&&Math.abs(b.x)<HALF+60&&Math.abs(b.y)<HALF+60);
  }
  function scatterShards(s,x,y) {
    const rank=run.player.upgrades.shards||0;if(!rank)return;
    const perPoint=rank===1?2:3,range=rank===1?180:220;
    const room=Math.max(0,Math.min(perPoint,(rank===1?6:9)-s.shardShots,36-run.bullets.filter(b=>b.shard&&!b.dead).length,350-run.bullets.length));
    const origin={x,y},pool=run.enemies.filter(e=>!e.dead&&e.ash<ashLimit(e)&&!s.shardTargets.has(e.id)&&dist(e,origin)<=range).sort((a,b)=>dist(a,origin)-dist(b,origin)).slice(0,room);
    for(const e of pool){const angle=Math.atan2(e.y-y,e.x-x),speed=540;s.shardTargets.add(e.id);s.shardShots++;run.shardsFired++;
      run.bullets.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:4,life:(range+40)/speed,damage:.05,pierce:0,bounce:0,hitIds:new Set(),dead:false,shard:true,fork:true,guideTarget:e,guideTime:.25,guideTurn:.5});}
  }
  function feedbackSpec(kind,multiplier=1) {
    const strength=kind==='dense'?clamp((multiplier-1)/2,0,1):0;
    return {kind,strength,color:kind==='triple'?'#93eed4':kind==='dense'?'#ffb473':'#ffd194',
      hitStop:kind==='dense'?.070+strength*.018:kind==='triple'?.065:.045,
      shake:kind==='dense'?7+strength:kind==='triple'?10:6,
      bass:kind==='dense'?100-strength*8:kind==='triple'?180:72,
      slide:kind==='triple'?1.8:kind==='dense'?.42:.38,
      noise:kind==='dense'?.07+strength*.01:kind==='triple'?.075:.13,
      attack:kind==='dense'?.002:0,soundDuration:kind==='dense'?.12:.32,noiseDuration:kind==='dense'?.045:.22};
  }
  function stitchImpact(s,index,echo=false) {
    const t=echo?1-index/10:index/10,x=s.ax+(s.bx-s.ax)*t,y=s.ay+(s.by-s.ay)*t;
    const feedback=s.feedback||'normal';
    run.impacts.push({x,y,life:.32,max:.32,combo:s.combo,feedback,echo,index,angle:Math.atan2(s.by-s.ay,s.bx-s.ax),spacing:Math.hypot(s.bx-s.ax,s.by-s.ay)/10,strength:feedbackSpec(feedback,s.feedbackMultiplier).strength});
    particle(x,y,echo?'#a7e2d4':feedback==='triple'?'#8ee9da':feedback==='dense'?'#a56c4466':'#ffbb69',echo?5:9,echo?120:feedback==='dense'?100:240,echo?3:feedback==='dense'?3:5);
    particle(x,y,feedback==='triple'?'#dffff4':'#fff4d3',4,110,2);
    if(!echo&&[0,5,10].includes(index))scatterShards(s,x,y);
    if(index===0){
      run.shake=Math.max(run.shake,feedbackSpec(feedback,s.feedbackMultiplier).shake);run.leapFlash=feedback==='normal'?.06:0;
      blastSound(feedback,echo,s.feedbackMultiplier);
    }else if(index%3===0)stitchNodeSound(feedback,index,echo);
  }

  function frontCrossing(s,e,fromTimer,toTimer,delay=0,width=s.width) {
    const dt=fromTimer-toTimer;if(dt<=0)return null;
    const begin=Math.max(0,(fromTimer+delay)/dt),end=Math.min(1,(fromTimer+delay+.28)/dt);
    // Clip to the active sweep, including sub-frame warmup and completion. Afterglow never hits.
    if(begin>end||end<0||begin>1||fromTimer+delay<=-.28)return null;
    const dx=s.bx-s.ax,dy=s.by-s.ay,length2=dx*dx+dy*dy||1;
    const ax=e.stitchPrevX??e.x,ay=e.stitchPrevY??e.y,vx=e.x-ax,vy=e.y-ay;
    const u0=((ax-s.ax)*dx+(ay-s.ay)*dy)/length2,du=(vx*dx+vy*dy)/length2;
    const breaks=[begin,end];
    // Projection clamps at each endpoint: split there so even a fast crossing remains linear.
    if(du)for(const edge of [0,1]){const t=(edge-u0)/du;if(t>begin&&t<end)breaks.push(t);}
    breaks.sort((a,b)=>a-b);
    const relative=t=>{const value=clamp(u0+du*t,0,1)-clamp(-(fromTimer-dt*t+delay)/.28,0,1);return Math.abs(value)<1e-10?0:value;};
    for(let i=0;i<breaks.length-1;i++){
      const a=breaks[i],b=breaks[i+1],ra=relative(a),rb=relative(b);
      if(ra*rb>0)continue;
      let t;
      if(Math.abs(ra-rb)<1e-10){
        // A foe moving with the front can cross its width between both sampled positions.
        const v0=(ax-s.ax)*dy-(ay-s.ay)*dx,dv=vx*dy-vy*dx;
        t=dv?clamp(-v0/dv,a,b):a;
      }else t=a+(b-a)*ra/(ra-rb);
      if(segmentDistance(ax+vx*t,ay+vy*t,s.ax,s.ay,s.bx,s.by)<width+e.r)return t;
    }
    return null;
  }
  function updateStitches(dt) {
    const p=run.player;
    for(const s of run.stitches) {
      const previousTimer=s.timer;s.timer-=dt;s.life-=dt;
      if(!s.count){if(s.timer<=0)s.exploded=true;continue;}
      if(s.timer<=0){
        s.exploded=true;s.progress=clamp(-s.timer/.28,0,1);
        const nodes=Math.min(11,1+Math.floor(s.progress*10));
        while(s.nodes<nodes)stitchImpact(s,s.nodes++);
      }
      if(p.stitchEcho&&s.timer<=-.5){
        s.echoed=true;s.echoProgress=clamp((-s.timer-.5)/.28,0,1);
        const nodes=Math.min(11,1+Math.floor(s.echoProgress*10));
        while(s.echoNodes<nodes)stitchImpact(s,s.echoNodes++,true);
      }
      const mainActive=previousTimer>-.28&&s.timer<=0,echoActive=p.stitchEcho&&previousTimer>-.78&&s.timer<=-.5;
      if(!mainActive&&!echoActive)continue;
      for(const e of run.enemies){
        // Splitter children born in this hit loop have no earlier motion sample to cross.
        if(e.dead||!s.exploded||e.stitchPrevX===undefined)continue;
        const dx=s.bx-s.ax,dy=s.by-s.ay,length=Math.hypot(dx,dy)||1;
        const hit=(ids,scale,crossing)=>{
          if(ids.has(e.id))return;ids.add(e.id);
          const first=s.hitIds.size===1&&!s.echoed;
          hurtEnemy(e,lineDamage(s,e,scale),'stitch',dx/length*65,dy/length*65);
          const focus=s.feedback==='dense'&&ids===s.hitIds,f=feedbackSpec(s.feedback,s.denseMultiplier*pressureMultiplier(s.targets.get(e.id)||0));
          particle(e.x,e.y,'#fff4d5',9,focus?110:190,4);if(p.stitchSlow)e.slow=p.stitchSlow;
          if(focus){const x=(e.stitchPrevX??e.x)+(e.x-(e.stitchPrevX??e.x))*crossing,y=(e.stitchPrevY??e.y)+(e.y-(e.stitchPrevY??e.y))*crossing;
            run.impacts.push({x,y,life:.14,max:.14,feedback:'dense',focus:true,marker:s.targets.has(e.id),strength:f.strength});}
          if(first){run.hitStop=Math.max(run.hitStop,f.hitStop);if(s.feedback!=='dense')tone(s.feedback==='triple'?220:45,.16,'sine',s.feedback==='triple'?.04:.1,s.feedback==='triple'?1.6:.55);}
        };
        const crossing=mainActive?frontCrossing(s,e,previousTimer,s.timer):null;
        if(crossing!==null)hit(s.hitIds,1,crossing);
        if(!e.dead&&echoActive){
          const reverse={ax:s.bx,ay:s.by,bx:s.ax,by:s.ay,width:s.width},back=frontCrossing(reverse,e,previousTimer,s.timer,.5,s.width*(p.stitchEcho>=2?1.35:1));
          if(back!==null)hit(s.echoIds,p.stitchEcho===1?.75:1,back);
        }
      }
    }
    for(const s of run.stitches){const rank=p.upgrades.point||0,e=s.pointTarget;
      if(!rank||!e||e.dead||!s.exploded)continue;
      const pops=rank===1?1:2;
      while(s.pointPops<pops&&s.timer<=-(.42+s.pointPops*.22)&&!e.dead){s.pointPops++;
        hurtEnemy(e,lineDamage(s,e,rank===1?.45:.60),'stitch');if(p.stitchSlow)e.slow=p.stitchSlow;
        run.impacts.push({x:e.x,y:e.y,life:.32,max:.32,point:true,feedback:'point'});particle(e.x,e.y,'#ffe4c2',14,220,5);blastSound('normal');run.shake=Math.max(run.shake,8);floating(e.x,e.y-e.r-18,t('upgrade.point.name'),'#ffc584');
      }
    }
    run.stitches=run.stitches.filter(s=>s.life>0);
    for(const h of run.hazards){h.timer-=dt;h.life-=dt;if(h.timer<=0&&!h.hit){h.hit=true;particle(h.x,h.y,'#ff7163',20,180,5);if(dist(h,p)<h.r+p.r)hurtPlayer(h.damage||24);}}
    run.hazards=run.hazards.filter(h=>h.life>0);
  }
  function update(dt) {
    if(state!=='playing')return;
    const p=run.player;run.time+=dt;frame++;
    run.announceTimer=Math.max(0,run.announceTimer-dt);run.breather=Math.max(0,run.breather-dt);run.shake*=Math.exp(-10*dt);run.flash=Math.max(0,run.flash-dt);run.leapFlash=Math.max(0,run.leapFlash-dt);
    const previous=p.dashTimer;p.invuln=Math.max(0,p.invuln-dt);p.dashTimer=Math.max(0,p.dashTimer-dt);p.shotTimer-=dt;p.readyFlash=Math.max(0,p.readyFlash-dt);
    if(previous>0&&p.dashTimer===0){p.readyFlash=.4;tone(540,.06,'sine',.018,1.25);}
    if(p.bonusStitch){p.bonusStitch.life-=dt;if(p.bonusStitch.life<=0)p.bonusStitch=null;}
    if(run.lastLeap?.count&&run.time-run.lastLeap.time<4)p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);
    let dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dy=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    if(mouse.active)p.aim=Math.atan2(mouse.y-H/2+run.camY-p.y,mouse.x-W/2+run.camX-p.x);
    updateIntroduction();updateWards(dt);
    if(run.leapRequested){run.leapRequested=false;startDash();}
    if(p.dashTime>0){
      const ax=p.x,ay=p.y,t=Math.min(dt,p.dashTime),route=run.leap.route,feedback=route.targets>=3?'triple':denseSpec(route.targets,route.ash).success?'dense':'normal';
      p.x+=p.dashVx*t;p.y+=p.dashVy*t;run.trails.push({x:p.x,y:p.y,aim:p.aim,life:.22,feedback});p.dashTime=Math.max(0,p.dashTime-t);
      particle(p.x,p.y,feedback==='triple'?'#93eed4':run.leap.count?'#ffd09a':'#aac6b5',2,40,4);
      p.x=clamp(p.x,-HALF+20,HALF-20);p.y=clamp(p.y,-HALF+20,HALF-20);gatherLeap(ax,ay,p.x,p.y);
      if(p.dashTime<1e-8){p.dashTime=0;p.x=run.leap.route.bx;p.y=run.leap.route.by;endDash();}
    }
    else if(dx||dy){const len=Math.hypot(dx,dy);p.x+=dx/len*p.speed*dt;p.y+=dy/len*p.speed*dt;p.walk+=dt*12;}
    p.x=clamp(p.x,-HALF+20,HALF-20);p.y=clamp(p.y,-HALF+20,HALF-20);
    if(p.dashTime<=0&&p.autoFire&&p.shotTimer<=0)shoot();
    spawnWave(dt);const grid=updateEnemies(dt);if(state!=='playing')return;
    updateBullets(dt,grid);if(state!=='playing')return;updateStitches(dt);if(state!=='playing')return;
    for(const o of run.orbs){o.life-=dt;const d=dist(o,p);if(d<p.magnet)o.pull=true;if(o.pull){const s=Math.min(d,520*dt);o.x+=(p.x-o.x)/(d||1)*s;o.y+=(p.y-o.y)/(d||1)*s;}if(d<20){addXp(o.value);o.life=0;tone(720,.025,'sine',.009,1.2);}}
    run.orbs=run.orbs.filter(o=>o.life>0);
    for(const h of run.pickups){h.life-=dt;const d=dist(h,p);if(d<p.magnet*.65){const s=Math.min(d,340*dt);h.x+=(p.x-h.x)/(d||1)*s;h.y+=(p.y-h.y)/(d||1)*s;}if(d<28){p.hp=Math.min(p.maxHp,p.hp+h.heal);h.life=0;floating(p.x,p.y-25,`+${h.heal}`,'#87e2d3');tone(500,.12,'triangle',.04,1.4);}}
    run.pickups=run.pickups.filter(h=>h.life>0);
    for(const q of run.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.exp(-4*dt);q.vy*=Math.exp(-4*dt);}run.particles=run.particles.filter(q=>q.life>0);
    for(const list of [run.impacts,run.trails,run.harvests,run.seedLinks])for(const q of list)q.life-=dt;
    run.impacts=run.impacts.filter(q=>q.life>0);run.trails=run.trails.filter(q=>q.life>0);run.harvests=run.harvests.filter(q=>q.life>0);run.seedLinks=run.seedLinks.filter(q=>q.life>0).slice(-200);
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
    // A complete ring means the main attack is available; a gap means waiting.
    const ready=!introBlocked()&&(p.dashTimer<=0||!!p.bonusStitch),progress=introBlocked()?0:ready?1:clamp(1-p.dashTimer/(p.dashCycle||p.dashCd),0,1),col=p.bonusStitch?'#93eed4':'#ffc080';
    ctx.save();circle(p.x,p.y,29,null,'#a8c9bc30',2);ctx.beginPath();ctx.arc(p.x,p.y,29,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.strokeStyle=ready?col:'#b39c7a';ctx.lineWidth=ready?2.5:2;ctx.stroke();
    if(p.readyFlash>0){ctx.globalAlpha=p.readyFlash/.4;circle(p.x,p.y,29+(1-p.readyFlash/.4)*14,null,col,2);}
    ctx.globalAlpha=1;
    if(p.bonusStitch){ctx.beginPath();ctx.arc(p.x,p.y,35,-Math.PI/2,-Math.PI/2+TAU*p.bonusStitch.life/2);ctx.strokeStyle='#93eed4';ctx.lineWidth=2;ctx.stroke();ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#b5f5e5';ctx.fillText(t('guide.onceMore'),p.x,p.y+49);}
    if(!run.onboarding.disabled&&run.time<1.6){ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#c8d8ca';ctx.fillText(t('guide.autoPrime'),p.x,p.y-48);}
    ctx.restore();
  }
  function drawLeapGuide() {
    if(introBlocked())return;
    const p=run.player,r=p.dashTime>0?run.leap.route:predictLeap(),ready=p.dashTimer<=0||p.dashTime>0||!!p.bonusStitch,fuel=r.ash+(p.bonusStitch?.fuel||0);
    const dense=denseSpec(r.targets,r.ash);
    const col=r.targets>=3?'#8df1dc':dense.success?'#ffb473':fuel?'#ffc47e':'#9cbdb7',angle=Math.atan2(r.by-r.ay,r.bx-r.ax),length=Math.hypot(r.bx-r.ax,r.by-r.ay);
    ctx.save();ctx.globalAlpha=ready?.85:.32;
    line(r.ax,r.ay,r.bx,r.by,col+'10',p.collectWidth*2);
    ctx.setLineDash([9,7]);line(r.ax,r.ay,r.bx,r.by,col,ready?2:1);ctx.setLineDash([]);
    circle(r.ax,r.ay,19,null,col,1.5);
    for(let d=55;d<length;d+=60){const x=r.ax+Math.cos(angle)*d,y=r.ay+Math.sin(angle)*d;line(x-Math.cos(angle-.5)*7,y-Math.sin(angle-.5)*7,x,y,col,2);line(x-Math.cos(angle+.5)*7,y-Math.sin(angle+.5)*7,x,y,col,2);}
    circle(r.bx,r.by,p.r+7,col+'18',col,2);circle(r.bx,r.by,4,col);
    if(fuel&&ready&&p.dashTime<=0){ctx.setLineDash([3,8]);circle(r.bx,r.by,wardSpec(fuel,r.targets).radius,null,r.targets>=3?'#93eed444':'#9ee5dc22',1);ctx.setLineDash([]);}
    for(const e of run.enemies)if(e.ash&&!e.dead&&segmentDistance(e.x,e.y,r.ax,r.ay,r.bx,r.by)<p.collectWidth+e.r){circle(e.x,e.y,e.r+12,null,col,2);line(e.x,e.y-e.r,e.x,e.y-e.r-6,col,2);}
    if(p.dashTime<=0&&showStitchHelp()){ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText(ready?(fuel?(r.targets>=3?t('guide.triple'):p.bonusStitch?(p.bonusStitch.depth===2?t('guide.chain'):t('guide.return')):dense.success?t('guide.dense'):t('guide.stitch')):t('guide.landing')):t('guide.wait'),r.bx,r.by-27);}
    if(!showStitchHelp()&&p.dashTime<=0&&(dense.success||r.targets>=3||p.bonusStitch)){ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText(p.bonusStitch?(p.bonusStitch.depth===2?t('term.chain'):t('term.return')):r.targets>=3?t('term.triple'):t('term.dense'),r.bx,r.by-27);}
    ctx.restore();
    if(showStitchHelp()&&run.onboarding.firstSeed===null&&run.time<12){const e=run.enemies.find(e=>!e.dead);if(e){circle(e.x,e.y,e.r+12,null,'#a9c0bb66',1);ctx.fillStyle='#a9c0bb';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(t('guide.aim'),e.x,e.y-e.r-22);}}
  }
  function drawStitches() {
    ctx.save();ctx.lineCap='round';
    for(const s of run.stitches){
      const alpha=clamp(s.life*2,0,1),col=feedbackSpec(s.feedback).color,dense=s.feedback==='dense',spent=s.progress===1;ctx.globalAlpha=alpha;
      line(s.ax,s.ay,s.bx,s.by,s.count?col+(spent?'08':'19'):'#89a39644',s.count?s.width*2:2);
      if(!s.count)continue;
      // Unlit fuse glows tightly before a white hot front walks from origin to destination.
      if(!spent){line(s.ax,s.ay,s.bx,s.by,s.feedback==='normal'?'#ffbd7866':col+'66',dense?7:10);line(s.ax,s.ay,s.bx,s.by,s.feedback==='triple'?'#dbfff2':dense?'#fff4e5':'#ffe7ba',s.exploded?1.5:dense?2.5:3.5);}
      const bx=s.ax+(s.bx-s.ax)*s.progress,by=s.ay+(s.by-s.ay)*s.progress;
      if(s.exploded){
        line(s.ax,s.ay,bx,by,col+(spent?'18':'44'),dense?10:24);
        line(s.ax,s.ay,bx,by,spent?col+'30':dense?'#fff7da':col,spent?1.5:dense?3.5:4);
        if(!spent&&dense){const dx=s.bx-s.ax,dy=s.by-s.ay,l=Math.hypot(dx,dy)||1;line(bx-dx/l*22,by-dy/l*22,bx,by,'#fff8ed',5);circle(bx,by,6,'#fff3df');}
      }
      if(s.echoed){const ex=s.bx+(s.ax-s.bx)*s.echoProgress,ey=s.by+(s.ay-s.by)*s.echoProgress,done=s.echoProgress===1;line(s.bx,s.by,ex,ey,done?'#a6f9e210':'#a6f9e233',run.player.stitchEcho>=2?s.width*2.7:26);line(s.bx,s.by,ex,ey,done?'#bfffe630':'#bfffe6',done?1.5:5);}
      if(!s.exploded){circle(s.ax,s.ay,9+Math.sin(ambient*45)*3,col+'55',col,2);circle(s.bx,s.by,18,null,col+'99',2);}
    }
    for(const q of run.trails){ctx.globalAlpha=q.life/.22*.4;polygon(q.x,q.y,16,3,q.aim+Math.PI,q.feedback==='dense'?'#ffd194':q.feedback==='triple'?'#93eed4':'#c8eadc');}
    for(const q of run.harvests){ctx.globalAlpha=q.life/.22;const t=1-q.life/.22,x=q.ax+(q.bx-q.ax)*t,y=q.ay+(q.by-q.ay)*t;line(q.ax,q.ay,x,y,'#ffcc8855',2);circle(x,y,4,'#fff0c2');}
    ctx.restore();drawStitchImpacts();
  }
  function drawStitchImpacts(foreground=false) {
    ctx.save();
    for(const q of run.impacts){
      if(!!(q.focus||q.point)!==foreground)continue;
      const t=1-q.life/q.max,col=q.echo||q.combo?'#9eeddb':'#ffbf73';ctx.globalAlpha=(1-t)*(1-t);
      if(q.clear){
        circle(q.x,q.y,4+t*18,null,'#bdfff0',1.5);
        line(q.x-5-t*8,q.y,q.x-2,q.y,'#93eed4',2);line(q.x+2,q.y,q.x+5+t*8,q.y,'#93eed4',2);continue;
      }
      if(q.point){
        // A delayed, outward puncture remains distinct from the main inward compression.
        polygon(q.x,q.y,9+t*27,4,Math.PI/4,null,'#ffe4c2');
        line(q.x,q.y-24-t*14,q.x,q.y+24+t*14,'#fff4df',2);
        circle(q.x,q.y,6+t*12,'#ffb47344');continue;
      }
      if(!q.echo&&q.feedback==='dense'){
        const strength=q.strength||0;
        if(!q.focus){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle);
          // Each ordinary blast becomes a tighter, white-hot pressure ring. No new simulation particles.
          ctx.globalCompositeOperation='lighter';
          circle(0,0,12+t*26,'#ffc3630c','#ffdca8',2.5);circle(0,0,8+t*6,'#fff4c780','#fff9de',1.5);
          if(q.index>0&&t<.38){const x=-q.spacing*.5;ctx.globalAlpha=(1-t/.38)*.8;
            circle(x,0,6+t*9,'#ffe5a32a','#fff3c2',1.5);circle(x,0,7*(1-t/.38),'#fff8df');}
          if(t<.45){ctx.globalAlpha=(1-t/.45)*.95;line(-q.spacing*.55,0,q.spacing*.55,0,'#fff7d4',3);circle(0,0,(12+strength*3)*(1-t/.45),'#fffbea');
            line(-18,0,18,0,'#fff8e5',3);line(0,-15,0,15,'#fff0c8',2);}
          ctx.restore();continue;}
        ctx.save();ctx.translate(q.x,q.y);
        // Every main-route hit flashes once. Captured targets get only a small success marker.
        if(q.marker)circle(0,0,10+(1-t)*9,null,'#ffb473',1);
        circle(0,0,(4+strength*2)*(1-t),'#fff8ec');line(-12*(1-t),0,12*(1-t),0,'#ffe4c0',2);
        ctx.restore();continue;
      }
      if(!q.echo&&q.feedback==='triple'){
        ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle);
        // Every node retains the flash, hot center and growing shell of the standard chain.
        ctx.beginPath();ctx.ellipse(0,0,14+t*38,16+t*65,0,0,TAU);ctx.fillStyle='#93eed418';ctx.fill();ctx.strokeStyle='#9eeddb';ctx.lineWidth=2.5;ctx.stroke();
        circle(0,0,8+t*22,'#dbfff24c');
        if(q.index%5===0){ctx.beginPath();ctx.ellipse(0,0,24+t*34,18+t*85,0,0,TAU);ctx.strokeStyle='#9eeddb';ctx.lineWidth=2.5;ctx.stroke();
          line(0,-14-t*77,0,-22-t*85,'#d4fff3',2);line(0,14+t*77,0,22+t*85,'#d4fff3',2);}
        if(t<.35){ctx.globalAlpha=(1-t/.35)*.85;circle(0,0,16*(1-t/.35),'#effff7');line(-26,0,26,0,'#e6fff6',2);line(0,-32,0,32,'#d4fff3',2);}
        ctx.restore();continue;
      }
      circle(q.x,q.y,12+t*58,col+'15',col,2.5);circle(q.x,q.y,8+t*22,'#ffe1a555');
      if(t<.35){ctx.globalAlpha=(1-t/.35)*.85;circle(q.x,q.y,16*(1-t/.35),'#fff8de');line(q.x-26,q.y,q.x+26,q.y,'#fff0c8',2);line(q.x,q.y-24,q.x,q.y+24,'#fff0c8',2);}
    }
    ctx.restore();
  }
  function drawGame() {
    const shake=run.shake,cx=run.camX+(Math.random()-.5)*shake,cy=run.camY+(Math.random()-.5)*shake;
    drawFloor(cx,cy);ctx.save();ctx.translate(W/2-cx,H/2-cy);
    const visible=o=>Math.abs(o.x-cx)<W/2+100&&Math.abs(o.y-cy)<H/2+100;
    drawLeapGuide();
    for(const w of run.wards){ctx.save();ctx.globalAlpha=Math.min(1,w.life/.22);circle(w.x,w.y,w.r,w.combo?'#77eed410':'#77eed409',w.combo?'#93eed488':'#93eed455',w.combo?2.5:1);circle(w.x,w.y,w.r*(1-.12*w.life/w.max),null,'#b9f9dd44',2);
      if(w.combo){const birth=clamp((w.max-w.life)/.28,0,1);ctx.globalAlpha=(1-birth)*.65;circle(w.x,w.y,w.r*birth,null,'#c6fff0',3);}
      ctx.restore();}
    for(const q of run.seedLinks){ctx.save();ctx.globalAlpha=q.life/.3;line(q.ax,q.ay,q.bx,q.by,q.kind==='spread'?'#ffba7c':'#94dfce',q.kind==='spread'?2.5:1.5);circle(q.bx,q.by,6,null,q.kind==='spread'?'#ffd69b':'#94dfce',1);ctx.restore();}
    drawStitches();
    for(const h of run.hazards){circle(h.x,h.y,h.r,'#ff5b5218','#fc796880',2);if(h.timer>0){circle(h.x,h.y,h.r*(1-h.timer/1.15),null,'#ff9e86',2);line(h.x-12,h.y,h.x+12,h.y,'#ff8e76',2);line(h.x,h.y-12,h.x,h.y+12,'#ff8e76',2);}else circle(h.x,h.y,h.r*clamp(h.life/.45,0,1),'#ff986333');}
    for(const o of run.orbs){if(!visible(o))continue;polygon(o.x,o.y,o.value>5?7:4,4,Math.PI/4,'#8ac9c5');}
    for(const h of run.pickups){if(!visible(h))continue;circle(h.x,h.y,12,'#264c44','#84e2b4',1);line(h.x-5,h.y,h.x+5,h.y,'#b5f7d3',3);line(h.x,h.y-5,h.x,h.y+5,'#b5f7d3',3);}
    for(const e of run.enemies)if(visible(e))drawEnemy(e);
    for(const b of run.bullets){line(b.x-b.vx*.009,b.y-b.vy*.009,b.x,b.y,b.fork?'#94dfce':'#8caaa7',b.fork?2:1.5);circle(b.x,b.y,b.fork?2.5:1.5,b.fork?'#c4f8df':'#bdd0c6');}
    for(const b of run.hostile){circle(b.x,b.y,b.r+3,'#ff71822a');circle(b.x,b.y,b.r,'#e98694');circle(b.x,b.y,2,'#ffe6d7');}
    drawStitchImpacts(true);
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
  function liveBoss() { return run.enemies.some(e=>!e.dead&&(e.type==='elite'||e.type==='boss')); }
  const DEBUG_BATCH_LIMIT=25, DEBUG_ENEMY_LIMIT=100;
  function debugReason() {
    if(!run)return 'debug.noRun';
    if(run.ended)return 'debug.ended';
    if(run.pending>0||state==='upgrade')return 'debug.pending';
    if(state!=='debug')return 'debug.pauseFirst';
    return null;
  }
  function debugSnapshot() {
    const p=run?.player;
    return {open:state==='debug',canOpen:!!run&&!run.ended&&['playing','paused'].includes(state),reason:debugReason(),time:timeText(run?.time||0),invincible:debugInvincible,
      batchLimit:DEBUG_BATCH_LIMIT,enemyLimit:DEBUG_ENEMY_LIMIT,
      enemies:Object.keys(TYPES).filter(id=>!['elite','boss'].includes(id)),bosses:['elite','boss'],
      upgrades:UPGRADES.map(u=>{const rank=p?.upgrades[u.id]||0;
        const reason=!p?null:rank>=u.max?'debug.max':u.excludes&&p.upgrades[u.excludes]?'debug.excludes':!eligible(u,p)?'debug.requires':null;
        return {id:u.id,name:u.name,rank,max:u.max,desc:u.desc,effect:u.stages[rank]||u.gain,reason,params:{name:UPGRADES.find(v=>v.id===u.excludes)?.name||''}};
      })};
  }
  function clearDebugInput() {keys.clear();mouse.down=false;if(run)run.leapRequested=false;last=performance.now();}
  function openDebug() {
    if(!debugEnabled||!run||run.ended||!['playing','paused'].includes(state))return;
    clearDebugInput();state='debug';screen(null);$('debugUpgrade').focus?.({preventScroll:true});$('debugPanel').querySelector?.('.debug-panel')?.scrollTo(0,0);
  }
  function closeDebug() {
    if(!debugEnabled||state!=='debug')return;
    clearDebugInput();state='paused';screen('pause');$('resumeButton').focus?.();
  }
  function debugAct(action,value) {
    if(!debugEnabled)return {key:'debug.disabled'};
    const reason=debugReason();if(reason)return {key:reason};
    const invalid=()=>({key:'debug.invalid'});
    if(action==='grant') {
      const u=UPGRADES.find(u=>u.id===value);if(!u)return invalid();
      const rule=debugSnapshot().upgrades.find(v=>v.id===value);if(rule.reason)return {key:rule.reason,params:rule.params};
      grantUpgrade(u);updateBuild();updateHud();
    } else if(action==='advance') {
      const seconds=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
      if(!Number.isFinite(seconds)||seconds<=0)return invalid();
      if(run.time>=END_TIME)return {key:'debug.timeMax'};
      run.time=Math.min(END_TIME,run.time+seconds);updateHud();
    } else if(action==='boss') {
      if(!['elite','boss'].includes(value))return invalid();
      if(liveBoss())return {key:'debug.bossAlive'};
      if(run.finalSpawned)return {key:'debug.finalStarted'};
      if(value==='boss')spawnFinalBoss();
      else {
        // A manual guardian occupies the next scheduled slot; time itself is unchanged.
        run.eliteWave=Math.max(run.eliteWave,Math.min(3,Math.floor(run.time/180)+1));
        const p=run.player;spawnEnemy('elite',clamp(p.x+220,-HALF+60,HALF-60),clamp(p.y-120,-HALF+60,HALF-60));announce(t('notice.guardian'),4);
      }
      updateHud();
    } else if(action==='enemy') {
      if(!value||!Object.hasOwn(TYPES,value.type)||['elite','boss'].includes(value.type))return invalid();
      const count=typeof value.count==='number'?value.count:typeof value.count==='string'&&value.count.trim()?Number(value.count):NaN;
      if(!Number.isInteger(count)||count<1||count>DEBUG_BATCH_LIMIT)return invalid();
      if(run.enemies.filter(e=>!e.dead).length+count>DEBUG_ENEMY_LIMIT)return {key:'debug.enemyMax',params:{total:DEBUG_ENEMY_LIMIT}};
      const p=run.player,margin=TYPES[value.type].r+8;
      for(let i=0;i<count;i++){const angle=i/count*TAU+p.aim,radius=160+(i%3)*35;spawnEnemy(value.type,clamp(p.x+Math.cos(angle)*radius,-HALF+margin,HALF-margin),clamp(p.y+Math.sin(angle)*radius,-HALF+margin,HALF-margin));}
    } else if(action==='invincible')debugInvincible=!debugInvincible;
    else return invalid();
    debugUI?.refresh();return {key:'debug.applied'};
  }
  if(debugEnabled)debugUI=globalThis.AshfallDebugUI.create({snapshot:debugSnapshot,open:openDebug,close:closeDebug,act:debugAct});
  globalThis.AshfallInput.install({canvas,keys,mouse,getState:()=>state,getRun:()=>run,pause,chooseUpgrade,toggleSound,initAudio,announce,
    closeOverlay(){state=state==='relics'?'title':run?'paused':'title';screen(state==='paused'?'pause':'title');},resetClock(){last=performance.now();},updateFullscreenLabels});
  $('startButton').onclick=start;$('restartButton').onclick=start;$('titleButton').onclick=goTitle;$('quitButton').onclick=goTitle;
  $('pauseButton').onclick=pause;$('resumeButton').onclick=resume;$('soundButton').onclick=toggleSound;$('pauseSound').onclick=toggleSound;
  $('helpButton').onclick=$('pauseHelp').onclick=()=>{state='help';screen('help');};$('closeHelp').onclick=()=>{state=run?'paused':'title';screen(run?'pause':'title');};
  $('fullscreenButton').onclick=$('pauseFullscreen').onclick=toggleFullscreen;
  $('relicButton').onclick=showRelics;$('closeRelics').onclick=()=>{state='title';screen('title');};
  $('versionLabel').textContent=`v${globalThis.AshfallRelease.version}`;
  $('languageJa').onclick=()=>globalThis.AshfallI18n.setLanguage('ja');$('languageEn').onclick=()=>globalThis.AshfallI18n.setLanguage('en');
  globalThis.AshfallI18n.subscribe(()=>{ui.refresh();debugUI?.refresh();});
  titleRecord();ui.refresh();requestAnimationFrame(loop);
  // Explicit test mode exposes mechanics for deterministic verification, never used in normal play.
  if(new URLSearchParams(location.search).has('test'))window.AshfallTest={
    debug:debugEnabled?{open:openDebug,close:closeDebug,act:debugAct,snapshot:debugSnapshot}:undefined,
    start,update,spawnEnemy,hurtEnemy,hurtPlayer,startDash,endDash,seedEnemy,predictLeap,stitchDamage,addXp,chooseUpgrade,rollUpgrades,finish,goTitle,pause,resume,
    segmentDistance,UPGRADES,TYPES,keys,mouse,drawGame,drawTitle,updateHud,wardSpec,denseSpec,pressureMultiplier,lineDamage,feedbackSpec,blastSound,stitchNodeSound,frontCrossing,weight,eligible,scatterShards,assistedAngle,showRelics,selectRelic,showStitchHelp,upgradeCard,
    get run(){return run;},get state(){return state;},get meta(){return meta;},get audioState(){return sfx.state;},seed(v){seed=v||1;},
    step(seconds){for(let t=0;t<seconds;t+=1/60)update(Math.min(1/60,seconds-t));},
    apply(id){const u=UPGRADES.find(u=>u.id===id);if(!u)throw new Error(id);u.apply(run.player);run.player.upgrades[id]=(run.player.upgrades[id]||0)+1;updateBuild();updateHud();}
  };
})();
