/* DOM presentation only. Gameplay owns transitions, rolls, awards and meta validation. */
(() => {
  'use strict';
  function create({getRun,getMeta,sfx,clamp,timeText,introBlocked,showStitchHelp,predictLeap,denseSpec,selectRelic,chooseUpgrade}) {
    const $=id=>document.getElementById(id),{t,getLanguage}=globalThis.AshfallI18n;
    const {UPGRADES,families,synergyNote:catalogSynergy}=globalThis.AshfallUpgrades,{relics}=globalThis.AshfallRelics;
    let run,meta,lastResult=null;
    const sync=()=>{run=getRun();meta=getMeta();};
    const synergyNote=id=>catalogSynergy(id,run.player);
  function screen(id) { ['title','help','relics','upgrade','pause','result'].forEach(s => { $(s).hidden = s !== id; }); $('hud').hidden = !run || id === 'title' || (id === 'help' && !run); }
  function renderRelics() {
    $('relicMarks').textContent=t('relic.marks',{marks:meta.marks});
    $('relicChoices').innerHTML=relics.map((r,i)=>{if(r.retired)return '';const unlocked=meta.marks>=r.need;return `<button class="relic-card ${i===meta.relic?'selected':''}" data-relic="${i}" aria-pressed="${i===meta.relic}" ${unlocked?'':'disabled'}><b>${r.name}</b><p>${r.detail}</p><span>${!unlocked?t('relic.locked',{need:r.need}):i===meta.relic?t('relic.selected'):t('relic.unlocked')}</span></button>`;}).join('');
    $('relicChoices').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectRelic(Number(b.dataset.relic))));
  }
  function upgradeCard(u,index) {
    const current=run.player.upgrades[u.id]||0,next=current+1;
    const stages=u.max<=3?u.stages.map((detail,i)=>{
      const level=i+1,status=level<=current?'owned':level===next?'next':'locked',label=status==='owned'?t('upgrade.owned'):status==='next'?t('upgrade.next'):t('upgrade.locked');
      return `<span class="upgrade-stage ${status}" data-level="${level}" data-status="${status}"><span class="stage-label">Lv${level} · ${label}</span><span class="stage-detail">${detail}</span></span>`;
    }).join(''):`<span class="upgrade-stage next"><span class="stage-label">${t('upgrade.take')}</span><span class="stage-detail">${t('upgrade.ember.effect')}</span></span>`;
    return `<button class="upgrade-card" data-card="${index}" data-current="${current}" data-next="${next}"><span class="family-tag ${u.family}">${families[u.family]}</span><span class="category">${u.cat}</span><span class="number">0${index+1}</span><h3>${u.name}</h3><span class="rank">${t('upgrade.current',{level:current})} → <b>${t('upgrade.after',{level:next})}</b></span><p>${u.desc}</p><span class="upgrade-stages" aria-label="${t('upgrade.stagesAria')}">${stages}</span>${u.excludes?`<small class="upgrade-rule">${t('upgrade.excludes',{name:UPGRADES.find(v=>v.id===u.excludes).name})}</small>`:''}${synergyNote(u.id)?`<small class="synergy-note">${synergyNote(u.id)}</small>`:''}</button>`;
  }
  function buildChips() {return Object.entries(run.player.upgrades).map(([id,n])=>{const u=UPGRADES.find(u=>u.id===id);return `<span class="chip ${u.family}"><span class="family-label">${families[u.family]}</span>${u.name} ${n}</span>`;}).join('');}
  function updateBuild() { $('buildChips').innerHTML=buildChips(); }
  function updateHud() {
    const p=run.player;
    $('hpText').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('hpBar').style.width=`${p.hp/p.maxHp*100}%`;
    $('xpBar').style.width=`${p.xp/p.xpNeed*100}%`;$('levelText').textContent=`LV ${p.level}`;
    $('timeText').textContent=timeText(run.time);$('phaseText').textContent=run.finalSpawned?t('hud.phase.furnace'):run.time<240?t('hud.phase.garden'):run.time<480?t('hud.phase.hall'):t('hud.phase.road');
    $('dashBar').style.width=`${introBlocked()?0:p.bonusStitch?100:clamp(1-p.dashTimer/p.dashCycle,0,1)*100}%`;$('dashText').textContent=introBlocked()?t('hud.priming'):p.bonusStitch?(p.bonusStitch.depth===2?t('term.chain'):t('term.return')):p.dashTimer<=0?'READY':`${p.dashTimer.toFixed(1)}s`;
    $('killText').textContent=run.kills;$('announcement').style.opacity=clamp(run.announceTimer,0,1);
    const preview=predictLeap();
    $('primeText').textContent=t('hud.autoFire',{status:p.autoFire?'ON':'OFF'});
    const dense=denseSpec(preview.targets,preview.ash),bonus=p.bonusStitch;
    $('routeText').textContent=bonus?(bonus.depth===2?t('hud.chain'):t('hud.return')):preview.targets>=3?t('hud.triple'):dense.success?t('hud.dense'):preview.ash?t('hud.marks',{targets:preview.targets,ash:preview.ash}):t('hud.route');$('routeText').dataset.combo=String(preview.targets>=3);
    const lesson=run.onboarding;
    $('coach').hidden=!showStitchHelp();$('routeText').hidden=!showStitchHelp();
    $('coach').dataset.stage=String(lesson.stage);
    $('coachHint').textContent=lesson.stage===0?(run.time<1.6?t('coach.opening'):t('coach.prime')):lesson.stage===1?t('coach.collect'):t('coach.repeat');
    const boss=run.boss&&!run.boss.dead?run.boss:null;$('bossHud').hidden=!boss;
    if(boss){$('bossName').textContent=boss.type==='boss'?t('hud.boss'):t('hud.guardian');$('bossHp').textContent=`${Math.ceil(boss.hp/boss.maxHp*100)}%`;$('bossBar').style.width=`${boss.hp/boss.maxHp*100}%`;}
  }
  function updateSoundLabels() { $('soundButton').textContent = t('ui.sound',{status:sfx.enabled?'ON':'OFF'}); $('pauseSound').textContent = t('ui.soundKey',{status:sfx.enabled?'ON':'OFF'}); }
  function updateFullscreenLabels() {
    const label = document.fullscreenElement ? t('ui.fullscreenOff') : t('ui.fullscreenOn');
    $('fullscreenButton').textContent = $('pauseFullscreen').textContent = label;
  }
  function titleRecord() {
    const next = relics.find(r => !r.retired && r.need > meta.marks);
    $('recordText').textContent = meta.runs ? t('title.record',{marks:meta.marks,best:timeText(meta.best),wins:meta.wins,next:next?t('title.nextUnlock',{need:next.need,name:next.name}):t('title.allUnlocked')}) : t('title.runLength');
    $('relicButton').textContent = t('title.loadout',{name:relics[meta.relic].name});
  }
  function renderResult(data) {
    lastResult=data; const {win,marks,before}=data;
    $('resultEyebrow').textContent = win ? 'THE FURNACE FALLS SILENT' : 'THE FIRE FADES';
    $('resultTitle').textContent = win ? t('result.winTitle') : t('result.lossTitle');
    $('resultCopy').textContent = win ? t('result.winCopy') : t('result.lossCopy');
    $('resultCopy').textContent += t('result.survival',{time:timeText(run.time)});
    $('resultStats').innerHTML = `<div><strong>${run.maxStitchTargets}<small>${t('unit.foes')}</small></strong><span>${t('result.maxStitchTargets.name')}</span><small>${t('result.maxStitchTargets.detail')}</small></div><div><strong>${run.comboLeaps}<small>${t('unit.times')}</small></strong><span>${t('result.comboLeaps.name')}</span><small>${t('result.comboLeaps.detail')}</small></div><div><strong>${run.bonusLeaps}<small>${t('unit.times')}</small></strong><span>${t('result.bonusLeaps.name')}</span><small>${t('result.bonusLeaps.detail')}</small></div><div><strong>${run.bulletsCleared}<small>${t('unit.bullets')}</small></strong><span>${t('result.bulletsCleared.name')}</span><small>${t('result.bulletsCleared.detail')}</small></div>`;
    $('resultBuild').innerHTML = `<div class="build-summary"><p>${t('result.stitches',{dense:run.denseLeaps,chain:run.chainLeaps})}</p><small>${t('result.denseDetail')}<br>${t('result.chainDetail')}</small></div>`+(buildChips() || `<span class="chip">${t('result.noUpgrades')}</span>`);
    const unlocked = relics.filter(r => !r.retired && r.need > before && r.need <= meta.marks);
    $('metaText').textContent = t('result.sigils',{marks,total:meta.marks,unlocked:unlocked.map(r=>t('result.unlock',{name:r.name})).join(' ')});
  }
  function renderUpgrades() { const p=run.player;
    $('upgradeSub').textContent = t('upgrade.summary',{level:p.level,hp:Math.ceil(p.hp),maxHp:p.maxHp});
    $('upgradeCards').innerHTML = run.cards.map(upgradeCard).join('');
    $('upgradeCards').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>chooseUpgrade(Number(b.dataset.card))));
  }
    function translateStatic(){
      if(document.documentElement)document.documentElement.lang=getLanguage();
      for(const [attribute,target] of [['data-i18n','textContent'],['data-i18n-html','innerHTML'],['data-i18n-title','title'],['data-i18n-aria','aria-label']])
        for(const el of document.querySelectorAll?.('['+attribute+']')||[]){const value=t(el.getAttribute(attribute));if(target==='aria-label')el.setAttribute(target,value);else el[target]=value;}
      for(const [id,language] of [['languageJa','ja'],['languageEn','en']])$(id).setAttribute?.('aria-pressed',String(getLanguage()===language));
    }
    function refresh(){sync();translateStatic();titleRecord();renderRelics();updateSoundLabels();updateFullscreenLabels();if(run){updateBuild();updateHud();if(lastResult&&run.ended)renderResult(lastResult);if(run.cards.length)renderUpgrades();}}
    return {refresh,screen:(...args)=>{sync();return screen(...args);},renderRelics:(...args)=>{sync();return renderRelics(...args);},upgradeCard:(...args)=>{sync();return upgradeCard(...args);},buildChips:(...args)=>{sync();return buildChips(...args);},updateBuild:(...args)=>{sync();return updateBuild(...args);},updateHud:(...args)=>{sync();return updateHud(...args);},titleRecord:(...args)=>{sync();return titleRecord(...args);},renderResult:(...args)=>{sync();return renderResult(...args);},renderUpgrades:(...args)=>{sync();return renderUpgrades(...args);},updateSoundLabels:(...args)=>{sync();return updateSoundLabels(...args);},updateFullscreenLabels:(...args)=>{sync();return updateFullscreenLabels(...args);}};
  }
  globalThis.AshfallUI={create};
})();
