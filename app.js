/* Utility & Auth Functions */
const LS_KEYS = {
  users: "users",
  currentUser: "currentUserEmail",
  productsBySeller: "productsBySeller",
  sellerProfile: (email) => `sellerProfile_${email}`,
  buyerProfile: (email) => `buyerProfile_${email}`,
  cart: (email) => `cart_${email}`,
};
function getUsers() { return JSON.parse(localStorage.getItem(LS_KEYS.users) || "[]"); }
function setUsers(users) { localStorage.setItem(LS_KEYS.users, JSON.stringify(users)); }
function setCurrentUser(email) { localStorage.setItem(LS_KEYS.currentUser, email || ""); }
function getCurrentUserEmail() { return localStorage.getItem(LS_KEYS.currentUser) || ""; }
function getCurrentUser() { const email = getCurrentUserEmail(); return getUsers().find(u => u.email === email) || null; }
function upsertUser(user) { const users = getUsers(); const idx = users.findIndex(u => u.email === user.email); if (idx >= 0) users[idx] = user; else users.push(user); setUsers(users); }

/* Authentication Toggle */
const signUpButton = document.getElementById("signUp");
const signInButton = document.getElementById("signIn");
const authContainer = document.getElementById("authContainer");
signUpButton.addEventListener("click", () => authContainer.classList.add("right-panel-active"));
signInButton.addEventListener("click", () => authContainer.classList.remove("right-panel-active"));

/* Sign Up / Sign In */
document.getElementById("signUpForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("su_name").value.trim();
  const email = document.getElementById("su_email").value.trim().toLowerCase();
  const password = document.getElementById("su_password").value;
  const msg = document.getElementById("signUpMsg");
  msg.textContent = "";
  if (!name || !email || !password) { msg.textContent = "Please fill all fields."; return; }
  const users = getUsers();
  if (users.some(u => u.email === email)) { msg.textContent = "Email already registered."; return; }
  users.push({name,email,password});
  setUsers(users);
  msg.style.color = "#27ae60";
  msg.textContent = "Account created! Please sign in.";
  authContainer.classList.remove("right-panel-active");
});
document.getElementById("signInForm").addEventListener("submit", e => {
  e.preventDefault();
  const email = document.getElementById("si_email").value.trim().toLowerCase();
  const password = document.getElementById("si_password").value;
  const msg = document.getElementById("signInMsg");
  msg.textContent = "";
  const user = getUsers().find(u => u.email === email && u.password === password);
  if (!user) { msg.textContent = "Invalid email or password."; return; }
  setCurrentUser(email);
  startSession();
});

/* Session & Routing */
function hideAuth() {
  document.getElementById("authContainer").style.display = "none";
  document.getElementById("loginFooter").style.display = "none";
  document.getElementById("loginHeading").style.display = "none";
}
function showAuth() {
  document.getElementById("authContainer").style.display = "block";
  document.getElementById("loginFooter").style.display = "block";
  document.getElementById("loginHeading").style.display = "block";
}
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById(id);
  if(el) el.classList.add("active");
  closeMenu("sellerMenuContent");
  closeMenu("buyerMenuContent");
  if(id === "addressPage") loadSavedAddresses();
}
function backToRoleSelection() { showPage("rolePage"); }
function logout() {
  setCurrentUser("");
  showAuth();
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
}

/* Menu toggles */
function toggleMenu(id) {
  const el = document.getElementById(id);
  el.classList.toggle("active");
}
function closeMenu(id) {
  const el = document.getElementById(id);
  if(el) el.classList.remove("active");
}

/* Products storage */
function getProductsBySeller() { return JSON.parse(localStorage.getItem(LS_KEYS.productsBySeller) || "{}"); }
function setProductsBySeller(obj) { localStorage.setItem(LS_KEYS.productsBySeller, JSON.stringify(obj)); }
function getSellerProducts(email) {
  const all = getProductsBySeller();
  return all[email] || [];
}
function setSellerProducts(email, products) {
  const all = getProductsBySeller();
  all[email] = products;
  setProductsBySeller(all);
}
function getAllProducts() {
  const all = getProductsBySeller();
  return Object.values(all).flat();
}

