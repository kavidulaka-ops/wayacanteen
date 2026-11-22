// =====================================
// WAYACANTEEN - FOOD & DRINKS CONTROLLER
// =====================================

// Global State
let cart = JSON.parse(localStorage.getItem("cantinCart")) || [];
let allFoodItems = [];
let currentCategory = "All";

// Category title mapping
const categoryTitles = {
    "All": "All Delicious Items",
    "Rice": "Fragrant Rice Plates",
    "Kottu": "Sizzling Kottu Roti",
    "Food": "Short Eats & Hot Snacks"
};

// =====================================
// MAP FOOD ITEM TO ASSET IMAGE
// =====================================
function getFoodItemImage(name, category) {
    const n = (name || "").toLowerCase();
    const c = (category || "").toLowerCase();

    if (n.includes("kottu") || c.includes("kottu")) {
        return "images/chicken-kottu-3d.png";
    }
    if (n.includes("rice") || c.includes("rice") || n.includes("bath") || n.includes("biryani")) {
        return "images/yellow-rice-plate-3d.png";
    }
    if (n.includes("samosa") || n.includes("samusa")) {
        return "images/samosa-3d.png";
    }
    if (n.includes("sausage") || n.includes("bun")) {
        return "images/sausage-bun-3d.png";
    }
    if (n.includes("roti") || n.includes("roty")) {
        return "images/vegetable-roti-3d.png";
    }
    if (n.includes("roll")) {
        return "images/egg-roll-3d.png";
    }
    if (n.includes("ulundu")) {
        return "images/ulundu-vadai-3d.png";
    }
    if (n.includes("vadai") || n.includes("wada") || n.includes("parippu")) {
        return "images/parippu-vadai-3d.png";
    }
    if (n.includes("tea") || c.includes("drink") || c.includes("beverage")) {
        return "images/tea-cup.jpg";
    }
    if (n.includes("coffee")) {
        return "images/coffee-cup.jpg";
    }
    return "images/samosa-3d.png";
}

// Get Badge Class
function getCategoryBadge(category, name) {
    const c = (category || "").toLowerCase();
    const n = (name || "").toLowerCase();

    if (c.includes("rice") || n.includes("rice")) {
        return { label: "Rice Plate", badgeClass: "badge-rice" };
    }
    if (c.includes("kottu") || n.includes("kottu")) {
        return { label: "Kottu Roti", badgeClass: "badge-kottu" };
    }
    if (c.includes("drink") || c.includes("beverage") || n.includes("tea") || n.includes("coffee")) {
        return { label: "Beverage", badgeClass: "badge-drink" };
    }
    return { label: category || "Canteen Snack", badgeClass: "badge-snack" };
}

// Default description if empty
function getItemDescription(desc, name, category) {
    if (desc && desc.trim().length > 0) {
        return desc;
    }
    const n = (name || "").toLowerCase();
    if (n.includes("samosa")) {
        return "Crispy golden pastry triangles packed with spiced vegetable filling.";
    }
    if (n.includes("kottu")) {
        return "Authentic street-style diced roti shredded with spices and fresh vegetables.";
    }
    if (n.includes("rice")) {
        return "Fragrant steamed rice served hot with flavourful curries and accompaniments.";
    }
    return "Freshly prepared daily with wholesome local ingredients at WAYACANTEEN.";
}

// =====================================
// LOAD FOOD ITEMS FROM DATABASE
// =====================================
function loadFoodItems() {
    const foodGrid = document.getElementById("foodGrid");
    const countIndicator = document.getElementById("foodItemTotal");

    fetch("food")
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                foodGrid.innerHTML = `
                    <div class="food-error-box">
                        <p>Unable to load food items from database.</p>
                        <small>${data.error}</small>
                    </div>`;
                if (countIndicator) countIndicator.textContent = "0 items available";
                console.error("Food API error:", data.error);
                return;
            }

            allFoodItems = Array.isArray(data) ? data : [];
            renderFilteredFood();
        })
        .catch(error => {
            console.error("Error loading food items:", error);
            foodGrid.innerHTML = `
                <div class="food-error-box">
                    <p>Failed to connect to canteen database.</p>
                </div>`;
            if (countIndicator) countIndicator.textContent = "Offline";
        });
}

