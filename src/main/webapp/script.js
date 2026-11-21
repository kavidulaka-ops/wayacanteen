// Get elements

const loginForm = document.getElementById("loginForm");

const indexNumber = document.getElementById("indexNumber");

const password = document.getElementById("password");

const indexError = document.getElementById("indexError");

const passwordError = document.getElementById("passwordError");

const loginMessage = document.getElementById("loginMessage");

const togglePassword = document.getElementById("togglePassword");

const forgotPassword = document.getElementById("forgotPassword");


// Show / Hide Password

togglePassword.addEventListener("click", function () {

    if (password.type === "password") {

        password.type = "text";

        togglePassword.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

    } else {

        password.type = "password";

        togglePassword.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

    }

});

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const indexValue = indexNumber.value.trim();
    const passwordValue = password.value.trim();

    if (indexValue === "") {
        indexError.textContent =
            "Please enter your index number.";
        return;
    }

    if (passwordValue === "") {
        passwordError.textContent =
            "Please enter your password.";
        return;
    }

    loginForm.submit();
});
