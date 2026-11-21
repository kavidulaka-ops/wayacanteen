// =====================================
// CANTIN STAFF FOOD MANAGEMENT JS
// =====================================

let allFoodItems = [];
let currentCategory = "All";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", function () {
    loadFoodItems();
});

// =====================================
// LOAD FOOD ITEMS FROM BACKEND
// =====================================
async function loadFoodItems() {
    try {
        const res = await fetch("/CantinWeb/staff-food?t=" + Date.now());
        if (!res.ok) {
            throw new Error("HTTP error " + res.status);
        }
        allFoodItems = await res.json();
        updateMetrics();
        renderFoodList();
    } catch (err) {
        console.error("Failed to load food items:", err);
        showToast("Error loading food items from server", true);
    }
}

// =====================================
// UPDATE SUMMARY METRICS
// =====================================
function updateMetrics() {
    const total = allFoodItems.length;
    const available = allFoodItems.filter(item => item.available).length;
    const unavailable = total - available;

    const elTotal = document.getElementById("metricTotal");
    const elAvail = document.getElementById("metricAvailable");
    const elUnavail = document.getElementById("metricUnavailable");

    if (elTotal) elTotal.textContent = total;
    if (elAvail) elAvail.textContent = available;
    if (elUnavail) elUnavail.textContent = unavailable;
}

