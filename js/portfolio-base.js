// Hard rules, rebalance keys, holdings store, and NAV/capital-base helpers
const RULES_BASE=[
  {name:'內核 Beta',    ok:['永久核心，季再平衡'],        no:['絕對不主動調整']},
  {name:'外核 Global',  ok:['永久核心，季再平衡'],        no:['絕對不主動調整']},
  {name:'防禦 Vol-Abs', ok:['熊市加碼','過熱減碼'],       no:[]},
  {name:'衛星 Alpha',   ok:['唯一主動操作層','可停利換股'],no:['依高點回撤與風險線控管停損 / 停利']},
  {name:'避險 Hedge',   ok:['逆週期使用'],                no:['不長期重壓']},
  {name:'現金 Option',  ok:['永遠存在','崩盤最大火力'],   no:[]}
];
const REBAL_KEYS=Object.keys(BASE);
const holdings={};
REBAL_KEYS.forEach(k=>{holdings[k]=k==='cash'?[{amt:''}]:[{code:'',avgPrice:'',curPrice:'',shares:'',peakPrice:''}];});

function getCurrentNAV(){
  return REBAL_KEYS.reduce((s,k)=>s+getHoldingTotal(k),0);
}
function getCapitalBase(){
  const nav=getCurrentNAV();
  return nav>0?nav:HIGH_WATER_MARK;
}
function getHwmLabel(){
  return HIGH_WATER_MARK>0?`高水位 ${fNTD(HIGH_WATER_MARK)} 元`:'高水位 — 元';
}
function getContributedLabel(){
  return TOTAL_CONTRIBUTED>0?`總投入 ${fNTD(TOTAL_CONTRIBUTED)} 元`:'總投入 — 元';
}
