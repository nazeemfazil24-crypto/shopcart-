// Global category filter for category pages.
// Read initial value from window (category pages set `window.categoryPageFilter` before this script loads).
let categoryPageFilter = (typeof window !== 'undefined' && window.categoryPageFilter) ? window.categoryPageFilter : null;

// Login/Logout Functionality (JWT-based)
function getAuthUser() {
	try {
		const userStr = localStorage.getItem('shopHubUser');
		const token = localStorage.getItem('shopHubToken');
		if (userStr && token) return JSON.parse(userStr);
	} catch (e) { console.warn('Invalid auth data', e); }
	return null;
}

function checkLoginStatus() {
	const user = getAuthUser();
	const accountText = document.getElementById('accountText');
	const accountLink = document.getElementById('accountLink');

	// Role-based nav links
	const adminLink = document.getElementById('adminNavLink');
	const sellerLink = document.getElementById('sellerNavLink');

	if (user && accountText) {
		const name = user.username || user.email || 'Account';
		accountText.textContent = `${name} (Logout)`;
		if (accountLink) accountLink.style.cursor = 'pointer';

		// Show role-specific links
		if (adminLink) adminLink.style.display = (user.role === 'admin') ? 'inline-block' : 'none';
		if (sellerLink) sellerLink.style.display = (user.role === 'seller' || user.role === 'admin') ? 'inline-block' : 'none';
	} else {
		if (accountText) accountText.textContent = 'Login';
		if (adminLink) adminLink.style.display = 'none';
		if (sellerLink) sellerLink.style.display = 'none';
	}
}

function handleAccountClick() {
	const user = getAuthUser();

	if (user) {
		if (confirm('Click OK to logout from ShopHub')) {
			localStorage.removeItem('shopHubLoggedIn');
			localStorage.removeItem('shopHubToken');
			localStorage.removeItem('shopHubUser');
			window.location.href = 'login.html';
		}
	} else {
		window.location.href = 'login.html';
	}
}

// Check login status when page loads
window.addEventListener('load', checkLoginStatus);

// Admin/Seller nav — handled by checkLoginStatus() role-based links

