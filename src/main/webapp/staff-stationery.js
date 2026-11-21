// =====================================
// CANTIN STAFF STATIONERY MANAGEMENT JS
// =====================================

let allStationeryItems = [];
let currentCategory = "All";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", function () {
    loadStationeryItems();
});

// =====================================
// LOAD STATIONERY ITEMS FROM BACKEND
// =====================================
async function loadStationeryItems() {
    try {
        const res = await fetch("/CantinWeb/staff-stationery?t=" + Date.now());
        if (!res.ok) {
            throw new Error("HTTP error " + res.status);
        }
        allStationeryItems = await res.json();
        updateMetrics();
        renderStationeryList();
    } catch (err) {
        console.error("Failed to load stationery items:", err);
        showToast("Error loading stationery items from server", true);
    }
}

// =====================================
// UPDATE SUMMARY METRICS
// =====================================
function updateMetrics() {
    const total = allStationeryItems.length;
    const available = allStationeryItems.filter(item => item.available).length;
    const unavailable = total - available;

    const elTotal = document.getElementById("metricTotal");
    const elAvail = document.getElementById("metricAvailable");
    const elUnavail = document.getElementById("metricUnavailable");

    if (elTotal) elTotal.textContent = total;
    if (elAvail) elAvail.textContent = available;
    if (elUnavail) elUnavail.textContent = unavailable;
}

