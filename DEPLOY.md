# FortisPH — Step-by-Step Deployment Guide

All services used are **100% free**. No credit card required.

---

## STEP 1 — Supabase (Database)

### 1.1 Create Project
1. Go to https://supabase.com
2. Click **Start your project** → Sign in with GitHub
3. Click **New Project**
4. Set:
   - **Project name**: `fortis-ph`
   - **Database password**: (save this somewhere safe)
   - **Region**: Southeast Asia (Singapore)
5. Click **Create new project** — wait ~2 minutes

### 1.2 Run Schema SQL
1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste it into the editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned."

### 1.3 Get Your Keys
1. Go to **Settings** → **API** in Supabase dashboard
2. Copy these two values — you'll need them for the backend:
   - **Project URL** → This is your `SUPABASE_URL`
      - **service_role** key (under Project API keys) → This is your `SUPABASE_SERVICE_KEY`
   > ⚠️ Use the `service_role` key (not the `anon` key). It bypasses Row Level Security.

### 1.4 Create Admin User
After deploying the backend, register a user normally, then run this SQL in Supabase SQL Editor:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';
```

---

## STEP 2 — GitHub (Version Control)

### 2.1 Create Repository
1. Go to https://github.com → **New repository**
2. Name it: `fortis-ph`
3. Set to **Private**
4. Click **Create repository**

### 2.2 Push Code
Open a terminal in the `fortis-ph/` folder:

```bash
git init
git add .
git commit -m "Initial FortisPH MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fortis-ph.git
git push -u origin main
```

---

## STEP 3 — Render (Backend Hosting)

### 3.1 Create Account
1. Go to https://render.com
2. Sign up with GitHub (free, no credit card needed)

### 3.2 Create Web Service
1. Click **New** → **Web Service**
2. Connect your GitHub account and select the `fortis-ph` repo
3. Configure:
   - **Name**: `fortis-ph-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
4. Click **Advanced** → **Add Environment Variables**

### 3.3 Set Environment Variables on Render
Add these one by one:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | Your Supabase Project URL from Step 1.3 |
| `SUPABASE_SERVICE_KEY` | Your service_role key from Step 1.3 |
| `JWT_SECRET` | Any long random string (e.g. `fortis-super-secret-jwt-2024-xyz`) |
| `RESEND_API_KEY` | Get from https://resend.com (free, 100 emails/day) |
| `PORT` | `3000` |
| `FRONTEND_URL` | `https://fortis-ph.vercel.app` |

5. Click **Create Web Service**
6. Wait ~3-5 minutes for the first deploy
7. Your backend URL will be: `https://fortis-ph.onrender.com`
   > ⚠️ Free Render services spin down after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

### 3.4 Note Your Backend URL
Copy your Render URL — you need it for Step 4.

---

## STEP 4 — Update Frontend with Backend URL

Before deploying the frontend, update the `BASE_URL` in `frontend/assets/js/api.js`:

```javascript
// Change this line:
const BASE_URL = 'https://fortis-ph.onrender.com';
// Replace with your actual Render URL
```

Then commit and push:
```bash
git add .
git commit -m "Set backend URL"
git push
```

---

## STEP 5 — Vercel (Frontend Hosting)

### 5.1 Create Account
1. Go to https://vercel.com
2. Sign up with GitHub (free)

### 5.2 Import Project
1. Click **Add New** → **Project**
2. Import your `fortis-ph` GitHub repository
3. Configure:
   - **Framework Preset**: `Other`
   - **Root Directory**: `frontend`
   - **Build Command**: *(leave empty)*
   - **Output Directory**: `.` (a single dot)
4. Click **Deploy**
5. Wait ~1 minute

### 5.3 Get Your Domain
Your site will be live at:
- `https://fortis-ph.vercel.app` (or similar auto-generated URL)

To use a custom Vercel subdomain:
1. Go to your project → **Settings** → **Domains**
2. Add your preferred domain name

### 5.4 Update Backend CORS
If your Vercel URL is different from `fortis-ph.vercel.app`, go to Render → your service → **Environment** → update `FRONTEND_URL` to match.

---

## STEP 6 — Final Setup

### 6.1 Create Admin Account
1. Go to your live site and register normally
2. Go to Supabase SQL Editor and run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@here.com';
```

### 6.2 Test the Full Flow
1. Register a member account
2. In admin panel, deposit some test balance manually (Admin → Users → Adjust Balance)
3. Go to member dashboard — verify interest ticker is running
4. Place a trade → wait for settlement
5. Admin → Chart Control → push a candle → verify chart updates live

---

## TROUBLESHOOTING

**Backend not responding?**
- Render free tier sleeps after 15 min inactivity. First request takes 30-60s.
- Check Render logs: Dashboard → your service → Logs

**WebSocket not connecting?**
- Ensure frontend `getWsUrl()` in `api.js` converts `https://` to `wss://`
- Render supports WebSockets on free tier ✅

**CORS errors?**
- Make sure `FRONTEND_URL` in Render env vars exactly matches your Vercel URL (no trailing slash)

**Interest not crediting?**
- Check Render logs for `[InterestJob]` output
- Verify `SUPABASE_SERVICE_KEY` is the `service_role` key (not `anon`)

**Supabase rate limits?**
- Free tier: 500MB database, 2GB bandwidth, 50,000 monthly active users
- Interest job writes 1 row per user per second — for MVP with <50 users this is fine
- For scale: batch insert transactions or reduce frequency

---

## MONETIZATION ANGLES (DiPeDi + Bobby)

| Feature | How to Charge |
|---------|---------------|
| Deposit fee | 2-5% cut on approved deposits |
| Trade house edge | 1.8x payout = 10% house edge built in |
| Interest spread | Charge members less than you earn on float |
| VIP tiers | Higher interest rate for larger balances |
| Referral system | Track referrals, reward recruiters |

---

## TECH STACK SUMMARY

| Layer | Service | Cost |
|-------|---------|------|
| Frontend | Vercel | Free |
| Backend | Render | Free |
| Database | Supabase | Free |
| Domain | Vercel subdomain | Free |
| Email | Resend.com | Free (100/day) |
| Charts | TradingView Lightweight | Free (OSS) |

**Total monthly cost: ₱0** ✅