document.addEventListener('DOMContentLoaded', () => {
	const TAX_RATE = 0.05;
	const cart = { items: [] };
	let allProducts = [];
	let filteredProducts = [];
	let currentProduct = null;

	// Embedded menu data - Premium Men's Collection
	const menuData = {
		"stores": [
			{
				"id": "store_1", "name": "Suits & Blazers", "category": "suits-blazers",
				"items": [
					{ "id": "p1", "name": "Premium Black Blazer", "price": 45999, "image": "uploads/black_blazer.png", "description": "Tailored slim-fit blazer in midnight black wool blend", "rating": 4.9, "reviews": 342 },
					{ "id": "p2", "name": "Navy Blue Suit Set", "price": 64999, "image": "uploads/navy_blue_suit.png", "description": "Two-piece suit with peak lapel, Italian fabric", "rating": 4.8, "reviews": 276 },
					{ "id": "p3", "name": "Charcoal Wool Blazer", "price": 49999, "image": "uploads/charcoal_wool_blazer.png", "description": "Single-breasted wool blazer, modern cut", "rating": 4.7, "reviews": 198 },
					{ "id": "p4", "name": "Double-Breasted Suit", "price": 72999, "image": "uploads/double_breasted_suit.png", "description": "Classic double-breasted design with gold buttons", "rating": 4.9, "reviews": 164 },
					{ "id": "p5", "name": "Velvet Dinner Jacket", "price": 58999, "image": "uploads/velvet_dinner_jacket.png", "description": "Luxury velvet tuxedo jacket for black-tie events", "rating": 4.8, "reviews": 223 },
					{ "id": "p6", "name": "Linen Summer Blazer", "price": 34999, "image": "uploads/linen_summer_blazer.png", "description": "Breathable linen blazer for warm-weather elegance", "rating": 4.6, "reviews": 145 }
				]
			},
			{
				"id": "store_2", "name": "Dress Shirts", "category": "dress-shirts",
				"items": [
					{ "id": "p7", "name": "Silk Dress Shirt White", "price": 14999, "image": "uploads/white_silk_shirt.png", "description": "Pure silk French-cuff dress shirt, crisp white", "rating": 4.7, "reviews": 198 },
					{ "id": "p8", "name": "Egyptian Cotton Oxford", "price": 12999, "image": "uploads/cotton_oxford_shirt.png", "description": "Premium Egyptian cotton button-down oxford", "rating": 4.8, "reviews": 312 },
					{ "id": "p9", "name": "Slim Fit Black Shirt", "price": 11499, "image": "uploads/black_dress_shirt.png", "description": "Stretch cotton slim-fit shirt in jet black", "rating": 4.6, "reviews": 256 },
					{ "id": "p10", "name": "French Blue Chambray", "price": 13499, "image": "uploads/blue_chambray_shirt.png", "description": "Soft chambray weave shirt in French blue", "rating": 4.7, "reviews": 189 },
					{ "id": "p11", "name": "Pinstripe Dress Shirt", "price": 12499, "image": "uploads/pinstripe_shirt.png", "description": "Fine pinstripe pattern on premium cotton", "rating": 4.5, "reviews": 167 },
					{ "id": "p12", "name": "Spread Collar Lilac", "price": 11999, "image": "uploads/lilac_spread_shirt.png", "description": "Italian-collar shirt in subtle lilac shade", "rating": 4.6, "reviews": 143 }
				]
			},
			{
				"id": "store_3", "name": "Denim & Trousers", "category": "denim-trousers",
				"items": [
					{ "id": "p13", "name": "Designer Denim Jeans", "price": 24999, "image": "uploads/designer_denim_jeans.png", "description": "Japanese selvedge denim, slim tapered fit", "rating": 4.8, "reviews": 287 },
					{ "id": "p14", "name": "Tailored Wool Trousers", "price": 21999, "image": "uploads/wool_trousers.png", "description": "Flat-front wool trousers with crease detail", "rating": 4.7, "reviews": 234 },
					{ "id": "p15", "name": "Stretch Chinos Khaki", "price": 13999, "image": "uploads/khaki_chinos.png", "description": "Comfortable stretch chinos in classic khaki", "rating": 4.6, "reviews": 321 },
					{ "id": "p16", "name": "Black Slim Trousers", "price": 18999, "image": "uploads/black_slim_trousers.png", "description": "Modern slim-cut trousers, wrinkle-resistant", "rating": 4.8, "reviews": 198 },
					{ "id": "p17", "name": "Raw Indigo Denim", "price": 29999, "image": "uploads/raw_indigo_denim.png", "description": "Premium raw indigo Japanese denim, straight leg", "rating": 4.9, "reviews": 156 },
					{ "id": "p18", "name": "Pleated Dress Pants", "price": 19999, "image": "uploads/pleated_dress_pants.png", "description": "Classic pleated front with cuffed hem", "rating": 4.5, "reviews": 178 }
				]
			},
			{
				"id": "store_4", "name": "Watches", "category": "watches",
				"items": [
					{ "id": "p19", "name": "Luxury Chronograph Watch", "price": 89999, "image": "uploads/luxury_chronograph_watch.png", "description": "Swiss-movement chronograph with sapphire crystal", "rating": 4.9, "reviews": 521 },
					{ "id": "p20", "name": "Minimalist Dress Watch", "price": 54999, "image": "uploads/minimalist_dress_watch.png", "description": "Slim profile, Italian leather strap, rose gold", "rating": 4.8, "reviews": 345 },
					{ "id": "p21", "name": "Diver's Automatic Watch", "price": 109999, "image": "uploads/divers_automatic_watch.png", "description": "300m water-resistant automatic diver with ceramic bezel", "rating": 4.9, "reviews": 412 },
					{ "id": "p22", "name": "Classic Pilot Watch", "price": 69999, "image": "uploads/classic_pilot_watch.png", "description": "Aviation-inspired with luminous hands and numerals", "rating": 4.7, "reviews": 267 },
					{ "id": "p23", "name": "Skeleton Tourbillon", "price": 189999, "image": "uploads/skeleton_tourbillon.png", "description": "Open-heart tourbillon movement, exhibition caseback", "rating": 4.9, "reviews": 189 },
					{ "id": "p24", "name": "Sport Chronometer", "price": 64999, "image": "uploads/sport_chronometer.jpg", "description": "COSC-certified chronometer with tachymeter scale", "rating": 4.8, "reviews": 298 }
				]
			},
			{
				"id": "store_5", "name": "Footwear", "category": "footwear",
				"items": [
					{ "id": "p25", "name": "Italian Leather Loafers", "price": 34999, "image": "uploads/italian_leather_loafers.jpg", "description": "Hand-stitched penny loafers in burnished leather", "rating": 4.9, "reviews": 264 },
					{ "id": "p26", "name": "Oxford Dress Shoes", "price": 44999, "image": "uploads/oxford_dress_shoes.jpg", "description": "Cap-toe Oxford in full-grain calfskin leather", "rating": 4.8, "reviews": 312 },
					{ "id": "p27", "name": "Chelsea Boots Black", "price": 39999, "image": "uploads/51lpcYzZcdL._AC_UY1100_.jpg", "description": "Sleek Chelsea boots with elastic gore panel", "rating": 4.7, "reviews": 198 },
					{ "id": "p28", "name": "Suede Desert Boots", "price": 27999, "image": "uploads/suede_desert_boots.jpg", "description": "Classic desert boots in premium tan suede", "rating": 4.6, "reviews": 234 },
					{ "id": "p29", "name": "Monk Strap Shoes", "price": 42999, "image": "uploads/monk.avif", "description": "Double monk-strap in polished mahogany leather", "rating": 4.8, "reviews": 187 },
					{ "id": "p30", "name": "Premium White Sneakers", "price": 29999, "image": "uploads/white_sneakers.jpg", "description": "Minimalist leather sneakers with rubber sole", "rating": 4.7, "reviews": 456 }
				]
			},
			{
				"id": "store_6", "name": "Outerwear", "category": "outerwear",
				"items": [
					{ "id": "p31", "name": "Cashmere Overcoat", "price": 99999, "description": "Full-length cashmere-wool blend overcoat in camel", "rating": 4.9, "reviews": 178 },
					{ "id": "p32", "name": "Leather Bomber Jacket", "price": 74999, "image": "uploads/leather_bomber_jacket.jpg", "description": "Lambskin leather bomber with ribbed cuffs", "rating": 4.8, "reviews": 256 },
					{ "id": "p33", "name": "Quilted Field Jacket", "price": 42999, "image": "uploads/quilted_field_jacket.jpg", "description": "Diamond-quilted jacket with corduroy collar", "rating": 4.7, "reviews": 312 },
					{ "id": "p34", "name": "Wool Peacoat Navy", "price": 54999, "image": "uploads/wool_peacoat_navy.jpg", "description": "Classic double-breasted peacoat in navy wool", "rating": 4.8, "reviews": 189 },
					{ "id": "p35", "name": "Trench Coat Beige", "price": 47999, "description": "Water-repellent trench with belt and epaulettes", "rating": 4.6, "reviews": 234 },
					{ "id": "p36", "name": "Shearling Aviator Jacket", "price": 84999, "description": "Genuine shearling-lined aviator in dark brown", "rating": 4.9, "reviews": 145 }
				]
			},
			{
				"id": "store_7", "name": "Accessories", "category": "accessories",
				"items": [
					{ "id": "p37", "name": "Designer Sunglasses UV", "price": 29999, "image": "uploads/designer_sunglasses.jpg", "description": "Polarized acetate frames with UV400 protection", "rating": 4.8, "reviews": 156 },
					{ "id": "p38", "name": "Italian Leather Belt", "price": 14999, "image": "uploads/italian_leather_belt.jpg", "description": "Full-grain leather belt with brushed silver buckle", "rating": 4.7, "reviews": 423 },
					{ "id": "p39", "name": "Silk Pocket Square Set", "price": 9999, "description": "Set of 4 premium silk pocket squares", "rating": 4.6, "reviews": 187 },
					{ "id": "p40", "name": "Cashmere Scarf Grey", "price": 19999, "description": "100% cashmere scarf in heather grey", "rating": 4.8, "reviews": 234 },
					{ "id": "p41", "name": "Leather Card Holder", "price": 11999, "image": "uploads/leather_card_holder.jpg", "description": "Slim RFID-blocking cardholder in Italian leather", "rating": 4.7, "reviews": 345 },
					{ "id": "p42", "name": "Gold Cufflinks Set", "price": 24999, "image": "uploads/gold.webp", "description": "18k gold-plated cufflinks with onyx inlay", "rating": 4.9, "reviews": 167 },
					{ "id": "p43", "name": "Leather Briefcase", "price": 54999, "image": "uploads/leather_briefcase.jpg", "description": "Full-grain leather briefcase with laptop compartment", "rating": 4.8, "reviews": 198 },
					{ "id": "p44", "name": "Premium Tie Collection", "price": 12999, "image": "uploads/3_fold_tie_grande.webp", "description": "Hand-woven silk tie in classic patterns", "rating": 4.6, "reviews": 278 }
				]
			},
			{
				"id": "store_8", "name": "Knitwear", "category": "knitwear",
				"items": [
					{ "id": "p45", "name": "Merino Wool V-Neck", "price": 17999, "description": "Extra-fine merino wool sweater, lightweight", "rating": 4.7, "reviews": 234 },
					{ "id": "p46", "name": "Cashmere Crewneck", "price": 32999, "description": "Pure cashmere crewneck in charcoal grey", "rating": 4.9, "reviews": 189 },
					{ "id": "p47", "name": "Cable-Knit Turtleneck", "price": 22999, "description": "Chunky cable-knit in cream wool blend", "rating": 4.6, "reviews": 167 },
					{ "id": "p48", "name": "Cardigan Zip-Front", "price": 24999, "description": "Full-zip cardigan in brushed cotton", "rating": 4.7, "reviews": 145 },
					{ "id": "p49", "name": "Ribbed Mock Neck", "price": 15999, "image": "uploads/ribbed_mock_neck.jpg", "description": "Modern ribbed mock-neck pullover in navy", "rating": 4.5, "reviews": 198 },
					{ "id": "p50", "name": "Lambswool Sweater Vest", "price": 13999, "image": "uploads/lambswool_sweater_vest.jpg", "description": "Classic V-neck vest in lambswool, layering piece", "rating": 4.6, "reviews": 123 }
				]
			},
			{
				"id": "store_9", "name": "Grooming", "category": "grooming",
				"items": [
					{ "id": "p51", "name": "Luxury Cologne Set", "price": 27999, "image": "uploads/luxury_cologne_set.jpg", "description": "Trio of artisan fragrances, woody & citrus notes", "rating": 4.8, "reviews": 412 },
					{ "id": "p52", "name": "Premium Shaving Kit", "price": 15999, "image": "uploads/premium_shaving_kit.jpg", "description": "Safety razor, badger brush & sandalwood cream", "rating": 4.7, "reviews": 287 },
					{ "id": "p53", "name": "Beard Oil Collection", "price": 8999, "image": "uploads/beard_oil_collection.jpg", "description": "Organic beard oils in cedarwood & bergamot", "rating": 4.6, "reviews": 345 },
					{ "id": "p54", "name": "Face Serum Anti-Aging", "price": 12999, "image": "uploads/retinolSerum2.webp", "description": "Retinol & vitamin C serum for men", "rating": 4.5, "reviews": 198 },
					{ "id": "p55", "name": "Hair Pomade Matte", "price": 4999, "description": "Strong hold matte finish pomade, natural", "rating": 4.7, "reviews": 456 },
					{ "id": "p56", "name": "Travel Grooming Set", "price": 21999, "image": "uploads/travel_grooming_set.jpg", "description": "Leather case with full grooming essentials", "rating": 4.8, "reviews": 167 }
				]
			},
			{
				"id": "store_10", "name": "Bags & Luggage", "category": "bags-luggage",
				"items": [
					{ "id": "p57", "name": "Leather Weekender Bag", "price": 49999, "image": "uploads/leather_weekender_bag.jpg", "description": "Full-grain leather duffle for weekend getaways", "rating": 4.9, "reviews": 234 },
					{ "id": "p58", "name": "Canvas Backpack", "price": 24999, "image": "uploads/canvas_backpack.jpg", "description": "Waxed canvas backpack with leather trim", "rating": 4.7, "reviews": 312 },
					{ "id": "p59", "name": "Hardshell Carry-On", "price": 37999, "image": "uploads/hardshell_carryon.jpg", "description": "Lightweight polycarbonate carry-on with spinner wheels", "rating": 4.8, "reviews": 278 },
					{ "id": "p60", "name": "Messenger Bag Leather", "price": 32999, "image": "uploads/messenger_bag.jpg", "description": "Crossbody messenger in distressed leather", "rating": 4.6, "reviews": 189 },
					{ "id": "p61", "name": "Garment Travel Bag", "price": 27999, "image": "uploads/garment_travel_bag.jpg", "description": "Folding garment bag for suit travel", "rating": 4.7, "reviews": 145 },
					{ "id": "p62", "name": "Laptop Sleeve Premium", "price": 11999, "image": "uploads/laptop_sleeve.jpg", "description": "Padded leather laptop sleeve fits 13-15 inch", "rating": 4.5, "reviews": 367 }
				]
			}
		]
	};

	function formatCurrency(n) {
		return '₹' + Math.round(n);
	}

	function escapeHtml(s) {
		return (s || '').replace(/[&<>"']/g, c => ({
			'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
		})[c]);
	}

	function generateStars(rating) {
		const filled = Math.floor(rating);
		const empty = 5 - filled;
		return '⭐'.repeat(filled) + '☆'.repeat(empty);
	}

	// Load menu data from localStorage (admin changes) or use embedded data
	// Version check: clear stale cache if menu structure changed
	const MENU_VERSION = 'premium_inr_v4';
	const storedVersion = localStorage.getItem('shoclub_menu_version') || '';
	// Preserve admin edits: versions starting with 'admin_edit_' are valid
	if (storedVersion !== MENU_VERSION && !storedVersion.startsWith('admin_edit_')) {
		localStorage.removeItem('shoclub_menu');
		localStorage.setItem('shoclub_menu_version', MENU_VERSION);
	}
	let activeMenuData = menuData;
	function loadMenuDataFromStorage() {
		try {
			const stored = localStorage.getItem('shoclub_menu');
			if (stored) {
				activeMenuData = JSON.parse(stored);
				// Normalize keys: store→name, products→items
				if (activeMenuData && activeMenuData.stores) {
					activeMenuData.stores.forEach((store, idx) => {
						if (!store.name && store.store) store.name = store.store;
						if (!store.id) store.id = 'store_' + (idx + 1);
						if (store.products && !store.items) {
							store.items = store.products;
							delete store.products;
						}
						if (!store.items) store.items = [];
					});
				}
				console.log('Loaded menu data from localStorage (admin changes)');
				return true;
			}
		} catch (e) {
			console.log('Could not load menu from localStorage: ' + e);
		}
		activeMenuData = menuData;
		return false;
	}

	// Load product images from localStorage (saved in admin mode)
	function loadStoredProductImages() {
		// Support both admin structure (store.products) and embedded structure (store.items)
		activeMenuData.stores.forEach((store, storeIdx) => {
			const items = store.items || store.products || [];
			items.forEach((item, itemIdx) => {
				const imageKey = 'shoclub_product_image_' + storeIdx + '_' + itemIdx;
				try {
					const storedImage = localStorage.getItem(imageKey);
					if (storedImage) {
						item.image = storedImage;
						console.log('Loaded product image from localStorage: ' + imageKey);
					}
				} catch (e) {
					console.log('Could not load image from localStorage: ' + e);
				}
			});
		});
	}

	// Load products from menu data (either localStorage or embedded)
	function loadProducts() {
		// Sync from window so external callers (nav panel) can update the filter
		if ('categoryPageFilter' in window) {
			categoryPageFilter = window.categoryPageFilter;
		}
		console.log('=== loadProducts() called ===');
		console.log('categoryPageFilter value:', categoryPageFilter);
		console.log('typeof categoryPageFilter:', typeof categoryPageFilter);

		allProducts = [];
		activeMenuData.stores.forEach((store, storeIdx) => {
			// Support both admin structure (store.products) and embedded structure (store.items)
			const items = store.items || store.products || [];
			const storeName = store.name || store.store || 'Store';
			console.log(`  Store ${storeIdx}: "${storeName}"`);

			items.forEach((item, itemIdx) => {
				// Ensure each product has a stable id so Add to Cart can find it
				if (!item.id) {
					item.id = `prod_${storeIdx}_${itemIdx}_${Math.random().toString(36).slice(2, 8)}`;
				}
				allProducts.push({
					id: item.id,
					name: item.name,
					price: item.price,
					description: item.description,
					category: store.category,
					categoryName: storeName,
					rating: item.rating || 4,
					reviews: item.reviews || 0,
					image: item.image || null
				});
			});
		});

		console.log('Total allProducts loaded:', allProducts.length);
		console.log('All unique categoryNames in data:', [...new Set(allProducts.map(p => p.categoryName))]);

		// Persist any generated ids back to localStorage so they remain stable
		try {
			localStorage.setItem('shoclub_menu', JSON.stringify(activeMenuData));
			console.log('Saved menu to localStorage');
		} catch (e) {
			// ignore storage errors
		}

		// Apply category filter if on category page (categoryPageFilter is set in HTML before scripts.js loads)
		if (typeof categoryPageFilter !== 'undefined' && categoryPageFilter) {
			console.log('=== CATEGORY PAGE MODE ===');
			console.log('categoryPageFilter:', JSON.stringify(categoryPageFilter));
			console.log('  Type:', typeof categoryPageFilter);
			console.log('  Length:', categoryPageFilter.length);
			console.log('  Equals "All"?', categoryPageFilter === 'All');

			const beforeCount = allProducts.length;

			if (categoryPageFilter === 'All') {
				filteredProducts = [...allProducts];
				console.log('Filter is "All" - showing all products');
			} else {
				// Debug: show what we're matching
				console.log(`Filtering for categoryName === "${categoryPageFilter}"`);
				const testMatches = allProducts.filter(p => {
					const matches = p.categoryName === categoryPageFilter;
					return matches;
				});
				console.log(`  Test: Found ${testMatches.length} matches`);

				filteredProducts = allProducts.filter(p => p.categoryName === categoryPageFilter);
			}

			console.log(`✓ Filtered from ${beforeCount} total products to ${filteredProducts.length} products`);
			if (filteredProducts.length > 0) {
				console.log('✓ First 3 filtered products:', filteredProducts.slice(0, 3).map(p => `${p.name} (${p.categoryName})`));
			} else {
				console.error('⚠️ WARNING: NO products match categoryName = "' + categoryPageFilter + '"');
				console.error('   Available categoryNames:', [...new Set(allProducts.map(p => p.categoryName))]);
			}

			const selectedEl = document.getElementById('selectedCategory');
			if (selectedEl) {
				selectedEl.textContent = categoryPageFilter;
				console.log('Set selectedCategory element to:', categoryPageFilter);
			}
			if (document.getElementById('categoryTitle')) {
				document.getElementById('categoryTitle').textContent = categoryPageFilter;
			}
		} else {
			// Show only 25 AI recommended products on homepage
			console.log('=== HOMEPAGE MODE (25 AI recommendations) ===');
			filteredProducts = allProducts.slice(0, 25);
			console.log('✓ Showing first 25 of', allProducts.length, 'total products');
			console.log('✓ Categories in these 25:', [...new Set(filteredProducts.map(p => p.categoryName))]);
			if (document.getElementById('selectedCategory')) {
				document.getElementById('selectedCategory').textContent = 'AI Recommendation';
			}
		}

		renderProducts();
		renderCategoryNav();
	}
	// Expose for external callers (nav panel category filter)
	window.loadProducts = loadProducts;

	function renderCategoryNav() {
		const navContainer = document.getElementById('categoryNav');
		const dropdownContainer = document.getElementById('categoryDropdown');
		const dropdownBtn = document.getElementById('categoryMenuBtn');
		if (!dropdownContainer) return;

		const categories = ['All', ...new Set(allProducts.map(p => p.categoryName))];

		// Populate dropdown menu with all categories
		dropdownContainer.innerHTML = categories.map(cat =>
			`<button class="category-dropdown-item" data-category="${cat}">${cat}</button>`
		).join('');

		dropdownContainer.querySelectorAll('.category-dropdown-item').forEach(item => {
			item.addEventListener('click', selectCategory);
		});

		// Toggle dropdown button
		if (dropdownBtn) {
			dropdownBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				dropdownContainer?.classList.toggle('hidden');
			});
		}

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (dropdownContainer && !dropdownContainer.contains(e.target) && dropdownBtn && !dropdownBtn.contains(e.target)) {
				dropdownContainer.classList.add('hidden');
			}
		});

		function selectCategory(e) {
			const btn = e.target.closest('[data-category]');
			if (!btn) return;

			const category = btn.dataset.category;

			// Close dropdown
			if (dropdownContainer) dropdownContainer.classList.add('hidden');

			// Map category names to their HTML pages
			const categoryPages = {
				'Suits & Blazers': 'category.html?category=Suits+%26+Blazers',
				'Dress Shirts': 'category.html?category=Dress+Shirts',
				'Denim & Trousers': 'category.html?category=Denim+%26+Trousers',
				'Watches': 'category.html?category=Watches',
				'Footwear': 'category.html?category=Footwear',
				'Outerwear': 'category.html?category=Outerwear',
				'Accessories': 'category.html?category=Accessories',
				'Knitwear': 'category.html?category=Knitwear',
				'Grooming': 'category.html?category=Grooming',
				'Bags & Luggage': 'category.html?category=Bags+%26+Luggage'
			};

			// Navigate to category page or category.html as fallback
			const page = categoryPages[category] || 'category.html?category=' + encodeURIComponent(category);
			window.location.href = page;
		}
	}

	function renderProducts() {
		const grid = document.getElementById('productGrid');
		if (!grid) return;

		if (filteredProducts.length === 0) {
			grid.innerHTML = '<div class="no-products">No products found</div>';
			return;
		}

		grid.innerHTML = filteredProducts.map(product => `
			<div class="product-card" data-id="${product.id}">
				<div class="product-image">
					<span class="img-indicator">1/1</span>
					${product.image ? `<img src="${product.image}" alt="${escapeHtml(product.name)}">` : '<div class="image-placeholder">📦</div>'}
				</div>
				<div class="product-info">
					<h3 class="product-name">${escapeHtml(product.name)}</h3>
					<div class="product-rating">
						<span class="stars">${generateStars(product.rating)}</span>
						<span class="reviews">(${product.reviews})</span>
					</div>
					<div class="product-price">${formatCurrency(product.price)}</div>
					<p class="product-desc">${escapeHtml(product.description)}</p>
					<button class="btn-primary add-to-cart-btn" data-id="${product.id}">Add to Bag</button>
				</div>
			</div>
		`).join('');

		// Open detail unless add-to-cart button was clicked
		grid.querySelectorAll('.product-card').forEach(card => {
			card.addEventListener('click', (e) => {
				if (!e.target.closest('.add-to-cart-btn')) {
					openProductDetail(card.dataset.id);
				}
			});
		});
	}

	// Event delegation for Add to Cart buttons (single reliable method)
	const productGridEl = document.getElementById('productGrid');
	if (productGridEl) {
		productGridEl.addEventListener('click', (e) => {
			try {
				const btn = e.target.closest('.add-to-cart-btn');
				if (!btn) return;
				e.stopPropagation();
				const id = btn.dataset.id;
				console.debug('Add-to-cart clicked, id=', id);
				if (!id) return;
				const product = allProducts.find(p => p.id === id);
				if (product) {
					console.debug('Found product for addToCart:', product.name);
					addToCart(product);
				} else {
					console.warn('Product not found for id', id);
				}
			} catch (err) {
				console.error('Error in productGrid click handler', err);
			}
		});
	}

	// Global helper for inline onclick
	window.addToCartById = function (id) {
		try {
			console.debug('addToCartById called for', id);
			const product = allProducts.find(p => p.id === id);
			if (product) addToCart(product);
			else console.warn('addToCartById: product not found', id);
		} catch (err) {
			console.error('Error in addToCartById', err);
		}
	};

	function applyFilters() {
		let filtered = [...filteredProducts];

		const maxPrice = parseInt(document.getElementById('priceFilter')?.value || 200000);
		filtered = filtered.filter(p => p.price <= maxPrice);

		const ratingCheckbox = document.querySelector('.rating-filter:checked');
		if (ratingCheckbox) {
			const minRating = parseInt(ratingCheckbox.value);
			filtered = filtered.filter(p => p.rating >= minRating);
		}

		filteredProducts = filtered;

		const sortBy = document.getElementById('sortBy')?.value || 'price-low';
		switch (sortBy) {
			case 'price-low':
				filteredProducts.sort((a, b) => a.price - b.price);
				break;
			case 'price-high':
				filteredProducts.sort((a, b) => b.price - a.price);
				break;
			case 'rating':
				filteredProducts.sort((a, b) => b.rating - a.rating);
				break;
		}

		renderProducts();
	}

	document.getElementById('priceFilter')?.addEventListener('change', (e) => {
		document.getElementById('priceLabel').textContent = formatCurrency(e.target.value);
		applyFilters();
	});

	document.querySelectorAll('.rating-filter').forEach(checkbox => {
		checkbox.addEventListener('change', applyFilters);
	});

	document.getElementById('sortBy')?.addEventListener('change', applyFilters);

	function openProductDetail(productId) {
		currentProduct = allProducts.find(p => p.id === productId);
		if (!currentProduct) return;

		const catEl = document.getElementById('detailCategory');
		if (catEl) catEl.textContent = 'SHOP / ' + (currentProduct.categoryName ? currentProduct.categoryName.toUpperCase().replace(/\s+/g, ' ') : 'ALL');
		document.getElementById('detailName').textContent = currentProduct.name;
		document.getElementById('detailRating').textContent = generateStars(currentProduct.rating);
		document.getElementById('detailReviews').textContent = currentProduct.reviews ? `(${currentProduct.reviews} reviews)` : '';
		document.getElementById('detailPrice').textContent = formatCurrency(currentProduct.price);
		document.getElementById('detailDescription').textContent = currentProduct.description || '';

		if (currentProduct.image) {
			document.getElementById('detailImage').src = currentProduct.image;
			document.getElementById('detailImage').classList.remove('hidden');
			document.getElementById('detailImagePlaceholder').classList.add('hidden');
		} else {
			document.getElementById('detailImage').classList.add('hidden');
			document.getElementById('detailImagePlaceholder').classList.remove('hidden');
		}

		document.getElementById('productDetailModal').classList.remove('hidden');
	}

	document.getElementById('productDetailModal')?.addEventListener('click', (e) => {
		if (e.target.id === 'productDetailModal' || e.target.classList.contains('modal-close')) {
			document.getElementById('productDetailModal').classList.add('hidden');
		}
	});

	// Add to cart button - attach listener only once
	const addToCartBtn = document.getElementById('addToCartBtn');
	if (addToCartBtn && !addToCartBtn._listenerAttached) {
		addToCartBtn.addEventListener('click', () => {
			if (currentProduct) {
				addToCart(currentProduct);
				document.getElementById('productDetailModal').classList.add('hidden');
			}
		});
		addToCartBtn._listenerAttached = true;
	}

	function addToCart(product) {
		try {
			console.debug('addToCart called for', product && product.id);
			const existing = cart.items.find(i => i.id === product.id);
			if (existing) {
				existing.qty++;
			} else {
				cart.items.push({
					id: product.id,
					name: product.name,
					price: product.price,
					qty: 1
				});
			}
			updateCartUI();
			showNotification('Added to cart!');
		} catch (err) {
			console.error('Error in addToCart:', err, product);
			alert('Unable to add to cart (see console).');
		}
	}

	function removeFromCart(productId) {
		cart.items = cart.items.filter(i => i.id !== productId);
		updateCartUI();
	}

	function changeQty(productId, delta) {
		const item = cart.items.find(i => i.id === productId);
		if (!item) return;
		item.qty = Math.max(0, item.qty + delta);
		if (item.qty === 0) removeFromCart(productId);
		else updateCartUI();
	}

	function calculateTotals() {
		const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
		const tax = subtotal * TAX_RATE;
		const total = subtotal + tax;
		return { subtotal, tax, total };
	}

	function updateCartUI() {
		const cartList = document.getElementById('cartList');
		const cartBadge = document.getElementById('cart-badge');
		const cartTotal = document.getElementById('cartTotal');

		const totalCount = cart.items.reduce((s, i) => s + i.qty, 0);
		if (cartBadge) cartBadge.textContent = totalCount;

		if (cartList) {
			if (cart.items.length === 0) {
				cartList.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
			} else {
				cartList.innerHTML = cart.items.map(item => `
					<div class="cart-item">
						<div class="cart-item-info">
							<h4>${escapeHtml(item.name)}</h4>
							<div class="cart-item-price">${formatCurrency(item.price)} × ${item.qty}</div>
						</div>
						<div class="cart-item-actions">
							<button class="qty-btn qty-dec" data-id="${item.id}">−</button>
							<span class="qty">${item.qty}</span>
							<button class="qty-btn qty-inc" data-id="${item.id}">+</button>
							<button class="remove-btn" data-id="${item.id}">🗑️</button>
						</div>
					</div>
				`).join('');

				cartList.querySelectorAll('.qty-dec').forEach(btn => {
					btn.addEventListener('click', () => changeQty(btn.dataset.id, -1));
				});
				cartList.querySelectorAll('.qty-inc').forEach(btn => {
					btn.addEventListener('click', () => changeQty(btn.dataset.id, 1));
				});
				cartList.querySelectorAll('.remove-btn').forEach(btn => {
					btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
				});
			}
		}

		if (cartTotal) {
			const totals = calculateTotals();
			cartTotal.textContent = formatCurrency(totals.total);
		}
	}

	function showNotification(message) {
		const notification = document.createElement('div');
		notification.className = 'notification';
		notification.textContent = message;
		document.body.appendChild(notification);
		setTimeout(() => notification.remove(), 2000);
	}

	// Ensure all header cart icons open the cart sidebar (some pages may have different header markup)
	document.querySelectorAll('#cart-toggle').forEach(el => {
		el.addEventListener('click', (e) => {
			e.stopPropagation();
			document.getElementById('cartSidebar').classList.remove('hidden');
		});
	});

	document.getElementById('cartClose')?.addEventListener('click', () => {
		document.getElementById('cartSidebar').classList.add('hidden');
	});

	document.getElementById('checkoutBtn')?.addEventListener('click', () => {
		if (cart.items.length === 0) {
			alert('Your cart is empty');
			return;
		}
		showPaymentModal();
	});

	function processCheckout(method = 'online', meta = {}) {
		const totals = calculateTotals();
		const now = new Date();
		const paymentId = 'PAY-' + Date.now();
		let userEmail = 'N/A';
		let userPhone = 'N/A';
		let userName = 'N/A';
		const loggedInUser = localStorage.getItem('shopHubLoggedIn');
		if (loggedInUser) {
			try {
				const user = JSON.parse(loggedInUser);
				userEmail = user.email || 'N/A';
				userPhone = user.phone || 'N/A';
				userName = user.username || user.name || userEmail || userPhone || 'N/A';
				if (user.email) {
					fetch('/send_otp', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							email: user.email,
							otp: paymentId
						})
					}).catch(e => console.log('Email notification sent'));
				}
			} catch (e) { console.log('Could not send email'); }
		}

		// Payment object for main app
		const payment = {
			id: paymentId,
			timestamp: now.toLocaleString(),
			items: cart.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
			subtotal: totals.subtotal,
			tax: totals.tax,
			total: totals.total,
			status: 'Completed',
			method: method,
			meta: meta
		};

		// Payment object for admin panel
		const adminPayment = {
			id: paymentId,
			user: userEmail !== 'N/A' ? userEmail : userName,
			amount: totals.total,
			date: now.toISOString(),
			status: 'Completed',
			method: method,
			meta: meta
		};

		// Order object for admin panel
		const adminOrder = {
			id: paymentId,
			user: userEmail !== 'N/A' ? userEmail : userName,
			items: cart.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
			total: totals.total,
			date: now.toISOString(),
			status: 'Completed'
		};

		// Save to main app keys
		let payments = JSON.parse(localStorage.getItem('payments') || '[]');
		payments.push(payment);
		localStorage.setItem('payments', JSON.stringify(payments));

		let orders = JSON.parse(localStorage.getItem('orders') || '[]');
		orders.push(payment);
		localStorage.setItem('orders', JSON.stringify(orders));

		// Save to admin panel keys
		let shoclub_payments = JSON.parse(localStorage.getItem('shoclub_payments') || '[]');
		shoclub_payments.push(adminPayment);
		localStorage.setItem('shoclub_payments', JSON.stringify(shoclub_payments));

		let shoclub_orders = JSON.parse(localStorage.getItem('shoclub_orders') || '[]');
		shoclub_orders.push(adminOrder);
		localStorage.setItem('shoclub_orders', JSON.stringify(shoclub_orders));

		// Generate invoice
		const container = document.getElementById('printInvoice');
		if (!container) {
			const div = document.createElement('div');
			div.id = 'printInvoice';
			div.className = 'hidden';
			document.body.appendChild(div);
		}
		const invoiceEl = document.getElementById('printInvoice');
		const itemsHtml = cart.items.map(i => `
			<tr>
				<td>${escapeHtml(i.name)}</td>
				<td style="text-align:right">${i.qty}</td>
				<td style="text-align:right">${formatCurrency(i.price)}</td>
				<td style="text-align:right">${formatCurrency(i.price * i.qty)}</td>
			</tr>
		`).join('');

		invoiceEl.innerHTML = `
			<div class="invoice luxury-invoice-print" style="padding:36px 32px 32px 32px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#181c2b;color:#f8f6f0;width:100%;max-width:600px;margin:auto;border-radius:18px;border:2.5px solid #d4af37;box-shadow:0 8px 32px 0 rgba(212,175,55,0.13);">
				<h2 style="margin-top:0;color:#d4af37;font-size:2.1em;letter-spacing:0.5px;font-weight:800;text-shadow:0 2px 8px #10152233;">&#129689; ShopHub — Invoice</h2>
				<div style="font-size:1em;color:#bfa76a;margin-bottom:8px;font-weight:500;">Payment ID: <span style='color:#fff;'>${payment.id}</span></div>
				<div style="font-size:1em;color:#bfa76a;margin-bottom:18px;font-weight:500;">Date: <span style='color:#fff;'>${payment.timestamp}</span></div>
				<table style="width:100%;border-collapse:collapse;margin:18px 0 10px 0;background:#101522;border-radius:12px;overflow:hidden;">
					<thead>
						<tr style="border-bottom:2.5px solid #d4af37;background:#181c2b;">
							<th style="text-align:left;padding:12px 8px;color:#d4af37;font-size:1.08em;font-weight:700;">Item</th>
							<th style="text-align:right;padding:12px 8px;color:#d4af37;font-size:1.08em;font-weight:700;">Qty</th>
							<th style="text-align:right;padding:12px 8px;color:#d4af37;font-size:1.08em;font-weight:700;">Price</th>
							<th style="text-align:right;padding:12px 8px;color:#d4af37;font-size:1.08em;font-weight:700;">Total</th>
						</tr>
					</thead>
					<tbody>
						${itemsHtml}
					</tbody>
					<tfoot style="border-top:2.5px solid #d4af37;">
						<tr>
							<td colspan="3" style="text-align:right;padding:10px 8px;color:#bfa76a;font-weight:600;">Subtotal:</td>
							<td style="text-align:right;padding:10px 8px;color:#fff;font-weight:600;">${formatCurrency(totals.subtotal)}</td>
						</tr>
						<tr>
							<td colspan="3" style="text-align:right;padding:10px 8px;color:#bfa76a;font-weight:600;">Tax (5%):</td>
							<td style="text-align:right;padding:10px 8px;color:#fff;font-weight:600;">${formatCurrency(totals.tax)}</td>
						</tr>
						<tr style="border-top:2.5px solid #d4af37;border-bottom:2.5px solid #d4af37;">
							<td colspan="3" style="text-align:right;padding:14px 8px;color:#d4af37;font-weight:800;font-size:1.18em;background:#181c2b;">Grand Total:</td>
							<td style="text-align:right;padding:14px 8px;color:#fff;font-weight:800;font-size:1.18em;background:#181c2b;">${formatCurrency(totals.total)}</td>
						</tr>
					</tfoot>
				</table>
				<div style="margin-top:24px;font-size:1em;color:#d4af37;text-align:center;font-weight:600;">&#10003; Payment Successful</div>
				<div style="margin-top:10px;font-size:0.98em;color:#bfa76a;text-align:center;">Thank you for shopping at <span style='color:#d4af37;font-weight:700;'>ShopHub</span>!</div>
			</div>
		`;

		invoiceEl.classList.add('hidden');

		// Show processing animation
		showPaymentProcessing(paymentId, totals.total, function () {
			cart.items = [];
			updateCartUI();
			document.getElementById('cartSidebar')?.classList.add('hidden');
			invoiceEl.classList.remove('hidden');
			window.print();
			invoiceEl.classList.add('hidden');
		});
	}

	// ═══════════════════════════════════════════════════════════════════
	//  PAYMENT MODAL — Dynamic injection system
	// ═══════════════════════════════════════════════════════════════════

	let _pmActiveTab = 'card';

	function getPaymentModalHTML() {
		return `
		<div class="pm-container">
			<div class="pm-header">
				<div>
					<h3>Secure Checkout</h3>
					<p class="pm-subtitle">🔒 All transactions are encrypted</p>
				</div>
				<button class="pm-close" id="pmClose" aria-label="Close">✕</button>
			</div>
			<div class="pm-summary">
				<span class="pm-label">Order Total</span>
				<span class="pm-amount" id="pmTotal">₹0.00</span>
			</div>
			<div class="pm-tabs">
				<button class="pm-tab active" data-method="card">💳 Card</button>
				<button class="pm-tab" data-method="qr">📱 UPI / QR</button>
				<button class="pm-tab" data-method="cod">🚚 COD</button>
			</div>
			<div class="pm-body">
				<!-- Card -->
				<div class="pm-panel active" id="pmPanel-card">
					<div class="pm-card-brands">
						<span class="pm-brand visa">VISA</span>
						<span class="pm-brand mc">MC</span>
						<span class="pm-brand amex">AMEX</span>
						<span class="pm-brand rupay">RUPAY</span>
						<span class="pm-brands-label">Accepted Cards</span>
					</div>
					<div class="pm-field">
						<label>Card Number</label>
						<input id="pmCardNum" class="pm-input card-number" type="text" placeholder="1234  5678  9012  3456" maxlength="19"
							oninput="this.value=this.value.replace(/[^\\d]/g,'').replace(/(.{4})/g,'$1 ').trim()">
					</div>
					<div class="pm-field">
						<label>Cardholder Name</label>
						<input id="pmCardName" class="pm-input" type="text" placeholder="John Doe">
					</div>
					<div class="pm-row">
						<div class="pm-field">
							<label>Expiry</label>
							<input id="pmCardExpiry" class="pm-input" type="text" placeholder="MM / YY" maxlength="7"
								oninput="let v=this.value.replace(/[^\\d]/g,'');if(v.length>=2)v=v.slice(0,2)+' / '+v.slice(2);this.value=v;">
						</div>
						<div class="pm-field">
							<label>CVV</label>
							<input id="pmCardCVV" class="pm-input" type="password" placeholder="•••" maxlength="4"
								oninput="this.value=this.value.replace(/[^\\d]/g,'')">
						</div>
					</div>
				</div>
				<!-- UPI / QR -->
				<div class="pm-panel" id="pmPanel-qr">
					<div class="pm-qr-area">
						<img id="pmQrImg" src="" alt="QR Code">
						<p class="pm-qr-hint">QR code will appear after you confirm</p>
						<p class="pm-qr-text" id="pmQrText"></p>
					</div>
					<div class="pm-field">
						<label>Or enter UPI ID</label>
						<input id="pmUpiId" class="pm-input" type="text" placeholder="yourname@upi">
					</div>
				</div>
				<!-- COD -->
				<div class="pm-panel" id="pmPanel-cod">
					<div class="pm-cod-info">
						<div class="pm-cod-icon">🚚</div>
						<h4>Cash on Delivery</h4>
						<p>Pay with cash when your order arrives at your doorstep. No advance payment needed.</p>
						<div class="pm-cod-features">
							<p>📦 Delivery in 2-5 business days</p>
							<p>🔄 7-day return policy</p>
							<p>✅ Free shipping over ₹500</p>
						</div>
					</div>
					<div class="pm-field" style="margin-top:16px;">
						<label>Delivery Address</label>
						<textarea id="pmCodAddr" class="pm-input" placeholder="Enter your full delivery address..." rows="3" style="resize:none;"></textarea>
					</div>
				</div>

				<div class="pm-actions">
					<button class="pm-pay-btn" id="pmPayBtn">Pay Now</button>
					<button class="pm-cancel-btn" id="pmCancelBtn">Cancel</button>
				</div>
				<p class="pm-footer-text">🔒 Secured by shopcart · SSL Encrypted · PCI Compliant</p>
			</div>
		</div>`;
	}

	function ensurePaymentModal() {
		let modal = document.getElementById('paymentModalNew');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'paymentModalNew';
			modal.className = 'modal payment-modal';
			modal.innerHTML = getPaymentModalHTML();
			document.body.appendChild(modal);
			wirePaymentModalEvents(modal);
		}
		return modal;
	}

	function wirePaymentModalEvents(modal) {
		// Close buttons
		modal.querySelector('#pmClose')?.addEventListener('click', hidePaymentModal);
		modal.querySelector('#pmCancelBtn')?.addEventListener('click', hidePaymentModal);
		modal.addEventListener('click', (e) => {
			if (e.target === modal) hidePaymentModal();
		});

		// Tab switching
		modal.querySelectorAll('.pm-tab').forEach(tab => {
			tab.addEventListener('click', () => {
				const method = tab.dataset.method;
				_pmActiveTab = method;
				// Update tabs
				modal.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
				tab.classList.add('active');
				// Update panels
				modal.querySelectorAll('.pm-panel').forEach(p => p.classList.remove('active'));
				const panel = modal.querySelector('#pmPanel-' + method);
				if (panel) {
					panel.classList.remove('active');
					// Force reflow for animation
					void panel.offsetWidth;
					panel.classList.add('active');
				}
				// Update button text
				const payBtn = modal.querySelector('#pmPayBtn');
				if (payBtn) payBtn.textContent = method === 'cod' ? 'Place Order' : 'Pay Now';
			});
		});

		// Pay button
		modal.querySelector('#pmPayBtn')?.addEventListener('click', handlePaymentConfirm);
	}

	function showPaymentModal() {
		const modal = ensurePaymentModal();

		// Show order total
		const totals = calculateTotals();
		const totalEl = modal.querySelector('#pmTotal');
		if (totalEl) totalEl.textContent = formatCurrency(totals.total);

		// Reset to card tab
		_pmActiveTab = 'card';
		modal.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
		modal.querySelector('.pm-tab[data-method="card"]')?.classList.add('active');
		modal.querySelectorAll('.pm-panel').forEach(p => p.classList.remove('active'));
		modal.querySelector('#pmPanel-card')?.classList.add('active');

		// Reset form fields
		['pmCardNum', 'pmCardName', 'pmCardExpiry', 'pmCardCVV', 'pmUpiId', 'pmCodAddr'].forEach(id => {
			const el = modal.querySelector('#' + id);
			if (el) el.value = '';
		});

		// Reset QR
		const qrImg = modal.querySelector('#pmQrImg');
		if (qrImg) { qrImg.classList.remove('visible'); qrImg.src = ''; }

		// Reset button text
		const payBtn = modal.querySelector('#pmPayBtn');
		if (payBtn) { payBtn.textContent = 'Pay Now'; payBtn.classList.remove('processing'); }

		// Show
		modal.classList.add('active');
		document.body.style.overflow = 'hidden';
	}

	function hidePaymentModal() {
		const modal = document.getElementById('paymentModalNew');
		if (modal) {
			modal.classList.remove('active');
			document.body.style.overflow = '';
		}
		// Also hide old modal if it exists
		const old = document.getElementById('paymentModal');
		if (old) old.classList.add('hidden');
	}

	function generateQrUrl(paymentObj) {
		try {
			const text = encodeURIComponent(JSON.stringify(paymentObj));
			return `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${text}`;
		} catch (e) {
			return '';
		}
	}

	function handlePaymentConfirm() {
		const modal = document.getElementById('paymentModalNew');
		if (!modal) return;

		if (_pmActiveTab === 'card') {
			const num = modal.querySelector('#pmCardNum')?.value?.replace(/\s/g, '');
			const name = modal.querySelector('#pmCardName')?.value?.trim();
			const expiry = modal.querySelector('#pmCardExpiry')?.value?.trim();
			const cvv = modal.querySelector('#pmCardCVV')?.value?.trim();
			if (!num || num.length < 13) { showNotification('Please enter a valid card number'); return; }
			if (!name) { showNotification('Please enter the cardholder name'); return; }
			if (!expiry || expiry.length < 5) { showNotification('Please enter card expiry date'); return; }
			if (!cvv || cvv.length < 3) { showNotification('Please enter CVV'); return; }
			hidePaymentModal();
			processCheckout('online', { cardLast4: num.slice(-4) });

		} else if (_pmActiveTab === 'qr') {
			const qrImg = modal.querySelector('#pmQrImg');
			if (qrImg && qrImg.classList.contains('visible')) {
				// Second click — finalize
				const qrId = qrImg.dataset.qrId || 'QR-' + Date.now();
				hidePaymentModal();
				processCheckout('qr', { qrId });
			} else {
				// First click — show QR
				const totals = calculateTotals();
				const tmp = { id: 'QR-' + Date.now(), total: totals.total, timestamp: new Date().toISOString() };
				const qrUrl = generateQrUrl(tmp);
				if (qrImg) {
					qrImg.src = qrUrl;
					qrImg.dataset.qrId = tmp.id;
					qrImg.classList.add('visible');
				}
				const qrText = modal.querySelector('#pmQrText');
				if (qrText) qrText.textContent = `Payment ID: ${tmp.id} — ${formatCurrency(tmp.total)}`;
				const payBtn = modal.querySelector('#pmPayBtn');
				if (payBtn) payBtn.textContent = 'I have paid';
			}

		} else {
			// COD
			const address = modal.querySelector('#pmCodAddr')?.value?.trim();
			if (!address) { showNotification('Please enter your delivery address'); return; }
			hidePaymentModal();
			processCheckout('cod', { address });
		}
	}

	// Show processing spinner then success animation
	function showPaymentProcessing(paymentId, total, onComplete) {
		// Processing overlay
		const processing = document.createElement('div');
		processing.className = 'pm-processing-overlay';
		processing.innerHTML = `
			<div class="pm-spinner"></div>
			<p class="pm-processing-text">Processing payment...</p>
		`;
		document.body.appendChild(processing);

		setTimeout(() => {
			processing.remove();

			// Success overlay
			const success = document.createElement('div');
			success.className = 'pm-success-overlay';
			success.innerHTML = `
				<div class="pm-checkmark-circle">
					<svg class="pm-checkmark" viewBox="0 0 36 36">
						<path d="M6 18 L14 26 L30 10" />
					</svg>
				</div>
				<div class="pm-success-title">Payment Successful!</div>
				<div class="pm-success-subtitle">Thank you for your purchase</div>
				<div class="pm-success-id">${paymentId} · ${formatCurrency(total)}</div>
			`;
			document.body.appendChild(success);

			setTimeout(() => {
				success.remove();
				if (onComplete) onComplete();
			}, 2200);
		}, 1500);
	}

	document.getElementById('search')?.addEventListener('input', (e) => {
		const query = (e.target.value || '').toLowerCase().trim();

		// Start with the appropriate base set of products
		let baseProducts = allProducts;
		if (typeof categoryPageFilter !== 'undefined' && categoryPageFilter) {
			// On a category page: only search within that category
			baseProducts = allProducts.filter(p => p.categoryName === categoryPageFilter);
		} else {
			// On homepage: only search within recommended 25 products
			baseProducts = allProducts.slice(0, 25);
		}

		// Filter by search query
		if (!query) {
			filteredProducts = [...baseProducts];
		} else {
			filteredProducts = baseProducts.filter(p =>
				(p.name || '').toLowerCase().includes(query) ||
				(p.description || '').toLowerCase().includes(query)
			);
		}
		renderProducts();
	});

	// Initialize
	// Force clear old localStorage to pick up embedded images
	localStorage.removeItem('shoclub_menu');
	localStorage.removeItem('shoclub_menu_version');
	activeMenuData = menuData;

	// Apply images from embedded menuData to activeMenuData (ensures images always show)
	(function syncEmbeddedImages() {
		const embeddedImageMap = {};
		menuData.stores.forEach(store => {
			(store.items || store.products || []).forEach(item => {
				if (item.image) embeddedImageMap[item.id] = item.image;
			});
		});
		activeMenuData.stores.forEach(store => {
			(store.items || store.products || []).forEach(item => {
				if (!item.image && embeddedImageMap[item.id]) {
					item.image = embeddedImageMap[item.id];
				}
			});
		});
	})();

	loadStoredProductImages();

	// Load products (works on both homepage and category pages)
	loadProducts();

	updateCartUI();
});

