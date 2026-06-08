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
  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  },
  async seed() {
    return fetch('/api/seed', { method: 'POST' });
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
  const map = {
    COMPLETED: 'badge-green',
    ABANDONED: 'badge-orange',
    PENDING: 'badge-blue',
  };
  return `<span class="badge ${map[status] || 'badge-blue'}">${status || 'UNKNOWN'}</span>`;
}

export function confirmDialog(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px;';
    overlay.innerHTML = `
      <div style="background:#111827;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:32px;max-width:380px;width:100%;text-align:center;">
        <i class="fa fa-triangle-exclamation" style="font-size:32px;color:#f59e0b;margin-bottom:16px;display:block;"></i>
        <p style="font-size:15px;margin-bottom:24px;color:#f1f5f9;">${msg}</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="cd-cancel" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07);color:#f1f5f9;border-radius:9px;padding:10px 20px;cursor:pointer;font-size:14px;font-family:inherit;">Cancel</button>
          <button id="cd-ok" style="background:#ef4444;border:none;color:#fff;border-radius:9px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cd-ok').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#cd-cancel').onclick = () => { overlay.remove(); resolve(false); };
  });
}
