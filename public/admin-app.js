import { api, toast, navigate, fmtPrice, fmtDate, statusBadge, confirmDialog } from './admin-utils.js';

const COUNTRY_MAP = {
  CI: "Côte d'Ivoire", SN: "Sénégal", BF: "Burkina Faso", TG: "Togo",
  BJ: "Bénin", ML: "Mali", GA: "Gabon", CM: "Cameroun",
  GN: "Guinée", CD: "RDC", CG: "Congo", TD: "Tchad"
};

// ── Currency & Exchange Rate Configuration ──────────────────
// Base currency: CFA | Rates: 1$ = 645 CFA, 1$ = 10,200 GNF
export const RATES = {
  USD_TO_CFA: 645,
  USD_TO_GNF: 10200,
  GNF_TO_CFA: 645 / 10200, // ≈ 0.0632353 CFA per 1 GNF
  CFA_TO_GNF: 10200 / 645  // ≈ 15.81395 GNF per 1 CFA
};

export function getOrderCurrency(order) {
  if (!order) return 'CFA';
  const pays = String(order.pays || order.country || '').trim().toUpperCase();
  const curr = String(order.currency || '').trim().toUpperCase();
  const prix = String(order.prix || '').trim().toUpperCase();
  if (pays === 'GN' || pays === 'GUINÉE' || pays === 'GUINEE' || curr === 'GNF' || prix.includes('GNF')) {
    return 'GNF';
  }
  return order.currency || 'CFA';
}

export function isOrderGNF(order) {
  return getOrderCurrency(order) === 'GNF';
}

// Normalized to CFA for unified store stats, charts, and metrics
export function getOrderRevenueCFA(order) {
  if (!order) return 0;
  const raw = Number(order.total) || 0;
  if (isOrderGNF(order)) {
    return Math.round(raw * RATES.GNF_TO_CFA);
  }
  return raw;
}

// ── Theme Management ─────────────────────────────────────
window.getAdminTheme = function() {
  try {
    return localStorage.getItem('admin_theme') || 'light';
  } catch (e) {
    return 'light';
  }
};

window.setAdminTheme = function(theme) {
  try {
    localStorage.setItem('admin_theme', theme);
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', theme);
  window.updateThemeUI();
  window.dispatchEvent(new CustomEvent('adminthemechange', { detail: { theme } }));
};

window.toggleAdminTheme = function() {
  const current = window.getAdminTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  window.setAdminTheme(next);
};

window.updateThemeUI = function() {
  const isDark = window.getAdminTheme() === 'dark';
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      icon.style.color = isDark ? '#fbbf24' : '';
    }
  });
};

// Global click delegation for all theme toggle buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-toggle-btn');
  if (btn) {
    e.preventDefault();
    window.toggleAdminTheme();
  }
});

// Immediately apply saved theme
window.setAdminTheme(window.getAdminTheme());

// ── Router ──────────────────────────────────────────────
function router() {
  const path = window.location.pathname;
  const root = document.getElementById('admin-root');
  if (!root) return;

  renderShell(root, path);

  const main = document.getElementById('admin-main');
  if (path === '/admin/orders') renderOrders(main);
  else if (path === '/admin/settings') renderSettings(main);
  else if (path === '/admin/customers') renderCustomers(main);
  else if (path === '/admin/reviews') renderPlaceholderPage(main, 'Product Reviews', 'fa-star', 'Moderate and publish customer testimonials, star ratings, and feedback.');
  else if (path === '/admin/delivery') renderPlaceholderPage(main, 'Delivery & Logistics', 'fa-truck-fast', 'Track shipping carriers, local delivery hubs, and dispatch statuses.');
  else if (path === '/admin/team') renderPlaceholderPage(main, 'Team Management', 'fa-user-group', 'Manage administrator permissions, staff access, and role assignments.');
  else if (path === '/admin/ai') renderPlaceholderPage(main, 'AI Agents', 'fa-wand-magic-sparkles', 'Automate marketing copywriting, customer live assistance, and dynamic product recommendations.');
  else if (path === '/admin/api-ref') renderPlaceholderPage(main, 'API Reference', 'fa-code', 'Developer API documentation, authentication keys, and webhooks.');
  else if (path === '/admin/products/new') renderProductForm(main, null);
  else if (path.startsWith('/admin/products/edit/')) {
    const id = path.split('/').pop();
    renderProductFormById(main, id);
  } else if (path === '/admin/products') renderProducts(main);
  else renderDashboard(main);

  window.updateThemeUI();
}

window.addEventListener('routechange', router);
window.addEventListener('popstate', router);
router();

