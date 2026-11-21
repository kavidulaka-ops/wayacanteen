// ==========================================================================
// CANTEEN LIVE QUEUE STATUS (Public & Logged-in real-time updater)
// ==========================================================================

function updateLiveQueueUI(data) {
    if (!data || !data.success) return;

    const level = data.queueLevel || "Low";
    const wait = data.estimatedWait || 5;
    const note = data.note || "Normal queue";
    const orders = data.activeQueueOrders !== undefined ? data.activeQueueOrders : 0;

    // Badges & text on index.html
    const badge = document.getElementById("liveLevelBadge");
    const badgeIcon = document.getElementById("badgeIcon");
    const badgeText = document.getElementById("badgeText");
    const liveDot = document.getElementById("liveDot");
    const liveNote = document.getElementById("liveNote");
    const metricWait = document.getElementById("metricWait");
    const metricOrders = document.getElementById("metricOrders");

    if (badge && badgeText && badgeIcon) {
        badge.className = "live-badge";
        if (liveDot) liveDot.className = "live-pulse-dot";

        if (level.toLowerCase() === "high") {
            badge.classList.add("level-high");
            if (liveDot) liveDot.classList.add("dot-high");
            badgeIcon.textContent = "●";
            badgeText.textContent = "Heavy Rush";
        } else if (level.toLowerCase() === "medium") {
            badge.classList.add("level-medium");
            if (liveDot) liveDot.classList.add("dot-medium");
            badgeIcon.textContent = "●";
            badgeText.textContent = "Moderate Crowd";
        } else {
            badge.classList.add("level-low");
            badgeIcon.textContent = "●";
            badgeText.textContent = "Low Queue";
        }
    }

    if (liveNote) {
        liveNote.textContent = note;
    }

    if (metricWait) {
        metricWait.textContent = `~${wait} mins`;
    }

    if (metricOrders) {
        metricOrders.textContent = orders;
    }

    // If home.html compact pill exists
    const homePill = document.getElementById("homeQueuePill");
    if (homePill) {
        let pillClass = "home-queue-low";
        let text = "Low Queue";
        if (level.toLowerCase() === "high") {
            pillClass = "home-queue-high";
            text = "Heavy Rush";
        } else if (level.toLowerCase() === "medium") {
            pillClass = "home-queue-medium";
            text = "Moderate Crowd";
        }
        homePill.className = `home-queue-pill ${pillClass}`;
        homePill.innerHTML = `<span class="pill-live-tag">LIVE</span> <span class="pill-dot"></span> <span class="pill-status-text">${text}</span> <span class="pill-clock-svg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span> <span class="pill-wait-text">Wait: ~${wait} mins</span>`;
    }
}

async function fetchLiveQueueStatus(showAnimation = false) {
    const refreshBtn = document.getElementById("liveRefreshBtn");
    if (showAnimation && refreshBtn) {
        refreshBtn.classList.add("spinning");
    }

    try {
        const response = await fetch("/CantinWeb/canteen-queue?t=" + Date.now());
        if (response.ok) {
            const data = await response.json();
            updateLiveQueueUI(data);
        }
    } catch (err) {
        console.warn("Could not fetch canteen queue:", err);
    } finally {
        if (showAnimation && refreshBtn) {
            setTimeout(() => refreshBtn.classList.remove("spinning"), 600);
        }
    }
}

// Initial fetch on load & polling every 10s
document.addEventListener("DOMContentLoaded", function () {
    fetchLiveQueueStatus(false);
    setInterval(() => fetchLiveQueueStatus(false), 10000);

    const refreshBtn = document.getElementById("liveRefreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => fetchLiveQueueStatus(true));
    }
});
