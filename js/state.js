// Global mutable application state (market params, capital marks, regime flags)
const S={trend:null,vix:null,rate:null,vixVal:null,vixSource:'us'};
let HIGH_WATER_MARK=0,TOTAL_CONTRIBUTED=0,currentTarget=null,inExtremeBear=false,indexPct=null,trendState=null;
