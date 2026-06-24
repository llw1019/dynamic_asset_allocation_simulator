// Market-parameter input event handlers and auto-selection
function autoSelect(grp,val){if(S[grp]!==val)setBtn(grp,val);tryRender();}
function tryRender(){
  if(S.trend&&S.vix&&S.rate){document.getElementById('out').classList.remove('pending');render();}
  lsSaveDebounced();
}
function pick(el,grp,val,cls){
  document.querySelectorAll(`[data-grp="${grp}"]`).forEach(b=>b.classList.remove('active-trend','active-vix-low','active-vix-med','active-vix-high','active-rate'));
  el.classList.add(cls);S[grp]=val;
  if(grp==='trend'){
    trendState=val;indexPct=null;
    document.getElementById('taiex-input').value='';document.getElementById('ma60-input').value='';document.getElementById('trend-badge').style.display='none';
  }
  if(grp==='vix'){
    S.vixVal=null;document.getElementById('vix-input').value='';document.getElementById('vix-badge').style.display='none';
    if(val==='low'&&inExtremeBear){inExtremeBear=false;document.getElementById('hysteresis-status').style.display='none';}
    else if((val==='medium'||val==='high')&&inExtremeBear)setHysteresisStatus(true);
    else document.getElementById('hysteresis-status').style.display='none';
  }
  if(grp==='rate'){
    document.getElementById('rate-now').value='';document.getElementById('rate-prev').value='';document.getElementById('rate-badge').style.display='none';
  }
  tryRender();
}

function onIndexInput(){
  const idx=parseFloat(document.getElementById('taiex-input').value);
  const ma=parseFloat(document.getElementById('ma60-input').value);
  const badge=document.getElementById('trend-badge');
  if(isNaN(idx)||isNaN(ma)||idx<=0||ma<=0){indexPct=null;trendState=null;badge.style.display='none';return;}
  const pct=(idx-ma)/ma*100;
  indexPct=pct;
  let val,label,cls;
  if(trendState==='below'){
    if(pct>=CONFIG.trend.bearExit)trendState='flat';
  }else if(trendState==='above'){
    if(pct<=CONFIG.trend.bullExit)trendState='flat';
  }
  if(trendState==='flat'||trendState===null){
    if(pct<=CONFIG.trend.bearEnter)trendState='below';
    else if(pct>=CONFIG.trend.bullEnter)trendState='above';
    else trendState='flat';
  }
  val=trendState;
  if(val==='above'){label=`季線上方 +${fPct(pct)}%`;cls='nb-above';}
  else if(val==='below'){label=`跌破季線 ${fPct(pct)}%`;cls='nb-below';}
  else{label=`季線附近 ${pct>=0?'+':''}${fPct(pct)}%`;cls='nb-flat';}
  badge.textContent=label;badge.className=`num-badge ${cls}`;badge.style.display='inline-block';
  autoSelect('trend',val);
}
const debouncedExitExtreme=debounce(function(){
  if(!inExtremeBear)return;
  const v=S.vixVal;
  if(v!==null&&v>0&&v<getVixConfig().extremeExit){
    inExtremeBear=false;
    document.getElementById('hysteresis-status').style.display='none';
    if(S.trend&&S.vix&&S.rate)render();
    lsSaveDebounced();
  }
},CONFIG.debounce.extremeBearExit);
function onVixInput(){
  const v=parseFloat(document.getElementById('vix-input').value);
  const badge=document.getElementById('vix-badge');
  const hsEl=document.getElementById('hysteresis-status');
  if(isNaN(v)||v<=0){badge.textContent='';badge.style.display='none';S.vixVal=null;lsSaveDebounced();return;}
  S.vixVal=v;
  const cfg=getVixConfig();
  if(!inExtremeBear&&v>cfg.extremeEnter){
    inExtremeBear=true;
    setHysteresisStatus(true);
  }else if(inExtremeBear&&v<cfg.extremeExit){
    debouncedExitExtreme();
  }else if(!inExtremeBear){
    hsEl.style.display='none';
  }
  let val,label,cls;
  if(v>cfg.extremeEnter){val='high';label=`極端恐慌 ${fPct(v)} ⚠`;cls='nb-extreme';}
  else if(v>=cfg.high){val='high';label=`高恐慌 ${fPct(v)}`;cls='nb-high';}
  else if(v>=cfg.medium){val='medium';label=`中恐慌 ${fPct(v)}`;cls='nb-med';}
  else{val='low';label=`低恐慌 ${fPct(v)}`;cls='nb-low';}
  badge.textContent=label;badge.className=`num-badge ${cls}`;badge.style.display='inline-block';
  autoSelect('vix',val);
}
function onVixSourceChange(){
  const source=document.getElementById('vix-source');
  S.vixSource=source&&source.value==='tw'?'tw':'us';
  updateVixSourceUI();
  clearVixState(true);
  lsSaveDebounced();
}
function onRateInput(){
  const now=parseFloat(document.getElementById('rate-now').value);
  const prev=parseFloat(document.getElementById('rate-prev').value);
  const badge=document.getElementById('rate-badge');
  if(isNaN(now)||isNaN(prev)){badge.style.display='none';return;}
  const diff=now-prev;
  let val,label,cls;
  if(diff>CONFIG.rate.threshold){val='rising';label=`升息 +${fPct2(diff)}%`;cls='nb-rising';}
  else if(diff<-CONFIG.rate.threshold){val='falling';label=`降息 ${fPct2(diff)}%`;cls='nb-falling';}
  else{val='stable';label=`穩定 ${diff>=0?'+':''}${fPct2(diff)}%`;cls='nb-stable';}
  badge.textContent=label;badge.className=`num-badge ${cls}`;badge.style.display='inline-block';
  autoSelect('rate',val);
}
function onFundChange(){
  const v=parseFloat(document.getElementById('fund-input').value);
  HIGH_WATER_MARK=isNaN(v)||v<=0?0:v;
  updateFundStatus();
  checkHWM();
  if(S.trend&&S.vix&&S.rate)render();lsSaveDebounced();
}
function onContributedChange(){
  const v=parseFloat(document.getElementById('contributed-input').value);
  TOTAL_CONTRIBUTED=isNaN(v)||v<=0?0:v;
  checkContributed();renderPnL();lsSaveDebounced();
  const hint=document.getElementById('cash-contrib-hint');if(hint)hint.style.display='none';
}
