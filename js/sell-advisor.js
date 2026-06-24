// Alpha holding sell-decision advisor
// === Sell Advisor ===
const sellState={idx:null,s1:null,s2:null,s3:null,s5:null};
function getAlphaHoldings(){
  return Array.isArray(holdings.alpha)?holdings.alpha:[];
}
function resetSellChoices(){
  sellState.s1=null;sellState.s2=null;sellState.s3=null;sellState.s5=null;
  [1,2,3,5].forEach(n=>{
    document.querySelectorAll('#sell-s'+n+'-opts .sell-opt').forEach(o=>o.className='sell-opt');
    const sn=document.getElementById('sell-sn-'+n);if(sn)sn.className='sell-step-num';
  });
  const box=document.getElementById('sell-s5-box');if(box)box.style.display='none';
  const area=document.getElementById('sell-result-area');if(area)area.innerHTML='';
}
function getSelectedSellHolding(){
  const alpha=getAlphaHoldings();
  if(sellState.idx===null||sellState.idx<0||sellState.idx>=alpha.length)return null;
  return alpha[sellState.idx]||null;
}
function getSellRiskMetrics(r){
  r=r||getSelectedSellHolding();if(!r)return null;
  const c=parseFloat(r.curPrice),sh=parseFloat(r.shares);
  if(isNaN(c)||isNaN(sh)||c<=0||sh<=0)return null;
  const mv=c*sh;
  const alphaTotal=getHoldingTotal('alpha');
  const capitalBase=getCapitalBase();
  const target=currentTarget||BASE;
  const alphaTargetAmt=capitalBase*target.alpha/100;
  return{
    marketValue:mv,
    alphaPct:alphaTotal>0?mv/alphaTotal*100:null,
    budgetPct:alphaTargetAmt>0?mv/alphaTargetAmt*100:(mv>0?Infinity:null),
    overallPct:capitalBase>0?mv/capitalBase*100:null,
    alphaTargetPct:target.alpha,
    alphaTargetAmt
  };
}
function refreshSellAdvisorDropdown(){
  const sel=document.getElementById('sell-adv-select');if(!sel)return;
  const alpha=getAlphaHoldings();
  const prevVal=sellState.idx!==null?String(sellState.idx):sel.value;
  const hasHolding=r=>!!(r&&[r.code,r.avgPrice,r.curPrice,r.shares,r.peakPrice].some(v=>String(v||'').trim()!==''));
  const visibleAlpha=alpha.map((r,i)=>({r,i})).filter(x=>hasHolding(x.r));
  sel.innerHTML='<option value="" disabled selected>— '+(visibleAlpha.length?'請選擇要評估的 Alpha 標的':'請先在 Alpha 部位輸入持股')+' —</option>';
  let unnamed=0;
  visibleAlpha.forEach(({r,i})=>{
    const opt=document.createElement('option');opt.value=String(i);
    if(r.code&&r.code.trim()){
      opt.textContent=r.code.trim();
    }else{
      unnamed++;
      opt.textContent='未命名標的 '+unnamed;
    }
    sel.appendChild(opt);
  });
  if(visibleAlpha.length===0){
    sellState.idx=null;
    resetSellChoices();
    const steps=document.getElementById('sell-steps-area');if(steps)steps.style.display='none';
  }else if(prevVal!==''&&sel.querySelector('option[value="'+prevVal+'"]')){
    sel.value=prevVal;
    sellState.idx=parseInt(prevVal);
  }else{
    sellState.idx=null;
    document.getElementById('sell-steps-area').style.display='none';
  }
}
function updateSellAdvisorView(options){
  options=options||{};
  const sel=document.getElementById('sell-adv-select');
  const steps=document.getElementById('sell-steps-area');
  const alpha=getAlphaHoldings();
  if(alpha.length===0||sellState.idx===null||sellState.idx<0||sellState.idx>=alpha.length){
    sellState.idx=null;
    resetSellChoices();
    if(sel)sel.value='';
    if(steps)steps.style.display='none';
    return;
  }
  const selectedHolding=alpha[sellState.idx]||null;
  if(sel&&sel.value!==String(sellState.idx))sel.value=String(sellState.idx);
  if(steps)steps.style.display='';
  updateSellStep4(selectedHolding);
  updateSellStep5PnL(selectedHolding);
  if(options.resetStopBox){
    const box=document.getElementById('sell-s5-box');
    if(box)box.style.display='none';
  }else{
    updateSellStep5Box(selectedHolding);
  }
  calcSellResult(selectedHolding);
}
function syncSellAdvisor(refreshOptions){
  if(refreshOptions)refreshSellAdvisorDropdown();
  updateSellAdvisorView();
}
function onSellSelectChange(){
  const sel=document.getElementById('sell-adv-select');
  const idx=parseInt(sel.value);
  const alpha=getAlphaHoldings();
  if(isNaN(idx)||idx<0||idx>=alpha.length)return;
  sellState.idx=idx;
  resetSellChoices();
  updateSellAdvisorView({resetStopBox:true});
}
function pickSellOpt(el){
  const step=parseInt(el.dataset.step);
  const val=el.dataset.val;
  const colorMap={
    1:{valid:'sel-green',weak:'sel-yellow',invalid:'sel-red'},
    2:{safe:'sel-green',neutral:'sel-yellow',chase:'sel-red'},
    3:{strong:'sel-green',shaky:'sel-yellow',weak:'sel-orange',reversed:'sel-red'},
    5:{etf:'sel-green',tech:'sel-yellow',bio:'sel-red'}
  };
  const group=document.getElementById('sell-s'+step+'-opts');
  group.querySelectorAll('.sell-opt').forEach(o=>o.className='sell-opt');
  el.classList.add(colorMap[step][val]);
  const sn=document.getElementById('sell-sn-'+step);
  if(sn)sn.className='sell-step-num done';
  if(step===1)sellState.s1=val;
  if(step===2)sellState.s2=val;
  if(step===3)sellState.s3=val;
  if(step===5)sellState.s5=val;
  updateSellAdvisorView();
}
function updateSellStep4(r){
  const box=document.getElementById('sell-s4-box');if(!box)return;
  if(!r||sellState.idx===null){
    box.textContent='請先選擇評估標的';
    box.className='sell-auto-box sell-auto-neutral';return;
  }
  const risk=getSellRiskMetrics(r);
  if(!risk||risk.budgetPct===null){
    box.textContent='該標的尚未輸入現價或股數，無法計算集中度';
    box.className='sell-auto-box sell-auto-neutral';return;
  }
  const inf=risk.budgetPct===Infinity;
  let cls,icon,label,desc,action='';
  if(inf||risk.budgetPct>CONFIG.concentration.high){
    cls='sell-auto-red';icon='ti-alert-triangle';label='高風險';
    desc=inf
      ?'Alpha 目標額度目前為 0，無法分散風險'
      :`已占 Alpha 目標額度 <strong>${fPct(risk.budgetPct)}%</strong>，集中度過高`;
    action='→ 建議優先分批減碼';
  }else if(risk.budgetPct>=CONFIG.concentration.medium){
    cls='sell-auto-yellow';icon='ti-alert-circle';label='中等風險';
    desc=`已占 Alpha 目標額度 <strong>${fPct(risk.budgetPct)}%</strong>，集中度偏高`;
    action='→ 建議留意集中度';
  }else{
    cls='sell-auto-green';icon='ti-circle-check';label='低風險';
    desc=`目前占 Alpha 目標額度 <strong>${fPct(risk.budgetPct)}%</strong>，集中度正常`;
  }
  const alphaPct=risk.alphaPct!==null?fPct(risk.alphaPct)+'%':'—';
  const overallPct=risk.overallPct!==null?fPct(risk.overallPct)+'%':'—';
  box.className='sell-auto-box '+cls;
  box.innerHTML=
    `<div class="sell-auto-title"><i class="ti ${icon}"></i> ${label}</div>`+
    `<div class="sell-auto-desc">${desc}</div>`+
    (action?`<div class="sell-auto-action">${action}</div>`:'')+
    `<div class="sell-auto-meta">Alpha 內占比 ${alphaPct}｜整體資產占比 ${overallPct}</div>`;
}
function getSellStopThresholds(type){
  const th=HOLDING_THRESHOLDS.alpha;
  if(type==='etf')return th.etf;
  if(type==='tech')return th.stock;
  if(type==='bio'){
    const o=CONFIG.sellThreshold.bioOffset;
    return{warn:th.stock.warn+o,danger:th.stock.danger+o,
      warnAction:'高波動題材回撤接近警示，停止加碼並檢查 Thesis',
      dangerAction:'高波動題材已觸及危險線，建議停損或大幅減碼'};
  }
  return null;
}
function getSellTypeLabel(type){
  return SELL_TYPE_LABELS[type]||'Alpha 標的';
}
function getSellStopRisk(r,type){
  const th=getSellStopThresholds(type);
  if(!r||!th)return null;
  const cur=parseFloat(r.curPrice),peak=parseFloat(r.peakPrice);
  if(!isNaN(cur)&&cur>0&&!isNaN(peak)&&peak>0){
    const pullback=(cur-peak)/peak*100;
    const level=pullback<=th.danger?'danger':(pullback<=th.warn?'warn':'ok');
    return{basis:'peak',value:pullback,level,hit:level==='danger',warn:level==='warn',th};
  }
  const avg=parseFloat(r.avgPrice);
  if(!isNaN(cur)&&cur>0&&!isNaN(avg)&&avg>0){
    const pnl=(cur-avg)/avg*100;
    const level=pnl<=th.danger?'danger':(pnl<=th.warn?'warn':'ok');
    return{basis:'avgFallback',value:pnl,level,hit:level==='danger',warn:level==='warn',th};
  }
  return null;
}
function updateSellStep5PnL(r){
  const el=document.getElementById('sell-pnl-display');if(!el)return;
  if(!r||sellState.idx===null){el.textContent='目前損益：—，請先在持股面板輸入均價與現價';el.className='sell-pnl-display';return;}
  const avg=parseFloat(r.avgPrice),cur=parseFloat(r.curPrice);
  if(isNaN(avg)||isNaN(cur)||avg<=0){
    el.textContent='目前損益：—，請先在持股面板輸入均價與現價';
    el.className='sell-pnl-display';return;
  }
  const pnl=((cur-avg)/avg)*100;
  const sign=pnl>=0?'+':'';
  const colorCls=pnl>=0?'pnl-positive':'pnl-negative';
  el.innerHTML=`目前損益：<span class="${colorCls}">${sign}${fPct(pnl)}%</span>`;
  el.className='sell-pnl-display';
}
function updateSellStep5Box(r){
  const box=document.getElementById('sell-s5-box');if(!box)return;
  if(!sellState.s5||sellState.idx===null){box.style.display='none';return;}
  if(!r){box.style.display='none';return;}
  const stopRisk=getSellStopRisk(r,sellState.s5);
  const th=getSellStopThresholds(sellState.s5);
  if(!stopRisk){
    box.style.display='block';
    box.className='sell-auto-box sell-auto-neutral';
    box.textContent='尚未輸入高點 / 現價，無法判斷 '+getSellTypeLabel(sellState.s5)+' 的回撤風險';
    return;
  }
  box.style.display='block';
  const fallbackNote=stopRisk.basis==='avgFallback'?'未設定高點，暫以均價損益輔助判斷；建議補上高點以啟用完整追蹤。':'';
  const metric=stopRisk.basis==='peak'?'高點回撤':'目前損益';
  if(stopRisk.level==='danger'){
    box.className='sell-auto-box sell-auto-red';
    box.innerHTML='<i class="ti ti-alert-triangle"></i> 已觸及危險線：'+metric+' <strong>'+fPct(stopRisk.value)+'%</strong>，危險線 '+th.danger+'%'+(fallbackNote?'<br><span style="font-size:11px">'+fallbackNote+'</span>':'');
  }else if(stopRisk.level==='warn'){
    box.className='sell-auto-box sell-auto-yellow';
    box.innerHTML=metric+' '+fPct(stopRisk.value)+'%，已進入警示區（警示 '+th.warn+'%，危險 '+th.danger+'%）'+(fallbackNote?'<br><span style="font-size:11px">'+fallbackNote+'</span>':'');
  }else{
    box.className='sell-auto-box sell-auto-green';
    box.innerHTML=metric+' '+(stopRisk.value>=0?'+':'')+fPct(stopRisk.value)+'%，未觸及警示線（警示 '+th.warn+'%，危險 '+th.danger+'%）'+(fallbackNote?'<br><span style="font-size:11px">'+fallbackNote+'</span>':'');
  }
}
function calcSellResult(selectedHolding){
  const area=document.getElementById('sell-result-area');if(!area)return;
  // Step 4 is automatic; wait for all manual steps before showing final advice.
  if(!sellState.s1||!sellState.s2||!sellState.s3||!sellState.s5){area.innerHTML='';return;}
  const risk=getSellRiskMetrics(selectedHolding);
  const alphaBudgetPct=risk?(risk.budgetPct===Infinity?100:risk.budgetPct||0):0;
  const alphaInnerPct=risk&&risk.alphaPct!==null?risk.alphaPct:0;
  let hitStopLoss=false;
  let stopWarn=false;
  let pnlVal=null;
  if(selectedHolding&&sellState.s5){
    const avg=parseFloat(selectedHolding.avgPrice),cur=parseFloat(selectedHolding.curPrice);
    if(!isNaN(avg)&&!isNaN(cur)&&avg>0){
      pnlVal=((cur-avg)/avg)*100;
    }
    const stopRisk=getSellStopRisk(selectedHolding,sellState.s5);
    hitStopLoss=!!(stopRisk&&stopRisk.hit);
    stopWarn=!!(stopRisk&&stopRisk.warn);
  }
  let level,title,body;
  const alphaTargetZero=risk&&risk.marketValue>0&&risk.alphaTargetPct<=0;
  const redReasons=[];
  if(hitStopLoss)redReasons.push('已觸及類型危險線');
  if(sellState.s1==='invalid')redReasons.push('買入 Thesis 已失效');
  if(sellState.s3==='reversed')redReasons.push('趨勢已反轉');
  if(alphaTargetZero)redReasons.push('目前 DAA 目標不承擔 Alpha 額度');
  if(redReasons.length){
    level='red';
    title='<i class="ti ti-alert-triangle"></i> 建議：全賣或大幅減碼';
    body='理由：'+redReasons.join('、')+'。保護本金與遵守 DAA 風險預算為第一優先。';
  }
  else{
    const yellowReasons=[];
    if(sellState.s3==='weak')yellowReasons.push('技術結構明顯轉弱');
    if(alphaBudgetPct>CONFIG.concentration.high)yellowReasons.push('Alpha 目標額度占用過高');
    else if(alphaBudgetPct>=CONFIG.concentration.medium)yellowReasons.push('Alpha 目標額度占用較高');
    if(sellState.s2==='chase'&&pnlVal!==null&&pnlVal<CONFIG.sellThreshold.chaseWarnPnl)yellowReasons.push(`追高買入後虧損已達 ${Math.abs(CONFIG.sellThreshold.chaseWarnPnl)}%`);
    if(sellState.s1==='weak')yellowReasons.push('核心理由部分弱化');
    if(pnlVal!==null&&pnlVal>=CONFIG.sellThreshold.profitWarn&&sellState.s3!=='strong')yellowReasons.push(`獲利已達 ${CONFIG.sellThreshold.profitWarn}% 且技術結構不再強勢`);
    if(stopWarn)yellowReasons.push('高點回撤已進入警示區');
    if(!yellowReasons.length&&alphaInnerPct>=CONFIG.concentration.high&&alphaBudgetPct>=CONFIG.concentration.innerMin)yellowReasons.push('Alpha 內部集中度較高');
    if(yellowReasons.length){
      level='yellow';
      title='<i class="ti ti-alert-circle"></i> 建議：分批減碼';
      body='理由：'+yellowReasons.join('、')+'。建議先賣出部分，回收本金並降低風險。';
    }else{
      level='green';
      title='<i class="ti ti-circle-check"></i> 建議：繼續持有';
      body='理由：買入核心理由仍然有效，技術結構尚可，短期波動屬正常範圍；請繼續留意停損線。';
    }
  }
  area.innerHTML=`<div class="sell-result sell-result-${level}">
    <div class="sell-result-title">${title}</div>
    <div class="sell-result-body">${body}</div>
  </div>`;
}