// ── Placeholder Module View ──────────────────────────────
function renderPlaceholderPage(el, title, icon, description) {
  el.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1 style="margin:0 0 4px 0;">${title}</h1>
        <p style="font-size:13px; color:var(--muted); margin:0;">${description}</p>
      </div>
      <div class="topbar-actions">
        <a href="/" target="_blank" class="topbar-icon-btn" title="View Storefront"><i class="fa fa-arrow-up-right-from-square"></i></a>
        <button class="topbar-icon-btn theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
        <button class="topbar-icon-btn" title="Notifications"><i class="fa fa-bell"></i></button>
      </div>
    </div>
    <div class="table-card" style="padding: 60px 24px; text-align: center; max-width: 680px; margin: 30px auto;">
      <div style="width: 68px; height: 68px; border-radius: 20px; background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(124, 58, 237, 0.15)); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px auto; border: 1px solid rgba(124, 58, 237, 0.2);">
        <i class="fa-solid ${icon}"></i>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; color: var(--text); margin-bottom: 8px;">${title} Module</h2>
      <p style="font-size: 14px; color: var(--muted); line-height: 1.6; max-width: 480px; margin: 0 auto 28px auto;">
        ${description} This section is fully configured and ready for store expansion.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn btn-primary" id="phGoHome"><i class="fa fa-arrow-left"></i> Back to Dashboard</button>
        <button class="btn btn-ghost" id="phGoOrders"><i class="fa-solid fa-bag-shopping"></i> View Orders</button>
      </div>
    </div>
  `;
  el.querySelector('#phGoHome').onclick = () => navigate('/admin');
  el.querySelector('#phGoOrders').onclick = () => navigate('/admin/orders');
}

// ── Shell ────────────────────────────────────────────────
function renderShell(root, path) {
  const navSections = [
    {
      category: 'GENERAL',
      items: [
        { href: '/admin', icon: 'fa-solid fa-shapes', label: 'Dashboard' },
        { href: '/admin/orders', icon: 'fa-solid fa-bag-shopping', label: 'Orders', hasBadge: true, hasChevron: true },
        { href: '/admin/customers', icon: 'fa-solid fa-users', label: 'Customers' },
        { href: '/admin/reviews', icon: 'fa-solid fa-star', label: 'Reviews' },
      ]
    },
    {
      category: 'INVENTORY',
      items: [
        { href: '/admin/products', icon: 'fa-solid fa-boxes-stacked', label: 'Products', hasChevron: true },
        { href: '/admin/delivery', icon: 'fa-solid fa-truck-fast', label: 'Delivery' },
      ]
    },
    {
      category: 'SYSTEM',
      items: [
        { href: '/admin/team', icon: 'fa-solid fa-user-group', label: 'Team' },
        { href: '/admin/ai', icon: 'fa-solid fa-wand-magic-sparkles', label: 'AI Agents' },
        { href: '/admin/api-ref', icon: 'fa-solid fa-code', label: 'API Reference' },
      ]
    }
  ];

  if (!document.getElementById('admin-sidebar')) {
    root.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar" id="admin-sidebar">
          <!-- Top Floating Logo Card -->
          <a href="/admin" class="admin-logo-card" data-nav data-href="/admin">
            <div class="admin-logo-badge">
              <i class="fa-solid fa-shapes"></i>
            </div>
            <div>
              <div class="admin-logo-title">Dashboard</div>
              <div class="admin-logo-sub">DASHBOARD</div>
            </div>
          </a>

          <!-- Categorized Nav Items -->
          <nav class="admin-nav">
            ${navSections.map(sec => `
              <div class="admin-nav-category">${sec.category}</div>
              ${sec.items.map(item => `
                <a href="${item.href}" class="admin-nav-item ${isActive(item.href, path)}" data-nav data-href="${item.href}">
                  <i class="${item.icon}"></i>
                  <span>${item.label}</span>
                  ${item.hasBadge ? `<span class="nav-badge" id="sidebarOrdersBadge" style="display:none;">0</span>` : ''}
                  ${item.hasChevron ? `<i class="fa-solid fa-chevron-right admin-nav-chevron"></i>` : ''}
                </a>
              `).join('')}
            `).join('')}
          </nav>

          <!-- Sidebar Footer with Settings Pill & User Card -->
          <div class="admin-sidebar-footer">
            <a href="/admin/settings" class="sidebar-settings-btn ${path === '/admin/settings' ? 'active' : ''}" data-nav data-href="/admin/settings">
              <i class="fa-solid fa-gear"></i>
              <span>Settings</span>
            </a>

            <div class="admin-user-card">
              <div style="display:flex; align-items:center; gap:10px;">
                <div class="admin-user-avatar-wrap">
                  <div class="admin-user-avatar">AD</div>
                  <div class="admin-user-online"></div>
                </div>
                <div>
                  <div class="admin-user-name">Admin</div>
                  <div class="admin-user-role">ADMINISTRATOR</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <button class="topbar-icon-btn theme-toggle-btn" style="width:30px; height:30px; font-size:12px;" title="Toggle Theme">
                  <i class="fa-solid fa-moon"></i>
                </button>
                <button class="admin-logout-btn" id="logoutBtn" title="Log out">
                  <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
              </div>
            </div>
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
      if (a.classList.contains('sidebar-settings-btn')) {
        a.className = `sidebar-settings-btn ${path === href ? 'active' : ''}`;
      } else if (a.classList.contains('admin-nav-item')) {
        a.className = `admin-nav-item ${isActive(href, path)}`;
      }
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
        <h1 style="margin:0 0 4px 0;">Dashboard</h1>
        <p style="font-size:13px; color:var(--muted); margin:0;">Real-time overview of store performance, revenue, and order metrics.</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div class="preset-group">
          <button class="preset-btn active" data-preset="all">All Time</button>
          <button class="preset-btn" data-preset="today">Today</button>
          <button class="preset-btn" data-preset="7d">7 Days</button>
          <button class="preset-btn" data-preset="30d">30 Days</button>
        </div>
        <div class="date-filter-box">
          <span>From</span>
          <input type="date" class="date-input-field" id="dashStartDateFilter">
          <span>To</span>
          <input type="date" class="date-input-field" id="dashEndDateFilter">
        </div>
        <div class="topbar-actions">
          <a href="/" target="_blank" class="topbar-icon-btn" title="View Storefront"><i class="fa fa-arrow-up-right-from-square"></i></a>
          <button class="topbar-icon-btn theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
          <button class="topbar-icon-btn" title="Notifications"><i class="fa-solid fa-bell"></i></button>
        </div>
      </div>
    </div>
    <div id="dash-content"><p style="color:var(--muted); padding:40px 0;"><i class="fa fa-spinner fa-spin"></i> Loading analytics...</p></div>`;

  const [orders, products] = await Promise.all([api.getOrders(), api.getProducts()]);
  window._cachedOrders = orders;

  let revChart = null;
  let statusChart = null;

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

    const revenue = completed.reduce((s, o) => s + getOrderRevenueCFA(o), 0);
    const convRate = filteredOrders.length ? ((completed.length / filteredOrders.length) * 100).toFixed(1) : '0.0';
    const aov = completed.length ? Math.round(revenue / completed.length) : 0;

    // Top Selling Products Calculation (revenue normalized in CFA)
    const productSalesMap = {};
    completed.forEach(o => {
      const pName = (o.produit || 'Unknown').split(' (')[0].trim();
      if (!productSalesMap[pName]) {
        productSalesMap[pName] = { title: pName, ordersCount: 0, totalQty: 0, revenue: 0 };
      }
      productSalesMap[pName].ordersCount += 1;
      productSalesMap[pName].totalQty += (Number(o.quantity) || 1);
      productSalesMap[pName].revenue += getOrderRevenueCFA(o);
    });

    const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);
    const topProduct = topProducts[0] || null;

    // Country Breakdown Calculation (revenue normalized in CFA with GNF tracking)
    const countryMap = {};
    filteredOrders.forEach(o => {
      const code = o.pays || 'Other';
      if (!countryMap[code]) {
        countryMap[code] = {
          code,
          name: COUNTRY_MAP[code] || code,
          total: 0,
          completed: 0,
          revenue: 0,
          nativeRevenue: 0,
          currency: code === 'GN' ? 'GNF' : 'CFA'
        };
      }
      countryMap[code].total += 1;
      if (o.status === 'COMPLETED') {
        countryMap[code].completed += 1;
        countryMap[code].revenue += getOrderRevenueCFA(o);
        countryMap[code].nativeRevenue += (Number(o.total) || 0);
      }
    });
    const countryList = Object.values(countryMap).sort((a, b) => b.total - a.total);

    // ── Campaign & Ad Attribution Analysis ───────────────────
    const productAttributionMap = {};
    const globalCampaignMap = {};
    const globalAdMap = {};
    let trackedOrdersCount = 0;

    completed.forEach(o => {
      const pRaw = (o.produit || 'Unknown Product').trim();
      const pTitle = pRaw.split(' (')[0].trim();
      const pCode = (o.code || '').trim();
      const prodKey = pTitle || 'Unknown';

      const matchedCatalogProduct = products.find(p => {
        if (p.id && o.productId && String(p.id) === String(o.productId)) return true;
        if (p.code && pCode && p.code.toLowerCase() === pCode.toLowerCase()) return true;
        if (p.title && (p.title.toLowerCase() === pTitle.toLowerCase() || pTitle.toLowerCase().includes(p.title.toLowerCase()) || p.title.toLowerCase().includes(pTitle.toLowerCase()))) return true;
        return false;
      });

      const featuredImage = matchedCatalogProduct?.featuredImage || '';
      const productCode = pCode || matchedCatalogProduct?.code || '—';

      const rawCampaign = (o.utm_campaign || o.campaign || '').trim();
      const rawAd = (o.utm_content || o.ad || o.ad_name || o.creative || '').trim();
      const rawSource = (o.utm_source || o.source || '').trim();

      const campaignName = rawCampaign || 'Direct / Organic';
      const adName = rawAd || (rawCampaign ? 'General Campaign (No Ad Tag)' : 'Direct / No Ad Tag');
      const isTracked = !!(rawCampaign || rawAd || rawSource);
      if (isTracked) trackedOrdersCount++;

      const orderRevenue = getOrderRevenueCFA(o);
      const orderQty = Number(o.quantity) || 1;

      if (!productAttributionMap[prodKey]) {
        productAttributionMap[prodKey] = {
          title: pTitle,
          code: productCode,
          image: featuredImage,
          totalPurchases: 0,
          totalRevenue: 0,
          totalQty: 0,
          campaigns: {},
          ads: {},
        };
      }

      const prodAtt = productAttributionMap[prodKey];
      prodAtt.totalPurchases += 1;
      prodAtt.totalRevenue += orderRevenue;
      prodAtt.totalQty += orderQty;

      if (!prodAtt.campaigns[campaignName]) {
        prodAtt.campaigns[campaignName] = {
          name: campaignName,
          purchases: 0,
          revenue: 0,
          qty: 0,
          source: rawSource,
          isTracked: !!rawCampaign,
          abandoned: 0
        };
      }
      prodAtt.campaigns[campaignName].purchases += 1;
      prodAtt.campaigns[campaignName].revenue += orderRevenue;
      prodAtt.campaigns[campaignName].qty += orderQty;

      if (!prodAtt.ads[adName]) {
        prodAtt.ads[adName] = {
          name: adName,
          purchases: 0,
          revenue: 0,
          qty: 0,
          campaign: rawCampaign,
          source: rawSource,
          isTracked: !!rawAd,
          abandoned: 0
        };
      }
      prodAtt.ads[adName].purchases += 1;
      prodAtt.ads[adName].revenue += orderRevenue;
      prodAtt.ads[adName].qty += orderQty;

      if (!globalCampaignMap[campaignName]) {
        globalCampaignMap[campaignName] = {
          name: campaignName,
          purchases: 0,
          revenue: 0,
          qty: 0,
          source: rawSource,
          isTracked: !!rawCampaign,
          products: {},
          abandoned: 0
        };
      }
      globalCampaignMap[campaignName].purchases += 1;
      globalCampaignMap[campaignName].revenue += orderRevenue;
      globalCampaignMap[campaignName].qty += orderQty;
      globalCampaignMap[campaignName].products[pTitle] = (globalCampaignMap[campaignName].products[pTitle] || 0) + 1;

      if (!globalAdMap[adName]) {
        globalAdMap[adName] = {
          name: adName,
          purchases: 0,
          revenue: 0,
          qty: 0,
          campaign: rawCampaign,
          source: rawSource,
          isTracked: !!rawAd,
          products: {},
          abandoned: 0
        };
      }
      globalAdMap[adName].purchases += 1;
      globalAdMap[adName].revenue += orderRevenue;
      globalAdMap[adName].qty += orderQty;
      globalAdMap[adName].products[pTitle] = (globalAdMap[adName].products[pTitle] || 0) + 1;
    });

    filteredOrders.filter(o => o.status === 'ABANDONED').forEach(o => {
      const pRaw = (o.produit || 'Unknown Product').trim();
      const pTitle = pRaw.split(' (')[0].trim();
      const rawCampaign = (o.utm_campaign || o.campaign || '').trim();
      const rawAd = (o.utm_content || o.ad || o.ad_name || o.creative || '').trim();
      const campaignName = rawCampaign || 'Direct / Organic';
      const adName = rawAd || (rawCampaign ? 'General Campaign (No Ad Tag)' : 'Direct / No Ad Tag');

      if (productAttributionMap[pTitle]) {
        if (productAttributionMap[pTitle].campaigns[campaignName]) {
          productAttributionMap[pTitle].campaigns[campaignName].abandoned = (productAttributionMap[pTitle].campaigns[campaignName].abandoned || 0) + 1;
        }
        if (productAttributionMap[pTitle].ads[adName]) {
          productAttributionMap[pTitle].ads[adName].abandoned = (productAttributionMap[pTitle].ads[adName].abandoned || 0) + 1;
        }
      }
      if (globalCampaignMap[campaignName]) {
        globalCampaignMap[campaignName].abandoned = (globalCampaignMap[campaignName].abandoned || 0) + 1;
      }
      if (globalAdMap[adName]) {
        globalAdMap[adName].abandoned = (globalAdMap[adName].abandoned || 0) + 1;
      }
    });

    const productAttributionList = Object.values(productAttributionMap).map(item => {
      const campList = Object.values(item.campaigns).sort((a, b) => {
        if (b.purchases !== a.purchases) return b.purchases - a.purchases;
        if (b.isTracked !== a.isTracked) return (b.isTracked ? 1 : 0) - (a.isTracked ? 1 : 0);
        return b.revenue - a.revenue;
      });

      const topCampaign = campList[0] || null;

      const adList = Object.values(item.ads).sort((a, b) => {
        if (b.purchases !== a.purchases) return b.purchases - a.purchases;
        if (b.isTracked !== a.isTracked) return (b.isTracked ? 1 : 0) - (a.isTracked ? 1 : 0);
        return b.revenue - a.revenue;
      });

      const topAd = adList[0] || null;

      return {
        ...item,
        topCampaign,
        topAd,
        campaignsList: campList,
        adsList: adList
      };
    }).sort((a, b) => b.totalPurchases - a.totalPurchases);

    const sortedGlobalCampaigns = Object.values(globalCampaignMap).sort((a, b) => {
      if (b.purchases !== a.purchases) return b.purchases - a.purchases;
      return b.revenue - a.revenue;
    });
    const topOverallCampaign = sortedGlobalCampaigns.find(c => c.isTracked) || sortedGlobalCampaigns[0] || null;

    const sortedGlobalAds = Object.values(globalAdMap).sort((a, b) => {
      if (b.purchases !== a.purchases) return b.purchases - a.purchases;
      return b.revenue - a.revenue;
    });
    const topOverallAd = sortedGlobalAds.find(a => a.isTracked) || sortedGlobalAds[0] || null;

    const trackedPercent = completed.length ? Math.round((trackedOrdersCount / completed.length) * 100) : 0;

    window._currentAttribution = {
      productList: productAttributionList,
      campaignsList: sortedGlobalCampaigns,
      adsList: sortedGlobalAds,
      topOverallCampaign,
      topOverallAd,
      trackedPercent,
      trackedOrdersCount,
      completedCount: completed.length
    };

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
        revData.push(dayCompleted.reduce((s, o) => s + getOrderRevenueCFA(o), 0));
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
        revData.push(dayCompleted.reduce((s, o) => s + getOrderRevenueCFA(o), 0));
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
          <div class="kpi-sub"><i class="fa fa-check-circle" style="color:var(--green);"></i> ${completed.length} paid orders <span style="font-size:11px; color:var(--muted); margin-left:4px;" title="1$ = 645 CFA = 10,200 GNF">(GN converted)</span></div>
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
                    <span style="color:var(--green); font-weight:600;">
                      ${fmtPrice(c.revenue)} CFA
                      ${c.code === 'GN' && c.nativeRevenue ? `<small style="color:var(--muted); font-weight:500;"> (${fmtPrice(c.nativeRevenue)} GNF)</small>` : ''}
                    </span>
                  </div>
                </div>
              `;
            }).join('') : `<div class="empty-state" style="padding:24px;"><p>No geographic data yet.</p></div>`}
          </div>
        </div>
      </div>

      <!-- Campaign & Ad Attribution by Product Section -->
      <div class="table-card" style="margin-bottom: 24px;">
        <div class="table-header" style="flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.2)); border: 1px solid rgba(99, 102, 241, 0.3); display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--accent);">
              <i class="fa fa-bullhorn"></i>
            </div>
            <div>
              <span class="table-title" style="margin: 0; display: block; font-size: 15px; font-weight: 700;">
                Campaign & Ad Attribution by Product
              </span>
              <small style="color: var(--muted); font-size: 12px;">
                Identifies which marketing campaign or ad creative gathers the most purchases for each product.
              </small>
            </div>
          </div>

          <!-- Quick Attribution Highlights -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            ${topOverallCampaign ? `
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); padding: 4px 10px; border-radius: 8px; font-size: 11px;">
                <span style="color: var(--muted); text-transform: uppercase; font-weight: 700; font-size: 10px;"><i class="fa fa-bullseye" style="color:#818cf8;"></i> Top Campaign:</span>
                <strong style="color: #a5b4fc; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${topOverallCampaign.name}">${topOverallCampaign.name}</strong>
                <span class="badge badge-blue" style="font-size: 10px; padding: 1px 6px;">${topOverallCampaign.purchases} sales</span>
              </div>
            ` : ''}

            ${topOverallAd ? `
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(236, 72, 153, 0.08); border: 1px solid rgba(236, 72, 153, 0.25); padding: 4px 10px; border-radius: 8px; font-size: 11px;">
                <span style="color: var(--muted); text-transform: uppercase; font-weight: 700; font-size: 10px;"><i class="fa fa-rectangle-ad" style="color:#f472b6;"></i> Top Ad:</span>
                <strong style="color: #f472b6; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${topOverallAd.name}">${topOverallAd.name}</strong>
                <span class="badge" style="background:rgba(236,72,153,0.18);color:#f472b6;font-size: 10px; padding: 1px 6px;">${topOverallAd.purchases} sales</span>
              </div>
            ` : ''}

            <div style="display: flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); padding: 4px 10px; border-radius: 8px; font-size: 11px;">
              <span style="color: var(--muted); text-transform: uppercase; font-weight: 700; font-size: 10px;"><i class="fa fa-chart-line" style="color:var(--green);"></i> Tracked:</span>
              <strong style="color: var(--green);">${trackedPercent}%</strong>
              <small style="color: var(--muted);">(${trackedOrdersCount}/${completed.length})</small>
            </div>
          </div>
        </div>

        <!-- Controls Toolbar: Tabs & Search Filter -->
        <div style="padding: 12px 20px; background: rgba(255, 255, 255, 0.015); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div class="att-tab-group" id="attTabGroup">
            <button class="att-tab-btn active" data-tab="product">
              <i class="fa fa-boxes-stacked"></i> By Product (${productAttributionList.length})
            </button>
            <button class="att-tab-btn" data-tab="campaigns">
              <i class="fa fa-bullseye"></i> Top Campaigns (${sortedGlobalCampaigns.length})
            </button>
            <button class="att-tab-btn" data-tab="ads">
              <i class="fa fa-rectangle-ad"></i> Top Ads / Creatives (${sortedGlobalAds.length})
            </button>
          </div>

          <div style="position: relative; min-width: 220px;">
            <i class="fa fa-search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 11px; color: var(--muted);"></i>
            <input type="text" id="attSearchInput" placeholder="Filter product, campaign, or ad..." style="width: 100%; padding: 6px 10px 6px 28px; font-size: 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); outline: none; font-family: inherit;">
          </div>
        </div>

        <!-- Dynamic Attribution Content Container -->
        <div id="attDynamicContainer" style="overflow-x: auto;"></div>
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
            ${[...filteredOrders].sort((a, b) => {
              const timeA = new Date(a.date || a.savedAt || 0).getTime();
              const timeB = new Date(b.date || b.savedAt || 0).getTime();
              return timeB - timeA;
            }).slice(0, 6).map(o => `
              <tr class="order-row" style="cursor:pointer;" onclick="window._showOrderDetail('${o.order_id}')" title="Click to view & edit order">
                <td style="color:var(--muted);font-size:12px;white-space:nowrap;">${fmtDate(o.date || o.savedAt)}</td>
                <td><strong>${o.nom}</strong><br><small style="color:var(--muted);">${o.telephone || ''}</small></td>
                <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.produit}">${o.produit}</td>
                <td>${COUNTRY_MAP[o.pays] || o.pays || '—'}</td>
                <td style="white-space:nowrap;">
                  <strong>${fmtPrice(o.total || 0)}</strong> <span style="font-size:11px; font-weight:700;">${getOrderCurrency(o)}</span>
                  ${isOrderGNF(o) ? `<br><small style="color:var(--muted); font-size:11px;">≈ ${fmtPrice(getOrderRevenueCFA(o))} CFA</small>` : ''}
                </td>
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

    const isDark = window.getAdminTheme() === 'dark';
    const chartTicksColor = isDark ? '#94a3b8' : '#64748b';
    const chartLegendColor = isDark ? '#cbd5e1' : '#475569';
    const chartGridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';

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
                borderColor: '#7c3aed',
                backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(124, 58, 237, 0.08)',
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
              },
              {
                label: 'Total Orders',
                data: ordData,
                borderColor: '#3b82f6',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.25)',
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
              legend: { display: true, labels: { color: chartLegendColor, font: { size: 11, family: 'Plus Jakarta Sans, sans-serif', weight: '600' } } }
            },
            scales: {
              x: { ticks: { color: chartTicksColor, font: { size: 11, family: 'Plus Jakarta Sans, sans-serif' } }, grid: { color: chartGridColor } },
              y: { type: 'linear', display: true, position: 'left', ticks: { color: chartTicksColor, font: { size: 11, family: 'Plus Jakarta Sans, sans-serif' } }, grid: { color: chartGridColor } },
              y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: chartTicksColor, font: { size: 11, family: 'Plus Jakarta Sans, sans-serif' }, precision: 0 } }
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
              legend: { position: 'bottom', labels: { color: chartLegendColor, font: { size: 11, family: 'Plus Jakarta Sans, sans-serif', weight: '600' }, padding: 14 } }
            }
          }
        });
      }
    }

    // Initialize Attribution Analytics Section
    initAttributionSection();
  };

  // Re-render charts automatically if theme toggles
  if (window._dashThemeHandler) {
    window.removeEventListener('adminthemechange', window._dashThemeHandler);
  }
  window._dashThemeHandler = () => {
    if (document.getElementById('revenueChart')) {
      updateDashboard();
    }
  };
  window.addEventListener('adminthemechange', window._dashThemeHandler);

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

