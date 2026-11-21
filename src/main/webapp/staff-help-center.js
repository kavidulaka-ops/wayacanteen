// ==========================================================================
// CANTIN STAFF ANONYMOUS HELP CENTER - CONTROLLER
// ==========================================================================

let allStaffRequests = [];
let currentStaffFilter = "Pending";

document.addEventListener("DOMContentLoaded", function () {
    loadStaffRequests();
});

// ================= TABS SWITCHER =================
function switchStaffTab(tab) {
    currentStaffFilter = tab;

    const btnPending = document.getElementById("tabStaffPending");
    const btnActive = document.getElementById("tabStaffActive");
    const btnFunded = document.getElementById("tabStaffFunded");
    const btnAll = document.getElementById("tabStaffAll");

    btnPending.classList.remove("active");
    btnActive.classList.remove("active");
    btnFunded.classList.remove("active");
    btnAll.classList.remove("active");

    if (tab === "Approved") btnActive.classList.add("active");
    else if (tab === "Funded") btnFunded.classList.add("active");
    else if (tab === "All") btnAll.classList.add("active");
    else btnPending.classList.add("active");

    renderStaffRequests();
}

// ================= LOAD REQUESTS =================
async function loadStaffRequests() {
    const list = document.getElementById("staffRequestsList");

    try {
        const response = await fetch("/CantinWeb/staff-help-requests?t=" + Date.now());
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Update metrics
                document.getElementById("metricPending").textContent = data.pendingCount;
                document.getElementById("metricActive").textContent = data.activeCount;
                document.getElementById("metricTotal").textContent = "Rs. " + data.totalRaised;
                document.getElementById("metricFunded").textContent = data.fundedCount;

                // Update tab badges
                document.getElementById("tabBadgePending").textContent = data.pendingCount;
                document.getElementById("tabBadgeActive").textContent = data.activeCount;
                document.getElementById("tabBadgeFunded").textContent = data.fundedCount;

                allStaffRequests = data.requests || [];
                renderStaffRequests();
            }
        } else {
            list.innerHTML = `<div class="empty-state"><p>Error loading requests.</p></div>`;
        }
    } catch (err) {
        console.error("Failed to load staff requests:", err);
        list.innerHTML = `<div class="empty-state"><p>Connection error loading requests.</p></div>`;
    }
}

