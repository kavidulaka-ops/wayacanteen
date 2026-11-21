// =====================================
// CANTIN QR SCANNER & ORDER PAYMENT
// (QR Scan is strictly for Paid & Completed only)
// =====================================

let html5QrCode = null;
let scannerRunning = false;
let processingOrder = false;

// Audio feedback
function playSuccessBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
}

async function startScanner() {
    const status = document.getElementById("cameraStatus");
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.textContent = "";

    if (typeof Html5Qrcode === "undefined") {
        status.textContent = "QR scanner library could not load.";
        errorMessage.textContent = "Check your internet connection and reload the page.";
        return;
    }

    if (scannerRunning) return;

    try {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        status.textContent = "Starting camera...";

        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 240, height: 240 }
            },
            async function (decodedText) {
                if (processingOrder) return;

                const match = decodedText.match(/CNT-\d{8}-\d{3}/);
                const orderCode = match ? match[0] : decodedText.trim();

                processingOrder = true;
                document.getElementById("orderId").value = orderCode;
                status.textContent = "QR detected: " + orderCode + ". Checking order...";

                await stopScanner();
                playSuccessBeep();

                handleScannedOrder(orderCode);
            },
            function () {
                // Continue scanning
            }
        );

        scannerRunning = true;
        document.getElementById("startCameraBtn").disabled = true;
        document.getElementById("stopCameraBtn").disabled = false;
        status.textContent = "Camera is running. Point it at the student's order QR.";
    } catch (error) {
        console.error("Camera error:", error);
        status.textContent = "Could not start camera.";
        errorMessage.textContent = "Allow camera permissions in your browser, or enter the Order ID manually below.";
    }
}

async function stopScanner() {
    if (html5QrCode && scannerRunning) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (error) {
            console.error("Error stopping scanner:", error);
        }
    }

    scannerRunning = false;

    const startButton = document.getElementById("startCameraBtn");
    const stopButton = document.getElementById("stopCameraBtn");

    if (startButton) startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
}

// =====================================
// HANDLE SCANNED ORDER
// =====================================
function handleScannedOrder(orderCode) {
    const isAuto = document.getElementById("autoCompleteToggle")?.checked !== false;

    if (isAuto) {
        executeCompleteOrder(orderCode);
    } else {
        previewOrderBeforeComplete(orderCode);
    }
}

// Complete order via /complete-order servlet
function executeCompleteOrder(orderCode) {
    const errorMessage = document.getElementById("errorMessage");
    const status = document.getElementById("cameraStatus");
    errorMessage.textContent = "";

    const formData = new URLSearchParams();
    formData.append("orderCode", orderCode);

    fetch("complete-order", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    })
    .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
    })
    .then(data => {
        if (data.success) {
            displayCompletedResult(data, "completed");
        } else if (data.alreadyCompleted) {
            displayCompletedResult(data, "already-done");
        } else if (data.isPending) {
            displayCompletedResult(data, "pending");
        } else {
            errorMessage.textContent = data.message || "Could not complete this order.";
            if (status) status.textContent = "Action failed. Check order ID.";
            processingOrder = false;
        }
    })
    .catch(err => {
        console.error("Complete order error:", err);
        errorMessage.textContent = "Server error while completing order. Please try again.";
        processingOrder = false;
    });
}

function previewOrderBeforeComplete(orderCode) {
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.textContent = "";

    fetch("order-details?order=" + encodeURIComponent(orderCode))
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (data.status === "Pending") {
                    displayCompletedResult(data, "pending");
                } else if (data.status === "Completed") {
                    displayCompletedResult(data, "already-done");
                } else {
                    displayPreviewCard(data);
                }
            } else {
                errorMessage.textContent = "Order not found. Please check Order ID.";
                processingOrder = false;
            }
        })
        .catch(err => {
            errorMessage.textContent = "Unable to load order details.";
            processingOrder = false;
        });
}

