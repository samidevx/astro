import { adminUtils } from './admin_utils.js';

let state = {
    isAdmin: localStorage.getItem('admin_auth') === 'true'
};

export const navigate = (path) => {
    window.history.pushState({}, '', path);
    router();
};

const renderAdminLogin = () => {
    const app = document.getElementById('admin-root');
    app.innerHTML = `
        <div class="login-screen">
            <div class="login-card fade-in">
                <h1 style="font-family:var(--fh); text-align:center; margin-bottom:24px;">Admin Login</h1>
                <form id="loginForm">
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-control" id="adminPass" required placeholder="Enter password">
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%; justify-content:center; padding:14px;">Login</button>
                    <div id="loginError" style="color:var(--red); font-size:13px; text-align:center; margin-top:12px; display:none;">Invalid password</div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('loginForm').onsubmit = (e) => {
        e.preventDefault();
        const pass = document.getElementById('adminPass').value;
        if (pass === 'admin123') {
            localStorage.setItem('admin_auth', 'true');
            state.isAdmin = true;
            navigate('/admin');
        } else {
            document.getElementById('loginError').style.display = 'block';
        }
    };
};

const renderAdmin = () => {
    const app = document.getElementById('admin-root');
    const path = window.location.pathname;
    
    app.innerHTML = `
        <div class="admin-layout">
            <aside class="admin-sidebar">
                <div class="admin-logo">🛒 Admin Panel</div>
                <nav class="admin-nav">
                    <a href="/admin" class="admin-nav-item ${path === '/admin' ? 'active' : ''}"><i class="fa fa-chart-line"></i> Analytics</a>
                    <a href="/admin/products" class="admin-nav-item ${path === '/admin/products' ? 'active' : ''}"><i class="fa fa-box"></i> Products</a>
                    <a href="/admin/orders" class="admin-nav-item ${path === '/admin/orders' ? 'active' : ''}"><i class="fa fa-shopping-bag"></i> Orders</a>
                    <div style="flex:1"></div>
                    <a href="/" class="admin-nav-item"><i class="fa fa-globe"></i> View Site</a>
                    <button id="logoutBtn" class="admin-nav-item" style="background:transparent; border:none; width:100%; cursor:pointer;"><i class="fa fa-sign-out"></i> Logout</button>
                </nav>
            </aside>
            <main class="admin-content" id="adminMain">
                ${renderAdminSubView()}
            </main>
        </div>
    `;

    document.getElementById('logoutBtn').onclick = () => {
        localStorage.removeItem('admin_auth');
        state.isAdmin = false;
        navigate('/admin/login');
    };

    app.querySelectorAll('.admin-nav-item').forEach(link => {
        if (link.tagName === 'A' && link.getAttribute('href').startsWith('/admin')) {
            link.onclick = (e) => {
                e.preventDefault();
                navigate(link.getAttribute('href'));
            };
        }
    });

    setupAdminEvents();
};

const renderAdminSubView = () => {
    const path = window.location.pathname;
    if (path === '/admin/products') return renderAdminProducts();
    if (path === '/admin/products/new') return renderProductForm();
    if (path.startsWith('/admin/products/edit/')) {
        const id = path.split('/').pop();
        const products = adminUtils.getProducts();
        const p = products.find(prod => prod.id === id);
        return renderProductForm(p);
    }
    if (path === '/admin/orders') return renderAdminOrders();
    return renderAdminAnalytics();
};

const renderProductForm = (p = null) => {
    const isEdit = !!p;
    return `
        <div class="admin-header">
            <h1>${isEdit ? 'Edit Product' : 'Add New Product'}</h1>
            <button class="btn-ghost" id="backBtn"><i class="fa fa-arrow-left"></i> Back</button>
        </div>
        <div class="admin-table-card" style="padding:32px;">
            <form id="productForm">
                <h3 style="margin-bottom:20px; font-family:var(--fh);">Core Information</h3>
                <div class="admin-form-grid">
                    <div class="form-group">
                        <label class="form-label">ID (slug)</label>
                        <input type="text" class="form-control" id="p-id" value="${p?.id || ''}" required ${isEdit ? 'readonly' : ''} placeholder="e.g. my-cool-product">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" class="form-control" id="p-title" value="${p?.title || ''}" required placeholder="Product Title">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Price</label>
                        <input type="number" class="form-control" id="p-price" value="${p?.price || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Old Price</label>
                        <input type="number" class="form-control" id="p-priceOld" value="${p?.priceOld || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Currency</label>
                        <input type="text" class="form-control" id="p-currency" value="${p?.currency || 'CFA'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <input type="text" class="form-control" id="p-category" value="${p?.category || 'Mode'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Stock</label>
                        <input type="number" class="form-control" id="p-stock" value="${p?.stock || '25'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Product Code (SKU)</label>
                        <input type="text" class="form-control" id="p-code" value="${p?.code || ''}">
                    </div>
                </div>

                <h3 style="margin-top:40px; margin-bottom:20px; font-family:var(--fh);">Logistics & Marketing</h3>
                <div class="admin-form-grid">
                    <div class="form-group">
                        <label class="form-label">WhatsApp Number</label>
                        <input type="text" class="form-control" id="p-whatsapp" value="${p?.whatsapp || '2250701825463'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Target Countries (ISO, comma-separated)</label>
                        <input type="text" class="form-control" id="p-pays" value="${p?.pays || 'CI,SN,BF,TG,BJ,ML,GA,CM,NE,CG,CD,GN,TD'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bundle Offer?</label>
                        <select class="form-control" id="p-bundle">
                            <option value="no" ${p?.bundle === 'no' ? 'selected' : ''}>No</option>
                            <option value="yes" ${p?.bundle === 'yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Show Countdown?</label>
                        <select class="form-control" id="p-countdown">
                            <option value="NO" ${p?.countdown === 'NO' ? 'selected' : ''}>No</option>
                            <option value="yes" ${p?.countdown === 'yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Animated CTA?</label>
                        <select class="form-control" id="p-animated">
                            <option value="no" ${p?.animated === 'no' ? 'selected' : ''}>No</option>
                            <option value="yes" ${p?.animated === 'yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Landing Page Mode?</label>
                        <select class="form-control" id="p-isLandingPage">
                            <option value="no" ${p?.isLandingPage === 'no' ? 'selected' : ''}>No</option>
                            <option value="yes" ${p?.isLandingPage === 'yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dark Mode?</label>
                        <select class="form-control" id="p-modeBlack">
                            <option value="no" ${p?.modeBlack === 'no' ? 'selected' : ''}>No</option>
                            <option value="yes" ${p?.modeBlack === 'yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Show Quantity Picker?</label>
                        <select class="form-control" id="p-showQuantity">
                            <option value="NO" ${p?.showQuantity === 'NO' ? 'selected' : ''}>No</option>
                            <option value="yes" ${p?.showQuantity === 'yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                </div>

                <h3 style="margin-top:40px; margin-bottom:20px; font-family:var(--fh);">Variants & Popups</h3>
                <div class="admin-form-grid">
                    <div class="form-group">
                        <label class="form-label">Colors (comma-separated)</label>
                        <input type="text" class="form-control" id="p-couleur" value="${p?.couleur || ''}" placeholder="Bleu, Noir, Rouge">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sizes (comma-separated)</label>
                        <input type="text" class="form-control" id="p-taille" value="${p?.taille || ''}" placeholder="S, M, L, XL">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Exit Intent Popup (enabled, percent)</label>
                        <input type="text" class="form-control" id="p-remisePopup" value="${p?.remisePopup || 'no, 10'}" placeholder="yes, 15">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reviews Count</label>
                        <input type="text" class="form-control" id="p-reviews" value="${p?.reviews || '0'}">
                    </div>
                </div>

                <h3 style="margin-top:40px; margin-bottom:20px; font-family:var(--fh);">Images & Description</h3>
                <div class="form-group">
                    <label class="form-label">Featured Image URL</label>
                    <input type="text" class="form-control" id="p-img" value="${p?.featuredImage || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Gallery URLs (one per line)</label>
                    <textarea class="form-control" id="p-gallery" style="height:120px;" placeholder="URL 1&#10;URL 2">${(p?.gallery || []).join('\n')}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Description (HTML)</label>
                    <textarea class="form-control" id="p-desc" style="height:200px;">${p?.description || ''}</textarea>
                </div>
                <div style="margin-top:32px; display:flex; gap:12px; justify-content:flex-end;">
                    <button type="button" class="btn-ghost" id="cancelForm">Cancel</button>
                    <button type="submit" class="btn-primary">${isEdit ? 'Update Product' : 'Create Product'}</button>
                </div>
            </form>
        </div>
    `;
};

const renderAdminAnalytics = () => {
    const orders = JSON.parse(sessionStorage.getItem('captured_orders') || '[]');
    const totalRev = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    
    return `
        <div class="admin-header">
            <h1>Analytics Overview</h1>
            <div class="btn-ghost"><i class="fa fa-calendar"></i> Last 30 Days</div>
        </div>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-lbl">Total Revenue</div>
                <div class="kpi-val">${totalRev.toLocaleString()} CFA</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-lbl">Total Orders</div>
                <div class="kpi-val">${orders.length}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-lbl">Conversion Rate</div>
                <div class="kpi-val">3.2%</div>
            </div>
        </div>
        <div class="admin-table-card">
            <div style="padding:20px; font-weight:800; border-bottom:1px solid var(--gray-200)">Recent Activity</div>
            <div style="padding:40px; text-align:center; color:var(--gray-400)">
                <i class="fa fa-chart-area" style="font-size:48px; margin-bottom:16px;"></i>
                <p>Activity charts will appear here as you gather more data.</p>
            </div>
        </div>
    `;
};

const renderAdminProducts = () => {
    const products = adminUtils.getProducts();
    return `
        <div class="admin-header">
            <h1>Manage Products</h1>
            <button class="btn-primary" id="addNewBtn"><i class="fa fa-plus"></i> Add Product</button>
        </div>
        <div class="admin-table-card">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Title</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td><img src="${p.featuredImage}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;"></td>
                            <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</td>
                            <td>${p.price.toLocaleString()} ${p.currency}</td>
                            <td>${p.stock}</td>
                            <td>
                                <button class="btn-ghost edit-btn" data-id="${p.id}">Edit</button>
                                <button class="btn-ghost delete-btn" data-id="${p.id}" style="color:var(--red)">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top:24px; text-align:right;">
            <button class="btn-primary" id="exportBtn" style="background:var(--green)"><i class="fa fa-download"></i> Export products.json</button>
        </div>
    `;
};

const renderAdminOrders = () => {
    const orders = JSON.parse(sessionStorage.getItem('captured_orders') || '[]');
    return `
        <div class="admin-header">
            <h1>Orders</h1>
        </div>
        <div class="admin-table-card">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.reverse().map(o => `
                        <tr>
                            <td>${new Date().toLocaleDateString()}</td>
                            <td>${o.customer_name}<br><small style="color:var(--gray-400)">${o.telephone}</small></td>
                            <td>${o.product_name} x ${o.quantity}</td>
                            <td>${(o.total || 0).toLocaleString()} CFA</td>
                            <td><span style="padding:4px 8px; background:var(--green-l); color:var(--green); border-radius:4px; font-size:11px; font-weight:700;">COMPLETED</span></td>
                        </tr>
                    `).join('')}
                    ${orders.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--gray-400)">No orders found yet.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
};

const setupAdminEvents = () => {
    const addNewBtn = document.getElementById('addNewBtn');
    if (addNewBtn) {
        addNewBtn.onclick = () => {
            navigate('/admin/products/new');
        };
    }

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.onclick = () => navigate('/admin/products');
    }

    const cancelForm = document.getElementById('cancelForm');
    if (cancelForm) {
        cancelForm.onclick = () => navigate('/admin/products');
    }

    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.onsubmit = (e) => {
            e.preventDefault();
            const formData = {
                id: document.getElementById('p-id').value,
                title: document.getElementById('p-title').value,
                price: parseInt(document.getElementById('p-price').value),
                priceOld: parseInt(document.getElementById('p-priceOld').value) || null,
                currency: document.getElementById('p-currency').value,
                category: document.getElementById('p-category').value,
                stock: document.getElementById('p-stock').value,
                code: document.getElementById('p-code').value,
                whatsapp: document.getElementById('p-whatsapp').value,
                pays: document.getElementById('p-pays').value,
                bundle: document.getElementById('p-bundle').value,
                countdown: document.getElementById('p-countdown').value,
                animated: document.getElementById('p-animated').value,
                isLandingPage: document.getElementById('p-isLandingPage').value,
                modeBlack: document.getElementById('p-modeBlack').value,
                showQuantity: document.getElementById('p-showQuantity').value,
                couleur: document.getElementById('p-couleur').value,
                taille: document.getElementById('p-taille').value,
                remisePopup: document.getElementById('p-remisePopup').value,
                reviews: document.getElementById('p-reviews').value,
                featuredImage: document.getElementById('p-img').value,
                gallery: document.getElementById('p-gallery').value.split('\n').map(s => s.trim()).filter(s => s.length > 0),
                description: document.getElementById('p-desc').value
            };
            adminUtils.upsertProduct(formData);
            navigate('/admin/products');
        };
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.onclick = () => {
            const json = adminUtils.exportJSON();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'products.json';
            a.click();
        };
    }

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => {
            navigate('/admin/products/edit/' + btn.dataset.id);
        };
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
            if (confirm('Are you sure you want to delete this product?')) {
                adminUtils.deleteProduct(btn.dataset.id);
                renderAdmin();
            }
        };
    });
};

export const router = () => {
    const path = window.location.pathname;
    if (path === '/admin/login') {
        renderAdminLogin();
        return;
    }
    if (!state.isAdmin) {
        navigate('/admin/login');
        return;
    }
    renderAdmin();
};
