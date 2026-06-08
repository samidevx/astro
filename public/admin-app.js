import { api, toast, navigate, fmtPrice, fmtDate, statusBadge, confirmDialog } from './admin-utils.js';

// ── Router ──────────────────────────────────────────────
function router() {
  const path = window.location.pathname;
  const root = document.getElementById('admin-root');
  if (!root) return;

  renderShell(root, path);

  const main = document.getElementById('admin-main');
  if (path === '/admin/orders') renderOrders(main);
  else if (path === '/admin/products/new') renderProductForm(main, null);
  else if (path.startsWith('/admin/products/edit/')) {
    const id = path.split('/').pop();
    renderProductFormById(main, id);
  } else if (path === '/admin/products') renderProducts(main);
  else renderDashboard(main);
}

window.addEventListener('routechange', router);
window.addEventListener('popstate', router);
router();

// ── Shell ────────────────────────────────────────────────
function renderShell(root, path) {
  const navItems = [
    { href: '/admin', icon: 'fa-chart-line', label: 'Dashboard' },
    { href: '/admin/products', icon: 'fa-box', label: 'Products' },
    { href: '/admin/orders', icon: 'fa-shopping-bag', label: 'Orders' },
  ];

  root.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar" id="sidebar">
        <div class="admin-logo">
          <div class="admin-logo-icon">🛒</div>
          <div>
            <div class="admin-logo-text">Lina Store</div>
            <div class="admin-logo-sub">Admin Panel</div>
          </div>
        </div>
        <nav class="admin-nav">
          ${navItems.map(n => `
            <a href="${n.href}" class="admin-nav-item ${isActive(n.href, path)}" data-nav>
              <i class="fa ${n.icon}"></i>${n.label}
            </a>`).join('')}
          <div class="nav-spacer"></div>
        </nav>
        <div class="admin-sidebar-footer">
          <a href="/" class="admin-nav-item" target="_blank"><i class="fa fa-globe"></i>View Site</a>
          <button class="admin-nav-item" id="logoutBtn"><i class="fa fa-sign-out-alt"></i>Logout</button>
        </div>
      </aside>
      <main class="admin-content" id="admin-main"></main>
    </div>`;

  root.querySelectorAll('[data-nav]').forEach(a => {
    a.onclick = e => { e.preventDefault(); navigate(a.getAttribute('href')); };
  });
  root.querySelector('#logoutBtn').onclick = () => api.logout();
}

function isActive(href, path) {
  if (href === '/admin') return path === '/admin' ? 'active' : '';
  return path.startsWith(href) ? 'active' : '';
}

// ── Dashboard ────────────────────────────────────────────
async function renderDashboard(el) {
  el.innerHTML = `<div class="admin-topbar"><h1>Dashboard</h1></div><div id="dash-content"><p style="color:var(--muted);padding:40px 0;">Loading...</p></div>`;

  const [orders, products] = await Promise.all([api.getOrders(), api.getProducts()]);
  const completed = orders.filter(o => o.status === 'COMPLETED');
  const revenue = completed.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const abandoned = orders.filter(o => o.status === 'ABANDONED').length;
  const convRate = orders.length ? ((completed.length / orders.length) * 100).toFixed(1) : '0.0';

  // Group revenue by date (last 14 days)
  const days = 14;
  const labels = [], revData = [], ordData = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
    const dayOrders = completed.filter(o => (o.date || o.savedAt || '').startsWith(key));
    revData.push(dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0));
    ordData.push(dayOrders.length);
  }

  // Orders by country
  const countryCounts = {};
  orders.forEach(o => { if (o.pays) countryCounts[o.pays] = (countryCounts[o.pays] || 0) + 1; });
  const countryLabels = Object.keys(countryCounts);
  const countryData = Object.values(countryCounts);

  document.getElementById('dash-content').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card kpi-green">
        <div class="kpi-icon"><i class="fa fa-coins"></i></div>
        <div class="kpi-lbl">Total Revenue</div>
        <div class="kpi-val">${fmtPrice(revenue)} CFA</div>
        <div class="kpi-sub">${completed.length} completed orders</div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-icon"><i class="fa fa-shopping-bag"></i></div>
        <div class="kpi-lbl">Total Orders</div>
        <div class="kpi-val">${orders.length}</div>
        <div class="kpi-sub">${abandoned} abandoned</div>
      </div>
      <div class="kpi-card kpi-orange">
        <div class="kpi-icon"><i class="fa fa-percent"></i></div>
        <div class="kpi-lbl">Conversion Rate</div>
        <div class="kpi-val">${convRate}%</div>
        <div class="kpi-sub">Completed / total</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-icon"><i class="fa fa-box"></i></div>
        <div class="kpi-lbl">Products</div>
        <div class="kpi-val">${products.length}</div>
        <div class="kpi-sub"><a href="/admin/products" data-nav style="color:var(--accent);text-decoration:none;">Manage →</a></div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Revenue (Last ${days} days)</div>
        <div class="chart-wrap"><canvas id="revenueChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Orders by Country</div>
        <div class="chart-wrap"><canvas id="countryChart"></canvas></div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header"><span class="table-title">Recent Orders</span></div>
      <table class="admin-table">
        <thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          ${orders.slice(0, 8).map(o => `
            <tr>
              <td style="color:var(--muted);font-size:12px;">${fmtDate(o.date || o.savedAt)}</td>
              <td><strong>${o.nom}</strong><br><small style="color:var(--muted);">${o.telephone || ''}</small></td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.produit}</td>
              <td>${fmtPrice(o.total || 0)} CFA</td>
              <td>${statusBadge(o.status)}</td>
            </tr>`).join('')}
          ${orders.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><i class="fa fa-inbox"></i><p>No orders yet.</p></div></td></tr>` : ''}
        </tbody>
      </table>
    </div>`;

  document.getElementById('dash-content').querySelector('[data-nav]')?.addEventListener('click', e => { e.preventDefault(); navigate('/admin/products'); });

  // Charts
  const chartDefaults = { color: '#94a3b8', borderColor: 'rgba(255,255,255,0.07)' };
  if (window.Chart) {
    new Chart(document.getElementById('revenueChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Revenue (CFA)', data: revData, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointRadius: 3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });

    if (countryLabels.length > 0) {
      const colors = ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#14b8a6'];
      new Chart(document.getElementById('countryChart'), {
        type: 'doughnut',
        data: { labels: countryLabels, datasets: [{ data: countryData, backgroundColor: colors, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 } } } }
      });
    }
  }
}

// ── Products ─────────────────────────────────────────────
async function renderProducts(el) {
  el.innerHTML = `<div class="admin-topbar"><h1>Products</h1><button class="btn btn-primary" id="addBtn"><i class="fa fa-plus"></i>Add Product</button></div><div class="table-card"><div class="table-header"><span class="table-title">All Products</span><div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="pSearch" placeholder="Search products…"></div></div><table class="admin-table"><thead><tr><th>Image</th><th>Title</th><th>Price</th><th>Stock</th><th>Code</th><th>Actions</th></tr></thead><tbody id="pBody"><tr><td colspan="6"><div class="empty-state"><i class="fa fa-spinner fa-spin"></i><p>Loading…</p></div></td></tr></tbody></table></div>`;

  el.querySelector('#addBtn').onclick = () => navigate('/admin/products/new');

  const products = await api.getProducts();
  let filtered = [...products];

  const render = () => {
    document.getElementById('pBody').innerHTML = filtered.length ? filtered.map(p => `
      <tr>
        <td><img class="product-thumb" src="${p.featuredImage}" alt="${p.title}" onerror="this.src='https://placehold.co/40x40'"></td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.title}">${p.title}</td>
        <td><strong>${fmtPrice(p.price)}</strong> ${p.currency}<br><small style="color:var(--muted);text-decoration:line-through;">${p.priceOld ? fmtPrice(p.priceOld) : ''}</small></td>
        <td>${p.stock}</td>
        <td><span style="font-family:monospace;font-size:12px;color:var(--muted);">${p.code || '—'}</span></td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <a href="/product/${p.id}" target="_blank" class="btn btn-ghost btn-sm"><i class="fa fa-eye"></i></a>
          <button class="btn btn-ghost btn-sm" onclick="window._editProduct('${p.id}')"><i class="fa fa-pen"></i></button>
          <button class="btn btn-danger btn-sm" onclick="window._deleteProduct('${p.id}')"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="fa fa-box-open"></i><p>No products found.</p></div></td></tr>`;
  };
  render();

  document.getElementById('pSearch').oninput = e => {
    const q = e.target.value.toLowerCase();
    filtered = products.filter(p => p.title.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q));
    render();
  };

  window._editProduct = id => navigate('/admin/products/edit/' + id);
  window._deleteProduct = async id => {
    if (await confirmDialog('Delete this product? This cannot be undone.')) {
      const r = await api.deleteProduct(id);
      if (r.ok) { toast('Product deleted'); navigate('/admin/products'); }
      else toast('Failed to delete', 'error');
    }
  };

  const expBtn = document.createElement('button');
  expBtn.className = 'btn btn-success btn-sm';
  expBtn.innerHTML = '<i class="fa fa-download"></i> Export JSON';
  expBtn.style.marginLeft = 'auto';
  expBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'products.json' });
    a.click();
  };
  el.querySelector('.table-header').appendChild(expBtn);
}

// ── Product Form ──────────────────────────────────────────
async function renderProductFormById(el, id) {
  const products = await api.getProducts();
  const p = products.find(x => x.id === id);
  renderProductForm(el, p || null, id);
}

function renderProductForm(el, p, id) {
  const isEdit = !!p;
  el.innerHTML = `
    <div class="admin-topbar">
      <h1>${isEdit ? 'Edit Product' : 'New Product'}</h1>
      <button class="btn btn-ghost" id="backBtn"><i class="fa fa-arrow-left"></i>Back</button>
    </div>
    <div class="table-card" style="padding:0;">
      <form id="productForm" style="padding:28px;">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">ID (slug) *</label><input class="form-control" id="p-id" value="${p?.id||''}" ${isEdit?'readonly':''} placeholder="my-product" required></div>
          <div class="form-group"><label class="form-label">Title *</label><input class="form-control" id="p-title" value="${p?.title||''}" placeholder="Product Name" required></div>
          <div class="form-group"><label class="form-label">Price *</label><input type="number" class="form-control" id="p-price" value="${p?.price||''}" required></div>
          <div class="form-group"><label class="form-label">Old Price</label><input type="number" class="form-control" id="p-priceOld" value="${p?.priceOld||''}"></div>
          <div class="form-group"><label class="form-label">Currency</label><input class="form-control" id="p-currency" value="${p?.currency||'CFA'}"></div>
          <div class="form-group"><label class="form-label">Stock</label><input type="number" class="form-control" id="p-stock" value="${p?.stock||'25'}"></div>
          <div class="form-group"><label class="form-label">SKU Code</label><input class="form-control" id="p-code" value="${p?.code||''}" placeholder="COD00000"></div>
          <div class="form-group"><label class="form-label">WhatsApp</label><input class="form-control" id="p-whatsapp" value="${p?.whatsapp||''}"></div>
          <div class="form-group"><label class="form-label">Countries (comma)</label><input class="form-control" id="p-pays" value="${p?.pays||'CI,SN,BF,TG,BJ,ML,GA,CM'}"></div>
          <div class="form-group"><label class="form-label">Reviews Count</label><input class="form-control" id="p-reviews" value="${p?.reviews||'0'}"></div>
          <div class="form-group"><label class="form-label">Colors (comma)</label><input class="form-control" id="p-couleur" value="${p?.couleur||''}" placeholder="Noir, Blanc"></div>
          <div class="form-group"><label class="form-label">Sizes (comma)</label><input class="form-control" id="p-taille" value="${p?.taille||''}" placeholder="S, M, L"></div>
          <div class="form-group"><label class="form-label">Bundle?</label><select class="form-control" id="p-bundle"><option value="no" ${p?.bundle==='no'?'selected':''}>No</option><option value="yes" ${p?.bundle==='yes'?'selected':''}>Yes</option></select></div>
          <div class="form-group"><label class="form-label">Countdown?</label><select class="form-control" id="p-countdown"><option value="NO" ${p?.countdown==='NO'?'selected':''}>No</option><option value="yes" ${p?.countdown==='yes'?'selected':''}>Yes</option></select></div>
          <div class="form-group"><label class="form-label">Landing Page?</label><select class="form-control" id="p-isLandingPage"><option value="no" ${p?.isLandingPage==='no'?'selected':''}>No</option><option value="yes" ${p?.isLandingPage==='yes'?'selected':''}>Yes</option></select></div>
          <div class="form-group"><label class="form-label">Dark Mode?</label><select class="form-control" id="p-modeBlack"><option value="no" ${p?.modeBlack==='no'?'selected':''}>No</option><option value="yes" ${p?.modeBlack==='yes'?'selected':''}>Yes</option></select></div>
          <div class="form-group"><label class="form-label">Show Quantity?</label><select class="form-control" id="p-showQuantity"><option value="NO" ${p?.showQuantity==='NO'?'selected':''}>No</option><option value="yes" ${p?.showQuantity==='yes'?'selected':''}>Yes</option></select></div>
          <div class="form-group"><label class="form-label">Animated CTA?</label><select class="form-control" id="p-animated"><option value="no" ${p?.animated==='no'?'selected':''}>No</option><option value="yes" ${p?.animated==='yes'?'selected':''}>Yes</option></select></div>
          <div class="form-group"><label class="form-label">Popup (yes/no, %)</label><input class="form-control" id="p-remisePopup" value="${p?.remisePopup||'no, 10'}"></div>
          <div class="form-group full"><label class="form-label">Featured Image URL *</label><input class="form-control" id="p-img" value="${p?.featuredImage||''}" placeholder="https://…" required></div>
          <div class="form-group full"><label class="form-label">Gallery URLs (one per line)</label><textarea class="form-control" id="p-gallery" style="height:90px;">${(p?.gallery||[]).join('\n')}</textarea></div>
          <div class="form-group full">
            <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
              <span>Product Offers / Bundles</span>
              <button type="button" class="btn btn-ghost btn-sm" id="addOfferBtn" style="padding:4px 8px; font-size:11px;"><i class="fa fa-plus"></i> Add Offer</button>
            </label>
            <div id="offers-container" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;"></div>
          </div>
          <div class="form-group full"><label class="form-label">Description (HTML)</label><textarea class="form-control" id="p-desc" style="height:140px;">${p?.description||''}</textarea></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveBtn"><i class="fa fa-save"></i>${isEdit?'Update Product':'Create Product'}</button>
        </div>
      </form>
    </div>`;

  const offersContainer = el.querySelector('#offers-container');
  const addOfferBtn = el.querySelector('#addOfferBtn');

  function createOfferRowHTML(o = {}) {
    const div = document.createElement('div');
    div.className = 'offer-row';
    div.style = 'display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.02); padding:10px; border:1px dashed var(--border); border-radius:8px;';
    div.innerHTML = `
      <div style="flex:0 0 65px;">
        <label class="form-label" style="font-size:9px;">Qty</label>
        <input type="number" class="form-control offer-qty" value="${o.qty || 1}" required style="padding:6px;">
      </div>
      <div style="flex:2;">
        <label class="form-label" style="font-size:9px;">Offer Title / Description</label>
        <input type="text" class="form-control offer-title" value="${o.title || ''}" placeholder="e.g. 1 Kit (Offre Découverte)" required style="padding:6px;">
      </div>
      <div style="flex:1;">
        <label class="form-label" style="font-size:9px;">Price</label>
        <input type="number" class="form-control offer-price" value="${o.price || 0}" required style="padding:6px;">
      </div>
      <div style="flex:1;">
        <label class="form-label" style="font-size:9px;">Old Price</label>
        <input type="number" class="form-control offer-oldPrice" value="${o.oldPrice || ''}" style="padding:6px;">
      </div>
      <button type="button" class="btn btn-danger btn-sm remove-offer-btn" style="margin-top:15px; padding:6px 10px;"><i class="fa fa-trash"></i></button>
    `;
    div.querySelector('.remove-offer-btn').onclick = () => div.remove();
    return div;
  }

  if (p?.offres && Array.isArray(p.offres)) {
    p.offres.forEach(o => offersContainer.appendChild(createOfferRowHTML(o)));
  }

  addOfferBtn.onclick = () => {
    offersContainer.appendChild(createOfferRowHTML({ qty: offersContainer.children.length + 1 }));
  };

  el.querySelector('#backBtn').onclick = () => navigate('/admin/products');
  el.querySelector('#cancelBtn').onclick = () => navigate('/admin/products');

  el.querySelector('#productForm').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';

    const offers = Array.from(document.querySelectorAll('.offer-row')).map(row => {
      return {
        qty: parseInt(row.querySelector('.offer-qty').value) || 1,
        title: row.querySelector('.offer-title').value.trim(),
        price: parseInt(row.querySelector('.offer-price').value) || 0,
        oldPrice: parseInt(row.querySelector('.offer-oldPrice').value) || null
      };
    });

    const data = {
      id: document.getElementById('p-id').value.trim(),
      title: document.getElementById('p-title').value.trim(),
      price: parseInt(document.getElementById('p-price').value),
      priceOld: parseInt(document.getElementById('p-priceOld').value) || null,
      currency: document.getElementById('p-currency').value.trim(),
      category: 'Mode',
      stock: document.getElementById('p-stock').value.trim(),
      code: document.getElementById('p-code').value.trim(),
      whatsapp: document.getElementById('p-whatsapp').value.trim(),
      pays: document.getElementById('p-pays').value.trim(),
      reviews: document.getElementById('p-reviews').value.trim(),
      couleur: document.getElementById('p-couleur').value.trim(),
      taille: document.getElementById('p-taille').value.trim(),
      bundle: document.getElementById('p-bundle').value,
      offres: offers,
      countdown: document.getElementById('p-countdown').value,
      isLandingPage: document.getElementById('p-isLandingPage').value,
      modeBlack: document.getElementById('p-modeBlack').value,
      showQuantity: document.getElementById('p-showQuantity').value,
      animated: document.getElementById('p-animated').value,
      remisePopup: document.getElementById('p-remisePopup').value.trim(),
      featuredImage: document.getElementById('p-img').value.trim(),
      gallery: document.getElementById('p-gallery').value.split('\n').map(s=>s.trim()).filter(Boolean),
      description: document.getElementById('p-desc').value.trim(),
    };

    const r = isEdit ? await api.updateProduct(data.id, data) : await api.createProduct(data);
    if (r.ok) {
      toast(isEdit ? 'Product updated!' : 'Product created!');
      navigate('/admin/products');
    } else {
      const err = await r.json().catch(() => ({}));
      toast(err.error || 'Save failed', 'error');
      btn.disabled = false; btn.innerHTML = `<i class="fa fa-save"></i>${isEdit?'Update Product':'Create Product'}`;
    }
  };
}

// ── Orders ────────────────────────────────────────────────
async function renderOrders(el) {
  el.innerHTML = `<div class="admin-topbar">
    <h1>Orders</h1>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <div style="display:flex;gap:6px;align-items:center;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:9px;padding:2px 10px;">
        <span style="font-size:10px;color:var(--muted2);text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">From</span>
        <input type="date" class="filter-select" id="startDateFilter" style="background:transparent;border:none;padding:5px 0;font-family:inherit;font-size:13px;color:#fff;outline:none;cursor:pointer;">
        <span style="font-size:10px;color:var(--muted2);text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">To</span>
        <input type="date" class="filter-select" id="endDateFilter" style="background:transparent;border:none;padding:5px 0;font-family:inherit;font-size:13px;color:#fff;outline:none;cursor:pointer;">
      </div>
      <select class="filter-select" id="statusFilter"><option value="">All Status</option><option>COMPLETED</option><option>ABANDONED</option></select>
      <div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="oSearch" placeholder="Search name, product…"></div>
      <button class="btn btn-ghost btn-sm" id="exportCsv"><i class="fa fa-download"></i>CSV</button>
    </div>
  </div>
  <div class="table-card">
    <table class="admin-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Order ID</th>
          <th>Customer</th>
          <th>Product</th>
          <th>Qty</th>
          <th>Total</th>
          <th>Country</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="oBody">
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <i class="fa fa-spinner fa-spin"></i>
              <p>Loading…</p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>`;

  const orders = await api.getOrders();
  let filtered = [...orders];

  const render = () => {
    document.getElementById('oBody').innerHTML = filtered.length ? filtered.map(o => `
      <tr>
        <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${fmtDate(o.date||o.savedAt)}</td>
        <td style="font-family:monospace;font-size:11px;color:var(--muted);">${(o.order_id||'').slice(0,14)}</td>
        <td><strong>${o.nom}</strong><br><small style="color:var(--muted);">${o.telephone||''}</small></td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.produit}</td>
        <td style="text-align:center;">${o.quantity||1}</td>
        <td><strong>${fmtPrice(o.total||0)}</strong> CFA</td>
        <td>${o.pays||'—'}</td>
        <td>${statusBadge(o.status)}</td>
      </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><i class="fa fa-inbox"></i><p>No orders found.</p></div></td></tr>`;
  };
  render();

  const applyFilters = () => {
    const q = document.getElementById('oSearch').value.toLowerCase();
    const s = document.getElementById('statusFilter').value;
    const startVal = document.getElementById('startDateFilter').value;
    const endVal = document.getElementById('endDateFilter').value;

    filtered = orders.filter(o => {
      const matchesSearch = !q || o.nom?.toLowerCase().includes(q) || o.produit?.toLowerCase().includes(q) || o.telephone?.includes(q);
      const matchesStatus = !s || o.status === s;

      let matchesDate = true;
      const orderDateStr = o.date || o.savedAt;
      if (orderDateStr) {
        try {
          const d = new Date(orderDateStr);
          if (!isNaN(d.getTime())) {
            const orderDateFormatted = d.toISOString().split('T')[0];
            if (startVal && orderDateFormatted < startVal) {
              matchesDate = false;
            }
            if (endVal && orderDateFormatted > endVal) {
              matchesDate = false;
            }
          } else if (startVal || endVal) {
            matchesDate = false;
          }
        } catch (e) {
          if (startVal || endVal) matchesDate = false;
        }
      } else if (startVal || endVal) {
        matchesDate = false;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
    render();
  };

  document.getElementById('oSearch').oninput = applyFilters;
  document.getElementById('statusFilter').onchange = applyFilters;
  document.getElementById('startDateFilter').onchange = applyFilters;
  document.getElementById('endDateFilter').onchange = applyFilters;

  document.getElementById('exportCsv').onclick = () => {
    const headers = ['Date','Order ID','Name','Phone','Country','City','Product','Qty','Total','Status'];
    const rows = orders.map(o => [fmtDate(o.date||o.savedAt),o.order_id,o.nom,o.telephone,o.pays,o.adresse,o.produit,o.quantity||1,o.total||0,o.status].map(v=>`"${v||''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = Object.assign(document.createElement('a'), { href: 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv), download: `orders_${new Date().toISOString().slice(0,10)}.csv` });
    a.click();
    toast('CSV exported!');
  };
}
