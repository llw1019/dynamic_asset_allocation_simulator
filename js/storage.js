// LocalStorage persistence (save / load / debounced autosave)
const LS_KEY='daa_sim_'+DATA_VERSION;
function lsSave(){
  try{
    localStorage.setItem(LS_KEY,JSON.stringify({
      trend:S.trend,vix:S.vix,rate:S.rate,vixVal:S.vixVal,vixSource:S.vixSource,inExtremeBear,hwm:HIGH_WATER_MARK,contributed:TOTAL_CONTRIBUTED,trendState,
      taiex:document.getElementById('taiex-input').value,
      ma60:document.getElementById('ma60-input').value,
      vixInput:document.getElementById('vix-input').value,
      rateNow:document.getElementById('rate-now').value,
      ratePrev:document.getElementById('rate-prev').value,
      holdings:JSON.parse(JSON.stringify(holdings))
    }));
  }catch(e){}
}
const lsSaveDebounced=debounce(lsSave,CONFIG.debounce.lsSave);
function lsLoad(){
  try{
    const raw=localStorage.getItem(LS_KEY);if(!raw)return;
    const d=JSON.parse(raw);
    if(typeof d.hwm==='number'&&isFinite(d.hwm)&&d.hwm>0){HIGH_WATER_MARK=d.hwm;document.getElementById('fund-input').value=d.hwm;document.getElementById('fund-label').textContent=getHwmLabel();}
    if(typeof d.contributed==='number'&&isFinite(d.contributed)&&d.contributed>0){TOTAL_CONTRIBUTED=d.contributed;document.getElementById('contributed-input').value=d.contributed;}
    if(['us','tw'].includes(d.vixSource))S.vixSource=d.vixSource;
    updateVixSourceUI();
    if(['above','flat','below'].includes(d.trendState))trendState=d.trendState;
    if(d.inExtremeBear!==undefined)inExtremeBear=d.inExtremeBear;
    if(inExtremeBear)setHysteresisStatus(true);
    if(d.taiex)document.getElementById('taiex-input').value=d.taiex;
    if(d.ma60) document.getElementById('ma60-input').value=d.ma60;
    if(d.vixInput)document.getElementById('vix-input').value=d.vixInput;
    if(d.rateNow) document.getElementById('rate-now').value=d.rateNow;
    if(d.ratePrev)document.getElementById('rate-prev').value=d.ratePrev;
    if(d.holdings){REBAL_KEYS.forEach(k=>{if(Array.isArray(d.holdings[k])){if(k==='cash')holdings[k]=d.holdings[k].map(h=>({amt:String(h.amt||'')}));else holdings[k]=d.holdings[k].map(h=>('avgPrice' in h)?{code:String(h.code||''),avgPrice:String(h.avgPrice||''),curPrice:String(h.curPrice||''),shares:String(h.shares||''),peakPrice:String(h.peakPrice||'')}:{code:String(h.code||''),avgPrice:'',curPrice:'',shares:'',peakPrice:''});}});}
    formatStaticDecInputs();
    if(d.taiex&&d.ma60)onIndexInput();
    if(d.vixInput)onVixInput();
    if(d.rateNow&&d.ratePrev)onRateInput();
    if(d.trend&&!S.trend)setBtn('trend',d.trend);
    if(d.vix&&!S.vix)    setBtn('vix',d.vix);
    if(d.rate&&!S.rate)  setBtn('rate',d.rate);
    if(!d.vixInput&&typeof d.vixVal==='number'&&isFinite(d.vixVal))S.vixVal=d.vixVal;
    tryRender();
    renderPnL();
  }catch(e){}
}
