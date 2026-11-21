// =========================================
// CANTIN - STUDENT ORDER HISTORY
// =========================================

let allOrders = [];
let currentFilter = "All";

// Load orders belonging to the logged-in student
function loadOrders() {

    const container =
        document.getElementById("ordersContainer");

    container.innerHTML =
        '<div class="loading">Loading your orders...</div>';

    fetch("/CantinWeb/student-order-history", {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json"
        }
    })
        .then(response => {
            if (response.status === 401) {
                // Student session expired or not logged in
                container.innerHTML = `
                    <div class="session-expired-card" style="text-align: center; padding: 40px 20px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; margin-top: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="font-size: 24px; margin-bottom: 15px;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
                        <h2 style="font-size: 24px; color: #1e293b; margin-bottom: 8px;">Session Expired / Log In Required</h2>
                        <p style="color: #64748b; font-size: 13px; margin-bottom: 22px;">Your student login session has timed out. Please log in again to view your orders.</p>
                        <a href="login.html" style="display: inline-block; background: #111827; color: white; padding: 11px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; transition: background 0.2s;">Log In Again →</a>
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
                    <div class="error-message">
                        ${data.message || "Unable to load your orders."}
                    </div>
                `;
                return;
            }

            allOrders = data.orders || [];
            displayOrders(currentFilter);
        })
        .catch(error => {
            console.error("Error loading orders:", error);

            container.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 30px; background: white; border-radius: 16px; border: 1px solid #fecaca; margin-top: 20px;">
                    <div style="font-size: 24px; margin-bottom: 10px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
                    <strong style="color: #dc2626; font-size: 16px; display: block; margin-bottom: 8px;">Unable to load your orders</strong>
                    <p style="color: #64748b; font-size: 13px; margin-bottom: 18px;">Please check your internet connection or log in again.</p>
                    <a href="login.html" style="display: inline-block; background: #FFA500; color: white; padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none;">Go to Login</a>
                </div>
            `;
        });
}


// Display orders
function displayOrders(filter) {

    const container =
        document.getElementById("ordersContainer");

    container.innerHTML = "";

    let filteredOrders = allOrders.filter(order => {

        if (filter === "All") {
            return true;
        }

        return order.status === filter;
    });

    if (filteredOrders.length === 0) {

        container.innerHTML = `
            <div class="empty-orders">
                <div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
                <h2>No Orders Found</h2>
                <p>
                    You don't have any orders in this category yet.
                </p>
            </div>
        `;

        return;
    }

    filteredOrders.forEach(order => {

        const card = document.createElement("div");

        card.className = "student-order-card";

        const statusClass = getStatusClass(order.status);

        const acceptedInfo =
            order.status === "Accepted" ||
            order.status === "Completed"
                ? `
                    <div class="accepted-info">
                        Accepted on
                        ${formatDate(order.acceptedDate)}
                        at ${formatTime(order.acceptedTime)}
                    </div>
                  `
                : "";

        const rejectedInfo =
            order.status === "Rejected"
                ? `
                    <div class="rejected-info" style="margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <span>Notice:</span>
                        <span>Order Rejected: <strong>${escapeHTML(order.rejectionReason || "Not available in this moment")}</strong></span>
                    </div>
                  `
                : "";

        card.innerHTML = `
            <div class="order-header">

                <div>
                    <h2 class="order-code">
                        ${escapeHTML(order.orderCode)}
                    </h2>

                    <span class="order-type">
                        ${escapeHTML(order.orderType)}
                    </span>
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
                    <span>Order ID</span>
                    <strong>#${order.orderId}</strong>
                </div>

            </div>

            
<div class="order-footer">
    <div>
        <p class="order-total-label">Total Amount</p>
        <strong class="order-total">
            Rs. ${Number(order.totalAmount).toFixed(2)}
        </strong>
    </div>

    <button type="button" class="view-qr-btn">
        View QR
    </button>
</div>


            ${acceptedInfo}
            ${rejectedInfo}
        `;

const qrButton = card.querySelector(".view-qr-btn");

qrButton.addEventListener("click", function () {
    showOrderQR(order.orderCode, order.totalAmount);
});
        container.appendChild(card);
    });
}


// Filter buttons
function filterOrders(filter) {

    currentFilter = filter;

    document.querySelectorAll(".filter-btn")
        .forEach(button => {
            button.classList.remove("active");
        });

    document.querySelectorAll(".filter-btn")
        .forEach(button => {

            if (button.textContent.trim() === filter) {
                button.classList.add("active");
            }
        });

    displayOrders(filter);
}


// Status styling
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
            return "status-cancelled";

        default:
            return "";
    }
}


// Date formatting
function formatDate(dateString) {

    if (!dateString) {
        return "—";
    }

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


// Time formatting
function formatTime(timeString) {

    if (!timeString) {
        return "—";
    }

    const parts = timeString.split(":");

    if (parts.length < 2) {
        return timeString;
    }

    let hours = parseInt(parts[0], 10);

    const minutes = parts[1];

    const suffix = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;

    if (hours === 0) {
        hours = 12;
    }

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


// Return to home
function goHome() {

    window.location.href = "home.html";
}


// Start

function showOrderQR(orderCode, totalAmount) {

    const modal = document.createElement("div");

    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
    `;

    const box = document.createElement("div");

    box.style.cssText = `
        background: white;
        padding: 28px;
        border-radius: 16px;
        text-align: center;
        max-width: 340px;
        width: 100%;
        box-sizing: border-box;
    `;

    const title = document.createElement("h2");
    title.textContent = "Your Order QR";

    const code = document.createElement("p");
    code.textContent = orderCode;

    const image = document.createElement("img");
    image.alt = "QR code for order " + orderCode;
    image.width = 200;
    image.height = 200;
    image.style.maxWidth = "100%";

    // QR contains only the order code
    image.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="
        + encodeURIComponent(orderCode);

    const total = document.createElement("p");
    total.textContent =
        "Total: Rs. " + Number(totalAmount).toFixed(2);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.style.cssText = `
        padding: 10px 24px;
        border: none;
        border-radius: 8px;
        background: #2563eb;
        color: white;
        cursor: pointer;
    `;

    closeButton.addEventListener("click", () => modal.remove());

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.remove();
        }
    });

    box.append(title, code, image, total, closeButton);
    modal.appendChild(box);
    document.body.appendChild(modal);
}

loadOrders();

