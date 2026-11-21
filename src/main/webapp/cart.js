// =====================================
// CANTIN CART
// =====================================


// =====================================
// LOAD CART
// =====================================

let cart =
    JSON.parse(
        localStorage.getItem("cantinCart")
    ) || [];


// =====================================
// FIX OLD CART ITEMS
// =====================================

cart.forEach(item => {

    // If itemType does not exist,
    // identify it using the item name.

    if (!item.itemType) {

        const name =
            item.name.toLowerCase();

        if (
            name.includes("notebook") ||
            name.includes("book") ||
            name.includes("pen") ||
            name.includes("pencil") ||
            name.includes("eraser")
        ) {

            item.itemType =
                "Stationery";

        } else {

            item.itemType =
                "Food";

        }

    }

    item.price =
        Number(item.price);

    item.quantity =
        Number(item.quantity);

});


// Save fixed cart
localStorage.setItem(
    "cantinCart",
    JSON.stringify(cart)
);


// =====================================
// DISPLAY CART
// =====================================

function displayCart() {

    const cartItems =
        document.getElementById(
            "cartItems"
        );


    cartItems.innerHTML = "";


    if (cart.length === 0) {

        cartItems.innerHTML = `

            <div class="empty-cart">

                <div class="empty-cart-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                </div>

                <h2>
                    Your cart is empty
                </h2>

                <p>
                    Add some delicious food
                    or stationery items.
                </p>

            </div>

        `;

        updateSummary();

        return;

    }


    cart.forEach((item, index) => {

        const itemTotal =
            item.price *
            item.quantity;


        const cartItem =
            document.createElement(
                "div"
            );


        cartItem.className =
            "cart-item";


        cartItem.innerHTML = `

            <div class="item-icon">

                ${getItemIcon(item)}

            </div>


            <div class="item-details">

                <h3>
                    ${item.name}
                </h3>

                <span>
                    ${item.itemType}
                    · Rs. ${item.price.toFixed(2)}
                    per item
                </span>

            </div>


            <div class="quantity">

                <button
                    onclick="decreaseQuantity(${index})">

                    −

                </button>


                <span>
                    ${item.quantity}
                </span>


                <button
                    onclick="increaseQuantity(${index})">

                    +

                </button>

            </div>


            <div class="item-price">

                Rs. ${itemTotal.toFixed(2)}

            </div>


            <button
                class="delete-btn"
                onclick="removeItem(${index})">

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>

            </button>

        `;


        cartItems.appendChild(
            cartItem
        );

    });


    updateSummary();

}


// =====================================
// ITEM ICON
// =====================================

function getItemIcon(item) {

    // Stationery

    if (
        item.itemType ===
        "Stationery"
    ) {

        const name =
            item.name.toLowerCase();


        if (
            name.includes("notebook") ||
            name.includes("book")
        ) {

            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';

        }


        if (
            name.includes("pen")
        ) {

            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="2" x2="22" y2="6"></line><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"></path></svg>';

        }


        if (
            name.includes("pencil")
        ) {

            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="2" x2="22" y2="6"></line><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"></path></svg>';

        }


        if (
            name.includes("eraser")
        ) {

            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>';

        }


        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';

    }


    // Food

    if (
        item.name ===
        "Chicken Rice"
    ) {

        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';

    }


    if (
        item.name ===
        "Chicken Kottu"
    ) {

        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';

    }


    if (
        item.name ===
        "Vegetable Rice"
    ) {

        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';

    }


    if (
        item.name ===
        "Egg Kottu"
    ) {

        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';

    }


    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';

}


// =====================================
// INCREASE
// =====================================

function increaseQuantity(index) {

    cart[index].quantity++;


    saveCart();

    displayCart();

}


// =====================================
// DECREASE
// =====================================

function decreaseQuantity(index) {

    if (
        cart[index].quantity > 1
    ) {

        cart[index].quantity--;

    } else {

        cart.splice(
            index,
            1
        );

    }


    saveCart();

    displayCart();

}


// =====================================
// REMOVE
// =====================================

function removeItem(index) {

    cart.splice(
        index,
        1
    );


    saveCart();

    displayCart();

}


// =====================================
// SAVE CART
// =====================================

function saveCart() {

    localStorage.setItem(
        "cantinCart",
        JSON.stringify(cart)
    );

}


// =====================================
// SUMMARY
// =====================================

function updateSummary() {

    let itemCount = 0;

    let total = 0;


    cart.forEach(item => {

        itemCount +=
            item.quantity;


        total +=
            Number(item.price) *
            Number(item.quantity);

    });


    document.getElementById(
        "totalItems"
    ).textContent =
        itemCount;


    document.getElementById(
        "subtotal"
    ).textContent =
        "Rs. " +
        total.toFixed(2);


    document.getElementById(
        "total"
    ).textContent =
        "Rs. " +
        total.toFixed(2);

}


// =====================================
// GO FOOD
// =====================================

function goFood() {

    window.location.href =
        "food.html";

}


// =====================================
// GO STATIONERY
// =====================================

function goStationery() {

    window.location.href =
        "stationery.html";

}


// =====================================
// PLACE PRE-ORDER
// =====================================

function placePreOrder() {

    if (
        cart.length === 0
    ) {

        alert(
            "Your cart is empty."
        );

        return;

    }


    window.location.href =
        "order.html";

}


// =====================================
// START
// =====================================

displayCart();