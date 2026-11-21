// ==========================================================================
// WAYACANTEEN - STUDENT REGISTRATION CONTROLLER
// Handles client-side validation, password toggles, and seamless submission
// ==========================================================================

document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");
    const indexNumber = document.getElementById("indexNumber");
    const fullName = document.getElementById("fullName");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const indexError = document.getElementById("indexError");
    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");
    const registerMessage = document.getElementById("registerMessage");

    const togglePassword = document.getElementById("togglePassword");
    const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

    // Eye Icons (SVG Strings)
    const eyeOpenSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    const eyeClosedSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

    // Toggle Password Visibility
    if (togglePassword && password) {
        togglePassword.addEventListener("click", function () {
            const isPassword = password.type === "password";
            password.type = isPassword ? "text" : "password";
            togglePassword.innerHTML = isPassword ? eyeClosedSvg : eyeOpenSvg;
        });
    }

    // Toggle Confirm Password Visibility
    if (toggleConfirmPassword && confirmPassword) {
        toggleConfirmPassword.addEventListener("click", function () {
            const isPassword = confirmPassword.type === "password";
            confirmPassword.type = isPassword ? "text" : "password";
            toggleConfirmPassword.innerHTML = isPassword ? eyeClosedSvg : eyeOpenSvg;
        });
    }

    // Clear individual errors on input
    [indexNumber, fullName, email, password, confirmPassword].forEach(input => {
        if (!input) return;
        input.addEventListener("input", function () {
            const errEl = document.getElementById(input.id + "Error");
            if (errEl) {
                errEl.textContent = "";
            }
            if (registerMessage) {
                registerMessage.hidden = true;
            }
        });
    });

    // Form Submission Handling
    if (registerForm) {
        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();

            // Clear errors
            indexError.textContent = "";
            nameError.textContent = "";
            emailError.textContent = "";
            passwordError.textContent = "";
            confirmPasswordError.textContent = "";

            let isValid = true;

            const indexVal = indexNumber.value.trim();
            const nameVal = fullName.value.trim();
            const emailVal = email.value.trim();
            const passVal = password.value;
            const confirmVal = confirmPassword.value;

            if (!indexVal) {
                indexError.textContent = "Please enter your index number.";
                isValid = false;
            }

            if (!nameVal) {
                nameError.textContent = "Please enter your full name.";
                isValid = false;
            }

            if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                emailError.textContent = "Please enter a valid email address.";
                isValid = false;
            }

            if (!passVal) {
                passwordError.textContent = "Please enter a password.";
                isValid = false;
            } else if (passVal.length < 6) {
                passwordError.textContent = "Password must be at least 6 characters long.";
                isValid = false;
            }

            if (!confirmVal) {
                confirmPasswordError.textContent = "Please confirm your password.";
                isValid = false;
            } else if (passVal !== confirmVal) {
                confirmPasswordError.textContent = "Passwords do not match.";
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            // If hosted statically (GitHub Pages / demo), provide seamless client-side experience
            if (window.location.hostname.includes("github.io") || window.location.protocol === "file:") {
                const demoUser = {
                    student_id: 1,
                    index_number: indexVal,
                    full_name: nameVal,
                    email: emailVal || (indexVal + "@wyb.ac.lk")
                };
                sessionStorage.setItem("currentStudent", JSON.stringify(demoUser));
                localStorage.setItem("wayacanteen_registered_" + indexVal, JSON.stringify(demoUser));

                if (registerMessage) {
                    registerMessage.classList.remove("error");
                    registerMessage.classList.add("success");
                    registerMessage.textContent = "Registration Successful! Redirecting to login...";
                    registerMessage.hidden = false;
                }

                setTimeout(() => {
                    window.location.href = "login.html?registered=success";
                }, 900);
                return;
            }

            // Normal local server submission (Java Servlet / Tomcat)
            registerForm.submit();
        });
    }

    // Display URL error params (from server redirect)
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");

    if (error && registerMessage) {
        registerMessage.classList.remove("success");
        registerMessage.classList.add("error");
        registerMessage.hidden = false;

        if (error === "exists") {
            registerMessage.textContent = "This index number is already registered. Please login or reset your password.";
        } else if (error === "mismatch") {
            registerMessage.textContent = "Passwords do not match. Please verify and try again.";
        } else if (error === "weak") {
            registerMessage.textContent = "Password must be at least 6 characters long.";
        } else if (error === "empty") {
            registerMessage.textContent = "Please fill in all required fields.";
        } else if (error === "db") {
            registerMessage.textContent = "Database connection error. Please try again later.";
        } else if (error === "failed") {
            registerMessage.textContent = "Registration failed. Please check your information and try again.";
        } else {
            registerMessage.textContent = "An error occurred during registration. Please try again.";
        }

        // Clean URL to prevent error sticking on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
