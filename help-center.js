// ==========================================================================
// CANTIN ANONYMOUS HELP CENTER - CLIENT LOGIC
// ==========================================================================

let allPublicRequests = [];
let currentCategoryFilter = "All";

document.addEventListener("DOMContentLoaded", function () {
    const hash = window.location.hash;
    if (hash === "#submit") {
        switchHelpTab('submit');
    } else if (hash === "#track") {
        switchHelpTab('track');
    } else {
        loadBoardRequests();
    }
});

// ================= TABS SWITCHER =================
function switchHelpTab(tab) {
    const tabBtnBoard = document.getElementById("tabBtnBoard");
    const tabBtnSubmit = document.getElementById("tabBtnSubmit");
    const tabBtnTrack = document.getElementById("tabBtnTrack");

    const contentBoard = document.getElementById("tabContentBoard");
    const contentSubmit = document.getElementById("tabContentSubmit");
    const contentTrack = document.getElementById("tabContentTrack");

    tabBtnBoard.classList.remove("active");
    tabBtnSubmit.classList.remove("active");
    tabBtnTrack.classList.remove("active");

    contentBoard.style.display = "none";
    contentSubmit.style.display = "none";
    contentTrack.style.display = "none";

    if (tab === "submit") {
        tabBtnSubmit.classList.add("active");
        contentSubmit.style.display = "block";
    } else if (tab === "track") {
        tabBtnTrack.classList.add("active");
        contentTrack.style.display = "block";
    } else {
        tabBtnBoard.classList.add("active");
        contentBoard.style.display = "block";
        loadBoardRequests();
    }
}

// ================= LOAD COMMUNITY REQUESTS =================
async function loadBoardRequests() {
    const grid = document.getElementById("requestsGrid");
    const badge = document.getElementById("boardCountBadge");

    try {
        const response = await fetch("/CantinWeb/help-requests?type=public&t=" + Date.now());
        if (response.ok) {
            const data = await response.json();
            allPublicRequests = Array.isArray(data) ? data : [];
            if (badge) badge.textContent = allPublicRequests.length;
            renderBoardRequests();
        } else {
            grid.innerHTML = `<div class="empty-state"><p>Unable to load requests at this moment.</p></div>`;
        }
    } catch (err) {
        console.error("Error loading board requests:", err);
        grid.innerHTML = `<div class="empty-state"><p>Unable to load requests. Please check connection.</p></div>`;
    }
}

function filterBoardCategory(cat) {
    currentCategoryFilter = cat;

    // Update active pill
    document.querySelectorAll(".cat-pill").forEach(pill => {
        pill.classList.remove("active");
        if (pill.textContent.includes(cat) || (cat === "All" && pill.textContent.includes("All"))) {
            pill.classList.add("active");
        }
    });

    renderBoardRequests();
}

