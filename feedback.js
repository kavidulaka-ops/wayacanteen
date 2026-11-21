// ==========================================================================
// WAYACANTEEN STUDENT FEEDBACK JS
// ==========================================================================

const RATING_LABELS = {
    1: "1 Star — Needs Improvement",
    2: "2 Stars — Below Expectations",
    3: "3 Stars — Average / Satisfactory",
    4: "4 Stars — Good Experience",
    5: "5 Stars — Excellent Experience!"
};

let currentRating = 5;
let currentCategory = "Food Quality";

function goHome() {
    window.location.href = "home.html";
}

function setRating(val) {
    currentRating = val;
    document.getElementById("selectedRating").value = val;

    const stars = document.querySelectorAll("#starRatingGroup .star-btn");
    stars.forEach(btn => {
        const starVal = parseInt(btn.getAttribute("data-value"), 10);
        if (starVal <= val) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const verbalEl = document.getElementById("ratingVerbalLabel");
    if (verbalEl) {
        verbalEl.textContent = RATING_LABELS[val] || `${val} Stars`;
    }
}

function selectCategory(cat) {
    currentCategory = cat;
    document.getElementById("selectedCategory").value = cat;

    const pills = document.querySelectorAll("#categoryPillRow .cat-pill");
    pills.forEach(p => {
        if (p.textContent.trim().toLowerCase() === cat.trim().toLowerCase() ||
            (cat === "Cleanliness" && p.textContent.includes("Cleanliness")) ||
            (cat === "App Experience" && p.textContent.includes("App")) ||
            (cat === "General Suggestion" && p.textContent.includes("General"))) {
            p.classList.add("active");
        } else {
            p.classList.remove("active");
        }
    });
}

function toggleAnonymous(isAnon) {
    const inputsGrid = document.getElementById("identityInputsGrid");
    const nameInput = document.getElementById("studentNameInput");
    const indexInput = document.getElementById("indexNumberInput");
    const notice = document.getElementById("anonNotice");

    if (isAnon) {
        if (nameInput) {
            nameInput.disabled = true;
            nameInput.required = false;
        }
        if (indexInput) indexInput.disabled = true;
        if (inputsGrid) inputsGrid.style.opacity = "0.4";
        if (notice) notice.style.display = "flex";
    } else {
        if (nameInput) {
            nameInput.disabled = false;
            nameInput.required = true;
        }
        if (indexInput) indexInput.disabled = false;
        if (inputsGrid) inputsGrid.style.opacity = "1";
        if (notice) notice.style.display = "none";
    }
}

function appendTag(text) {
    const textarea = document.getElementById("feedbackTextInput");
    if (!textarea) return;

    if (textarea.value.trim().length > 0) {
        textarea.value = textarea.value.trim() + " " + text;
    } else {
        textarea.value = text;
    }
    textarea.focus();
}

function resetFeedbackForm() {
    const form = document.getElementById("feedbackForm");
    if (form) form.reset();

    setRating(5);
    selectCategory("Food Quality");
    toggleAnonymous(false);

    document.getElementById("feedbackSuccessCard").style.display = "none";
    document.getElementById("feedbackFormCard").style.display = "block";

    autoPopulateStudent();
}

function autoPopulateStudent() {
    const nameInput = document.getElementById("studentNameInput");
    const indexInput = document.getElementById("indexNumberInput");

    const cachedName = sessionStorage.getItem("studentName");
    const cachedIndex = sessionStorage.getItem("studentIndex");

    if (cachedName && nameInput && !nameInput.value) {
        nameInput.value = cachedName;
    }
    if (cachedIndex && indexInput && !indexInput.value) {
        indexInput.value = cachedIndex;
    }

    // Try fetching from CurrentStudentServlet if not yet populated
    if (!cachedName) {
        fetch("/CantinWeb/current-student?_t=" + Date.now())
            .then(res => res.json())
            .then(data => {
                if (data && data.loggedIn) {
                    if (nameInput && !nameInput.value && data.fullName) {
                        nameInput.value = data.fullName;
                    }
                    if (indexInput && !indexInput.value && data.indexNumber) {
                        indexInput.value = data.indexNumber;
                    }
                    sessionStorage.setItem("studentName", data.fullName || "");
                    sessionStorage.setItem("studentIndex", data.indexNumber || "");
                }
            })
            .catch(err => {
                console.log("Could not load current student session", err);
            });
    }
}

function handleFeedbackSubmit(e) {
    e.preventDefault();

    const isAnon = document.getElementById("anonCheckbox").checked;
    const studentName = isAnon ? "Anonymous Student" : (document.getElementById("studentNameInput").value || "").trim();
    const indexNumber = isAnon ? "" : (document.getElementById("indexNumberInput").value || "").trim();
    const category = document.getElementById("selectedCategory").value;
    const rating = document.getElementById("selectedRating").value;
    const orderCode = (document.getElementById("orderCodeInput").value || "").trim();
    const feedbackText = (document.getElementById("feedbackTextInput").value || "").trim();

    if (!feedbackText) {
        alert("Please enter your feedback comments.");
        document.getElementById("feedbackTextInput").focus();
        return;
    }

    const submitBtn = document.getElementById("submitFeedbackBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Submitting...</span>`;
    }

    const params = new URLSearchParams();
    params.append("studentName", studentName);
    params.append("indexNumber", indexNumber);
    params.append("category", category);
    params.append("rating", rating);
    params.append("orderCode", orderCode);
    params.append("feedbackText", feedbackText);
    params.append("isAnonymous", isAnon ? "true" : "false");

    fetch("feedback", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: params.toString()
    })
    .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
    })
    .then(data => {
        if (data && data.success) {
            document.getElementById("feedbackFormCard").style.display = "none";
            document.getElementById("feedbackSuccessCard").style.display = "block";
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            alert(data.message || "Failed to submit feedback. Please try again.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg><span>Submit Feedback</span>`;
            }
        }
    })
    .catch(err => {
        console.error("Feedback submit error:", err);
        alert("An error occurred while submitting feedback. Please check your network and try again.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg><span>Submit Feedback</span>`;
        }
    });
}

// Initialization
document.addEventListener("DOMContentLoaded", function () {
    // Check if orderCode was passed in query string
    const urlParams = new URLSearchParams(window.location.search);
    const orderCode = urlParams.get("orderCode");
    if (orderCode) {
        const orderInput = document.getElementById("orderCodeInput");
        if (orderInput) orderInput.value = orderCode;
    }

    autoPopulateStudent();
    setRating(5);
});
