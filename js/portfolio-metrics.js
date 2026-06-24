// High-water mark, contributed capital, rebalance table, drawdown, P&L
function checkHWM(){
  const total=REBAL_KEYS.reduce((s,k)=>s+getHoldingTotal(k),0);
  const cost=REBAL_KEYS.reduce((s,k)=>s+getHoldingCost(k),0);
  const fund=HIGH_WATER_MARK;
  const suggested=Math.max(total,cost);
  const bar=document.getElementById('hwm-bar');if(!bar)return;
  if(fund<=0&&(total>0||cost>0)){
    bar.style.display='flex';
    bar.innerHTML='<i class="ti ti-info-circle" style="color:var(--color-beta)"></i> 尚未設定高水位 <button class="hwm-update-btn" onclick="updateHWM('+Math.round(suggested)+')">設為 '+fNTD(suggested)+' 元</button>';
  }else if(total>fund+1&&fund>0){
    bar.style.display='flex';
    bar.innerHTML='<i class="ti ti-trophy" style="color:var(--color-icon-ok)"></i> 持倉淨值 '+fNTD(total)+' 元已超過高水位 '+fNTD(fund)+' 元 <button class="hwm-update-btn" onclick="updateHWM('+Math.round(suggested)+')">更新高水位</button>';
  }else if(cost>fund+1&&fund>0&&cost>0){
    bar.style.display='flex';
    bar.innerHTML='<i class="ti ti-alert-circle" style="color:var(--color-icon-warn)"></i> 高水位 '+fNTD(fund)+' 元低於持倉成本 '+fNTD(cost)+' 元，回撤計算可能失真 <button class="hwm-update-btn" onclick="updateHWM('+Math.round(cost)+')">修正為 '+fNTD(cost)+' 元</button>';
  }else{bar.style.display='none';}
}
function updateHWM(ntd){
  HIGH_WATER_MARK=ntd;document.getElementById('fund-input').value=ntd;
  updateFundStatus();
  document.getElementById('hwm-bar').style.display='none';
  if(S.trend&&S.vix&&S.rate)render();lsSaveDebounced();
}
function checkContributed(){
  const cost=REBAL_KEYS.reduce((s,k)=>s+getHoldingCost(k),0);
  const bar=document.getElementById('contributed-bar');if(!bar)return;
  if(TOTAL_CONTRIBUTED<=0&&cost>0){
    bar.style.display='flex';
    bar.innerHTML='<i class="ti ti-info-circle" style="color:var(--color-beta)"></i> 尚未設定總投入資金 <button class="hwm-update-btn" onclick="updateContributed('+Math.round(cost)+')">設為持倉成本 '+fNTD(cost)+' 元</button>';
  }else{bar.style.display='none';}
}
function updateContributed(ntd){
  TOTAL_CONTRIBUTED=ntd;document.getElementById('contributed-input').value=ntd;
  document.getElementById('contributed-bar').style.display='none';
  renderPnL();lsSaveDebounced();
}

