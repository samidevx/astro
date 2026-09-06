import { api, toast, fmtPrice, fmtDate, statusBadge } from './admin-utils.js';

const COD_COUNTRIES = [
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'CD', name: 'RDC', flag: '🇨🇩' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
];

let creativeChartInstance = null;

export async function renderCodAfrica(el) {
  let activeTab = 'creatives'; // Default to the requested Creative Stats
  let selectedCountry = 'CI';
  let dateRange = 'all';
  let currentConfig = await api.codAfrica.getConfig().catch(() => ({}));

  const render = async () => {
    el.innerHTML = `
      <div class="admin-topbar" style="flex-wrap:wrap; gap:16px;">
        <div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
            <h1 style="margin:0;">COD in Africa Hub</h1>
            <span class="badge badge-purple" style="font-size:11px; padding:2px 8px;">Official API v1</span>
            ${currentConfig.apiToken ? '<span class="badge badge-green"><i class="fa fa-plug"></i> Live Token Active</span>' : '<span class="badge badge-orange"><i class="fa fa-info-circle"></i> Demo & Simulation Mode</span>'}
          </div>
          <p style="font-size:13px; color:var(--muted); margin:0;">
            Centralized COD API Endpoints Explorer, Live Deliveries & Creative Ad Attribution Performance.
          </p>
        </div>

        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <!-- Country Filter -->
          <div style="display:flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); padding:4px 10px; border-radius:10px;">
            <i class="fa-solid fa-earth-africa" style="color:var(--accent);"></i>
            <select id="codCountrySelect" style="background:transparent; border:none; outline:none; font-size:13px; font-weight:700; color:var(--text); cursor:pointer;">
              ${COD_COUNTRIES.map(c => `
                <option value="${c.code}" ${c.code === selectedCountry ? 'selected' : ''}>${c.flag} ${c.name} (${c.code})</option>
              `).join('')}
            </select>
          </div>

          <button class="btn btn-ghost btn-sm" id="btnSyncCodStatus" title="Synchronize shipment status to store orders">
            <i class="fa fa-rotate"></i> Sync Shippings
          </button>
          <button class="btn btn-primary btn-sm" id="btnOpenCodConfig">
            <i class="fa fa-key"></i> API Keys & Config
          </button>
          <button class="topbar-icon-btn theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
        </div>
      </div>

      <!-- Module Subtab Bar -->
      <div class="cod-tab-bar">
        <button class="cod-tab-btn ${activeTab === 'creatives' ? 'active' : ''}" data-tab="creatives">
          <i class="fa-solid fa-bullhorn"></i>
          <span>Creative Ad Stats</span>
          <span class="badge ${activeTab === 'creatives' ? 'badge-gold' : 'badge-purple'}" style="font-size:10px; padding:1px 6px;">Hot</span>
        </button>
        <button class="cod-tab-btn ${activeTab === 'analytics' ? 'active' : ''}" data-tab="analytics">
          <i class="fa-solid fa-chart-line"></i>
          <span>API Analytics (5 Variants)</span>
        </button>
        <button class="cod-tab-btn ${activeTab === 'orders' ? 'active' : ''}" data-tab="orders">
          <i class="fa-solid fa-receipt"></i>
          <span>Orders Search</span>
        </button>
        <button class="cod-tab-btn ${activeTab === 'shippings' ? 'active' : ''}" data-tab="shippings">
          <i class="fa-solid fa-truck-fast"></i>
          <span>Shippings & Deliveries</span>
        </button>
        <button class="cod-tab-btn ${activeTab === 'products' ? 'active' : ''}" data-tab="products">
          <i class="fa-solid fa-boxes-stacked"></i>
          <span>Warehouse Stock</span>
        </button>
        <button class="cod-tab-btn ${activeTab === 'docs' ? 'active' : ''}" data-tab="docs">
          <i class="fa-solid fa-terminal"></i>
          <span>API Docs & Playground</span>
        </button>
      </div>

      <!-- Main Tab Content Area -->
      <div id="codTabContentArea">
        <div class="table-card" style="padding:60px; text-align:center;">
          <i class="fa fa-spinner fa-spin" style="font-size:24px; color:var(--accent);"></i>
          <p style="margin-top:10px; color:var(--muted);">Loading COD in Africa data…</p>
        </div>
      </div>
    `;

    // Bind subtab click events
    el.querySelectorAll('.cod-tab-btn').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.getAttribute('data-tab');
        el.querySelectorAll('.cod-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadTabContent();
      };
    });

    // Country select change
    const countrySel = el.querySelector('#codCountrySelect');
    if (countrySel) {
      countrySel.onchange = (e) => {
        selectedCountry = e.target.value;
        loadTabContent();
      };
    }

    // Sync button
    const btnSync = el.querySelector('#btnSyncCodStatus');
    if (btnSync) {
      btnSync.onclick = async () => {
        btnSync.disabled = true;
        btnSync.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Syncing…';
        try {
          const r = await api.codAfrica.syncStatus();
          const d = await r.json();
          toast(`Shippings synchronized! ${d.updatedCount || 0} local orders updated.`);
          loadTabContent();
        } catch (e) {
          toast('Sync error, check connection', 'error');
        } finally {
          btnSync.disabled = false;
          btnSync.innerHTML = '<i class="fa fa-rotate"></i> Sync Shippings';
        }
      };
    }

    // Config Modal
    const btnConfig = el.querySelector('#btnOpenCodConfig');
    if (btnConfig) {
      btnConfig.onclick = () => showCodConfigModal(currentConfig, async (updated) => {
        currentConfig = updated;
        render();
      });
    }

    loadTabContent();
  };

  const loadTabContent = () => {
    const container = document.getElementById('codTabContentArea');
    if (!container) return;

    if (activeTab === 'creatives') {
      renderCreativeStatsTab(container, dateRange, (newRange) => {
        dateRange = newRange;
        loadTabContent();
      });
    } else if (activeTab === 'analytics') {
      renderAnalyticsTab(container, selectedCountry, currentConfig);
    } else if (activeTab === 'orders') {
      renderOrdersSearchTab(container, selectedCountry);
    } else if (activeTab === 'shippings') {
      renderShippingsSearchTab(container, selectedCountry);
    } else if (activeTab === 'products') {
      renderProductsStockTab(container, selectedCountry);
    } else if (activeTab === 'docs') {
      renderDocsPlaygroundTab(container, currentConfig, selectedCountry);
    }
  };

  render();
}

