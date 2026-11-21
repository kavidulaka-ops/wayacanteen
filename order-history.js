// =====================================
// CANTIN ORDER HISTORY
// =====================================

let historyOrders = [];

let currentFilter = "All";


// =====================================
// LOAD HISTORY FROM DATABASE
// =====================================

function loadHistory() {

    fetch("order-history")

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

            if (data.error) {

                console.error(
                    "Database error:",
                    data.error
                );

                return;
            }

            const hiddenOrders =
    JSON.parse(
        localStorage.getItem(
            "cantinHiddenHistory"
        )
    ) || [];

historyOrders =
    data.filter(
        order =>
            !hiddenOrders.includes(
                order.orderId
            )
    );

            displayHistory(
                currentFilter
            );

        })

        .catch(error => {

            console.error(
                "Error loading order history:",
                error
            );

        });
}


// =====================================
// DISPLAY HISTORY
// =====================================

function displayHistory(type = "All") {

    const container =
        document.getElementById(
            "historyContainer"
        );

    container.innerHTML = "";


    let filteredOrders =
        historyOrders.filter(order => {

            if (type === "All") {

                return true;

            }

            return (
                order.orderType ===
                type
            );

        });


    // =================================
    // EMPTY
    // =================================

    if (
        filteredOrders.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-history">

                <div class="empty-history-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>

                <h2>
                    No Orders Found
                </h2>

                <p>
                    There are no accepted orders
                    in this category.
                </p>

            </div>

        `;

        return;
    }


    // =================================
    // CREATE HISTORY CARDS
    // =================================

    filteredOrders.forEach(order => {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "history-card";


        // =================================
        // ORDER ITEMS
        // =================================

        let itemsHTML = "";


        if (
            order.items &&
            order.items.length > 0
        ) {

            order.items.forEach(item => {

                const itemTotal =
                    Number(item.price) *
                    Number(item.quantity);


                itemsHTML += `

                    <div class="item-row">

                        <span>

                            ${item.name}
                            × ${item.quantity}

                        </span>

                        <strong>

                            Rs.
                            ${itemTotal.toFixed(2)}

                        </strong>

                    </div>

                `;

            });

        }


        // =================================
        // DATE
        // =================================

        const formattedDate =
            formatDate(
                order.orderDate
            );


        // =================================
        // ACCEPTED TIME
        // =================================

        const acceptedTime =
            formatTime(
                order.acceptedTime
            );


        // =================================
        // CARD
        // =================================

        card.innerHTML = `

            <div class="order-top">

                <div class="order-id">

                    ${order.orderCode}

                </div>

                <div class="status">

                    Accepted

                </div>

            </div>


            <div class="order-info">


                <div class="info-box">

                    <span>
                        Student Index
                    </span>

                    <strong>
                        ${order.indexNumber}
                    </strong>

                </div>


                <div class="info-box">

                    <span>
                        Order Type
                    </span>

                    <strong>
                        ${order.orderType}
                    </strong>

                </div>


                <div class="info-box">

                    <span>
                        Order Date
                    </span>

                    <strong>
                        ${formattedDate}
                    </strong>

                </div>


                <div class="info-box">

                    <span>
                        Accepted Time
                    </span>

                    <strong>
                        ${acceptedTime}
                    </strong>

                </div>


                <div class="info-box">

                    <span>
                        Pickup Schedule
                    </span>

                    <strong style="color: #ea580c;">
                        ${order.pickupSlot || "Morning"} (${order.pickupTime ? formatTime(order.pickupTime) : "08:30"})
                    </strong>

                </div>


            </div>


            <div class="items-section">

                <div class="items-title">

                    Order Items

                </div>

                ${itemsHTML}

            </div>


            <div class="order-bottom">

                <span class="total-label">

                    Total

                </span>

                <span class="total-price">

                    Rs.
                    ${Number(
                        order.totalAmount
                    ).toFixed(2)}

                </span>

            </div>

        `;


        container.appendChild(
            card
        );

    });

}


// =====================================
// FILTER
// =====================================

function filterOrders(type) {

    currentFilter =
        type;


    const buttons =
        document.querySelectorAll(
            ".filter-btn"
        );


    buttons.forEach(button => {

        button.classList.remove(
            "active"
        );

    });


    if (event) {

        event.target.classList.add(
            "active"
        );

    }


    displayHistory(
        type
    );

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
// GO DASHBOARD
// =====================================

function goDashboard() {

    window.location.href =
        "staff-dashboard.html";

}


// =====================================
// CLEAR HISTORY
// =====================================

function clearHistory() {

    if (historyOrders.length === 0) {
        return;
    }

    const hiddenOrders =
        JSON.parse(
            localStorage.getItem(
                "cantinHiddenHistory"
            )
        ) || [];

    historyOrders.forEach(order => {

        if (
            !hiddenOrders.includes(
                order.orderId
            )
        ) {

            hiddenOrders.push(
                order.orderId
            );

        }

    });

    localStorage.setItem(
        "cantinHiddenHistory",
        JSON.stringify(hiddenOrders)
    );

    historyOrders = [];

    displayHistory(
        currentFilter
    );

}

// =====================================
// START
// =====================================

loadHistory();