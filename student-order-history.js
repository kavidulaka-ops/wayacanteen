// ==========================================================================
// WAYACANTEEN - STUDENT ORDER HISTORY JAVASCRIPT
// Strict Constraints:
// - Exactly 3 font sizes: 24px, 16px, 13px
// - Strictly 0 unicode emojis (vector SVGs only)
// - Signature 3D Orange Theme (#ea580c -> #c2410c)
// ==========================================================================

let allOrders = [];
let currentFilter = "Active"; // Default to Active Pre-Orders for immediate visibility

// Retrieve array of dismissed/hidden order IDs from local storage
function getHiddenOrderIds() {
    try {
        const stored = localStorage.getItem("cantinHiddenStudentOrders");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error reading hidden orders from storage:", e);
        return [];
    }
}

// Save dismissed order ID
function hideOrder(orderId) {
    const hidden = getHiddenOrderIds();
    if (!hidden.includes(orderId)) {
        hidden.push(orderId);
        localStorage.setItem("cantinHiddenStudentOrders", JSON.stringify(hidden));
    }
    displayOrders(currentFilter);
}

// Clear all completed orders from the visible list
function clearCompletedHistory() {
    const completedOrders = allOrders.filter(o => o.status === "Completed" || o.status === "Rejected" || o.status === "Cancelled");
    if (completedOrders.length === 0) {
        alert("There are no completed or past orders to clear.");
        return;
    }

    if (!confirm("Are you sure you want to dismiss all completed orders from your history view? You can place new orders at any time.")) {
        return;
    }

    const hidden = getHiddenOrderIds();
    completedOrders.forEach(o => {
        if (!hidden.includes(o.orderId)) {
            hidden.push(o.orderId);
        }
    });

    localStorage.setItem("cantinHiddenStudentOrders", JSON.stringify(hidden));
    displayOrders(currentFilter);
}

// Load orders belonging to the logged-in student
function loadOrders() {
    const container = document.getElementById("ordersContainer");
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; color: #ea580c; font-size: 16px; font-weight: 600;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto 12px auto; animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            Loading your canteen orders...
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;

    fetch("/CantinWeb/student-order-history", {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json"
        }
    })
    .then(response => {
        if (response.status === 401) {
            container.innerHTML = `
                <div class="empty-orders-card">
                    <div class="empty-orders-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <h2>Session Expired / Log In Required</h2>
                    <p>Your student login session has timed out. Please log in again to track your live orders.</p>
                    <a href="login.html" class="btn-browse-food">Log In Now</a>
                </div>
            `;
            return null;
        }

        if (!response.ok) {
            throw new Error("Server error: " + response.status);
        }

        return response.json();
    })
    .then(data => {
        if (!data) return;

        if (!data.success) {
            container.innerHTML = `
                <div class="empty-orders-card">
                    <div class="empty-orders-icon" style="color: #dc2626; background: #fef2f2; border-color: #fecaca;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <h2>Unable to Load Orders</h2>
                    <p>${escapeHTML(data.message || "An unexpected error occurred.")}</p>
                    <button type="button" class="btn-browse-food" onclick="loadOrders()">Try Again</button>
                </div>
            `;
            return;
        }

        allOrders = data.orders || [];
        updateCounts();
        displayOrders(currentFilter);
    })
    .catch(error => {
        console.error("Error loading orders:", error);
        container.innerHTML = `
            <div class="empty-orders-card">
                <div class="empty-orders-icon" style="color: #dc2626; background: #fef2f2; border-color: #fecaca;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h2>Connection Error</h2>
                <p>Could not connect to the canteen server. Please verify your connection and try again.</p>
                <button type="button" class="btn-browse-food" onclick="loadOrders()">Retry</button>
            </div>
        `;
    });
}

// Update filter badges counts
function updateCounts() {
    const hidden = getHiddenOrderIds();
    const visibleOrders = allOrders.filter(o => !hidden.includes(o.orderId));

    const activeCount = visibleOrders.filter(o => o.status === "Pending" || o.status === "Accepted").length;
    const completedCount = visibleOrders.filter(o => o.status === "Completed").length;
    const allCount = visibleOrders.length;

    const elActive = document.getElementById("activeCount");
    const elCompleted = document.getElementById("completedCount");
    const elAll = document.getElementById("allCount");

    if (elActive) elActive.textContent = activeCount;
    if (elCompleted) elCompleted.textContent = completedCount;
    if (elAll) elAll.textContent = allCount;
}

