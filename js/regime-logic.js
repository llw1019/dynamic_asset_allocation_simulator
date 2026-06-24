// Regime detection, target weighting, and bear-trigger logic
// Regime
function getRegime(){
  if(inExtremeBear)return'extremeBear';
  const{trend,vix}=S;
  if(trend==='below')return'bear';
  if(vix==='high'&&trend!=='above')return'bear';
  if(trend==='above'&&vix==='low')return'bull';
  return'range';
}
function calcTarget(regime){
  const base={...REGIME_WEIGHTS[regime]};
  const mod=RATE_MODIFIER[S.rate]||{};
  const protectedBear=regime==='bear'||regime==='extremeBear';
  Object.entries(mod).forEach(([k,d])=>{
    if(base[k]===undefined)return;
    // Falling rates are only treated as constructive in bull regimes; otherwise keep cash and hedge unchanged.
    if(S.rate==='falling'&&regime!=='bull')return;
    if(protectedBear&&k==='cash'&&d<0)return;
    base[k]=Math.max(0,base[k]+d);
  });
  let sum=Object.values(base).reduce((a,b)=>a+b,0);
  if(protectedBear&&sum>100){
    let excess=sum-100;
    ['hedge','alpha','defense'].forEach(k=>{
      if(excess<=0)return;
      const cut=Math.min(base[k],excess);
      base[k]-=cut;excess-=cut;
    });
  }
  sum=Object.values(base).reduce((a,b)=>a+b,0);
  if(sum!==100)base.cash=Math.max(0,base.cash+(100-sum));
  if(protectedBear&&base.cash<CONFIG.minCashBear){
    let need=CONFIG.minCashBear-base.cash;
    base.cash=CONFIG.minCashBear;
    ['hedge','alpha','defense'].forEach(k=>{
      if(need<=0)return;
      const cut=Math.min(base[k],need);
      base[k]-=cut;need-=cut;
    });
  }
  // Final normalization safety net
  const finalSum=Object.values(base).reduce((a,b)=>a+b,0);
  if(finalSum!==100)base.cash=Math.max(0,base.cash+(100-finalSum));
  return base;
}
function getBearTrigger(){
  const v=S.vixVal;
  const cfg=getVixConfig(),name=getVixName();
  if(inExtremeBear&&v!==null&&v>cfg.extremeExit)return{label:`極端恐慌 ${name} ${fPct(v)}，需 < ${cfg.extremeExit} 才解除`,cls:'trigger-extreme'};
  if(inExtremeBear)return{label:'極端恐慌 Hysteresis 鎖定中',cls:'trigger-extreme'};
  if(S.trend==='below'&&S.vix==='high')return{label:`跌破季線 + ${name} > ${cfg.high}`,cls:'trigger-both'};
  if(S.trend!=='below'&&S.vix==='high')return{label:`${name} > ${cfg.high} 觸發`,cls:'trigger-vix'};
  if(S.trend==='below'&&S.vix!=='high')return{label:'跌破季線觸發',cls:'trigger-trend'};
  return null;
}
