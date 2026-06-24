// Holdings panels: rows, totals, peak-risk, and stop-loss list
// 持股面板（修正 focus bug：用 DOM 事件綁定，不重建已存在的 input）
let openPanel=null;
function togglePanel(k){
  const panel=document.getElementById('panel-'+k);if(!panel)return;
  if(openPanel&&openPanel!==k){
    const prev=document.getElementById('panel-'+openPanel);
    if(prev){prev.classList.remove('open');const ic=document.getElementById('icon-'+openPanel);if(ic)ic.style.transform='';}
  }
  const isOpen=panel.classList.contains('open');
  if(!isOpen){
    panel.classList.add('open');
    const ic=document.getElementById('icon-'+k);if(ic)ic.style.transform='rotate(180deg)';
    openPanel=k;
    if(!panel.dataset.built)buildPanel(k);
    else updatePanelTotal(k);
  }else{
    panel.classList.remove('open');
    const ic=document.getElementById('icon-'+k);if(ic)ic.style.transform='';
    openPanel=null;
  }
}
function buildPanel(k){
  const panel=document.getElementById('panel-'+k);if(!panel)return;
  panel.dataset.built='1';
  const isCash=k==='cash';
  panel.innerHTML=`
    <div class="holding-header">
      <span class="holding-title">${LABELS[k]} ${isCash?'明細':'持股明細'}</span>
      <span class="holding-total">現值：<strong id="htotal-${k}">${isCash?'0 元':'0 萬'}</strong></span>
    </div>
    <div class="holding-rows" id="hrows-${k}"></div>
    ${isCash?'<div class="cash-contrib-hint" id="cash-contrib-hint" style="display:none;font-size:11px;color:var(--color-warning-text);padding:4px 8px"><i class="ti ti-info-circle"></i> 現金變動時，記得同步更新「總投入資金」</div>':'<button class="holding-add-btn" onclick="addHolding(\''+k+'\')">＋ 新增標的</button>'}`;
  rebuildRows(k);updatePanelTotal(k);
}
function rebuildRows(k){
  const container=document.getElementById('hrows-'+k);if(!container)return;
  container.innerHTML='';
  const isCash=k==='cash';
  function fp(l,inp){const d=document.createElement('div');d.className='field-pair';d.append(l,inp);return d;}
  holdings[k].forEach((r,i)=>{
    const row=document.createElement('div');row.className='holding-row';
    if(isCash){
      const lblA=document.createElement('label');lblA.textContent='金額';
      const inpA=document.createElement('input');
      inpA.className='inp-amt';inpA.type='number';inpA.placeholder='元';inpA.min='0';inpA.step='1';inpA.value=r.amt||'';
      inpA.addEventListener('input',function(){const v=parseFloat(this.value);holdings[k][i].amt=isNaN(v)||v<=0?'':String(v);updatePanelTotal(k);renderRebalTable();lsSaveDebounced();const hint=document.getElementById('cash-contrib-hint');if(hint&&TOTAL_CONTRIBUTED>0)hint.style.display='';});
      const lblU=document.createElement('label');lblU.textContent='元';
      const del=document.createElement('button');del.className='holding-del-btn';del.textContent='×';
      del.addEventListener('click',()=>delHolding(k,i));
      row.append(lblA,inpA,lblU,del);
    }else{
      const lblC=document.createElement('label');lblC.textContent='代號';
      const inpC=document.createElement('input');
      inpC.className='inp-code';inpC.type='text';inpC.placeholder='如 006208';inpC.maxLength=20;inpC.value=r.code||'';
      inpC.addEventListener('input',function(){
        holdings[k][i].code=this.value;
        updatePnLBadge();
        updatePeakBadge();
        updatePeakHint();
        renderRebalTable();
        if(k==='alpha')syncSellAdvisor(true);
        lsSaveDebounced();
      });
      const lblAvg=document.createElement('label');lblAvg.textContent='均價';
      const inpAvg=document.createElement('input');
      inpAvg.className='inp-avg';inpAvg.type='number';inpAvg.placeholder='元';inpAvg.min='0';inpAvg.step='0.01';inpAvg.value=fmtN(r.avgPrice,CONFIG.dp.price);
      const mvEl=document.createElement('span');mvEl.className='holding-mv';mvEl.style.display='none';
      const pnlBadgeEl=document.createElement('span');pnlBadgeEl.className='holding-pnl';pnlBadgeEl.style.display='none';
      const peakBadgeEl=document.createElement('span');peakBadgeEl.className='holding-pnl';peakBadgeEl.style.display='none';
      const lblPeak=document.createElement('label');lblPeak.textContent='高點';
      const inpPeak=document.createElement('input');
      inpPeak.className='inp-peak';inpPeak.type='number';inpPeak.placeholder='元';
      inpPeak.min='0';inpPeak.step='0.01';inpPeak.value=fmtN(r.peakPrice,CONFIG.dp.price);
      const peakHintEl=document.createElement('span');peakHintEl.className='peak-hint';
      function updateMvEl(){
        const c=parseFloat(holdings[k][i].curPrice),s=parseFloat(holdings[k][i].shares);
        if(!isNaN(c)&&!isNaN(s)&&s>0){mvEl.textContent=fNTD10k(c*s)+'萬';mvEl.style.display='';}
        else{mvEl.textContent='';mvEl.style.display='none';}
      }
      function updatePnLBadge(){
        const a=parseFloat(holdings[k][i].avgPrice),c=parseFloat(holdings[k][i].curPrice);
        if(isNaN(a)||a<=0||isNaN(c)||c<=0){pnlBadgeEl.style.display='none';return;}
        const pnl=(c-a)/a*100;
        pnlBadgeEl.className='holding-pnl '+(pnl<0?'pnl-neg':'pnl-pos');
        pnlBadgeEl.textContent=(pnl>=0?'+':'')+fPct(pnl)+'%';
        pnlBadgeEl.style.display='';
      }
      function updatePeakBadge(){
        const risk=getPeakRisk(k,holdings[k][i]);
        if(!risk){peakBadgeEl.style.display='none';return;}
        if(risk.level==='danger'){
          const label=risk.isProfit?'停利⚠':'停損⚠';
          peakBadgeEl.className='holding-pnl pnl-stop';
          peakBadgeEl.textContent=fPct(risk.pullback)+'% '+label;
        }else{
          peakBadgeEl.className='holding-pnl pnl-warn';
          peakBadgeEl.textContent=fPct(risk.pullback)+'% 留意';
        }
        peakBadgeEl.style.display='';
      }
      function updatePeakHint(){
        const cStr=holdings[k][i].curPrice;
        const aStr=holdings[k][i].avgPrice;
        const c=parseFloat(cStr),a=parseFloat(aStr),p=parseFloat(holdings[k][i].peakPrice);
        const hasCur=!isNaN(c)&&c>0;
        const hasAvg=!isNaN(a)&&a>0;
        if(!hasCur&&!hasAvg){peakHintEl.style.display='none';return;}
        const suggested=Math.max(hasCur?c:0,hasAvg?a:0);
        const peakOk=!isNaN(p)&&p>=suggested;
        if(peakOk){peakHintEl.style.display='none';return;}
        const suggestedStr=hasCur&&c>=a?cStr:aStr;
        peakHintEl.innerHTML='';
        const btn=document.createElement('button');
        btn.className='hwm-update-btn';
        btn.textContent='更新高點 '+suggestedStr;
        btn.addEventListener('click',function(){
          const fmtPeak=fmtN(suggestedStr,CONFIG.dp.price);
          holdings[k][i].peakPrice=fmtPeak;
          inpPeak.value=fmtPeak;
          peakHintEl.style.display='none';
          updatePeakBadge();
          renderRebalTable();
          lsSaveDebounced();
        });
        peakHintEl.appendChild(btn);
        peakHintEl.style.display='inline-flex';
      }
      inpAvg.addEventListener('input',function(){
        holdings[k][i].avgPrice=this.value;
        updatePnLBadge();
        updatePeakHint();
        updatePanelTotal(k);renderRebalTable();
        if(k==='alpha')syncSellAdvisor(false);
        lsSaveDebounced();
      });
      inpAvg.addEventListener('change',function(){fmtDecInput(this,CONFIG.dp.price);holdings[k][i].avgPrice=this.value;});
      const lblCur=document.createElement('label');lblCur.textContent='現價';
      const inpCur=document.createElement('input');
      inpCur.className='inp-cur';inpCur.type='number';inpCur.placeholder='元';inpCur.min='0';inpCur.step='0.01';inpCur.value=fmtN(r.curPrice,CONFIG.dp.price);
      inpCur.addEventListener('input',function(){
        holdings[k][i].curPrice=this.value;
        updateMvEl();updatePnLBadge();updatePeakBadge();updatePeakHint();
        updatePanelTotal(k);renderRebalTable();
        if(k==='alpha')syncSellAdvisor(false);
        lsSaveDebounced();
      });
      inpCur.addEventListener('blur',function(){
        updatePeakBadge();
        updatePeakHint();
      });
      inpCur.addEventListener('change',function(){fmtDecInput(this,CONFIG.dp.price);holdings[k][i].curPrice=this.value;});
      inpPeak.addEventListener('input',function(){
        holdings[k][i].peakPrice=this.value;
        updatePeakBadge();
        updatePeakHint();
        renderRebalTable();
        lsSaveDebounced();
      });
      inpPeak.addEventListener('change',function(){fmtDecInput(this,CONFIG.dp.price);holdings[k][i].peakPrice=this.value;});
      const lblSh=document.createElement('label');lblSh.textContent='股';
      const inpSh=document.createElement('input');
      inpSh.className='inp-shares';inpSh.type='number';inpSh.placeholder='股數';inpSh.min='0';inpSh.step='1';inpSh.value=r.shares||'';
      inpSh.addEventListener('input',function(){
        holdings[k][i].shares=this.value;
        updateMvEl();
        updatePanelTotal(k);renderRebalTable();
        if(k==='alpha')syncSellAdvisor(false);
        lsSaveDebounced();
      });
      const del=document.createElement('button');del.className='holding-del-btn';del.textContent='×';
      del.addEventListener('click',()=>delHolding(k,i));
      row.append(fp(lblC,inpC),fp(lblAvg,inpAvg),fp(lblCur,inpCur),fp(lblSh,inpSh),fp(lblPeak,inpPeak),mvEl,pnlBadgeEl,peakBadgeEl,peakHintEl,del);
      updateMvEl();
      updatePnLBadge();
      updatePeakBadge();
      updatePeakHint();
    }
    container.appendChild(row);
  });
}
function updatePanelTotal(k){
  const el=document.getElementById('htotal-'+k);if(!el)return;
  const total=getHoldingTotal(k);
  if(k==='cash')el.textContent=fNTD(total)+' 元';else el.textContent=fNTD10k(total)+' 萬';
  updateBarAmt(k);
}
function updateBarAmt(k){
  const el=document.getElementById('bar-amt-'+k);if(!el)return;
  const ref=currentTarget||BASE;
  const amt=fNTD10k(getCapitalBase()*ref[k]/100);
  const hold=getHoldingTotal(k);
  const holdStr=hold>0?fNTD10k(hold):'—';
  el.textContent=holdStr+' / '+amt+'萬';
  const dot=document.getElementById('dot-'+k);
  if(dot){dot.className='holding-dot '+(hold>0?'holding-dot-on':'holding-dot-off');}
}
function addHolding(k){
  holdings[k].push(k==='cash'?{amt:''}:{code:'',avgPrice:'',curPrice:'',shares:'',peakPrice:''});
  const panel=document.getElementById('panel-'+k);
  if(panel)delete panel.dataset.built;
  buildPanel(k);lsSaveDebounced();
}
function delHolding(k,i){
  if(k==='alpha'&&typeof sellState!=='undefined'&&sellState.idx!==null){
    if(i===sellState.idx){sellState.idx=null;resetSellChoices();}
    else if(i<sellState.idx){sellState.idx--;}
  }
  if(holdings[k].length===1)holdings[k][0]=k==='cash'?{amt:''}:{code:'',avgPrice:'',curPrice:'',shares:'',peakPrice:''};
  else holdings[k].splice(i,1);
  const panel=document.getElementById('panel-'+k);
  if(panel)delete panel.dataset.built;
  buildPanel(k);renderRebalTable();lsSaveDebounced();
}
function getHoldingTotal(k){
  if(k==='cash')return holdings[k].reduce((s,r)=>{const v=parseFloat(r.amt);return s+(isNaN(v)?0:v);},0);
  return holdings[k].reduce((s,r)=>{const p=parseFloat(r.curPrice),sh=parseFloat(r.shares);return s+(isNaN(p)||isNaN(sh)?0:p*sh);},0);
}
function getHoldingCost(k){
  if(k==='cash')return getHoldingTotal(k);
  return holdings[k].reduce((s,r)=>{const a=parseFloat(r.avgPrice),sh=parseFloat(r.shares);return s+(isNaN(a)||isNaN(sh)?0:a*sh);},0);
}
function getPeakRisk(k,r){
  const c=parseFloat(r.curPrice),p=parseFloat(r.peakPrice);
  if(isNaN(c)||c<=0||isNaN(p)||p<=0)return null;
  const thBase=HOLDING_THRESHOLDS[k];
  const isAlphaEtf=k==='alpha'&&isEtfCode(r.code);
  const th=k==='alpha'?(isAlphaEtf?thBase.etf:thBase.stock):thBase;
  const pullback=(c-p)/p*100;
  if(pullback>th.warn)return null;
  const level=pullback<=th.danger?'danger':'warn';
  const a=parseFloat(r.avgPrice);
  const isProfit=k==='alpha'&&!isNaN(a)&&a>0&&c>a;
  return{pullback,level,th,isProfit,cur:c,peak:p};
}
function refreshStopLoss(al){
  if(!al)al=document.getElementById('actions');if(!al)return;
  al.querySelectorAll('.stop-loss-item').forEach(el=>el.remove());
  const esc=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  let slHtml='';
  REBAL_KEYS.filter(k=>k!=='cash').forEach(k=>{
    holdings[k].forEach(r=>{
      const risk=getPeakRisk(k,r);
      if(risk){
        // Peak-based risk (primary)
        const code=esc(r.code||'未命名');
        const th=risk.th;
        const isDanger=risk.level==='danger';
        const action=isDanger?th.dangerAction:th.warnAction;
        const label=k==='alpha'?(risk.isProfit?'停利':'停損'):LABELS[k];
        const icon=isDanger?'ti-alert-triangle':'ti-alert-circle';
        const color=isDanger?'var(--color-danger-text)':'var(--color-warning-text)';
        slHtml+=`<li class="action-item stop-loss-item">
          <i class="ti ${icon}" style="color:${color}"></i>
          <span style="color:${color}">
            <strong>${label}：${code}</strong>
            從高點回撤 ${fPct(risk.pullback)}%　${action}
          </span>
        </li>`;
      }else if(k==='alpha'){
        // Backward-compat: avg-based stop-loss when no peak is set
        const avg=parseFloat(r.avgPrice),cur=parseFloat(r.curPrice);
        if(!isNaN(avg)&&avg>0&&!isNaN(cur)&&cur>0){
          const isEtf=isEtfCode(r.code);
          const alphaTh=HOLDING_THRESHOLDS.alpha;
          const stopLine=isEtf?alphaTh.etf.danger:alphaTh.stock.danger;
          const pnl=(cur-avg)/avg*100;
          if(pnl<=stopLine){
            const code=esc(r.code||'未命名');
            slHtml+=`<li class="action-item stop-loss-item">
              <i class="ti ti-alert-triangle" style="color:var(--color-danger-text)"></i>
              <span style="color:var(--color-danger-text)">
                <strong>停損警示：${code}</strong>
                虧損 ${fPct(pnl)}%，已觸及 ${stopLine}% 閾值（建議設定高點以啟用完整追蹤）
              </span>
            </li>`;
          }
        }
      }
    });
  });
  if(slHtml)al.insertAdjacentHTML('beforeend',slHtml);
}
