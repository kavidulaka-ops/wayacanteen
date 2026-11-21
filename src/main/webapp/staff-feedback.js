// ==========================================================================
// WAYACANTEEN STAFF FEEDBACK MANAGEMENT JS
// ==========================================================================

let filterRating = "All";
let filterCategory = "All";
let filterStatus = "All";

function goDashboard() {
    window.location.href = "staff-dashboard.html";
}

function setRatingFilter(rating) {
    filterRating = rating;
    updatePillStyles("#ratingFilterWrap .f-pill", rating);
    loadFeedbackData();
}

function setCategoryFilter(cat) {
    filterCategory = cat;
    updatePillStyles("#categoryFilterWrap .f-pill", cat);
    loadFeedbackData();
}

function setStatusFilter(status) {
    filterStatus = status;
    updatePillStyles("#statusFilterWrap .f-pill", status);
    loadFeedbackData();
}

function updatePillStyles(selector, activeValue) {
    const pills = document.querySelectorAll(selector);
    pills.forEach(p => {
        const text = p.textContent.trim();
        if (text === activeValue ||
            (activeValue === "All" && text.startsWith("All")) ||
            (activeValue === "5" && text === "5 Stars") ||
            (activeValue === "4" && text === "4 Stars") ||
            (activeValue === "3" && text === "3 Stars") ||
            (activeValue === "2" && text === "2 Stars") ||
            (activeValue === "1" && text === "1 Star") ||
            (activeValue === "New" && text === "New Only") ||
            (activeValue === "Reviewed" && text === "Reviewed Only")) {
            p.classList.add("active");
        } else {
            p.classList.remove("active");
        }
    });
}

function loadFeedbackData() {
    const container = document.getElementById("feedbackListContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="feedback-loading-state">
            <div class="spinner"></div>
            <p>Loading student feedbacks...</p>
        </div>
    `;

    const url = `staff-feedback-data?rating=${encodeURIComponent(filterRating)}&category=${encodeURIComponent(filterCategory)}&status=${encodeURIComponent(filterStatus)}&_t=${Date.now()}`;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(data => {
            // 1. Update KPI stats
            if (data.stats) {
                const totalEl = document.getElementById("statTotalFeedback");
                const avgEl = document.getElementById("statAvgRating");
                const star5El = document.getElementById("statStar5");
                const newEl = document.getElementById("statNewFeedback");

                if (totalEl) totalEl.textContent = data.stats.totalCount;
                if (avgEl) avgEl.textContent = data.stats.avgRating;
                if (star5El) star5El.textContent = data.stats.star5;
                if (newEl) newEl.textContent = data.stats.newCount;
            }

            // 2. Render List Items
            renderFeedbackItems(data.items || []);
        })
        .catch(err => {
            console.error("Error loading feedbacks:", err);
            container.innerHTML = `
                <div class="feedback-empty-state">
                    <h3>Could Not Load Feedbacks</h3>
                    <p>Please verify database connection or retry.</p>
                </div>
            `;
        });
}

function renderFeedbackItems(items) {
    const container = document.getElementById("feedbackListContainer");
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="feedback-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <h3>No Feedbacks Found</h3>
                <p>No student feedbacks match the selected filter criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    items.forEach(fb => {
        const isNew = (fb.status || "").toLowerCase() === "new";
        const card = document.createElement("div");
        card.className = `feedback-item-card ${isNew ? 'is-new' : 'is-reviewed'}`;

        const starsHtml = renderStars(fb.rating);
        const formattedDate = formatTimestamp(fb.createdAt);

        card.innerHTML = `
            <div class="fb-card-header">
                <div class="fb-student-meta">
                    <span class="fb-student-name">${escapeHtml(fb.studentName || 'Student')}</span>
                    ${fb.indexNumber ? `<span class="fb-student-index">Index: ${escapeHtml(fb.indexNumber)}</span>` : '<span class="fb-student-index">Identity: Confidential</span>'}
                </div>
                <div class="fb-badges-col">
                    <span class="badge-cat">${escapeHtml(fb.category || 'General')}</span>
                    ${fb.orderCode ? `<span class="badge-order">Order: ${escapeHtml(fb.orderCode)}</span>` : ''}
                    <span class="${isNew ? 'badge-status-new' : 'badge-status-reviewed'}">${isNew ? 'New' : 'Reviewed'}</span>
                </div>
            </div>

            <div class="fb-stars-row">
                ${starsHtml}
                <span class="fb-rating-score">${fb.rating} / 5</span>
                <span class="fb-timestamp">${formattedDate}</span>
            </div>

            <div class="fb-text-body">
                ${escapeHtml(fb.feedbackText)}
            </div>

            <div class="fb-card-actions">
                ${isNew ? `
                    <button type="button" class="btn-action-review" onclick="markReviewed(${fb.feedbackId})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Mark as Reviewed</span>
                    </button>
                ` : ''}
                <button type="button" class="btn-action-delete" onclick="deleteFeedback(${fb.feedbackId})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Delete</span>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

function renderStars(rating) {
    let html = "";
    const count = parseInt(rating, 10) || 5;
    for (let i = 1; i <= 5; i++) {
        if (i <= count) {
            html += `<svg class="fb-star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        } else {
            html += `<svg class="fb-star-svg" viewBox="0 0 24 24" style="fill:none; stroke:#cbd5e1; color:#cbd5e1;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        }
    }
    return html;
}

function formatTimestamp(dateStr) {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr.replace(" ", "T"));
        if (isNaN(d.getTime())) return dateStr;

        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return d.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateStr;
    }
}

function markReviewed(id) {
    const params = new URLSearchParams();
    params.append("action", "review");
    params.append("feedbackId", id);

    fetch("staff-feedback-data", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.success) {
            loadFeedbackData();
        } else {
            alert(data.message || "Could not update status.");
        }
    })
    .catch(err => {
        console.error("Mark reviewed error:", err);
        alert("Network error.");
    });
}

function deleteFeedback(id) {
    if (!confirm("Are you sure you want to delete this student review?")) return;

    const params = new URLSearchParams();
    params.append("action", "delete");
    params.append("feedbackId", id);

    fetch("staff-feedback-data", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.success) {
            loadFeedbackData();
        } else {
            alert(data.message || "Could not delete feedback.");
        }
    })
    .catch(err => {
        console.error("Delete error:", err);
        alert("Network error.");
    });
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

document.addEventListener("DOMContentLoaded", function () {
    loadFeedbackData();
});