/* Profiles & Cart */
let role = "";
let sellerProfile = null;
let buyerProfile = null;
let currentCategory = "all";

function getCart(email) { return JSON.parse(localStorage.getItem(LS_KEYS.cart(email)) || "[]"); }
function setCart(email, cart) { localStorage.setItem(LS_KEYS.cart(email), JSON.stringify(cart)); }

function viewBuyerOrders() {
  const email = getCurrentUserEmail();
  const orders = JSON.parse(localStorage.getItem(`orders_${email}`)) || [];
  const div = document.getElementById("buyerOrdersList");
  div.innerHTML = "<h3>Your Past Orders</h3>";
  if (orders.length === 0) {
    div.innerHTML += "<p>No orders found.</p>";
    showPage("buyerOrdersPage");
    return;
  }
  const statusStages = ["Order Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"];
  orders.forEach((order, idx) => {
    const currentStageIndex = statusStages.indexOf(order.status);
    let stepperHTML = `<div class=\"order-status-stepper\">`;
    statusStages.forEach((stage, i) => {
      let stepClass = "";
      if (i < currentStageIndex) stepClass = "order-step completed";
      else if (i === currentStageIndex) stepClass = "order-step active";
      else stepClass = "order-step";
      stepperHTML += `<div class=\"${stepClass}\">${stage}</div>`;
    });
    stepperHTML += "</div>";
    div.innerHTML += `
      <div class="card" style="margin-bottom:20px;">
        <b>Order #${idx + 1}</b><br>
        Date: ${new Date(order.timestamp).toLocaleString()}<br>
        ${stepperHTML}
        <div class="delivery-address" style="margin-bottom: 10px; white-space: pre-line;">
          Delivery Address:\n${order.deliveryAddress ?
            `${order.deliveryAddress.recipientName}\n${order.deliveryAddress.streetAddress}\n${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.postalCode}\n${order.deliveryAddress.country}\nPhone: ${order.deliveryAddress.contactPhone}` : 'N/A'}
        </div>
        <b>Items:</b>
        <ul>
          ${order.items.map(item => `<li>${item.name} (${item.type}) - Qty: ${item.qty}</li>`).join('')}
        </ul>
      </div>
    `;
  });
  showPage("buyerOrdersPage");
}

/* Sample demo products seed */
(function seedDemo() {
  const seeded = localStorage.getItem("__seeded_demo_products__");
  if(seeded) return;
  const demoSeller = "demo@seller.com";
  const demoProducts = [
    {name:"Apple",type:"Fruit",qty:100,price:50,location:"NELLORE",image:"https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.jpg"},
    {name:"Banana",type:"Fruit",qty:120,price:30,location:"GUDUR",image:"https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg"},
    {name:"Orange",type:"Fruit",qty:80,price:60,location:"RAPUR",image:"https://upload.wikimedia.org/wikipedia/commons/c/c4/Orange-Fruit-Pieces.jpg"},
    {name:"Carrot",type:"Vegetable",qty:100,price:40,location:"GUDUR",image:"https://upload.wikimedia.org/wikipedia/commons/7/7b/Carrot-Whole-%26-Cut.jpg"},
    {name:"Tomato",type:"Vegetable",qty:100,price:35,location:"NELLORE",image:"https://upload.wikimedia.org/wikipedia/commons/8/88/Bright_red_tomato_and_cross_section02.jpg"},
  ];
  const all = getProductsBySeller();
  all[demoSeller] = demoProducts;
  setProductsBySeller(all);
  localStorage.setItem("__seeded_demo_products__", "1");
})();

