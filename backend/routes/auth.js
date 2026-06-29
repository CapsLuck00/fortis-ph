const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');

const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, referral_code } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Missing required fields' });

    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();
    if (existing) return res.status(409).json({ error: 'Email or username already taken' });

    const password_hash = await bcrypt.hash(password, 12);

    let referred_by = null;
    if (referral_code) {
      const { data: referrer } = await supabase
        .from('members')
        .select('id')
        .eq('referral_code', referral_code)
        .single();
      if (referrer) referred_by = referrer.id;
    }

    const myCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data: member, error } = await supabase
      .from('members')
      .insert({ username, email, password_hash, referral_code: myCode, referred_by })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const token = jwt.sign({ id: member.id, username: member.username, role: 'member' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, user: { id: member.id, username: member.username, email: member.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .single();

    if (!member) return res.status(401).json({ error: 'Invalid email or password' });
    if (!member.is_active) return res.status(403).json({ error: 'Account suspended' });

    const valid = await bcrypt.compare(password, member.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: member.id, username: member.username, role: 'member' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, user: { id: member.id, username: member.username, email: member.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ ok: true, token, user: { id: admin.id, username: admin.username, role: 'admin' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
