// =========================================
// CANTIN HOME PAGE
// =========================================

// Food
function openFood() {
    window.location.href = "food.html";
}

// Stationery
function openStationery() {
    window.location.href = "stationery.html";
}

// Finance
function openFinance() {
    window.location.href = "finance.html";
}

// Help Center
function openHelp() {
    window.location.href = "help-center.html";
}

// Student Feedback
function openFeedback() {
    window.location.href = "feedback.html";
}

// =========================================
// NOTIFICATIONS CONTROLLER
// =========================================
let cachedNotifications = [];

function initNotifications() {
    const notifBtn = document.getElementById("notificationBtn");
    const notifBox = document.getElementById("notificationBox");
    const notifCloseBtn = document.getElementById("notifCloseBtn");
    const notifBadge = document.getElementById("notificationBadge");
    const notifCountPill = document.getElementById("notifCountPill");
    const notifList = document.getElementById("notificationList");

    if (!notifBtn || !notifBox) return;

    // Toggle box
    notifBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const isOpen = notifBox.classList.toggle("open");

        if (isOpen) {
            // Mark top order ID as seen
            if (cachedNotifications.length > 0) {
                const latestId = cachedNotifications[0].orderId || 0;
                localStorage.setItem("cantinLastSeenOrderId", latestId);
            }
            if (notifBadge) {
                notifBadge.style.display = "none";
            }
        }
    });

    // Close button
    if (notifCloseBtn) {
        notifCloseBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            notifBox.classList.remove("open");
        });
    }

    // Close on click outside
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".notification-wrapper")) {
            notifBox.classList.remove("open");
        }
    });

    // Prevent clicks inside box from closing
    notifBox.addEventListener("click", function (e) {
        e.stopPropagation();
    });

    function renderEmptyOrLoginNotice() {
        if (!notifList) return;
        notifList.innerHTML = `
            <div class="notif-empty">
                <span class="notif-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></span>
                <strong>No active notifications</strong>
                <span>Log in to track your order acceptance and status updates.</span>
            </div>
        `;
        if (notifCountPill) notifCountPill.textContent = "0 Updates";
        if (notifBadge) notifBadge.style.display = "none";
    }

    // Fetch notifications function
    function fetchNotifications() {
        fetch("/CantinWeb/student-notifications?_t=" + Date.now())
            .then(res => {
                if (res.status === 401) {
                    renderEmptyOrLoginNotice();
                    return null;
                }
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(data => {
                if (!data) return;
                if (!data.success || !Array.isArray(data.notifications)) {
                    renderNotificationList([]);
                    return;
                }

                cachedNotifications = data.notifications;
                renderNotificationList(cachedNotifications);
            })
            .catch(err => {
                console.warn("Could not load notifications:", err);
            });
    }

    function renderNotificationList(notifications) {
        if (!notifList) return;

        if (notifications.length === 0) {
            notifList.innerHTML = `
                <div class="notif-empty">
                    <span class="notif-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></span>
                    <strong>No notifications yet</strong>
                    <span>When staff accepts or rejects your orders, updates will appear here.</span>
                </div>
            `;
            if (notifCountPill) notifCountPill.textContent = "0 Updates";
            if (notifBadge) notifBadge.style.display = "none";
            return;
        }

        const lastSeenId = Number(localStorage.getItem("cantinLastSeenOrderId")) || 0;
        let unreadCount = 0;

        let html = "";
        notifications.forEach(item => {
            const status = (item.status || "").toLowerCase();
            const isUnread = item.orderId > lastSeenId;
            if (isUnread) unreadCount++;

            let icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
            let pillClass = "pending";
            let pillText = item.status || "Pending";
            let reasonHtml = "";

            if (status === "rejected") {
                icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                pillClass = "rejected";
                pillText = "Rejected";
                const reason = item.rejectionReason || "Not available in this moment";
                reasonHtml = `
                    <div class="notif-reason-box">
                        <span>Notice:</span>
                        <span>Reason: <strong>${escapeHtml(reason)}</strong></span>
                    </div>
                `;
            } else if (status === "accepted") {
                icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                pillClass = "accepted";
                pillText = "Accepted";
            } else if (status === "completed") {
                icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                pillClass = "completed";
                pillText = "Completed";
            }

            html += `
                <div class="notif-item ${pillClass}" onclick="window.location.href='student-order-history.html'">
                    <div class="notif-item-top">
                        <span class="notif-code">${escapeHtml(item.orderCode || "")}</span>
                        <span class="notif-pill">${pillText}</span>
                    </div>
                    <div class="notif-item-title">
                        <span>${icon}</span>
                        <span>${escapeHtml(item.title || "Order Update")}</span>
                    </div>
                    <div class="notif-item-msg">${escapeHtml(item.message || "")}</div>
                    ${reasonHtml}
                    <div class="notif-time">${escapeHtml(item.time || "")}</div>
                </div>
            `;
        });

        notifList.innerHTML = html;

        if (notifCountPill) {
            notifCountPill.textContent = `${notifications.length} Updates`;
        }

        // Show badge if there are unread updates
        if (notifBadge) {
            if (unreadCount > 0) {
                notifBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
                notifBadge.style.display = "flex";
            } else {
                notifBadge.style.display = "none";
            }
        }
    }

    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial fetch
    fetchNotifications();

    // Auto-refresh every 10 seconds for real-time notification alerts
    setInterval(fetchNotifications, 10000);
}

document.addEventListener("DOMContentLoaded", initNotifications);

// =========================================
// ORDER HISTORY
// =========================================
function openOrderHistory() {
    window.location.href = "student-order-history.html";
}

// Load My Orders Count
document.addEventListener("DOMContentLoaded", function () {
    const orderCountElement = document.getElementById("orderCount");

    fetch("/CantinWeb/my-order-count")
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error: " + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (orderCountElement && typeof data.count === "number") {
                orderCountElement.textContent = data.count;
            }
        })
        .catch(error => {
            console.error("My Orders loading error:", error);
        });
});

