import { api, toast, navigate, fmtPrice, fmtDate, statusBadge, confirmDialog } from './admin-utils.js';

// ── Router ──────────────────────────────────────────────
function router() {
  const path = window.location.pathname;
  const root = document.getElementById('admin-root');
  if (!root) return;

  renderShell(root, path);

  const main = document.getElementById('admin-main');
  if (path === '/admin/orders') renderOrders(main);
  else if (path === '/admin/settings') renderSettings(main);
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
    { href: '/admin/orders', icon: 'fa-shopping-bag', label: 'Orders', hasBadge: true },
    { href: '/admin/settings', icon: 'fa-gear', label: 'Settings' },
  ];

  if (!document.getElementById('admin-sidebar')) {
    root.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar" id="admin-sidebar">
          <div class="admin-logo">
            <div class="admin-logo-icon">🛒</div>
            <div>
              <div class="admin-logo-text">Astro Shop</div>
              <div class="admin-logo-sub">Admin Panel</div>
            </div>
          </div>
          <nav class="admin-nav">
            ${navItems.map(n => `
              <a href="${n.href}" class="admin-nav-item ${isActive(n.href, path)}" data-nav data-href="${n.href}">
                <i class="fa ${n.icon}"></i><span>${n.label}</span>${n.hasBadge ? `<span class="nav-badge" id="sidebarOrdersBadge" style="display:none;">0</span>` : ''}
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
      a.onclick = e => { e.preventDefault(); navigate(a.getAttribute('data-href')); };
    });
    root.querySelector('#logoutBtn').onclick = () => api.logout();
  } else {
    root.querySelectorAll('[data-nav]').forEach(a => {
      const href = a.getAttribute('data-href');
      a.className = `admin-nav-item ${isActive(href, path)}`;
    });
  }

  updateSidebarOrdersCount();
}

async function updateSidebarOrdersCount() {
  const badge = document.getElementById('sidebarOrdersBadge');
  if (!badge) return;
  try {
    const orders = await api.getOrders();
    badge.textContent = orders.length;
    badge.style.display = 'inline-flex';
  } catch (e) {}
}

function isActive(href, path) {
  if (href === '/admin') return path === '/admin' ? 'active' : '';
  return path.startsWith(href) ? 'active' : '';
}

// ── Dashboard ────────────────────────────────────────────
async function renderDashboard(el) {
  el.innerHTML = `
    <div class="admin-topbar" style="flex-wrap:wrap; gap:16px;">
      <div>
        <h1 style="margin:0 0 4px 0;">Dashboard & Analytics</h1>
        <p style="font-size:13px; color:var(--muted); margin:0;">Real-time overview of store performance, revenue, and order metrics.</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div style="display:flex; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:9px; padding:3px;">
          <button class="btn btn-ghost btn-sm preset-btn active" data-preset="all" style="border:none; padding:4px 10px; font-size:11px;">All Time</button>
          <button class="btn btn-ghost btn-sm preset-btn" data-preset="today" style="border:none; padding:4px 10px; font-size:11px;">Today</button>
          <button class="btn btn-ghost btn-sm preset-btn" data-preset="7d" style="border:none; padding:4px 10px; font-size:11px;">7 Days</button>
          <button class="btn btn-ghost btn-sm preset-btn" data-preset="30d" style="border:none; padding:4px 10px; font-size:11px;">30 Days</button>
        </div>
        <div style="display:flex; gap:6px; align-items:center; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:9px; padding:2px 10px;">
          <span style="font-size:10px; color:var(--muted2); text-transform:uppercase; font-weight:700;">From</span>
          <input type="date" class="filter-select" id="dashStartDateFilter" style="background:transparent; border:none; padding:5px 0; font-family:inherit; font-size:12px; color:#fff; outline:none; cursor:pointer;">
          <span style="font-size:10px; color:var(--muted2); text-transform:uppercase; font-weight:700;">To</span>
          <input type="date" class="filter-select" id="dashEndDateFilter" style="background:transparent; border:none; padding:5px 0; font-family:inherit; font-size:12px; color:#fff; outline:none; cursor:pointer;">
        </div>
      </div>
    </div>
    <div id="dash-content"><p style="color:var(--muted); padding:40px 0;"><i class="fa fa-spinner fa-spin"></i> Loading analytics...</p></div>`;

  const [orders, products] = await Promise.all([api.getOrders(), api.getProducts()]);

  let revChart = null;
  let statusChart = null;

  const COUNTRY_MAP = {
    CI: "Côte d'Ivoire", SN: "Sénégal", BF: "Burkina Faso", TG: "Togo",
    BJ: "Bénin", ML: "Mali", GA: "Gabon", CM: "Cameroun",
    GN: "Guinée", CD: "RDC", CG: "Congo", TD: "Tchad"
  };

  const updateDashboard = () => {
    const startVal = document.getElementById('dashStartDateFilter').value;
    const endVal = document.getElementById('dashEndDateFilter').value;

    const filteredOrders = orders.filter(o => {
      let matchesDate = true;
      const orderDateStr = o.date || o.savedAt;
      if (orderDateStr) {
        try {
          const d = new Date(orderDateStr);
          if (!isNaN(d.getTime())) {
            const orderDateFormatted = d.toISOString().split('T')[0];
            if (startVal && orderDateFormatted < startVal) matchesDate = false;
            if (endVal && orderDateFormatted > endVal) matchesDate = false;
          } else if (startVal || endVal) {
            matchesDate = false;
          }
        } catch (e) {
          if (startVal || endVal) matchesDate = false;
        }
      } else if (startVal || endVal) {
        matchesDate = false;
      }
      return matchesDate;
    });

    const completed = filteredOrders.filter(o => o.status === 'COMPLETED');
    const abandoned = filteredOrders.filter(o => o.status === 'ABANDONED');
    const pending = filteredOrders.filter(o => o.status === 'PENDING' || (!o.status && o.status !== 'COMPLETED' && o.status !== 'ABANDONED'));

    const revenue = completed.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const convRate = filteredOrders.length ? ((completed.length / filteredOrders.length) * 100).toFixed(1) : '0.0';
    const aov = completed.length ? Math.round(revenue / completed.length) : 0;

    // Top Selling Products Calculation
    const productSalesMap = {};
    completed.forEach(o => {
      const pName = (o.produit || 'Unknown').split(' (')[0].trim();
      if (!productSalesMap[pName]) {
        productSalesMap[pName] = { title: pName, ordersCount: 0, totalQty: 0, revenue: 0 };
      }
      productSalesMap[pName].ordersCount += 1;
      productSalesMap[pName].totalQty += (Number(o.quantity) || 1);
      productSalesMap[pName].revenue += (Number(o.total) || 0);
    });

    const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);
    const topProduct = topProducts[0] || null;

    // Country Breakdown Calculation
    const countryMap = {};
    filteredOrders.forEach(o => {
      const code = o.pays || 'Other';
      if (!countryMap[code]) {
        countryMap[code] = { code, name: COUNTRY_MAP[code] || code, total: 0, completed: 0, revenue: 0 };
      }
      countryMap[code].total += 1;
      if (o.status === 'COMPLETED') {
        countryMap[code].completed += 1;
        countryMap[code].revenue += (Number(o.total) || 0);
      }
    });
    const countryList = Object.values(countryMap).sort((a, b) => b.total - a.total);

    // Chart Data Preparation (Daily Trend)
    let labels = [], revData = [], ordData = [];
    if (startVal && endVal) {
      const start = new Date(startVal);
      const end = new Date(endVal);
      const diffDays = Math.min(Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1, 60);

      for (let i = 0; i < diffDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
        const dayCompleted = completed.filter(o => (o.date || o.savedAt || '').startsWith(key));
        const dayAll = filteredOrders.filter(o => (o.date || o.savedAt || '').startsWith(key));
        revData.push(dayCompleted.reduce((s, o) => s + (Number(o.total) || 0), 0));
        ordData.push(dayAll.length);
      }
    } else {
      const days = 14;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
        const dayCompleted = completed.filter(o => (o.date || o.savedAt || '').startsWith(key));
        const dayAll = filteredOrders.filter(o => (o.date || o.savedAt || '').startsWith(key));
        revData.push(dayCompleted.reduce((s, o) => s + (Number(o.total) || 0), 0));
        ordData.push(dayAll.length);
      }
    }

    // Render Dashboard UI
    document.getElementById('dash-content').innerHTML = `
      <!-- 6 KPI Grid -->
      <div class="kpi-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin-bottom: 24px;">
        <div class="kpi-card kpi-green">
          <div class="kpi-icon"><i class="fa fa-coins"></i></div>
          <div class="kpi-lbl">Total Revenue</div>
          <div class="kpi-val">${fmtPrice(revenue)} <small style="font-size:13px;">CFA</small></div>
          <div class="kpi-sub"><i class="fa fa-check-circle" style="color:var(--green);"></i> ${completed.length} paid orders</div>
        </div>

        <div class="kpi-card kpi-blue">
          <div class="kpi-icon"><i class="fa fa-shopping-bag"></i></div>
          <div class="kpi-lbl">Total Orders</div>
          <div class="kpi-val">${filteredOrders.length}</div>
          <div class="kpi-sub"><i class="fa fa-clock" style="color:var(--muted);"></i> ${completed.length} completed · ${abandoned.length} abandoned</div>
        </div>

        <div class="kpi-card kpi-orange">
          <div class="kpi-icon"><i class="fa fa-percent"></i></div>
          <div class="kpi-lbl">Conversion Rate</div>
          <div class="kpi-val">${convRate}%</div>
          <div class="kpi-sub"><i class="fa fa-arrow-trend-up" style="color:var(--orange);"></i> ${completed.length} / ${filteredOrders.length || 1} total</div>
        </div>

        <div class="kpi-card kpi-purple">
          <div class="kpi-icon"><i class="fa fa-receipt"></i></div>
          <div class="kpi-lbl">Average Order Value</div>
          <div class="kpi-val">${fmtPrice(aov)} <small style="font-size:13px;">CFA</small></div>
          <div class="kpi-sub"><i class="fa fa-calculator" style="color:var(--accent);"></i> Avg per checkout</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #14b8a6;">
          <div class="kpi-icon" style="background:rgba(20,184,166,0.12);color:#14b8a6;"><i class="fa fa-trophy"></i></div>
          <div class="kpi-lbl">Best Seller</div>
          <div class="kpi-val" style="font-size:14px; font-weight:700; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${topProduct?.title || 'N/A'}">
            ${topProduct ? topProduct.title : '—'}
          </div>
          <div class="kpi-sub" style="color:#14b8a6; font-weight:600;">${topProduct ? topProduct.ordersCount + ' orders (' + fmtPrice(topProduct.revenue) + ' CFA)' : 'No sales yet'}</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #ec4899;">
          <div class="kpi-icon" style="background:rgba(236,72,153,0.12);color:#ec4899;"><i class="fa fa-box-open"></i></div>
          <div class="kpi-lbl">Active Products</div>
          <div class="kpi-val">${products.length}</div>
          <div class="kpi-sub"><a href="/admin/products" data-nav style="color:#ec4899;text-decoration:none;font-weight:600;">View catalog →</a></div>
        </div>
      </div>

      <!-- Main Charts Row -->
      <div class="charts-grid" style="grid-template-columns: 2fr 1fr; margin-bottom: 24px;">
        <div class="chart-card">
          <div class="chart-title">
            <span><i class="fa fa-chart-line" style="color:var(--accent);margin-right:8px;"></i>Revenue & Order Trend</span>
            <small style="color:var(--muted);font-weight:400;font-size:12px;">Daily Revenue (CFA) & Total Orders</small>
          </div>
          <div class="chart-wrap"><canvas id="revenueChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">
            <span><i class="fa fa-chart-pie" style="color:var(--orange);margin-right:8px;"></i>Order Status</span>
            <small style="color:var(--muted);font-weight:400;font-size:12px;">Distribution</small>
          </div>
          <div class="chart-wrap"><canvas id="statusChart"></canvas></div>
        </div>
      </div>

      <!-- Product & Geographic Performance Row -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom: 24px;">
        <!-- Top Products Table Card -->
        <div class="table-card" style="margin:0;">
          <div class="table-header">
            <span class="table-title"><i class="fa fa-fire" style="color:#ef4444;margin-right:8px;"></i>Top Products by Sales</span>
            <small style="color:var(--muted);">${topProducts.length} products sold</small>
          </div>
          <div style="max-height: 280px; overflow-y: auto;">
            <table class="admin-table">
              <thead>
                <tr><th>#</th><th>Product</th><th>Orders</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                ${topProducts.length ? topProducts.slice(0, 5).map((tp, idx) => `
                  <tr>
                    <td style="font-weight:700; color:var(--muted); width:30px;">#${idx + 1}</td>
                    <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${tp.title}">
                      <strong>${tp.title}</strong>
                    </td>
                    <td><span class="badge badge-blue">${tp.ordersCount}</span></td>
                    <td style="font-weight:700; color:var(--green);">${fmtPrice(tp.revenue)} CFA</td>
                  </tr>
                `).join('') : `<tr><td colspan="4"><div class="empty-state" style="padding:24px;"><p>No sales data yet.</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Geographic Sales Breakdown Card -->
        <div class="table-card" style="margin:0;">
          <div class="table-header">
            <span class="table-title"><i class="fa fa-earth-africa" style="color:var(--blue);margin-right:8px;"></i>Sales by Country</span>
            <small style="color:var(--muted);">${countryList.length} countries</small>
          </div>
          <div style="padding:16px 20px; max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
            ${countryList.length ? countryList.map(c => {
              const pct = filteredOrders.length ? Math.round((c.total / filteredOrders.length) * 100) : 0;
              return `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                    <span>🌍 ${c.name} (${c.code})</span>
                    <span>${c.total} orders <small style="color:var(--muted); font-weight:400;">(${pct}%)</small></span>
                  </div>
                  <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--accent), var(--blue)); border-radius:4px;"></div>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--muted); margin-top:2px;">
                    <span>Completed: ${c.completed}</span>
                    <span style="color:var(--green); font-weight:600;">${fmtPrice(c.revenue)} CFA</span>
                  </div>
                </div>
              `;
            }).join('') : `<div class="empty-state" style="padding:24px;"><p>No geographic data yet.</p></div>`}
          </div>
        </div>
      </div>

      <!-- Recent Orders Stream -->
      <div class="table-card" style="margin:0;">
        <div class="table-header">
          <span class="table-title"><i class="fa fa-clock-rotate-left" style="color:var(--accent);margin-right:8px;"></i>Recent Orders Feed</span>
          <a href="/admin/orders" data-nav style="color:var(--accent); text-decoration:none; font-size:13px; font-weight:600;">View All Orders →</a>
        </div>
        <table class="admin-table">
          <thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Country</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            ${filteredOrders.slice(0, 6).map(o => `
              <tr>
                <td style="color:var(--muted);font-size:12px;white-space:nowrap;">${fmtDate(o.date || o.savedAt)}</td>
                <td><strong>${o.nom}</strong><br><small style="color:var(--muted);">${o.telephone || ''}</small></td>
                <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.produit}">${o.produit}</td>
                <td>${COUNTRY_MAP[o.pays] || o.pays || '—'}</td>
                <td><strong>${fmtPrice(o.total || 0)}</strong> CFA</td>
                <td>${statusBadge(o.status)}</td>
              </tr>`).join('')}
            ${filteredOrders.length === 0 ? `<tr><td colspan="6"><div class="empty-state"><i class="fa fa-inbox"></i><p>No orders recorded in selected period.</p></div></td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    // Re-bind navigation links inside content
    document.querySelectorAll('#dash-content [data-nav]').forEach(a => {
      a.onclick = e => { e.preventDefault(); navigate(a.getAttribute('href')); };
    });

    // Clean up existing charts
    if (revChart) revChart.destroy();
    if (statusChart) statusChart.destroy();

    // Render Chart.js visual charts
    if (window.Chart) {
      // 1. Revenue & Orders Combined Chart
      const revCtx = document.getElementById('revenueChart');
      if (revCtx) {
        revChart = new Chart(revCtx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Revenue (CFA)',
                data: revData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.12)',
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
              },
              {
                label: 'Total Orders',
                data: ordData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.3)',
                type: 'bar',
                borderRadius: 4,
                yAxisID: 'y1'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, labels: { color: '#94a3b8', font: { size: 11 } } }
            },
            scales: {
              x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { type: 'linear', display: true, position: 'left', ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#64748b', font: { size: 11 }, precision: 0 } }
            }
          }
        });
      }

      // 2. Status Breakdown Donut Chart
      const statusCtx = document.getElementById('statusChart');
      if (statusCtx) {
        statusChart = new Chart(statusCtx, {
          type: 'doughnut',
          data: {
            labels: ['Completed', 'Abandoned', 'Pending'],
            datasets: [{
              data: [completed.length, abandoned.length, pending.length],
              backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 14 } }
            }
          }
        });
      }
    }
  };

  // Attach Preset Button Handlers
  const presetBtns = el.querySelectorAll('.preset-btn');
  presetBtns.forEach(btn => {
    btn.onclick = () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.getAttribute('data-preset');
      const startEl = document.getElementById('dashStartDateFilter');
      const endEl = document.getElementById('dashEndDateFilter');

      const today = new Date();
      const format = d => d.toISOString().split('T')[0];

      if (preset === 'today') {
        startEl.value = format(today);
        endEl.value = format(today);
      } else if (preset === '7d') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        startEl.value = format(d);
        endEl.value = format(today);
      } else if (preset === '30d') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        startEl.value = format(d);
        endEl.value = format(today);
      } else {
        startEl.value = '';
        endEl.value = '';
      }
      updateDashboard();
    };
  });

  document.getElementById('dashStartDateFilter').onchange = () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    updateDashboard();
  };
  document.getElementById('dashEndDateFilter').onchange = () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    updateDashboard();
  };

  updateDashboard();
}

// ── Products ─────────────────────────────────────────────
function getProductOrders(product, allOrders) {
  if (!allOrders || !Array.isArray(allOrders)) return [];
  const pTitle = (product.title || '').trim().toLowerCase();
  const pCode = (product.code || '').trim().toLowerCase();
  const pId = (product.id || '').trim().toLowerCase();

  return allOrders.filter(o => {
    if (o.productId && String(o.productId).toLowerCase() === pId) return true;
    const oCode = (o.code || '').trim().toLowerCase();
    if (pCode && oCode && oCode === pCode) return true;
    const oProduit = (o.produit || '').trim().toLowerCase();
    if (oProduit) {
      if (pTitle && (oProduit === pTitle || oProduit.startsWith(pTitle) || oProduit.includes(pTitle))) return true;
      if (pTitle && pTitle.includes(oProduit)) return true;
      if (pCode && oProduit.includes(pCode)) return true;
    }
    return false;
  });
}

function showProductOrdersModal(product, productOrders) {
  const oldModal = document.getElementById('product-orders-modal');
  if (oldModal) oldModal.remove();

  const totalRevenue = productOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const completedOrders = productOrders.filter(o => o.status === 'COMPLETED').length;

  const modal = document.createElement('div');
  modal.id = 'product-orders-modal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 920px; width: 95%;">
      <div class="modal-head" style="background: rgba(255,255,255,0.02); padding: 20px 28px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${product.featuredImage}" alt="${product.title}" style="width: 48px; height: 48px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border);" onerror="this.src='https://placehold.co/48x48'">
          <div>
            <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 4px 0; color: #fff;">${product.title}</h2>
            <div style="display: flex; gap: 12px; align-items: center; font-size: 12px; color: var(--muted);">
              <span><i class="fa fa-barcode"></i> Code: <code>${product.code || 'N/A'}</code></span>
              <span><i class="fa fa-tag"></i> ${fmtPrice(product.price)} ${product.currency}</span>
            </div>
          </div>
        </div>
        <button class="modal-close" id="closeProductOrdersModal" style="font-size: 24px; padding: 4px 8px;">&times;</button>
      </div>

      <div style="padding: 16px 28px; background: rgba(255,255,255,0.015); border-bottom: 1px solid var(--border); display: flex; gap: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 8px 16px; border-radius: 10px;">
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Total Orders</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--blue);">${productOrders.length}</div>
          </div>
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px 16px; border-radius: 10px;">
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Completed</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--green);">${completedOrders}</div>
          </div>
          <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 8px 16px; border-radius: 10px;">
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Total Revenue</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent);">${fmtPrice(totalRevenue)} ${product.currency || 'CFA'}</div>
          </div>
        </div>
      </div>

      <div class="modal-body" style="padding: 0; max-height: 60vh; overflow-y: auto;">
        ${productOrders.length ? `
          <table class="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Location</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${productOrders.map(o => `
                <tr>
                  <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${fmtDate(o.date || o.savedAt)}</td>
                  <td style="font-family:monospace;font-size:11px;color:var(--muted);">${(o.order_id || '').slice(0, 14)}</td>
                  <td>
                    <strong>${o.nom}</strong><br>
                    <small style="color:var(--muted);">${o.telephone || ''}</small>
                  </td>
                  <td style="font-size:13px;">
                    ${o.pays || '—'}${o.adresse ? `<br><small style="color:var(--muted);">${o.adresse}</small>` : ''}
                  </td>
                  <td style="text-align:center;font-weight:600;">${o.quantity || 1}</td>
                  <td><strong>${fmtPrice(o.total || 0)}</strong> CFA</td>
                  <td>${statusBadge(o.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="empty-state" style="padding: 50px 24px;">
            <i class="fa fa-shopping-bag"></i>
            <p style="font-size: 15px; font-weight: 600; color: var(--text); margin-top: 8px;">No orders found for this product</p>
            <p style="font-size: 13px; color: var(--muted); margin-top: 4px;">Orders placed for this product will appear here.</p>
          </div>
        `}
      </div>
      <div class="modal-footer" style="padding: 16px 28px; background: rgba(255,255,255,0.015);">
        <button class="btn btn-ghost" id="closeProductOrdersModalBtn"><i class="fa fa-xmark"></i> Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#closeProductOrdersModal').onclick = closeModal;
  modal.querySelector('#closeProductOrdersModalBtn').onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
}

async function renderProducts(el) {
  el.innerHTML = `<div class="admin-topbar"><h1>Products</h1><button class="btn btn-primary" id="addBtn"><i class="fa fa-plus"></i>Add Product</button></div><div class="table-card"><div class="table-header"><span class="table-title">All Products</span><div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="pSearch" placeholder="Search products…"></div></div><table class="admin-table"><thead><tr><th>Image</th><th>Title</th><th>Price</th><th>Stock</th><th>Orders</th><th>Code</th><th>Actions</th></tr></thead><tbody id="pBody"><tr><td colspan="7"><div class="empty-state"><i class="fa fa-spinner fa-spin"></i><p>Loading…</p></div></td></tr></tbody></table></div>`;

  el.querySelector('#addBtn').onclick = () => navigate('/admin/products/new');

  const [products, orders] = await Promise.all([api.getProducts(), api.getOrders()]);
  let filtered = [...products];

  const render = () => {
    const pBody = document.getElementById('pBody');
    if (!pBody) return;
    if (!filtered.length) {
      pBody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa fa-box-open"></i><p>No products found.</p></div></td></tr>`;
      return;
    }

    pBody.innerHTML = filtered.map(p => {
      const pOrders = getProductOrders(p, orders);
      return `
        <tr class="product-row" data-product-id="${p.id}" style="cursor: pointer;" title="Click row to view orders for ${p.title.replace(/"/g, '&quot;')}">
          <td onclick="window._showProductOrders('${p.id}')"><img class="product-thumb" src="${p.featuredImage}" alt="${p.title}" onerror="this.src='https://placehold.co/40x40'"></td>
          <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.title}" onclick="window._showProductOrders('${p.id}')"><strong>${p.title}</strong></td>
          <td onclick="window._showProductOrders('${p.id}')"><strong>${fmtPrice(p.price)}</strong> ${p.currency}<br><small style="color:var(--muted);text-decoration:line-through;">${p.priceOld ? fmtPrice(p.priceOld) : ''}</small></td>
          <td onclick="window._showProductOrders('${p.id}')">${p.stock}</td>
          <td onclick="window._showProductOrders('${p.id}')">
            <span class="badge ${pOrders.length > 0 ? 'badge-blue' : 'badge-gray'}" style="font-size:11px; font-weight:700; cursor:pointer;">
              <i class="fa fa-shopping-bag" style="font-size:10px; margin-right:3px;"></i>${pOrders.length} order${pOrders.length !== 1 ? 's' : ''}
            </span>
          </td>
          <td onclick="window._showProductOrders('${p.id}')"><span style="font-family:monospace;font-size:12px;color:var(--muted);">${p.code || '—'}</span></td>
          <td style="display:flex;gap:6px;flex-wrap:wrap;" onclick="event.stopPropagation();">
            <a href="/product/${p.id}" target="_blank" class="btn btn-ghost btn-sm" onclick="event.stopPropagation();" title="View product page"><i class="fa fa-eye"></i></a>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window._editProduct('${p.id}')" title="Edit product"><i class="fa fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window._deleteProduct('${p.id}')" title="Delete product"><i class="fa fa-trash"></i></button>
          </td>
        </tr>`;
    }).join('');
  };

  window._showProductOrders = (id) => {
    const product = products.find(x => x.id === id);
    if (product) {
      showProductOrdersModal(product, getProductOrders(product, orders));
    }
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

// ── Settings ──────────────────────────────────────────────
async function renderSettings(el) {
  el.innerHTML = `
    <div class="admin-topbar">
      <h1>Settings</h1>
    </div>
    <div class="table-card" style="padding:0; max-width: 800px;">
      <div style="padding: 24px 28px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size:18px; font-weight:700; color:#fff; margin:0 0 4px 0; display:flex; align-items:center; gap:10px;">
            <i class="fa-brands fa-facebook" style="color: #1877f2; font-size: 22px;"></i> Facebook Pixel Configuration
          </h2>
          <p style="font-size:13px; color:var(--muted); margin:0;">Configure Meta Pixel tracking for your online store.</p>
        </div>
        <span class="badge badge-blue" style="font-size:11px; font-weight:600;"><i class="fa fa-chart-line"></i> Meta Events</span>
      </div>
      <form id="settingsForm" style="padding:28px;">
        <div class="empty-state" id="settingsLoading"><i class="fa fa-spinner fa-spin"></i><p>Loading settings…</p></div>
        <div id="settingsFields" style="display:none; flex-direction:column; gap:20px;">
          <div class="form-group full">
            <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
              <span>Facebook Pixel ID *</span>
              <small style="color:var(--accent); font-weight:400;">Format: 15-16 digits</small>
            </label>
            <div style="position:relative;">
              <i class="fa fa-key" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--muted);"></i>
              <input type="text" class="form-control" id="s-fbPixelId" placeholder="e.g. 950990427685437" style="padding-left:40px; font-family:monospace;" required>
            </div>
            <p style="font-size:12px; color:var(--muted); margin-top:6px;">
              Enter your Meta Pixel ID from Events Manager (e.g. <code>950990427685437</code>).
            </p>
          </div>

          <div class="form-group full">
            <label class="form-label">Pixel Status</label>
            <select class="form-control" id="s-fbPixelEnabled">
              <option value="true">Enabled (Active Tracking)</option>
              <option value="false">Disabled (Pause Tracking)</option>
            </select>
          </div>

          <div style="background: rgba(24, 119, 242, 0.08); border: 1px solid rgba(24, 119, 242, 0.2); border-radius: 12px; padding: 18px 20px; color: #e2e8f0; font-size: 13.5px; line-height: 1.6;">
            <div style="font-weight: 700; color: #60a5fa; margin-bottom: 8px; display:flex; align-items:center; gap:8px;">
              <i class="fa fa-circle-info"></i> How Meta Pixel Tracking Works
            </div>
            <ul style="margin: 0; padding-left: 18px; color: #cbd5e1; display:flex; flex-direction:column; gap:6px;">
              <li><strong>PageView:</strong> Automatically tracked on all store page visits.</li>
              <li><strong>InitiateCheckout:</strong> Fired when a customer starts ordering a product.</li>
              <li><strong>Purchase:</strong> Fired when an order is successfully submitted.</li>
            </ul>
          </div>

          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:12px;">
            <button type="submit" class="btn btn-primary" id="saveSettingsBtn">
              <i class="fa fa-save"></i> Save Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  `;

  const settings = await api.getSettings();

  document.getElementById('settingsLoading').style.display = 'none';
  const fields = document.getElementById('settingsFields');
  fields.style.display = 'flex';

  document.getElementById('s-fbPixelId').value = settings.facebookPixelId || '';
  document.getElementById('s-fbPixelEnabled').value = settings.facebookPixelEnabled !== false ? 'true' : 'false';

  document.getElementById('settingsForm').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('saveSettingsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';

    const data = {
      facebookPixelId: document.getElementById('s-fbPixelId').value.trim(),
      facebookPixelEnabled: document.getElementById('s-fbPixelEnabled').value === 'true'
    };

    try {
      const res = await api.updateSettings(data);
      if (res.ok) {
        toast('Facebook Pixel settings saved successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      toast('Network error. Failed to save.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-save"></i> Save Settings';
    }
  };
}

