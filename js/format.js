// Shared formatters, debounce, and VIX-source helpers
const fPct=v=>(v!==null&&v!==''&&Number.isFinite(Number(v)))?Number(v).toFixed(CONFIG.dp.pct):'—';
const fPct2=v=>(v!==null&&v!==''&&Number.isFinite(Number(v)))?Number(v).toFixed(CONFIG.dp.pct2):'—';
function fmtMinDp(v,dp){
  const s=String(v??'').trim();
  if(s===''||!Number.isFinite(Number(s)))return'';
  const m=s.match(/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if(!m||m[4]!==undefined)return fmtMinDp(Number(s).toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:20}),dp);
  const sign=m[1],intPart=m[2]||'0',dec=m[3];
  if(dec===undefined)return sign+intPart+'.'+'0'.repeat(dp);
  return dec.length>=dp?sign+intPart+'.'+dec:sign+intPart+'.'+dec.padEnd(dp,'0');
}
function fmtDecInput(el,dp){el.value=fmtMinDp(el.value,dp);}
function fmtN(v,dp){return fmtMinDp(v,dp);}
function formatStaticDecInputs(){
  ['vix-input'].forEach(id=>{ const el=document.getElementById(id); if(el)fmtDecInput(el,CONFIG.dp.pct); });
  ['rate-now','rate-prev'].forEach(id=>{ const el=document.getElementById(id); if(el)fmtDecInput(el,CONFIG.dp.rate); });
}
const fNTD10k=v=>(v!==null&&v!==''&&Number.isFinite(Number(v)))?(Number(v)/10000).toFixed(CONFIG.dp.ntk):(0).toFixed(CONFIG.dp.ntk);
const fNTD=v=>(v!==null&&v!==''&&Number.isFinite(Number(v)))?Math.round(Number(v)).toLocaleString():'0';
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}
function getVixConfig(){return S.vixSource==='tw'?CONFIG.vixtwn:CONFIG.vix;}
function getVixName(){return S.vixSource==='tw'?'VIXTWN':'VIX';}
function getVixInputName(){return S.vixSource==='tw'?'VIXTWN':'^VIX';}