// Load Monthly Spending
document.addEventListener("DOMContentLoaded", function () {
    const amountElement = document.getElementById("thisMonthAmount");

    if (!amountElement) {
        return;
    }

    fetch("/CantinWeb/finance-data")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load monthly spending");
            }
            return response.json();
        })
        .then(data => {
            if (data.monthlyTotal !== undefined && data.monthlyTotal !== null) {
                const amount = Number(data.monthlyTotal);

                if (Number.isFinite(amount)) {
                    amountElement.textContent =
                        "Rs. " + amount.toLocaleString("en-LK", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });
                }
            }
        })
        .catch(error => {
            console.error("Monthly spending error:", error);
        });
});

// =========================================
// LOAD LOGGED-IN STUDENT INFO (HEADER & WELCOME)
// =========================================
document.addEventListener("DOMContentLoaded", function () {
    const studentEmailEl = document.getElementById("headerStudentEmail");
    const studentIndexEl = document.getElementById("headerStudentIndex");
    const avatarEl = document.getElementById("profileAvatar");
    const welcomeHeadingEl = document.getElementById("welcomeUserHeading");

    function updateStudentUI(data) {
        if (!data) return;

        const email = data.email || data.fullName || "student@gmail.com";
        const index = data.indexNumber || "-";
        const name = data.fullName || "Student";

        if (studentEmailEl) {
            studentEmailEl.textContent = email;
            studentEmailEl.title = email;
        }
        if (studentIndexEl) {
            studentIndexEl.textContent = "Index No: " + index;
        }
        if (avatarEl) {
            const initial = (name || email).trim().charAt(0).toUpperCase();
            avatarEl.textContent = initial || "S";
        }
        if (welcomeHeadingEl) {
            welcomeHeadingEl.textContent = "Hello, " + name + "!";
        }
    }

    // Try to load cached values immediately
    const cachedStudent = sessionStorage.getItem("currentStudent");
    if (cachedStudent) {
        try {
            updateStudentUI(JSON.parse(cachedStudent));
        } catch (e) {}
    }

    // Fetch live session data from servlet
    fetch("current-student")
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.loggedIn) {
                updateStudentUI(data);
                sessionStorage.setItem("currentStudent", JSON.stringify(data));
            }
        })
        .catch(err => {
            console.warn("Could not load current student session:", err);
        });
});


// =========================================
// COMMUNITY HELP REQUESTS (Home Page)
// =========================================
function renderHomeHelpCards(requests) {
    const grid = document.getElementById("homeHelpGrid");
    if (!grid) return;

    if (!requests || requests.length === 0) {
        grid.innerHTML = `
            <div class="home-help-empty">
                <span class="empty-emoji"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
                <div>
                    <h4>All Student Requests Are Currently Fulfilled!</h4>
                    <p>There are no open assistance requests right now. In need of support yourself? You can submit a request 100% anonymously.</p>
                </div>
                <button class="home-req-btn" onclick="openHelp()" type="button">Submit Anonymous Request →</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = requests.map(req => {
        const isFunded = req.status === "Funded" || req.percentage >= 100;
        return `
            <div class="home-help-card ${isFunded ? 'is-funded' : ''}" onclick="window.location.href='help-center.html'">
                <div class="home-card-top">
                    <span class="home-cat-badge">${escapeHtmlHome(req.category)}</span>
                    <span class="home-ref-badge">#${escapeHtmlHome(req.referenceCode)}</span>
                </div>

                <div class="home-anon-meta">
                    <span>Anonymous Student · ${escapeHtmlHome(req.createdAt)}</span>
                </div>

                <h3 class="home-req-title">${escapeHtmlHome(req.subject)}</h3>
                <p class="home-req-desc">${escapeHtmlHome(req.message)}</p>

                <!-- Progress Bar -->
                <div class="home-progress-container">
                    <div class="home-progress-labels">
                        <span class="progress-title">Fundraising Progress</span>
                        <span class="home-pct-pill">${req.percentage}% Funded</span>
                    </div>
                    <div class="home-progress-track">
                        <div class="home-progress-fill" style="width: ${req.percentage}%;"></div>
                    </div>
                    <div class="home-progress-numbers">
                        <span class="home-raised">Raised: <strong>Rs. ${req.collectedAmount}</strong></span>
                        <span class="home-target">Goal: Rs. ${req.targetAmount} (Left: Rs. ${req.remainingAmount})</span>
                    </div>
                </div>

                <div class="home-help-action-row">
                    ${isFunded ? `
                        <span class="home-funded-tag">100% Target Reached!</span>
                    ` : `
                        <span class="home-counter-hint">Mention <strong>#${escapeHtmlHome(req.referenceCode)}</strong> at counter to donate</span>
                    `}
                    <span class="home-card-arrow">Details →</span>
                </div>
            </div>
        `;
    }).join("");
}

function escapeHtmlHome(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function loadHomeHelpRequests() {
    const grid = document.getElementById("homeHelpGrid");
    if (!grid) return;

    try {
        const res = await fetch("/CantinWeb/help-requests?type=public&t=" + Date.now());
        if (res.ok) {
            const data = await res.json();
            const requests = Array.isArray(data) ? data.slice(0, 3) : [];
            renderHomeHelpCards(requests);
        }
    } catch (e) {
        console.warn("Could not load home help requests:", e);
    }
}

document.addEventListener("DOMContentLoaded", loadHomeHelpRequests);