// ── Attribution Analytics Component ──────────────────────
function initAttributionSection() {
  let currentTab = 'product';
  let currentQuery = '';

  const container = document.getElementById('attDynamicContainer');
  const tabGroup = document.getElementById('attTabGroup');
  const searchInput = document.getElementById('attSearchInput');
  if (!container) return;

  const updateView = () => {
    const data = window._currentAttribution || { productList: [], campaignsList: [], adsList: [] };

    if (currentTab === 'product') {
      const query = currentQuery.toLowerCase().trim();
      const filtered = data.productList.filter(p => {
        if (!query) return true;
        return (p.title || '').toLowerCase().includes(query) ||
               (p.code || '').toLowerCase().includes(query) ||
               (p.topCampaign?.name || '').toLowerCase().includes(query) ||
               (p.topAd?.name || '').toLowerCase().includes(query);
      });

      if (!filtered.length) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 44px 20px;">
            <i class="fa fa-bullhorn" style="font-size: 34px; color: var(--muted); margin-bottom: 10px;"></i>
            <p style="margin: 0; font-weight: 700; color: var(--text); font-size: 15px;">No product purchase attribution found</p>
            <p style="margin: 6px 0 0 0; font-size: 12.5px; color: var(--muted); max-width: 480px; margin-inline: auto; line-height: 1.5;">
              ${currentQuery ? 'No products or campaigns match your search query.' : 'No completed orders recorded in the selected time frame. As customers purchase from your ads with UTM parameters (?utm_campaign=...&utm_content=...), the top campaign and ad for each product will appear here.'}
            </p>
          </div>`;
        return;
      }

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width: 28%;">Product</th>
              <th style="width: 28%;">Top Campaign (Most Purchases)</th>
              <th style="width: 26%;">Top Ad / Creative</th>
              <th style="width: 18%; text-align: right;">Sales & Details</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(p => {
              const topCamp = p.topCampaign;
              const topAd = p.topAd;
              const campPct = p.totalPurchases > 0 && topCamp ? Math.round((topCamp.purchases / p.totalPurchases) * 100) : 0;
              const otherCamps = p.campaignsList.length - 1;
              const otherAds = p.adsList.length - 1;

              return `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <img src="${p.image || 'https://placehold.co/42x42'}" alt="" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;" onerror="this.src='https://placehold.co/42x42'">
                      <div style="min-width: 0;">
                        <strong style="font-size: 13.5px; color: var(--text); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;" title="${p.title}">
                          ${p.title}
                        </strong>
                        <div style="display: flex; gap: 6px; align-items: center; margin-top: 3px;">
                          <span style="font-family: monospace; font-size: 11px; color: var(--muted); background: var(--surface2); padding: 1px 6px; border-radius: 4px;">
                            ${p.code || 'N/A'}
                          </span>
                          <span style="font-size: 11px; color: var(--green); font-weight: 600;">
                            ${p.totalPurchases} order${p.totalPurchases > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    ${topCamp ? `
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                          <span class="${topCamp.isTracked ? 'att-badge-campaign' : 'att-badge-organic'}" title="${topCamp.name}">
                            <i class="fa ${topCamp.isTracked ? 'fa-bullseye' : 'fa-globe'}"></i>
                            <span>${topCamp.name}</span>
                          </span>
                          ${otherCamps > 0 ? `<span style="font-size: 10px; color: var(--muted); background: var(--surface2); padding: 2px 6px; border-radius: 6px;" title="${otherCamps} other campaign(s) drove purchases">+${otherCamps} more</span>` : ''}
                        </div>
                        <div style="font-size: 11.5px; color: var(--muted); display: flex; gap: 6px; align-items: center;">
                          <strong style="color: var(--green); font-weight: 700;">${topCamp.purchases} purchase${topCamp.purchases > 1 ? 's' : ''}</strong>
                          <span style="color: var(--muted2);">(${campPct}% share)</span>
                          <span style="color: var(--muted2);">·</span>
                          <span style="color: var(--text); font-weight: 600;">${fmtPrice(topCamp.revenue)} CFA</span>
                        </div>
                      </div>
                    ` : `<span style="color: var(--muted); font-size: 12px;">No campaign data</span>`}
                  </td>
                  <td>
                    ${topAd ? `
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                          <span class="${topAd.isTracked ? 'att-badge-ad' : 'att-badge-organic'}" title="${topAd.name}">
                            <i class="fa ${topAd.isTracked ? 'fa-rectangle-ad' : 'fa-tag'}"></i>
                            <span>${topAd.name}</span>
                          </span>
                          ${otherAds > 0 ? `<span style="font-size: 10px; color: var(--muted); background: var(--surface2); padding: 2px 6px; border-radius: 6px;" title="${otherAds} other ad(s) drove purchases">+${otherAds} more</span>` : ''}
                        </div>
                        <div style="font-size: 11.5px; color: var(--muted); display: flex; gap: 6px; align-items: center;">
                          <strong style="color: #f472b6; font-weight: 700;">${topAd.purchases} purchase${topAd.purchases > 1 ? 's' : ''}</strong>
                          <span style="color: var(--muted2);">·</span>
                          <span style="color: var(--text); font-weight: 600;">${fmtPrice(topAd.revenue)} CFA</span>
                        </div>
                      </div>
                    ` : `<span style="color: var(--muted); font-size: 12px;">No ad tracked</span>`}
                  </td>
                  <td style="text-align: right;">
                    <div>
                      <strong style="font-size: 13.5px; color: var(--text);">${fmtPrice(p.totalRevenue)} CFA</strong>
                      <div style="margin-top: 5px;">
                        <button class="btn btn-ghost btn-sm" onclick="window._showAttributionBreakdown('${encodeURIComponent(p.title)}')" style="padding: 4px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;" title="View all campaigns and ads for this product">
                          <i class="fa fa-chart-pie" style="color: var(--accent);"></i> Breakdown
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>`;
    } else if (currentTab === 'campaigns') {
      const query = currentQuery.toLowerCase().trim();
      const filtered = data.campaignsList.filter(c => {
        if (!query) return true;
        return c.name.toLowerCase().includes(query) || (c.source || '').toLowerCase().includes(query);
      });

      if (!filtered.length) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 44px 20px;">
            <i class="fa fa-bullseye" style="font-size: 34px; color: var(--muted); margin-bottom: 10px;"></i>
            <p style="margin: 0; font-weight: 700; color: var(--text); font-size: 15px;">No campaigns found</p>
            <p style="margin: 6px 0 0 0; font-size: 12.5px; color: var(--muted);">No campaigns recorded for this period.</p>
          </div>`;
        return;
      }

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width: 60px;">Rank</th>
              <th>Campaign Name</th>
              <th>Platform / Source</th>
              <th>Purchases</th>
              <th>Abandoned</th>
              <th>Revenue</th>
              <th>Products Driven</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((c, idx) => {
              const rankClass = idx === 0 ? 'att-rank-1' : (idx === 1 ? 'att-rank-2' : (idx === 2 ? 'att-rank-3' : 'att-rank-default'));
              const prodList = Object.entries(c.products || {}).map(([p, cnt]) => `${p} (${cnt})`).join(', ');
              return `
                <tr>
                  <td><span class="${rankClass}">#${idx + 1}</span></td>
                  <td>
                    <span class="${c.isTracked ? 'att-badge-campaign' : 'att-badge-organic'}" title="${c.name}">
                      <i class="fa ${c.isTracked ? 'fa-bullhorn' : 'fa-globe'}"></i> ${c.name}
                    </span>
                  </td>
                  <td><span class="badge badge-blue">${c.source || 'Direct'}</span></td>
                  <td><strong style="color: var(--green); font-size: 13.5px;">${c.purchases}</strong></td>
                  <td><span style="color: var(--muted); font-size: 12px;">${c.abandoned || 0}</span></td>
                  <td><strong style="color: var(--text);">${fmtPrice(c.revenue)} CFA</strong></td>
                  <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--muted);" title="${prodList}">
                    ${prodList || '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>`;
    } else if (currentTab === 'ads') {
      const query = currentQuery.toLowerCase().trim();
      const filtered = data.adsList.filter(a => {
        if (!query) return true;
        return a.name.toLowerCase().includes(query) || (a.campaign || '').toLowerCase().includes(query);
      });

      if (!filtered.length) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 44px 20px;">
            <i class="fa fa-rectangle-ad" style="font-size: 34px; color: var(--muted); margin-bottom: 10px;"></i>
            <p style="margin: 0; font-weight: 700; color: var(--text); font-size: 15px;">No ad creatives found</p>
            <p style="margin: 6px 0 0 0; font-size: 12.5px; color: var(--muted);">No ad creatives recorded for this period.</p>
          </div>`;
        return;
      }

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width: 60px;">Rank</th>
              <th>Ad / Creative Name</th>
              <th>Parent Campaign</th>
              <th>Purchases</th>
              <th>Abandoned</th>
              <th>Revenue</th>
              <th>Products Driven</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((a, idx) => {
              const rankClass = idx === 0 ? 'att-rank-1' : (idx === 1 ? 'att-rank-2' : (idx === 2 ? 'att-rank-3' : 'att-rank-default'));
              const prodList = Object.entries(a.products || {}).map(([p, cnt]) => `${p} (${cnt})`).join(', ');
              return `
                <tr>
                  <td><span class="${rankClass}">#${idx + 1}</span></td>
                  <td>
                    <span class="${a.isTracked ? 'att-badge-ad' : 'att-badge-organic'}" title="${a.name}">
                      <i class="fa ${a.isTracked ? 'fa-rectangle-ad' : 'fa-tag'}"></i> ${a.name}
                    </span>
                  </td>
                  <td><span style="font-size: 12px; color: var(--muted);">${a.campaign || 'Direct / None'}</span></td>
                  <td><strong style="color: #f472b6; font-size: 13.5px;">${a.purchases}</strong></td>
                  <td><span style="color: var(--muted); font-size: 12px;">${a.abandoned || 0}</span></td>
                  <td><strong style="color: var(--text);">${fmtPrice(a.revenue)} CFA</strong></td>
                  <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--muted);" title="${prodList}">
                    ${prodList || '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>`;
    }
  };

  if (tabGroup) {
    tabGroup.querySelectorAll('.att-tab-btn').forEach(btn => {
      btn.onclick = () => {
        tabGroup.querySelectorAll('.att-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.getAttribute('data-tab');
        updateView();
      };
    });
  }

  if (searchInput) {
    searchInput.oninput = (e) => {
      currentQuery = e.target.value;
      updateView();
    };
  }

  updateView();
}

window._showAttributionBreakdown = function(encodedTitle) {
  const title = decodeURIComponent(encodedTitle);
  const data = window._currentAttribution?.productList?.find(p => p.title === title);
  if (!data) {
    toast('Product attribution details not found', 'error');
    return;
  }

  const oldModal = document.getElementById('attribution-breakdown-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'attribution-breakdown-modal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 860px; width: 95%;">
      <div class="modal-head" style="padding: 20px 28px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${data.image || 'https://placehold.co/48x48'}" alt="" style="width: 48px; height: 48px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border);" onerror="this.src='https://placehold.co/48x48'">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="font-size: 17px; font-weight: 700; margin: 0; color: var(--text);">${data.title}</h2>
              <span style="font-family: monospace; background: var(--surface3); padding: 2px 7px; border-radius: 6px; font-size: 11.5px; color: var(--text-secondary);">${data.code || 'N/A'}</span>
            </div>
            <p style="font-size: 12px; color: var(--muted); margin: 4px 0 0 0;">
              Marketing Attribution Breakdown: All campaigns and ad creatives driving purchases for this product.
            </p>
          </div>
        </div>
        <button class="modal-close" id="closeAttBreakdownModal" style="font-size: 24px; padding: 4px 8px;">&times;</button>
      </div>

      <div style="padding: 14px 28px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; gap: 16px; flex-wrap: wrap;">
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 6px 14px; border-radius: 8px;">
          <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Total Purchases</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--green);">${data.totalPurchases} orders</div>
        </div>
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 6px 14px; border-radius: 8px;">
          <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Total Revenue</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--accent);">${fmtPrice(data.totalRevenue)} CFA</div>
        </div>
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 6px 14px; border-radius: 8px;">
          <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Campaigns Active</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--blue);">${data.campaignsList.length}</div>
        </div>
        <div style="background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.2); padding: 6px 14px; border-radius: 8px;">
          <div style="font-size: 10px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Ad Creatives Active</div>
          <div style="font-size: 16px; font-weight: 800; color: #f472b6;">${data.adsList.length}</div>
        </div>
      </div>

      <div class="modal-body" style="padding: 24px 28px; max-height: 65vh; overflow-y: auto; display: flex; flex-direction: column; gap: 24px;">
        <!-- Campaigns Section -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h3 style="font-size: 13.5px; font-weight: 700; color: var(--accent); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
              <i class="fa fa-bullhorn"></i> Campaigns Driving Purchases (${data.campaignsList.length})
            </h3>
            <small style="color: var(--muted);">Ranked by purchases</small>
          </div>
          <table class="admin-table" style="background: var(--surface2); border-radius: 10px;">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Source</th>
                <th>Purchases</th>
                <th>Sales Share</th>
                <th>Revenue</th>
                <th>Abandoned</th>
              </tr>
            </thead>
            <tbody>
              ${data.campaignsList.map(c => {
                const pct = data.totalPurchases > 0 ? Math.round((c.purchases / data.totalPurchases) * 100) : 0;
                return `
                  <tr>
                    <td>
                      <span class="${c.isTracked ? 'att-badge-campaign' : 'att-badge-organic'}">
                        <i class="fa ${c.isTracked ? 'fa-bullseye' : 'fa-globe'}"></i> ${c.name}
                      </span>
                    </td>
                    <td><span class="badge badge-blue">${c.source || 'Direct'}</span></td>
                    <td><strong style="color: var(--green); font-size: 13.5px;">${c.purchases}</strong></td>
                    <td><span class="badge" style="background:rgba(16,185,129,0.12);color:var(--green);">${pct}%</span></td>
                    <td><strong>${fmtPrice(c.revenue)} CFA</strong></td>
                    <td><span style="color: var(--muted);">${c.abandoned || 0}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Ads Section -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h3 style="font-size: 13.5px; font-weight: 700; color: #f472b6; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
              <i class="fa fa-rectangle-ad"></i> Ad Creatives Driving Purchases (${data.adsList.length})
            </h3>
            <small style="color: var(--muted);">Ranked by purchases</small>
          </div>
          <table class="admin-table" style="background: var(--surface2); border-radius: 10px;">
            <thead>
              <tr>
                <th>Ad / Creative</th>
                <th>Parent Campaign</th>
                <th>Purchases</th>
                <th>Sales Share</th>
                <th>Revenue</th>
                <th>Abandoned</th>
              </tr>
            </thead>
            <tbody>
              ${data.adsList.map(a => {
                const pct = data.totalPurchases > 0 ? Math.round((a.purchases / data.totalPurchases) * 100) : 0;
                return `
                  <tr>
                    <td>
                      <span class="${a.isTracked ? 'att-badge-ad' : 'att-badge-organic'}">
                        <i class="fa ${a.isTracked ? 'fa-rectangle-ad' : 'fa-tag'}"></i> ${a.name}
                      </span>
                    </td>
                    <td><span style="font-size: 12px; color: var(--muted);">${a.campaign || 'Direct / None'}</span></td>
                    <td><strong style="color: #f472b6; font-size: 13.5px;">${a.purchases}</strong></td>
                    <td><span class="badge" style="background:rgba(236,72,153,0.12);color:#f472b6;">${pct}%</span></td>
                    <td><strong>${fmtPrice(a.revenue)} CFA</strong></td>
                    <td><span style="color: var(--muted);">${a.abandoned || 0}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-footer" style="padding: 16px 28px;">
        <button class="btn btn-ghost" id="closeAttBreakdownBtn" type="button">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const closeModal = () => modal.remove();
  modal.querySelector('#closeAttBreakdownModal').onclick = closeModal;
  modal.querySelector('#closeAttBreakdownBtn').onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
};

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

  const completedList = productOrders.filter(o => o.status === 'COMPLETED');
  const abandonedCount = productOrders.filter(o => o.status === 'ABANDONED').length;
  const totalRevenue = completedList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Marketing attribution for this product
  const campSales = {};
  const adSales = {};
  completedList.forEach(o => {
    const c = (o.utm_campaign || o.campaign || '').trim();
    const a = (o.utm_content || o.ad || o.ad_name || o.creative || '').trim();
    if (c) campSales[c] = (campSales[c] || 0) + 1;
    if (a) adSales[a] = (adSales[a] || 0) + 1;
  });
  const topCampEntry = Object.entries(campSales).sort((a,b) => b[1] - a[1])[0];
  const topAdEntry = Object.entries(adSales).sort((a,b) => b[1] - a[1])[0];

  const STATUS_PRECEDENCE = { 'COMPLETED': 1, 'PENDING': 2, 'ABANDONED': 3 };
  const sortedOrders = [...productOrders].sort((a, b) => {
    const timeA = new Date(a.date || a.savedAt || 0).getTime();
    const timeB = new Date(b.date || b.savedAt || 0).getTime();
    return timeB - timeA;
  });

  const modal = document.createElement('div');
  modal.id = 'product-orders-modal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 920px; width: 95%;">
      <div class="modal-head" style="padding: 20px 28px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${product.featuredImage}" alt="${product.title}" style="width: 48px; height: 48px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border);" onerror="this.src='https://placehold.co/48x48'">
          <div>
            <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 4px 0; color: var(--text);">${product.title}</h2>
            <div style="display: flex; gap: 12px; align-items: center; font-size: 12px; color: var(--muted);">
              <span><i class="fa fa-barcode"></i> Code: <code>${product.code || 'N/A'}</code></span>
              <span><i class="fa fa-tag"></i> ${fmtPrice(product.price)} ${product.currency}</span>
            </div>
          </div>
        </div>
        <button class="modal-close" id="closeProductOrdersModal" style="font-size: 24px; padding: 4px 8px;">&times;</button>
      </div>

      <div style="padding: 16px 28px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; gap: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 8px 16px; border-radius: 10px;">
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Total Orders</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--blue);">${productOrders.length}</div>
          </div>
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px 16px; border-radius: 10px;">
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Completed</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--green);">${completedList.length}</div>
          </div>
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); padding: 8px 16px; border-radius: 10px;">
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Abandoned</div>
            <div style="font-size: 18px; font-weight: 800; color: #f59e0b;">${abandonedCount}</div>
          </div>
          <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 8px 16px; border-radius: 10px;">
            <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;">Total Revenue</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent);">
              ${fmtPrice(totalRevenue)} ${product.currency || 'CFA'}
              ${product.currency === 'GNF' ? `<span style="font-size:12px; font-weight:600; color:var(--muted);">(≈ ${fmtPrice(Math.round(totalRevenue * RATES.GNF_TO_CFA))} CFA)</span>` : ''}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          ${topCampEntry ? `
            <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); padding: 6px 12px; border-radius: 8px;">
              <div style="font-size: 10px; color: var(--accent); text-transform: uppercase; font-weight: 700;"><i class="fa fa-bullseye"></i> Top Campaign</div>
              <div style="font-size: 12px; font-weight: 700; color: var(--text); max-width: 140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${topCampEntry[0]}">${topCampEntry[0]}</div>
              <div style="font-size: 10.5px; color: var(--green); font-weight: 600;">${topCampEntry[1]} purchases</div>
            </div>
          ` : ''}
          ${topAdEntry ? `
            <div style="background: rgba(236, 72, 153, 0.08); border: 1px solid rgba(236, 72, 153, 0.25); padding: 6px 12px; border-radius: 8px;">
              <div style="font-size: 10px; color: #f472b6; text-transform: uppercase; font-weight: 700;"><i class="fa fa-rectangle-ad"></i> Top Ad</div>
              <div style="font-size: 12px; font-weight: 700; color: var(--text); max-width: 140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${topAdEntry[0]}">${topAdEntry[0]}</div>
              <div style="font-size: 10.5px; color: #f472b6; font-weight: 600;">${topAdEntry[1]} purchases</div>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="modal-body" style="padding: 0; max-height: 60vh; overflow-y: auto;">
        ${sortedOrders.length ? `
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
              ${sortedOrders.map(o => `
                <tr class="order-row" style="cursor:pointer;" onclick="window._showOrderDetail('${o.order_id}')" title="Click to view & edit order">
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
                  <td style="white-space:nowrap;">
                    <strong>${fmtPrice(o.total || 0)}</strong> <span style="font-size:11px; font-weight:700;">${getOrderCurrency(o)}</span>
                    ${isOrderGNF(o) ? `<br><small style="color:var(--muted); font-size:11px;">≈ ${fmtPrice(getOrderRevenueCFA(o))} CFA</small>` : ''}
                  </td>
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
      <div class="modal-footer" style="padding: 16px 28px;">
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
  el.innerHTML = `<div class="admin-topbar">
    <div>
      <h1 style="margin:0 0 4px 0;">Products</h1>
      <p style="font-size:13px; color:var(--muted); margin:0;">Manage store inventory, catalog items, pricing, and stock levels.</p>
    </div>
    <div class="topbar-actions">
      <button class="topbar-icon-btn theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
      <button class="btn btn-primary" id="addBtn"><i class="fa-solid fa-plus"></i> Add Product</button>
    </div>
  </div>
  <div class="table-card">
    <div class="table-header">
      <span class="table-title"><i class="fa-solid fa-boxes-stacked" style="color:var(--accent); margin-right:8px;"></i>All Products</span>
      <div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="pSearch" placeholder="Search products…"></div>
    </div>
    <table class="admin-table">
      <thead><tr><th style="width:68px;">Image</th><th>Title</th><th>Price</th><th>Stock</th><th>Orders</th><th>Code</th><th style="text-align:right;">Actions</th></tr></thead>
      <tbody id="pBody"><tr><td colspan="7"><div class="empty-state"><i class="fa fa-spinner fa-spin"></i><p>Loading…</p></div></td></tr></tbody>
    </table>
  </div>`;

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
          <td style="width:68px;" onclick="window._showProductOrders('${p.id}')"><img class="product-thumb" src="${p.featuredImage}" alt="${p.title}" style="width:48px;height:48px;min-width:48px;min-height:48px;object-fit:cover;border-radius:10px;border:1px solid var(--border);" onerror="this.src='https://placehold.co/48x48'"></td>
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
    <div>
      <h1 style="margin:0 0 4px 0;">Orders</h1>
      <p style="font-size:13px; color:var(--muted); margin:0;">Track customer purchases, fulfillment status, and delivery logistics.</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <div style="display:inline-flex; align-items:center; gap:6px; background:var(--surface2); border:1px solid var(--border); padding:5px 12px; border-radius:8px; font-size:11.5px; font-weight:600; color:var(--muted);" title="Guinea GNF conversion rate: 1 USD = 10,200 GNF = 645 CFA">
        <i class="fa-solid fa-coins" style="color:var(--accent);"></i> GN: 1$ = 10 200 GNF = 645 CFA
      </div>
      <div class="date-filter-box">
        <span>From</span>
        <input type="date" class="date-input-field" id="startDateFilter">
        <span>To</span>
        <input type="date" class="date-input-field" id="endDateFilter">
      </div>
      <select class="filter-select" id="statusFilter"><option value="">All Status</option><option value="COMPLETED">COMPLETED</option><option value="ABANDONED">ABANDONED</option></select>
      <div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="oSearch" placeholder="Search name, product, country…"></div>
      <button class="btn btn-ghost btn-sm" id="exportCsv"><i class="fa fa-download"></i>CSV</button>
      <button class="topbar-icon-btn theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
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
  window._cachedOrders = orders;
  const sortOrders = (list) => {
    return [...list].sort((a, b) => {
      const timeA = new Date(a.date || a.savedAt || 0).getTime();
      const timeB = new Date(b.date || b.savedAt || 0).getTime();
      return timeB - timeA;
    });
  };

  let filtered = sortOrders(orders);

  const render = () => {
    document.getElementById('oBody').innerHTML = filtered.length ? filtered.map(o => `
      <tr class="order-row" style="cursor:pointer;" onclick="window._showOrderDetail('${o.order_id}')" title="Click to view & edit order">
        <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${fmtDate(o.date||o.savedAt)}</td>
        <td style="font-family:monospace;font-size:11px;color:var(--muted);">${(o.order_id||'').slice(0,14)}</td>
        <td><strong>${o.nom}</strong><br><small style="color:var(--muted);">${o.telephone||''}</small></td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${o.produit}">${o.produit}</td>
        <td style="text-align:center;">${o.quantity||1}</td>
        <td style="white-space:nowrap;">
          <div style="font-weight:700;">${fmtPrice(o.total||0)} <span class="badge ${isOrderGNF(o) ? 'badge-purple' : ''}" style="font-size:10px; padding:1px 5px; margin-left:2px;">${getOrderCurrency(o)}</span></div>
          ${isOrderGNF(o) ? `<small style="color:var(--muted); font-size:11px;">≈ ${fmtPrice(getOrderRevenueCFA(o))} CFA</small>` : ''}
        </td>
        <td><strong>${o.pays||'—'}</strong></td>
        <td>${statusBadge(o.status)}</td>
      </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><i class="fa fa-inbox"></i><p>No orders found.</p></div></td></tr>`;
  };
  render();

  const applyFilters = () => {
    const q = document.getElementById('oSearch').value.toLowerCase();
    const s = document.getElementById('statusFilter').value;
    const startVal = document.getElementById('startDateFilter').value;
    const endVal = document.getElementById('endDateFilter').value;

    const matched = orders.filter(o => {
      const matchesSearch = !q || o.nom?.toLowerCase().includes(q) || o.produit?.toLowerCase().includes(q) || o.telephone?.includes(q) || o.pays?.toLowerCase().includes(q) || o.order_id?.toLowerCase().includes(q);
      const matchesStatus = !s || o.status === s;

      let matchesDate = true;
      const orderDateStr = o.date || o.savedAt;
      if (orderDateStr) {
        try {
          const d = new Date(orderDateStr);
          if (!isNaN(d.getTime())) {
            const orderDateFormatted = d.toISOString().split('T')[0];
            if (startVal && orderDateFormatted < startVal) matchesDate = false;
            if (endVal && orderDateFormatted > endVal) matchesDate = false;
          } else if (startVal || endVal) matchesDate = false;
        } catch (e) {
          if (startVal || endVal) matchesDate = false;
        }
      } else if (startVal || endVal) matchesDate = false;

      return matchesSearch && matchesStatus && matchesDate;
    });

    filtered = sortOrders(matched);
    render();
  };

  document.getElementById('oSearch').oninput = applyFilters;
  document.getElementById('statusFilter').onchange = applyFilters;
  document.getElementById('startDateFilter').onchange = applyFilters;
  document.getElementById('endDateFilter').onchange = applyFilters;

  document.getElementById('exportCsv').onclick = () => {
    const headers = ['Date','Order ID','Name','Phone','Country','City','Product','Qty','Total','Currency','Total_CFA','Status'];
    const rows = orders.map(o => [fmtDate(o.date||o.savedAt),o.order_id,o.nom,o.telephone,o.pays,o.adresse,o.produit,o.quantity||1,o.total||0,getOrderCurrency(o),getOrderRevenueCFA(o),o.status].map(v=>`"${v||''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = Object.assign(document.createElement('a'), { href: 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv), download: `orders_${new Date().toISOString().slice(0,10)}.csv` });
    a.click();
    toast('CSV exported!');
  };
}

// ── Customers Module ───────────────────────────────────────
function getCustomerInitials(name) {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getCustomerSegmentBadge(segment) {
  switch (segment) {
    case 'VIP':
      return `<span class="badge badge-gold" title="VIP: 2+ completed purchases or high spend"><i class="fa fa-crown" style="font-size:10px;"></i> VIP</span>`;
    case 'RETURNING':
      return `<span class="badge badge-purple" title="Returning: 2+ orders recorded"><i class="fa fa-repeat" style="font-size:10px;"></i> Returning</span>`;
    case 'BUYER':
      return `<span class="badge badge-green" title="Buyer: Completed at least 1 purchase"><i class="fa fa-check-circle" style="font-size:10px;"></i> Buyer</span>`;
    case 'PROSPECT':
      return `<span class="badge badge-orange" title="Prospect: Abandoned checkout only"><i class="fa fa-clock" style="font-size:10px;"></i> Prospect</span>`;
    default:
      return `<span class="badge badge-gray">${segment}</span>`;
  }
}

async function renderCustomers(el) {
  el.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1 style="margin:0 0 4px 0;">Customers</h1>
        <p style="font-size:13px; color:var(--muted); margin:0;">Manage customer profiles, purchase history, loyalty segments, and direct WhatsApp contacts.</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div style="display:inline-flex; align-items:center; gap:6px; background:var(--surface2); border:1px solid var(--border); padding:5px 12px; border-radius:8px; font-size:11.5px; font-weight:600; color:var(--muted);" title="Guinea GNF conversion rate: 1 USD = 10,200 GNF = 645 CFA">
          <i class="fa-solid fa-coins" style="color:var(--accent);"></i> GN: 1$ = 10 200 GNF = 645 CFA
        </div>
        <button class="btn btn-ghost btn-sm" id="exportCustomersCsv"><i class="fa fa-download"></i> Export CSV</button>
        <button class="topbar-icon-btn theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
      </div>
    </div>

    <!-- 4 KPI Overview Cards -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); margin-bottom: 24px;" id="customerKpis">
      <div class="kpi-card kpi-blue">
        <div class="kpi-icon"><i class="fa fa-users"></i></div>
        <div class="kpi-lbl">Total Profiles</div>
        <div class="kpi-val" id="kpiTotalCustomers"><i class="fa fa-spinner fa-spin" style="font-size:18px;"></i></div>
        <div class="kpi-sub" id="kpiSubCustomers">Loading customers…</div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-icon"><i class="fa fa-bag-shopping"></i></div>
        <div class="kpi-lbl">Paying Buyers</div>
        <div class="kpi-val" id="kpiPayingCustomers"><i class="fa fa-spinner fa-spin" style="font-size:18px;"></i></div>
        <div class="kpi-sub" id="kpiSubBuyers">With completed orders</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-icon"><i class="fa fa-repeat"></i></div>
        <div class="kpi-lbl">Repeat Buyers</div>
        <div class="kpi-val" id="kpiRepeatCustomers"><i class="fa fa-spinner fa-spin" style="font-size:18px;"></i></div>
        <div class="kpi-sub" id="kpiSubRepeat">Loyalty retention</div>
      </div>
      <div class="kpi-card kpi-orange">
        <div class="kpi-icon"><i class="fa fa-wallet"></i></div>
        <div class="kpi-lbl">Average Customer LTV</div>
        <div class="kpi-val" id="kpiAvgLtv"><i class="fa fa-spinner fa-spin" style="font-size:18px;"></i></div>
        <div class="kpi-sub" id="kpiSubLtv">Per paying customer</div>
      </div>
    </div>

    <!-- Main Customers Card with Filters -->
    <div class="table-card">
      <div class="table-header" style="flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="table-title"><i class="fa-solid fa-address-book" style="color:var(--accent); margin-right:8px;"></i>Customer Directory</span>
          <span class="badge badge-purple" id="customerCountBadge">0 profiles</span>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <select class="filter-select" id="segmentFilter">
            <option value="">All Segments</option>
            <option value="VIP">⭐ VIP Customers (2+ Orders or High Spend)</option>
            <option value="RETURNING">🔁 Returning Customers</option>
            <option value="BUYER">✅ Completed Buyers</option>
            <option value="PROSPECT">⏳ Prospects (Abandoned Only)</option>
          </select>
          <select class="filter-select" id="custCountryFilter">
            <option value="">All Countries</option>
          </select>
          <select class="filter-select" id="custSortFilter">
            <option value="spend">Sort: Highest Spend (LTV)</option>
            <option value="orders">Sort: Most Orders</option>
            <option value="recent">Sort: Most Recent Activity</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
          <div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="cSearch" placeholder="Search name, phone, city…"></div>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Location</th>
              <th>Orders</th>
              <th>Total Spend (CFA)</th>
              <th>Products Purchased</th>
              <th>Last Active</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="cBody">
            <tr><td colspan="7"><div class="empty-state"><i class="fa fa-spinner fa-spin"></i><p>Loading customers…</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const orders = await api.getOrders();
  
  // Aggregate orders into unique customer profiles
  const customerMap = {};

  orders.forEach(o => {
    const rawTel = (o.telephone || '').trim();
    const cleanTel = rawTel.replace(/[^0-9]/g, '');
    const rawNom = (o.nom || 'Unknown Customer').trim();
    
    // Group key: clean phone if >= 6 digits, otherwise lowercase name
    const key = cleanTel.length >= 6 ? cleanTel : rawNom.toLowerCase();
    if (!key) return;

    if (!customerMap[key]) {
      customerMap[key] = {
        id: key,
        name: rawNom,
        phone: rawTel || '—',
        cleanTel: cleanTel,
        country: o.pays || '—',
        city: o.adresse || '—',
        orders: [],
        completedOrders: 0,
        abandonedOrders: 0,
        totalSpentCFA: 0,
        nativeSpentGNF: 0,
        isGuinea: false,
        productsMap: {},
        firstOrderDate: o.date || o.savedAt || new Date().toISOString(),
        lastOrderDate: o.date || o.savedAt || new Date().toISOString(),
        firstCampaign: o.utm_campaign || o.campaign || '',
        firstSource: o.utm_source || o.source || '',
        firstAd: o.utm_content || o.ad || ''
      };
    }

    const c = customerMap[key];
    c.orders.push(o);

    if (o.status === 'COMPLETED') {
      c.completedOrders++;
      const revCFA = getOrderRevenueCFA(o);
      c.totalSpentCFA += revCFA;
      if (isOrderGNF(o)) {
        c.isGuinea = true;
        c.nativeSpentGNF += (Number(o.total) || 0);
      }
    } else if (o.status === 'ABANDONED') {
      c.abandonedOrders++;
    }

    if (isOrderGNF(o)) c.isGuinea = true;
    if (o.pays && (!c.country || c.country === '—')) c.country = o.pays;
    if (o.adresse && (!c.city || c.city === '—')) c.city = o.adresse;

    const pTitle = (o.produit || '').split(' (')[0].trim();
    if (pTitle) c.productsMap[pTitle] = (c.productsMap[pTitle] || 0) + (Number(o.quantity) || 1);

    const orderTime = new Date(o.date || o.savedAt || 0).getTime();
    if (orderTime && orderTime > new Date(c.lastOrderDate).getTime()) {
      c.lastOrderDate = o.date || o.savedAt;
    }
    if (orderTime && orderTime < new Date(c.firstOrderDate).getTime()) {
      c.firstOrderDate = o.date || o.savedAt;
      if (o.utm_campaign || o.campaign) c.firstCampaign = o.utm_campaign || o.campaign;
      if (o.utm_source || o.source) c.firstSource = o.utm_source || o.source;
      if (o.utm_content || o.ad) c.firstAd = o.utm_content || o.ad;
    }
  });

  const customersList = Object.values(customerMap).map(c => {
    c.orders.sort((a, b) => new Date(b.date || b.savedAt || 0).getTime() - new Date(a.date || a.savedAt || 0).getTime());
    
    if (c.completedOrders >= 2 || c.totalSpentCFA >= 50000) {
      c.segment = 'VIP';
    } else if (c.orders.length >= 2) {
      c.segment = 'RETURNING';
    } else if (c.completedOrders >= 1) {
      c.segment = 'BUYER';
    } else {
      c.segment = 'PROSPECT';
    }

    c.productsList = Object.keys(c.productsMap);
    return c;
  });

  // KPI Calculations
  const totalProfiles = customersList.length;
  const payingCount = customersList.filter(c => c.completedOrders > 0).length;
  const repeatCount = customersList.filter(c => c.orders.length >= 2).length;
  const totalStoreRevCFA = customersList.reduce((s, c) => s + c.totalSpentCFA, 0);
  const avgLtv = payingCount ? Math.round(totalStoreRevCFA / payingCount) : 0;
  const repeatRate = totalProfiles ? Math.round((repeatCount / totalProfiles) * 100) : 0;

  // Update KPI UI
  const kpiTot = document.getElementById('kpiTotalCustomers');
  const kpiPay = document.getElementById('kpiPayingCustomers');
  const kpiRep = document.getElementById('kpiRepeatCustomers');
  const kpiLtv = document.getElementById('kpiAvgLtv');
  if (kpiTot) kpiTot.textContent = totalProfiles;
  if (kpiPay) kpiPay.textContent = payingCount;
  if (kpiRep) kpiRep.textContent = repeatCount;
  if (kpiLtv) kpiLtv.innerHTML = `${fmtPrice(avgLtv)} <small style="font-size:12px;">CFA</small>`;

  const subTot = document.getElementById('kpiSubCustomers');
  const subPay = document.getElementById('kpiSubBuyers');
  const subRep = document.getElementById('kpiSubRepeat');
  const subLtv = document.getElementById('kpiSubLtv');
  if (subTot) subTot.textContent = `${payingCount} buyers · ${totalProfiles - payingCount} prospects`;
  if (subPay) subPay.textContent = `${totalProfiles ? Math.round((payingCount/totalProfiles)*100) : 0}% checkout conversion`;
  if (subRep) subRep.textContent = `${repeatRate}% repeat buyer rate`;
  if (subLtv) subLtv.textContent = `Total: ${fmtPrice(totalStoreRevCFA)} CFA`;

  // Populate dynamic country filter
  const countries = [...new Set(customersList.map(c => c.country).filter(x => x && x !== '—'))].sort();
  const cCountrySelect = document.getElementById('custCountryFilter');
  if (cCountrySelect) {
    countries.forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${COUNTRY_MAP[code] || code} (${code})`;
      cCountrySelect.appendChild(opt);
    });
  }

  // Sorting helper
  const sortCustomers = (list, sortKey) => {
    return [...list].sort((a, b) => {
      if (sortKey === 'spend') return b.totalSpentCFA - a.totalSpentCFA;
      if (sortKey === 'orders') return b.orders.length - a.orders.length;
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      // default 'recent'
      return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
    });
  };

  let filtered = sortCustomers(customersList, 'spend');

  const renderTable = () => {
    const cBody = document.getElementById('cBody');
    const countBadge = document.getElementById('customerCountBadge');
    if (!cBody) return;
    if (countBadge) countBadge.textContent = `${filtered.length} profile${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
      cBody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa fa-users-slash"></i><p>No customers match your criteria.</p></div></td></tr>`;
      return;
    }

    cBody.innerHTML = filtered.map(c => `
      <tr class="customer-row" style="cursor:pointer;" onclick="window._showCustomerModal('${encodeURIComponent(c.id)}')" title="Click to view full customer profile & history">
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="customer-avatar ${c.segment === 'VIP' ? 'vip' : ''}">
              ${getCustomerInitials(c.name)}
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <strong style="color:var(--text); font-size:13.5px;">${c.name}</strong>
                ${getCustomerSegmentBadge(c.segment)}
              </div>
              <div style="font-size:12px; color:var(--muted); font-family:monospace; margin-top:2px;">
                ${c.phone}
              </div>
            </div>
          </div>
        </td>
        <td>
          <strong style="font-size:13px; color:var(--text);">${COUNTRY_MAP[c.country] || c.country}</strong>
          ${c.city && c.city !== '—' ? `<br><small style="color:var(--muted); font-size:11.5px;">${c.city}</small>` : ''}
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <span class="badge ${c.completedOrders > 0 ? 'badge-green' : 'badge-gray'}" style="font-size:11px;">
              <i class="fa fa-check"></i> ${c.completedOrders} paid
            </span>
            ${c.abandonedOrders > 0 ? `
              <span class="badge badge-orange" style="font-size:11px;">
                <i class="fa fa-clock"></i> ${c.abandonedOrders} abandoned
              </span>
            ` : ''}
          </div>
        </td>
        <td style="white-space:nowrap;">
          <strong style="font-size:14px; color:${c.totalSpentCFA > 0 ? 'var(--green)' : 'var(--muted)'};">
            ${fmtPrice(c.totalSpentCFA)} CFA
          </strong>
          ${c.isGuinea && c.nativeSpentGNF > 0 ? `
            <br><small style="color:var(--muted); font-size:11px;">(${fmtPrice(c.nativeSpentGNF)} GNF)</small>
          ` : ''}
        </td>
        <td>
          <div style="display:flex; flex-wrap:wrap; gap:4px; max-width:210px;">
            ${c.productsList.slice(0, 2).map(p => `
              <span style="background:var(--surface2); border:1px solid var(--border); font-size:11px; padding:2px 6px; border-radius:6px; color:var(--text); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p}">
                ${p}
              </span>
            `).join('')}
            ${c.productsList.length > 2 ? `<span style="font-size:10px; color:var(--muted); padding:2px 4px;">+${c.productsList.length - 2} more</span>` : ''}
            ${c.productsList.length === 0 ? `<span style="color:var(--muted); font-size:12px;">—</span>` : ''}
          </div>
        </td>
        <td style="font-size:12px; color:var(--muted); white-space:nowrap;">
          ${fmtDate(c.lastOrderDate)}
        </td>
        <td style="text-align:right;" onclick="event.stopPropagation();">
          <div style="display:inline-flex; gap:6px; align-items:center;">
            ${c.cleanTel ? `
              <a href="https://wa.me/${c.cleanTel}?text=${encodeURIComponent(`Bonjour ${c.name}, merci pour votre commande chez Astro Shop ! Comment pouvons-nous vous aider ?`)}" target="_blank" class="btn btn-sm" style="background:#25D366; color:#fff; border:none; padding:5px 9px; font-size:11.5px; text-decoration:none;" title="Direct WhatsApp Chat">
                <i class="fab fa-whatsapp"></i>
              </a>
              <a href="tel:${c.phone}" class="btn btn-ghost btn-sm" style="padding:5px 9px; font-size:11.5px; text-decoration:none;" title="Call Customer">
                <i class="fa fa-phone"></i>
              </a>
            ` : ''}
            <button class="btn btn-ghost btn-sm" onclick="window._showCustomerModal('${encodeURIComponent(c.id)}')" style="padding:5px 9px; font-size:11.5px;" title="View Complete Profile">
              <i class="fa fa-eye"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const applyFilters = () => {
    const q = (document.getElementById('cSearch')?.value || '').toLowerCase().trim();
    const seg = document.getElementById('segmentFilter')?.value || '';
    const country = document.getElementById('custCountryFilter')?.value || '';
    const sortKey = document.getElementById('custSortFilter')?.value || 'spend';

    const matched = customersList.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || c.productsList.some(p => p.toLowerCase().includes(q));
      const matchSeg = !seg || c.segment === seg;
      const matchCountry = !country || c.country === country;
      return matchSearch && matchSeg && matchCountry;
    });

    filtered = sortCustomers(matched, sortKey);
    renderTable();
  };

  document.getElementById('cSearch').oninput = applyFilters;
  document.getElementById('segmentFilter').onchange = applyFilters;
  document.getElementById('custCountryFilter').onchange = applyFilters;
  document.getElementById('custSortFilter').onchange = applyFilters;

  // CSV Export
  document.getElementById('exportCustomersCsv').onclick = () => {
    const headers = ['Name', 'Phone', 'Country', 'City', 'Segment', 'Total Orders', 'Completed Orders', 'Total Spent CFA', 'Native Currency', 'First Order Date', 'Last Order Date', 'Acquisition Source'];
    const rows = customersList.map(c => [
      c.name,
      c.phone,
      c.country,
      c.city,
      c.segment,
      c.orders.length,
      c.completedOrders,
      c.totalSpentCFA,
      c.isGuinea ? 'GNF' : 'CFA',
      fmtDate(c.firstOrderDate),
      fmtDate(c.lastOrderDate),
      c.firstCampaign || c.firstSource || 'Direct'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv),
      download: `customers_${new Date().toISOString().slice(0, 10)}.csv`
    });
    a.click();
    toast('Customers CSV exported!');
  };

  // Expose Customer Modal Handler
  window._showCustomerModal = (encodedId) => {
    const id = decodeURIComponent(encodedId);
    const customer = customersList.find(x => x.id === id);
    if (!customer) {
      toast('Customer not found', 'error');
      return;
    }
    showCustomerModal(customer);
  };

  renderTable();
}

function showCustomerModal(customer) {
  const oldModal = document.getElementById('customer-detail-modal');
  if (oldModal) oldModal.remove();

  const avgOrderCFA = customer.completedOrders ? Math.round(customer.totalSpentCFA / customer.completedOrders) : 0;

  const modal = document.createElement('div');
  modal.id = 'customer-detail-modal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 800px; width: 95%;">
      <!-- Header -->
      <div class="modal-head" style="padding: 20px 28px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="customer-avatar ${customer.segment === 'VIP' ? 'vip' : ''}" style="width:50px; height:50px; font-size:18px;">
            ${getCustomerInitials(customer.name)}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h2 style="font-size: 18px; font-weight: 800; margin: 0; color: var(--text);">${customer.name}</h2>
              ${getCustomerSegmentBadge(customer.segment)}
            </div>
            <div style="display: flex; gap: 14px; align-items: center; font-size: 12.5px; color: var(--muted); margin-top: 4px; flex-wrap: wrap;">
              <span><i class="fa fa-phone"></i> ${customer.phone}</span>
              <span><i class="fa fa-location-dot"></i> ${COUNTRY_MAP[customer.country] || customer.country} ${customer.city && customer.city !== '—' ? `· ${customer.city}` : ''}</span>
              <span><i class="fa fa-calendar-check"></i> Customer since ${fmtDate(customer.firstOrderDate)}</span>
            </div>
          </div>
        </div>
        <button class="modal-close" id="closeCustomerModal" style="font-size: 24px; padding: 4px 8px;">&times;</button>
      </div>

      <div class="modal-body" style="padding: 20px 28px; max-height: 70vh; overflow-y: auto; display:flex; flex-direction:column; gap:20px;">
        <!-- Quick Action Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface2); border:1px solid var(--border); border-radius:12px; padding:12px 18px; flex-wrap:wrap; gap:10px;">
          <div style="font-size:12.5px; color:var(--muted); font-weight:600;">Direct Contact & Communication:</div>
          <div style="display:flex; gap:8px;">
            ${customer.cleanTel ? `
              <a href="https://wa.me/${customer.cleanTel}?text=${encodeURIComponent(`Bonjour ${customer.name}, merci pour votre commande chez Astro Shop ! Comment pouvons-nous vous aider ?`)}" target="_blank" class="btn btn-sm" style="background:#25D366; color:#fff; border:none; text-decoration:none; display:flex; align-items:center; gap:6px;">
                <i class="fab fa-whatsapp"></i> Chat WhatsApp
              </a>
              <a href="tel:${customer.phone}" class="btn btn-ghost btn-sm" style="text-decoration:none; display:flex; align-items:center; gap:6px;">
                <i class="fa fa-phone"></i> Call Phone
              </a>
            ` : ''}
          </div>
        </div>

        <!-- 4 Customer Mini KPIs -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:12px;">
          <div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 16px;">
            <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;">Total Orders</div>
            <div style="font-size:18px; font-weight:800; color:var(--blue); margin-top:2px;">${customer.orders.length}</div>
            <small style="color:var(--muted); font-size:11px;">${customer.completedOrders} paid · ${customer.abandonedOrders} abandoned</small>
          </div>
          <div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 16px;">
            <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;">Total Lifetime Spend</div>
            <div style="font-size:18px; font-weight:800; color:var(--green); margin-top:2px;">${fmtPrice(customer.totalSpentCFA)} <small style="font-size:12px;">CFA</small></div>
            ${customer.isGuinea && customer.nativeSpentGNF ? `<small style="color:var(--muted); font-size:11px;">≈ ${fmtPrice(customer.nativeSpentGNF)} GNF</small>` : `<small style="color:var(--muted); font-size:11px;">Paid in full</small>`}
          </div>
          <div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 16px;">
            <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;">Average Order Value</div>
            <div style="font-size:18px; font-weight:800; color:var(--accent); margin-top:2px;">${fmtPrice(avgOrderCFA)} <small style="font-size:12px;">CFA</small></div>
            <small style="color:var(--muted); font-size:11px;">Per completed purchase</small>
          </div>
          <div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 16px;">
            <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;">Acquisition Origin</div>
            <div style="font-size:13.5px; font-weight:700; color:var(--text); margin-top:4px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${customer.firstCampaign || customer.firstSource || 'Direct / Organic'}">
              ${customer.firstCampaign || customer.firstSource || 'Direct / Organic'}
            </div>
            <small style="color:var(--muted); font-size:11px;">First touch campaign</small>
          </div>
        </div>

        <!-- Orders History Table -->
        <div style="background:var(--surface2); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
          <div style="padding:14px 18px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--text); letter-spacing:0.04em;">
              <i class="fa-solid fa-clock-rotate-left" style="color:var(--accent); margin-right:6px;"></i> Order History (${customer.orders.length})
            </span>
            <small style="color:var(--muted);">Click any row to open full order details</small>
          </div>
          <div style="overflow-x:auto;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order ID</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${customer.orders.map(o => `
                  <tr class="order-row" style="cursor:pointer;" onclick="window._showOrderDetail('${o.order_id}')" title="Click to view order details">
                    <td style="font-size:12px; color:var(--muted); white-space:nowrap;">${fmtDate(o.date || o.savedAt)}</td>
                    <td style="font-family:monospace; font-size:11px; color:var(--muted);">${(o.order_id || '').slice(0, 14)}</td>
                    <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${o.produit}">
                      <strong>${o.produit}</strong>
                    </td>
                    <td style="text-align:center; font-weight:600;">${o.quantity || 1}</td>
                    <td style="white-space:nowrap;">
                      <strong>${fmtPrice(o.total || 0)}</strong> <span style="font-size:11px; font-weight:700;">${getOrderCurrency(o)}</span>
                      ${isOrderGNF(o) ? `<br><small style="color:var(--muted); font-size:10.5px;">≈ ${fmtPrice(getOrderRevenueCFA(o))} CFA</small>` : ''}
                    </td>
                    <td>${statusBadge(o.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding:14px 28px; background:rgba(255,255,255,0.015); display:flex; justify-content:flex-end;">
        <button class="btn btn-ghost" id="closeCustModalBtn" type="button">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#closeCustomerModal').onclick = closeModal;
  modal.querySelector('#closeCustModalBtn').onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}

// ── Settings ──────────────────────────────────────────────
async function renderSettings(el) {
  let activeTab = 'branding'; // Default to Branding matching reference screenshot
  let currentSettings = {};

  try {
    currentSettings = await api.getSettings();
  } catch (e) {
    currentSettings = {};
  }

  // Ensure default fallbacks matching reference screenshot
  currentSettings.primaryColor = currentSettings.primaryColor || '#ff00c8';
  currentSettings.accentColor = currentSettings.accentColor || '#8002bb';
  currentSettings.backgroundColor = currentSettings.backgroundColor || '#f8f8f8';
  currentSettings.fontFamily = currentSettings.fontFamily || 'Cairo, sans-serif';
  currentSettings.storeName = currentSettings.storeName || 'Astro Shop';
  currentSettings.facebookPixelId = currentSettings.facebookPixelId || '950990427685437';
  currentSettings.facebookPixelEnabled = currentSettings.facebookPixelEnabled !== false;

  const renderContent = () => {
    const contentArea = document.getElementById('settingsContentArea');
    if (!contentArea) return;

    if (activeTab === 'branding') {
      contentArea.innerHTML = `
        <div class="settings-card-header">
          <div class="settings-card-icon" style="background: rgba(147, 51, 234, 0.1); color: #9333ea;">
            <i class="fa-solid fa-palette"></i>
          </div>
          <div>
            <h2 class="settings-card-title">Store Branding</h2>
            <p class="settings-card-sub">Customize your store's visual identity, colors, and typography.</p>
          </div>
        </div>

        <!-- Dynamic Preview Gradient Bar -->
        <div class="gradient-preview-bar" id="gradientPreviewBar" style="background: linear-gradient(90deg, ${currentSettings.primaryColor} 0%, ${currentSettings.accentColor} 50%, #f1f5f9 50%, #f1f5f9 100%);"></div>

        <div class="color-row">
          <div>
            <div class="color-info-lbl">Primary Color</div>
            <div class="color-info-sub">Used for buttons, links, and primary brand accents.</div>
          </div>
          <div class="color-preview-box">
            <input type="color" class="color-swatch" id="s-primaryColor" value="${currentSettings.primaryColor}">
            <span id="s-primaryColorText">${currentSettings.primaryColor}</span>
          </div>
        </div>

        <div class="color-row">
          <div>
            <div class="color-info-lbl">Accent Color</div>
            <div class="color-info-sub">Secondary highlight and gradient stop color.</div>
          </div>
          <div class="color-preview-box">
            <input type="color" class="color-swatch" id="s-accentColor" value="${currentSettings.accentColor}">
            <span id="s-accentColorText">${currentSettings.accentColor}</span>
          </div>
        </div>

        <div class="color-row">
          <div>
            <div class="color-info-lbl">Background Color</div>
            <div class="color-info-sub">Page background tone for the storefront.</div>
          </div>
          <div class="color-preview-box">
            <input type="color" class="color-swatch" id="s-bgColor" value="${currentSettings.backgroundColor}">
            <span id="s-bgColorText">${currentSettings.backgroundColor}</span>
          </div>
        </div>

        <div style="padding: 24px 0 0 0;">
          <div class="color-info-lbl" style="margin-bottom: 4px;">Font Family</div>
          <div class="color-info-sub" style="margin-bottom: 12px;">Global typography applied across titles and body text.</div>
          <input type="text" class="font-input-box" id="s-fontFamily" value="${currentSettings.fontFamily}" placeholder="Cairo, sans-serif">
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 28px;">
          <button class="settings-save-btn" id="saveBrandingBtn">
            <i class="fa-solid fa-floppy-disk"></i> Save Changes
          </button>
        </div>
      `;

      // Live Color Picker Listeners
      const pInput = document.getElementById('s-primaryColor');
      const aInput = document.getElementById('s-accentColor');
      const bInput = document.getElementById('s-bgColor');
      const pText = document.getElementById('s-primaryColorText');
      const aText = document.getElementById('s-accentColorText');
      const bText = document.getElementById('s-bgColorText');
      const gBar = document.getElementById('gradientPreviewBar');

      const updateGradient = () => {
        gBar.style.background = `linear-gradient(90deg, ${pInput.value} 0%, ${aInput.value} 50%, #f1f5f9 50%, #f1f5f9 100%)`;
      };

      pInput.oninput = () => {
        pText.textContent = pInput.value;
        currentSettings.primaryColor = pInput.value;
        updateGradient();
      };
      aInput.oninput = () => {
        aText.textContent = aInput.value;
        currentSettings.accentColor = aInput.value;
        updateGradient();
      };
      bInput.oninput = () => {
        bText.textContent = bInput.value;
        currentSettings.backgroundColor = bInput.value;
      };

      document.getElementById('saveBrandingBtn').onclick = handleSaveSettings;

    } else if (activeTab === 'tracking') {
      contentArea.innerHTML = `
        <div class="settings-card-header">
          <div class="settings-card-icon" style="background: rgba(24, 119, 242, 0.1); color: #1877f2;">
            <i class="fa-brands fa-facebook"></i>
          </div>
          <div>
            <h2 class="settings-card-title">Tracking & Analytics</h2>
            <p class="settings-card-sub">Configure Meta Pixel and conversion tracking parameters for your store.</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label class="color-info-lbl" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span>Facebook Pixel ID *</span>
              <small style="color: var(--accent); font-weight: 600;">Format: 15-16 digits</small>
            </label>
            <div style="position: relative;">
              <i class="fa fa-key" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted2);"></i>
              <input type="text" class="font-input-box" id="s-fbPixelId" value="${currentSettings.facebookPixelId || ''}" placeholder="e.g. 950990427685437" style="padding-left: 42px; font-family: monospace;">
            </div>
            <p style="font-size: 12px; color: var(--muted); margin: 6px 0 0 0;">
              Enter your Meta Pixel ID from Events Manager (e.g. <code>950990427685437</code>).
            </p>
          </div>

          <div>
            <label class="color-info-lbl" style="margin-bottom: 8px; display: block;">Pixel Tracking Status</label>
            <select class="font-input-box" id="s-fbPixelEnabled" style="cursor: pointer;">
              <option value="true" ${currentSettings.facebookPixelEnabled ? 'selected' : ''}>Enabled (Active Tracking)</option>
              <option value="false" ${!currentSettings.facebookPixelEnabled ? 'selected' : ''}>Disabled (Pause Tracking)</option>
            </select>
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 18px 22px; color: #1e3a8a; font-size: 13.5px; line-height: 1.6;">
            <div style="font-weight: 800; color: #1d4ed8; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <i class="fa fa-circle-info"></i> How Meta Pixel Tracking Works
            </div>
            <ul style="margin: 0; padding-left: 18px; color: #1e40af; display: flex; flex-direction: column; gap: 6px;">
              <li><strong>PageView:</strong> Automatically tracked on every storefront visit.</li>
              <li><strong>InitiateCheckout:</strong> Triggered when a customer starts an order checkout.</li>
              <li><strong>Purchase:</strong> Triggered on completed purchases with full product & revenue data.</li>
            </ul>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <button class="settings-save-btn" id="saveTrackingBtn">
              <i class="fa-solid fa-floppy-disk"></i> Save Tracking Settings
            </button>
          </div>
        </div>
      `;

      document.getElementById('saveTrackingBtn').onclick = handleSaveSettings;

    } else if (activeTab === 'general') {
      contentArea.innerHTML = `
        <div class="settings-card-header">
          <div class="settings-card-icon" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
            <i class="fa-solid fa-sliders"></i>
          </div>
          <div>
            <h2 class="settings-card-title">General Preferences</h2>
            <p class="settings-card-sub">Manage your storefront name, contact information, and default currency.</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label class="color-info-lbl" style="margin-bottom: 6px; display: block;">Store Name</label>
            <input type="text" class="font-input-box" id="s-storeName" value="${currentSettings.storeName || 'Astro Shop'}">
          </div>
          <div>
            <label class="color-info-lbl" style="margin-bottom: 6px; display: block;">Store Currency</label>
            <select class="font-input-box" id="s-currency">
              <option value="XOF" selected>FCFA (Franc CFA - XOF)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div>
            <label class="color-info-lbl" style="margin-bottom: 6px; display: block;">Support Email</label>
            <input type="email" class="font-input-box" id="s-supportEmail" value="support@astroshop.com">
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <button class="settings-save-btn" id="saveGeneralBtn">
              <i class="fa-solid fa-floppy-disk"></i> Save Preferences
            </button>
          </div>
        </div>
      `;
      document.getElementById('saveGeneralBtn').onclick = handleSaveSettings;

    } else if (activeTab === 'seo') {
      contentArea.innerHTML = `
        <div class="settings-card-header">
          <div class="settings-card-icon" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">
            <i class="fa-solid fa-bullhorn"></i>
          </div>
          <div>
            <h2 class="settings-card-title">SEO & Marketing</h2>
            <p class="settings-card-sub">Optimize search engine metadata and social sharing previews.</p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label class="color-info-lbl" style="margin-bottom: 6px; display: block;">Homepage Meta Title</label>
            <input type="text" class="font-input-box" id="s-metaTitle" value="Astro Shop - Boutique E-commerce & Mode">
          </div>
          <div>
            <label class="color-info-lbl" style="margin-bottom: 6px; display: block;">Homepage Meta Description</label>
            <textarea class="font-input-box" id="s-metaDesc" rows="3" style="resize:vertical;">Découvrez notre collection exclusive. Livraison rapide, paiement à la livraison et qualité premium garantie.</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <button class="settings-save-btn" id="saveSeoBtn">
              <i class="fa-solid fa-floppy-disk"></i> Save SEO Settings
            </button>
          </div>
        </div>
      `;
      document.getElementById('saveSeoBtn').onclick = handleSaveSettings;

    } else if (activeTab === 'reviews') {
      contentArea.innerHTML = `
        <div class="settings-card-header">
          <div class="settings-card-icon" style="background: rgba(236, 72, 153, 0.1); color: #ec4899;">
            <i class="fa-solid fa-star"></i>
          </div>
          <div>
            <h2 class="settings-card-title">Reviews & Feedback</h2>
            <p class="settings-card-sub">Configure customer review submission and moderation settings.</p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="color-row">
            <div>
              <div class="color-info-lbl">Auto-Approve Customer Reviews</div>
              <div class="color-info-sub">Publish submitted reviews immediately without manual review.</div>
            </div>
            <select class="filter-select" id="s-autoApprove">
              <option value="true" selected>Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <button class="settings-save-btn" id="saveReviewsBtn">
              <i class="fa-solid fa-floppy-disk"></i> Save Review Settings
            </button>
          </div>
        </div>
      `;
      document.getElementById('saveReviewsBtn').onclick = handleSaveSettings;

    } else if (activeTab === 'api') {
      contentArea.innerHTML = `
        <div class="settings-card-header">
          <div class="settings-card-icon" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">
            <i class="fa-solid fa-key"></i>
          </div>
          <div>
            <h2 class="settings-card-title">Store API Key</h2>
            <p class="settings-card-sub">Credentials for integrating webhooks, ERPs, and automated pipelines.</p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label class="color-info-lbl" style="margin-bottom: 8px; display: block;">Production API Token</label>
            <div style="display: flex; gap: 10px;">
              <input type="text" class="font-input-box" style="font-family: monospace;" readonly value="store_api_token_98327498172948123984120938">
              <button class="btn btn-ghost" id="copyApiKeyBtn"><i class="fa-solid fa-copy"></i> Copy</button>
            </div>
          </div>
        </div>
      `;
      const copyBtn = document.getElementById('copyApiKeyBtn');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText('store_api_token_98327498172948123984120938');
          toast('API key copied to clipboard!');
        };
      }
    }
  };

  const handleSaveSettings = async () => {
    // Gather all inputs if present
    const pColorEl = document.getElementById('s-primaryColor');
    const aColorEl = document.getElementById('s-accentColor');
    const bColorEl = document.getElementById('s-bgColor');
    const fontEl = document.getElementById('s-fontFamily');
    const pixelIdEl = document.getElementById('s-fbPixelId');
    const pixelEnEl = document.getElementById('s-fbPixelEnabled');
    const storeNameEl = document.getElementById('s-storeName');

    const payload = {
      ...currentSettings,
      primaryColor: pColorEl ? pColorEl.value : currentSettings.primaryColor,
      accentColor: aColorEl ? aColorEl.value : currentSettings.accentColor,
      backgroundColor: bColorEl ? bColorEl.value : currentSettings.backgroundColor,
      fontFamily: fontEl ? fontEl.value.trim() : currentSettings.fontFamily,
      facebookPixelId: pixelIdEl ? pixelIdEl.value.trim() : currentSettings.facebookPixelId,
      facebookPixelEnabled: pixelEnEl ? pixelEnEl.value === 'true' : currentSettings.facebookPixelEnabled,
      storeName: storeNameEl ? storeNameEl.value.trim() : currentSettings.storeName,
    };

    const saveBtns = el.querySelectorAll('.settings-save-btn');
    saveBtns.forEach(b => {
      b.disabled = true;
      b.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';
    });

    try {
      const res = await api.updateSettings(payload);
      if (res.ok) {
        currentSettings = payload;
        toast('Store settings saved successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      toast('Network error. Failed to save.', 'error');
    } finally {
      saveBtns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
      });
    }
  };

  el.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Store Settings</h1>
        <p style="font-size:13px; color:var(--muted); margin:4px 0 0 0;">Manage your store preferences, branding, domains, and team.</p>
      </div>
      <div class="topbar-actions">
        <button class="topbar-icon-btn" title="Language"><i class="fa-solid fa-globe"></i></button>
        <button class="topbar-icon-btn theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
        <button class="topbar-icon-btn" title="Notifications"><i class="fa-solid fa-bell"></i></button>
        <button class="settings-save-btn" id="topSettingsSaveBtn" style="margin-top:0; padding:8px 22px;">
          <i class="fa-solid fa-floppy-disk"></i> Save Changes
        </button>
      </div>
    </div>

    <div class="settings-layout">
      <!-- Left Sub-Navigation Menu -->
      <div class="settings-subnav">
        <button class="settings-subnav-item ${activeTab === 'general' ? 'active' : ''}" data-stab="general">
          <i class="fa-solid fa-sliders"></i> General
        </button>
        <button class="settings-subnav-item ${activeTab === 'branding' ? 'active' : ''}" data-stab="branding">
          <i class="fa-solid fa-palette"></i> Branding
        </button>
        <button class="settings-subnav-item ${activeTab === 'seo' ? 'active' : ''}" data-stab="seo">
          <i class="fa-solid fa-bullhorn"></i> SEO & Marketing
        </button>
        <button class="settings-subnav-item ${activeTab === 'reviews' ? 'active' : ''}" data-stab="reviews">
          <i class="fa-solid fa-star"></i> Reviews
        </button>
        <button class="settings-subnav-item ${activeTab === 'tracking' ? 'active' : ''}" data-stab="tracking">
          <i class="fa-solid fa-chart-line"></i> Tracking & Analytics
        </button>
        <button class="settings-subnav-item ${activeTab === 'api' ? 'active' : ''}" data-stab="api">
          <i class="fa-solid fa-key"></i> Store API Key
        </button>
      </div>

      <!-- Right Content Card -->
      <div class="settings-card" id="settingsContentArea">
      </div>
    </div>
  `;

  // Attach tab switching handlers
  const tabBtns = el.querySelectorAll('.settings-subnav-item');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-stab');
      renderContent();
    };
  });

  const topSaveBtn = document.getElementById('topSettingsSaveBtn');
  if (topSaveBtn) {
    topSaveBtn.onclick = handleSaveSettings;
  }

  renderContent();
}

window._showOrderDetail = async function(orderId) {
  try {
    let order = window._cachedOrders?.find(o => String(o.order_id) === String(orderId) || String(o.id) === String(orderId));
    if (!order) {
      const orders = await api.getOrders();
      window._cachedOrders = orders;
      order = orders.find(o => String(o.order_id) === String(orderId) || String(o.id) === String(orderId));
    }
    if (!order) {
      toast('Order not found', 'error');
      return;
    }
    showOrderDetailModal(order);
  } catch (e) {
    console.error('Error loading order details:', e);
    toast('Error loading order details', 'error');
  }
};

function showOrderDetailModal(order) {
  const oldModal = document.getElementById('order-detail-modal');
  if (oldModal) oldModal.remove();

  const cleanTel = (order.telephone || '').replace(/[^0-9]/g, '');

  const modal = document.createElement('div');
  modal.id = 'order-detail-modal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 650px; width: 95%;">
      <div class="modal-head" style="padding: 20px 28px;">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <h2 style="font-size: 17px; font-weight: 700; margin: 0; color: var(--text);">Order Information</h2>
              <span style="font-family: monospace; background: var(--surface3); padding: 2px 8px; border-radius: 6px; font-size: 12px; color: var(--text-secondary);">${order.order_id || 'N/A'}</span>
            </div>
            <p style="font-size: 12px; color: var(--muted); margin: 4px 0 0 0;"><i class="fa fa-calendar-alt"></i> Placed on ${fmtDate(order.date || order.savedAt)}</p>
          </div>
          <button class="modal-close" id="closeOrderDetailModal" style="font-size: 24px; padding: 4px 8px;">&times;</button>
        </div>
      </div>

      <div class="modal-body" style="padding: 24px 28px; max-height: 70vh; overflow-y: auto;">
        <!-- Status & Direct Quick Actions -->
        <div style="display: flex; gap: 14px; align-items: center; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; flex-wrap: wrap; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--muted);">Status:</span>
            ${statusBadge(order.status)}
          </div>

          <div style="display: flex; gap: 8px;">
            ${cleanTel ? `
              <a href="https://wa.me/${cleanTel}?text=${encodeURIComponent(`Bonjour ${order.nom}, concernant votre commande ${order.produit}...`)}" target="_blank" class="btn btn-sm" style="background: #25D366; color: #fff; border: none; text-decoration: none; display: flex; align-items: center; gap: 6px;">
                <i class="fab fa-whatsapp"></i> WhatsApp
              </a>
              <a href="tel:${order.telephone}" class="btn btn-ghost btn-sm" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
                <i class="fa fa-phone"></i> Call
              </a>
            ` : ''}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Customer Info Card -->
          <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 18px;">
            <h3 style="font-size: 13px; text-transform: uppercase; font-weight: 700; color: var(--accent); margin: 0 0 14px 0; letter-spacing: 0.05em;"><i class="fa fa-user" style="margin-right: 6px;"></i> Customer Details</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
              <div>
                <div style="font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Full Name</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px;">${order.nom || '—'}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Phone Number</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px;">${order.telephone || '—'}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Country</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px;">${COUNTRY_MAP[order.pays] || order.pays || '—'}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Address / City</div>
                <div style="font-size: 14px; font-weight: 600; color: var(--text); margin-top: 2px;">${order.adresse || '—'}</div>
              </div>
            </div>
          </div>

          <!-- Order Specs Card -->
          <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 18px;">
            <h3 style="font-size: 13px; text-transform: uppercase; font-weight: 700; color: var(--accent); margin: 0 0 14px 0; letter-spacing: 0.05em;"><i class="fa fa-box" style="margin-right: 6px;"></i> Order Items</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
              <div style="grid-column: 1 / -1;">
                <div style="font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Product Name</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--text); margin-top: 2px;">${order.produit || '—'}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Product Code</div>
                <div style="font-size: 13px; font-family: monospace; color: var(--muted); margin-top: 2px;">${order.code || 'N/A'}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Quantity</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px;">${order.quantity || 1} item(s)</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Total Amount</div>
                <div style="font-size: 16px; font-weight: 800; color: var(--accent); margin-top: 2px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span>${fmtPrice(order.total || 0)} ${getOrderCurrency(order)}</span>
                  ${isOrderGNF(order) ? `<span style="font-size: 12px; font-weight: 600; color: var(--muted); padding: 2px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px;">≈ ${fmtPrice(getOrderRevenueCFA(order))} CFA</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          ${(order.couleur || order.taille || order.utm_source || order.utm_campaign || order.utm_content || order.utm_medium || order.utm_term) ? `
            <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px;">
              <h3 style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: var(--accent); margin: 0 0 10px 0;"><i class="fa fa-bullhorn" style="margin-right: 6px;"></i> Marketing & Attribution Tracking</h3>
              <div style="font-size: 12px; color: var(--muted); display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
                ${order.couleur ? `<span>Color: <strong style="color:var(--text);">${order.couleur}</strong></span>` : ''}
                ${order.taille ? `<span>Size: <strong style="color:var(--text);">${order.taille}</strong></span>` : ''}
                ${order.utm_source ? `<span>Source: <code style="color:var(--blue); font-weight:700;">${order.utm_source}</code></span>` : ''}
                ${order.utm_campaign ? `<span>Campaign: <code style="color:var(--accent); font-weight:700;">${order.utm_campaign}</code></span>` : ''}
                ${order.utm_content ? `<span>Ad Creative: <code style="color:#db2777; font-weight:700;">${order.utm_content}</code></span>` : ''}
                ${order.utm_medium ? `<span>Medium: <code style="color:var(--text-secondary);">${order.utm_medium}</code></span>` : ''}
                ${order.utm_term ? `<span>Term: <code style="color:var(--text-secondary);">${order.utm_term}</code></span>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="modal-footer" style="padding: 16px 28px; background: rgba(255,255,255,0.015); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <button class="btn btn-danger" id="deleteOrderBtn" type="button">
          <i class="fa fa-trash"></i> Delete Order
        </button>
        <button class="btn btn-ghost" id="closeOrderModalBtn" type="button">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#closeOrderDetailModal').onclick = closeModal;
  modal.querySelector('#closeOrderModalBtn').onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  // Delete order handler
  modal.querySelector('#deleteOrderBtn').onclick = async () => {
    if (!confirm(`Are you sure you want to delete order #${order.order_id}? This action cannot be undone.`)) return;

    const delBtn = modal.querySelector('#deleteOrderBtn');
    delBtn.disabled = true;
    delBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Deleting...';

    try {
      const res = await api.deleteOrder(order.order_id);
      if (res.ok) {
        toast('Order deleted successfully!');
        closeModal();
        window.dispatchEvent(new Event('routechange'));
      } else {
        toast('Failed to delete order', 'error');
        delBtn.disabled = false;
        delBtn.innerHTML = '<i class="fa fa-trash"></i> Delete Order';
      }
    } catch (e) {
      toast('Error deleting order', 'error');
      delBtn.disabled = false;
      delBtn.innerHTML = '<i class="fa fa-trash"></i> Delete Order';
    }
  };
}

