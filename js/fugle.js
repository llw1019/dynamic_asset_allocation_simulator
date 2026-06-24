// External market-data integration — Fugle MarketData v1.0 current-price updates
// API key is stored only in this device's localStorage (separate key), never in the
// exported settings JSON and never hard-coded — so it is not exposed via the public repo.
const FUGLE_KEY_LS='daa_fugle_key';
const FUGLE_QUOTE_URL='https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/';

function getFugleKey(){const el=document.getElementById('fugle-key');return el?el.value.trim():'';}
function loadFugleKey(){
  try{const k=localStorage.getItem(FUGLE_KEY_LS);const el=document.getElementById('fugle-key');if(k&&el)el.value=k;}catch(e){}
}
function onFugleKeyInput(){
  const el=document.getElementById('fugle-key');if(!el)return;
  try{const v=el.value.trim();if(v)localStorage.setItem(FUGLE_KEY_LS,v);else localStorage.removeItem(FUGLE_KEY_LS);}catch(e){}
}
function showFugleMsg(msg){const el=document.getElementById('fugle-msg');if(el)el.textContent=msg;}
function clearFugleKey(){
  const el=document.getElementById('fugle-key');if(el)el.value='';
  try{localStorage.removeItem(FUGLE_KEY_LS);}catch(e){}
  showFugleMsg('已清除本機富果金鑰');
}

async function fetchFugleQuote(symbol,key){
  const res=await fetch(FUGLE_QUOTE_URL+encodeURIComponent(symbol),{headers:{'X-API-KEY':key}});
  if(!res.ok){
    let detail='';try{const j=await res.json();detail=j.message||j.error||'';}catch(e){}
    throw new Error('HTTP '+res.status+(detail?'：'+detail:''));
  }
  const d=await res.json();
  // v1.0 intraday quote: prefer last traded price, fall back through close / previous close.
  const price=[d.lastPrice,d.closePrice,d.lastTrade&&d.lastTrade.price,d.previousClose,d.referencePrice]
    .find(v=>v!==undefined&&v!==null&&Number.isFinite(Number(v)));
  if(price===undefined)throw new Error('回傳無有效價格');
  return Number(price);
}

async function updatePricesFromFugle(){
  const key=getFugleKey();
  if(!key){showFugleMsg('⚠ 請先輸入富果 API 金鑰');return;}
  // Collect every holding that has a stock code (cash positions have none).
  const targets=[];
  REBAL_KEYS.forEach(k=>{if(k==='cash')return;holdings[k].forEach((r,i)=>{const c=String(r.code||'').trim();if(c)targets.push({k,i,code:c});});});
  if(!targets.length){showFugleMsg('沒有可更新的持股（請先在持股面板填代號）');return;}
  const btn=document.getElementById('fugle-update-btn');
  if(btn)btn.disabled=true;
  const symbols=[...new Set(targets.map(t=>t.code))];
  const priceMap={},fails=[];
  let done=0;
  showFugleMsg('更新中… 0/'+symbols.length);
  for(const sym of symbols){
    try{priceMap[sym]=await fetchFugleQuote(sym,key);}
    catch(e){fails.push(sym+'（'+(e&&e.message?e.message:'失敗')+'）');}
    done++;showFugleMsg('更新中… '+done+'/'+symbols.length);
  }
  let updated=0;
  targets.forEach(t=>{if(priceMap[t.code]!==undefined){holdings[t.k][t.i].curPrice=fmtMinDp(String(priceMap[t.code]),CONFIG.dp.price);updated++;}});
  if(btn)btn.disabled=false;
  if(updated){
    if(S.trend&&S.vix&&S.rate)render();else renderRebalTable();
    lsSaveDebounced();
  }
  if(!fails.length){
    showFugleMsg('✅ 已更新 '+updated+' 檔現價（'+symbols.length+' 檔標的）');
  }else if(fails.length===symbols.length){
    const corsLikely=fails.some(f=>/Failed to fetch|NetworkError|load failed|fetch/i.test(f));
    showFugleMsg('❌ 全部更新失敗：'+(corsLikely?'瀏覽器直連富果可能被 CORS 擋（需改用代理）；亦可能是金鑰或網路問題。':'')+fails.slice(0,2).join('；'));
  }else{
    showFugleMsg('✓ 已更新 '+updated+' 檔；失敗 '+fails.length+' 檔：'+fails.slice(0,2).join('；'));
  }
}
