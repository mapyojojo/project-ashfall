// Expand only the explicitly extracted player-copy expressions for source parity.
// No number, operator, condition, RNG call or other combat code is normalized.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../i18n/ja.js'),'utf8'),sandbox);
function combatSource(fn){
  return fn.toString()
    .replace("t('notice.densePower',{bonus:dense.multiplier>1?t('notice.powerBonus',{percent:Math.round((dense.multiplier-1)*100)}):''})","`密縫い${dense.multiplier>1?' · 威力 +'+Math.round((dense.multiplier-1)*100)+'%':''}`")
    .replace(/\bt\('([^']+)'\)/g,(match,key)=>{
      const text=sandbox.AshfallLocales.ja[key];
      if(typeof text!=='string')throw Error('Unknown translation '+key);
      return "'"+text.replaceAll('\\','\\\\').replaceAll("'","\\'")+"'";
    });
}
module.exports={combatSource};
