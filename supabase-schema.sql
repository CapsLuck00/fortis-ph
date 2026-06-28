-- ============================================================
-- FortisPH — Supabase PostgreSQL Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  balance NUMERIC DEFAULT 0,
  total_invested NUMERIC DEFAULT 0,
  interest_rate_per_second NUMERIC DEFAULT 0.000035,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Transactions ─────────────────────────────────────────────
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type VARCHAR CHECK (type IN ('deposit', 'withdrawal', 'interest', 'trade_win', 'trade_loss')),
  amount NUMERIC NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reference_code VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Game Providers ───────────────────────────────────────────
CREATE TABLE game_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  logo_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  current_price NUMERIC DEFAULT 100.00
);

-- ─── Chart Candles ────────────────────────────────────────────
CREATE TABLE chart_candles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES game_providers(id),
  open NUMERIC,
  close NUMERIC,
  high NUMERIC,
  low NUMERIC,
  volume NUMERIC DEFAULT 0,
  candle_timestamp TIMESTAMP DEFAULT NOW(),
  interval VARCHAR DEFAULT '5s'
);

-- ─── Admin Chart Control ──────────────────────────────────────
CREATE TABLE admin_chart_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES game_providers(id),
  next_open NUMERIC,
  next_close NUMERIC,
  next_high NUMERIC,
  next_low NUMERIC,
  direction VARCHAR CHECK (direction IN ('up', 'down', 'flat')),
  is_queued BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Trades ───────────────────────────────────────────────────
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES game_providers(id),
  direction VARCHAR CHECK (direction IN ('up', 'down')),
  stake NUMERIC NOT NULL,
  payout_multiplier NUMERIC DEFAULT 1.8,
  result VARCHAR DEFAULT 'pending' CHECK (result IN ('pending', 'win', 'loss')),
  payout_amount NUMERIC DEFAULT 0,
  trade_open_at TIMESTAMP DEFAULT NOW(),
  trade_close_at TIMESTAMP,
  duration_seconds INTEGER DEFAULT 30
);

-- ─── Interest Config ──────────────────────────────────────────
CREATE TABLE interest_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_per_second NUMERIC NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── Indexes (for performance) ────────────────────────────────
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_chart_candles_provider_id ON chart_candles(provider_id);
CREATE INDEX idx_chart_candles_timestamp ON chart_candles(candle_timestamp DESC);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_result ON trades(result);
CREATE INDEX idx_trades_close_at ON trades(trade_close_at);
CREATE INDEX idx_admin_chart_control_queued ON admin_chart_control(provider_id, is_queued);
CREATE INDEX idx_users_active ON users(is_active);

-- ─── Seed: Game Providers ─────────────────────────────────────
INSERT INTO game_providers (name, slug, current_price) VALUES
  ('JiLi', 'jili', 100.00),
  ('Evolution Gaming', 'evolution', 100.00),
  ('Pragmatic Play', 'pragmatic', 100.00),
  ('SA Gaming', 'sagaming', 100.00);

-- ─── Seed: Initial Interest Config ───────────────────────────
INSERT INTO interest_config (rate_per_second, updated_by) VALUES (0.000035, NULL);

-- ─── IMPORTANT: Disable Row Level Security ────────────────────
-- Your backend uses the service key which bypasses RLS.
-- But disable on all tables to prevent accidental lockouts.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE chart_candles DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chart_control DISABLE ROW LEVEL SECURITY;
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;
ALTDR TABLE interest_config DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Schema complete. Run this in Supabase SQL Editor → Run
-- ============================================================
