/* Combat catalog: stable IDs, effects and weights; display getters resolve the active locale. */
(() => {
  'use strict';
  const {t}=globalThis.AshfallI18n;
  const families=Object.fromEntries(['spread','dense','flow','common'].map(id=>[id,null]));
  for(const id of Object.keys(families))Object.defineProperty(families,id,{enumerable:true,get:()=>t('family.'+id)});
  function display(u) {
    for (const field of ['name','cat','desc','gain']) { u[field+'Key']='upgrade.'+u.id+'.'+field; Object.defineProperty(u,field,{enumerable:true,get:()=>t(u[field+'Key'])}); }
    Object.defineProperty(u,'stages',{enumerable:true,get:()=>Array.from({length:u.max<=3?u.max:0},(_,i)=>t('upgrade.'+u.id+'.stage.'+(i+1)))});
    return u;
  }
  const definitions=[
    ['scatter','spread',3,p=>{p.shots+=2;p.spread+=.025;}],
    ['pierce','spread',3,p=>{p.pierce+=2;p.bulletSpeed*=1.08;}],
    ['ricochet','spread',3,p=>p.bounce++],
    ['propagation','spread',3,()=>{}],
    ['width','spread',3,p=>{p.dashDistance+=40;p.collectWidth+=6;p.stitchWidth+=14;}],
    ['ward','spread',2,p=>{p.wardBoost+=25;p.wardDuration+=.15;}],
    ['shards','spread',2,()=>{}],
    ['rapid','dense',3,p=>p.fireRate*=.82],
    ['heavy','dense',3,p=>{p.ashPerHit++;p.ashCap+=2;}],
    ['frost','dense',2,p=>p.stitchSlow+=1.4],
    ['echo','dense',2,p=>p.stitchEcho++],
    ['dense','dense',3,()=>{}],
    ['pressure','dense',3,()=>{}],
    ['point','dense',2,()=>{}],
    ['quick','flow',3,p=>{p.dashCd*=.86;p.speed*=1.04;}],
    ['fast','flow',2,()=>{}],
    ['short','flow',2,p=>{const next=(p.upgrades.short||0)+1;p.dashDistance*=next===1?.8:.65/.8;p.dashCd*=next===1?.75:.6/.75;p.dashDuration=next===1?.14:.12;}],
    ['chain','flow',2,()=>{}],
    ['regen','flow',2,p=>p.regen+=.5],
    ['heal','common',2,p=>p.stitchHeal+=4],
    ['vital','common',3,p=>{p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+30);}],
    ['magnet','common',2,p=>{p.magnet+=60;p.speed*=1.04;}]
  ];
  const UPGRADES=definitions.map(([id,family,max,apply])=>display({id,family,max,apply}));
  const byId = id => UPGRADES.find(u=>u.id===id);
  byId('width').excludes='short';byId('short').excludes='width';
  byId('chain').requires=p=>!!p.upgrades.quick;
  const eligible = (u,p) => !(u.excludes&&p.upgrades[u.excludes])&&(!u.requires||u.requires(p));
  UPGRADES.push(display({id:'ember',family:'common',max:999,requires:p=>UPGRADES.filter(u=>u.id!=='ember'&&eligible(u,p)).every(u=>(p.upgrades[u.id]||0)>=u.max),apply:p=>{p.stitchPower*=1.08;p.hp=Math.min(p.maxHp,p.hp+20);}}));
  function weight(u,p) {
    if(u.family==='common')return 1;
    const ranks=UPGRADES.filter(v=>v.family===u.family).reduce((n,v)=>n+(p.upgrades[v.id]||0),0);
    return 1+Math.min(.25,ranks*.05);
  }
  function synergyNote(id,p) {
    if(id==='ricochet'&&p.pierce)return t('synergy.ricochet');
    if(id==='pierce'&&p.bounce)return t('synergy.pierce');
    if(id==='propagation'&&(p.shots>1||p.pierce||p.bounce))return t('synergy.propagation');
    if(id==='heavy'&&(p.upgrades.dense||p.upgrades.pressure||p.upgrades.point))return t('synergy.heavy');
    if(['dense','pressure','point'].includes(id)&&p.upgrades.heavy)return t('synergy.focus');
    if(id==='quick'&&(p.shots>1||p.pierce||p.upgrades.propagation))return t('synergy.quick');
    if(id==='shards'&&p.upgrades.quick)return t('synergy.shards');
    if(id==='chain')return t('synergy.chain');
    if(id==='echo'&&p.upgrades.quick)return t('synergy.echo');
    if(id==='heal'&&(p.upgrades.quick||p.upgrades.dense))return t('synergy.heal');
    if(id==='fast'&&p.upgrades.short)return t('synergy.fast');
    return '';
  }
  globalThis.AshfallUpgrades={UPGRADES,families,eligible,weight,synergyNote};
})();
