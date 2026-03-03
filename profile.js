// ════════════════════════════════════════════════════
//  ACCOUNT PAGE — Interactive Logic
// ════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── User State ──
  let currentUser = null;
  let token = null;

  try {
    token = localStorage.getItem('shopHubToken');
    const userStr = localStorage.getItem('shopHubUser');
    if (token && userStr) currentUser = JSON.parse(userStr);
  } catch (e) { }

  // Redirect to login if not authenticated
  if (!currentUser || !token) {
    window.location.href = 'login.html';
    return;
  }

  // ── Dark / Light Mode ──
  // Defaults to dark mode (matching front page). "Off" = light mode (cream/green)
  const savedTheme = localStorage.getItem('shopHubTheme');
  const isDark = savedTheme ? savedTheme === 'dark' : true; // default dark

  function applyTheme(dark) {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(dark ? 'dark-mode' : 'light-mode');
    localStorage.setItem('shopHubTheme', dark ? 'dark' : 'light');

    // Sync the toggle checkbox
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = dark;
  }

  // Apply immediately
  applyTheme(isDark);

  // Wire up toggle after DOM is ready
  setTimeout(() => {
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
      darkToggle.checked = isDark;
      darkToggle.addEventListener('change', function () {
        applyTheme(this.checked);
      });
    }
  }, 0);

  // ── Populate User Info ──
  const avatarEl = document.getElementById('accountAvatar');
  const nameEl = document.getElementById('accountUserName');
  const emailEl = document.getElementById('accountUserEmail');
  const roleBadge = document.getElementById('accountRoleBadge');

  if (nameEl) nameEl.textContent = currentUser.username || currentUser.email?.split('@')[0] || 'User';
  if (emailEl) emailEl.textContent = currentUser.email || '';
  if (roleBadge) {
    const roleMap = { admin: 'Admin', seller: 'Seller', user: 'Buyer' };
    roleBadge.textContent = roleMap[currentUser.role] || 'Buyer';
    if (currentUser.role === 'admin') {
      roleBadge.style.background = 'rgba(220,38,38,0.12)';
      roleBadge.style.color = '#f87171';
      roleBadge.style.borderColor = 'rgba(220,38,38,0.25)';
    } else if (currentUser.role === 'seller') {
      roleBadge.style.background = 'rgba(34,166,153,0.12)';
      roleBadge.style.color = '#22a699';
      roleBadge.style.borderColor = 'rgba(34,166,153,0.25)';
    }
  }
  if (avatarEl) {
    const name = encodeURIComponent(currentUser.username || 'User');
    avatarEl.src = `https://ui-avatars.com/api/?name=${name}&background=d4af37&color=101522&rounded=true&size=120`;
  }

  // Populate profile form
  const profileName = document.getElementById('profileName');
  const profileUsername = document.getElementById('profileUsername');
  const profileEmail = document.getElementById('profileEmail');
  const profilePhone = document.getElementById('profilePhone');
  const profileBio = document.getElementById('profileBio');

  if (profileName) profileName.value = currentUser.username || '';
  if (profileUsername) profileUsername.value = currentUser.username || '';
  if (profileEmail) profileEmail.value = currentUser.email || '';

  // Load saved profile extras
  try {
    const extras = JSON.parse(localStorage.getItem('shopHubProfileExtras') || '{}');
    if (profilePhone) profilePhone.value = extras.phone || '+91 ';
    if (profileBio) profileBio.value = extras.bio || '';
  } catch (e) { }

  // ── Show/hide Add Product based on role ──
  const navAddProduct = document.getElementById('navAddProduct');
  if (navAddProduct) {
    if (currentUser.role === 'seller' || currentUser.role === 'admin') {
      navAddProduct.style.display = 'flex';
    } else {
      navAddProduct.style.display = 'none';
    }
  }

  // ── Hide upgrade section if already seller/admin ──
  const upgradeBtn = document.getElementById('upgradeSellerBtn');
  if (upgradeBtn && (currentUser.role === 'seller' || currentUser.role === 'admin')) {
    const card = upgradeBtn.closest('.profile-form-card');
    if (card) card.style.display = 'none';
  }

  // ── Section Navigation ──
  const navItems = document.querySelectorAll('.account-nav-item');
  const sections = document.querySelectorAll('.account-section');

  function switchSection(sectionId) {
    sections.forEach(s => {
      s.classList.remove('active');
      s.style.animation = 'none';
    });
    navItems.forEach(n => n.classList.remove('active'));

    const target = document.getElementById('section-' + sectionId);
    const navTarget = document.querySelector(`[data-section="${sectionId}"]`);

    if (target) {
      // Trigger re-animation
      void target.offsetWidth;
      target.style.animation = '';
      target.classList.add('active');

      // Re-animate child cards
      target.querySelectorAll('.animate-in').forEach(card => {
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = '';
      });
    }
    if (navTarget) navTarget.classList.add('active');

    // Close mobile sidebar
    const sidebar = document.getElementById('accountSidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  navItems.forEach(item => {
    item.addEventListener('click', function () {
      const section = this.getAttribute('data-section');
      switchSection(section);
    });
  });

  // ── Mobile Menu ──
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.getElementById('accountSidebar');

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    // Close on clicking outside
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ── Avatar Upload ──
  const avatarInput = document.getElementById('avatarInput');
  if (avatarInput && avatarEl) {
    avatarInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
          avatarEl.src = evt.target.result;
          localStorage.setItem('shopHubAvatar', evt.target.result);
          showToast('Profile photo updated!');
        };
        reader.readAsDataURL(file);
      }
    });
    // Load saved avatar
    const savedAvatar = localStorage.getItem('shopHubAvatar');
    if (savedAvatar) avatarEl.src = savedAvatar;
  }

  // ── Toast ──
  function showToast(message, isError) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');
    if (!toast) return;

    toastMsg.textContent = message;
    toast.classList.remove('error');
    if (isError) {
      toast.classList.add('error');
      toastIcon.textContent = '✕';
    } else {
      toastIcon.textContent = '✓';
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ── Save Profile ──
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
      const extras = {
        phone: profilePhone?.value || '',
        bio: profileBio?.value || ''
      };
      localStorage.setItem('shopHubProfileExtras', JSON.stringify(extras));

      // Update user name if changed
      if (profileName && profileName.value.trim()) {
        currentUser.username = profileName.value.trim();
        localStorage.setItem('shopHubUser', JSON.stringify(currentUser));
        if (nameEl) nameEl.textContent = currentUser.username;
      }

      showToast('Profile saved successfully!');
    });
  }

  // ── Change Password ──
  const changePassBtn = document.getElementById('changePassBtn');
  if (changePassBtn) {
    changePassBtn.addEventListener('click', () => {
      const currentPass = document.getElementById('currentPass');
      const newPass = document.getElementById('newPass');
      if (!currentPass?.value || !newPass?.value) {
        showToast('Please fill in both fields', true);
        return;
      }
      if (newPass.value.length < 6) {
        showToast('Password must be at least 6 characters', true);
        return;
      }
      // Clear fields
      currentPass.value = '';
      newPass.value = '';
      showToast('Password updated successfully!');
    });
  }

  // ── Add Product (API) ──
  const addProductBtn = document.getElementById('addProductBtn');
  if (addProductBtn) {
    addProductBtn.addEventListener('click', async () => {
      const name = document.getElementById('productName')?.value.trim();
      const price = parseFloat(document.getElementById('productPrice')?.value);
      const category = document.getElementById('productCategory')?.value;
      const image = document.getElementById('productImage')?.value.trim();
      const desc = document.getElementById('productDesc')?.value.trim();

      if (!name) return showToast('Product name is required', true);
      if (isNaN(price) || price <= 0) return showToast('Valid price is required', true);
      if (!category) return showToast('Please select a category', true);

      try {
        const res = await fetch('/api/seller/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            name, price, category, image,
            description: desc,
            category_name: document.getElementById('productCategory')?.selectedOptions[0]?.text || category
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Product added successfully!');
          // Clear form
          document.getElementById('productName').value = '';
          document.getElementById('productPrice').value = '';
          document.getElementById('productCategory').value = '';
          document.getElementById('productImage').value = '';
          document.getElementById('productDesc').value = '';
          loadMyProducts();
        } else {
          showToast(data.error || 'Failed to add product', true);
        }
      } catch (e) {
        showToast('Network error. Please try again.', true);
      }
    });
  }

  // Clear product form
  const clearProductBtn = document.getElementById('clearProductBtn');
  if (clearProductBtn) {
    clearProductBtn.addEventListener('click', () => {
      document.getElementById('productName').value = '';
      document.getElementById('productPrice').value = '';
      document.getElementById('productCategory').value = '';
      document.getElementById('productImage').value = '';
      document.getElementById('productDesc').value = '';
    });
  }

  // ── Load My Products ──
  async function loadMyProducts() {
    const container = document.getElementById('myProductsList');
    if (!container) return;

    try {
      const res = await fetch('/api/seller/products', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return;

      const data = await res.json();
      const products = data.products || [];

      if (products.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <p>No products listed yet</p>
          </div>`;
        return;
      }

      container.innerHTML = products.map(p => `
        <div class="product-row">
          <img src="${p.image || 'https://via.placeholder.com/48x48/1a1a1a/666?text=📦'}" 
               alt="${p.name}" class="product-row-img"
               onerror="this.src='https://via.placeholder.com/48x48/1a1a1a/666?text=📦'">
          <div class="product-row-info">
            <div class="product-row-name">${p.name}</div>
            <div class="product-row-price">₹${Math.round(p.price).toLocaleString('en-IN')}</div>
          </div>
          <button class="product-row-delete" onclick="deleteProduct(${p.id})" title="Delete">✕</button>
        </div>
      `).join('');
    } catch (e) {
      // Silently fail
    }
  }

  // ── Delete Product ──
  window.deleteProduct = async function (id) {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/seller/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        showToast('Product deleted');
        loadMyProducts();
      } else {
        showToast('Failed to delete', true);
      }
    } catch (e) {
      showToast('Network error', true);
    }
  };

  // ── Load Orders ──
  function loadOrders() {
    try {
      const orders = JSON.parse(localStorage.getItem('shopHubOrders') || '[]');
      const container = document.getElementById('ordersList');

      let completed = 0, pending = 0, cancelled = 0;
      orders.forEach(o => {
        const st = (o.status || 'pending').toLowerCase();
        if (st === 'completed' || st === 'delivered') completed++;
        else if (st === 'cancelled') cancelled++;
        else pending++;
      });

      document.getElementById('statCompleted').textContent = completed;
      document.getElementById('statPending').textContent = pending;
      document.getElementById('statCancelled').textContent = cancelled;

      if (!container) return;
      if (orders.length === 0) return;

      container.innerHTML = orders.map(o => `
        <div class="order-row">
          <div>
            <div class="order-id">#${o.id || o.orderId || '—'}</div>
            <div class="order-date">${o.date || new Date().toLocaleDateString()}</div>
          </div>
          <div class="order-amount">₹${Math.round(o.total || 0).toLocaleString('en-IN')}</div>
          <span class="order-status ${(o.status || 'pending').toLowerCase()}">${o.status || 'Pending'}</span>
        </div>
      `).join('');
    } catch (e) { }
  }

  // ── Addresses ──
  function loadAddresses() {
    const list = document.getElementById('addressesList');
    if (!list) return;

    const addresses = JSON.parse(localStorage.getItem('shopHubAddresses') || '[]');
    if (addresses.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = addresses.map((a, i) => `
      <div class="address-card animate-in" style="animation-delay:${i * 0.05}s;">
        <button class="address-delete" onclick="deleteAddress(${i})" title="Remove">✕</button>
        <div class="address-label">📍 ${a.label || 'Address'}</div>
        <div class="address-text">
          ${a.street || ''}<br>
          ${a.city || ''}${a.state ? ', ' + a.state : ''}<br>
          ${a.zip ? 'PIN: ' + a.zip : ''}${a.country ? ', ' + a.country : ', India'}<br>
          ${a.phone ? '📞 ' + a.phone : ''}
        </div>
      </div>
    `).join('');
  }

  const saveAddressBtn = document.getElementById('saveAddressBtn');
  if (saveAddressBtn) {
    saveAddressBtn.addEventListener('click', () => {
      const addr = {
        label: document.getElementById('addrLabel')?.value.trim(),
        phone: document.getElementById('addrPhone')?.value.trim(),
        street: document.getElementById('addrStreet')?.value.trim(),
        city: document.getElementById('addrCity')?.value.trim(),
        state: document.getElementById('addrState')?.value.trim(),
        zip: document.getElementById('addrZip')?.value.trim(),
        country: document.getElementById('addrCountry')?.value.trim()
      };

      if (!addr.street) return showToast('Street address is required', true);

      const addresses = JSON.parse(localStorage.getItem('shopHubAddresses') || '[]');
      addresses.push(addr);
      localStorage.setItem('shopHubAddresses', JSON.stringify(addresses));

      // Clear form
      ['addrLabel', 'addrPhone', 'addrStreet', 'addrCity', 'addrState', 'addrZip', 'addrCountry']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

      loadAddresses();
      showToast('Address saved!');
    });
  }

  window.deleteAddress = function (index) {
    const addresses = JSON.parse(localStorage.getItem('shopHubAddresses') || '[]');
    addresses.splice(index, 1);
    localStorage.setItem('shopHubAddresses', JSON.stringify(addresses));
    loadAddresses();
    showToast('Address removed');
  };

  // ── Wishlist ──
  function loadWishlist() {
    const grid = document.getElementById('wishlistGrid');
    if (!grid) return;

    const wishlist = JSON.parse(localStorage.getItem('shopHubWishlist') || '[]');
    if (wishlist.length === 0) return;

    grid.innerHTML = wishlist.map(item => `
      <div class="wishlist-card">
        <img src="${item.image || 'https://via.placeholder.com/200x160/1a1a1a/666?text=📦'}" 
             alt="${item.name}" class="wishlist-card-img"
             onerror="this.src='https://via.placeholder.com/200x160/1a1a1a/666?text=📦'">
        <div class="wishlist-card-body">
          <div class="wishlist-card-name">${item.name}</div>
          <div class="wishlist-card-price">₹${Math.round(item.price || 0).toLocaleString('en-IN')}</div>
        </div>
      </div>
    `).join('');
  }

  // ── Upgrade to Seller ──
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', async () => {
      const shopName = document.getElementById('shopName')?.value.trim();
      const shopPhone = document.getElementById('shopPhone')?.value.trim();
      const shopDesc = document.getElementById('shopDesc')?.value.trim();

      if (!shopName) return showToast('Shop name is required', true);
      if (!shopPhone) return showToast('Phone number is required', true);

      try {
        const res = await fetch('/api/upgrade-to-seller', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ shop_name: shopName, phone: shopPhone, description: shopDesc })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          // Update local state
          if (data.token) localStorage.setItem('shopHubToken', data.token);
          if (data.user) localStorage.setItem('shopHubUser', JSON.stringify(data.user));
          showToast('Upgraded to Seller! Reloading...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast(data.error || 'Upgrade failed', true);
        }
      } catch (e) {
        showToast('Network error', true);
      }
    });
  }

  // ── Logout ──
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('shopHubLoggedIn');
        localStorage.removeItem('shopHubToken');
        localStorage.removeItem('shopHubUser');
        window.location.href = 'login.html';
      }
    });
  }

  // ── Delete Account (Full OTP + 30-day flow) ──

  // Check on page load if deletion is already pending
  function checkDeletionStatus() {
    if (currentUser && currentUser.account_deletion_pending) {
      document.getElementById('deleteDefault').style.display = 'none';
      document.getElementById('deleteOtpSection').style.display = 'none';
      document.getElementById('deletePendingSection').style.display = 'block';

      // Fetch fresh user data for deletion date
      fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(r => r.json())
        .then(data => {
          if (data.user && data.user.account_deletion_pending) {
            // Show deletion date if available
            const dateEl = document.getElementById('deletionDateDisplay');
            if (dateEl && data.user.account_deletion_date) {
              const dt = new Date(data.user.account_deletion_date);
              dateEl.textContent = dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            } else if (dateEl) {
              dateEl.textContent = '30 days from now';
            }
          }
        })
        .catch(() => { });
    }
  }

  checkDeletionStatus();

  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
      if (!confirm('⚠️ Are you sure you want to delete your account?\n\nA verification code will be sent to your email. Your account will be scheduled for deletion in 30 days.')) return;

      deleteAccountBtn.disabled = true;
      deleteAccountBtn.textContent = 'Sending OTP...';

      try {
        const res = await fetch('/api/request-account-deletion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Verification code sent to your email');
          // Show OTP input
          document.getElementById('deleteDefault').style.display = 'none';
          document.getElementById('deleteOtpSection').style.display = 'block';
        } else {
          showToast(data.error || 'Failed to initiate deletion', true);
        }
      } catch (e) {
        showToast('Network error. Please try again.', true);
      } finally {
        deleteAccountBtn.disabled = false;
        deleteAccountBtn.textContent = 'Delete Account';
      }
    });
  }

  // Verify deletion OTP
  const verifyDeleteOtpBtn = document.getElementById('verifyDeleteOtpBtn');
  if (verifyDeleteOtpBtn) {
    verifyDeleteOtpBtn.addEventListener('click', async () => {
      const otp = document.getElementById('deleteOtpInput').value.trim();
      if (!otp || otp.length !== 6) {
        showToast('Please enter the 6-digit code', true);
        return;
      }

      verifyDeleteOtpBtn.disabled = true;
      verifyDeleteOtpBtn.textContent = 'Verifying...';

      try {
        const res = await fetch('/api/verify-deletion-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ otp })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Account deletion verified. Scheduled for 30 days.');
          // Update user state
          currentUser.account_deletion_pending = true;
          localStorage.setItem('shopHubUser', JSON.stringify(currentUser));

          // Show pending section
          document.getElementById('deleteOtpSection').style.display = 'none';
          document.getElementById('deletePendingSection').style.display = 'block';

          const dateEl = document.getElementById('deletionDateDisplay');
          if (dateEl && data.deletion_date) {
            const dt = new Date(data.deletion_date);
            dateEl.textContent = dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          } else if (dateEl) {
            dateEl.textContent = '30 days from now';
          }
        } else {
          showToast(data.error || 'Invalid verification code', true);
        }
      } catch (e) {
        showToast('Network error. Please try again.', true);
      } finally {
        verifyDeleteOtpBtn.disabled = false;
        verifyDeleteOtpBtn.textContent = 'Confirm Deletion';
      }
    });
  }

  // Cancel OTP entry (go back to delete button)
  const cancelDeleteOtpBtn = document.getElementById('cancelDeleteOtpBtn');
  if (cancelDeleteOtpBtn) {
    cancelDeleteOtpBtn.addEventListener('click', () => {
      document.getElementById('deleteOtpSection').style.display = 'none';
      document.getElementById('deleteDefault').style.display = 'block';
      document.getElementById('deleteOtpInput').value = '';
    });
  }

  // Cancel account deletion (restore account)
  const cancelDeletionBtn = document.getElementById('cancelDeletionBtn');
  if (cancelDeletionBtn) {
    cancelDeletionBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to cancel the deletion and keep your account?')) return;

      cancelDeletionBtn.disabled = true;
      cancelDeletionBtn.textContent = 'Restoring...';

      try {
        const res = await fetch('/api/cancel-account-deletion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Account deletion cancelled! Your account is active.');
          // Update user state
          currentUser.account_deletion_pending = false;
          localStorage.setItem('shopHubUser', JSON.stringify(currentUser));

          // Show default state
          document.getElementById('deletePendingSection').style.display = 'none';
          document.getElementById('deleteDefault').style.display = 'block';
        } else {
          showToast(data.error || 'Failed to cancel deletion', true);
        }
      } catch (e) {
        showToast('Network error. Please try again.', true);
      } finally {
        cancelDeletionBtn.disabled = false;
        cancelDeletionBtn.textContent = 'Cancel Deletion & Restore Account';
      }
    });
  }

  // ── Cancel Profile ──
  const cancelProfileBtn = document.getElementById('cancelProfileBtn');
  if (cancelProfileBtn) {
    cancelProfileBtn.addEventListener('click', () => {
      if (profileName) profileName.value = currentUser.username || '';
      if (profileUsername) profileUsername.value = currentUser.username || '';
      try {
        const extras = JSON.parse(localStorage.getItem('shopHubProfileExtras') || '{}');
        if (profilePhone) profilePhone.value = extras.phone || '';
        if (profileBio) profileBio.value = extras.bio || '';
      } catch (e) { }
      showToast('Changes reverted');
    });
  }

  // ── Initialize ──
  loadOrders();
  loadAddresses();
  loadWishlist();
  if (currentUser.role === 'seller' || currentUser.role === 'admin') {
    loadMyProducts();
  }

})();
