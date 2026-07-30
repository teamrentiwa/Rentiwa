/**
 * RENTIWA - Convert Used Items Into Income
 * Main Application Logic (Vanilla JavaScript)
 * Phase 1 MVP - Narela (Delhi) Initial Launch
 */

import { auth, signInWithGoogle, logoutGoogle, onAuthChange, saveListingToFirestore, fetchActiveListingsFromFirestore, getListingByIdFromFirestore, deleteListingFromFirestore, submitUpgradeRequestToFirestore, getUserProfileFromFirestore, updateListingInFirestore, onListingsSnapshot } from '/src/firebase.ts';

// Global State Manager
const Rentiwa = {
  // Auth State
  currentAuthUser: null,
  isAuthLoading: true,

  // Firestore Listings State
  firestoreListings: [],
  isListingsLoading: false,
  listingsLoaded: false,

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
    this.setupSnapshotListener();
    this.renderHeaderAndFooter();
    this.bindGlobalEvents();
    this.fetchListings();
  },

  setupSnapshotListener() {
    try {
      onListingsSnapshot((rawDocs) => {
        this.firestoreListings = rawDocs.map(d => this.mapFirestoreDocToProduct(d));
        this.listingsLoaded = true;
        this.isListingsLoading = false;

        if (typeof window.filterHomeProducts === 'function') {
          window.filterHomeProducts();
        }
        if (typeof window.applyFilters === 'function') {
          window.applyFilters();
        }
        if (typeof window.renderMyListings === 'function') {
          const user = this.getUser();
          window.renderMyListings(user ? user.name : '');
        }
        if (typeof window.loadListingDetails === 'function') {
          window.loadListingDetails();
        }
      });
    } catch (err) {
      console.warn("Real-time listings snapshot listener error:", err);
    }
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
          extraFreeListings: 0,
          listingsCount: 0,
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
        };

        // Fetch user profile from Firestore to restore bonus listings & details
        getUserProfileFromFirestore(fbUser.uid).then((prof) => {
          if (prof) {
            if (prof.extraFreeListings) {
              this.currentAuthUser.extraFreeListings = prof.extraFreeListings;
            }
            if (prof.phone) {
              this.currentAuthUser.phone = prof.phone;
            }
            if (prof.name) {
              this.currentAuthUser.name = prof.name;
            }
            this.updateUserNavUI();
            if (typeof window.onRentiwaAuthUpdate === 'function') {
              window.onRentiwaAuthUpdate(this.currentAuthUser);
            }
          }
        }).catch(err => console.warn("User profile fetch err:", err));
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

  async fetchListings() {
    this.isListingsLoading = true;
    try {
      const rawDocs = await fetchActiveListingsFromFirestore();
      this.firestoreListings = rawDocs.map(d => this.mapFirestoreDocToProduct(d));
      this.listingsLoaded = true;
    } catch (err) {
      console.error("Error fetching Firestore listings:", err);
      this.firestoreListings = [];
      this.listingsLoaded = true;
    } finally {
      this.isListingsLoading = false;
      if (typeof window.filterHomeProducts === 'function') {
        window.filterHomeProducts();
      }
      if (typeof window.applyFilters === 'function') {
        window.applyFilters();
      }
      if (typeof window.renderMyListings === 'function') {
        const user = this.getUser();
        window.renderMyListings(user ? user.name : '');
      }
      if (typeof window.loadListingDetails === 'function') {
        window.loadListingDetails();
      }
    }
    return this.firestoreListings;
  },

  mapFirestoreDocToProduct(d) {
    const images = Array.isArray(d.images) && d.images.length > 0 
      ? d.images 
      : ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'];
    const loc = d.location || 'Narela, Delhi';
    const areaPart = loc.split(',')[0].trim() || 'Narela';
    const priceVal = Number(d.price) || 0;
    const priceHourVal = Number(d.priceHour) || priceVal;
    const priceDayVal = Number(d.priceDay) || priceVal;
    const pricingModeVal = d.pricingMode || d.pricingType || (d.priceHour && d.priceDay ? 'both' : (d.priceHour ? 'hour' : 'day'));

    return {
      id: d.id,
      title: d.title || 'Untitled Listing',
      description: d.description || '',
      category: d.category || 'Other',
      price: priceVal,
      priceDay: priceDayVal,
      priceHour: priceHourVal,
      pricingType: pricingModeVal,
      location: loc,
      area: areaPart,
      city: 'Delhi',
      images: images,
      ownerId: d.ownerId || '',
      ownerUid: d.ownerId || '',
      ownerName: d.ownerName || 'Rentiwa User',
      ownerEmail: d.ownerEmail || '',
      ownerPhone: d.ownerPhone || '+91 98765 00112',
      ownerWhatsapp: d.ownerWhatsapp || d.ownerPhone || '+91 98765 00112',
      ownerAvatar: d.ownerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      status: d.status || 'active',
      createdAt: d.createdAt,
      availability: 'Available',
      rating: 5.0,
      reviewCount: 1,
      rentalTerms: 'Aadhaar ID copy required at pick up.'
    };
  },

  getProducts() {
    if (!this.listingsLoaded && !this.isListingsLoading) {
      this.fetchListings();
    }
    return this.firestoreListings;
  },

  getProductById(id) {
    if (!id) return this.firestoreListings[0] || null;
    return this.firestoreListings.find(p => p.id === id || String(p.id) === String(id)) || null;
  },

  async saveProduct(productData) {
    const result = await saveListingToFirestore(productData);
    await this.fetchListings();
    return result;
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

  checkCanListProduct() {
    const user = this.getUser();
    if (!user) {
      this.openLoginModal();
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

  formatPostedTime(createdAt) {
    if (!createdAt) return 'Recently';
    let timestamp = createdAt;
    if (typeof createdAt === 'object' && createdAt.toMillis) {
      timestamp = createdAt.toMillis();
    } else if (typeof createdAt === 'string') {
      timestamp = new Date(createdAt).getTime();
    }
    if (!timestamp || isNaN(timestamp)) return 'Recently';

    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  },

  renderProductCardHTML(p, options = {}) {
    const favs = this.getFavorites();
    const isFav = favs.includes(p.id) || favs.includes(String(p.id));
    const priceHTML = this.formatProductPrice(p);
    const user = this.getUser();
    const isMyItem = !!(user && user.uid && p.ownerId && p.ownerId === user.uid);
    const onDeleteCallbackName = options.onDeleteCallback || '';
    const onFavToggle = options.onFavToggle || '';

    const images = p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'];
    const hasMultipleImages = images.length > 1;
    const postedTimeStr = this.formatPostedTime(p.createdAt);
    const ownerDisplayName = p.ownerName || 'Verified Owner';

    const pricingBadgeText = p.pricingType === 'hour' 
      ? 'Per Hour' 
      : (p.pricingType === 'day' ? 'Per Day' : (p.priceHour && p.priceDay ? 'Hour & Day' : 'Per Day'));

    return `
      <div class="product-card" onclick="window.location.href='/pages/listing.html?id=${p.id}'">
        <div class="product-image-container" onclick="event.stopPropagation(); window.location.href='/pages/listing.html?id=${p.id}'">
          <img id="card-img-${p.id}" data-img-idx="0" src="${images[0]}" class="product-image" alt="${p.title}" loading="lazy">
          
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); Rentiwa.toggleFavorite('${p.id}'); ${onFavToggle}" title="Save to Favorites">
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
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="badge badge-primary">${p.category}</span>
              <span class="price-type-badge">${pricingBadgeText}</span>
            </div>
            <span class="product-location-text">📍 ${(p.area || p.location || 'Narela').split(',')[0]}</span>
          </div>

          <h3 class="product-title">${p.title}</h3>

          <div class="product-prices">
            ${priceHTML}
          </div>

          <div class="product-owner-meta">
            <span class="meta-owner" title="Owner: ${ownerDisplayName}">👤 ${ownerDisplayName}</span>
            <span class="meta-time">⏱️ ${postedTimeStr}</span>
          </div>

          <div class="product-footer">
            <div class="owner-rating">
              <svg width="14" height="14" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>${p.rating || 5.0} (${p.reviewCount || 1})</span>
            </div>

            <div class="product-card-actions" onclick="event.stopPropagation();">
              <button type="button" onclick="Rentiwa.shareListing('${p.id}', event);" class="btn btn-outline btn-sm card-share-btn" title="Share Listing">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span class="share-btn-label">Share</span>
              </button>
              ${isMyItem ? `
                <button type="button" onclick="Rentiwa.openEditListingModal('${p.id}');" class="btn btn-outline btn-sm" style="color:var(--primary-dark); border-color:var(--primary); padding:5px 8px;" title="Edit Listing">
                  ✏️
                </button>
                ${onDeleteCallbackName ? `
                  <button type="button" onclick="Rentiwa.confirmAndDeleteListing('${p.id}', ${onDeleteCallbackName});" class="btn btn-outline btn-sm" style="color:#ef4444; border-color:rgba(239, 68, 68, 0.3); padding:5px 8px;" title="Delete Listing">
                    🗑️
                  </button>
                ` : ''}
              ` : ''}
              <a href="/pages/listing.html?id=${p.id}" class="btn btn-secondary btn-sm card-details-btn">
                View Details
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  openEditListingModal(productId) {
    const product = this.getProductById(productId);
    if (!product) {
      this.showToast('Listing not found', 'error');
      return;
    }

    let modal = document.getElementById('edit-listing-modal-overlay');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'edit-listing-modal-overlay';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:540px; width:92%; max-height:90vh; overflow-y:auto; padding:28px 22px;">
        <button class="modal-close" onclick="Rentiwa.closeModal('edit-listing-modal-overlay')">✕</button>
        <div style="text-align:center; margin-bottom:20px;">
          <h2 class="heading-md" style="margin-bottom:4px; font-size:1.3rem;">Edit Listing Details</h2>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Update details for <strong>${product.title}</strong></p>
        </div>

        <form onsubmit="Rentiwa.handleEditFormSubmit(event, '${product.id}')">
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <label class="form-label" style="font-weight:600; font-size:0.88rem;">Item Name / Title *</label>
              <input type="text" id="edit-title" class="form-input" value="${product.title.replace(/"/g, '&quot;')}" required>
            </div>

            <div>
              <label class="form-label" style="font-weight:600; font-size:0.88rem;">Category *</label>
              <select id="edit-category" class="form-select" required>
                <option value="Photography" ${product.category === 'Photography' ? 'selected' : ''}>📷 Photography & Cameras</option>
                <option value="Events" ${product.category === 'Events' ? 'selected' : ''}>🔊 Speakers & Party Decor</option>
                <option value="Gaming" ${product.category === 'Gaming' ? 'selected' : ''}>🎮 Gaming Consoles (PS5/Xbox)</option>
                <option value="Electronics" ${product.category === 'Electronics' ? 'selected' : ''}>💻 Electronics & Laptops</option>
                <option value="Tools" ${product.category === 'Tools' ? 'selected' : ''}>🔧 Power Tools & Drills</option>
                <option value="Sports" ${product.category === 'Sports' ? 'selected' : ''}>⛺ Camping & Sports</option>
                <option value="Vehicles" ${product.category === 'Vehicles' ? 'selected' : ''}>🚲 Bicycles & Cycles</option>
                <option value="Music" ${product.category === 'Music' ? 'selected' : ''}>🎤 Music & Audio</option>
                <option value="Furniture" ${product.category === 'Furniture' ? 'selected' : ''}>🪑 Furniture & Stage</option>
                <option value="Other" ${product.category === 'Other' ? 'selected' : ''}>📦 Other Items</option>
              </select>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label class="form-label" style="font-weight:600; font-size:0.88rem;">Price per Hour (₹)</label>
                <input type="number" id="edit-price-hour" class="form-input" value="${product.priceHour || product.price}" min="1">
              </div>
              <div>
                <label class="form-label" style="font-weight:600; font-size:0.88rem;">Price per Day (₹)</label>
                <input type="number" id="edit-price-day" class="form-input" value="${product.priceDay || product.price}" min="1">
              </div>
            </div>

            <div>
              <label class="form-label" style="font-weight:600; font-size:0.88rem;">Location / Area *</label>
              <input type="text" id="edit-location" class="form-input" value="${product.location.replace(/"/g, '&quot;')}" required>
            </div>

            <div>
              <label class="form-label" style="font-weight:600; font-size:0.88rem;">Description *</label>
              <textarea id="edit-description" class="form-textarea" style="min-height:85px;" required>${product.description}</textarea>
            </div>

            <div style="display:flex; gap:12px; margin-top:8px;">
              <button type="button" onclick="Rentiwa.closeModal('edit-listing-modal-overlay')" class="btn btn-outline btn-full">
                Cancel
              </button>
              <button type="submit" id="edit-submit-btn" class="btn btn-primary btn-full" style="font-weight:700;">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  },

  async handleEditFormSubmit(e, productId) {
    e.preventDefault();
    const submitBtn = document.getElementById('edit-submit-btn');

    const title = document.getElementById('edit-title').value.trim();
    const category = document.getElementById('edit-category').value;
    const priceHour = Number(document.getElementById('edit-price-hour').value) || 0;
    const priceDay = Number(document.getElementById('edit-price-day').value) || 0;
    const location = document.getElementById('edit-location').value.trim();
    const description = document.getElementById('edit-description').value.trim();

    if (!title || !category || !location || !description) {
      this.showToast('Please fill out all required fields.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Updating...';
    }

    try {
      await updateListingInFirestore(productId, {
        title,
        category,
        price: priceDay || priceHour,
        priceHour,
        priceDay,
        location,
        description
      });

      this.showToast('✨ Listing updated successfully!', 'success');
      this.closeModal('edit-listing-modal-overlay');
      await this.fetchListings();
    } catch (err) {
      console.error("Error updating listing:", err);
      this.showToast(err.message || 'Failed to update listing.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Save Changes';
      }
    }
  },

  shareListing(productId, event) {
    if (event) event.stopPropagation();

    const product = this.getProductById(productId);
    const shareUrl = `${window.location.origin}/pages/listing.html?id=${productId}`;
    const title = product ? product.title : 'Rental Item on Rentiwa';
    const area = product ? (product.area || product.location || 'Narela') : 'Narela';
    const shareText = product 
      ? `Check out "${product.title}" on Rentiwa! Rent it in ${area}: ${shareUrl}`
      : `Check out this rental listing on Rentiwa: ${shareUrl}`;

    const waText = encodeURIComponent(`${shareText}`);
    const waUrl = `https://api.whatsapp.com/send?text=${waText}`;

    let modal = document.getElementById('share-modal-overlay');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'share-modal-overlay';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:440px; width:92%; text-align:center; padding:24px 20px;">
        <button class="modal-close" onclick="Rentiwa.closeModal('share-modal-overlay')">✕</button>
        
        <div style="font-size:2rem; margin-bottom:8px;">📢</div>
        <h3 class="heading-md" style="margin-bottom:6px; font-size:1.25rem;">Share Listing</h3>
        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:18px; line-height:1.4;">
          Share <strong>"${title}"</strong> with friends & local renters in ${area}!
        </p>

        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
          <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn" style="background:#25D366; color:#ffffff; font-weight:700; padding:12px 16px; border-radius:var(--radius-lg); display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; box-shadow:0 3px 10px rgba(37,211,102,0.25);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 001.333 4.993L2 22l5.233-1.237a9.96 9.96 0 004.779 1.217h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.669-1.038-5.176-2.925-7.062A9.925 9.925 0 0012.012 2z"/></svg>
            <span>Share via WhatsApp</span>
          </a>

          <button type="button" onclick="Rentiwa.copyShareLink('${shareUrl}')" class="btn btn-outline" style="font-weight:700; padding:12px 16px; border-radius:var(--radius-lg); display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Direct Link</span>
          </button>
        </div>

        <div style="background:var(--bg-secondary); padding:8px 12px; border-radius:var(--radius-md); font-size:0.78rem; color:var(--text-muted); word-break:break-all; border:1px solid var(--border-light);">
          ${shareUrl}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  },

  copyShareLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('📋 Link copied to clipboard!', 'success');
      }).catch(() => {
        this.fallbackCopyText(url);
      });
    } else {
      this.fallbackCopyText(url);
    }
  },

  fallbackCopyText(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    this.showToast('📋 Link copied to clipboard!', 'success');
  },

  async triggerNativeShare(title, text, url) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url
        });
        this.closeModal('share-modal-overlay');
      } catch (err) {
        console.warn("Share error:", err);
      }
    }
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
      confirmBtn.onclick = async () => {
        Rentiwa.closeModal('delete-confirm-modal-overlay');
        const success = await Rentiwa.deleteListing(id, true);
        if (success && typeof callback === 'function') {
          callback();
        }
      };
    }
  },

  async deleteListing(id, skipConfirm = false) {
    if (!skipConfirm) {
      this.confirmAndDeleteListing(id);
      return false;
    }

    const user = this.getUser();
    let products = this.getProducts();
    const product = products.find(p => p.id === id || String(p.id) === String(id));

    if (!user || !user.uid || !product || product.ownerId !== user.uid) {
      this.showToast('Permission denied: You can only delete your own listings.', 'error');
      return false;
    }

    try {
      await deleteListingFromFirestore(id);

      this.firestoreListings = this.firestoreListings.filter(p => p.id !== id && String(p.id) !== String(id));

      let favs = this.getFavorites();
      if (favs.includes(id) || favs.includes(String(id))) {
        favs = favs.filter(fId => fId !== id && String(fId) !== String(id));
        localStorage.setItem(this.STORAGE_FAVS_KEY, JSON.stringify(favs));
      }

      if (user && user.listingsCount > 0) {
        user.listingsCount = user.listingsCount - 1;
        this.setUser(user);
      }

      this.showToast('🗑️ Listing deleted successfully!', 'success');
      return true;
    } catch (err) {
      console.error("Error deleting listing from Firestore:", err);
      this.showToast(err.message || 'Deletion failed.', 'error');
      return false;
    }
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
            </a>

            <ul class="nav-menu" id="nav-menu-list">
              <li><a href="/" class="nav-link ${window.location.pathname === '/' || window.location.pathname.endsWith('index.html') ? 'active' : ''}">Home</a></li>
              <li><a href="/pages/all-listings.html" class="nav-link ${window.location.pathname.includes('all-listings') ? 'active' : ''}">All Listings</a></li>
              <li class="mobile-only-nav-item"><a href="/pages/add-listing.html" class="nav-link">+ List Item</a></li>
              ${currentUser ? `
                <li class="mobile-only-nav-item"><a href="/pages/profile.html" class="nav-link">My Profile & Listings</a></li>
                <li class="mobile-only-nav-item"><button type="button" onclick="Rentiwa.logout()" class="nav-link" style="color:#ef4444; background:none; border:none; width:100%; text-align:left; font:inherit; cursor:pointer;">Logout (${currentUser.name.split(' ')[0]})</button></li>
              ` : `
                <li class="mobile-only-nav-item"><button type="button" onclick="Rentiwa.loginWithGoogle()" class="nav-link" style="color:var(--primary-dark); background:none; border:none; width:100%; text-align:left; font:inherit; cursor:pointer; font-weight:700;">🔑 Login with Google</button></li>
              `}
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
                        <span class="badge badge-green" style="margin-top:6px;">
                          Verified Member
                        </span>
                      </div>
                      <a href="/pages/profile.html" class="dropdown-item">My Profile</a>
                      <a href="/pages/add-listing.html" class="dropdown-item">Add Listing</a>
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
                  <li><a href="/pages/add-listing.html">List Your Product</a></li>
                </ul>
              </div>

              <div>
                <div class="footer-title">Top Categories</div>
                <ul class="footer-links">
                  <li><a href="/pages/all-listings.html?category=Photography">Photography & Cameras</a></li>
                  <li><a href="/pages/all-listings.html?category=Events">Speakers & Party Decor</a></li>
                  <li><a href="/pages/all-listings.html?category=Gaming">Gaming Consoles (PS5/Xbox)</a></li>
                  <li><a href="/pages/all-listings.html?category=Tools">Power Tools & Drills</a></li>
                  <li><a href="/pages/all-listings.html?category=Sports">Camping & Bicycles</a></li>
                </ul>
              </div>

              <div>
                <div class="footer-title">Company & Legal</div>
                <ul class="footer-links">
                  <li><a href="/pages/terms.html#about">About Rentiwa</a></li>
                  <li><a href="/pages/terms.html">Terms & Conditions</a></li>
                  <li><a href="/pages/terms.html#privacy">Privacy Policy</a></li>
                  <li><a href="mailto:teamrentiwa@gmail.com">Email: teamrentiwa@gmail.com</a></li>
                  <li><a href="https://instagram.com/officialrentiwa" target="_blank" rel="noopener">Instagram: @officialrentiwa</a></li>
                </ul>
              </div>
            </div>

            <div class="footer-bottom">
              <div>© 2026 RENTIWA. Built for Narela, Delhi. All rights reserved.</div>
              <div style="display:flex; gap:16px; flex-wrap:wrap;">
                <a href="/pages/terms.html">Terms & Conditions</a>
                <a href="/pages/terms.html#privacy">Privacy</a>
                <a href="https://instagram.com/officialrentiwa" target="_blank" rel="noopener">Instagram: @officialrentiwa</a>
                <a href="mailto:teamrentiwa@gmail.com">Email: teamrentiwa@gmail.com</a>
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
  openUpgradeModal() {
    const user = this.getUser();
    if (!user) {
      this.showToast('Please log in to submit an upgrade request.', 'info');
      this.openLoginModal();
      return;
    }

    let overlay = document.getElementById('upgrade-request-modal-overlay');
    if (overlay) {
      overlay.remove();
    }

    overlay = document.createElement('div');
    overlay.id = 'upgrade-request-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:520px; width:92%; max-height:92vh; overflow-y:auto; padding:28px 22px;">
        <button class="modal-close" onclick="Rentiwa.closeModal('upgrade-request-modal-overlay')">✕</button>
        <div id="upgrade-form-container">
          <div style="text-align:center; margin-bottom:20px;">
            <div class="badge badge-amber" style="margin-bottom:8px; display:inline-flex; align-items:center; gap:6px; font-weight:700;">
              ⭐ RENTIWA UPGRADE WAITING LIST
            </div>
            <h2 class="heading-md" style="margin-bottom:6px; font-size:1.35rem;">Upgrade Request Form</h2>
            <p style="font-size:0.88rem; color:var(--text-muted); margin:0;">
              Join our Upgrade Waiting List & unlock <strong>+5 FREE Listings</strong> instantly!
            </p>
          </div>

          <form id="upgrade-request-form" onsubmit="Rentiwa.handleUpgradeRequestSubmit(event)">
            <div style="display:flex; flex-direction:column; gap:14px;">
              <div>
                <label class="form-label" style="font-weight:600; font-size:0.88rem;">Full Name *</label>
                <input type="text" id="upgrade-name" class="form-input" value="${user.name || ''}" placeholder="Enter your full name" required>
              </div>

              <div>
                <label class="form-label" style="font-weight:600; font-size:0.88rem;">Phone Number *</label>
                <input type="tel" id="upgrade-phone" class="form-input" value="${user.phone || ''}" placeholder="+91 98765 43210" required>
              </div>

              <div>
                <label class="form-label" style="font-weight:600; font-size:0.88rem;">Location / Area *</label>
                <input type="text" id="upgrade-location" class="form-input" value="${user.area || 'Narela, Delhi'}" placeholder="e.g. Narela Sector A6, Delhi" required>
              </div>

              <div>
                <label class="form-label" style="font-weight:600; font-size:0.88rem;">Current Occupation (Optional)</label>
                <input type="text" id="upgrade-occupation" class="form-input" placeholder="e.g. Student, Photographer, Business Owner">
              </div>

              <div>
                <label class="form-label" style="font-weight:600; font-size:0.88rem; margin-bottom:8px; display:block;">
                  Has Rentiwa been helpful for you? *
                </label>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
                  <label class="upgrade-radio-card">
                    <input type="radio" name="helpfulAnswer" value="Yes" checked style="display:none;">
                    <div class="upgrade-radio-content">
                      <span class="radio-icon">😊</span>
                      <span>Yes</span>
                    </div>
                  </label>

                  <label class="upgrade-radio-card">
                    <input type="radio" name="helpfulAnswer" value="Somewhat" style="display:none;">
                    <div class="upgrade-radio-content">
                      <span class="radio-icon">🤔</span>
                      <span>Somewhat</span>
                    </div>
                  </label>

                  <label class="upgrade-radio-card">
                    <input type="radio" name="helpfulAnswer" value="No" style="display:none;">
                    <div class="upgrade-radio-content">
                      <span class="radio-icon">🙁</span>
                      <span>No</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label class="form-label" style="font-weight:600; font-size:0.88rem;">What do you want from Rentiwa?</label>
                <textarea id="upgrade-feedback" class="form-textarea" style="min-height:75px;" placeholder="Tell us what items or features you'd like to see... (Optional)"></textarea>
              </div>

              <button type="submit" id="upgrade-submit-btn" class="btn btn-primary btn-full btn-lg" style="margin-top:6px; font-weight:700;">
                Submit Upgrade Request
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);
  },

  openPremiumUpgradeModal() {
    this.openUpgradeModal();
  },

  async handleUpgradeRequestSubmit(e) {
    e.preventDefault();
    const user = this.getUser();
    if (!user) {
      this.openLoginModal();
      return;
    }

    const name = (document.getElementById('upgrade-name').value || '').trim();
    const phone = (document.getElementById('upgrade-phone').value || '').trim();
    const location = (document.getElementById('upgrade-location').value || '').trim();
    const occupation = (document.getElementById('upgrade-occupation').value || '').trim();
    const helpfulAnswer = document.querySelector('input[name="helpfulAnswer"]:checked')?.value || 'Yes';
    const feedback = (document.getElementById('upgrade-feedback').value || '').trim();

    if (!name || !phone || !location) {
      this.showToast('Please fill out all required fields.', 'error');
      return;
    }

    const btn = document.getElementById('upgrade-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>Submitting Request...</span>`;
    }

    try {
      await submitUpgradeRequestToFirestore({
        name,
        phone,
        location,
        occupation,
        helpfulAnswer,
        feedback
      });

      // Grant +5 free listings locally
      user.extraFreeListings = 5;
      user.hasUpgradeRequest = true;
      user.name = name;
      user.phone = phone;
      this.setUser(user);

      const container = document.getElementById('upgrade-form-container');
      if (container) {
        container.innerHTML = `
          <div style="text-align:center; padding:12px 4px;">
            <div style="width:64px; height:64px; background:#dcfce7; color:#16a34a; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:1.8rem; font-weight:bold; box-shadow:0 4px 12px rgba(22,163,74,0.2);">
              ✓
            </div>

            <h2 style="font-family:var(--font-heading); font-size:1.5rem; font-weight:800; color:var(--dark); margin-bottom:6px;">
              Thank You!
            </h2>

            <p style="font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:8px;">
              Your upgrade request has been received.
            </p>

            <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.5; margin-bottom:20px;">
              You have been added to the <strong>Upgrade Waiting List</strong>.<br>Our team will contact you soon.
            </p>

            <div style="background:var(--primary-light); border:1.5px dashed var(--primary); padding:16px; border-radius:var(--radius-lg); margin-bottom:24px; text-align:center;">
              <div style="font-size:0.8rem; font-weight:800; color:var(--primary-dark); text-transform:uppercase; letter-spacing:0.5px;">
                🎁 THANK-YOU BONUS
              </div>
              <div style="font-size:1.2rem; font-weight:800; color:var(--dark); margin-top:4px;">
                Your account received <span style="color:var(--primary);">+5 FREE Listings</span>!
              </div>
              <div style="font-size:0.82rem; color:var(--text-muted); margin-top:2px;">
                You can now list up to 10 products on Rentiwa for FREE.
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
              <button onclick="Rentiwa.closeModal('upgrade-request-modal-overlay'); window.location.href='/pages/add-listing.html';" class="btn btn-primary btn-full btn-lg">
                + List an Item Now
              </button>
              <button onclick="Rentiwa.closeModal('upgrade-request-modal-overlay'); location.reload();" class="btn btn-outline btn-full">
                Close
              </button>
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.error("Error submitting upgrade request:", err);
      this.showToast(err.message || 'Failed to submit request.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Submit Upgrade Request</span>`;
      }
    }
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
