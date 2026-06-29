const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// GET /api/providers
router.get('/', async (req, res) => {
  try {
    const { data } = await supabase.from('game_providers').select('*').eq('is_active', true);
    res.json({ ok: true, data: { providers: data || [] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chart/:slug/candles
router.get('/:slug/candles', async (req, res) => {
  try {
    const { data: provider } = await supabase
      .from('game_providers')
      .select('id, name, slug, current_price')
      .eq('slug', req.params.slug)
      .single();

    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const { data: candles } = await supabase
      .from('price_candles')
      .select('*')
      .eq('provider_id', provider.id)
      .order('time', { ascending: false })
      .limit(100);

    res.json({ ok: true, data: { provider, candles: (candles || []).reverse() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