/* Session start */
function startSession() {
  hideAuth();
  role = "";
  sellerProfile = null;
  buyerProfile = null;
  showPage("rolePage");
  const email = getCurrentUserEmail();
  document.getElementById("sellerEmail").value = email;
  document.getElementById("buyerEmail").value = email;
}

/* Role selection */
function selectRole(r) {
  role = r;
  const email = getCurrentUserEmail();
  if(role === "seller") {
    loadSellerProfile(email);
    showPage("sellerDetailsPage");
  } else {
    loadBuyerProfile(email);
    showPage("buyerDetailsPage");
  }
}

/* Seller profile */
function loadSellerProfile(email) {
  const saved = localStorage.getItem(LS_KEYS.sellerProfile(email));
  if(saved) {
    sellerProfile = JSON.parse(saved);
    document.getElementById("sellerName").value = sellerProfile.name || "";
    document.getElementById("sellerLocation").value = sellerProfile.location || "";
    document.getElementById("sellerEmail").value = email;
    document.getElementById("sellerImagePreview").innerHTML = sellerProfile.image ? `<img src="${sellerProfile.image}" class="profile-image" alt="Seller Profile" />` : "";
  } else {
    sellerProfile = null;
    document.getElementById("sellerEmail").value = email;
    document.getElementById("sellerImagePreview").innerHTML = "";
  }
}
function submitSellerDetails() {
  const email = getCurrentUserEmail();
  const imageInput = document.getElementById("sellerProfileImage");
  const imageFile = imageInput.files[0];
  const save = (imageData) => {
    sellerProfile = {
      name:document.getElementById("sellerName").value.trim(),
      email,
      location:document.getElementById("sellerLocation").value.trim(),
      image:imageData || "",
    };
    localStorage.setItem(LS_KEYS.sellerProfile(email), JSON.stringify(sellerProfile));
    showPage("sellerHomePage");
    renderSellerProfile();
    renderSellerProducts();
  };
  if(imageFile) {
    const reader = new FileReader();
    reader.onload = (e) => save(e.target.result);
    reader.readAsDataURL(imageFile);
  } else { save(""); }
}
function renderSellerProfile() {
  const div = document.getElementById("sellerProfileDisplay");
  if(!sellerProfile) {
    div.innerHTML = "<p>No profile information available.</p>";
    return;
  }
  div.innerHTML = `
  ${sellerProfile.image ? `<img src="${sellerProfile.image}" class="profile-image" alt="Seller Profile" />` : ""}
  <b>${sellerProfile.name}</b><br>Email: ${sellerProfile.email}<br>Location: ${sellerProfile.location}
  `;
}
// Render seller's products with Edit and Delete buttons
function renderSellerProducts() {
  const email = getCurrentUserEmail();
  const productList = getSellerProducts(email);
  const div = document.getElementById("sellerProducts");
  div.innerHTML = "";
  productList.forEach((p, i) => {
    div.innerHTML += `
      <div class="card product-card" id="sellerProduct_${i}">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-image" />` : ""}
        <b>${p.name}</b><br>
        Type: ${p.type}<br>
        Qty: ${p.qty}, Price: ₹${p.price}, Location: ${p.location}<br>
        <button onclick="showEditProductForm(${i})">Edit</button>
        <button onclick="deleteProduct(${i})">Delete</button>
      </div>`;
  });
}

// Open edit form pre-filled for the selected product index
function showEditProductForm(index) {
  const email = getCurrentUserEmail();
  const products = getSellerProducts(email);
  const product = products[index];
  if (!product) return;

  document.getElementById("productName").value = product.name;
  document.getElementById("productType").value = product.type;
  document.getElementById("productQty").value = product.qty;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productLocation").value = product.location;

  // Store index globally for update on submit
  window.editProductIndex = index;

  showPage("addProductPage");
}

// Add or update product to products list
function addProduct() {
  const email = getCurrentUserEmail();
  const name = document.getElementById("productName").value.trim();
  const type = document.getElementById("productType").value.trim();
  const qty = parseInt(document.getElementById("productQty").value);
  const price = parseFloat(document.getElementById("productPrice").value);
  const location = document.getElementById("productLocation").value.trim();
  const imageInput = document.getElementById("productImage");
  const imageFile = imageInput.files[0];

  if (!name || !type || !qty || qty <= 0 || isNaN(price) || price <= 0 || !location) {
    alert("Please fill all fields correctly");
    return;
  }

  const saveProduct = (imageData) => {
    const newProduct = { name, type, qty, price, location, image: imageData || "" };
    const products = getSellerProducts(email);

    if (typeof window.editProductIndex === "number") {
      // update existing product
      products[window.editProductIndex] = newProduct;
      window.editProductIndex = undefined;
    } else {
      // add new product
      products.push(newProduct);
    }

    setSellerProducts(email, products);
    resetAddProductForm();
    showPage("sellerHomePage");
    renderSellerProducts();
  };

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = (e) => saveProduct(e.target.result);
    reader.readAsDataURL(imageFile);
  } else {
    saveProduct("");
  }
}

// Delete product by index
function deleteProduct(index) {
  if (!confirm("Are you sure you want to delete this product?")) return;
  const email = getCurrentUserEmail();
  const products = getSellerProducts(email);
  if (index < 0 || index >= products.length) return;
  products.splice(index, 1);
  setSellerProducts(email, products);
  renderSellerProducts();
}

// Clear form inputs for add product page
function resetAddProductForm() {
  document.getElementById("productName").value = "";
  document.getElementById("productType").value = "";
  document.getElementById("productQty").value = "";
  document.getElementById("productPrice").value = "";
  document.getElementById("productLocation").value = "";
  document.getElementById("productImage").value = "";
}

/* Buyer profile */
function loadBuyerProfile(email) {
  const saved = localStorage.getItem(LS_KEYS.buyerProfile(email));
  if(saved) {
    buyerProfile = JSON.parse(saved);
    document.getElementById("buyerFirstName").value = buyerProfile.firstName || "";
    document.getElementById("buyerSurname").value = buyerProfile.surname || "";
    document.getElementById("buyerEmail").value = email;
    document.getElementById("buyerLocation").value = buyerProfile.location || "";
    document.getElementById("buyerImagePreview").innerHTML = buyerProfile.image ? `<img src="${buyerProfile.image}" class="profile-image" alt="Buyer Profile" />` : "";
  } else {
    buyerProfile = null;
    document.getElementById("buyerEmail").value = email;
    document.getElementById("buyerImagePreview").innerHTML = "";
  }
}
function submitBuyerDetails() {
  const email = getCurrentUserEmail();
  const imageInput = document.getElementById("buyerProfileImage");
  const imageFile = imageInput.files[0];
  const save = (imageData) => {
    buyerProfile = {
      firstName: document.getElementById("buyerFirstName").value.trim(),
      surname: document.getElementById("buyerSurname").value.trim(),
      email,
      location: document.getElementById("buyerLocation").value.trim(),
      image: imageData || "",
    };
    localStorage.setItem(LS_KEYS.buyerProfile(email), JSON.stringify(buyerProfile));
    showPage("buyerHomePage");
    showCategory("all");
  };
  if(imageFile) {
    const reader = new FileReader();
    reader.onload = (e) => save(e.target.result);
    reader.readAsDataURL(imageFile);
  } else { save(""); }
}

/* Add product (seller) - Original addProduct left for compatibility (kept but not used) */
function addProduct_legacy() {
  const email = getCurrentUserEmail();
  const name = document.getElementById("productName").value.trim();
  const type = document.getElementById("productType").value.trim();
  const qty = parseInt(document.getElementById("productQty").value);
  const price = parseFloat(document.getElementById("productPrice").value);
  const location = document.getElementById("productLocation").value.trim();
  const imageInput = document.getElementById("productImage");
  const imageFile = imageInput.files[0];
  if(!name || !type || !qty || qty <= 0 || isNaN(price) || price <= 0 || !location) {
    alert("Please fill all fields correctly");
    return;
  }
  const saveProduct = (imageData) => {
    const newProduct = {name,type,qty,price,location,image: imageData || ""};
    const list = getSellerProducts(email);
    list.push(newProduct);
    setSellerProducts(email, list);
    resetAddProductForm();
    showPage("sellerHomePage");
    renderSellerProducts();
  };
  if(imageFile) {
    const reader = new FileReader();
    reader.onload = (e) => saveProduct(e.target.result);
    reader.readAsDataURL(imageFile);
  } else { saveProduct(""); }
}

/* Buyer browsing & filtering */
function showCategory(type) {
  currentCategory = type;
  document.querySelectorAll("#categoryFilters button").forEach(btn => {
    const text = btn.textContent.toLowerCase();
    const target = type === "all" ? "all" : type.toLowerCase() + "s";
    btn.classList.toggle("activeCategory", text === target);
  });
  filterProducts();
}
function filterProducts() {
  const query = (document.getElementById("searchInput").value || "").toLowerCase();
  const list = getAllProducts().filter(p => {
    const fitsCat = currentCategory === "all" || (p.type?.toLowerCase() === currentCategory.toLowerCase());
    const fitsQuery = (p.name?.toLowerCase().includes(query) || p.type?.toLowerCase().includes(query));
    return fitsCat && fitsQuery;
  });
  renderProductList(list);
}
function renderProductList(list) {
  const div = document.getElementById("productList");
  div.innerHTML = "";
  list.forEach((p, i) => {
    const typeClass = (p.type || "").toLowerCase() === "fruit" ? "fruit" :
                      (p.type || "").toLowerCase() === "vegetable" ? "vegetable" : "";
    div.innerHTML += `
      <div class="card product-card ${typeClass}" id="productCard_${i}">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-image" />` : ""}
        <b>${p.name}</b><br>
        Type: ${p.type}<br>
        Qty: ${p.qty}, Price: ₹${p.price}, Location: ${p.location}<br>
        <button onclick="addToCartDirect('${p.name}','${p.type}')">Add to Cart</button>
        <button onclick="buyNow('${p.name}','${p.type}')">Buy Now</button>
      </div>`;
  });
}

/* Cart management */
function findProductRef(name, type) {
  const all = getProductsBySeller();
  for(const sellerEmail of Object.keys(all)) {
    const idx = all[sellerEmail].findIndex(x => x.name === name && x.type === type);
    if(idx !== -1) return {sellerEmail, index: idx};
  }
  return null;
}
function addToCartDirect(name, type) {
  const ref = findProductRef(name, type);
  if(!ref) return;
  const prod = getProductsBySeller()[ref.sellerEmail][ref.index];
  const email = getCurrentUserEmail();
  const cart = getCart(email);
  const idx = cart.findIndex(c => c.name === name && c.type === type && c.sellerEmail === ref.sellerEmail);
  if(idx >= 0) {
    if(cart[idx].qty + 1 > prod.qty) return alert("Quantity exceeds available stock");
    cart[idx].qty += 1;
  } else {
    cart.push({...prod, qty: 1, sellerEmail: ref.sellerEmail});
  }
  setCart(email, cart);
  showCartMessage(`${name} added to cart`);
}
function showCartMessage(msg) {
  let div = document.getElementById("cartMessage");
  if(!div) {
    div = document.createElement("div");
    div.id = "cartMessage";
    div.style.position = "fixed";
    div.style.top = "10px";
    div.style.left = "50%";
    div.style.transform = "translateX(-50%)";
    div.style.backgroundColor = "#28a745";
    div.style.color = "#fff";
    div.style.padding = "10px 20px";
    div.style.borderRadius = "5px";
    div.style.zIndex = "10000";
    document.body.appendChild(div);
  }
  div.textContent = msg;
  div.style.display = "block";
  setTimeout(() => div.style.display = "none", 2000);
}
function viewCart() {
  showPage("cartPage");
  const email = getCurrentUserEmail();
  const cart = getCart(email);
  const div = document.getElementById("cartList");
  div.innerHTML = "";
  let total = 0;
  cart.forEach((p,i) => {
    const itemTotal = p.price * p.qty;
    total += itemTotal;
    div.innerHTML += `
      <div class="card">
        <b>${p.name}</b> - ₹${p.price} ×
        <button onclick="updateCartQty(${i}, -1)">-</button>
        ${p.qty}
        <button onclick="updateCartQty(${i}, 1)">+</button>
        = ₹${itemTotal}
        <button style="float:right;" onclick="removeFromCart(${i})">Remove</button>
      </div>`;
  });
  div.innerHTML += `<h3>Total: ₹${total}</h3>`;
}
function updateCartQty(index, delta) {
  const email = getCurrentUserEmail();
  const cart = getCart(email);
  const item = cart[index];
  if(!item) return;
  const sellerProducts = getSellerProducts(item.sellerEmail);
  const product = sellerProducts.find(p => p.name === item.name && p.type === item.type);
  if(!product) return;
  const newQty = item.qty + delta;
  if(newQty <= 0) return alert("Quantity cannot be less than 1");
  if(newQty > product.qty) return alert("Quantity exceeds available stock");
  cart[index].qty = newQty;
  setCart(email, cart);
  viewCart();
}
function removeFromCart(index) {
  const email = getCurrentUserEmail();
  const cart = getCart(email);
  cart.splice(index,1);
  setCart(email,cart);
  viewCart();
}

/* Address page: saved addresses management */
function loadSavedAddresses() {
  const addresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
  const select = document.getElementById('savedAddresses');
  if (!select) return;
  select.innerHTML = `<option value="">-- Select an Address --</option>`;
  addresses.forEach((addr, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${addr.recipientName}, ${addr.streetAddress}, ${addr.city}, ${addr.state}, ${addr.postalCode}, ${addr.country}`;
    select.appendChild(option);
  });
}
function selectSavedAddress() {
  const select = document.getElementById('savedAddresses');
  const index = select.value;
  if(index === "") {
    clearAddressInputs();
    return;
  }
  const addresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
  const addr = addresses[index];
  if(!addr) return;
  document.getElementById('recipientName').value = addr.recipientName;
  document.getElementById('streetAddress').value = addr.streetAddress;
  document.getElementById('city').value = addr.city;
  document.getElementById('state').value = addr.state;
  document.getElementById('postalCode').value = addr.postalCode;
  document.getElementById('country').value = addr.country;
  document.getElementById('contactPhone').value = addr.contactPhone;
}
function clearAddressInputs() {
  ['recipientName','streetAddress','city','state','postalCode','country','contactPhone'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
}
function saveAddressAndContinue() {
  const addr = {
    recipientName : document.getElementById('recipientName').value.trim(),
    streetAddress : document.getElementById('streetAddress').value.trim(),
    city : document.getElementById('city').value.trim(),
    state : document.getElementById('state').value.trim(),
    postalCode : document.getElementById('postalCode').value.trim(),
    country : document.getElementById('country').value.trim(),
    contactPhone : document.getElementById('contactPhone').value.trim()
  };
  if(!addr.recipientName || !addr.streetAddress || !addr.city || !addr.state || !addr.postalCode || !addr.country || !addr.contactPhone) {
    alert("Please fill all address fields.");
    return;
  }
  let addresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
  const duplicate = addresses.find(a => JSON.stringify(a) === JSON.stringify(addr));
  if(!duplicate) {
    addresses.push(addr);
    localStorage.setItem('savedAddresses', JSON.stringify(addresses));
  }
  localStorage.setItem('currentDeliveryAddress', JSON.stringify(addr));
  goToPaymentPage();
}

/* Page Navigation: Address & Payment */
function goToAddressPage() { showPage('addressPage'); }
function goToPaymentPage() {
  showPage('paymentPage');
  const email = getCurrentUserEmail();
  const cart = getCart(email);
  const total = cart.reduce((s, p) => s + p.price * p.qty, 0);
  document.getElementById('orderSummary').innerText = "Total: ₹" + total;
}

/* Completing Order and Live Tracking */
let liveOrderStatusInterval = null;
function completeOrder() {
  const email = getCurrentUserEmail();
  const cart = getCart(email);
  if(cart.length === 0) { alert("Cart is empty."); return; }

  // Reduce stock for sellers
  const all = getProductsBySeller();
  cart.forEach(item => {
    const list = all[item.sellerEmail] || [];
    const idx = list.findIndex(x => x.name === item.name && x.type === item.type);
    if(idx !== -1) {
      list[idx].qty = Math.max(0, list[idx].qty - item.qty);
      all[item.sellerEmail] = list;
    }
  });
  setProductsBySeller(all);

  // Order object with timestamp, status
  const order = {
    items: cart,
    status: "Order Placed",
    timestamp: Date.now(),
    buyerEmail: email,
    deliveryAddress: JSON.parse(localStorage.getItem('currentDeliveryAddress') || '{}'),
  };

  // Save order for sellers
  cart.forEach(item => {
    let sellerOrders = JSON.parse(localStorage.getItem(`orders_${item.sellerEmail}`)) || [];
    sellerOrders.push({
      buyerEmail: email,
      items: [item],
      status: "Order Placed",
      timestamp: Date.now(),
    });
    localStorage.setItem(`orders_${item.sellerEmail}`, JSON.stringify(sellerOrders));
  });

  // Add order to buyer's order history array
  addOrderToBuyerHistory(order);

  setCart(email, []);
  showLiveTracking(order);
}
function addOrderToBuyerHistory(order) {
  const email = getCurrentUserEmail();
  let orders = JSON.parse(localStorage.getItem(`orders_${email}`)) || [];
  orders.push(order);
  localStorage.setItem(`orders_${email}`, JSON.stringify(orders));
}
function showLiveTracking(order) {
  showPage("confirmationPage");
  const page = document.getElementById("confirmationPage");
  page.innerHTML = `<h2>✅ ${order.status}</h2>
                    <div id="trackingItems"></div>
                    <button onclick="showPage('buyerHomePage')">Go Home</button>`;

  const statuses = ["Order Placed", "Processing", "Out for Delivery", "Delivered"];
  let idx = 0;

  if(liveOrderStatusInterval) clearInterval(liveOrderStatusInterval);
  liveOrderStatusInterval = setInterval(() => {
    if(idx < statuses.length) {
      order.status = statuses[idx];
      localStorage.setItem(`orders_${getCurrentUserEmail()}`, JSON.stringify([order]));
      document.querySelector("#confirmationPage h2").textContent = `✅ ${order.status}`;
      idx++;
    } else {
      clearInterval(liveOrderStatusInterval);
    }
  }, 5000);
}

/* Seller Orders & Status */
function viewSellerOrders() {
  const email = getCurrentUserEmail();
  const orders = JSON.parse(localStorage.getItem(`orders_${email}`)) || [];
  const div = document.getElementById("sellerOrdersList");
  div.innerHTML = "<h3>Incoming Orders</h3>";
  if(orders.length === 0) { div.innerHTML += "<p>No orders at this time.</p>"; return; }
  orders.forEach((order,i) => {
    div.innerHTML += `
      <div class="card">
        <b>Order #${i+1}</b><br>
        Buyer Email: ${order.buyerEmail}<br>
        Status: ${order.status}<br>
        Items:<br><ul>${order.items.map(item => `<li>${item.name} (${item.type}) - Qty: ${item.qty}</li>`).join("")}</ul>
        <button onclick="updateSellerOrderStatus(${i}, 'Processing')">Mark Processing</button>
        <button onclick="updateSellerOrderStatus(${i}, 'Out for Delivery')">Mark Out for Delivery</button>
        <button onclick="updateSellerOrderStatus(${i}, 'Delivered')">Mark Delivered</button>
        <hr>
      </div>
    `;
  });
}
function updateSellerOrderStatus(orderIndex, newStatus) {
  const email = getCurrentUserEmail();
  let orders = JSON.parse(localStorage.getItem(`orders_${email}`)) || [];
  if(!orders[orderIndex]) return;
  orders[orderIndex].status = newStatus;
  localStorage.setItem(`orders_${email}`, JSON.stringify(orders));
  // Notify buyer
  const buyerEmail = orders[orderIndex].buyerEmail;
  let buyerOrders = JSON.parse(localStorage.getItem(`orders_${buyerEmail}`)) || [];
  for (let o of buyerOrders) {
    if(o.timestamp === orders[orderIndex].timestamp) { o.status = newStatus; break; }
  }
  localStorage.setItem(`orders_${buyerEmail}`, JSON.stringify(buyerOrders));
  viewSellerOrders();
}

/* Buyer order history view (simple) */
function viewBuyerOrders_simple() {
  const email = getCurrentUserEmail();
  const orders = JSON.parse(localStorage.getItem(`orders_${email}`)) || [];
  const div = document.getElementById("buyerOrdersList");
  div.innerHTML = "<h3>Your Past Orders</h3>";
  if (orders.length === 0) {
    div.innerHTML += "<p>No orders found.</p>";
    showPage("buyerOrdersPage");
    return;
  }
  orders.forEach((order,idx) => {
    div.innerHTML += `
      <div class="card" style="margin-bottom:10px;">
        <b>Order #${idx+1}</b><br>
        Status: ${order.status}<br>
        Date: ${new Date(order.timestamp).toLocaleString()}<br>
        Delivery Address:<br>
        ${order.deliveryAddress ? `
          ${order.deliveryAddress.recipientName},<br>
          ${order.deliveryAddress.streetAddress},<br>
          ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.postalCode}<br>
          ${order.deliveryAddress.country}<br>
          Phone: ${order.deliveryAddress.contactPhone}<br>` : 'N/A'}
        <br>Items:<ul>
          ${order.items.map(item => `<li>${item.name} (${item.type}) - Qty: ${item.qty}</li>`).join("")}
        </ul>
      </div>
    `;
  });
  showPage("buyerOrdersPage");
}

