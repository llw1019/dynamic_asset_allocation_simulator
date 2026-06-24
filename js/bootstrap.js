// Render/rebuild hooks, startup sequence, service-worker registration
// Hook: refresh dropdown whenever render() rebuilds bars (which rebuilds panels)
const _origRender=render;
render=function(){
  _origRender();
  syncSellAdvisor(true);
};
// Also refresh when holdings change via panel operations
const _origRebuildRows=rebuildRows;
rebuildRows=function(k){
  _origRebuildRows(k);
  if(k==='alpha')syncSellAdvisor(true);
};

initStaticTexts();
lsLoad();
onBuyTypeChange();
refreshSellAdvisorDropdown();
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