// ── 1. Creative Ad Stats Tab (Stats dyal les creatives) ────────────────────────
async function renderCreativeStatsTab(container, dateRange, onDateRangeChange) {
  container.innerHTML = `
    <div class="table-card" style="padding:40px; text-align:center;">
      <i class="fa fa-spinner fa-spin" style="font-size:24px; color:var(--accent);"></i>
      <p style="margin-top:8px; color:var(--muted);">Analyzing orders by ad creative attribution…</p>
    </div>
  `;

  let data;
  try {
    data = await api.codAfrica.getCreativeStats(dateRange);
  } catch (err) {
    data = { summary: {}, creatives: [] };
  }

  const { summary = {}, creatives = [] } = data;

  container.innerHTML = `
    <!-- Attribution Filter Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:20px;">
      <div>
        <h2 style="font-size:18px; font-weight:800; color:var(--text); margin:0 0 4px 0;">
          <i class="fa-solid fa-bullhorn" style="color:var(--accent); margin-right:8px;"></i>
          Creative Ad Attribution & Conversion Stats
        </h2>
        <p style="font-size:13px; color:var(--muted); margin:0;">
          Direct tracking of orders placed, <strong>confirmed leads</strong>, and <strong>delivered parcels</strong> per ad creative (<code>utm_content</code>).
        </p>
      </div>

      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div class="preset-group">
          <button class="preset-btn ${dateRange === 'all' ? 'active' : ''}" data-range="all">All Time</button>
          <button class="preset-btn ${dateRange === 'today' ? 'active' : ''}" data-range="today">Today</button>
          <button class="preset-btn ${dateRange === '7d' ? 'active' : ''}" data-range="7d">7 Days</button>
          <button class="preset-btn ${dateRange === '30d' ? 'active' : ''}" data-range="30d">30 Days</button>
        </div>
        <div class="search-wrap" style="max-width:240px;">
          <i class="fa fa-search"></i>
          <input class="search-input" id="creativeSearchInput" placeholder="Filter creative or ad hook…">
        </div>
      </div>
    </div>

    <!-- KPI Cards Summary Grid -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
      <div class="kpi-card kpi-purple">
        <div class="kpi-icon"><i class="fa-solid fa-video"></i></div>
        <div class="kpi-val">${summary.totalCreatives || 0}</div>
        <div class="kpi-lbl">Active Creatives</div>
        <div class="kpi-sub"><i class="fa-solid fa-bullseye"></i> Tracked across campaigns</div>
      </div>

      <div class="kpi-card kpi-blue">
        <div class="kpi-icon"><i class="fa-solid fa-bag-shopping"></i></div>
        <div class="kpi-val">${summary.totalLeads || 0}</div>
        <div class="kpi-lbl">Total Ad Orders (Leads)</div>
        <div class="kpi-sub"><i class="fa-solid fa-users"></i> Initial customer checkouts</div>
      </div>

      <div class="kpi-card kpi-purple">
        <div class="kpi-icon"><i class="fa-solid fa-check-double"></i></div>
        <div class="kpi-val">${summary.totalConfirmed || 0}</div>
        <div class="kpi-lbl">Confirmed Orders</div>
        <div class="kpi-sub" style="color:#7c3aed; font-weight:700;">
          <i class="fa-solid fa-chart-pie"></i> ${summary.overallConfirmationRate || 0}% Confirmation Rate
        </div>
      </div>

      <div class="kpi-card kpi-green">
        <div class="kpi-icon"><i class="fa-solid fa-truck-ramp-box"></i></div>
        <div class="kpi-val">${summary.totalDelivered || 0}</div>
        <div class="kpi-lbl">Delivered & Paid Orders</div>
        <div class="kpi-sub" style="color:#059669; font-weight:700;">
          <i class="fa-solid fa-circle-check"></i> ${summary.overallDeliveryRate || 0}% Delivery Rate
        </div>
      </div>

      <div class="kpi-card kpi-orange">
        <div class="kpi-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
        <div class="kpi-val">${fmtPrice(summary.totalDeliveredRevenue || 0)} <span style="font-size:14px;">CFA</span></div>
        <div class="kpi-lbl">Delivered Ad Revenue</div>
        <div class="kpi-sub"><i class="fa-solid fa-cash-register"></i> Realized cash collection</div>
      </div>
    </div>

    <!-- Visual Attribution Chart -->
    <div class="chart-card" style="margin-bottom: 24px;">
      <div class="chart-title">
        <div>
          <span>Confirmed vs Delivered Comparison by Creative</span>
          <p style="font-size:12px; color:var(--muted); margin:3px 0 0 0; font-weight:normal;">
            Compare customer confirmation strength vs final delivery success for every active ad variation.
          </p>
        </div>
        <div style="display:flex; align-items:center; gap:16px; font-size:12px; font-weight:600;">
          <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; background:#3b82f6; border-radius:3px;"></span> Leads</span>
          <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; background:#a855f7; border-radius:3px;"></span> Confirmed</span>
          <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; background:#10b981; border-radius:3px;"></span> Delivered</span>
        </div>
      </div>
      <div class="chart-wrap" style="height:280px;">
        <canvas id="creativePerformanceChart"></canvas>
      </div>
    </div>

    <!-- Granular Table Breakdown -->
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">
          <i class="fa-solid fa-table-list" style="color:var(--accent);"></i>
          <span>Creative Performance Breakdown</span>
        </div>
        <div style="font-size:12px; color:var(--muted);">
          Showing ${creatives.length} creatives tracked
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="admin-table" id="creativeTable">
          <thead>
            <tr>
              <th>Ad Creative / Hook</th>
              <th>Platform & Campaign</th>
              <th>Target Product</th>
              <th style="text-align:center;">Leads</th>
              <th style="text-align:center;">Confirmed</th>
              <th style="text-align:center;">Conf. Rate</th>
              <th style="text-align:center;">Delivered</th>
              <th style="text-align:center;">Delivery Rate</th>
              <th>Funnel Progress</th>
              <th style="text-align:right;">Delivered Cash</th>
            </tr>
          </thead>
          <tbody id="creativeTableBody">
            ${renderCreativeTableRows(creatives)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Range button clicks
  container.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => onDateRangeChange(btn.getAttribute('data-range'));
  });

  // Search input filter
  const searchInput = container.querySelector('#creativeSearchInput');
  if (searchInput) {
    searchInput.oninput = () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = creatives.filter(c =>
        c.creative.toLowerCase().includes(q) ||
        c.campaign.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q) ||
        c.product.toLowerCase().includes(q)
      );
      container.querySelector('#creativeTableBody').innerHTML = renderCreativeTableRows(filtered);
    };
  }

  // Render Chart.js
  renderCreativeChart(creatives);
}

function renderCreativeTableRows(creatives) {
  if (!creatives.length) {
    return `
      <tr>
        <td colspan="10">
          <div class="empty-state">
            <i class="fa fa-bullhorn"></i>
            <p>No creatives recorded for this time range yet.</p>
          </div>
        </td>
      </tr>
    `;
  }

  return creatives.map(c => {
    const isDirect = c.creative.toLowerCase().includes('direct') || c.creative === 'Direct / Unattributed';
    const sourceIcon = getPlatformIcon(c.source);

    // Calculate funnel percentages for bar
    const leadWidth = 100;
    const confWidth = c.totalLeads > 0 ? Math.min(100, Math.round((c.confirmedOrders / c.totalLeads) * 100)) : 0;
    const delWidth = c.totalLeads > 0 ? Math.min(100, Math.round((c.deliveredOrders / c.totalLeads) * 100)) : 0;

    return `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-film" style="color:var(--accent); font-size:13px;"></i>
            <code style="font-size:13px; font-weight:800; color:${isDirect ? 'var(--muted)' : 'var(--text)'};">${c.creative}</code>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
            ${sourceIcon}
            <span style="font-weight:700; font-size:12px; text-transform:capitalize;">${c.source}</span>
          </div>
          <small style="color:var(--muted); font-size:11px;">${c.campaign}</small>
        </td>
        <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.product}">
          ${c.product}
        </td>
        <td style="text-align:center; font-weight:700;">
          ${c.totalLeads}
        </td>
        <td style="text-align:center;">
          <span class="badge badge-purple" style="font-size:12px; font-weight:800; padding:2px 8px;">
            ${c.confirmedOrders}
          </span>
        </td>
        <td style="text-align:center; font-weight:700; color:#7c3aed;">
          ${c.confirmationRate}%
        </td>
        <td style="text-align:center;">
          <span class="badge badge-green" style="font-size:12px; font-weight:800; padding:2px 8px;">
            ${c.deliveredOrders}
          </span>
        </td>
        <td style="text-align:center; font-weight:800; color:#059669;">
          ${c.deliveryRate}%
        </td>
        <td style="min-width:140px;">
          <div class="funnel-bar" title="Leads: ${c.totalLeads} | Confirmed: ${c.confirmedOrders} | Delivered: ${c.deliveredOrders}">
            <div class="funnel-fill-confirmed" style="width:${confWidth}%;"></div>
            <div class="funnel-fill-delivered" style="width:${delWidth}%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted); margin-top:3px;">
            <span>Conf: ${confWidth}%</span>
            <span>Del: ${delWidth}%</span>
          </div>
        </td>
        <td style="text-align:right; font-weight:800; color:var(--accent); white-space:nowrap;">
          ${fmtPrice(c.deliveredRevenue)} CFA
        </td>
      </tr>
    `;
  }).join('');
}

function getPlatformIcon(source) {
  const s = (source || '').toLowerCase();
  if (s.includes('tiktok')) return '<i class="fab fa-tiktok" style="color:#000;"></i>';
  if (s.includes('facebook') || s.includes('fb') || s.includes('meta')) return '<i class="fab fa-facebook" style="color:#1877f2;"></i>';
  if (s.includes('instagram') || s.includes('ig')) return '<i class="fab fa-instagram" style="color:#e1306c;"></i>';
  if (s.includes('google') || s.includes('adwords')) return '<i class="fab fa-google" style="color:#ea4335;"></i>';
  if (s.includes('snapchat')) return '<i class="fab fa-snapchat" style="color:#fffc00; background:#000; border-radius:3px; padding:1px;"></i>';
  return '<i class="fa-solid fa-arrow-pointer" style="color:var(--muted);"></i>';
}

function renderCreativeChart(creatives) {
  const canvas = document.getElementById('creativePerformanceChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (creativeChartInstance) {
    creativeChartInstance.destroy();
  }

  const topCreatives = creatives.slice(0, 8); // Top 8
  const labels = topCreatives.map(c => c.creative.length > 18 ? c.creative.slice(0, 16) + '…' : c.creative);
  const leadsData = topCreatives.map(c => c.totalLeads);
  const confirmedData = topCreatives.map(c => c.confirmedOrders);
  const deliveredData = topCreatives.map(c => c.deliveredOrders);

  creativeChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Leads Placed',
          data: leadsData,
          backgroundColor: 'rgba(59, 130, 246, 0.85)',
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.8
        },
        {
          label: 'Confirmed Orders',
          data: confirmedData,
          backgroundColor: 'rgba(168, 85, 247, 0.9)',
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.8
        },
        {
          label: 'Delivered & Paid',
          data: deliveredData,
          backgroundColor: 'rgba(16, 185, 129, 0.95)',
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          padding: 10,
          boxPadding: 4,
          usePointStyle: true,
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

// ── 2. Analytics Tab (/analytics/getTotalOrdersPaid) ──────────────────────────
async function renderAnalyticsTab(container, selectedCountry, config) {
  let selectedVariant = 'Revenues';
  let selectedDateType = 'thismonth';

  const fetchAndRenderVariant = async () => {
    container.innerHTML = `
      <!-- Variant & Preset Switcher Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:18px; font-weight:800; color:var(--text); margin:0 0 4px 0;">
            <i class="fa-solid fa-chart-pie" style="color:var(--accent); margin-right:8px;"></i>
            COD in Africa Analytics Engine
          </h2>
          <p style="font-size:13px; color:var(--muted); margin:0;">
            Direct queries to <code>/analytics/getTotalOrdersPaid</code> covering all 5 response variants.
          </p>
        </div>

        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <!-- DateType preset -->
          <div style="display:flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); padding:4px 10px; border-radius:10px;">
            <span style="font-size:12px; font-weight:700; color:var(--muted);">DateType:</span>
            <select id="analyticsDateType" style="background:transparent; border:none; outline:none; font-size:13px; font-weight:700; color:var(--text); cursor:pointer;">
              <option value="today" ${selectedDateType === 'today' ? 'selected' : ''}>today</option>
              <option value="yesterday" ${selectedDateType === 'yesterday' ? 'selected' : ''}>yesterday</option>
              <option value="thisweek" ${selectedDateType === 'thisweek' ? 'selected' : ''}>thisweek</option>
              <option value="lastweek" ${selectedDateType === 'lastweek' ? 'selected' : ''}>lastweek</option>
              <option value="thismonth" ${selectedDateType === 'thismonth' ? 'selected' : ''}>thismonth</option>
              <option value="lastmonth" ${selectedDateType === 'lastmonth' ? 'selected' : ''}>lastmonth</option>
              <option value="thisyear" ${selectedDateType === 'thisyear' ? 'selected' : ''}>thisyear</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 5 Variant Tabs -->
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
        <button class="btn btn-sm ${selectedVariant === 'Revenues' ? 'btn-primary' : 'btn-ghost'}" data-variant="Revenues">
          <i class="fa-solid fa-coins"></i> Response=Revenues
        </button>
        <button class="btn btn-sm ${selectedVariant === 'ShippingsSummary' ? 'btn-primary' : 'btn-ghost'}" data-variant="ShippingsSummary">
          <i class="fa-solid fa-truck"></i> Response=ShippingsSummary
        </button>
        <button class="btn btn-sm ${selectedVariant === 'Orders' ? 'btn-primary' : 'btn-ghost'}" data-variant="Orders">
          <i class="fa-solid fa-list-check"></i> Response=Orders
        </button>
        <button class="btn btn-sm ${selectedVariant === 'OrdersSummary' ? 'btn-primary' : 'btn-ghost'}" data-variant="OrdersSummary">
          <i class="fa-solid fa-clipboard-check"></i> Response=OrdersSummary
        </button>
        <button class="btn btn-sm ${selectedVariant === 'TopTraits' ? 'btn-primary' : 'btn-ghost'}" data-variant="TopTraits">
          <i class="fa-solid fa-tags"></i> Response=TopTraits
        </button>
      </div>

      <div id="analyticsVariantResult">
        <div class="table-card" style="padding:40px; text-align:center;">
          <i class="fa fa-spinner fa-spin" style="font-size:24px; color:var(--accent);"></i>
          <p style="margin-top:8px; color:var(--muted);">Fetching ${selectedVariant} data from COD in Africa…</p>
        </div>
      </div>
    `;

    // Bind clicks
    container.querySelectorAll('[data-variant]').forEach(btn => {
      btn.onclick = () => {
        selectedVariant = btn.getAttribute('data-variant');
        fetchAndRenderVariant();
      };
    });

    const dtSelect = container.querySelector('#analyticsDateType');
    if (dtSelect) {
      dtSelect.onchange = (e) => {
        selectedDateType = e.target.value;
        fetchAndRenderVariant();
      };
    }

    // Load Variant Data
    const resultBox = container.querySelector('#analyticsVariantResult');
    const resp = await api.codAfrica.getAnalytics(selectedVariant, selectedDateType, selectedCountry, config.warehouseId).catch(() => ({}));

    let html = '';
    if (selectedVariant === 'Revenues') {
      const total = resp.TotalRevenues || resp.sum || 0;
      html = `
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card kpi-green">
            <div class="kpi-icon"><i class="fa-solid fa-money-bill-trend-up"></i></div>
            <div class="kpi-val">${fmtPrice(total)} CFA</div>
            <div class="kpi-lbl">Total Delivered Revenue</div>
            <div class="kpi-sub"><i class="fa fa-circle-check"></i> Cash collected in ${selectedCountry} (${selectedDateType})</div>
          </div>
          <div class="kpi-card kpi-blue">
            <div class="kpi-icon"><i class="fa-solid fa-warehouse"></i></div>
            <div class="kpi-val">${config.warehouseId || '619ed...'}</div>
            <div class="kpi-lbl">Target Warehouse</div>
            <div class="kpi-sub"><i class="fa fa-location-dot"></i> Timezone: Africa/Algiers</div>
          </div>
        </div>

        ${resp.datas ? `
          <div class="table-card">
            <div class="table-header"><div class="table-title">Revenue Breakdown by Day</div></div>
            <table class="admin-table">
              <thead><tr><th>Date</th><th>Country</th><th style="text-align:right;">Delivered Cash</th></tr></thead>
              <tbody>
                ${resp.datas.map(d => `
                  <tr>
                    <td><strong>${d.date}</strong></td>
                    <td><span class="country-chip">${selectedCountry}</span></td>
                    <td style="text-align:right; font-weight:800; color:var(--green);">${fmtPrice(d.TotalRevenues)} CFA</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      `;
    } else if (selectedVariant === 'ShippingsSummary') {
      html = `
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card kpi-green">
            <div class="kpi-icon"><i class="fa-solid fa-circle-check"></i></div>
            <div class="kpi-val">${resp.delivered || 0}</div>
            <div class="kpi-lbl">Delivered</div>
          </div>
          <div class="kpi-card kpi-green">
            <div class="kpi-icon"><i class="fa-solid fa-coins"></i></div>
            <div class="kpi-val">${resp.paid || 0}</div>
            <div class="kpi-lbl">Paid</div>
          </div>
          <div class="kpi-card kpi-blue">
            <div class="kpi-icon"><i class="fa-solid fa-spinner"></i></div>
            <div class="kpi-val">${resp.processed || 0}</div>
            <div class="kpi-lbl">Processed</div>
          </div>
          <div class="kpi-card kpi-purple">
            <div class="kpi-icon"><i class="fa-solid fa-truck"></i></div>
            <div class="kpi-val">${resp.dataOrders?.shipped || 0}</div>
            <div class="kpi-lbl">Shipped & In Transit</div>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-icon"><i class="fa-solid fa-rotate-left"></i></div>
            <div class="kpi-val">${resp.dataOrders?.returned || 0}</div>
            <div class="kpi-lbl">Returned</div>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-icon"><i class="fa-solid fa-ban"></i></div>
            <div class="kpi-val">${resp.cancelled || 0}</div>
            <div class="kpi-lbl">Cancelled</div>
          </div>
        </div>
      `;
    } else if (selectedVariant === 'Orders') {
      const count = resp.content?.count || 0;
      html = `
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card kpi-blue">
            <div class="kpi-icon"><i class="fa-solid fa-cart-arrow-down"></i></div>
            <div class="kpi-val">${count}</div>
            <div class="kpi-lbl">Total Leads Generated</div>
            <div class="kpi-sub">Total customer checkout leads</div>
          </div>
          <div class="kpi-card kpi-purple">
            <div class="kpi-icon"><i class="fa-solid fa-clock"></i></div>
            <div class="kpi-val">${resp.content?.pendingVerification || 0}</div>
            <div class="kpi-lbl">Pending Call Center</div>
            <div class="kpi-sub">To be verified</div>
          </div>
        </div>
      `;
    } else if (selectedVariant === 'OrdersSummary') {
      const confirmed = resp.confirmed || resp.Confirmed || resp.confirmedCount || 0;
      html = `
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card kpi-purple">
            <div class="kpi-icon"><i class="fa-solid fa-circle-check"></i></div>
            <div class="kpi-val">${confirmed}</div>
            <div class="kpi-lbl">Confirmed Leads Count</div>
            <div class="kpi-sub">Verified customer telephone orders</div>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-icon"><i class="fa-solid fa-phone-slash"></i></div>
            <div class="kpi-val">${resp.unreachable || 0}</div>
            <div class="kpi-lbl">Unreachable Customers</div>
            <div class="kpi-sub">Pending retry</div>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-icon"><i class="fa-solid fa-xmark"></i></div>
            <div class="kpi-val">${resp.cancelledByCustomer || 0}</div>
            <div class="kpi-lbl">Cancelled on Confirmation</div>
          </div>
        </div>
      `;
    } else if (selectedVariant === 'TopTraits') {
      const traits = resp.traits || [];
      html = `
        <div class="table-card">
          <div class="table-header"><div class="table-title">Top Traits & Customer Behaviors</div></div>
          <table class="admin-table">
            <thead><tr><th>Trait / Attribute</th><th>Count</th><th style="text-align:right;">Distribution</th></tr></thead>
            <tbody>
              ${traits.map(t => `
                <tr>
                  <td><strong>${t.trait}</strong></td>
                  <td><span class="badge badge-purple">${t.count} orders</span></td>
                  <td style="text-align:right; font-weight:800; color:var(--accent);">${t.percentage}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    resultBox.innerHTML = `
      ${html}
      <div style="margin-top:20px;">
        <details>
          <summary style="font-size:12.5px; font-weight:700; color:var(--accent); cursor:pointer; margin-bottom:8px;">
            <i class="fa fa-code"></i> View Raw JSON Response from COD in Africa
          </summary>
          <pre class="json-viewer">${JSON.stringify(resp, null, 2)}</pre>
        </details>
      </div>
    `;
  };

  fetchAndRenderVariant();
}

// ── 3. Orders Search Tab (/orders/search) ──────────────────────────────────────
async function renderOrdersSearchTab(container, selectedCountry) {
  container.innerHTML = `
    <div class="table-card" style="padding:40px; text-align:center;">
      <i class="fa fa-spinner fa-spin" style="font-size:24px; color:var(--accent);"></i>
      <p style="margin-top:8px; color:var(--muted);">Searching COD Africa orders for country ${selectedCountry}…</p>
    </div>
  `;

  const resp = await api.codAfrica.getOrders(selectedCountry, 1, 50).catch(() => ({ data: [] }));
  const orders = resp.data || [];

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:20px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="endpoint-badge endpoint-get">GET</span>
          <code style="font-size:14px; font-weight:800;">/orders/search</code>
          <span class="badge badge-blue">Country: ${selectedCountry}</span>
        </div>
        <p style="font-size:13px; color:var(--muted); margin:4px 0 0 0;">
          Raw customer orders, SKU references, confirmation statuses and customer details.
        </p>
      </div>

      <div class="search-wrap" style="max-width:260px;">
        <i class="fa fa-search"></i>
        <input class="search-input" id="codOrderSearchInput" placeholder="Search orders or customer…">
      </div>
    </div>

    <div class="table-card">
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Product Reference (SKU)</th>
              <th style="text-align:center;">Qty</th>
              <th>Total Price</th>
              <th>Date</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="codOrdersTableBody">
            ${renderCodOrderRows(orders)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#codOrderSearchInput');
  if (searchInput) {
    searchInput.oninput = () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = orders.filter(o =>
        (o.id || '').toLowerCase().includes(q) ||
        (o.customer?.fullName || '').toLowerCase().includes(q) ||
        (o.customer?.phone || '').toLowerCase().includes(q) ||
        (o.name || '').toLowerCase().includes(q) ||
        (o.SKU || '').toLowerCase().includes(q)
      );
      container.querySelector('#codOrdersTableBody').innerHTML = renderCodOrderRows(filtered);
    };
  }
}

function renderCodOrderRows(orders) {
  if (!orders.length) {
    return `<tr><td colspan="8"><div class="empty-state"><i class="fa fa-inbox"></i><p>No COD orders found.</p></div></td></tr>`;
  }
  return orders.map(o => `
    <tr>
      <td>
        <strong style="font-family:monospace; font-size:12px;">${o.id || o._id}</strong>
      </td>
      <td>
        <strong>${o.customer?.fullName || '—'}</strong><br>
        <small style="color:var(--muted);">${o.customer?.phone || ''} &bull; ${o.customer?.city || ''}</small>
      </td>
      <td>
        <span style="font-weight:700;">${o.name || 'Product'}</span><br>
        <code style="font-size:11px; color:var(--muted);">SKU: ${o.SKU || o.productId}</code>
      </td>
      <td style="text-align:center; font-weight:700;">${o.quantity || 1}</td>
      <td style="font-weight:800; color:var(--accent); white-space:nowrap;">
        ${fmtPrice(o.totalPrice || o.price || 0)} CFA
      </td>
      <td style="font-size:12px; color:var(--muted); white-space:nowrap;">
        ${fmtDate(o.date || o.createdAt)}
      </td>
      <td>
        ${statusBadge(o.status)}
      </td>
      <td style="text-align:right;">
        <button class="btn btn-ghost btn-sm" onclick="window._showCodJsonModal(${JSON.stringify(JSON.stringify(o))})">
          <i class="fa fa-code"></i> JSON
        </button>
      </td>
    </tr>
  `).join('');
}

// ── 4. Shippings & Deliveries Tab (/shippings/search) ─────────────────────────
async function renderShippingsSearchTab(container, selectedCountry) {
  container.innerHTML = `
    <div class="table-card" style="padding:40px; text-align:center;">
      <i class="fa fa-spinner fa-spin" style="font-size:24px; color:var(--accent);"></i>
      <p style="margin-top:8px; color:var(--muted);">Fetching courier tracking and shipments for ${selectedCountry}…</p>
    </div>
  `;

  const resp = await api.codAfrica.getShippings(selectedCountry, 1, 50).catch(() => ({ data: [] }));
  const shippings = resp.data || [];

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:20px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="endpoint-badge endpoint-get">GET</span>
          <code style="font-size:14px; font-weight:800;">/shippings/search</code>
          <span class="badge badge-purple">${shippings.length} Shipments</span>
        </div>
        <p style="font-size:13px; color:var(--muted); margin:4px 0 0 0;">
          Courier tracking, shipping numbers, delivery progress, and final COD fulfillment statuses.
        </p>
      </div>

      <div class="search-wrap" style="max-width:260px;">
        <i class="fa fa-search"></i>
        <input class="search-input" id="codShippingSearchInput" placeholder="Search tracking # or courier…">
      </div>
    </div>

    <div class="table-card">
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Tracking Number</th>
              <th>Carrier / Courier</th>
              <th>Store Order ID</th>
              <th>Customer & Delivery Address</th>
              <th>Amount to Collect</th>
              <th>Fulfillment Status</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody id="codShippingsTableBody">
            ${renderCodShippingRows(shippings)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#codShippingSearchInput');
  if (searchInput) {
    searchInput.oninput = () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = shippings.filter(s =>
        (s.trackingNumber || '').toLowerCase().includes(q) ||
        (s.carrier || '').toLowerCase().includes(q) ||
        (s.order?.id || '').toLowerCase().includes(q) ||
        (s.order?.customer?.fullName || '').toLowerCase().includes(q)
      );
      container.querySelector('#codShippingsTableBody').innerHTML = renderCodShippingRows(filtered);
    };
  }
}

function renderCodShippingRows(shippings) {
  if (!shippings.length) {
    return `<tr><td colspan="7"><div class="empty-state"><i class="fa fa-truck"></i><p>No shipments found.</p></div></td></tr>`;
  }
  return shippings.map(s => {
    const statusName = s.status?.name || s.status?.code || 'Processed';
    return `
      <tr>
        <td>
          <div style="font-family:monospace; font-weight:800; color:var(--accent);">
            <i class="fa fa-barcode" style="margin-right:4px;"></i>
            ${s.trackingNumber || s.shippingID}
          </div>
          <small style="color:var(--muted); font-family:monospace;">ID: ${s.shippingID}</small>
        </td>
        <td>
          <div style="font-weight:700; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-truck-fast" style="color:var(--blue);"></i>
            ${s.carrier || 'Express Delivery'}
          </div>
        </td>
        <td>
          <strong style="font-family:monospace; font-size:12px;">${s.order?.id || '—'}</strong>
        </td>
        <td>
          <strong>${s.order?.customer?.fullName || 'Customer'}</strong><br>
          <small style="color:var(--muted);">${s.order?.customer?.phone || ''} &bull; ${s.order?.customer?.address || ''}</small>
        </td>
        <td style="font-weight:800; color:var(--green); white-space:nowrap;">
          ${fmtPrice(s.order?.totalAmount || 0)} CFA
        </td>
        <td>
          ${statusBadge(statusName)}
        </td>
        <td style="font-size:12px; color:var(--muted); white-space:nowrap;">
          ${fmtDate(s.updatedAt)}
        </td>
      </tr>
    `;
  }).join('');
}

// ── 5. Products & Stock Inventory (/products/search) ──────────────────────────
async function renderProductsStockTab(container, selectedCountry) {
  container.innerHTML = `
    <div class="table-card" style="padding:40px; text-align:center;">
      <i class="fa fa-spinner fa-spin" style="font-size:24px; color:var(--accent);"></i>
      <p style="margin-top:8px; color:var(--muted);">Fetching warehouse stock levels for ${selectedCountry}…</p>
    </div>
  `;

  const resp = await api.codAfrica.getProducts(selectedCountry, 1, 50).catch(() => ({ data: [] }));
  const products = resp.data || [];

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:20px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="endpoint-badge endpoint-get">GET</span>
          <code style="font-size:14px; font-weight:800;">/products/search</code>
          <span class="badge badge-green">Live Stock Inventory</span>
        </div>
        <p style="font-size:13px; color:var(--muted); margin:4px 0 0 0;">
          Warehouse inventory levels (<code>inStock</code> vs <code>total</code>) and local selling prices per country.
        </p>
      </div>
    </div>

    <div class="table-card">
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU / Reference</th>
              <th>Country Details</th>
              <th style="text-align:center;">In-Stock Quantity</th>
              <th style="text-align:center;">Total Allocated</th>
              <th>Local Selling Price</th>
              <th>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => {
              const detail = p.details?.[0] || {};
              const inStock = detail.quantity?.inStock ?? 0;
              const total = detail.quantity?.total ?? 0;
              const price = detail.price ?? 0;
              const isLowStock = inStock < 20;

              return `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                      <img src="${p.picture || '/placeholder.png'}" class="product-thumb" alt="${p.name}">
                      <div style="font-weight:700; max-width:240px;">${p.name}</div>
                    </div>
                  </td>
                  <td>
                    <code style="font-size:12px; font-weight:800;">${p.sku || p.SKU}</code><br>
                    <small style="color:var(--muted); font-family:monospace;">${p.id}</small>
                  </td>
                  <td>
                    <span class="country-chip">${detail.country || selectedCountry}</span>
                  </td>
                  <td style="text-align:center; font-size:15px; font-weight:800; color:${isLowStock ? '#ef4444' : 'var(--text)'};">
                    ${inStock} units
                  </td>
                  <td style="text-align:center; font-weight:600; color:var(--muted);">
                    ${total} units
                  </td>
                  <td style="font-weight:800; color:var(--accent); white-space:nowrap;">
                    ${fmtPrice(price)} CFA
                  </td>
                  <td>
                    ${isLowStock ? '<span class="badge badge-red"><i class="fa fa-triangle-exclamation"></i> Low Stock</span>' : '<span class="badge badge-green"><i class="fa fa-check"></i> Healthy Stock</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── 6. Documentation & Live Playground Tab ────────────────────────────────────
function renderDocsPlaygroundTab(container, config, selectedCountry) {
  container.innerHTML = `
    <!-- Global API Specifications Card -->
    <div class="table-card" style="padding:24px 28px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <div style="width:36px; height:36px; border-radius:10px; background:rgba(124, 58, 237, 0.1); color:var(--accent); display:flex; align-items:center; justify-content:center; font-size:16px;">
          <i class="fa-solid fa-server"></i>
        </div>
        <h2 style="font-size:16px; font-weight:800; margin:0;">Global COD in Africa Specifications</h2>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; font-size:13px;">
        <div style="background:var(--surface2); border:1px solid var(--border); border-radius:12px; padding:14px 18px;">
          <div style="font-weight:700; color:var(--muted); font-size:11px; text-transform:uppercase;">Base API URL</div>
          <div style="font-family:monospace; font-weight:800; color:var(--accent); margin-top:4px;">https://api.codinafrica.com/api</div>
        </div>

        <div style="background:var(--surface2); border:1px solid var(--border); border-radius:12px; padding:14px 18px;">
          <div style="font-weight:700; color:var(--muted); font-size:11px; text-transform:uppercase;">Authentication Header</div>
          <div style="font-family:monospace; font-weight:800; color:var(--text); margin-top:4px;">x-auth-token: &lt;YOUR_API_TOKEN&gt;</div>
        </div>

        <div style="background:var(--surface2); border:1px solid var(--border); border-radius:12px; padding:14px 18px;">
          <div style="font-weight:700; color:var(--muted); font-size:11px; text-transform:uppercase;">Timezone & Warehouse Key</div>
          <div style="font-family:monospace; font-weight:800; color:var(--text); margin-top:4px;">Africa/Algiers &bull; warhouse (without "e")</div>
        </div>
      </div>

      <!-- Supported Countries -->
      <div style="margin-top:16px;">
        <div style="font-weight:700; color:var(--muted); font-size:11px; text-transform:uppercase; margin-bottom:8px;">Supported Countries (12)</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${COD_COUNTRIES.map(c => `<span class="country-chip">${c.flag} <strong>${c.code}</strong> ${c.name}</span>`).join('')}
        </div>
      </div>
    </div>

    <!-- Live Request Playground -->
    <div class="table-card" style="padding:24px 28px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:10px; background:rgba(16, 185, 129, 0.1); color:var(--green); display:flex; align-items:center; justify-content:center; font-size:16px;">
            <i class="fa-solid fa-play"></i>
          </div>
          <div>
            <h2 style="font-size:16px; font-weight:800; margin:0;">Live API Playground</h2>
            <p style="font-size:12px; color:var(--muted); margin:0;">Test queries and inspect direct responses.</p>
          </div>
        </div>

        <button class="btn btn-primary btn-sm" id="btnRunPlaygroundQuery">
          <i class="fa fa-paper-plane"></i> Execute Request
        </button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-bottom:16px;">
        <div>
          <label style="font-size:11px; font-weight:700; color:var(--muted); display:block; margin-bottom:4px;">Target Endpoint</label>
          <select class="font-input-box" id="pgEndpoint">
            <option value="analytics-revenues">GET /analytics/getTotalOrdersPaid?Response=Revenues</option>
            <option value="analytics-shippings">GET /analytics/getTotalOrdersPaid?Response=ShippingsSummary</option>
            <option value="analytics-orders">GET /analytics/getTotalOrdersPaid?Response=Orders</option>
            <option value="analytics-orders-summary">GET /analytics/getTotalOrdersPaid?Response=OrdersSummary</option>
            <option value="analytics-traits">GET /analytics/getTotalOrdersPaid?Response=TopTraits</option>
            <option value="orders">GET /orders/search</option>
            <option value="shippings">GET /shippings/search</option>
            <option value="products">GET /products/search</option>
            <option value="creative-stats">GET /api/cod-africa?action=creative-stats</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px; font-weight:700; color:var(--muted); display:block; margin-bottom:4px;">Country ISO</label>
          <select class="font-input-box" id="pgCountry">
            ${COD_COUNTRIES.map(c => `<option value="${c.code}" ${c.code === selectedCountry ? 'selected' : ''}>${c.code} - ${c.name}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="font-size:11px; font-weight:700; color:var(--muted); display:block; margin-bottom:4px;">Date Preset</label>
          <select class="font-input-box" id="pgDateType">
            <option value="thismonth">thismonth</option>
            <option value="today">today</option>
            <option value="yesterday">yesterday</option>
            <option value="lastweek">lastweek</option>
            <option value="lastmonth">lastmonth</option>
          </select>
        </div>
      </div>

      <!-- Playground Response Area -->
      <div id="pgResponseArea" style="margin-top:14px;">
        <pre class="json-viewer" style="min-height:120px;">// Click "Execute Request" above to test the endpoint...</pre>
      </div>
    </div>

    <!-- Copyable cURL Reference -->
    <div class="table-card" style="padding:24px 28px;">
      <h3 style="font-size:14px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-code"></i> Ready-to-use cURL Snippets</h3>
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div>
          <div style="font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">1. Analytics Revenues</div>
          <pre class="json-viewer">curl -X GET "https://api.codinafrica.com/api/analytics/getTotalOrdersPaid?Response=Revenues&country=CI&warhouse=${config.warehouseId || '619ed123456'}&timezone=Africa%2FAlgiers&DateType=thismonth" \\
  -H "x-auth-token: ${config.apiToken || 'YOUR_TOKEN'}"</pre>
        </div>
        <div>
          <div style="font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">2. Courier Shippings Search</div>
          <pre class="json-viewer">curl -X GET "https://api.codinafrica.com/api/shippings/search?country=SN&timezone=Africa%2FAlgiers&page=1&limit=200" \\
  -H "x-auth-token: ${config.apiToken || 'YOUR_TOKEN'}"</pre>
        </div>
        <div>
          <div style="font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">3. Products & Stock Inventory</div>
          <pre class="json-viewer">curl -X GET "https://api.codinafrica.com/api/products/search?limit=100&page=1&details.country=CI" \\
  -H "x-auth-token: ${config.apiToken || 'YOUR_TOKEN'}"</pre>
        </div>
      </div>
    </div>
  `;

  const btnRun = container.querySelector('#btnRunPlaygroundQuery');
  if (btnRun) {
    btnRun.onclick = async () => {
      const ep = container.querySelector('#pgEndpoint').value;
      const c = container.querySelector('#pgCountry').value;
      const dt = container.querySelector('#pgDateType').value;
      const respBox = container.querySelector('#pgResponseArea');

      respBox.innerHTML = `<pre class="json-viewer"><i class="fa fa-spinner fa-spin"></i> Executing query...</pre>`;

      try {
        let result;
        if (ep.startsWith('analytics-')) {
          const vMap = {
            'analytics-revenues': 'Revenues',
            'analytics-shippings': 'ShippingsSummary',
            'analytics-orders': 'Orders',
            'analytics-orders-summary': 'OrdersSummary',
            'analytics-traits': 'TopTraits'
          };
          result = await api.codAfrica.getAnalytics(vMap[ep], dt, c);
        } else if (ep === 'orders') {
          result = await api.codAfrica.getOrders(c);
        } else if (ep === 'shippings') {
          result = await api.codAfrica.getShippings(c);
        } else if (ep === 'products') {
          result = await api.codAfrica.getProducts(c);
        } else {
          result = await api.codAfrica.getCreativeStats('all');
        }

        respBox.innerHTML = `
          <div style="margin-bottom:6px; font-size:12px; font-weight:700; color:var(--green); display:flex; align-items:center; gap:6px;">
            <i class="fa fa-circle-check"></i> Status: 200 OK
          </div>
          <pre class="json-viewer">${JSON.stringify(result, null, 2)}</pre>
        `;
      } catch (e) {
        respBox.innerHTML = `<pre class="json-viewer" style="color:#ef4444;">Error executing query: ${e.message}</pre>`;
      }
    };
  }
}

// ── Config Modal ──────────────────────────────────────────────────────────────
function showCodConfigModal(currentConfig, onSave) {
  const oldModal = document.getElementById('cod-config-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'cod-config-modal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 580px; width: 95%;">
      <div class="modal-head" style="padding: 20px 24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:34px; height:34px; border-radius:10px; background:rgba(124, 58, 237, 0.1); color:var(--accent); display:flex; align-items:center; justify-content:center;">
              <i class="fa-solid fa-key"></i>
            </div>
            <div>
              <h2 style="font-size:16px; font-weight:800; margin:0;">COD in Africa Credentials</h2>
              <p style="font-size:12px; color:var(--muted); margin:0;">Configure your authentication token & warehouse parameters.</p>
            </div>
          </div>
          <button class="modal-close" id="closeCodConfigBtn">&times;</button>
        </div>
      </div>

      <div class="modal-body" style="padding: 24px;">
        <div style="display:flex; flex-direction:column; gap:18px;">
          <div>
            <label style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:6px; display:block;">
              API Token (<code>x-auth-token</code>)
            </label>
            <input type="password" class="font-input-box" id="codApiTokenInput" placeholder="Enter your COD in Africa user token..." value="${currentConfig.apiToken || ''}">
            <small style="font-size:11.5px; color:var(--muted); margin-top:4px; display:block;">
              Passed in the <code>x-auth-token</code> request header. Leave empty to use offline demo mode.
            </small>
          </div>

          <div>
            <label style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:6px; display:block;">
              Warehouse ID (<code>warhouse</code>)
            </label>
            <input type="text" class="font-input-box" id="codWarehouseInput" placeholder="e.g. 619ed123456..." value="${currentConfig.warehouseId || '619ed123456'}">
            <small style="font-size:11.5px; color:var(--muted); margin-top:4px; display:block;">
              Warehouse parameter key (spelled without the 'e' as per COD in Africa platform specs).
            </small>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div>
              <label style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:6px; display:block;">Default Country</label>
              <select class="font-input-box" id="codDefaultCountry">
                ${COD_COUNTRIES.map(c => `
                  <option value="${c.code}" ${c.code === (currentConfig.defaultCountry || 'CI') ? 'selected' : ''}>${c.flag} ${c.code} - ${c.name}</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:6px; display:block;">Timezone</label>
              <input type="text" class="font-input-box" id="codTimezone" value="${currentConfig.timezone || 'Africa/Algiers'}" readonly style="background:var(--surface2); cursor:not-allowed;">
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding:16px 24px; display:flex; justify-content:space-between; align-items:center;">
        <button class="btn btn-ghost btn-sm" id="cancelCodConfigBtn">Cancel</button>
        <button class="btn btn-primary btn-sm" id="saveCodConfigBtn">
          <i class="fa fa-floppy-disk"></i> Save Credentials
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#closeCodConfigBtn').onclick = closeModal;
  modal.querySelector('#cancelCodConfigBtn').onclick = closeModal;

  modal.querySelector('#saveCodConfigBtn').onclick = async () => {
    const payload = {
      apiToken: modal.querySelector('#codApiTokenInput').value.trim(),
      warehouseId: modal.querySelector('#codWarehouseInput').value.trim(),
      defaultCountry: modal.querySelector('#codDefaultCountry').value,
      timezone: 'Africa/Algiers'
    };

    try {
      const r = await api.codAfrica.saveConfig(payload);
      const res = await r.json();
      toast('COD in Africa configuration saved!');
      closeModal();
      if (onSave) onSave(res.config || payload);
    } catch (e) {
      toast('Failed to save configuration', 'error');
    }
  };
}

// Global helper for opening raw JSON modals
window._showCodJsonModal = function(rawJsonStr) {
  let parsed;
  try {
    parsed = JSON.parse(rawJsonStr);
  } catch (e) {
    parsed = rawJsonStr;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 640px; width: 95%;">
      <div class="modal-head" style="padding: 18px 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <h3 style="font-size:15px; font-weight:800; margin:0;"><i class="fa fa-code"></i> Raw Payload Data</h3>
          <button class="modal-close" id="closePayloadModalBtn">&times;</button>
        </div>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <pre class="json-viewer" style="max-height:450px;">${JSON.stringify(parsed, null, 2)}</pre>
      </div>
      <div class="modal-footer" style="padding: 14px 20px; display:flex; justify-content:flex-end;">
        <button class="btn btn-ghost btn-sm" id="closePayloadBtn">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#closePayloadModalBtn').onclick = close;
  modal.querySelector('#closePayloadBtn').onclick = close;
};
