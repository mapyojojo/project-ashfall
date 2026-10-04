/* Array positions are part of ashfall.v1 save compatibility. */
(() => {
  'use strict';
  const {t}=globalThis.AshfallI18n;
  const relics = [
    { id: 'traveler', need: 0, apply: p => { p.maxHp += 10; p.hp += 10; } },
    { id: 'needle', need: 5, apply: p => { p.collectWidth += 6;p.wardBoost+=20; } },
    // Reserve the old satellite index so saved equipment 3 never changes identity.
    { retired: true },
    { id: 'barrel', need: 25, apply: p => { p.shots++; p.fireRate *= 1.12; } }
  ];
  for(const r of relics)if(!r.retired)for(const field of ['name','detail']){r[field+'Key']='relic.'+r.id+'.'+field;Object.defineProperty(r,field,{enumerable:true,get:()=>t(r[field+'Key'])});}
  globalThis.AshfallRelics={relics};
})();