// ================= RENDER REQUESTS =================
function renderStaffRequests() {
    const list = document.getElementById("staffRequestsList");
    if (!list) return;

    let filtered = allStaffRequests;
    if (currentStaffFilter !== "All") {
        filtered = allStaffRequests.filter(r => r.status && r.status.toLowerCase() === currentStaffFilter.toLowerCase());
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 24px; margin-bottom: 8px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
                <h3 style="font-size: 16px; margin-bottom: 4px; color:#111827;">No Requests Found</h3>
                <p style="color:#6b7280; font-size:13px;">There are no requests matching the "${currentStaffFilter}" tab.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(req => {
        const isPending = req.status === "Pending";
        const isApproved = req.status === "Approved";
        const isFunded = req.status === "Funded";
        const isCompleted = req.status === "Completed";
        const isRejected = req.status === "Rejected";

        let statusClass = "status-pending";
        if (isApproved) statusClass = "status-approved";
        else if (isFunded) statusClass = "status-funded";
        else if (isCompleted) statusClass = "status-completed";
        else if (isRejected) statusClass = "status-rejected";

        return `
            <div class="staff-request-card">
                <div class="card-header-row">
                    <div class="card-ref-info">
                        <span class="card-ref-code">#${escapeHtml(req.referenceCode)}</span>
                        <span class="card-category-badge">${escapeHtml(req.category)}</span>
                        <span style="font-size: 13px; color: #6b7280;">${escapeHtml(req.createdAt)}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${escapeHtml(req.status)}</span>
                </div>

                <!-- STUDENT CONFIDENTIAL (VISIBLE TO STAFF ONLY) -->
                <div>
                    <span class="student-confidential-box" title="Student index is confidential and never shown to donors/students">
                        Requester Student Index: <strong>${escapeHtml(req.studentIndex || "Not recorded")}</strong>
                    </span>
                </div>

                <h3 class="request-card-title">${escapeHtml(req.subject)}</h3>
                <p class="request-card-msg">${escapeHtml(req.message)}</p>

                <!-- STAFF PROGRESS BAR -->
                <div class="staff-progress-box">
                    <div class="staff-progress-header">
                        <span>Fundraising Progress</span>
                        <span style="color:#059669; font-weight:800;">${req.percentage}% Funded</span>
                    </div>
                    <div class="staff-track">
                        <div class="staff-fill" style="width: ${req.percentage}%;"></div>
                    </div>
                    <div class="staff-progress-stats">
                        <span>Collected: <strong style="color:#059669;">Rs. ${req.collectedAmount}</strong></span>
                        <span>Target: Rs. ${req.targetAmount}</span>
                        <span>Remaining: <strong style="color:#dc2626;">Rs. ${req.remainingAmount}</strong></span>
                    </div>
                </div>

                <!-- ACTIONS ROW -->
                <div class="card-actions-bar">
                    ${isPending ? `
                        <button type="button" class="btn-approve" onclick="approveRequest(${req.helpId})">
                            Approve & Publish to Board
                        </button>
                        <button type="button" class="btn-reject" onclick="rejectRequest(${req.helpId})">
                            Reject
                        </button>
                    ` : ''}

                    ${isApproved ? `
                        <button type="button" class="btn-donation" onclick="openDonationModal(${req.helpId}, '${escapeHtml(req.referenceCode)}', '${escapeHtml(req.subject).replace(/'/g, "\\'")}', '${req.collectedAmount}', '${req.targetAmount}')">
                            Record Cash Contribution
                        </button>
                    ` : ''}

                    ${isFunded ? `
                        <div style="flex: 1; font-size: 13px; font-weight: 700; color: #15803d;">
                            100% Target Met! Ready for student to collect item at counter.
                        </div>
                        <button type="button" class="btn-complete" onclick="completeRequest(${req.helpId})">
                            Mark as Handed Over to Student
                        </button>
                    ` : ''}

                    ${isCompleted ? `
                        <span style="font-size: 13px; font-weight: 700; color: #4b5563;">
                            Item successfully handed over to student. Completed.
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join("");
}

// ================= APPROVE / REJECT =================
async function approveRequest(helpId) {
    if (!confirm("Are you sure you want to approve this request and publish it to the Anonymous Community Board?")) return;

    try {
        const formData = new URLSearchParams();
        formData.append("action", "approve");
        formData.append("helpId", helpId);

        const res = await fetch("/CantinWeb/staff-help-requests", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message);
            loadStaffRequests();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        alert("Failed to approve request.");
    }
}

async function rejectRequest(helpId) {
    if (!confirm("Are you sure you want to reject this request?")) return;

    try {
        const formData = new URLSearchParams();
        formData.append("action", "reject");
        formData.append("helpId", helpId);

        const res = await fetch("/CantinWeb/staff-help-requests", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message);
            loadStaffRequests();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        alert("Failed to reject request.");
    }
}

async function completeRequest(helpId) {
    if (!confirm("Has the student collected this item? Mark as completed?")) return;

    try {
        const formData = new URLSearchParams();
        formData.append("action", "complete");
        formData.append("helpId", helpId);

        const res = await fetch("/CantinWeb/staff-help-requests", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            alert("Request marked as Handed Over & Completed!");
            loadStaffRequests();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        alert("Failed to complete request.");
    }
}

// ================= DONATION MODAL =================
function openDonationModal(helpId, refCode, title, collected, target) {
    document.getElementById("modalHelpId").value = helpId;
    document.getElementById("modalRefCode").textContent = "#" + refCode;
    document.getElementById("modalItemTitle").textContent = title;

    const remaining = Math.max(0, parseFloat(target) - parseFloat(collected)).toFixed(2);
    document.getElementById("modalRaisedText").textContent = `Raised: Rs. ${collected} / Rs. ${target}`;
    document.getElementById("modalRemainingText").textContent = `Remaining: Rs. ${remaining}`;

    document.getElementById("donationAmount").value = "";
    document.getElementById("donorNote").value = "";

    document.getElementById("donationModal").style.display = "flex";
    setTimeout(() => document.getElementById("donationAmount").focus(), 100);
}

function closeDonationModal() {
    document.getElementById("donationModal").style.display = "none";
}

async function submitDonationRecord(event) {
    event.preventDefault();

    const helpId = document.getElementById("modalHelpId").value;
    const amount = document.getElementById("donationAmount").value;
    const donorNote = document.getElementById("donorNote").value;
    const btn = document.getElementById("btnSubmitDonation");

    if (!amount || parseFloat(amount) <= 0) {
        alert("Please enter a valid amount greater than 0.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Recording...";

    try {
        const formData = new URLSearchParams();
        formData.append("action", "record_donation");
        formData.append("helpId", helpId);
        formData.append("amount", amount);
        formData.append("donorNote", donorNote);

        const res = await fetch("/CantinWeb/staff-help-requests", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message);
            closeDonationModal();
            loadStaffRequests();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        alert("Failed to record donation.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Record & Update Progress";
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
