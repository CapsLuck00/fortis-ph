const supabase = require('../db/supabase');
let isRunning = false;
const runInterestJob = async () => {
  if (isRunning) return;isRunning = true;
  try {
    const { data: users, error } = await supabase.from('users').select('id,balance,interest_rate_per_second').eq('is_active',true).gt('balance',0);
    if (error || !users || users.length===0) { isRunning=false; return; }
    const now = new Date().toISOString();
    const updates = [], txInserts = [];
    for (const user of users) {
      const earned = parseFloat(user.balance)*parseFloat(user.interest_rate_per_second);
      if (earned<=0) continue;
      updates.push({id:user.id,balance:parseFloat(user.balance)+earned});
      txInserts.push({user_id:user.id,type:'interest',amount:earned,status:'approved',notes:'Auto interest credit',created_at:now});
    }
    for (const upd of updates) await supabase.from('users').update({balance:upd.balance}).eq('id',upd.id);
    if (txInserts.length>0) await supabase.from('transactions').insert(txInserts);
  } catch(err){ console.error('[InterestJob] Error:',err.message); }
  isRunning=false;
};
const startInterestJob = () => { console.log('[InterestJob] Started'); setInterval(runInterestJob,1000); };
module.exports = { startInterestJob };
