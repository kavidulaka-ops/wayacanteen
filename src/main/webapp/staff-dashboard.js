// =====================================
// CANTIN STAFF DASHBOARD
// =====================================


// =====================================
// OPEN ORDERS
// =====================================

function openOrders() {

    window.location.href =
        "pending-orders.html";

}


// =====================================
// SCAN QR
// =====================================
function scanQR() {
    window.location.href = "qr-scanner.html";
}

// =====================================
// ORDER HISTORY
// =====================================

function orderHistory() {
    window.location.href = "order-history.html";
}


// =====================================
// LOGOUT
// =====================================

function logout() {

    window.location.href =
        "staff-login.html";

}

function openActiveQueue() {
    window.location.href = "pending-orders.html?tab=Accepted";
}

// =====================================
// LIVE CANTEEN QUEUE CONTROL (Staff)
// =====================================

let currentStaffQueueLevel = "Low";

function highlightQueueButtons(level, wait, updatedAt) {
    currentStaffQueueLevel = level;

    const btnLow = document.getElementById("btnQueueLow");
    const btnMedium = document.getElementById("btnQueueMedium");
    const btnHigh = document.getElementById("btnQueueHigh");

    const statusDot = document.getElementById("staffStatusDot");
    const currentText = document.getElementById("staffCurrentLevelText");
    const currentWait = document.getElementById("staffCurrentWait");
    const lastUpdated = document.getElementById("queueLastUpdated");

    if (btnLow) btnLow.classList.remove("active");
    if (btnMedium) btnMedium.classList.remove("active");
    if (btnHigh) btnHigh.classList.remove("active");

    let dot = "●";
    let text = "Low Queue";

    if (level === "High") {
        if (btnHigh) btnHigh.classList.add("active");
        dot = "●";
        text = "Heavy Rush";
    } else if (level === "Medium") {
        if (btnMedium) btnMedium.classList.add("active");
        dot = "●";
        text = "Moderate Crowd";
    } else {
        if (btnLow) btnLow.classList.add("active");
        dot = "●";
        text = "Low Queue";
    }

    if (statusDot) statusDot.textContent = dot;
    if (currentText) currentText.textContent = text;
    if (currentWait && wait) currentWait.textContent = wait;
    if (lastUpdated && updatedAt) {
        lastUpdated.textContent = "Last updated: " + updatedAt;
    }
}

async function loadStaffQueueStatus() {
    try {
        const res = await fetch("/CantinWeb/canteen-queue?t=" + Date.now());
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                highlightQueueButtons(data.queueLevel, data.estimatedWait, data.updatedAt);
            }
        }
    } catch (e) {
        console.warn("Failed to load queue status:", e);
    }
}

async function setQueueLevel(level) {
    const toast = document.getElementById("queueUpdateToast");
    if (toast) {
        toast.style.display = "block";
        toast.textContent = "Updating queue to " + level + "...";
        toast.style.background = "#eff6ff";
        toast.style.borderColor = "#bfdbfe";
        toast.style.color = "#1d4ed8";
    }

    try {
        const formData = new URLSearchParams();
        formData.append("queueLevel", level);

        const res = await fetch("/CantinWeb/canteen-queue", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            highlightQueueButtons(data.queueLevel, data.estimatedWait, "Just now");
            if (toast) {
                toast.textContent = "Canteen rush status set to " + data.queueLevel + " (~" + data.estimatedWait + "m wait). Students and visitors will see this in real time!";
                toast.style.background = "#ecfdf5";
                toast.style.borderColor = "#a7f3d0";
                toast.style.color = "#065f46";
                setTimeout(() => { toast.style.display = "none"; }, 4500);
            }
        } else {
            if (toast) {
                toast.textContent = "Error: " + (data.message || "Failed to update queue");
                toast.style.background = "#fef2f2";
                toast.style.borderColor = "#fecaca";
                toast.style.color = "#b91c1c";
            }
        }
    } catch (err) {
        if (toast) {
            toast.textContent = "Network error: Unable to update queue status";
            toast.style.background = "#fef2f2";
            toast.style.borderColor = "#fecaca";
            toast.style.color = "#b91c1c";
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    loadStaffQueueStatus();
});

function openHelpCenter() {
    window.location.href = "staff-help-center.html";
}

// =====================================
// REAL-TIME DASHBOARD COUNTS
// =====================================

async function loadStaffDashboardStats() {
    try {
        const res = await fetch("/CantinWeb/staff-stats?t=" + Date.now());
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                const elPending = document.getElementById("statPendingOrders");
                const elAccepted = document.getElementById("statAcceptedToday");
                const elFood = document.getElementById("statFoodOrders");
                const elStationery = document.getElementById("statStationeryOrders");

                if (elPending) elPending.textContent = data.pendingOrders ?? 0;
                if (elAccepted) elAccepted.textContent = data.acceptedToday ?? 0;
                if (elFood) elFood.textContent = data.foodOrders ?? 0;
                if (elStationery) elStationery.textContent = data.stationeryOrders ?? 0;
            }
        }
    } catch (err) {
        console.warn("Failed to load staff stats:", err);
    }
}

function openOrdersWithFilter(type) {
    window.location.href = "pending-orders.html?filter=" + encodeURIComponent(type);
}

document.addEventListener("DOMContentLoaded", function () {
    loadStaffDashboardStats();
    setInterval(loadStaffDashboardStats, 5000);
});
function openFoodManagement() {
    window.location.href = "staff-food.html";
}

function openStationeryManagement() {
    window.location.href = "staff-stationery.html";
}