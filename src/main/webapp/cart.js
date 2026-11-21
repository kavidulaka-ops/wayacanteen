// ==========================================================================
// WAYACANTEEN - CART & PICKUP TIME CONTROLLER
// ==========================================================================

let cart = JSON.parse(localStorage.getItem("cantinCart")) || [];

// Fix old items if itemType is missing
cart.forEach(item => {
    if (!item.itemType) {
        const name = (item.name || "").toLowerCase();
        if (
            name.includes("notebook") ||
            name.includes("book") ||
            name.includes("pen") ||
            name.includes("pencil") ||
            name.includes("eraser") ||
            name.includes("ruler") ||
            name.includes("calculator")
        ) {
            item.itemType = "Stationery";
        } else {
            item.itemType = "Food";
        }
    }
    item.price = Number(item.price) || 0;
    item.quantity = Number(item.quantity) || 1;
});

localStorage.setItem("cantinCart", JSON.stringify(cart));

// ==========================================================================
// PICKUP SCHEDULE CONFIGURATION
// ==========================================================================
// Morning: 07:00 - 11:00
// Noon:    11:00 - 15:00
// Night:   15:00 - 20:00
const SLOT_CONFIG = {
    Morning: {
        name: "Morning",
        label: "Morning (උදේ)",
        min: "07:00",
        max: "11:00",
        defaultTime: "08:30",
        chips: ["07:30", "08:30", "09:30", "10:30"],
        desc: "Scheduled for Morning counter pickup between 7:00 AM and 11:00 AM."
    },
    Noon: {
        name: "Noon",
        label: "Noon (දවල්)",
        min: "11:00",
        max: "15:00",
        defaultTime: "12:30",
        chips: ["11:30", "12:30", "13:30", "14:30"],
        desc: "Scheduled for Noon counter pickup between 11:00 AM and 3:00 PM."
    },
    Night: {
        name: "Night",
        label: "Night (රෑ / හවස)",
        min: "15:00",
        max: "20:00",
        defaultTime: "17:00",
        chips: ["15:30", "16:30", "17:30", "19:00"],
        desc: "Scheduled for Night / Evening counter pickup between 3:00 PM and 8:00 PM."
    }
};

let currentSlot = localStorage.getItem("cantinPickupSlot") || "Morning";
let currentTime = localStorage.getItem("cantinPickupTime") || "08:30";

if (!SLOT_CONFIG[currentSlot]) {
    currentSlot = "Morning";
    currentTime = "08:30";
}

