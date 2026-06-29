const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const auth = require('../middleware/auth');

// GET /api/member/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { data: member } = await supabase
      .from('members')
      .select('balance, interest_rate_per_second')
      .eq('id', req.user.id)
      .single();

    const { data: open_trades } = await supabase
      .from('trades')
      .select('*, game_providers(name, slug)')
      .eq('member_id', req.user.id)
      .eq('result', 'pending');

    res.json({ ok: true, data: { ...member, open_trades: open_trades || [] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/member/deposit
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, payment_method, reference_number } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum deposit is ₱100' });

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        member_id: req.user.id,
        type: 'deposit',
        amount,
        payment_method,
        reference_number,
        status: 'pending'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/member/withdraw
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, payment_method, account_number, account_name } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum withdrawal is ₱100' });

    const { data: member } = await supabase
      .from('members')
      .select('balance')
      .eq('id', req.user.id)
      .single();

    if (!member || parseFloat(member.balance) < amount)
      return res.status(400).json({ error: 'Insufficient balance' });

    await supabase.from('members').update({ balance: parseFloat(member.balance) - amount }).eq('id', req.user.id);

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        member_id: req.user.id,
        type: 'withdrawal',
        amount,
        payment_method,
        account_number,
        account_name,
        status: 'pending'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/member/trade
router.post('/trade', auth, async (req, res) => {
  try {
    const { provider_id, direction, stake, duration_seconds } = req.body;
    if (!provider_id || !direction || !stake || !duration_seconds)
      return res.status(400).json({ error: 'Missing trade fields' });
    if (stake < 10) return res.status(400).json({ error: 'Minimum stake is ₱10' });

    const { data: member } = await supabase
      .from('members')
      .select('balance')
      .eq('id', req.user.id)
      .single();

    if (!member || parseFloat(member.balance) < stake)
      return res.status(400).json({ error: 'Insufficient balance' });

    await supabase.from('members').update({ balance: parseFloat(member.balance) - stake }).eq('id', req.user.id);

    const close_at = new Date(Date.now() + duration_seconds * 1000).toISOString();

    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        member_id: req.user.id,
        provider_id,
        direction,
        stake,
        duration_seconds,
        trade_close_at: close_at,
        result: 'pending'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, data: { trade } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/member/trades
router.get('/trades', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { data } = await supabase
      .from('trades')
      .select('*, game_providers(name, slug)')
      .eq('member_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    res.json({ ok: true, data: { trades: data || [] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/member/transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('member_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    res.json({ ok: true, data: { transactions: data || [] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