// =====================================
// RENDER STATIONERY LIST (Filtered)
// =====================================
function renderStationeryList() {
    const grid = document.getElementById("stationeryGrid");
    if (!grid) return;

    let items = allStationeryItems;

    // Filter by category
    if (currentCategory !== "All") {
        items = items.filter(item => (item.category || "").toLowerCase() === currentCategory.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        items = items.filter(item => 
            (item.name || "").toLowerCase().includes(q) || 
            (item.description && item.description.toLowerCase().includes(q))
        );
    }

    if (items.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; background: white; border-radius: 16px; padding: 50px 20px; text-align: center; border: 1px dashed #cbd5e1;">
                <p style="font-size: 24px; margin-bottom: 10px; color: #4f46e5;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </p>
                <h3 style="font-size: 16px; color: #334155; margin-bottom: 6px;">No Stationery Items Found</h3>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Try adjusting your search or category filter, or add a new stationery item.</p>
                <button class="btn-primary" onclick="openAddModal()">+ Add New Stationery Item</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = "";

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "stationery-card" + (item.available ? "" : " out-of-stock");
        card.id = "stationeryCard_" + item.id;

        // Dynamic SVG Icon based on category
        let iconSvg;
        if ((item.category || "").toLowerCase() === "books") {
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
        } else if ((item.category || "").toLowerCase() === "writing") {
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="2" x2="22" y2="6"></line><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"></path></svg>';
        } else {
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
        }

        const safeName = escapeHtml(item.name || item.itemName || "");
        const safeDesc = escapeHtml(item.description || "No description provided.");
        const safeCat = escapeHtml(item.category || "Stationery");

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <div class="card-stationery-icon">${iconSvg}</div>
                    <div class="card-details">
                        <div class="card-meta">
                            <span class="badge-category">${safeCat}</span>
                            <span class="stationery-price-tag">Rs. ${Number(item.price).toFixed(2)}</span>
                        </div>
                        <h3>${safeName}</h3>
                    </div>
                </div>
                <p class="stationery-desc">${safeDesc}</p>
            </div>

            <div class="card-footer">
                <div class="availability-control">
                    <label class="switch" title="Toggle student availability">
                        <input type="checkbox" ${item.available ? "checked" : ""} onchange="toggleAvailability(${item.id}, this)">
                        <span class="slider"></span>
                    </label>
                    <span class="avail-label ${item.available ? "status-on" : "status-off"}" id="availLabel_${item.id}">
                        ${item.available ? "Available" : "Out of Stock"}
                    </span>
                </div>

                <div class="card-action-btns">
                    <button class="btn-icon-action edit" title="Edit Item" onclick="openEditModal(${item.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon-action delete" title="Delete Item" onclick="confirmDeleteStationery(${item.id}, '${safeName.replace(/'/g, "\\'")}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// =====================================
// TOGGLE AVAILABILITY
// =====================================
async function toggleAvailability(stationeryId, checkbox) {
    const isAvail = checkbox.checked;
    const label = document.getElementById("availLabel_" + stationeryId);
    const card = document.getElementById("stationeryCard_" + stationeryId);

    // Optimistic UI update
    if (label) {
        label.textContent = isAvail ? "Available" : "Out of Stock";
        label.className = "avail-label " + (isAvail ? "status-on" : "status-off");
    }
    if (card) {
        if (isAvail) card.classList.remove("out-of-stock");
        else card.classList.add("out-of-stock");
    }

    try {
        const formData = new URLSearchParams();
        formData.append("action", "toggle");
        formData.append("stationeryId", stationeryId);
        formData.append("available", isAvail ? "1" : "0");

        const res = await fetch("/CantinWeb/staff-stationery", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            const item = allStationeryItems.find(x => x.id === stationeryId);
            if (item) item.available = isAvail;
            updateMetrics();
            showToast(`"${item ? item.name : 'Item'}" marked as ${isAvail ? 'Available' : 'Out of Stock'}. Students see this immediately!`);
        } else {
            throw new Error(data.message || "Failed to update availability");
        }
    } catch (err) {
        console.error("Toggle error:", err);
        // Revert UI
        checkbox.checked = !isAvail;
        if (label) {
            label.textContent = !isAvail ? "Available" : "Out of Stock";
            label.className = "avail-label " + (!isAvail ? "status-on" : "status-off");
        }
        showToast("Error updating availability", true);
    }
}

// =====================================
// MODAL CONTROLS (ADD & EDIT)
// =====================================
let currentEditingId = null;

function openAddModal() {
    currentEditingId = null;
    document.getElementById("modalTitle").textContent = "Add New Stationery Item";
    document.getElementById("stationeryForm").reset();
    document.getElementById("stationeryFormId").value = "";
    document.getElementById("stationeryFormAction").value = "add";
    document.getElementById("stationeryFormAvailable").checked = true;
    document.getElementById("btnSubmitStationery").textContent = "Add Stationery Item";

    const modal = document.getElementById("stationeryModal");
    if (modal) modal.classList.add("active");
}

function openEditModal(stationeryId) {
    const item = allStationeryItems.find(x => x.id === stationeryId);
    if (!item) return;

    currentEditingId = stationeryId;
    document.getElementById("modalTitle").textContent = "Edit Stationery Item";
    document.getElementById("stationeryFormId").value = item.id;
    document.getElementById("stationeryFormAction").value = "edit";
    document.getElementById("stationeryName").value = item.name || item.itemName;
    document.getElementById("stationeryCategory").value = item.category || "Books";
    document.getElementById("stationeryPrice").value = item.price;
    document.getElementById("stationeryDesc").value = item.description || "";
    document.getElementById("stationeryFormAvailable").checked = !!item.available;
    document.getElementById("btnSubmitStationery").textContent = "Save Changes";

    const modal = document.getElementById("stationeryModal");
    if (modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("stationeryModal");
    if (modal) modal.classList.remove("active");
}

// Close modal on click outside card
window.addEventListener("click", function (e) {
    const modal = document.getElementById("stationeryModal");
    if (e.target === modal) {
        closeModal();
    }
});

// =====================================
// FORM SUBMIT (ADD / EDIT)
// =====================================
async function handleStationerySubmit(event) {
    event.preventDefault();

    const action = document.getElementById("stationeryFormAction").value;
    const stationeryId = document.getElementById("stationeryFormId").value;
    const name = document.getElementById("stationeryName").value.trim();
    const category = document.getElementById("stationeryCategory").value;
    const price = document.getElementById("stationeryPrice").value.trim();
    const description = document.getElementById("stationeryDesc").value.trim();
    const available = document.getElementById("stationeryFormAvailable").checked ? "1" : "0";

    if (!name) {
        showToast("Please enter item name", true);
        return;
    }

    if (!price || isNaN(price) || Number(price) < 0) {
        showToast("Please enter a valid price", true);
        return;
    }

    const btn = document.getElementById("btnSubmitStationery");
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        const formData = new URLSearchParams();
        formData.append("action", action);
        formData.append("name", name);
        formData.append("category", category);
        formData.append("price", price);
        formData.append("description", description);
        formData.append("available", available);

        if (action === "edit" && stationeryId) {
            formData.append("stationeryId", stationeryId);
        }

        const res = await fetch("/CantinWeb/staff-stationery", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            closeModal();
            showToast(data.message || "Saved successfully!");
            await loadStationeryItems();
        } else {
            showToast(data.message || "Failed to save stationery item", true);
        }
    } catch (err) {
        console.error("Save error:", err);
        showToast("Server error while saving stationery item", true);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// =====================================
// DELETE STATIONERY ITEM
// =====================================
async function confirmDeleteStationery(stationeryId, name) {
    if (!confirm(`Are you sure you want to delete "${name}" from stationery inventory?\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const formData = new URLSearchParams();
        formData.append("action", "delete");
        formData.append("stationeryId", stationeryId);

        const res = await fetch("/CantinWeb/staff-stationery", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            showToast(`"${name}" deleted successfully.`);
            await loadStationeryItems();
        } else {
            showToast(data.message || "Failed to delete item", true);
        }
    } catch (err) {
        console.error("Delete error:", err);
        showToast("Error connecting to server to delete item", true);
    }
}

// =====================================
// CATEGORY FILTER & SEARCH
// =====================================
function filterCategory(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll(".category-pills .pill-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderStationeryList();
}

function handleSearchInput(e) {
    searchQuery = e.target.value;
    renderStationeryList();
}

// =====================================
// HELPERS
// =====================================
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(msg, isError = false) {
    const toast = document.getElementById("toastMsg");
    if (!toast) return;

    toast.textContent = msg;
    toast.className = "toast-msg show" + (isError ? " error" : "");

    setTimeout(() => {
        toast.className = "toast-msg";
    }, 3500);
}
