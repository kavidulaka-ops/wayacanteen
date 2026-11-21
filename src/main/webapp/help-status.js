
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("statusForm");
    const input = document.getElementById("referenceCode");
    const button = document.getElementById("checkButton");
    const message = document.getElementById("statusMessage");
    const resultBox = document.getElementById("resultBox");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const code = input.value.trim().toUpperCase();

        message.textContent = "";
        resultBox.hidden = true;

        if (!code || code.length < 3) {
            message.textContent =
                "Enter a valid reference or order code (e.g. REQ-... or CNT-...).";
            return;
        }

        button.disabled = true;
        button.textContent = "Checking...";

        try {
            const response = await fetch(
                "help-status?referenceCode=" + encodeURIComponent(code),
                {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Submission not found."
                );
            }

            document.getElementById("resultReference").textContent =
                data.referenceCode;

            document.getElementById("resultCategory").textContent =
                data.category;

            document.getElementById("resultSubject").textContent =
                data.subject;

            document.getElementById("resultDate").textContent =
                data.createdAt || "Not available";

            const statusElement =
                document.getElementById("resultStatus");

            statusElement.textContent = data.status;
            statusElement.className = "status-badge";

            if (data.status === "Resolved" || data.status === "Completed" || data.status === "Funded") {
                statusElement.classList.add("status-resolved");
            } else if (data.status === "In Progress" || data.status === "Accepted" || data.status === "Approved") {
                statusElement.classList.add("status-progress");
            } else if (data.status === "Rejected") {
                statusElement.classList.add("status-rejected");
            } else {
                statusElement.classList.add("status-pending");
            }

            const responseSection =
                document.getElementById("responseSection");

            const staffResponse =
                document.getElementById("staffResponse");

            if (data.isOrder) {
                staffResponse.textContent =
                    "Counter Pickup: " + (data.pickupSlot || "Morning") + " (" + (data.pickupTime || "08:30") + ") · Total Bill: Rs. " + Number(data.totalAmount || 0).toFixed(2);
                responseSection.hidden = false;
            } else if (data.isHelpRequest) {
                staffResponse.textContent =
                    (data.message ? data.message + " · " : "") + "Goal: Rs. " + Number(data.targetAmount || 0).toFixed(2) + " (Raised: Rs. " + Number(data.collectedAmount || 0).toFixed(2) + " - " + (data.percentage || 0) + "% Funded)";
                responseSection.hidden = false;
            } else {
                staffResponse.textContent =
                    data.staffResponse || "No staff response yet.";
                responseSection.hidden = !data.staffResponse;
            }

            resultBox.hidden = false;
            message.textContent = (data.isOrder ? "Order" : "Request") + " found successfully.";

        } catch (error) {
            console.error("Status lookup error:", error);

            message.textContent =
                error.message || "Unable to check status. Please try again.";
        } finally {
            button.disabled = false;
            button.textContent = "Check Status";
        }
    });
});
