/* Input event ordering and repeat/fullscreen semantics match v0.7.1. */
(() => {
  'use strict';
  function install({canvas,keys,mouse,getState,getRun,pause,chooseUpgrade,toggleSound,initAudio,announce,closeOverlay,resetClock,updateFullscreenLabels}) {
  const {t}=globalThis.AshfallI18n;
  let fullscreenActive=!!document.fullscreenElement;
  const playingKeyCodes=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyF','KeyP','Digit1','Digit2','Digit3']);
  addEventListener('keydown',e=>{
    if(playingKeyCodes.has(e.code))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='KeyM'){toggleSound();return;}
    if(e.code==='Escape'||e.code==='KeyP'){
      if(e.code==='Escape'&&document.fullscreenElement)return;
      if(getState()==='relics'||getState()==='help')closeOverlay();
      // Escape pauses but never resumes, including after the browser exits fullscreen.
      else if(e.code==='KeyP'||getState()==='playing')pause();
      return;
    }
    if(getState()==='upgrade'&&['Digit1','Digit2','Digit3'].includes(e.code)){chooseUpgrade(Number(e.code.slice(-1))-1);return;}
    if(getState()==='playing'){keys.add(e.code);if(e.code==='Space')getRun().leapRequested=true;if(e.code==='KeyF'){getRun().player.autoFire=!getRun().player.autoFire;announce(t('notice.autoFire',{status:getRun().player.autoFire?'ON':'OFF'}),1.5);}}
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;});
  canvas.addEventListener('mousedown',e=>{if(e.button===0&&getState()==='playing'){mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;getRun().leapRequested=true;initAudio();}});
  addEventListener('mouseup',()=>{mouse.down=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('blur',()=>{keys.clear();mouse.down=false;if(getState()==='playing')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&getState()==='playing')pause();resetClock();});
  document.addEventListener('fullscreenchange',()=>{
    const active = !!document.fullscreenElement;
    if(fullscreenActive&&!active&&getState()==='playing')pause();
    fullscreenActive=active;updateFullscreenLabels();
  });

  }
  globalThis.AshfallInput={install};
})();
