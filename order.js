// =====================================
// CANTIN ORDER CONFIRMATION
// =====================================


// =====================================
// GET CART
// =====================================

let cart =
    JSON.parse(
        localStorage.getItem("cantinCart")
    ) || [];


// =====================================
// CHECK CART
// =====================================

if (cart.length === 0) {

    alert("Your cart is empty.");

    window.location.href =
        "cart.html";
}


// =====================================
// CALCULATE TOTAL
// =====================================

let total = 0;

cart.forEach(item => {

    total +=
        Number(item.price) *
        Number(item.quantity);

});


// =====================================
// GENERATE ORDER ID
// =====================================

let now = new Date();

let date =
    now.getFullYear().toString()
    +
    (now.getMonth() + 1)
        .toString()
        .padStart(2, "0")
    +
    now.getDate()
        .toString()
        .padStart(2, "0");


let randomNumber =
    Math.floor(
        100 + Math.random() * 900
    );


let orderId =
    "CNT-" +
    date +
    "-" +
    randomNumber;


// =====================================
// DETERMINE ORDER TYPE
// =====================================

let hasFood = false;
let hasStationery = false;


cart.forEach(item => {

    if (
        item.itemType ===
        "Stationery"
    ) {

        hasStationery = true;

    } else {

        hasFood = true;

    }

});


let orderType = "Food";


if (
    hasFood &&
    hasStationery
) {

    orderType = "Both";

} else if (
    hasStationery
) {

    orderType = "Stationery";

}


// =====================================
// DISPLAY ORDER ID
// =====================================

document.getElementById(
    "orderId"
).textContent =
    orderId;


// =====================================
// DISPLAY DATE
// =====================================

let orderDate =
    now.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );


document.getElementById(
    "orderDate"
).textContent =
    orderDate;


// =====================================
// DISPLAY TIME
// =====================================

let orderTime =
    now.toLocaleTimeString(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );


document.getElementById(
    "orderTime"
).textContent =
    orderTime;


// =====================================
// ORDER STATUS & PICKUP DETAILS
// =====================================

document.getElementById(
    "orderStatus"
).textContent =
    "Pending";

let pickupSlot = localStorage.getItem("cantinPickupSlot") || "Morning";
let pickupTime = localStorage.getItem("cantinPickupTime") || "08:30";

function formatTime12(time24) {
    if (!time24) return "";
    const parts = time24.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    const hStr = h < 10 ? "0" + h : "" + h;
    return `${hStr}:${m} ${ampm}`;
}

const slotRangeMap = {
    Morning: "Morning (07:00 AM – 11:00 AM)",
    Noon: "Noon (11:00 AM – 03:00 PM)",
    Night: "Night (03:00 PM – 08:00 PM)"
};

const elSlot = document.getElementById("orderPickupSlot");
const elTime = document.getElementById("orderPickupTime");
if (elSlot) elSlot.textContent = slotRangeMap[pickupSlot] || `${pickupSlot} Window`;
if (elTime) elTime.textContent = formatTime12(pickupTime);


// =====================================
// DISPLAY ORDER ITEMS
// =====================================

function displayOrderItems() {

    const orderItems =
        document.getElementById(
            "orderItems"
        );


    orderItems.innerHTML = "";


    cart.forEach(item => {

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
                    · Rs. ${Number(item.price).toFixed(2)}
                    × ${item.quantity}
                </p>

            </div>

            <strong>
                Rs. ${itemTotal.toFixed(2)}
            </strong>

        `;


        orderItems.appendChild(
            itemElement
        );

    });

}


displayOrderItems();


// =====================================
// DISPLAY TOTAL
// =====================================

document.getElementById(
    "orderTotal"
).textContent =
    total.toFixed(2);


// =====================================
// SAVE ORDER TO DATABASE
// =====================================

function saveOrderToDatabase() {


    // ---------------------------------
    // DUPLICATE PROTECTION
    // ---------------------------------

    const savedOrder =
        sessionStorage.getItem(
            "cantinCurrentOrder"
        );


    if (
        savedOrder === orderId
    ) {

        console.log(
            "Order already saved."
        );

        return Promise.resolve({
            success: true,
            message: "Order already saved"
        });

    }


    // ---------------------------------
    // FORM DATA
    // ---------------------------------

    const formData =
        new URLSearchParams();


    formData.append(
        "orderCode",
        orderId
    );


    formData.append(
        "orderType",
        orderType
    );


    formData.append(
        "totalAmount",
        total.toFixed(2)
    );


    // ---------------------------------
    // MYSQL DATE
    // ---------------------------------

    const mysqlDate =
        now.getFullYear() +
        "-" +
        (now.getMonth() + 1)
            .toString()
            .padStart(2, "0") +
        "-" +
        now.getDate()
            .toString()
            .padStart(2, "0");


    // ---------------------------------
    // MYSQL TIME
    // ---------------------------------

    const mysqlTime =
        now.getHours()
            .toString()
            .padStart(2, "0") +
        ":" +
        now.getMinutes()
            .toString()
            .padStart(2, "0") +
        ":" +
        now.getSeconds()
            .toString()
            .padStart(2, "0");


    formData.append(
        "orderDate",
        mysqlDate
    );


    formData.append(
        "orderTime",
        mysqlTime
    );


    formData.append(
        "pickupSlot",
        pickupSlot
    );


    formData.append(
        "pickupTime",
        pickupTime
    );


    // ---------------------------------
    // CART ITEMS
    // ---------------------------------

    formData.append(
        "cartItems",
        JSON.stringify(cart)
    );


    // ---------------------------------
    // SEND TO SERVLET
    // ---------------------------------

    return fetch(
        "order",
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
                "Server error: "
                + response.status
            );

        }

        return response.json();

    })

    .then(result => {

        if (
            result.success
        ) {

            // Save current order ID
            // to prevent duplicate save

            sessionStorage.setItem(
                "cantinCurrentOrder",
                orderId
            );


            console.log(
                "ORDER SAVED SUCCESSFULLY",
                result
            );

        } else {

            console.error(
                "ORDER SAVE FAILED:",
                result.message
            );

        }


        return result;

    });

}


// =====================================
// SAVE ORDER
// =====================================

saveOrderToDatabase()

    .then(result => {

        if (
            result.success
        ) {

            console.log(
                "Database order completed."
            );

        }

    })

    .catch(error => {

        console.error(
            "ORDER DATABASE ERROR:",
            error
        );

    });


// =====================================
// QR CODE
// =====================================

let qrData =
    "Cantin Order ID: "
    + orderId
    + " | Pickup: "
    + pickupSlot
    + " ("
    + formatTime12(pickupTime)
    + ") | Total: Rs."
    + total.toFixed(2);


let qrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="
    +
    encodeURIComponent(
        qrData
    );


document.getElementById(
    "qrCode"
).src =
    qrUrl;


// =====================================
// BACK TO HOME
// =====================================

function goHome() {

    localStorage.removeItem(
        "cantinCart"
    );


    window.location.href =
        "home.html";
}