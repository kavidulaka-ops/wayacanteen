// =====================================
// CANTIN STAFF LOGIN JS
// =====================================

document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const errorMessage = document.getElementById("errorMessage");

    if (errorMessage) {
        if (params.get("error") === "invalid") {
            errorMessage.textContent = "Invalid Staff Username or Password. Please try again.";
            errorMessage.className = "alert-banner error";
            errorMessage.style.display = "block";
        } else if (params.get("error") === "empty") {
            errorMessage.textContent = "Please enter both Staff Username and Password.";
            errorMessage.className = "alert-banner error";
            errorMessage.style.display = "block";
        } else if (params.get("reset") === "success") {
            errorMessage.textContent = "Password reset successfully! Please log in with your new password.";
            errorMessage.className = "alert-banner success";
            errorMessage.style.display = "block";
        }
    }

    // Toggle Password Visibility
    const passwordInput = document.getElementById("password");
    const togglePasswordBtn = document.getElementById("togglePassword");

    const eyeOpenSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeClosedSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener("click", function () {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePasswordBtn.innerHTML = eyeClosedSvg;
            } else {
                passwordInput.type = "password";
                togglePasswordBtn.innerHTML = eyeOpenSvg;
            }
        });
    }
});