// ==========================================================================
// TIME UTILITIES
// ==========================================================================
function formatTime12(time24) {
    if (!time24) return "";
    const parts = time24.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    const hStr = h < 10 ? "0" + h : "" + h;
    return `${hStr}:${m} ${ampm}`;
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// ==========================================================================
// SLOT SELECTION
// ==========================================================================
function selectPickupSlot(slotKey) {
    if (!SLOT_CONFIG[slotKey]) return;
    currentSlot = slotKey;

    const conf = SLOT_CONFIG[slotKey];
    const timeInput = document.getElementById("pickupTimeInput");

    // Check if currentTime fits within this slot, otherwise set to default
    const curMin = timeToMinutes(currentTime);
    const slotMin = timeToMinutes(conf.min);
    const slotMax = timeToMinutes(conf.max);

    if (curMin < slotMin || curMin > slotMax) {
        currentTime = conf.defaultTime;
    }

    if (timeInput) {
        timeInput.min = conf.min;
        timeInput.max = conf.max;
        timeInput.value = currentTime;
    }

    localStorage.setItem("cantinPickupSlot", currentSlot);
    localStorage.setItem("cantinPickupTime", currentTime);

    updatePickupUI();
}

function onPickupTimeInputChanged(event) {
    const val = event.target.value;
    if (!val) return;
    currentTime = val;

    // Check if this time belongs to a different slot
    const valMin = timeToMinutes(val);
    const morningMin = timeToMinutes(SLOT_CONFIG.Morning.min);
    const morningMax = timeToMinutes(SLOT_CONFIG.Morning.max);
    const noonMin = timeToMinutes(SLOT_CONFIG.Noon.min);
    const noonMax = timeToMinutes(SLOT_CONFIG.Noon.max);
    const nightMin = timeToMinutes(SLOT_CONFIG.Night.min);
    const nightMax = timeToMinutes(SLOT_CONFIG.Night.max);

    if (valMin >= morningMin && valMin <= morningMax && currentSlot !== "Morning") {
        currentSlot = "Morning";
    } else if (valMin >= noonMin && valMin <= noonMax && currentSlot !== "Noon") {
        currentSlot = "Noon";
    } else if (valMin >= nightMin && valMin <= nightMax && currentSlot !== "Night") {
        currentSlot = "Night";
    }

    localStorage.setItem("cantinPickupSlot", currentSlot);
    localStorage.setItem("cantinPickupTime", currentTime);

    updatePickupUI();
}

function selectQuickChip(chipTime) {
    currentTime = chipTime;
    const timeInput = document.getElementById("pickupTimeInput");
    if (timeInput) timeInput.value = chipTime;

    localStorage.setItem("cantinPickupTime", currentTime);
    updatePickupUI();
}

function updatePickupUI() {
    const conf = SLOT_CONFIG[currentSlot];

    // Highlight slot buttons
    const btnMorning = document.getElementById("slotMorning");
    const btnNoon = document.getElementById("slotNoon");
    const btnNight = document.getElementById("slotNight");

    if (btnMorning) btnMorning.classList.toggle("active", currentSlot === "Morning");
    if (btnNoon) btnNoon.classList.toggle("active", currentSlot === "Noon");
    if (btnNight) btnNight.classList.toggle("active", currentSlot === "Night");

    // Allowed Hint
    const allowedHint = document.getElementById("slotAllowedHint");
    if (allowedHint) {
        allowedHint.textContent = `Allowed: ${formatTime12(conf.min)} – ${formatTime12(conf.max)}`;
    }

    // Validation Pill
    const valPill = document.getElementById("pickupTimeValidationPill");
    if (valPill) {
        valPill.innerHTML = `<span>${conf.name} Slot (${formatTime12(currentTime)})</span>`;
    }

    // Quick Chips
    const chipsList = document.getElementById("pickupQuickChips");
    if (chipsList) {
        chipsList.innerHTML = conf.chips.map(chip => {
            const isActive = chip === currentTime;
            return `<button type="button" class="time-chip-btn ${isActive ? 'active' : ''}" onclick="selectQuickChip('${chip}')">${formatTime12(chip)}</button>`;
        }).join("");
    }

    // Feedback message
    const curMin = timeToMinutes(currentTime);
    const slotMin = timeToMinutes(conf.min);
    const slotMax = timeToMinutes(conf.max);
    const feedbackBox = document.getElementById("pickupTimeFeedback");
    const feedbackText = document.getElementById("feedbackText");

    if (curMin < slotMin || curMin > slotMax) {
        if (feedbackBox) feedbackBox.className = "time-feedback-msg error";
        if (feedbackText) {
            feedbackText.textContent = `Please select a time between ${formatTime12(conf.min)} and ${formatTime12(conf.max)} for ${conf.name} slot.`;
        }
    } else {
        if (feedbackBox) feedbackBox.className = "time-feedback-msg";
        if (feedbackText) feedbackText.textContent = conf.desc;
    }

    // Summary Aside Preview
    const summaryBadge = document.getElementById("summaryPickupBadge");
    if (summaryBadge) {
        summaryBadge.textContent = `${conf.name} • ${formatTime12(currentTime)}`;
    }
}

// ==========================================================================
// DISPLAY CART ITEMS
// ==========================================================================
function displayCart() {
    const cartItems = document.getElementById("cartItems");
    const countBadge = document.getElementById("cartCountBadge");
    if (!cartItems) return;

    cartItems.innerHTML = "";

    if (cart.length === 0) {
        if (countBadge) countBadge.textContent = "0 items";
        cartItems.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                </div>
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added any meals or stationery supplies yet.</p>
                <button type="button" class="btn-browse-food" onclick="goFood()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    <span>Browse Food Menu</span>
                </button>
            </div>
        `;
        updateSummary();
        return;
    }

    let totalQuantity = 0;

    cart.forEach((item, index) => {
        totalQuantity += item.quantity;
        const itemTotal = item.price * item.quantity;

        const cartItem = document.createElement("div");
        cartItem.className = "cart-item";

        cartItem.innerHTML = `
            <div class="item-icon">
                ${getItemIcon(item)}
            </div>

            <div class="item-details">
                <h3>${escapeHtml(item.name)}</h3>
                <span>${escapeHtml(item.itemType)} &bull; Rs. ${item.price.toFixed(2)} each</span>
            </div>

            <div class="quantity">
                <button type="button" onclick="decreaseQuantity(${index})" title="Decrease quantity">&minus;</button>
                <span>${item.quantity}</span>
                <button type="button" onclick="increaseQuantity(${index})" title="Increase quantity">&plus;</button>
            </div>

            <div class="item-price">
                Rs. ${itemTotal.toFixed(2)}
            </div>

            <button type="button" class="delete-btn" onclick="removeItem(${index})" title="Remove item from cart">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;

        cartItems.appendChild(cartItem);
    });

    if (countBadge) countBadge.textContent = `${totalQuantity} item${totalQuantity > 1 ? 's' : ''}`;
    updateSummary();
}

