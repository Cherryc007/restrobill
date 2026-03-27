/**
 * Frontend API service layer.
 * All server communication goes through these functions.
 * Each function returns parsed JSON or throws on error.
 */

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API request failed');
  return data;
}

// ── Auth ────────────────────────────────────────────────────
export async function apiLogin(username) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

// ── Menu Items ──────────────────────────────────────────────
export async function apiGetMenu(restaurantId) {
  return request(`/api/menu?restaurantId=${restaurantId}`);
}

export async function apiCreateMenuItem(item) {
  return request('/api/menu', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function apiUpdateMenuItem(id, data) {
  return request(`/api/menu/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteMenuItem(id) {
  return request(`/api/menu/${id}`, {
    method: 'DELETE',
  });
}

// ── Receipts / Bills ────────────────────────────────────────
export async function apiGetReceipts(restaurantId) {
  return request(`/api/receipts?restaurantId=${restaurantId}`);
}

export async function apiCreateReceipt(receipt) {
  return request('/api/receipts', {
    method: 'POST',
    body: JSON.stringify(receipt),
  });
}

export async function apiGetReceipt(id) {
  return request(`/api/receipts/${id}`);
}

// ── Restaurants ─────────────────────────────────────────────
export async function apiGetRestaurant(id) {
  return request(`/api/restaurants/${id}`);
}

// ── Seed ────────────────────────────────────────────────────
export async function apiSeed() {
  return request('/api/seed', { method: 'POST' });
}

// ── Sync (batch push offline items) ─────────────────────────
export async function apiSyncReceipts(receipts) {
  return request('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ receipts }),
  });
}
