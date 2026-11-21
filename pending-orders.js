// =====================================
// CANTIN PENDING ORDERS & ACTIVE QUEUE
// =====================================

let pendingOrders = [];
let acceptedOrders = [];
let currentTab = "Pending"; // "Pending" or "Accepted"
let currentFilter = "All";  // "All", "Food", "Stationery"
let currentSlotFilter = "All"; // "All", "Morning", "Noon", "Night"

// On Load
document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") && params.get("tab").toLowerCase() === "accepted") {
        currentTab = "Accepted";
    }
    const filterParam = params.get("filter");
    if (filterParam && (filterParam === "Food" || filterParam === "Stationery")) {
        currentFilter = filterParam;
        document.querySelectorAll(".category-filter-btn").forEach(btn => {
            if (btn.getAttribute("data-type") === filterParam) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }
    updateTabButtons();
    loadAllOrders();
    loadPendingQueueStatus();
});

// =====================================
// LOAD ORDERS FROM DATABASE
// =====================================

function loadAllOrders() {
    Promise.all([
        fetch("pending-orders").then(res => res.json()).catch(() => []),
        fetch("accepted-orders").then(res => res.json()).catch(() => [])
    ])
    .then(([pendingData, acceptedData]) => {
        pendingOrders = Array.isArray(pendingData) ? pendingData : [];
        acceptedOrders = Array.isArray(acceptedData) ? acceptedData : [];

        // Update badge counts
        const pendingBadge = document.getElementById("pendingTabCount") || document.getElementById("pendingCountBadge");
        const acceptedBadge = document.getElementById("acceptedTabCount") || document.getElementById("acceptedCountBadge");
        if (pendingBadge) pendingBadge.textContent = pendingOrders.length;
        if (acceptedBadge) acceptedBadge.textContent = acceptedOrders.length;

        displayOrders();
    })
    .catch(err => {
        console.error("Error loading orders:", err);
    });
}

// =====================================
// SWITCH TABS (Pending / Active Queue)
// =====================================

function switchMainTab(tab) {
    if (tab && tab.toLowerCase() === "accepted") {
        currentTab = "Accepted";
    } else {
        currentTab = "Pending";
    }
    updateTabButtons();
    displayOrders();
}

function switchTab(tab) {
    switchMainTab(tab);
}

function updateTabButtons() {
    const tabPending = document.getElementById("tabPending");
    const tabAccepted = document.getElementById("tabAccepted");
    if (tabPending && tabAccepted) {
        if (currentTab === "Pending") {
            tabPending.classList.add("active");
            tabAccepted.classList.remove("active");
        } else {
            tabAccepted.classList.add("active");
            tabPending.classList.remove("active");
        }
    }
}

// =====================================
// FILTER BY TYPE & SLOT
// =====================================

