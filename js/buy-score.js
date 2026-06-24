// Target buy-in scoring engine
function getBuyMarketScore(regime){
  if(regime==='bull')return CONFIG.buyScore.weights.market.bull;
  if(regime==='range')return CONFIG.buyScore.weights.market.range;
  return CONFIG.buyScore.weights.market.bear;
}
function getBuyAction(type,total,trendScore,regime,distancePct,volState,premiumPct){
  const isSingleName=type==='stock';
  const hard=[];
  const absDistance=distancePct===null?null:Math.abs(distancePct);
  const cfgSingle=CONFIG.buyScore.single;
  const cfgEtf=CONFIG.buyScore.etf;
  const distLimit=CONFIG.buyScore.distanceLimit;
  if(regime==='extremeBear')hard.push('Extreme Bear：拒絕新增風險資產');
  if(isSingleName&&regime==='bear')hard.push('Bear regime：個股不新增，僅觀察');
  if(isSingleName&&trendScore<cfgSingle.trendThreshold)hard.push(`拒絕進場：個股趨勢分數未達 ${cfgSingle.trendThreshold}`);
  if(absDistance!==null&&absDistance>distLimit)hard.push(`拒絕追價：距離均線絕對值超過 ${distLimit}%`);
  if(volState==='panic')hard.push('拒絕進場：爆量長黑 / 跳空下跌 / 急跌');
  if(premiumPct!==null){
    if(premiumPct>=CONFIG.etfPremium.vetoThreshold)hard.push(`拒絕追價：ETF 溢價達 ${premiumPct}% (≥ ${CONFIG.etfPremium.vetoThreshold}%)`);
  }
  if(hard.length){
    let label='拒絕進場 / 只觀察';
    if(regime==='extremeBear')label='拒絕進場：Extreme Bear';
    else if(isSingleName&&trendScore<cfgSingle.trendThreshold)label='拒絕進場：趨勢未達標';
    else if(volState==='panic')label='拒絕進場：波動失控';
    else if(absDistance!==null&&absDistance>distLimit)label='拒絕追價：距離過遠';
    else if(premiumPct!==null&&premiumPct>=CONFIG.etfPremium.vetoThreshold)label='拒絕進場：溢價過高';
    return{label,cls:'buy-result-bad',pace:'硬性否決條件成立',hard};
  }
  if(isSingleName){
    if(total>=cfgSingle.good&&trendScore>=cfgSingle.trendThreshold)return{label:'可考慮小量布局',cls:'buy-result-warn',pace:'單筆不超過預定部位 10–15%',hard};
    if(total>=cfgSingle.warn)return{label:'觀察，不急著買',cls:'buy-result-warn',pace:`總分未達個股門檻 ${cfgSingle.good}`,hard};
    return{label:'不碰',cls:'buy-result-bad',pace:'分數不足',hard};
  }
  if(regime==='bear'){
    if(total>=cfgEtf.warn)return{label:'可小量防禦式布局',cls:'buy-result-warn',pace:'Bear regime 僅試單 10–15%，不要一次買滿',hard};
    if(total>=cfgEtf.observe)return{label:'觀察，不急著買',cls:'buy-result-warn',pace:'Bear regime 等待回穩或折價更明顯',hard};
    return{label:'不碰',cls:'buy-result-bad',pace:'Bear regime 下風險報酬不佳',hard};
  }
  if(total>=cfgEtf.good)return{label:'可正常分批布局',cls:'buy-result-good',pace:'分 3–4 筆，單筆不超過預定部位 25%',hard};
  if(total>=cfgEtf.warn)return{label:'可小量布局',cls:'buy-result-warn',pace:'先試 10–15%，不要一次買滿',hard};
  if(total>=cfgEtf.observe)return{label:'觀察，不急著買',cls:'buy-result-warn',pace:'等待回到更合理的位置',hard};
  return{label:'不碰',cls:'buy-result-bad',pace:'風險報酬不佳',hard};
}
function onBuyTypeChange(){
  const type=document.getElementById('buy-type').value;
  const input=document.getElementById('buy-etf-premium');
  const block=input.closest('.buy-field');
  if(type==='etf'){
    block.style.display='';
  }else{
    block.style.display='none';
    input.value='';
  }
  calcBuyScore();
}
function calcBuyScore(){
  const list=document.getElementById('buy-score-list');
  const totalEl=document.getElementById('buy-score-total');
  const actionEl=document.getElementById('buy-score-action');
  const notesEl=document.getElementById('buy-score-notes');
  if(!list||!totalEl||!actionEl||!notesEl)return;
  const type=document.getElementById('buy-type').value;
  const price=parseFloat(document.getElementById('buy-price').value);
  const premiumInput=document.getElementById('buy-etf-premium').value;
  const parsedPremium=parseFloat(premiumInput);
  const premiumPct=(type==='etf' && !isNaN(parsedPremium)) ? parsedPremium : null;
  const ma=parseFloat(document.getElementById('buy-ma60').value);
  const trendStateInput=document.getElementById('buy-trend').value;
  const flowState=document.getElementById('buy-flow').value;
  const volState=document.getElementById('buy-vol').value;
  const w=CONFIG.buyScore.weights;
  const trendScores=w.trend;
  const flowScores=w.flow;
  const volScores=w.vol;
  const trendScore=trendScores[trendStateInput]??0;
  const distancePct=(!isNaN(price)&&!isNaN(ma)&&price>0&&ma>0)?(price-ma)/ma*100:null;
  const absDistance=distancePct===null?null:Math.abs(distancePct);
  let distanceScore=0;
  if(absDistance!==null){
    if(absDistance<=3)distanceScore=w.distance.close;
    else if(absDistance<=6)distanceScore=w.distance.med;
    else if(absDistance<=CONFIG.buyScore.distanceLimit)distanceScore=w.distance.far;
  }
  const marketReady=!!(S.trend&&S.vix&&S.rate);
  const priceReady=!isNaN(price)&&price>0;
  const maReady=!isNaN(ma)&&ma>0;
  const trendReady=trendStateInput!=='';
  const flowReady=flowState!=='';
  const volReady=volState!=='';
  const premiumReady=(type!=='etf'||premiumPct!==null);
  const allReady=marketReady&&priceReady&&maReady&&trendReady&&flowReady&&volReady&&premiumReady;
  const regime=marketReady?getRegime():null;
  const marketScore=marketReady?getBuyMarketScore(regime):0;
  const flowScore=flowScores[flowState]??0;
  const volScore=volScores[volState]??0;
  const total=trendScore+distanceScore+marketScore+flowScore+volScore;
  const rows=[
    ['趨勢',trendScore,w.trend.healthy],
    ['距離(|均線|)',distanceScore,w.distance.close],
    ['市場風險(DAA)',marketScore,w.market.bull],
    ['籌碼',flowScore,w.flow.stable],
    ['波動',volScore,w.vol.normal]
  ];
  list.innerHTML=rows.map(([name,score,max])=>`
    <div class="score-row">
      <span title="${name}">${name}</span>
      <div class="score-track"><div class="score-fill" style="width:${Math.round(score/max*100)}%"></div></div>
      <span class="score-val">${score}/${max}</span>
    </div>`).join('');
  const action=allReady?getBuyAction(type,total,trendScore,regime,distancePct,volState,premiumPct):{label:'',cls:'',pace:'',hard:[]};
  const missing=[];
  if(!marketReady)missing.push('DAA 市場判斷');
  if(!priceReady)missing.push('現價');
  if(!maReady)missing.push('參考均線');
  if(!trendReady)missing.push('趨勢結構');
  if(!flowReady)missing.push('籌碼');
  if(!volReady)missing.push('波動風險');
  if(!premiumReady)missing.push('折溢價');
  totalEl.textContent=allReady?`${total} / 100`:'— / 100';
  actionEl.className=`buy-result-action ${allReady?action.cls:'buy-result-warn'}`;
  actionEl.textContent=allReady?action.label:'請先填寫：'+missing.join('、');
  const notes=[];
  if(distancePct===null)notes.push(['ti-info-circle','請輸入現價與參考均線；距離分數採絕對距離計算']);
  else notes.push(['ti-ruler','距離均線 '+(distancePct>=0?'+':'')+fPct(distancePct)+'%，計分使用絕對值 '+fPct(absDistance)+'%']);
  notes.push(['ti-scale','距離只判斷遠近，不判斷多空方向；方向由趨勢分數處理']);
  if(marketReady)notes.push(['ti-radar','市場風險由 DAA 自動帶入：'+REGIME_META[regime].label+'，本評分器不改變配置比例']);
  else notes.push(['ti-radar','市場風險分需先完成 DAA Regime 判斷']);
  notes.push(['ti-player-play','建議節奏：'+(allReady?action.pace:'等待所有欄位完成')]);
  if(allReady)action.hard.forEach(t=>notes.push(['ti-alert-triangle',t]));
  if(premiumPct!==null){
    if(premiumPct>=CONFIG.etfPremium.warnThreshold && premiumPct<CONFIG.etfPremium.vetoThreshold){
      notes.push(['ti-alert-circle', `溢價偏高 (${premiumPct}%)，達警戒門檻 (${CONFIG.etfPremium.warnThreshold}%)，請留意買貴風險`]);
    } else if(premiumPct<=CONFIG.etfPremium.discountNotify){
      notes.push(['ti-thumb-up', `目前折價 (${premiumPct}%)，具備安全邊際`]);
    }
  }
  notes.push(['ti-shield-check','即使高分，也禁止 All-in、追高或忽略部位上限']);
  notes.push(['ti-clock','本評分器假設中長期佈局視角（參考均線預設 60MA），短線操作請自行判斷']);
  notesEl.innerHTML=notes.map(([icon,text])=>`<div class="buy-note"><i class="ti ${icon}"></i><span>${text}</span></div>`).join('');
}
