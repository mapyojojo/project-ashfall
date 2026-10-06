/* Developer presentation. The game supplies all catalogs, rules and mutations. */
(() => {
  'use strict';
  function create({snapshot,open,close,act}) {
    const $=id=>document.getElementById(id),{t}=globalThis.AshfallI18n;
    let message=null;
    const text=(id,key,params)=>$(id).textContent=t(key,params);
    function refresh() {
      const s=snapshot();
      $('debugBadge').hidden=false;
      text('debugBadge','debug.badge',{status:s.invincible?'ON':'OFF'});
      $('debugOpen').hidden=false;
      $('debugOpen').disabled=!s.canOpen;
      text('debugOpen','debug.open');
      text('debugAvailability',s.reason||'debug.session');
      $('debugPanel').hidden=!s.open;
      if(!s.open)return;
      for(const id of ['debugGrant','debugAdvance','debugBossSpawn','debugEnemySpawn','debugInvincible'])$(id).disabled=!!s.reason;
      text('debugTitle','debug.title');text('debugClose','debug.close');
      text('debugTime','debug.time',{time:s.time});
      text('debugInvincible','debug.invincible',{status:s.invincible?'ON':'OFF'});
      for(const [id,key] of [['debugUpgradeLabel','debug.upgrade'],['debugSecondsLabel','debug.seconds'],['debugBossLabel','debug.boss'],['debugEnemyLabel','debug.enemy'],['debugCountLabel','debug.count'],['debugGrant','debug.grant'],['debugAdvance','debug.advance'],['debugBossSpawn','debug.spawn'],['debugEnemySpawn','debug.spawn'],['debugTimeHelp','debug.timeHelp'],['debugSessionHelp','debug.session']])text(id,key);
      // Retain selections across locale refreshes. No action or RNG occurs here.
      function options(id,values) {
        const el=$(id),selected=el.value;
        el.replaceChildren(...values.map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));
        if(values.some(([value])=>value===selected))el.value=selected;
      }
      options('debugUpgrade',s.upgrades.map(u=>[u.id,`${u.name} (${u.rank}/${u.max})`]));
      options('debugBoss',s.bosses.map(id=>[id,t('debug.enemy.'+id)]));
      options('debugEnemy',s.enemies.map(id=>[id,t('debug.enemy.'+id)]));
      $('debugCount').max=s.batchLimit;
      const u=s.upgrades.find(u=>u.id===$('debugUpgrade').value);
      $('debugUpgradeDetail').textContent=u?`${u.desc} ${u.effect} ${u.reason?t(u.reason,u.params):''}`:'';
      $('debugGrant').disabled=!!s.reason||!!u?.reason;
      text('debugLimits','debug.limits',{batch:s.batchLimit,total:s.enemyLimit});
      $('debugMessage').textContent=message?t(message.key,message.params):s.reason?t(s.reason):'';
    }
    $('debugOpen').onclick=()=>{message=null;open();};
    $('debugClose').onclick=close;
    $('debugUpgrade').onchange=refresh;
    for(const [id,action,args] of [
      ['debugGrant','grant',()=>$('debugUpgrade').value],
      ['debugAdvance','advance',()=>$('debugSeconds').value],
      ['debugBossSpawn','boss',()=>$('debugBoss').value],
      ['debugEnemySpawn','enemy',()=>({type:$('debugEnemy').value,count:$('debugCount').value})],
      ['debugInvincible','invincible',()=>null]
    ])$(id).onclick=()=>{message=act(action,args());refresh();};
    $('debugPanel').addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.repeat&&e.target.tagName==='BUTTON'&&['Enter','Space'].includes(e.code))e.preventDefault();
      if(e.code==='Escape'&&!e.repeat&&!document.fullscreenElement){e.preventDefault();close();}
      if(e.code==='Tab'){
        const fields=Array.from($('debugPanel').querySelectorAll('button:not(:disabled),input,select'));
        const first=fields[0],last=fields[fields.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
    $('debugPanel').addEventListener('keyup',e=>e.stopPropagation());
    return {refresh};
  }
  globalThis.AshfallDebugUI={create};
})();
