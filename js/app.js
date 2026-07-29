/**
 * RENTIWA - Convert Used Items Into Income
 * Main Application Logic (Vanilla JavaScript)
 * Phase 1 MVP - Narela (Delhi) Initial Launch
 */

import { auth, signInWithGoogle, logoutGoogle, onAuthChange, saveListingToFirestore } from '/src/firebase.ts';

// Global State Manager
const Rentiwa = {
  // Auth State
  currentAuthUser: null,
  isAuthLoading: true,

  // Key constants
  STORAGE_PRODUCTS_KEY: 'rentiwa_products',
  STORAGE_REQUESTS_KEY: 'rentiwa_requests',
  STORAGE_FAVS_KEY: 'rentiwa_favorites',

  // Default Seed Data (No hardcoded demo products)
  initialProducts: [],

  initialRequests: [
    {
      id: 'req1',
      title: 'Need DSLR Camera for 2 days college event',
      category: 'Photography',
      description: 'Looking for a Canon or Nikon camera for IP University event in Swatantra Nagar Narela.',
      budget: '₹450 / day',
      duration: '2 Days',
      location: 'Swatantra Nagar, Narela',
      userName: 'Karan Mehra',
      userPhone: '+91 98760 11223',
      date: 'Today'
    },
    {
      id: 'req2',
      title: 'Need Party Speaker & Wireless Mic in Lampur Road',
      category: 'Events',
      description: 'Hosting a family anniversary party on Saturday evening. Need good bass speaker.',
      budget: '₹600 / day',
      duration: '1 Day',
      location: 'Lampur Road, Narela',
      userName: 'Simran Kaur',
      userPhone: '+91 98110 99887',
      date: 'Yesterday'
    },
    {
      id: 'req3',
      title: 'Need PS5 Console for weekend gaming lounge',
      category: 'Gaming',
      description: 'Want to rent PS5 with FIFA 24 / FC 24 for 2 days during weekend.',
      budget: '₹500 / day',
      duration: '2 Days',
      location: 'Narela Sector A6',
      userName: 'Rohan Sharma',
      userPhone: '+91 99112 33445',
      date: '2 days ago'
    }
  ],

  // Default Test User
  defaultUser: {
    name: 'Aarav Sharma',
    email: 'aarav@gmail.com',
    phone: '+91 98765 00112',
    city: 'Narela, Delhi',
    area: 'Narela Sector A6',
    plan: 'free',
    listingsCount: 2,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  },

  // Initialize App
  init() {
    this.ensureSeedData();
    this.setupAuthListener();
    this.renderHeaderAndFooter();
    this.bindGlobalEvents();
  },

  setupAuthListener() {
    onAuthChange((fbUser) => {
      this.isAuthLoading = false;
      if (fbUser) {
        this.currentAuthUser = {
          uid: fbUser.uid,
          name: fbUser.displayName || 'Rentiwa User',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '+91 98765 00112',
          city: 'Narela, Delhi',
          area: 'Narela Sector A6',
          plan: 'free',
          listingsCount: 0,
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
        };
      } else {
        this.currentAuthUser = null;
      }
      this.updateUserNavUI();

      if (typeof window.onRentiwaAuthUpdate === 'function') {
        window.onRentiwaAuthUpdate(this.currentAuthUser);
      }
    });
  },

  ensureSeedData() {
    if (!localStorage.getItem(this.STORAGE_PRODUCTS_KEY)) {
      localStorage.setItem(this.STORAGE_PRODUCTS_KEY, JSON.stringify(this.initialProducts));
    } else {
      // Clear legacy hardcoded demo products if present
      const stored = JSON.parse(localStorage.getItem(this.STORAGE_PRODUCTS_KEY) || '[]');
      const demoIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
      if (stored.some(p => demoIds.includes(p.id))) {
        const cleaned = stored.filter(p => !demoIds.includes(p.id));
        localStorage.setItem(this.STORAGE_PRODUCTS_KEY, JSON.stringify(cleaned));
      }
    }
    if (!localStorage.getItem(this.STORAGE_REQUESTS_KEY)) {
      localStorage.setItem(this.STORAGE_REQUESTS_KEY, JSON.stringify(this.initialRequests));
    }
    if (!localStorage.getItem(this.STORAGE_FAVS_KEY)) {
      localStorage.setItem(this.STORAGE_FAVS_KEY, JSON.stringify([]));
    }
  },

  getProducts() {
    return JSON.parse(localStorage.getItem(this.STORAGE_PRODUCTS_KEY) || '[]');
  },

  getProductById(id) {
    const products = this.getProducts();
    return products.find(p => p.id === id) || products[0];
  },

  async saveProduct(productData) {
    return await saveListingToFirestore(productData);
  },

  getRequests() {
    return JSON.parse(localStorage.getItem(this.STORAGE_REQUESTS_KEY) || '[]');
  },

  saveRequest(reqData) {
    const requests = this.getRequests();
    const newReq = {
      id: 'req_' + Date.now(),
      date: 'Just now',
      ...reqData
    };
    requests.unshift(newReq);
    localStorage.setItem(this.STORAGE_REQUESTS_KEY, JSON.stringify(requests));
    return newReq;
  },

  // User Auth Utilities - Strictly In-Memory (No LocalStorage for Authentication)
  getUser() {
    return this.currentAuthUser;
  },

  setUser(userObj) {
    this.currentAuthUser = userObj;
    this.updateUserNavUI();
  },

  async loginWithGoogle() {
    try {
      this.showToast('Connecting to Google...', 'info');
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        this.currentAuthUser = {
          uid: fbUser.uid,
          name: fbUser.displayName || 'Rentiwa User',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '+91 98765 00112',
          city: 'Narela, Delhi',
          area: 'Narela Sector A6',
          plan: 'free',
          listingsCount: 0,
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
        };
        this.updateUserNavUI();
        this.showToast(`Welcome, ${this.currentAuthUser.name}!`, 'success');
        if (typeof window.onRentiwaAuthUpdate === 'function') {
          window.onRentiwaAuthUpdate(this.currentAuthUser);
        }
        return this.currentAuthUser;
      }
      return null;
    } catch (err) {
      console.error("Google sign in error:", err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('auth/unauthorized-domain')) {
        this.showUnauthorizedDomainModal(err.domain || window.location.hostname);
      } else {
        const errMsg = err?.message || "Google Sign-In failed. Please try again.";
        this.showToast(errMsg, 'error');
      }
      throw err;
    }
  },

  showUnauthorizedDomainModal(domain) {
    const currentDomain = domain || window.location.hostname;
    let modalEl = document.getElementById('unauthorized-domain-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'unauthorized-domain-modal';
      modalEl.className = 'modal-overlay active';
      document.body.appendChild(modalEl);
    }
    modalEl.style.display = 'flex';
    modalEl.innerHTML = `
      <div class="modal-card" style="max-width:520px; width:90%; padding:24px; border-radius:12px; background:#fff; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="margin:0; font-size:1.25rem; color:#dc2626; display:flex; align-items:center; gap:8px;">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            Firebase Domain Authorization Required
          </h3>
          <button onclick="document.getElementById('unauthorized-domain-modal').style.display='none'" style="border:none; background:none; font-size:1.5rem; cursor:pointer; color:#6b7280;">&times;</button>
        </div>
        <p style="margin-bottom:12px; font-size:0.95rem; color:#374151; line-height:1.5;">
          Firebase Authentication blocked the sign-in request because this web domain is not in your Firebase project's <strong>Authorized Domains</strong> list.
        </p>
        <div style="background:#f3f4f6; padding:12px; border-radius:8px; border:1px solid #e5e7eb; margin-bottom:16px;">
          <div style="font-size:0.8rem; text-transform:uppercase; color:#6b7280; font-weight:700; margin-bottom:4px;">Current Domain:</div>
          <div style="font-family:monospace; font-size:0.95rem; color:#111827; word-break:break-all; font-weight:600;">${currentDomain}</div>
        </div>
        <div style="font-size:0.9rem; color:#4b5563; margin-bottom:16px; line-height:1.6;">
          <strong>How to fix this in Firebase Console:</strong>
          <ol style="margin:8px 0 0 20px; padding:0;">
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" style="color:#2563eb; text-decoration:underline;">Firebase Console</a> & select project <strong>rentiwa</strong></li>
            <li>Go to <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong></li>
            <li>Click <strong>Add domain</strong> and paste: <code style="background:#e5e7eb; padding:2px 6px; border-radius:4px;">${currentDomain}</code></li>
          </ol>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button onclick="navigator.clipboard.writeText('${currentDomain}'); Rentiwa.showToast('Domain copied to clipboard!', 'success');" class="btn btn-outline btn-sm">Copy Domain</button>
          <button onclick="document.getElementById('unauthorized-domain-modal').style.display='none'" class="btn btn-primary btn-sm">Close</button>
        </div>
      </div>
    `;
  },

  async logout() {
    try {
      await logoutGoogle();
      this.currentAuthUser = null;
      this.showToast('Logged out successfully', 'info');
      this.updateUserNavUI();
      if (typeof window.onRentiwaAuthUpdate === 'function') {
        window.onRentiwaAuthUpdate(null);
      }
    } catch (err) {
      console.error("Logout error:", err);
      this.showToast("Logout failed. Please try again.", 'error');
    }
  },

  loginAsDefaultUser() {
    this.setUser(this.defaultUser);
    this.showToast(`Welcome back, ${this.defaultUser.name}!`, 'success');
  },

  // Free Listing Limit Rule (Max 5 FREE listings)
  checkCanListProduct() {
    const user = this.getUser();
    if (!user) {
      this.openLoginModal();
      return false;
    }
    if (user.plan === 'premium') return true;

    const myProducts = this.getProducts().filter(p => p.ownerName === user.name);
    if (myProducts.length >= 5 || (user.listingsCount && user.listingsCount >= 5)) {
      this.openPremiumUpgradeModal();
      return false;
    }
    return true;
  },

  // Favorites
  getFavorites() {
    return JSON.parse(localStorage.getItem(this.STORAGE_FAVS_KEY) || '[]');
  },

  toggleFavorite(productId) {
    let favs = this.getFavorites();
    if (favs.includes(productId)) {
      favs = favs.filter(id => id !== productId);
      this.showToast('Removed from favorites', 'info');
    } else {
      favs.push(productId);
      this.showToast('Saved to favorites', 'success');
    }
    localStorage.setItem(this.STORAGE_FAVS_KEY, JSON.stringify(favs));
    return favs.includes(productId);
  },

  formatProductPrice(p) {
    if (!p) return '₹0';
    const type = p.pricingType || (p.priceHour && p.priceDay ? 'both' : (p.priceHour ? 'hour' : 'day'));
    if (type === 'hour') {
      return `<span class="price-val">₹${p.priceHour || 0}</span> <span class="price-unit">/ Hour</span>`;
    } else if (type === 'day') {
      return `<span class="price-val">₹${p.priceDay || 0}</span> <span class="price-unit">/ Day</span>`;
    } else {
      return `<span class="price-val">₹${p.priceHour || 0}</span><span class="price-unit">/hr</span> • <span class="price-val">₹${p.priceDay || 0}</span><span class="price-unit">/day</span>`;
    }
  },

  switchCardImage(productId, target, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const imgEl = document.getElementById(`card-img-${productId}`);
    if (!imgEl) return;

    const products = this.getProducts();
    const product = products.find(p => p.id === productId || String(p.id) === String(productId));
    if (!product || !product.images || product.images.length <= 1) return;

    let currentIndex = parseInt(imgEl.dataset.imgIdx || '0', 10);
    let nextIndex = currentIndex;

    if (typeof target === 'number') {
      nextIndex = target;
    } else if (target === 'next') {
      nextIndex = (currentIndex + 1) % product.images.length;
    } else if (target === 'prev') {
      nextIndex = (currentIndex - 1 + product.images.length) % product.images.length;
    }

    imgEl.src = product.images[nextIndex];
    imgEl.dataset.imgIdx = nextIndex;

    const badgeEl = document.getElementById(`card-img-badge-${productId}`);
    if (badgeEl) {
      badgeEl.textContent = `📷 ${nextIndex + 1}/${product.images.length}`;
    }

    const dots = document.querySelectorAll(`.card-dot-${productId}`);
    dots.forEach((dot, idx) => {
      if (idx === nextIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    const thumbs = document.querySelectorAll(`.card-thumb-${productId}`);
    thumbs.forEach((thumb, idx) => {
      if (idx === nextIndex) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  },

  renderProductCardHTML(p, options = {}) {
    const favs = this.getFavorites();
    const isFav = favs.includes(p.id) || favs.includes(String(p.id));
    const priceHTML = this.formatProductPrice(p);
    const user = this.getUser();
    const isMyItem = user && (
      (p.ownerUid && user.uid === p.ownerUid) ||
      (p.ownerEmail && user.email === p.ownerEmail) ||
      (p.ownerName && user.name === p.ownerName) ||
      String(p.id).startsWith('p_')
    );
    const onDeleteCallbackName = options.onDeleteCallback || '';
    const onFavToggle = options.onFavToggle || '';

    const images = p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'];
    const hasMultipleImages = images.length > 1;

    return `
      <div class="product-card">
        <div class="product-image-container">
          <img id="card-img-${p.id}" data-img-idx="0" src="${images[0]}" class="product-image" alt="${p.title}" loading="lazy">
          
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); Rentiwa.toggleFavorite('${p.id}'); ${onFavToggle}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? '#ef4444' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>

          <div class="availability-tag">● ${p.availability || 'Available'}</div>

          ${hasMultipleImages ? `
            <div id="card-img-badge-${p.id}" class="card-img-count-badge">
              📷 1/${images.length}
            </div>

            <button type="button" class="card-carousel-arrow prev" onclick="Rentiwa.switchCardImage('${p.id}', 'prev', event)" title="Previous photo">
              ‹
            </button>
            <button type="button" class="card-carousel-arrow next" onclick="Rentiwa.switchCardImage('${p.id}', 'next', event)" title="Next photo">
              ›
            </button>

            <div class="card-thumbnails-strip" onclick="event.stopPropagation();">
              ${images.map((_, i) => `
                <button type="button" 
                  class="card-thumb-dot card-dot-${p.id} ${i === 0 ? 'active' : ''}" 
                  onclick="Rentiwa.switchCardImage('${p.id}', ${i}, event)" 
                  onmouseover="Rentiwa.switchCardImage('${p.id}', ${i}, event)"
                  title="Photo ${i + 1}">
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>

        ${hasMultipleImages ? `
          <div class="card-mini-thumbs-bar" onclick="event.stopPropagation();">
            ${images.map((imgUrl, i) => `
              <img src="${imgUrl}" 
                class="card-mini-thumb card-thumb-${p.id} ${i === 0 ? 'active' : ''}" 
                onclick="Rentiwa.switchCardImage('${p.id}', ${i}, event)" 
                onmouseover="Rentiwa.switchCardImage('${p.id}', ${i}, event)" 
                alt="${p.title} thumbnail ${i + 1}"
                title="Preview photo ${i + 1}">
            `).join('')}
          </div>
        ` : ''}

        <div class="product-body">
          <div class="product-category-area">
            <span class="badge badge-primary">${p.category}</span>
            <span>📍 ${(p.area || p.location || 'Narela').split(',')[0]}</span>
          </div>

          <h3 class="product-title">${p.title}</h3>

          <div class="product-prices">
            ${priceHTML}
          </div>

          <div class="product-footer">
            <div class="owner-rating">
              <svg width="14" height="14" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>${p.rating || 5.0} (${p.reviewCount || 1})</span>
            </div>

            <div style="display:flex; gap:6px; align-items:center;">
              ${isMyItem && onDeleteCallbackName ? `
                <button type="button" onclick="event.stopPropagation(); Rentiwa.confirmAndDeleteListing('${p.id}', ${onDeleteCallbackName});" class="btn btn-outline btn-sm" style="color:#ef4444; border-color:rgba(239, 68, 68, 0.3); padding:5px 8px;" title="Delete Listing">
                  🗑️
                </button>
              ` : ''}
              <a href="/pages/listing.html?id=${p.id}" class="btn btn-secondary btn-sm" style="padding:6px 14px;">
                View Details
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  confirmAndDeleteListing(id, callback) {
    const products = this.getProducts();
    const product = products.find(p => p.id === id || String(p.id) === String(id));
    const title = product ? product.title : 'this item';

    let overlay = document.getElementById('delete-confirm-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'delete-confirm-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-card" style="max-width:420px; text-align:center; padding:28px 24px;">
        <button class="modal-close" onclick="Rentiwa.closeModal('delete-confirm-modal-overlay')">✕</button>
        <div style="width:58px; height:58px; background:#fef2f2; border:1px solid #fee2e2; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#ef4444;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </div>
        <h2 class="heading-sm" style="margin-bottom:8px; color:var(--dark); font-size:1.2rem;">Delete Listing?</h2>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:20px; line-height:1.45;">
          Are you sure you want to permanently delete <strong style="color:var(--dark);">${title}</strong>? This action cannot be undone.
        </p>
        <div style="display:flex; gap:12px;">
          <button type="button" onclick="Rentiwa.closeModal('delete-confirm-modal-overlay')" class="btn btn-outline btn-full" style="padding:10px;">
            Cancel
          </button>
          <button type="button" id="confirm-delete-action-btn" class="btn btn-primary btn-full" style="background:#ef4444; border-color:#ef4444; padding:10px;">
            Yes, Delete Item
          </button>
        </div>
      </div>
    `;

    setTimeout(() => overlay.classList.add('active'), 10);

    const confirmBtn = document.getElementById('confirm-delete-action-btn');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        Rentiwa.closeModal('delete-confirm-modal-overlay');
        const success = Rentiwa.deleteListing(id, true);
        if (success && typeof callback === 'function') {
          callback();
        }
      };
    }
  },

  deleteListing(id, skipConfirm = false) {
    if (!skipConfirm) {
      this.confirmAndDeleteListing(id);
      return false;
    }

    const user = this.getUser();
    let products = this.getProducts();
    const product = products.find(p => p.id === id || String(p.id) === String(id));

    if (product && user) {
      const isOwner = (product.ownerName && product.ownerName === user.name) ||
                      String(product.id).startsWith('p_');
      if (!isOwner) {
        this.showToast('Permission denied: You can only delete your own listings.', 'error');
        return false;
      }
    }

    const initialCount = products.length;
    products = products.filter(p => p.id !== id && String(p.id) !== String(id));

    if (products.length < initialCount) {
      localStorage.setItem(this.STORAGE_PRODUCTS_KEY, JSON.stringify(products));

      // Remove from favorites if saved
      let favs = this.getFavorites();
      if (favs.includes(id) || favs.includes(String(id))) {
        favs = favs.filter(fId => fId !== id && String(fId) !== String(id));
        localStorage.setItem(this.STORAGE_FAVS_KEY, JSON.stringify(favs));
      }

      // Update user listingsCount
      if (user && user.listingsCount > 0) {
        user.listingsCount = user.listingsCount - 1;
        this.setUser(user);
      }

      this.showToast('🗑️ Listing deleted successfully!', 'success');
      return true;
    }
    this.showToast('Listing not found or deletion failed.', 'error');
    return false;
  },

  // Dynamic Header & Footer Component Rendering
  renderHeaderAndFooter() {
    const navPlaceholder = document.getElementById('navbar-container');
    const footerPlaceholder = document.getElementById('footer-container');

    const currentUser = this.getUser();

    if (navPlaceholder) {
      navPlaceholder.innerHTML = `
        <nav class="navbar">
          <div class="container nav-container">
            <a href="/" class="brand-logo">
              <div class="logo-icon">
                <img src="/assets/logo.png" onerror="this.onerror=null; this.src='https://i.ibb.co/ZRpnbdjd/Rentiwa-logo.png';" alt="Rentiwa Logo" class="brand-logo-img">
              </div>
              <span class="brand-name">Rentiwa</span>
              <div class="city-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Narela (Delhi)
              </div>
            </a>

            <ul class="nav-menu" id="nav-menu-list">
              <li><a href="/" class="nav-link ${window.location.pathname === '/' || window.location.pathname.endsWith('index.html') ? 'active' : ''}">Home</a></li>
              <li><a href="/pages/all-listings.html" class="nav-link ${window.location.pathname.includes('all-listings') ? 'active' : ''}">All Listings</a></li>
              <li><a href="/#browse" class="nav-link">Browse</a></li>
              <li><a href="/pages/pricing.html" class="nav-link ${window.location.pathname.includes('pricing') ? 'active' : ''}">Pricing</a></li>
            </ul>

            <div class="nav-actions">
              <button onclick="Rentiwa.handleListButtonClick()" class="btn btn-primary btn-sm">
                + List Item
              </button>

              <div id="auth-nav-box">
                ${currentUser ? `
                  <div class="user-menu-container">
                    <div class="user-pill" onclick="Rentiwa.toggleUserDropdown()">
                      <img src="${currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="user-avatar" alt="User">
                      <span style="font-size:0.88rem; font-weight:600;">${currentUser.name.split(' ')[0]}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                    <div class="user-dropdown" id="user-dropdown-menu">
                      <div class="dropdown-header">
                        <div class="dropdown-name">${currentUser.name}</div>
                        <div class="dropdown-email">${currentUser.email}</div>
                        <span class="badge ${currentUser.plan === 'premium' ? 'badge-amber' : 'badge-green'}" style="margin-top:6px;">
                          ${currentUser.plan === 'premium' ? '⭐ Premium Plan' : `Free (${currentUser.listingsCount || 2}/5 used)`}
                        </span>
                      </div>
                      <a href="/pages/profile.html" class="dropdown-item">My Profile</a>
                      <a href="/pages/add-listing.html" class="dropdown-item">Add Listing</a>
                      <a href="/pages/pricing.html" class="dropdown-item">Upgrade Plan (₹21)</a>
                      <div class="dropdown-divider"></div>
                      <button onclick="Rentiwa.logout()" class="dropdown-item" style="color:#ef4444; width:100%;">Logout</button>
                    </div>
                  </div>
                ` : `
                  <button onclick="Rentiwa.loginWithGoogle().then((u) => { if (u && (window.location.pathname.includes('login') || window.location.pathname.includes('signup'))) window.location.href='/pages/profile.html'; })" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
                    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                    <span>Continue with Google</span>
                  </button>
                `}
              </div>

              <button class="mobile-toggle" onclick="Rentiwa.toggleMobileNav()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              </button>
            </div>
          </div>
        </nav>
      `;
    }

    if (footerPlaceholder) {
      footerPlaceholder.innerHTML = `
        <footer class="footer">
          <div class="container">
            <div class="footer-grid">
              <div class="footer-brand">
                <div class="footer-logo" style="display:flex; align-items:center; gap:12px;">
                  <img src="/assets/logo.png" onerror="this.onerror=null; this.src='https://i.ibb.co/ZRpnbdjd/Rentiwa-logo.png';" alt="Rentiwa Logo" class="brand-logo-img" style="height:38px; width:auto;">
                  <span style="font-family:var(--font-heading); font-size:1.6rem; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">Rentiwa</span>
                </div>
                <h3 style="font-size:1.15rem; font-weight:700; color:#ffffff; margin-top:10px; margin-bottom:6px;">Earn From What You Own</h3>
                <p style="font-size:0.9rem; line-height:1.6;">
                  Rentiwa connects item owners with local renters directly in Narela, Delhi. No middleman fees.
                </p>
              </div>

              <div>
                <div class="footer-title">Marketplace</div>
                <ul class="footer-links">
                  <li><a href="/pages/all-listings.html">All Listings Feed</a></li>
                  <li><a href="/#browse">Browse Categories</a></li>
                  <li><a href="/pages/add-listing.html">List Your Product</a></li>
                  <li><a href="/pages/pricing.html">Pricing Plan (₹21)</a></li>
                </ul>
              </div>

              <div>
                <div class="footer-title">Top Categories</div>
                <ul class="footer-links">
                  <li><a href="/#browse">Photography & Cameras</a></li>
                  <li><a href="/#browse">Speakers & Party Decor</a></li>
                  <li><a href="/#browse">Gaming Consoles (PS5/Xbox)</a></li>
                  <li><a href="/#browse">Power Tools & Drills</a></li>
                  <li><a href="/#browse">Camping & Bicycles</a></li>
                </ul>
              </div>

              <div>
                <div class="footer-title">Company</div>
                <ul class="footer-links">
                  <li><a href="#">About Rentiwa</a></li>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Rental</a></li>
                  <li><a href="#">Contact Support</a></li>
                  <li><a href="#">Instagram @rentiwa</a></li>
                </ul>
              </div>
            </div>

            <div class="footer-bottom">
              <div>© 2026 RENTIWA. Built for Narela, Delhi. All rights reserved.</div>
              <div style="display:flex; gap:16px;">
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Security</a>
              </div>
            </div>
          </div>
        </footer>
      `;
    }
  },

  updateUserNavUI() {
    this.renderHeaderAndFooter();
  },

  toggleUserDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.toggle('show');
  },

  toggleMobileNav() {
    const navMenu = document.getElementById('nav-menu-list');
    if (navMenu) navMenu.classList.toggle('show');
  },

  handleListButtonClick() {
    if (this.checkCanListProduct()) {
      window.location.href = '/pages/add-listing.html';
    }
  },

  // Modal Renderers
  openPremiumUpgradeModal() {
    let overlay = document.getElementById('premium-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'premium-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-card" style="text-align:center;">
          <button class="modal-close" onclick="Rentiwa.closeModal('premium-modal-overlay')">✕</button>
          <div class="premium-popup-badge">🚀 RENTIWA PREMIUM</div>
          <h2 class="heading-md" style="margin-bottom:8px;">Free Listing Limit Reached</h2>
          <p class="subheading" style="font-size:0.95rem; margin-bottom:20px;">
            You have used your 5 FREE product listings. Upgrade to Unlimited for lifetime income!
          </p>

          <div style="background:var(--primary-light); padding:20px; border-radius:var(--radius-lg); margin-bottom:24px; border:1px solid rgba(16,185,129,0.3);">
            <div class="premium-price-tag" style="justify-content:center;">
              ₹21 <span>/ Lifetime Access</span>
            </div>
            <p style="font-size:0.82rem; color:var(--primary-dark); font-weight:600; margin-top:4px;">
              Special Launch Offer for Narela Residents
            </p>
          </div>

          <ul class="premium-feature-list" style="text-align:left; margin-bottom:24px;">
            <li class="premium-feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <strong>Unlimited Product Listings</strong>
            </li>
            <li class="premium-feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <strong>Golden Premium Badge</strong> on your profile
            </li>
            <li class="premium-feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <strong>Priority Top Listing</strong> in Narela search results
            </li>
            <li class="premium-feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <strong>Direct WhatsApp Contact Button</strong> for faster deals
            </li>
          </ul>

          <button onclick="Rentiwa.simulatePaymentUpgrade()" class="btn btn-primary btn-full btn-lg">
            Upgrade Now for ₹21
          </button>
          <div style="font-size:0.75rem; color:var(--text-light); margin-top:10px;">
            🔒 Safe & Secure. Instant Activation.
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    setTimeout(() => overlay.classList.add('active'), 10);
  },

  simulatePaymentUpgrade() {
    const user = this.getUser() || this.defaultUser;
    user.plan = 'premium';
    this.setUser(user);
    this.closeModal('premium-modal-overlay');
    this.showToast('🎉 Upgrade Successful! You now have Premium Unlimited access.', 'success');
    setTimeout(() => {
      window.location.href = '/pages/add-listing.html';
    }, 1000);
  },

  openLoginModal(redirectUrl = null) {
    let overlay = document.getElementById('login-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'login-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-card">
          <button class="modal-close" onclick="Rentiwa.closeModal('login-modal-overlay')">✕</button>
          <div style="text-align:center; margin-bottom:24px;">
            <div class="logo-icon" style="margin:0 auto 12px; width:48px; height:48px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            </div>
            <h2 class="heading-md">Login to Contact Owner</h2>
            <p class="subheading" style="font-size:0.88rem; margin-top:4px;">
              Unlock owner phone number & direct WhatsApp contact
            </p>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <button onclick="Rentiwa.loginWithGoogle().then(() => Rentiwa.closeModal('login-modal-overlay'))" class="btn btn-secondary btn-full" style="justify-content:center; gap:10px; font-weight:600; display:inline-flex; align-items:center;">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              <span>Continue with Google</span>
            </button>
            <a href="/pages/login.html" class="btn btn-outline btn-full">
              Login with Phone / Email
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    setTimeout(() => overlay.classList.add('active'), 10);
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  },

  // Toast Notification System
  showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  },

  // Global Event Binding
  bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('user-dropdown-menu');
      if (dropdown && !e.target.closest('.user-menu-container')) {
        dropdown.classList.remove('show');
      }
    });
  }
};

// Auto Initialize when DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  Rentiwa.init();
});

window.Rentiwa = Rentiwa;
