// Regime metadata and action/memo/cash-deploy text builders (presentation)
const REGIME_META={
  bull: {label:'成長牛市 Risk-on', sub:'進攻模式，動態層擴張', bannerCls:'regime-bull',  dotColor:'var(--color-icon-ok)'},
  bear: {label:'緊縮熊市 Risk-off',sub:'防禦模式，收縮戰線',   bannerCls:'regime-bear',  dotColor:'var(--color-danger-accent)'},
  range:{label:'盤整震盪 Range',   sub:'均衡模式，執行再平衡', bannerCls:'regime-range', dotColor:'var(--color-icon-warn)'}
};
REGIME_META.extremeBear={label:'極端熊市 Extreme Risk-off',sub:'極端恐慌鎖定，Alpha 歸零並提高現金',bannerCls:'regime-bear',dotColor:'var(--color-danger-extreme)'};
function isRateActive(regime,key,rate){
  if(key!=='hedge'&&key!=='cash')return false;
  if(rate==='stable')return false;
  if(rate==='falling'&&regime!=='bull')return false;
  return true;
}
function getActionIcon(targetVal,rangeVal){
  if(targetVal>rangeVal)return'ti-arrow-up';
  if(targetVal<rangeVal)return'ti-arrow-down';
  return'ti-equal';
}
function getActionBody(regime,key,target,rate){
  const t=target[key],r=REGIME_WEIGHTS.range[key],ra=isRateActive(regime,key,rate);
  if(key==='alpha'){
    if(t===0)return'暫不承擔高波動敞口';
    if(t>r)return'擴張衛星追蹤機會';
    if(t<r)return'降低高風險敞口';
    return'維持均衡';
  }
  if(key==='defense'){
    if(t>r)return'強化緩衝';
    if(t<r)return'釋放保守配置';
    return'維持均衡';
  }
  if(key==='hedge'){
    if(t===0)return'升息壓抑至零';
    if(t>r)return ra?'降息提升避險權重':'提升逆週期對沖';
    if(t<r)return ra?'升息壓抑債券配置':'降低對沖成本';
    return ra?'利率抵消回歸均衡':'維持均衡';
  }
  if(key==='cash'){
    if(t>r){
      if(ra)return'升息增配現金防線';
      return regime==='bull'?'保留機動性':'建立防線';
    }
    if(t<r)return ra?'降息釋放現金至避險':'壓縮現金';
    return ra?'利率抵消回歸均衡':'維持均衡';
  }
  return'';
}
function getActionItems(regime,target,rate){
  const range=REGIME_WEIGHTS.range;
  const DYN_KEYS=['alpha','defense','hedge','cash'];
  const DYN_LABELS=DYN_KEYS.reduce((o,k)=>({...o,[k]:LABELS[k]}),{});
  if(regime==='range'){
    const rateNote=isRateActive('range','hedge',rate)?` · ${rate==='rising'?'升息':'降息'} Modifier`:'';
    return[
      {icon:rateNote?'ti-arrows-sort':'ti-equal',text:`<strong>動態層</strong>：Alpha ${target.alpha}% / Defense ${target.defense}% / Hedge ${target.hedge}% / Cash ${target.cash}%${rateNote}`},
      {icon:'ti-refresh',text:'依再平衡表處理偏離，不因盤整反覆追價或殺低'},
      {icon:'ti-lock',text:'<strong>內核 Beta / 外核 Global</strong> 固定不動，核心配置維持紀律'}
    ];
  }
  const items=DYN_KEYS.map(key=>{
    const icon=getActionIcon(target[key],range[key]);
    const body=getActionBody(regime,key,target,rate);
    const hint=isRateActive(regime,key,rate)?(rate==='rising'?' · 升息':' · 降息'):'';
    return{icon,text:`<strong>${DYN_LABELS[key]}</strong> ${target[key]}%，${body}${hint}`};
  });
  const lockTexts={bull:'不因牛市追加核心部位',bear:'不因恐慌賣出長期核心資產',extremeBear:'避免恐慌中砍長期核心資產'};
  items.push({icon:'ti-lock',text:`<strong>內核 Beta / 外核 Global</strong> 固定不動，${lockTexts[regime]}`});
  return items;
}
function getBaseMemo(regime,target){
  const vixName=getVixName(),vixCfg=getVixConfig();
  if(regime==='bull')return`市場動能強勁，${vixName} 低位且大盤創高。衛星加碼追蹤高貝塔機會，現金保留 ${target.cash}% 維持機動性。內核外核固定不動，不因牛市追加核心部位。`;
  if(regime==='extremeBear')return`極端熊市啟動：${vixName} 已進入極端恐慌區，衛星 Alpha 歸零，現金 ${target.cash}%，Hedge ${target.hedge}%。`;
  if(regime==='bear')return`啟動防禦機制，收縮戰線。衛星減碼至 ${target.alpha}%，防禦拉升至 ${target.defense}%。內核外核絕對不動，不因恐慌賣出長期核心資產。等待 ${vixName} 回落至 ${vixCfg.high} 以下再評估恢復動態層。`;
  return'尚未同時滿足牛市或熊市條件，維持均衡基準。重點是定期再平衡，確認各部位未偏離目標超過門檻。內核外核固定不動，衛星可小區間操作。';
}
function getMemo(regime,target){
  const base=getBaseMemo(regime,target);
  const vixName=getVixName(),vixCfg=getVixConfig();
  if(regime==='bear'||regime==='extremeBear'){
    if(inExtremeBear)return base+`\n\n⚠ 極端恐慌警示：目前處於極端恐慌，現金僅供避險使用，勿加碼任何風險資產。等待 ${vixName} 回落至 ${vixCfg.extremeExit} 以下再議布局。`;
    if(indexPct!==null&&indexPct>CONFIG.ma60.near)return base+`\n\n熊市提示：雖然指數仍在60MA上方 ${fPct(indexPct)}%，但波動風險偏高且趨勢尚未恢復牛市條件。維持防守配置，既有核心不動，Alpha 只依再平衡表小幅調整。`;
    return base+`\n\n提醒：Hedge 不是無條件避險。若是升息型熊市，長債可能與股票同跌，因此熊市 hedge ${target.hedge}%，不額外押注，主要靠降低 Alpha 與保留現金控制回撤。`;
  }
  if(indexPct===null)return base;
  const p=indexPct;
  if(regime==='bull'){
    if(p>CONFIG.ma60.overheat)return base+`\n\n⚠ 現金部署提示：指數偏離60MA達 +${fPct(p)}%，風險報酬比偏差，現金暫緩動用。勿追高，等待指數回測均線或 ${vixName} 升至 ${vixCfg.medium} 以上再評估布局。`;
    if(p>CONFIG.ma60.warm)return base+`\n\n強勢偏熱：指數高於60MA +${fPct(p)}%，多頭仍健康，但新增資金以分批為主。Alpha 可依買入評分小量布局，避免一次補滿。`;
    return base+`\n\n現金部署條件（目前距60MA ${p>=0?'+':''}${fPct(p)}%）：優先用於 ① 指數回測60MA附近、② ${vixName} 升至 ${vixCfg.medium} 以上、③ 恐慌性回撤後量縮止穩。持有現金是紀律，勿因 FOMO 追高。`;
  }
  if(regime==='range'){
    if(p>CONFIG.ma60.overheat)return base+`\n\n⚠ 高波動強勢盤：指數高於60MA +${fPct(p)}%，但 ${vixName} 尚未低到可視為順風牛市。維持均衡配置，不追高新增 Alpha；若再平衡表顯示 Alpha 超配可分批調回，低配也不急著補滿。`;
    if(p>CONFIG.ma60.warm)return base+`\n\n強勢震盪：指數高於60MA +${fPct(p)}%，趨勢偏強但風險報酬不便宜。維持 Range 配置，新增資金等待回測或評分明顯優勢。`;
    if(p>CONFIG.ma60.near)return base+`\n\n均線上方震盪：指數高於60MA +${fPct(p)}%，尚未過熱。可依再平衡表微調，Alpha 新增仍以小量分批為主。`;
    if(Math.abs(p)<=CONFIG.ma60.near)return base+`\n\n均線提示：指數貼近60MA（偏離 ${p>=0?'+':''}${fPct(p)}%），現金分批布局的合理區間。留意60MA走勢，若均線走平或轉折下彎，降低進取心，優先維持均衡配置。`;
    if(p<-CONFIG.ma60.near)return base+`\n\n均線提示：指數在60MA以下 ${fPct(p)}%，趨勢確認前現金以觀望為主，以季再平衡為核心動作。`;
  }
  return base;
}
function getCashDeployStatus(regime){
  if(regime==='bear'||regime==='extremeBear')return{label:'<i class="ti ti-lock" style="font-size:12px"></i> 現金暫停部署',cls:'mod-cash-locked'};
  if(indexPct===null)return null;
  const p=indexPct;
  if(regime==='bull'){
    if(p>CONFIG.ma60.overheat)return{label:'<i class="ti ti-lock" style="font-size:12px"></i> 現金暫緩（60MA +'+fPct(p)+'%）',cls:'mod-cash-locked'};
    if(p>CONFIG.ma60.warm)return{label:'<i class="ti ti-alert-circle" style="font-size:12px"></i> 僅小額投入（60MA +'+fPct(p)+'%）',cls:'mod-cash-wait'};
    return{label:'<i class="ti ti-circle-check" style="font-size:12px"></i> 現金可條件部署',cls:'mod-cash-ok'};
  }
  if(regime==='range'){
    if(p>CONFIG.ma60.overheat)return{label:'<i class="ti ti-lock" style="font-size:12px"></i> 現金暫緩（過熱強勢）',cls:'mod-cash-locked'};
    if(p>CONFIG.ma60.warm)return{label:'<i class="ti ti-alert-circle" style="font-size:12px"></i> 等回測再部署',cls:'mod-cash-wait'};
    if(p>CONFIG.ma60.near)return{label:'<i class="ti ti-player-pause" style="font-size:12px"></i> 小量分批為主',cls:'mod-cash-wait'};
    if(Math.abs(p)<=CONFIG.ma60.near)return{label:'<i class="ti ti-circle-check" style="font-size:12px"></i> 現金可分批部署',cls:'mod-cash-ok'};
    if(p<-CONFIG.ma60.near)return{label:'<i class="ti ti-player-pause" style="font-size:12px"></i> 現金觀望為主',cls:'mod-cash-wait'};
  }
  return null;
}
