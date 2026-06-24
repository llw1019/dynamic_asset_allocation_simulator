// Market-parameter UI helpers (hysteresis, VIX source, static texts, button state)
function setHysteresisStatus(show){
  const el=document.getElementById('hysteresis-status');if(!el)return;
  if(!show){el.style.display='none';el.innerHTML='';return;}
  el.style.display='block';
  el.innerHTML=`<span class="hysteresis-tag">極端熊市鎖定中，需輸入 ${getVixName()} &lt; ${getVixConfig().extremeExit} 才解除</span>`;
}
function updateVixSourceUI(){
  const cfg=getVixConfig(),name=getVixName();
  const source=document.getElementById('vix-source');
  if(source)source.value=S.vixSource;
  const title=document.getElementById('vix-title-text');
  if(title)title.textContent=`恐慌指數 ${name}`;
  const low=document.getElementById('vix-low-text');
  const medium=document.getElementById('vix-medium-text');
  const high=document.getElementById('vix-high-text');
  if(low)low.textContent=`低恐慌（< ${cfg.medium}）`;
  if(medium)medium.textContent=`中恐慌（${cfg.medium}–${cfg.high}）`;
  if(high)high.textContent=`高恐慌（> ${cfg.high}）`;
  const label=document.getElementById('vix-input-label');
  if(label)label.textContent=`${name} 數值 (${getVixInputName()})`;
  const tVix=document.getElementById('txt-th-vix');
  if(tVix)tVix.textContent=`${name} > ${cfg.high}`;
  if(inExtremeBear)setHysteresisStatus(true);
}
function initStaticTexts(){
  const tAlpha=document.getElementById('txt-th-alpha');
  const tBeta=document.getElementById('txt-th-beta');
  if(tAlpha) tAlpha.textContent=REBAL_THRESHOLD.alpha;
  if(tBeta) tBeta.textContent=REBAL_THRESHOLD.beta;
  Object.keys(SELL_TYPE_LABELS).forEach(t=>{
    const el=document.getElementById('sell-type-label-'+t);
    if(el)el.textContent=SELL_TYPE_LABELS[t];
  });
  setSellThresholdText('etf');
  setSellThresholdText('tech');
  setSellThresholdText('bio');
  const chaseHint=document.getElementById('sell-s2-chase-hint');
  if(chaseHint)chaseHint.textContent='追高入場容錯空間較小；若虧損超過 '+Math.abs(CONFIG.sellThreshold.chaseWarnPnl)+'%，系統將提示分批減碼。';
  updateVixSourceUI();
}
function setSellThresholdText(type){
  const el=document.getElementById('sell-th-'+type);
  const th=getSellStopThresholds(type);
  if(el&&th)el.textContent=`警示 ${th.warn}% / 危險 ${th.danger}%`;
}
function setOutputPending(){
  const out=document.getElementById('out');
  if(out)out.classList.add('pending');
  currentTarget=null;
  const trig=document.getElementById('regime-trigger');
  const mod=document.getElementById('modifier-row');
  const warn=document.getElementById('warn-area');
  if(trig)trig.innerHTML='';
  if(mod)mod.innerHTML='';
  if(warn)warn.innerHTML='';
  const name=document.getElementById('regime-name');
  const sub=document.getElementById('regime-sub');
  if(name)name.textContent='—';
  if(sub)sub.textContent='請先填入所有參數';
}
function clearVixState(clearInput){
  S.vix=null;
  S.vixVal=null;
  inExtremeBear=false;
  const input=document.getElementById('vix-input');
  const badge=document.getElementById('vix-badge');
  if(clearInput&&input)input.value='';
  if(badge){badge.textContent='';badge.style.display='none';}
  document.querySelectorAll('[data-grp="vix"]').forEach(b=>b.classList.remove('active-vix-low','active-vix-med','active-vix-high'));
  setHysteresisStatus(false);
  setOutputPending();
}
function setBtn(grp,val){
  const m={trend:{above:'active-trend',flat:'active-trend',below:'active-trend'},
    vix:{low:'active-vix-low',medium:'active-vix-med',high:'active-vix-high'},
    rate:{stable:'active-rate',rising:'active-rate',falling:'active-rate'}};
  document.querySelectorAll(`[data-grp="${grp}"]`).forEach(b=>b.classList.remove('active-trend','active-vix-low','active-vix-med','active-vix-high','active-rate'));
  const btn=document.querySelector(`[data-grp="${grp}"][data-val="${val}"]`);
  if(btn)btn.classList.add(m[grp][val]);
  S[grp]=val;
  if(grp==='trend')trendState=val;
}