// =====================================
// RENDER FILTERED FOOD
// =====================================
function renderFilteredFood() {
    const foodGrid = document.getElementById("foodGrid");
    const countIndicator = document.getElementById("foodItemTotal");
    const categoryTitle = document.getElementById("currentCategoryTitle");

    if (categoryTitle) {
        categoryTitle.textContent = categoryTitles[currentCategory] || "Menu Items";
    }

    let filtered = allFoodItems;
    if (currentCategory === "Rice") {
        filtered = allFoodItems.filter(item => 
            (item.category && item.category.toLowerCase().includes("rice")) ||
            (item.name && item.name.toLowerCase().includes("rice"))
        );
    } else if (currentCategory === "Kottu") {
        filtered = allFoodItems.filter(item => 
            (item.category && item.category.toLowerCase().includes("kottu")) ||
            (item.name && item.name.toLowerCase().includes("kottu"))
        );
    } else if (currentCategory === "Food") {
        filtered = allFoodItems.filter(item => {
            const c = (item.category || "").toLowerCase();
            const n = (item.name || "").toLowerCase();
            return !c.includes("rice") && !n.includes("rice") && !c.includes("kottu") && !n.includes("kottu");
        });
    }

    if (countIndicator) {
        countIndicator.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'} available`;
    }

    foodGrid.innerHTML = "";

    if (filtered.length === 0) {
        foodGrid.innerHTML = `
            <div class="food-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <p>No items found in this category.</p>
                <button class="empty-reset-btn" onclick="setCategory('All')" type="button">View All Items</button>
            </div>`;
        return;
    }

    filtered.forEach((item, index) => {
        const imageSrc = (item.imageUrl && item.imageUrl.trim() !== "") 
            ? item.imageUrl 
            : getFoodItemImage(item.name, item.category);
        const badgeInfo = getCategoryBadge(item.category, item.name);
        const descText = getItemDescription(item.description, item.name, item.category);
        const safeName = (item.name || "Food Item").replace(/'/g, "\\'");

        const card = document.createElement("div");
        card.className = "food-card";
        card.style.animationDelay = `${index * 0.08}s`;

        card.innerHTML = `
            <div class="food-card-media">
                <span class="food-badge ${badgeInfo.badgeClass}">${badgeInfo.label}</span>
                <img src="${imageSrc}" alt="${item.name}" class="food-card-img" loading="lazy">
            </div>

            <div class="food-card-body">
                <h2 class="food-card-title">${item.name}</h2>
                <p class="food-card-desc">${descText}</p>

                <div class="food-card-footer">
                    <div class="food-price-wrap">
                        <span class="price-currency">Rs.</span>
                        <strong class="price-val">${Number(item.price).toFixed(2)}</strong>
                    </div>

                    <button class="add-to-cart-btn" onclick="addToCart('${safeName}', ${item.price}, this)" type="button" aria-label="Add ${item.name} to Cart">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Add</span>
                    </button>
                </div>
            </div>
        `;

        foodGrid.appendChild(card);
    });
}

// =====================================
// CATEGORY FILTER SELECTION
// =====================================
function setCategory(cat) {
    currentCategory = cat;
    const buttons = document.querySelectorAll(".category-pill");
    buttons.forEach(btn => {
        if (btn.getAttribute("data-category") === cat) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    renderFilteredFood();
}

function initCategoryButtons() {
    const buttons = document.querySelectorAll(".category-pill");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const cat = btn.getAttribute("data-category");
            setCategory(cat);
        });
    });
}

// =====================================
// ADD TO CART
// =====================================
function addToCart(itemName, price, btnElement) {
    let existingItem = cart.find(
        item => item.name === itemName && item.itemType === "Food"
    );

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            name: itemName,
            price: Number(price),
            quantity: 1,
            itemType: "Food"
        });
    }

    saveCart();
    updateCart();

    // Visual button bounce feedback
    if (btnElement) {
        btnElement.classList.add("btn-added-state");
        const span = btnElement.querySelector("span");
        const originalText = span ? span.textContent : "Add";
        if (span) span.textContent = "Added!";
        
        setTimeout(() => {
            btnElement.classList.remove("btn-added-state");
            if (span) span.textContent = originalText;
        }, 900);
    }

    // Trigger bounce on header cart badge
    const cartBadge = document.getElementById("cartCount");
    if (cartBadge) {
        cartBadge.classList.add("badge-bump");
        setTimeout(() => cartBadge.classList.remove("badge-bump"), 400);
    }
}

// =====================================
// SAVE CART
// =====================================
function saveCart() {
    localStorage.setItem("cantinCart", JSON.stringify(cart));
}

// =====================================
// UPDATE CART DISPLAY
// =====================================
function updateCart() {
    let cartCount = 0;
    let cartTotal = 0;

    cart.forEach(item => {
        cartCount += (item.quantity || 1);
        cartTotal += (item.price || 0) * (item.quantity || 1);
    });

    const cartCountEl = document.getElementById("cartCount");
    const summaryCountEl = document.getElementById("summaryCount");
    const summaryTotalEl = document.getElementById("summaryTotal");
    const summaryBar = document.getElementById("cartSummaryBar");

    if (cartCountEl) cartCountEl.textContent = cartCount;
    if (summaryCountEl) summaryCountEl.textContent = cartCount;
    if (summaryTotalEl) summaryTotalEl.textContent = "Rs. " + cartTotal.toFixed(2);

    if (summaryBar) {
        if (cartCount > 0) {
            summaryBar.classList.add("has-items");
        } else {
            summaryBar.classList.remove("has-items");
        }
    }
}

// =====================================
// NAVIGATION
// =====================================
function goHome() {
    window.location.href = "home.html";
}

function viewCart() {
    window.location.href = "cart.html";
}

// =====================================
// INITIALIZATION
// =====================================
document.addEventListener("DOMContentLoaded", () => {
    updateCart();
    initCategoryButtons();
    loadFoodItems();
});
