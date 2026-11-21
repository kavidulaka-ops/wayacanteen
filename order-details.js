// =====================================
// CANTIN ORDER DETAILS
// =====================================


// =====================================
// GET ORDER ID FROM URL
// =====================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const orderId =
    urlParams.get("order");


// =====================================
// CHECK ORDER ID
// =====================================

if (!orderId) {

    document.getElementById("orderId")
        .textContent = "Order Not Found";

} else {

    loadOrderDetails();

}


// =====================================
// LOAD ORDER FROM DATABASE
// =====================================

function loadOrderDetails() {

    fetch(
        "order-details?order=" +
        encodeURIComponent(orderId)
    )

    .then(response => {

        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }

        return response.json();

    })

    .then(data => {

        if (!data.success) {

            document.getElementById("orderId")
                .textContent = "Order Not Found";

            console.error(
                data.message
            );

            return;
        }


        // =================================
        // STORE DATABASE ORDER
        // =================================

        window.currentOrder = data;


        // =================================
        // DISPLAY ORDER
        // =================================

        displayOrder();

    })

    .catch(error => {

        console.error(
            "Error loading order:",
            error
        );

        document.getElementById("orderId")
            .textContent = "Unable to load order";

    });

}


// =====================================
// DISPLAY ORDER
// =====================================

function displayOrder() {

    const order =
        window.currentOrder;


    // =================================
    // BASIC ORDER DETAILS
    // =================================

    document.getElementById("orderId")
        .textContent =
        order.orderCode;


    document.getElementById("studentIndex")
        .textContent =
        order.indexNumber;


    document.getElementById("orderDate")
        .textContent =
        formatDate(
            order.orderDate
        );


    document.getElementById("orderTime")
        .textContent =
        formatTime(
            order.orderTime
        );


    document.getElementById("orderStatus")
        .textContent =
        order.status;

    const elPickup = document.getElementById("orderPickup");
    if (elPickup) {
        const slot = order.pickupSlot || "Morning";
        const time = order.pickupTime ? formatTime(order.pickupTime) : "08:30 AM";
        elPickup.textContent = `${slot} (${time})`;
    }


    // =================================
    // DISPLAY ITEMS
    // =================================

    const container =
        document.getElementById(
            "orderItems"
        );

    container.innerHTML = "";


    if (
        !order.items ||
        order.items.length === 0
    ) {

        container.innerHTML = `
            <p>No order items found.</p>
        `;

        return;

    }


    order.items.forEach(item => {

        const itemTotal =
            Number(item.price) *
            Number(item.quantity);


        const itemElement =
            document.createElement(
                "div"
            );


        itemElement.className =
            "order-item";


        itemElement.innerHTML = `

            <div class="item-details">

                <h3>
                    ${item.name}
                </h3>

                <p>
                    ${item.itemType}
                    · Rs. ${Number(
                        item.price
                    ).toFixed(2)}
                    × ${item.quantity}
                </p>

            </div>


            <strong>
                Rs. ${itemTotal.toFixed(2)}
            </strong>

        `;


        container.appendChild(
            itemElement
        );

    });


    // =================================
    // TOTAL
    // =================================

    document.getElementById(
        "orderTotal"
    ).textContent =
        Number(
            order.totalAmount
        ).toFixed(2);

}


// =====================================
// ACCEPT ORDER
// =====================================

function acceptOrder() {

    const order =
        window.currentOrder;


    // =================================
    // CHECK ORDER
    // =================================

    if (!order) {

        return;

    }


    // =================================
    // ALREADY ACCEPTED
    // =================================

    if (
        order.status ===
        "Accepted"
    ) {

        window.location.href =
            "pending-orders.html?tab=Accepted";

        return;

    }


    // =================================
    // SEND ACCEPT REQUEST
    // =================================

    const formData =
        new URLSearchParams();


    formData.append(
        "orderId",
        order.orderId
    );


    fetch(
        "accept-order",
        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/x-www-form-urlencoded"

            },

            body:
                formData.toString()

        }
    )

    .then(response => {

        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }

        return response.json();

    })

    .then(result => {

        if (result.success) {

            // =================================
            // DATABASE UPDATED
            // =================================

            window.location.href =
                "pending-orders.html?tab=Accepted";

        } else {

            console.error(
                "Accept order failed:",
                result.message
            );

            alert(
                result.message
            );

        }

    })

    .catch(error => {

        console.error(
            "Error accepting order:",
            error
        );

        alert(
            "Unable to accept order. Please try again."
        );

    });

}


// =====================================
// FORMAT DATE
// =====================================

function formatDate(dateString) {

    if (!dateString) {

        return "";

    }


    const date =
        new Date(
            dateString
        );


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

}


// =====================================
// FORMAT TIME
// =====================================

function formatTime(timeString) {

    if (!timeString) {

        return "";

    }


    const parts =
        timeString.split(":");


    if (parts.length < 2) {

        return timeString;

    }


    let hours =
        parseInt(
            parts[0]
        );


    const minutes =
        parts[1];


    const suffix =
        hours >= 12
            ? "PM"
            : "AM";


    hours =
        hours % 12;


    if (hours === 0) {

        hours = 12;

    }


    return (
        hours
        + ":"
        + minutes
        + " "
        + suffix
    );

}


// =====================================
// BACK TO ORDERS
// =====================================

function goBack() {

    window.location.href =
        "pending-orders.html";

}

// =====================================
// REJECT ORDER
// =====================================
function rejectOrder() {
    const order = window.currentOrder;
    if (!order) return;

    const defaultReason = "Not available in this moment";
    const reason = prompt("Enter rejection reason for order " + order.orderCode + ":", defaultReason);
    if (reason === null) return;

    const formData = new URLSearchParams();
    formData.append("orderId", order.orderId);
    formData.append("reason", reason.trim() || defaultReason);

    fetch("reject-order", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            alert("Order rejected. Student has been notified.");
            window.location.href = "pending-orders.html";
        } else {
            alert(result.message || "Failed to reject order.");
        }
    })
    .catch(err => {
        console.error("Reject error:", err);
        alert("Failed to reject order.");
    });
}

// =====================================
// COMPLETE ORDER (PAID)
// =====================================
function completeOrder() {
    const order = window.currentOrder;
    if (!order) return;

    const confirmed = confirm("Confirm payment received and mark order " + order.orderCode + " as Paid & Completed?");
    if (!confirmed) return;

    const formData = new URLSearchParams();
    formData.append("orderId", order.orderId);

    fetch("complete-order", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            alert("? Order successfully marked as Paid & Completed!");
            window.location.href = "pending-orders.html?tab=Accepted";
        } else {
            alert(result.message || "Failed to complete order.");
        }
    })
    .catch(err => {
        console.error("Complete error:", err);
        alert("Failed to complete order.");
    });
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