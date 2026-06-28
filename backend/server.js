require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const supabase = require('./db/supabase');
const { startInterestJob } = require('./jobs/interestJob');
const { startTradeSettlement } = require('./jobs/tradeSettlement');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/member');
const chartRoutes = require('./routes/chart');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://fortis.vercel.app';

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3001', 'http://127.0.0.1:5500'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/chart', chartRoutes);
app.use('/api/providers', chartRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const providerSubscribers = new Map();
const priceCache = new Map();

const initPriceCache = async () => {
  const { data: providers } = await supabase.from('game_providers').select('id, slug, current_price').eq('is_active', true);
  if (providers) providers.forEach(p => priceCache.set(p.slug, { id: p.id, price: parseFloat(p.current_price) }));
  console.log('[WS] Price cache initialized:', [...priceCache.keys()]);
};

const generateAutoCandle = (currentPrice) => {
  const open = currentPrice;
  const changePercent = (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1);
  const close = open * (1 + changePercent);
  const high = Math.max(open, close) * (1 + Math.random() * 0.002);
  const low = Math.min(open, close) * (1 - Math.random() * 0.002);
  return { open, close, high, low };
};

const broadcastCandle = (slug, candleData) => {
  const subs = providerSubscribers.get(slug);
  if (!subs || subs.size === 0) return;
  const payload = JSON.stringify(candleData);
  subs.forEach(client => { if (client.readyState === 1) client.send(payload); });
};

const runCandleEngine = async () => {
  for (const [slug, cache] of priceCache.entries()) {
    const subs = providerSubscribers.get(slug);
    if (!subs || subs.size === 0) continue;
    try {
      const providerId = cache.id;
      const { data: queued } = await supabase.from('admin_chart_control').select('*').eq('provider_id', providerId).eq('is_queued', true).order('created_at', {ascending:true}).limit(1);
      let ohlc;
      if (queued && queued.length > 0) {
        const q = queued[0];
        ohlc = {open: parseFloat(q.next_open), close: parseFloat(q.next_close), high: parseFloat(q.next_high), low: parseFloat(q.next_low)};
        await supabase.from('admin_chart_control').update({is_queued:false}).eq('id', q.id);
      } else { ohlc = generateAutoCandle(cache.price); }
      const now = new Date().toISOString();
      await supabase.from('chart_candles').insert({provider_id:providerId,open:ohlc.open,close:ohlc.close,high:ohlc.high,low:ohlc.low,volume:Math.floor(Math.random()*5000+1000),candle_timestamp:now,interval:'5s'});
      await supabase.from('game_providers').update({current_price:ohlc.close}).eq('id',providerId);
      priceCache.set(slug,{id:providerId,price:ohlc.close});
      broadcastCandle(slug,{provider:slug,open:ohlc.open,close:ohlc.close,high:ohlc.high,low:ohlc.low,volume:Math.floor(Math.random()*5000+1000),timestamp:now});
    } catch(err){console.error(`[CandleEngine] Error for ${slug}:`,err.message);}
  }
};

wss.on('connection',(ws)=>{
  console.log('[WS] Client connected');
  let subscribedSlug = null;
  ws.on('message',(raw)=>{
    try{
      const msg = JSON.parse(raw.toString());
      if(msg.subscribe){
        const slug = msg.subscribe.toLowerCase();
        if(subscribedSlug&&providerSubscribers.has(subscribedSlug))providerSubscribers.get(subscribedSlug).delete(ws);
        subscribedSlug=slug;
        if(!providerSubscribers.has(slug))providerSubscribers.set(slug,new Set());
        providerSubscribers.get(slug).add(ws);
        ws.send(JSON.stringify({type:'subscribed',provider:slug}));
      }
    }catch(err){console.error('[WS] Parse error:',err.message);}
  });
  ws.on('close', ()=>{if(subscribedSlug&&providerSubscribers.has(subscribedSlug))providerSubscribers.get(subscribedSlug).delete(ws);});
  ws.on('error',(err)=>{console.error('[WS] error:',err.message);});
});

server.listen(PORT,async()=>{
  console.log(`\nFortisPH Backend running on port ${PORT}`);
  await initPriceCache();
  setInterval(runCandleEngine,5000);
  startInterestJob();
  startTradeSettlement();
});

module.exports={app,server};