function updateFundStatus(){
  const nav=getCurrentNAV();
  const fundLabel=document.getElementById('fund-label');
  const fd=document.getElementById('fund-display');
  if(nav>0)fundLabel.textContent=`計算基準：持倉淨值 ${fNTD(nav)} 元`;
  else if(HIGH_WATER_MARK>0)fundLabel.textContent=`計算基準：高水位 ${fNTD(HIGH_WATER_MARK)} 元`;
  else fundLabel.textContent='高水位 — 元';
  if(HIGH_WATER_MARK>0&&nav>0&&nav>HIGH_WATER_MARK+1)fd.textContent=`⚠ 高水位低於持倉淨值 ${fNTD(nav)} 元，回撤計算可能失真`;
  else fd.textContent='歷史最高市值，用於回撤與配置計算';
}
function renderRebalTable(){
  const tbody=document.getElementById('rebal-body');if(!tbody)return;
  let tbodyHtml='';
  const ref=currentTarget||BASE;
  const capitalBase=getCapitalBase();
  updateFundStatus();
  let totalTgt=0,totalHolding=0;
  REBAL_KEYS.forEach(k=>{
    const tgtPct=ref[k],tgtAmt=capitalBase*tgtPct/100;
    const holdAmt=getHoldingTotal(k);
    const holdPct=capitalBase>0?+fPct(holdAmt/capitalBase*100):0;
    const diffPct=+fPct(holdPct-tgtPct);
    const threshold=REBAL_THRESHOLD[k];
    const warn=holdAmt>0&&Math.abs(diffPct)>=threshold;
    totalTgt+=tgtAmt;totalHolding+=holdAmt;
    const diffAmt=Math.abs(tgtAmt-holdAmt);
    const advice=diffPct>0?`偏高，建議減碼 ≈ ${fNTD10k(diffAmt)} 萬`:(diffPct<0?`偏低，建議加碼 ≈ ${fNTD10k(diffAmt)} 萬`:'維持');
    const note=threshold<5?`(門檻${threshold}%)`:'';
    tbodyHtml+=`<tr>
      <td>${LABELS[k]}</td><td class="col-tgt-pct">${tgtPct}%</td><td>${fNTD10k(tgtAmt)}</td>
      <td style="cursor:pointer;color:${COLORS[k]};font-weight:500" onclick="togglePanel('${k}')">${holdAmt>0?fNTD10k(holdAmt):'— 點擊輸入'}</td>
      <td class="col-hold-pct">${holdAmt>0?holdPct+'%':'—'}</td>
      <td class="${warn?'rebal-warn':'rebal-ok'}">${holdAmt>0?(diffPct>0?'+':'')+diffPct+'%':'—'}</td>
      <td class="${warn?'rebal-warn':'rebal-ok'}">${holdAmt>0?(warn?'⚠ '+advice+note:'—'):'—'}</td>
    </tr>`;
  });
  tbody.innerHTML=tbodyHtml;
  document.getElementById('rebal-tgt-total').textContent=fNTD10k(totalTgt)+' 萬';
  document.getElementById('rebal-holding-total').textContent=fNTD10k(totalHolding)+' 萬';
  document.getElementById('rebal-total-pct').textContent=(totalHolding>0&&capitalBase>0)?+fPct(totalHolding/capitalBase*100)+'%':'—';
  const tmEl=document.getElementById('rebal-total-msg');
  if(totalHolding===0||capitalBase<=0){tmEl.textContent=HIGH_WATER_MARK<=0?'請先設定高水位':'尚未輸入持倉';tmEl.className='rebal-total-ok';}
  else{tmEl.textContent='';tmEl.className='rebal-total-ok';}
  const ddEl=document.getElementById('drawdown-area');
  const navRaw=getCurrentNAV();
  if(ddEl&&navRaw>0&&HIGH_WATER_MARK>0){
    const dd=+fPct(((HIGH_WATER_MARK-navRaw)/HIGH_WATER_MARK)*100);
    if(dd>=CONFIG.drawdown.danger){ddEl.className='drawdown-bar dd-danger';ddEl.innerHTML='<i class="ti ti-alert-triangle" style="font-size:13px"></i> 組合回撤 '+dd+'%（門檻 '+CONFIG.drawdown.danger+'%）— 建議立即檢視衛星與高風險部位，考慮減碼';}
    else if(dd>=CONFIG.drawdown.warn){ddEl.className='drawdown-bar dd-warn';ddEl.innerHTML='<i class="ti ti-alert-circle" style="font-size:13px"></i> 組合回撤 '+dd+'% — 接近門檻，請留意';}
    else if(dd>0){ddEl.className='drawdown-bar dd-ok';ddEl.textContent='組合回撤 '+dd+'%，在安全範圍內';}
    else{ddEl.className='drawdown-bar dd-ok';ddEl.textContent=navRaw>HIGH_WATER_MARK?'持倉淨值超過高水位 +'+(-dd)+'%':'持倉淨值與高水位一致';}
    ddEl.style.display='flex';
  }else if(ddEl){ddEl.style.display='none';}
  checkHWM();
  checkContributed();
  renderPnL();
  refreshStopLoss();
}
function renderPnL(){
  const el=document.getElementById('pnl-area');if(!el)return;
  const nav=getCurrentNAV();
  if(nav<=0||TOTAL_CONTRIBUTED<=0){el.style.display='none';return;}
  let estSellCost=0;
  REBAL_KEYS.forEach(k=>{if(k==='cash')return;holdings[k].forEach(r=>{
    const p=parseFloat(r.curPrice),sh=parseFloat(r.shares),code=r.code||'';
    if(isNaN(p)||isNaN(sh)||p<=0||sh<=0)return;
    const mv=p*sh;
    estSellCost+=Math.floor(mv*CONFIG.tradingCost.commission)+Math.floor(mv*(isEtfCode(code)?CONFIG.tradingCost.etfTax:CONFIG.tradingCost.stockTax));
  });});
  const cost=REBAL_KEYS.reduce((s,k)=>s+getHoldingCost(k),0);
  const totalPnL=Math.round(nav-TOTAL_CONTRIBUTED-estSellCost);
  const unrealized=Math.round(nav-cost-estSellCost);
  const realized=totalPnL-unrealized;
  const returnPct=fPct2(totalPnL/TOTAL_CONTRIBUTED*100);
  function pnlClass(v){return v>0?'pnl-positive':v<0?'pnl-negative':'pnl-zero';}
  function fNTDSigned(v){return (v>0?'+':'')+v.toLocaleString();}
  el.innerHTML=`<div class="pnl-row"><span>總損益 (淨值 − 投入 − 費用)</span><span class="${pnlClass(totalPnL)}">${fNTDSigned(totalPnL)} 元 (${totalPnL>0?'+':''}${returnPct}%)</span></div>`+
    `<div class="pnl-row"><span>未實現損益 (扣預估賣出費用)</span><span class="${pnlClass(unrealized)}">${fNTDSigned(unrealized)} 元</span></div>`+
    `<div class="pnl-row"><span>已實現損益 (推算：總損益 − 未實現)</span><span class="${pnlClass(realized)}">${fNTDSigned(realized)} 元</span></div>`+
    `<div class="pnl-row" style="font-size:11px;color:var(--color-text-tertiary)"><span>預估賣出費用 (手續費${(CONFIG.tradingCost.commission*100).toFixed(4)}% + 稅)</span><span>${estSellCost.toLocaleString()} 元</span></div>`;
  el.style.display='block';
}