function filterOrders(type) {
    currentFilter = type;
    document.querySelectorAll(".category-filter-btn").forEach(btn => {
        if (btn.getAttribute("data-type") === type) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    displayOrders();
}

function filterSlot(slot) {
    currentSlotFilter = slot;
    document.querySelectorAll(".slot-filter-btn").forEach(btn => {
        if (btn.getAttribute("data-slot") === slot) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    displayOrders();
}

function formatPickupTime12(timeStr) {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    const hStr = h < 10 ? "0" + h : "" + h;
    return `${hStr}:${m} ${ampm}`;
}

// =====================================
// DISPLAY ORDERS
// =====================================

function displayOrders() {
    const container = document.getElementById("ordersContainer");
    if (!container) return;
    container.innerHTML = "";

    const sourceList = (currentTab === "Pending") ? pendingOrders : acceptedOrders;

    let filtered = sourceList.filter(order => {
        const matchesType = (currentFilter === "All") || (order.orderType === currentFilter);
        const orderSlot = order.pickupSlot || "Morning";
        const matchesSlot = (currentSlotFilter === "All") || (orderSlot.toLowerCase() === currentSlotFilter.toLowerCase());
        return matchesType && matchesSlot;
    });

    if (filtered.length === 0) {
        const emptyTitle = (currentTab === "Pending")
            ? "No Pending Orders"
            : "No Orders in Active Queue";
        const emptyMsg = (currentTab === "Pending")
            ? "There are no pending orders waiting for review in this filter."
            : "All accepted orders have been completed and picked up!";

        container.innerHTML = `
            <div class="empty-orders">
                <div class="empty-icon">${currentTab === "Pending" ? '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>' : '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'}</div>
                <h2>${emptyTitle}</h2>
                <p>${emptyMsg}</p>
            </div>
        `;
        return;
    }

    filtered.forEach(order => {
        const card = document.createElement("div");
        card.className = "order-card";

        let itemsHTML = "";
        if (Array.isArray(order.items)) {
            order.items.forEach(item => {
                const itemTotal = Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1);
                itemsHTML += `
                    <div class="item-row">
                        <span>${escapeHTML(item.itemName || item.name || "Item")} × ${item.quantity}</span>
                        <strong>Rs. ${itemTotal.toFixed(2)}</strong>
                    </div>
                `;
            });
        }

        const dateFormatted = formatDate(order.orderDate);
        const timeFormatted = formatTime(order.orderTime);
        const pickupSlot = order.pickupSlot || "Morning";
        const pickupTimeFormatted = formatPickupTime12(order.pickupTime || "08:30");

        let actionButtonsHTML = "";
        if (currentTab === "Pending") {
            actionButtonsHTML = `
                <div class="order-actions">
                    <button class="reject-btn" onclick="rejectOrder(${order.orderId}, '${escapeHTML(order.orderCode)}')">
                        Reject
                    </button>
                    <button class="accept-btn" onclick="acceptOrder(${order.orderId})">
                        Accept Order
                    </button>
                </div>
            `;
        } else {
            actionButtonsHTML = `
                <div class="order-actions">
                    <button class="pay-btn" onclick="completeOrder(${order.orderId}, '${escapeHTML(order.orderCode)}')">
                        Paid & Completed
                    </button>
                </div>
            `;
        }

        const queueBadge = (currentTab === "Accepted")
            ? `<div class="status-badge-queue">In Queue / Ready for Pickup</div>`
            : "";

        const slotClass = pickupSlot.toLowerCase();

        card.innerHTML = `
            <div class="order-header">
                <div>
                    <h2>${escapeHTML(order.orderCode)}</h2>
                    <span>Student: <strong>${escapeHTML(order.fullName || "")}</strong> (Index: ${escapeHTML(order.indexNumber || "")})</span>
                    <div class="order-badges-row">
                        ${queueBadge}
                        <div class="pickup-schedule-pill pill-${slotClass}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>Pickup: <strong>${escapeHTML(pickupSlot)} (${pickupTimeFormatted})</strong></span>
                        </div>
                    </div>
                </div>
                <span class="order-type">${escapeHTML(order.orderType)}</span>
            </div>

            <div class="order-info">
                <div>
                    <span>Items</span>
                    <strong>${Array.isArray(order.items) ? order.items.length : 0}</strong>
                </div>
                <div>
                    <span>Order Date</span>
                    <strong>${dateFormatted}</strong>
                </div>
                <div>
                    <span>Placed Time</span>
                    <strong>${timeFormatted}</strong>
                </div>
                <div class="pickup-target-col">
                    <span>Scheduled Pickup</span>
                    <strong style="color: #ea580c;">${escapeHTML(pickupSlot)} &bull; ${pickupTimeFormatted}</strong>
                </div>
            </div>

            <div class="items-section">
                <h3>Order Items</h3>
                ${itemsHTML}
            </div>

            <div class="order-bottom" style="margin-top:15px; padding-top:12px; border-top:1px solid #e5e7eb;">
                <strong class="total" style="font-size:16px;">
                    Total: Rs. ${Number(order.totalAmount).toFixed(2)}
                </strong>
                ${actionButtonsHTML}
            </div>
        `;

        container.appendChild(card);
    });
}

// =====================================
// ACCEPT ORDER
// =====================================

function acceptOrder(orderId) {
    const formData = new URLSearchParams();
    formData.append("orderId", orderId);

    fetch("accept-order", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            loadAllOrders();
        } else {
            alert(result.message || "Could not accept order.");
        }
    })
    .catch(err => {
        console.error("Accept order error:", err);
        alert("Failed to accept order.");
    });
}

// =====================================
// REJECT ORDER
// =====================================

function rejectOrder(orderId, orderCode) {
    const defaultReason = "Not available in this moment";
    const reason = prompt(
        `Are you sure you want to REJECT order ${orderCode || ""}?\n\nEnter reason for rejection:`,
        defaultReason
    );

    if (reason === null) {
        return; // User canceled
    }

    const formData = new URLSearchParams();
    formData.append("orderId", orderId);
    formData.append("reason", reason.trim() || defaultReason);

    fetch("reject-order", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            alert(`Order rejected. Student has been notified: "${reason.trim() || defaultReason}"`);
            loadAllOrders();
        } else {
            alert(result.message || "Could not reject order.");
        }
    })
    .catch(err => {
        console.error("Reject order error:", err);
        alert("Failed to reject order.");
    });
}