// =====================================
// RENDER FOOD LIST (Filtered)
// =====================================
function renderFoodList() {
    const grid = document.getElementById("foodGrid");
    if (!grid) return;

    let items = allFoodItems;

    // Filter by category
    if (currentCategory !== "All") {
        items = items.filter(item => item.category.toLowerCase() === currentCategory.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        items = items.filter(item => 
            item.name.toLowerCase().includes(q) || 
            (item.description && item.description.toLowerCase().includes(q))
        );
    }

    if (items.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; background: white; border-radius: 16px; padding: 50px 20px; text-align: center; border: 1px dashed #cbd5e1;">
                <p style="font-size: 24px; margin-bottom: 10px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg></p>
                <h3 style="font-size: 16px; color: #334155; margin-bottom: 6px;">No Food Items Found</h3>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Try adjusting your search or category filter, or add a new food item.</p>
                <button class="btn-primary" onclick="openAddModal()">+ Add New Food Item</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = "";

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "food-card" + (item.available ? "" : " out-of-stock");
        card.id = "foodCard_" + item.id;

        // Icon mapping
        let iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';

        const safeName = escapeHtml(item.name);
        const safeDesc = escapeHtml(item.description || "No description provided.");
        const safeCat = escapeHtml(item.category || "Food");

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <div class="card-food-icon">${iconSvg}</div>
                    <div class="card-details">
                        <div class="card-meta">
                            <span class="badge-category">${safeCat}</span>
                            <span class="food-price-tag">Rs. ${Number(item.price).toFixed(2)}</span>
                        </div>
                        <h3>${safeName}</h3>
                    </div>
                </div>
                <p class="food-desc">${safeDesc}</p>
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
                    <button class="btn-icon-action edit" title="Edit Item" onclick="openEditModal(${item.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="btn-icon-action delete" title="Delete Item" onclick="confirmDeleteFood(${item.id}, '${safeName.replace(/'/g, "\\'")}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// =====================================
// TOGGLE AVAILABILITY
// =====================================
async function toggleAvailability(foodId, checkbox) {
    const isAvail = checkbox.checked;
    const label = document.getElementById("availLabel_" + foodId);
    const card = document.getElementById("foodCard_" + foodId);

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
        formData.append("foodId", foodId);
        formData.append("available", isAvail ? "1" : "0");

        const res = await fetch("/CantinWeb/staff-food", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            // Update in local data
            const item = allFoodItems.find(x => x.id === foodId);
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
    document.getElementById("modalTitle").textContent = "Add New Food Item";
    document.getElementById("foodForm").reset();
    document.getElementById("foodFormId").value = "";
    document.getElementById("foodFormAction").value = "add";
    document.getElementById("foodFormAvailable").checked = true;
    document.getElementById("btnSubmitFood").textContent = "Add Food Item";

    const modal = document.getElementById("foodModal");
    if (modal) {
        modal.classList.add("open");
        modal.classList.add("active");
    }
}

function openEditModal(foodId) {
    const item = allFoodItems.find(x => x.id === foodId);
    if (!item) return;

    currentEditingId = foodId;
    document.getElementById("modalTitle").textContent = "Edit Food Item";
    document.getElementById("foodFormId").value = item.id;
    document.getElementById("foodFormAction").value = "edit";
    document.getElementById("foodName").value = item.name;
    document.getElementById("foodCategory").value = item.category || "Food";
    document.getElementById("foodPrice").value = item.price;
    document.getElementById("foodDesc").value = item.description || "";
    document.getElementById("foodFormAvailable").checked = !!item.available;
    document.getElementById("btnSubmitFood").textContent = "Save Changes";

    const modal = document.getElementById("foodModal");
    if (modal) {
        modal.classList.add("open");
        modal.classList.add("active");
    }
}

function closeModal() {
    const modal = document.getElementById("foodModal");
    if (modal) {
        modal.classList.remove("open");
        modal.classList.remove("active");
    }
}

// Close when clicking overlay
window.onclick = function (e) {
    const modal = document.getElementById("foodModal");
    if (e.target === modal) {
        closeModal();
    }
};

// =====================================
// SAVE FOOD (ADD OR EDIT)
// =====================================
async function handleFoodSubmit(e) {
    e.preventDefault();

    const action = document.getElementById("foodFormAction").value;
    const foodId = document.getElementById("foodFormId").value;
    const name = document.getElementById("foodName").value.trim();
    const category = document.getElementById("foodCategory").value;
    const price = document.getElementById("foodPrice").value.trim();
    const desc = document.getElementById("foodDesc").value.trim();
    const available = document.getElementById("foodFormAvailable").checked ? "1" : "0";

    if (!name) {
        alert("Please enter the food item name.");
        return;
    }
    if (!price || isNaN(price) || Number(price) < 0) {
        alert("Please enter a valid price in Rs.");
        return;
    }

    const formData = new URLSearchParams();
    formData.append("action", action);
    if (foodId) formData.append("foodId", foodId);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("description", desc);
    formData.append("available", available);

    const btn = document.getElementById("btnSubmitFood");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        const res = await fetch("/CantinWeb/staff-food", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            closeModal();
            showToast(data.message || (action === "add" ? "Food item added!" : "Food item updated!"));
            await loadFoodItems();
        } else {
            alert(data.message || "Failed to save food item.");
        }
    } catch (err) {
        console.error("Save error:", err);
        alert("Error connecting to server.");
    } finally {
        btn.disabled = false;
        btn.textContent = action === "add" ? "Add Food Item" : "Save Changes";
    }
}

// =====================================
// DELETE FOOD
// =====================================
async function confirmDeleteFood(foodId, foodName) {
    const confirmed = confirm(`Are you sure you want to DELETE "${foodName}" from the menu?\n\nThis will permanently remove it from the canteen food list.`);
    if (!confirmed) return;

    try {
        const formData = new URLSearchParams();
        formData.append("action", "delete");
        formData.append("foodId", foodId);

        const res = await fetch("/CantinWeb/staff-food", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await res.json();
        if (data.success) {
            showToast(`"${foodName}" removed from menu!`);
            await loadFoodItems();
        } else {
            alert(data.message || "Could not delete food item.");
        }
    } catch (err) {
        console.error("Delete error:", err);
        alert("Error connecting to server.");
    }
}

// =====================================
// SEARCH & FILTER
// =====================================
function handleSearchInput(e) {
    searchQuery = e.target.value;
    renderFoodList();
}

function filterCategory(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll(".pill-btn").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderFoodList();
}

// =====================================
// TOAST NOTIFICATIONS
// =====================================
let toastTimer = null;
function showToast(msg, isError = false) {
    const toast = document.getElementById("toastMsg");
    if (!toast) return;

    if (toastTimer) clearTimeout(toastTimer);

    toast.textContent = msg;
    toast.className = "toast-msg " + (isError ? "error" : "success");
    toast.style.display = "block";

    toastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 4000);
}

// Helper: HTML escape
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
