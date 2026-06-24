// Settings import / export / JSON paste / reset
function exportJSON(){
  const data={version:DATA_VERSION,exportDate:new Date().toISOString(),
    params:{trend:S.trend,vix:S.vix,rate:S.rate,vixVal:S.vixVal,vixSource:S.vixSource,
      taiex:document.getElementById('taiex-input').value,
      ma60:document.getElementById('ma60-input').value,
      vixInput:document.getElementById('vix-input').value,
      rateNow:document.getElementById('rate-now').value,
      ratePrev:document.getElementById('rate-prev').value},
    hwm:HIGH_WATER_MARK,contributed:TOTAL_CONTRIBUTED,inExtremeBear:inExtremeBear,trendState:trendState,
    holdings:JSON.parse(JSON.stringify(holdings))};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const d=new Date();
  const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  a.href=url;a.download='DAA_'+ds+'.json';a.click();
  URL.revokeObjectURL(url);
  showIOMsg('\u2705 \u5df2\u532f\u51fa '+a.download);
}
function importJSON(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=JSON.parse(e.target.result);
      applyImportData(data,file.name);
    }catch(err){showIOMsg('\u274c \u532f\u5165\u5931\u6557\uff1a'+err.message);}
  };
  reader.readAsText(file);
  input.value='';
}
function applyImportData(data,sourceLabel){
  if(typeof data!=='object'||!data.params||typeof data.params!=='object'||!data.holdings||typeof data.holdings!=='object')throw new Error('\u683c\u5f0f\u4e0d\u7b26');
  const p=data.params;
  const numRe=/^(?:\d+|\d*\.\d+)$/;
  const optionalNumberString=(v,label)=>{
    if(v===undefined||v===null||v==='')return'';
    const s=String(v).trim();
    if(!numRe.test(s))throw new Error(label+' 必須是非負數');
    return s;
  };
  const optionalPositiveNumber=(v,label)=>{
    const s=optionalNumberString(v,label);
    if(s===''||parseFloat(s)<=0)return'';
    return s;
  };
  const requireEnum=(v,allowed,label)=>{
    if(v===undefined||v===null||v==='')return null;
    if(!allowed.includes(v))throw new Error(label+' 值不支援：'+v);
    return v;
  };
  const validT=['above','flat','below'],validV=['low','medium','high'],validR=['stable','rising','falling'];
  const normalized={
    hwmText:optionalPositiveNumber(data.hwm,'hwm'),
    contributedText:optionalPositiveNumber(data.contributed,'contributed'),
    trendState:requireEnum(data.trendState,validT,'trendState'),
    inExtremeBear:typeof data.inExtremeBear==='boolean'?data.inExtremeBear:false,
    vixSource:requireEnum(p.vixSource,['us','tw'],'vixSource')||'us',
    taiexInput:optionalPositiveNumber(p.taiex,'taiex'),
    ma60Input:optionalPositiveNumber(p.ma60,'ma60'),
    vixInput:optionalPositiveNumber(p.vixInput,'vixInput'),
    rateNow:optionalNumberString(p.rateNow,'rateNow'),
    ratePrev:optionalNumberString(p.ratePrev,'ratePrev'),
    trend:requireEnum(p.trend,validT,'trend'),
    vix:requireEnum(p.vix,validV,'vix'),
    rate:requireEnum(p.rate,validR,'rate'),
    vixVal:optionalNumberString(p.vixVal,'vixVal'),
    holdings:{}
  };
  REBAL_KEYS.forEach(k=>{
    if(Array.isArray(data.holdings[k])){
      if(k==='cash'){
        normalized.holdings[k]=data.holdings[k].map(h=>({amt:optionalNumberString(h&&h.amt,k+'.amt')}));
      }else{
        normalized.holdings[k]=data.holdings[k].map(h=>({
          code:String((h&&h.code)||'').slice(0,20),
          avgPrice:optionalNumberString(h&&h.avgPrice,k+'.avgPrice'),
          curPrice:optionalNumberString(h&&h.curPrice,k+'.curPrice'),
          shares:optionalNumberString(h&&h.shares,k+'.shares'),
          peakPrice:optionalNumberString(h&&h.peakPrice,k+'.peakPrice')
        }));
      }
    }else{
      normalized.holdings[k]=k==='cash'?[{amt:''}]:[{code:'',avgPrice:'',curPrice:'',shares:'',peakPrice:''}];
    }
  });
  const setInput=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val!==undefined&&val!==null?String(val):'';};
  const hideBadge=(id)=>{const el=document.getElementById(id);if(el){el.textContent='';el.style.display='none';}};
  S.trend=null;S.vix=null;S.rate=null;S.vixVal=null;S.vixSource='us';trendState=null;indexPct=null;inExtremeBear=false;
  document.querySelectorAll('.opt-btn').forEach(b=>b.classList.remove('active-trend','active-vix-low','active-vix-med','active-vix-high','active-rate'));
  setInput('taiex-input','');setInput('ma60-input','');setInput('vix-input','');setInput('rate-now','');setInput('rate-prev','');
  hideBadge('trend-badge');hideBadge('vix-badge');hideBadge('rate-badge');setHysteresisStatus(false);setOutputPending();
  HIGH_WATER_MARK=normalized.hwmText?parseFloat(normalized.hwmText):0;
  TOTAL_CONTRIBUTED=normalized.contributedText?parseFloat(normalized.contributedText):0;
  setInput('fund-input',normalized.hwmText);
  setInput('contributed-input',normalized.contributedText);
  if(normalized.trendState)trendState=normalized.trendState;
  inExtremeBear=normalized.inExtremeBear;
  S.vixSource=normalized.vixSource;
  updateVixSourceUI();
  setInput('taiex-input',normalized.taiexInput);
  setInput('ma60-input',normalized.ma60Input);
  setInput('vix-input',normalized.vixInput);
  setInput('rate-now',normalized.rateNow);
  setInput('rate-prev',normalized.ratePrev);
  REBAL_KEYS.forEach(k=>{holdings[k]=normalized.holdings[k];});
  formatStaticDecInputs();
  if(normalized.taiexInput&&normalized.ma60Input)onIndexInput();
  if(normalized.vixInput)onVixInput();
  if(normalized.rateNow&&normalized.ratePrev)onRateInput();
  if(normalized.trend&&!S.trend)setBtn('trend',normalized.trend);
  if(normalized.vix&&!S.vix)setBtn('vix',normalized.vix);
  if(normalized.rate&&!S.rate)setBtn('rate',normalized.rate);
  if(!normalized.vixInput&&normalized.vixVal)S.vixVal=parseFloat(normalized.vixVal);
  REBAL_KEYS.forEach(k=>{const panel=document.getElementById('panel-'+k);if(panel){delete panel.dataset.built;panel.classList.remove('open');}});
  openPanel=null;
  tryRender();
  renderPnL();
  showIOMsg('\u2705 \u5df2\u532f\u5165 '+sourceLabel);
}
function toggleJsonPastePanel(force){
  const panel=document.getElementById('json-paste-panel');if(!panel)return;
  const open=force===undefined?!panel.classList.contains('open'):!!force;
  panel.classList.toggle('open',open);
  if(open){const input=document.getElementById('json-paste-input');if(input)input.focus();}
}
function applyPastedJSON(){
  const input=document.getElementById('json-paste-input');
  const raw=input?input.value.trim():'';
  if(!raw){showIOMsg('\u274c \u8acb\u5148\u8cbc\u4e0a JSON \u5167\u5bb9');return;}
  try{
    const data=JSON.parse(raw);
    applyImportData(data,'貼上的 JSON');
    if(input)input.value='';
    toggleJsonPastePanel(false);
  }catch(err){showIOMsg('\u274c JSON \u532f\u5165\u5931\u6557\uff1a'+err.message);}
}
function showIOMsg(msg){const el=document.getElementById('io-msg');if(!el)return;el.textContent=msg;setTimeout(()=>{el.textContent='';},CONFIG.debounce.ioMsg);}
function resetAll(){
  if(!confirm('確定要重置所有設定與持倉資料（不含富果 API 金鑰）？此操作無法復原。'))return;
  localStorage.removeItem(LS_KEY);
  location.reload();
}