function getItemIcon(item) {
    if (item.itemType === "Stationery") {
        const name = (item.name || "").toLowerCase();
        if (name.includes("pen") || name.includes("pencil")) {
            return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="2" x2="22" y2="6"></line><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"></path></svg>';
        }
        if (name.includes("calculator")) {
            return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M8 10h.01"></path><path d="M12 10h.01"></path><path d="M16 10h.01"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path></svg>';
        }
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
    }

    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';
}

function increaseQuantity(index) {
    if (cart[index]) {
        cart[index].quantity++;
        saveCart();
        displayCart();
    }
}

function decreaseQuantity(index) {
    if (cart[index]) {
        if (cart[index].quantity > 1) {
            cart[index].quantity--;
        } else {
            cart.splice(index, 1);
        }
        saveCart();
        displayCart();
    }
}

function removeItem(index) {
    if (cart[index]) {
        cart.splice(index, 1);
        saveCart();
        displayCart();
    }
}

function saveCart() {
    localStorage.setItem("cantinCart", JSON.stringify(cart));
}

function updateSummary() {
    let itemCount = 0;
    let total = 0;

    cart.forEach(item => {
        itemCount += item.quantity;
        total += Number(item.price) * Number(item.quantity);
    });

    const elTotalItems = document.getElementById("totalItems");
    const elSubtotal = document.getElementById("subtotal");
    const elTotal = document.getElementById("total");

    if (elTotalItems) elTotalItems.textContent = itemCount;
    if (elSubtotal) elSubtotal.textContent = "Rs. " + total.toFixed(2);
    if (elTotal) elTotal.textContent = "Rs. " + total.toFixed(2);
}

function goHome() {
    window.location.href = "home.html";
}

function goFood() {
    window.location.href = "food.html";
}

function goStationery() {
    window.location.href = "stationery.html";
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================================================
// PLACE PRE-ORDER (PROCEEDS TO ORDER CONFIRMATION)
// ==========================================================================
function placePreOrder() {
    if (cart.length === 0) {
        alert("Your cart is empty. Please add items to your cart before checking out.");
        return;
    }

    const conf = SLOT_CONFIG[currentSlot];
    const curMin = timeToMinutes(currentTime);
    const slotMin = timeToMinutes(conf.min);
    const slotMax = timeToMinutes(conf.max);

    if (curMin < slotMin || curMin > slotMax) {
        alert(`Pickup time must be within the ${conf.name} window: between ${formatTime12(conf.min)} and ${formatTime12(conf.max)}.`);
        const timeInput = document.getElementById("pickupTimeInput");
        if (timeInput) timeInput.focus();
        return;
    }

    // Persist pickup details
    localStorage.setItem("cantinPickupSlot", currentSlot);
    localStorage.setItem("cantinPickupTime", currentTime);

    // Proceed to order confirmation
    window.location.href = "order.html";
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", function () {
    displayCart();
    selectPickupSlot(currentSlot);
});