// AI Help Functions
function aiHelp(type) {
	const responseBox = document.getElementById('aiResponseBox');
	const responseText = document.getElementById('aiResponse');
	const messageInput = document.getElementById('aiMessageInput');
	let message = '';

	switch (type) {
		case 'recommendations':
			message = '💡 <strong>Top Recommendations for You:</strong><br><br>' +
				'📱 Electronics: Smartwatch (4.6★)<br>' +
				'👕 Fashion: Casual Shirt (4.5★)<br>' +
				'🏠 Home: Pillow Set (4.8★)<br>' +
				'📚 Books: Fiction Novel (4.6★)<br><br>' +
				'<em>Use search or categories to explore more!</em>';
			break;

		case 'bestsellers':
			message = '⭐ <strong>Best Selling Products:</strong><br><br>' +
				'🥇 #1: Pillow Set - 4.8 rating<br>' +
				'🥈 #2: Lehenga - 4.8 rating<br>' +
				'🥉 #3: Gown - 4.8 rating<br>' +
				'🏅 #4: Cooking Book - 4.8 rating<br><br>' +
				'<em>These are customer favorites!</em>';
			break;

		case 'faq':
			message = '❓ <strong>Frequently Asked Questions:</strong><br><br>' +
				'<strong>Q: What\'s the shipping time?</strong><br>' +
				'A: Free delivery above ₹500<br><br>' +
				'<strong>Q: Can I return items?</strong><br>' +
				'A: Yes, 7-day returns policy<br><br>' +
				'<strong>Q: How to track my order?</strong><br>' +
				'A: Check admin panel for order history<br><br>' +
				'<em>More help? Chat with us!</em>';
			break;

		case 'chat':
			messageInput.style.display = 'flex';
			document.getElementById('aiUserMessage').focus();
			return;
	}

	responseText.innerHTML = message;
	responseBox.classList.remove('hidden');
	messageInput.style.display = 'none';
	responseBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function sendAiMessage() {
	const userInput = document.getElementById('aiUserMessage').value.trim();
	if (!userInput) return;

	const responseBox = document.getElementById('aiResponseBox');
	const responseText = document.getElementById('aiResponse');
	const messageInput = document.getElementById('aiMessageInput');

	const message = '💬 <strong>Your Question:</strong><br>' + escapeHtml(userInput) + '<br><br>' +
		'<strong>AI Response:</strong><br>' +
		'Thank you for your question! Our customer support team will help you shortly. ' +
		'For immediate assistance, please contact us via email or check our FAQ section.';

	responseText.innerHTML = message;
	responseBox.classList.remove('hidden');
	messageInput.style.display = 'none';
	document.getElementById('aiUserMessage').value = '';
	responseBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeAiResponse() {
	document.getElementById('aiResponseBox').classList.add('hidden');
	document.getElementById('aiMessageInput').style.display = 'none';
}

// Global escapeHtml fallback (main one is inside DOMContentLoaded scope)
if (typeof window._escapeHtmlDefined === 'undefined') {
	window._escapeHtmlDefined = true;
	window.escapeHtml = function (text) {
		if (!text) return '';
		const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
		return String(text).replace(/[&<>"']/g, m => map[m]);
	};
}

function toggleMenu() {
	const menu = document.getElementById('menu');
	if (menu) {
		menu.classList.toggle('hidden');
	}
}

// AI Chat Function
function openAIChat() {
	const userMessage = prompt('What product are you looking for? (e.g., "Men\'s jacket", "Wireless headphones")');
	if (userMessage && userMessage.trim()) {
		// Search products based on user input
		const searchInput = document.getElementById('search');
		if (searchInput) {
			searchInput.value = userMessage;
			// Trigger search
			const searchBtn = document.getElementById('searchBtn');
			if (searchBtn) {
				searchBtn.click();
			}
		}
		alert(`🤖 shopcart AI: Great choice! I found products related to "${userMessage}". Check the results below!`);
	}
}

