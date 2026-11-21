// =====================================
// WAYACANTEEN - STATIONERY CONTROLLER
// =====================================

// Global State
let cart = JSON.parse(localStorage.getItem("cantinCart")) || [];
let allStationeryItems = [];
let currentCategory = "All";

// Category title mapping
const categoryTitles = {
    "All": "All Academic Supplies",
    "Books": "Student Notebooks & Pads",
    "Writing": "Pens, Pencils & Markers",
    "Other": "Erasers, Rulers & Tools"
};

// =====================================
// MAP STATIONERY ITEM TO ASSET IMAGE
// =====================================
function getStationeryItemImage(name, category) {
    const n = (name || "").toLowerCase();
    const c = (category || "").toLowerCase();

    if (n.includes("notebook") || n.includes("book") || c.includes("book")) {
        return "images/stationery-notebook-3d.png";
    }
    if (n.includes("pencil") || n.includes("lead")) {
        return "images/stationery-pencil-3d.png";
    }
    if (n.includes("eraser") || n.includes("rubber")) {
        return "images/stationery-eraser-3d.png";
    }
    if (n.includes("pen") || n.includes("highlighter") || n.includes("marker") || c.includes("writing")) {
        return "images/stationery-pen-highlighter-3d.png";
    }
    if (n.includes("ruler") || n.includes("scale")) {
        return "images/stationery-straight-ruler-3d.png";
    }
    if (n.includes("triangle") || n.includes("geometry") || n.includes("compass")) {
        return "images/stationery-triangle-ruler-3d.png";
    }
    if (n.includes("calculator")) {
        return "images/stationery-calculator-3d.png";
    }
    return "images/stationery-notebook-3d.png";
}

// Get Badge Class
function getCategoryBadge(category, name) {
    const c = (category || "").toLowerCase();
    const n = (name || "").toLowerCase();

    if (c.includes("book") || n.includes("notebook") || n.includes("book")) {
        return { label: "Notebook & Paper", badgeClass: "badge-book" };
    }
    if (c.includes("writing") || n.includes("pen") || n.includes("pencil")) {
        return { label: "Writing Tool", badgeClass: "badge-pen" };
    }
    return { label: category || "Essential Tool", badgeClass: "badge-tool" };
}

// Default description if empty
function getItemDescription(desc, name, category) {
    if (desc && desc.trim().length > 0) {
        return desc;
    }
    const n = (name || "").toLowerCase();
    if (n.includes("notebook")) {
        return "High quality 80gsm ruled paper ideal for lecture notes and tutorials.";
    }
    if (n.includes("pen")) {
        return "Smooth flow tungsten carbide ballpoint pen with comfortable grip.";
    }
    if (n.includes("pencil")) {
        return "Standard HB break-resistant graphite pencil with top eraser cap.";
    }
    if (n.includes("eraser")) {
        return "Dust-free non-abrasive soft eraser for clean and neat erasing.";
    }
    return "Durable university standard academic supply at student-friendly price.";
}

// =====================================
// LOAD STATIONERY FROM DATABASE
// =====================================
function loadStationeryItems() {
    const grid = document.getElementById("stationeryGrid");
    const countIndicator = document.getElementById("stationeryItemTotal");

    fetch("stationery")
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                grid.innerHTML = `
                    <div class="stationery-error-box">
                        <p>Unable to load stationery items from database.</p>
                        <small>${data.error}</small>
                    </div>`;
                if (countIndicator) countIndicator.textContent = "0 items available";
                console.error("Stationery API error:", data.error);
                return;
            }

            allStationeryItems = Array.isArray(data) ? data : [];
            renderFilteredStationery();
        })
        .catch(error => {
            console.error("Error loading stationery items:", error);
            grid.innerHTML = `
                <div class="stationery-error-box">
                    <p>Failed to connect to university stationery database.</p>
                </div>`;
            if (countIndicator) countIndicator.textContent = "Offline";
        });
}

// =====================================
// RENDER FILTERED STATIONERY
// =====================================
function renderFilteredStationery() {
    const grid = document.getElementById("stationeryGrid");
    const countIndicator = document.getElementById("stationeryItemTotal");
    const categoryTitle = document.getElementById("currentCategoryTitle");

    if (categoryTitle) {
        categoryTitle.textContent = categoryTitles[currentCategory] || "Academic Supplies";
    }

    let filtered = allStationeryItems;
    if (currentCategory === "Books") {
        filtered = allStationeryItems.filter(item =>
            (item.category && item.category.toLowerCase().includes("book")) ||
            (item.name && item.name.toLowerCase().includes("notebook")) ||
            (item.name && item.name.toLowerCase().includes("book"))
        );
    } else if (currentCategory === "Writing") {
        filtered = allStationeryItems.filter(item =>
            (item.category && item.category.toLowerCase().includes("writing")) ||
            (item.name && item.name.toLowerCase().includes("pen")) ||
            (item.name && item.name.toLowerCase().includes("pencil"))
        );
    } else if (currentCategory === "Other") {
        filtered = allStationeryItems.filter(item => {
            const c = (item.category || "").toLowerCase();
            const n = (item.name || "").toLowerCase();
            return !c.includes("book") && !n.includes("notebook") && !c.includes("writing") && !n.includes("pen") && !n.includes("pencil");
        });
    }

    if (countIndicator) {
        countIndicator.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'} available`;
    }

    grid.innerHTML = "";

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="stationery-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <p>No stationery supplies found in this category.</p>
                <button class="empty-reset-btn" onclick="setCategory('All')" type="button">View All Supplies</button>
            </div>`;
        return;
    }

    filtered.forEach((item, index) => {
        const imageSrc = getStationeryItemImage(item.name, item.category);
        const badgeInfo = getCategoryBadge(item.category, item.name);
        const descText = getItemDescription(item.description, item.name, item.category);
        const safeName = (item.name || "Stationery Item").replace(/'/g, "\\'");

        const card = document.createElement("div");
        card.className = "stationery-card";
        card.style.animationDelay = `${index * 0.08}s`;

        card.innerHTML = `
            <div class="stationery-card-media">
                <span class="stationery-badge ${badgeInfo.badgeClass}">${badgeInfo.label}</span>
                <img src="${imageSrc}" alt="${item.name}" class="stationery-card-img" loading="lazy">
            </div>

            <div class="stationery-card-body">
                <h2 class="stationery-card-title">${item.name}</h2>
                <p class="stationery-card-desc">${descText}</p>

                <div class="stationery-card-footer">
                    <div class="stationery-price-wrap">
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

        grid.appendChild(card);
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
    renderFilteredStationery();
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
        item => item.name === itemName && item.itemType === "Stationery"
    );

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            name: itemName,
            price: Number(price),
            quantity: 1,
            itemType: "Stationery"
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
    loadStationeryItems();
});