// =====================================
// COMPLETE ORDER (PAID & PICKED UP)
// =====================================

function completeOrder(orderId, orderCode) {
    const confirmed = confirm(
        `Confirm that student has PAID the cash/amount and picked up order ${orderCode || ""}?\n\nMark this order as Paid & Completed?`
    );

    if (!confirmed) {
        return;
    }

    const formData = new URLSearchParams();
    formData.append("orderId", orderId);

    fetch("complete-order", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            alert("Order successfully marked as Paid & Completed!");
            loadAllOrders();
        } else {
            alert(result.message || "Could not complete order.");
        }
    })
    .catch(err => {
        console.error("Complete order error:", err);
        alert("Failed to complete order.");
    });
}

// =====================================
// HELPERS
// =====================================

function formatDate(dateString) {
    if (!dateString) return "—";
    const d = new Date(dateString + "T00:00:00");
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(timeString) {
    if (!timeString) return "—";
    const parts = timeString.split(":");
    if (parts.length >= 2) {
        let hour = parseInt(parts[0]);
        const minute = parts[1];
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${minute} ${ampm}`;
    }
    return timeString;
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function goDashboard() {
    window.location.href = "staff-dashboard.html";
}


// =====================================
// LIVE CANTEEN QUEUE QUICK SWITCHER
// =====================================

function highlightPqButtons(level, wait) {
    const btnLow = document.getElementById("pqBtnLow");
    const btnMedium = document.getElementById("pqBtnMedium");
    const btnHigh = document.getElementById("pqBtnHigh");
    const dot = document.getElementById("pqDot");
    const currentText = document.getElementById("pqCurrentText");

    if (btnLow) btnLow.classList.remove("active");
    if (btnMedium) btnMedium.classList.remove("active");
    if (btnHigh) btnHigh.classList.remove("active");

    if (level === "High") {
        if (btnHigh) btnHigh.classList.add("active");
        if (dot) dot.textContent = "●";
        if (currentText) {
            currentText.textContent = "Heavy Rush (~" + (wait || 25) + "m wait)";
            currentText.style.color = "#dc2626";
            currentText.style.background = "#fef2f2";
            currentText.style.borderColor = "#fecaca";
        }
    } else if (level === "Medium") {
        if (btnMedium) btnMedium.classList.add("active");
        if (dot) dot.textContent = "●";
        if (currentText) {
            currentText.textContent = "Moderate Crowd (~" + (wait || 12) + "m wait)";
            currentText.style.color = "#d97706";
            currentText.style.background = "#fffbeb";
            currentText.style.borderColor = "#fef08a";
        }
    } else {
        if (btnLow) btnLow.classList.add("active");
        if (dot) dot.textContent = "●";
        if (currentText) {
            currentText.textContent = "Low Queue (~" + (wait || 5) + "m wait)";
            currentText.style.color = "#059669";
            currentText.style.background = "#ecfdf5";
            currentText.style.borderColor = "#a7f3d0";
        }
    }
}

async function loadPendingQueueStatus() {
    try {
        const res = await fetch("/CantinWeb/canteen-queue?t=" + Date.now());
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                highlightPqButtons(data.queueLevel, data.estimatedWait);
            }
        }
    } catch (e) {
        console.warn("Could not load queue status:", e);
    }
}

async function updateStaffQueue(level) {
    const toast = document.getElementById("pqToast");
    if (toast) toast.textContent = "Updating...";

    try {
        const formData = new URLSearchParams();
        formData.append("queueLevel", level);

        const res = await fetch("/CantinWeb/canteen-queue", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            highlightPqButtons(data.queueLevel, data.estimatedWait);
            if (toast) {
                toast.textContent = "Updated to " + data.queueLevel + "!";
                setTimeout(() => { if (toast) toast.textContent = ""; }, 3000);
            }
        }
    } catch (err) {
        if (toast) toast.textContent = "Error updating";
    }
}