// Display result card on page
function displayCompletedResult(data, mode) {
    const resultCard = document.getElementById("orderResultCard");
    const titleEl = document.getElementById("resultTitle");
    const subEl = document.getElementById("resultSub");
    const iconEl = document.getElementById("resultIcon");
    const orderCodeEl = document.getElementById("resOrderCode");
    const studentEl = document.getElementById("resStudentName");
    const amountEl = document.getElementById("resTotalAmount");
    const statusBadge = document.getElementById("resStatusBadge");
    const btnDetails = document.getElementById("btnViewDetails");

    resultCard.classList.remove("already-done", "rejected", "pending");
    restoreStandardActions(data.orderCode);

    if (mode === "pending") {
        resultCard.classList.add("pending");
        iconEl.textContent = "●";
        titleEl.textContent = "Order is Still Pending!";
        subEl.textContent = "This order has not been accepted yet. Staff must review and accept it from Orders Management & Queue.";
        statusBadge.textContent = "Pending Acceptance";
        statusBadge.className = "status-pill status-pending";

        // Show buttons guiding staff to Orders Management & Queue
        const actionsContainer = document.querySelector(".result-actions");
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button type="button" class="btn-scan-next" style="background:#eab308;box-shadow:0 4px 12px rgba(234,179,8,0.3);" onclick="window.location.href='pending-orders.html?tab=Pending'">
                    Open Orders Management & Accept
                </button>
                <button type="button" class="btn-view-queue" onclick="scanNextOrder()">
                    Scan Next Student QR
                </button>
                <button type="button" class="btn-view-details" onclick="window.location.href='order-details.html?order=${encodeURIComponent(data.orderCode)}'">
                    Full Order Details
                </button>
            `;
        }
    } else if (mode === "already-done") {
        resultCard.classList.add("already-done");
        iconEl.textContent = "ℹ";
        titleEl.textContent = "Order Already Paid & Completed";
        subEl.textContent = "This order was previously collected. No further payment required.";
        statusBadge.textContent = "Already Completed";
        statusBadge.className = "status-pill status-completed";

        const actionsContainer = document.querySelector(".result-actions");
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button type="button" class="btn-scan-next" style="background:#2563eb;" onclick="window.location.href='pending-orders.html?tab=Accepted'">
                    Return to Orders Management & Queue
                </button>
                <button type="button" class="btn-view-queue" onclick="scanNextOrder()">
                    Scan Next Student QR
                </button>
            `;
        }
    } else {
        // SUCCESS: Paid & Completed
        iconEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        titleEl.textContent = "Order Paid & Completed!";
        subEl.textContent = "Payment successfully confirmed. Returning to Orders Management & Queue in 1.5 seconds...";
        statusBadge.textContent = "Paid & Completed";
        statusBadge.className = "status-pill status-completed";

        const actionsContainer = document.querySelector(".result-actions");
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button type="button" class="btn-scan-next" onclick="window.location.href='pending-orders.html?tab=Accepted'">
                    Return to Orders Management & Queue
                </button>
                <button type="button" class="btn-view-queue" onclick="scanNextOrder()">
                    Scan Next Student QR
                </button>
            `;
        }

        // Automatically return to Orders Management & Queue after 1.5 seconds!
        setTimeout(function () {
            window.location.href = "pending-orders.html?tab=Accepted";
        }, 1500);
    }

    orderCodeEl.textContent = data.orderCode || "Order";
    const sName = data.studentName || "Student";
    const sIdx = data.studentIndex ? ` (Index: ${data.studentIndex})` : "";
    studentEl.textContent = sName + sIdx;

    amountEl.textContent = "Rs. " + Number(data.totalAmount || 0).toFixed(2);

    if (btnDetails) {
        btnDetails.onclick = function () {
            window.location.href = "order-details.html?order=" + encodeURIComponent(data.orderCode);
        };
    }

    resultCard.style.display = "block";
    resultCard.scrollIntoView({ behavior: "smooth" });
    processingOrder = false;
}

function displayPreviewCard(data) {
    const resultCard = document.getElementById("orderResultCard");
    const titleEl = document.getElementById("resultTitle");
    const subEl = document.getElementById("resultSub");
    const iconEl = document.getElementById("resultIcon");
    const orderCodeEl = document.getElementById("resOrderCode");
    const studentEl = document.getElementById("resStudentName");
    const amountEl = document.getElementById("resTotalAmount");
    const statusBadge = document.getElementById("resStatusBadge");

    resultCard.classList.remove("already-done", "rejected", "pending");
    iconEl.textContent = "●";
    titleEl.textContent = "Order Verified - Ready to Pay";
    subEl.textContent = "Confirm payment with student and mark as Paid & Completed.";

    orderCodeEl.textContent = data.orderCode;
    studentEl.textContent = `Student Index: ${data.indexNumber}`;
    amountEl.textContent = "Rs. " + Number(data.totalAmount || 0).toFixed(2);

    statusBadge.textContent = "In Queue / Ready for Pickup";
    statusBadge.className = "status-pill status-pending";

    const actionsContainer = document.querySelector(".result-actions");
    if (actionsContainer) {
        actionsContainer.innerHTML = `
            <button type="button" class="btn-scan-next" onclick="executeCompleteOrder('${data.orderCode}')">
                Mark as Paid & Completed
            </button>
            <button type="button" class="btn-view-queue" onclick="scanNextOrder()">
                Cancel & Scan Next
            </button>
            <button type="button" class="btn-view-details" onclick="window.location.href='pending-orders.html?tab=Accepted'">
                Orders Management & Queue
            </button>
        `;
    }

    resultCard.style.display = "block";
    resultCard.scrollIntoView({ behavior: "smooth" });
    processingOrder = false;
}

function restoreStandardActions(orderCode) {
    const actionsContainer = document.querySelector(".result-actions");
    if (actionsContainer) {
        actionsContainer.innerHTML = `
            <button type="button" class="btn-scan-next" onclick="window.location.href='pending-orders.html?tab=Accepted'">
                Return to Orders Management & Queue
            </button>
            <button type="button" class="btn-view-queue" onclick="scanNextOrder()">
                Scan Next Student QR
            </button>
            <button type="button" class="btn-view-details" onclick="window.location.href='order-details.html?order=${encodeURIComponent(orderCode || "")}'">
                Full Order Details
            </button>
        `;
    }
}

// Reset and prepare for next scan
function scanNextOrder() {
    const resultCard = document.getElementById("orderResultCard");
    resultCard.style.display = "none";

    document.getElementById("orderId").value = "";
    document.getElementById("errorMessage").textContent = "";

    processingOrder = false;
    startScanner();
}

// Manual search
function findOrder() {
    const orderId = document.getElementById("orderId").value.trim();
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.textContent = "";

    if (orderId === "") {
        errorMessage.textContent = "Please enter an Order ID or scan a QR code.";
        return;
    }

    processingOrder = true;
    handleScannedOrder(orderId);
}

function goDashboard() {
    window.location.href = "staff-dashboard.html";
}
