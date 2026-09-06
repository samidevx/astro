// ===== ADMIN UTILITY FUNCTIONS =====

export const api = {
  async getProducts() {
    const r = await fetch('/api/products');
    return r.ok ? r.json() : [];
  },
  async createProduct(data) {
    return fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },
  async updateProduct(id, data) {
    return fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },
  async deleteProduct(id) {
    return fetch(`/api/products/${id}`, { method: 'DELETE' });
  },
  async getOrders() {
    const r = await fetch('/api/orders');
    return r.ok ? r.json() : [];
  },
  async updateOrder(id, data) {
    return fetch(`/api/orders/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },
  async deleteOrder(id) {
    return fetch(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async getSettings() {
    const r = await fetch('/api/settings');
    return r.ok ? r.json() : { facebookPixelId: '', facebookPixelEnabled: true };
  },
  async updateSettings(data) {
    return fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },
  async getReviews() {
    const r = await fetch('/api/reviews');
    return r.ok ? r.json() : [];
  },
  async createReview(data) {
    return fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },
  async updateReview(id, data) {
    return fetch(`/api/reviews/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },
  async deleteReview(id) {
    return fetch(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  },
  async seed() {
    return fetch('/api/seed', { method: 'POST' });
  },
  codAfrica: {
    async getConfig() {
      const r = await fetch('/api/cod-africa?action=config');
      return r.ok ? r.json() : {};
    },
    async saveConfig(data) {
      return fetch('/api/cod-africa?action=config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    async getCreativeStats(range = 'all', startDate = '', endDate = '', country = '') {
      const params = new URLSearchParams({ action: 'creative-stats', range });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (country && country !== 'ALL') params.set('country', country);
      const r = await fetch(`/api/cod-africa?${params.toString()}`);
      return r.ok ? r.json() : { summary: {}, creatives: [] };
    },
    async getAnalytics(variant = 'Revenues', dateType = 'thismonth', country = 'CI', warhouse = '', dates = '') {
      const params = new URLSearchParams({ action: 'analytics', Response: variant, DateType: dateType, country });
      if (warhouse) params.set('warhouse', warhouse);
      if (dates) params.set('dates', dates);
      const r = await fetch(`/api/cod-africa?${params.toString()}`);
      return r.ok ? r.json() : {};
    },
    async getOrders(country = 'CI', page = 1, limit = 50) {
      const params = new URLSearchParams({ action: 'orders', country, page: String(page), limit: String(limit) });
      const r = await fetch(`/api/cod-africa?${params.toString()}`);
      return r.ok ? r.json() : { data: [] };
    },
    async getShippings(country = 'CI', page = 1, limit = 50) {
      const params = new URLSearchParams({ action: 'shippings', country, page: String(page), limit: String(limit) });
      const r = await fetch(`/api/cod-africa?${params.toString()}`);
      return r.ok ? r.json() : { data: [] };
    },
    async getProducts(country = 'CI', page = 1, limit = 50) {
      const params = new URLSearchParams({ action: 'products', country, page: String(page), limit: String(limit) });
      const r = await fetch(`/api/cod-africa?${params.toString()}`);
      return r.ok ? r.json() : { data: [] };
    },
    async syncStatus() {
      return fetch('/api/cod-africa?action=sync-status', { method: 'POST' });
    }
  }
};

export function toast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa ${type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}"></i><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('routechange'));
}

export function fmtPrice(n) {
  return Number(n).toLocaleString('fr-FR');
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function statusBadge(status) {
  const norm = String(status || '').toUpperCase();
  const map = {
    COMPLETED: 'badge-green',
    DELIVERED: 'badge-green',
    PAID: 'badge-green',
    CONFIRMED: 'badge-purple',
    SHIPPED: 'badge-blue',
    PROCESSED: 'badge-blue',
    CANCELLED: 'badge-red',
    RETURNED: 'badge-red',
    ABANDONED: 'badge-orange',
    PENDING: 'badge-orange',
  };
  return `<span class="badge ${map[norm] || 'badge-blue'}">${status || 'UNKNOWN'}</span>`;
}

export function confirmDialog(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);backdrop-filter:blur(6px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px;';
    overlay.innerHTML = `
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 40px -10px rgba(0,0,0,0.12);">
        <i class="fa fa-triangle-exclamation" style="font-size:36px;color:#f59e0b;margin-bottom:16px;display:block;"></i>
        <p style="font-size:15px;margin-bottom:24px;color:#0f172a;font-weight:600;line-height:1.5;">${msg}</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="cd-cancel" style="background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;">Cancel</button>
          <button id="cd-ok" style="background:#ef4444;border:none;color:#fff;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;box-shadow:0 4px 12px rgba(239,68,68,0.3);">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cd-ok').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#cd-cancel').onclick = () => { overlay.remove(); resolve(false); };
  });
}