/* Profile display */
function showProfile() {
  const email = getCurrentUserEmail();
  let profileHtml = "";
  if(role === "seller" && sellerProfile) {
    profileHtml += sellerProfile.image ? `<img src="${sellerProfile.image}" class="profile-image" alt="Profile Image" />` : "";
    profileHtml += `<pre>Name: ${sellerProfile.name}
Email: ${sellerProfile.email}
Location: ${sellerProfile.location}</pre>`;
  } else if(role === "buyer" && buyerProfile) {
    profileHtml += buyerProfile.image ? `<img src="${buyerProfile.image}" class="profile-image" alt="Profile Image" />` : "";
    profileHtml += `<pre>First Name: ${buyerProfile.firstName}
Surname: ${buyerProfile.surname}
Email: ${buyerProfile.email}
Location: ${buyerProfile.location}</pre>`;
  } else {
    const user = getCurrentUser() || {name:"", email};
    profileHtml += `<pre>Name: ${user.name || "(not set)"}
Email: ${email}
Role: ${role || "(not selected)"}</pre>`;
  }
  document.getElementById("profileDetails").innerHTML = profileHtml;
  showPage("profilePage");
  closeMenu("sellerMenuContent");
  closeMenu("buyerMenuContent");
}
function closeProfile() {
  showPage(role === "seller" ? "sellerHomePage" : "buyerHomePage");
}

/* Init on load */
window.addEventListener("load", () => {
  const email = getCurrentUserEmail();
  if(email) startSession();
  else showAuth();
});