// Display orders matching the active filter
function displayOrders(filter) {
    currentFilter = filter;
    const container = document.getElementById("ordersContainer");
    if (!container) return;

    container.innerHTML = "";
    updateCounts();

    const hidden = getHiddenOrderIds();
    const visibleOrders = allOrders.filter(o => !hidden.includes(o.orderId));

    let filteredOrders = visibleOrders.filter(order => {
        if (filter === "Active") {
            return order.status === "Pending" || order.status === "Accepted";
        }
        if (filter === "Completed") {
            return order.status === "Completed";
        }
        if (filter === "All") {
            return true;
        }
        return order.status === filter;
    });

    if (filteredOrders.length === 0) {
        if (filter === "Active") {
            container.innerHTML = `
                <div class="empty-orders-card">
                    <div class="empty-orders-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <h2>No Active Pre-Orders</h2>
                    <p>You have no canteen pre-orders currently in preparation or waiting for pickup.</p>
                    <a href="food.html" class="btn-browse-food">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Order Fresh Food Now</span>
                    </a>
                </div>
            `;
        } else if (filter === "Completed") {
            container.innerHTML = `
                <div class="empty-orders-card">
                    <div class="empty-orders-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <h2>No Completed Orders</h2>
                    <p>All completed orders have been dismissed or no previous orders have been completed yet.</p>
                    <button type="button" class="btn-browse-food" onclick="filterOrders('Active')">View Active Orders</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-orders-card">
                    <div class="empty-orders-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    </div>
                    <h2>No Orders Found</h2>
                    <p>You have no orders recorded in this view. Pre-order your favorite canteen meals and stationery now!</p>
                    <a href="food.html" class="btn-browse-food">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Browse Food Menu</span>
                    </a>
                </div>
            `;
        }
        return;
    }

    filteredOrders.forEach(order => {
        const card = document.createElement("div");
        const isActive = order.status === "Pending" || order.status === "Accepted";
        card.className = "student-order-card" + (isActive ? " is-active-order" : "");

        const statusClass = getStatusClass(order.status);

        // Ribbon for active pre-orders
        const activeRibbon = isActive ? `
            <div class="active-glow-ribbon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>${order.status === "Accepted" ? "Ready for Counter Pickup" : "In Kitchen Preparation"}</span>
            </div>
        ` : "";

        // Status notices
        const acceptedNotice = (order.status === "Accepted" || order.status === "Completed") && order.acceptedDate ? `
            <div class="accepted-notice-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Accepted by Canteen Staff on <strong>${formatDate(order.acceptedDate)}</strong> at <strong>${formatTime(order.acceptedTime)}</strong></span>
            </div>
        ` : "";

        const rejectedNotice = order.status === "Rejected" ? `
            <div class="rejected-notice-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                <span>Order Cancelled: <strong>${escapeHTML(order.rejectionReason || "Unavailable at this time")}</strong></span>
            </div>
        ` : "";

        // Items preview markup
        let itemsHtml = "";
        if (order.items && order.items.length > 0) {
            itemsHtml = `
                <div class="order-items-preview">
                    <div class="order-items-title">Items Ordered</div>
                    <div class="order-items-list">
                        ${order.items.map(it => `
                            <div class="order-item-row">
                                <span class="order-item-name">${escapeHTML(it.name)} <span class="order-item-qty">x${it.quantity}</span></span>
                                <span class="order-item-subtotal">Rs. ${Number(it.subtotal || (it.price * it.quantity)).toFixed(2)}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        // Dismiss action button for completed/past orders
        const dismissButton = !isActive ? `
            <button type="button" class="btn-hide-order" onclick="hideOrder(${order.orderId})" title="Dismiss order from view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        ` : "";

        card.innerHTML = `
            ${activeRibbon}

            <div class="order-header">
                <div class="order-code-group">
                    <span class="order-code-badge">${escapeHTML(order.orderCode)}</span>
                    <span class="order-type-tag">${escapeHTML(order.orderType || "Food")}</span>
                </div>
                <span class="status-badge ${statusClass}">
                    ${escapeHTML(order.status)}
                </span>
            </div>

            <div class="order-info">
                <div class="info-item">
                    <span>Order Date</span>
                    <strong>${formatDate(order.orderDate)}</strong>
                </div>
                <div class="info-item">
                    <span>Order Time</span>
                    <strong>${formatTime(order.orderTime)}</strong>
                </div>
                <div class="info-item">
                    <span>Pickup Window</span>
                    <strong class="pickup-highlight">${escapeHTML(order.pickupSlot || "Morning")} (${order.pickupTime ? formatTime(order.pickupTime) : "08:30"})</strong>
                </div>
                <div class="info-item">
                    <span>Order ID</span>
                    <strong>#${order.orderId}</strong>
                </div>
            </div>

            ${itemsHtml}
            ${acceptedNotice}
            ${rejectedNotice}

            <div class="order-footer">
                <div class="order-total-block">
                    <p class="order-total-label">Total Amount</p>
                    <h3 class="order-total-amount">Rs. ${Number(order.totalAmount).toFixed(2)}</h3>
                </div>

                <div class="order-actions-row">
                    <a href="feedback.html?orderCode=${encodeURIComponent(order.orderCode)}" class="btn-order-feedback" title="Give order feedback">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span>Feedback</span>
                    </a>
                    <button type="button" class="view-qr-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        <span>Pickup QR</span>
                    </button>
                    ${dismissButton}
                </div>
            </div>
        `;

        const qrBtn = card.querySelector(".view-qr-btn");
        if (qrBtn) {
            qrBtn.addEventListener("click", () => {
                showOrderQR(order.orderCode, order.totalAmount);
            });
        }

        container.appendChild(card);
    });
}

// Filter button handling
function filterOrders(filter) {
    currentFilter = filter;

    const tabs = {
        "Active": document.getElementById("tabActive"),
        "Completed": document.getElementById("tabCompleted"),
        "All": document.getElementById("tabAll")
    };

    Object.values(tabs).forEach(tab => {
        if (tab) tab.classList.remove("active");
    });

    if (tabs[filter]) {
        tabs[filter].classList.add("active");
    }

    displayOrders(filter);
}

// Status styling helper
function getStatusClass(status) {
    switch (status) {
        case "Pending":
            return "status-pending";
        case "Accepted":
            return "status-accepted";
        case "Completed":
            return "status-completed";
        case "Rejected":
        case "Cancelled":
            return "status-rejected";
        default:
            return "";
    }
}

// Date formatting helper
function formatDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString + "T00:00:00");
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// Time formatting helper
function formatTime(timeString) {
    if (!timeString) return "—";
    const parts = timeString.split(":");
    if (parts.length < 2) return timeString;

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const suffix = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return hours + ":" + minutes + " " + suffix;
}

