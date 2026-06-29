// ─── FortisPH — API Utility ─────────────────────────────
// Change this to your Render backend URL after deploy
const BASE_URL = 'https://fortis-ph.onrender.com';

// Token helpers
function getToken() {
  return localStorage.getItem('fortis_token');
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

// Decode JWT payload (no verification — client-side only for role/display)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// Auth guards
function redirectIfNotLoggedIn() {
  const token = getToken();
  if (!token) {
    window.location.href = '/auth/login.html';
    return false;
  }
  // Check expiry
  const decoded = decodeToken(token);
  if (!decoded || decoded.exp * 1000 < Date.now()) {
    clearToken();
    window.location.href = '/auth/login.html';
    return false;
  }
  return true;
}

function redirectIfNotAdmin() {
  if (!redirectIfNotLoggedIn()) return false;
  const token = getToken();
  const decoded = decodeToken(token);
  if (!decoded || decoded.role !== 'admin') {
    window.location.href = '/dashboard/index.html';
    return false;
  }
  return true;
}

// Main fetch wrapper
async function apiFetch(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json();

    if (res.status === 401) {
      clearToken();
      window.location.href = '/auth/login.html';
      return null;
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`[API] Error on ${method} ${endpoint}:`, err);
    return { ok: false, status: 0, data: { error: 'Network error. Check your connection.' } };
  }
}

// WebSocket URL builder (converts https to wss)
function getWsUrl() {
  return BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
}

// Toast notification system
function showToast(title, message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Format currency (Philippine Peso)
function formatPHP(amount) {
  const num = parseFloat(amount) || 0;
  return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Format countdown
function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Logout
function logout() {
  clearToken();
  window.location.href = '/auth/login.html';
}
