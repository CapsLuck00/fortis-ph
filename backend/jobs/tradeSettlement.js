const supabase = require('../db/supabase');
let isRunning = false;
const runTradeSettlement = async () => {
  if (isRunning) return; isRunning=true;
  try {
    const now = new Date().toISOString();
    const { data: trades, error } = await supabase.from('trades').select('*').eq('result','pending').lte('trade_close_at',now);
    if (error||!trades||trades.length===0) {isRunning=false;return;}
    for (const trade of trades) {
      try {
        const { data: candles } = await supabase.from('chart_candles').select('open,close').eq('provider_id',trade.provider_id).order('candle_timestamp',{ascending:false}).limit(1);
        if (!candles||candles.length===0) continue;
        const lc = candles[0];
        const candleDir = parseFloat(lc.close)>parseFloat(lc.open)?'up':'down';
        const isWin = trade.direction===candleDir;
        const result = isWin?'win':'loss';
        const payout = isWin?parseFloat(trade.stake)*parseFloat(trade.payout_multiplier):0;
        await supabase.from('trades').update({result,payout_amount:payout,trade_close_at:now}).eq('id',trade.id);
        if (isWin&&payout>0) {
          const { data: user } = await supabase.from('users').select('balance').eq('id',trade.user_id).single();
          if (user) await supabase.from('users').update({balance:parseFloat(user.balance)+payout}).eq('id',trade.user_id);
        }
        await supabase.from('transactions').insert({user_id:trade.user_id,type:isWin?'trade_win':'trade_loss',amount:isWin?payout:parseFloat(trade.stake),status:'approved',notes:`Trade ${result}`});
      } catch(te){console.error('[TradeSettlement] Error:',te.message);}
    }
  } catch(err){console.error('[TradeSettlement] Error:',err.message);}
  isRunning=false;
};
const startTradeSettlement = () => { console.log('[TradeSettlement] Started'); setInterval(runTradeSettlement,5000); };
module.exports={startTradeSettlement};