function renderBoardRequests() {
    const grid = document.getElementById("requestsGrid");
    if (!grid) return;

    let filtered = allPublicRequests;
    if (currentCategoryFilter !== "All") {
        filtered = allPublicRequests.filter(r => r.category && r.category.toLowerCase() === currentCategoryFilter.toLowerCase());
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 24px; margin-bottom: 10px;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                <h3 style="font-size: 16px; margin-bottom: 6px; color: #0f172a;">No Active Requests in this Category</h3>
                <p style="color: #64748b; font-size: 13px;">There are currently no open support requests. Students in need can submit one anytime!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(req => {
        const isFunded = req.status === "Funded" || req.percentage >= 100;
        const catClass = getCategoryClass(req.category);
        const catEmoji = getCategoryEmoji(req.category);

        return `
            <div class="request-card ${isFunded ? 'is-funded' : ''}">
                <div>
                    <div class="card-top">
                        <span class="category-tag ${catClass}">
                            ${escapeHtml(req.category)}
                        </span>
                        <span class="ref-pill">#${escapeHtml(req.referenceCode)}</span>
                    </div>

                    <div class="requester-anon-row">
                        <span>Anonymous Fellow Student · ${escapeHtml(req.createdAt)}</span>
                    </div>

                    <h3 class="request-title">${escapeHtml(req.subject)}</h3>
                    <p class="request-desc">${escapeHtml(req.message)}</p>

                    <!-- PROGRESS BAR -->
                    <div class="progress-section">
                        <div class="progress-header">
                            <span style="font-size: 13px; font-weight: 700; color: #475569;">Fundraising Progress</span>
                            <span class="progress-pct-badge">${req.percentage}% Funded</span>
                        </div>
                        <div class="progress-track" title="${req.percentage}% raised">
                            <div class="progress-fill" style="width: ${req.percentage}%;"></div>
                        </div>
                        <div class="progress-numbers-row">
                            <span class="collected">Raised: <strong>Rs. ${req.collectedAmount}</strong></span>
                            <span class="remaining">Goal: Rs. ${req.targetAmount} (Left: Rs. ${req.remainingAmount})</span>
                        </div>
                    </div>
                </div>

                ${isFunded ? `
                    <div class="funded-banner">
                        100% Fully Funded! Ready for counter collection.
                    </div>
                ` : `
                    <div class="card-help-footer">
                        <strong>Want to help this student?</strong>
                        <span>Visit the canteen counter and say: <em>"I want to contribute for <strong>#${escapeHtml(req.referenceCode)}</strong>"</em>. Any amount is appreciated!</span>
                    </div>
                `}
            </div>
        `;
    }).join("");
}

// ================= SUBMIT ANONYMOUS REQUEST =================
async function submitHelpRequest(event) {
    event.preventDefault();

    const category = document.getElementById("reqCategory").value;
    const subject = document.getElementById("reqSubject").value;
    const targetAmount = document.getElementById("reqAmount").value;
    const message = document.getElementById("reqMessage").value;
    const submitBtn = document.getElementById("submitBtn");

    if (!category || !subject || !targetAmount || !message) {
        alert("Please fill in all required fields.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting Anonymously...";

    try {
        const formData = new URLSearchParams();
        formData.append("category", category);
        formData.append("subject", subject);
        formData.append("targetAmount", targetAmount);
        formData.append("message", message);

        const response = await fetch("/CantinWeb/help-requests", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById("helpRequestForm").style.display = "none";
            const successCard = document.getElementById("requestSuccessCard");
            document.getElementById("createdRefCode").textContent = data.referenceCode;
            successCard.style.display = "block";
        } else {
            alert("Error: " + (data.message || "Failed to submit request"));
        }
    } catch (err) {
        console.error("Submission error:", err);
        alert("Network error: Could not submit request.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Anonymous Request →";
    }
}

function copyRefCode() {
    const code = document.getElementById("createdRefCode").textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert("Reference Code copied to clipboard: " + code);
    });
}

// ================= TRACK REQUEST =================
async function trackRequest() {
    const input = document.getElementById("trackCodeInput");
    const resultBox = document.getElementById("trackResultBox");
    const code = input.value.trim();

    if (!code) {
        alert("Please enter a Reference Code (e.g. REQ-20261101-763).");
        return;
    }

    resultBox.style.display = "block";
    resultBox.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Searching for ${escapeHtml(code)}...</p></div>`;

    try {
        const response = await fetch("/CantinWeb/help-requests?type=track&code=" + encodeURIComponent(code) + "&t=" + Date.now());
        const data = await response.json();

        if (data.success) {
            const isFunded = data.status === "Funded" || data.percentage >= 100;
            const isPending = data.status === "Pending";

            let statusBadge = `<span style="background:#ecfdf5;color:#059669;padding:4px 10px;border-radius:999px;font-weight:700;font-size:13px;">Active on Community Board</span>`;
            if (isPending) {
                statusBadge = `<span style="background:#fffbeb;color:#b45309;padding:4px 10px;border-radius:999px;font-weight:700;font-size:13px;">Pending Staff Review</span>`;
            } else if (isFunded) {
                statusBadge = `<span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:999px;font-weight:700;font-size:13px;">100% Fully Funded! Ready for Handover</span>`;
            } else if (data.status === "Completed") {
                statusBadge = `<span style="background:#f1f5f9;color:#475569;padding:4px 10px;border-radius:999px;font-weight:700;font-size:13px;">Completed / Item Handed Over</span>`;
            }

            resultBox.innerHTML = `
                <div class="request-card ${isFunded ? 'is-funded' : ''}" style="box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                    <div class="card-top">
                        <span class="category-tag ${getCategoryClass(data.category)}">
                            ${escapeHtml(data.category)}
                        </span>
                        <span class="ref-pill">#${escapeHtml(data.referenceCode)}</span>
                    </div>

                    <div style="margin-bottom: 12px;">${statusBadge}</div>

                    <h3 class="request-title">${escapeHtml(data.subject)}</h3>
                    <p class="request-desc">${escapeHtml(data.message)}</p>

                    <div class="progress-section">
                        <div class="progress-header">
                            <span style="font-size: 13px; font-weight: 700; color: #475569;">Fundraising Progress</span>
                            <span class="progress-pct-badge">${data.percentage}% Funded</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill" style="width: ${data.percentage}%;"></div>
                        </div>
                        <div class="progress-numbers-row">
                            <span class="collected">Raised: <strong>Rs. ${data.collectedAmount}</strong></span>
                            <span class="remaining">Target: Rs. ${data.targetAmount} (Remaining: Rs. ${data.remainingAmount})</span>
                        </div>
                    </div>

                    ${isFunded ? `
                        <div class="funded-banner">
                            Your request is 100% funded! Please visit the Canteen counter with your Reference Code (#${escapeHtml(data.referenceCode)}) to collect your item.
                        </div>
                    ` : `
                        <div class="card-help-footer">
                            <strong>Status Details:</strong>
                            <span>${isPending ? 'Your request has been submitted and is currently being reviewed by canteen staff before being shown on the community board.' : 'Your request is currently live on the community board. Fellow students or visitors can contribute at the counter.'}</span>
                        </div>
                    `}
                </div>
            `;
        } else {
            resultBox.innerHTML = `
                <div class="empty-state" style="border-color:#fecaca; background:#fef2f2;">
                    <p style="color:#b91c1c; font-weight:700;">No request found with reference code "${escapeHtml(code)}". Please check the code and try again.</p>
                </div>
            `;
        }
    } catch (err) {
        resultBox.innerHTML = `<div class="empty-state"><p>Error searching request.</p></div>`;
    }
}

// Helpers
function getCategoryClass(cat) {
    if (!cat) return "";
    const lower = cat.toLowerCase();
    if (lower.includes("stationery") || lower.includes("book")) return "cat-stationery";
    if (lower.includes("food") || lower.includes("meal")) return "cat-food";
    return "cat-materials";
}

function getCategoryEmoji(cat) {
    return "";
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
