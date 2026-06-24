// Main render() — banner, allocation bars, actions, memo, rules, warnings
function render(){
  const regime=getRegime(),target=calcTarget(regime),meta=REGIME_META[regime];
  currentTarget=target;
  const capitalBase=getCapitalBase();
  const banner=document.getElementById('regime-banner');
  banner.className=`regime-banner ${meta.bannerCls}`;
  document.getElementById('regime-dot').style.background=meta.dotColor;
  document.getElementById('regime-name').textContent=meta.label;
  document.getElementById('regime-sub').textContent=meta.sub;
  const trigEl=document.getElementById('regime-trigger');
  if(regime==='bear'||regime==='extremeBear'){const t=getBearTrigger();trigEl.innerHTML=t?`<span class="trigger-tag ${t.cls}">${t.label}</span>`:'';}
  else trigEl.innerHTML='';
  const modRow=document.getElementById('modifier-row');
  let modHtml='';
  if(S.rate==='rising')modHtml=`<span class="mod-tag mod-rising">↑ 升息 Modifier：避險 −5%，現金 +5%</span>`;
  else if(S.rate==='falling'&&regime!=='bull')modHtml=`<span class="mod-tag mod-falling">↓ 降息 Modifier：非牛市不增配避險債券，也不消耗現金</span>`;
  else if(S.rate==='falling')modHtml=`<span class="mod-tag mod-falling">↓ 降息 Modifier：避險 +5%，現金 −5%</span>`;
  else modHtml=`<span class="mod-tag mod-neutral">利率穩定，無修正因子</span>`;
  const cashDeploy=getCashDeployStatus(regime);
  if(cashDeploy)modHtml+=`<span class="mod-tag ${cashDeploy.cls}">${cashDeploy.label}</span>`;
  modRow.innerHTML=modHtml;

  const barsEl=document.getElementById('bars');
  let barsHtml='';
  const keys=Object.keys(BASE);
  const maxVal=Math.max(...keys.map(k=>Math.max(BASE[k],target[k])));
  keys.forEach(k=>{
    const b=BASE[k],t=target[k],diff=t-b;
    const bPct=Math.round(b/maxVal*100),tPct=Math.round(t/maxVal*100);
    const dc=diff>0?'delta-up':diff<0?'delta-dn':'delta-ne';
    const ds=diff>0?`+${diff}%`:diff<0?`${diff}%`:'±0';
    const amt=fNTD10k(capitalBase*t/100);
    const hold=getHoldingTotal(k);
    const holdStr=hold>0?fNTD10k(hold):'—';
    const dotCls=hold>0?'holding-dot-on':'holding-dot-off';
    const isFixed=FIXED_KEYS.includes(k);
    barsHtml+=`
      <div class="bar-row" onclick="togglePanel('${k}')">
        <span class="bar-label"><span class="holding-dot ${dotCls}" id="dot-${k}"></span><span class="bar-nature ${isFixed?'bar-nature-fixed':'bar-nature-dyn'}">${isFixed?'固':'動'}</span>${LABELS[k]}</span>
        <div class="bar-track">
          <div class="bar-base-fill" style="width:${bPct}%"></div>
          <div class="bar-target-fill" style="width:${tPct}%;background:${COLORS[k]}"></div>
        </div>
        <span class="bar-val">${t}%</span><span class="bar-amt" id="bar-amt-${k}">${holdStr} / ${amt}萬</span>
        <span class="delta-badge ${dc}">${ds}</span>
        <i class="ti ti-chevron-down expand-icon" id="icon-${k}"></i>
      </div>
      <div class="holding-panel" id="panel-${k}"></div>`;
  });
  barsEl.innerHTML=barsHtml;

  if(openPanel){
    const p=document.getElementById('panel-'+openPanel);
    if(p){p.classList.add('open');buildPanel(openPanel);const ic=document.getElementById('icon-'+openPanel);if(ic)ic.style.transform='rotate(180deg)';}
  }

  const al=document.getElementById('actions');
  let alHtml='';
  getActionItems(regime,target,S.rate).forEach(a=>{alHtml+=`<li class="action-item"><i class="ti ${a.icon}"></i><span>${a.text}</span></li>`;});
  al.innerHTML=alHtml;
  const memoEl=document.getElementById('memo');
  const memoText=getMemo(regime,target);
  const memoParts=memoText.split('\n\n');
  if(memoParts.length>1){
    const isWarn=memoParts[1].startsWith('⚠');
    memoEl.innerHTML=memoParts[0]+'<div class="memo-hint'+(isWarn?' memo-hint-warn':'')+'">'+memoParts.slice(1).join('<br>')+'</div>';
  }else{memoEl.textContent=memoText;}
  renderRebalTable();
  calcBuyScore();

  const rg=document.getElementById('rules-grid');rg.innerHTML='';
  RULES_BASE.forEach(r=>{
    const ok=r.ok.map(l=>`<p class="rule-line ok"><i class="ti ti-check" style="font-size:11px"></i> ${l}</p>`).join('');
    const no=r.no.map(l=>`<p class="rule-line no"><i class="ti ti-x" style="font-size:11px"></i> ${l}</p>`).join('');
    rg.innerHTML+=`<div class="rule-item"><p class="rule-name">${r.name}</p>${ok}${no}</div>`;
  });

  const wa=document.getElementById('warn-area');wa.innerHTML='';
  const vv=S.vixVal;
  const vixCfg=getVixConfig(),vixName=getVixName();
  if(inExtremeBear&&vv!==null&&vv>vixCfg.extremeExit)
    wa.innerHTML=`<div class="warn-box warn-box-extreme"><i class="ti ti-alert-triangle" style="font-size:13px;margin-right:4px"></i>極端恐慌 Hysteresis 鎖定：${vixName} ${fPct(vv)}。停止一切加碼，等待 ${vixName} 回落至 ${vixCfg.extremeExit} 以下才解除熊市防禦。</div>`;
  else if(regime==='extremeBear')
    wa.innerHTML=`<div class="warn-box"><i class="ti ti-alert-triangle" style="font-size:13px;margin-right:4px"></i>硬規則：衛星標的出現跳空缺口或單日跌幅 > ${CONFIG.singleDayDropWarn}%，禁止動用現金加碼。等待 ${vixName} 回落至 ${vixCfg.extremeExit} 以下才解除極端防禦。</div>`;
  else if(regime==='bear')
    wa.innerHTML=`<div class="warn-box"><i class="ti ti-alert-triangle" style="font-size:13px;margin-right:4px"></i>硬規則：衛星標的出現跳空缺口或單日跌幅 > ${CONFIG.singleDayDropWarn}%，禁止動用現金加碼。等待 ${vixName} 回落至 ${vixCfg.high} 以下再評估進場。</div>`;
  else if(S.vix==='high')
    wa.innerHTML=`<div class="warn-box"><i class="ti ti-alert-triangle" style="font-size:13px;margin-right:4px"></i>${vixName} > ${vixCfg.high} 高恐慌區間。現金保留充足備用，嚴禁一次性重壓。</div>`;
  else if(indexPct!==null&&indexPct>CONFIG.ma60.overheat)
    wa.innerHTML=`<div class="warn-box"><i class="ti ti-alert-triangle" style="font-size:13px;margin-right:4px"></i>指數高於60MA +${fPct(indexPct)}%，屬於過熱區。維持配置紀律，新增資金等待回測或明確折價，不因強漲追高。</div>`;
  else if(S.vix==='medium'&&regime==='range')
    wa.innerHTML=`<div class="warn-box"><i class="ti ti-alert-triangle" style="font-size:13px;margin-right:4px"></i>${vixName} 位於中恐慌區間。市場可維持均衡，但新增 Alpha 應以小量分批與買入評分為準。</div>`;
}