// Prevent database text from being interpreted as HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[character];
    });
}

// Counter Pickup QR Modal
function showOrderQR(orderCode, totalAmount) {
    const existing = document.getElementById("orderQrModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "orderQrModal";
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
        background: #ffffff;
        padding: 32px 28px;
        border-radius: 24px;
        border: 2px solid #fed7aa;
        box-shadow: 0 20px 45px rgba(234, 88, 12, 0.2);
        text-align: center;
        max-width: 340px;
        width: 100%;
        box-sizing: border-box;
    `;

    const title = document.createElement("h2");
    title.textContent = "Counter Pickup QR";
    title.style.cssText = `
        font-size: 24px;
        font-weight: 800;
        color: #ea580c;
        margin: 0 0 8px 0;
    `;

    const code = document.createElement("p");
    code.textContent = orderCode;
    code.style.cssText = `
        font-size: 13px;
        font-weight: 700;
        color: #ea580c;
        background: #fff7ed;
        border: 1px solid #fed7aa;
        padding: 4px 14px;
        border-radius: 9999px;
        display: inline-block;
        margin: 0 0 16px 0;
    `;

    const image = document.createElement("img");
    image.alt = "QR code for order " + orderCode;
    image.width = 190;
    image.height = 190;
    image.style.cssText = `
        padding: 12px;
        background: #ffffff;
        border: 2px solid #ea580c;
        border-radius: 18px;
        box-shadow: 0 8px 20px rgba(234, 88, 12, 0.15);
        margin-bottom: 14px;
        display: inline-block;
        max-width: 100%;
    `;

    image.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(orderCode);

    const total = document.createElement("p");
    total.textContent = "Total: Rs. " + Number(totalAmount).toFixed(2);
    total.style.cssText = `
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 20px 0;
    `;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.style.cssText = `
        width: 100%;
        height: 44px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
        color: white;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 8px 18px rgba(234, 88, 12, 0.3);
        transition: transform 0.15s ease;
    `;

    closeButton.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });

    box.append(title, code, image, total, closeButton);
    modal.appendChild(box);
    document.body.appendChild(modal);
}

// Initial fetch on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
});
