const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { count: totalMembers } = await supabase.from('members').select('*', { count: 'exact', head: true });
    const { data: balData } = await supabase.from('members').select('balance');
    const totalBalance = (balData || []).reduce((sum, m) => sum + parseFloat(m.balance || 0), 0);
    const { count: pendingDeposits } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'deposit').eq('status', 'pending');
    const { count: pendingWithdrawals } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending');
    const { count: activeTrades } = await supabase.from('trades').select('*', { count: 'exact', head: true }).eq('result', 'pending');
    res.json({ ok: true, data: { totalMembers, totalBalance, pendingDeposits, pendingWithdrawals, activeTrades } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/members', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { data, count } = await supabase.from('members').select('id, username, email, balance, is_active, created_at, referral_code', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    res.json({ ok: true, data: { members: data || [], total: count, page, limit } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/members/:id', adminAuth, async (req, res) => {
  try {
    const { is_active, balance } = req.body;
    const updates = {};
    if (typeof is_active !== 'undefined') updates.is_active = is_active;
    if (typeof balance !== 'undefined') updates.balance = balance;
    const { data, error } = await supabase.from('members').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = supabase.from('transactions').select('*, members(username, email)').order('created_at', { ascending: false }).limit(50);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, data: { transactions: data || [] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/transactions/:id', adminAuth, async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    const { data: txn } = await supabase.from('transactions').select('*').eq('id', req.params.id).single();
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (status === 'approved' && txn.type === 'deposit' && txn.status === 'pending') {
      const { data: member } = await supabase.from('members').select('balance').eq('id', txn.member_id).single();
      await supabase.from('members').update({ balance: parseFloat(member.balance) + parseFloat(txn.amount) }).eq('id', txn.member_id);
    }
    if (status === 'rejected' && txn.type === 'withdrawal' && txn.status === 'pending') {
      const { data: member } = await supabase.from('members').select('balance').eq('id', txn.member_id).single();
      await supabase.from('members').update({ balance: parseFloat(member.balance) + parseFloat(txn.amount) }).eq('id', txn.member_id);
    }
    const { data, error } = await supabase.from('transactions').update({ status, admin_note }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/chart-providers', adminAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('game_providers').select('*');
    res.json({ ok: true, data: { providers: data || [] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/chart-providers/:id', adminAuth, async (req, res) => {
  try {
    const { current_price, is_active, win_rate } = req.body;
    const updates = {};
    if (typeof current_price !== 'undefined') updates.current_price = current_price;
    if (typeof is_active !== 'undefined') updates.is_active = is_active;
    if (typeof win_rate !== 'undefined') updates.win_rate = win_rate;
    const { data, error } = await supabase.from('game_providers').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
