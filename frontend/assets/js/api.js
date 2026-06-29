// ===========================================================
// FortisPH — Frontend API Utility
// ============================================================

const BASE_URL = 'https://fortis-ph.onrender.com';

// ─── Token helpers ──────────────────────────────────────────
function getToken() {
  return localStorage.getItem('fortis_token') || null;
}

function setToken(token) {
  localStorage.setItem('fortis_token', token);
}

function clearToken() {
  localStorage.removeItem('fortis_token');
  localStorage.removeItem('fortis_user');
}

function getUser() {
  try {
    const raw = localStorage.getItem('fortis_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('fortis_user', JSON.stringify(user));
}

// ─── JWT decode (no verify — server does that) ──────────────
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// ─── Auth guards ────────────────────────────────────────────
function redirectIfNotLoggedIn() {
  const token = getToken();
  if (!token) {
    window.location.href = '/auth/login.html';
    return false;
  }
  const decoded = decodeToken(token);
  if (!decoded || decoded.exp * 1000 < Date.now()) {
    clearToken();
    window.location.href = '/auth/login.html';
    return false;
  }
  return true;
}

function redirectIfNotAdmin() {
  const token = getToken();
  if (!token) {
    window.location.href = '/admin/login.html';
    return false;
  }
  const decoded = decodeToken(token);
  if (!decoded || decoded.exp * 1000 < Date.now()) {
    clearToken();
    window.location.href = '/admin/login.html';
    return false;
  }
  if (decoded.role !== 'admin') {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

function redirectIfLoggedIn() {
  const token = getToken();
  if (!token) return true;
  const decoded = decodeToken(token);
  if (decoded && decoded.exp * 1000 > Date.now()) {
    if (decoded.role === 'admin') {
      window.location.href = '/admin/index.html';
    } else {
      window.location.href = '/dashboard/index.html';
    }
    return false;
  }
  clearToken();
  return true;
}

function logout() {
  clearToken();
  window.location.href = '/auth/login.html';
}

// ─── API fetch wrapper ──────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: 'Network error' } };
  }
}

// ─── Formatting helpers ─────────────────────────────────────
function formatPHP(amount) {
  const num = parseFloat(amount) || 0;
  return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

// ─── Toast notifications ────────────────────────────────────
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-title">${title}</div>
    <div class="toast-msg">${message}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
