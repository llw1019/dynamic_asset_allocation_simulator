// Static configuration: allocation weights, thresholds, labels, colors, CONFIG
const BASE={beta:30,global:20,defense:20,alpha:10,hedge:10,cash:10};
const REGIME_WEIGHTS={
  bull: {beta:30,global:20,defense:15,alpha:15,hedge:5, cash:15},
  bear: {beta:30,global:20,defense:25,alpha:5, hedge:10,cash:10},
  extremeBear:{beta:30,global:20,defense:25,alpha:0,hedge:10,cash:15},
  range:{beta:30,global:20,defense:20,alpha:10,hedge:10,cash:10}
};
const RATE_MODIFIER={rising:{hedge:-5,cash:+5},falling:{hedge:+5,cash:-5},stable:{}};
const REBAL_THRESHOLD={beta:5,global:5,defense:5,alpha:3,hedge:3,cash:5};
const LABELS={beta:'內核 Beta',global:'外核 Global',defense:'防禦 Vol-Abs',alpha:'衛星 Alpha',hedge:'避險 Hedge',cash:'現金 Option'};
// Chart colors. COLORS.beta must stay in sync with CSS var --color-beta (light:#378ADD).
const COLORS={beta:'#378ADD',global:'#7F77DD',defense:'#1D9E75',alpha:'#D85A30',hedge:'#D4537E',cash:'#C8C6C0'};
const FIXED_KEYS=['beta','global'];
const DATA_VERSION='v12';
const isEtfCode=code=>String(code||'').trim().startsWith('00');
const SELL_TYPE_LABELS={etf:'產業 / 主題 ETF',tech:'一般電子 / AI 股',bio:'生技 / 高波動題材股'};
const CONFIG={
  vix:{medium:20,high:30,extremeEnter:35,extremeExit:25},
  vixtwn:{medium:30,high:40,extremeEnter:45,extremeExit:40},
  trend:{threshold:2,bearEnter:-5,bearExit:3,bullEnter:3,bullExit:-2},
  rate:{threshold:0.25},
  drawdown:{warn:5,danger:8},
  minCashBear:10,
  singleDayDropWarn:3,
  concentration:{high:50,medium:30,innerMin:20},
  tradingCost:{commission:0.001425,etfTax:0.001,stockTax:0.003},
  debounce:{lsSave:300,extremeBearExit:2000,ioMsg:4000},
  sellThreshold:{bioOffset:2,chaseWarnPnl:-2,profitWarn:30},
  ma60:{overheat:10,warm:6,near:3},
  buyScore:{
    single:{good:75,warn:60,trendThreshold:20},
    etf:{good:80,warn:65,observe:50},
    distanceLimit:10,
    weights:{
      trend:{healthy:30,neutral:20,weak:8},
      distance:{close:25,med:20,far:10},
      flow:{stable:15,neutral:8,selloff:0},
      vol:{normal:10,choppy:5,panic:0},
      market:{bull:20,range:10,bear:0}
    }
  },
  etfPremium:{
    warnThreshold:1.5,
    vetoThreshold:3.0,
    discountNotify:-0.5
  },
  dp:{pct:1,pct2:2,price:2,rate:2,ntk:2}
};
const HOLDING_THRESHOLDS={
  beta:   {warn:-15,danger:-25,warnAction:'回撤接近警示，考慮季再平衡補倉',    dangerAction:'回撤已達警示，建議執行季再平衡補倉'},
  global: {warn:-15,danger:-25,warnAction:'回撤接近警示，考慮季再平衡補倉',    dangerAction:'回撤已達警示，建議執行季再平衡補倉'},
  defense:{warn:-12,danger:-20,warnAction:'回撤接近警示，考慮補倉或檢視防禦配置',dangerAction:'回撤已達警示，建議補倉或調整防禦配置'},
  hedge:  {warn:-10,danger:-18,warnAction:'避險工具效果可能減弱，重新評估',      dangerAction:'避險工具可能失效，建議調整或清倉'},
  alpha:{
    stock:{warn:-8, danger:-12,warnAction:'留意回撤，接近個股警示線',             dangerAction:'已觸及個股警示線，建議停損或停利'},
    etf:  {warn:-10,danger:-15,warnAction:'留意回撤，接近 ETF 警示線',           dangerAction:'已觸及 ETF 警示線，建議停損或停利'}}
};
