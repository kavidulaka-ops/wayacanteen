
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

        if (!/^HELP-[A-F0-9]{8}$/.test(code)) {
            message.textContent =
                "Enter a valid reference number, e.g. HELP-12AB34CD.";
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

            if (data.status === "Resolved") {
                statusElement.classList.add("status-resolved");
            } else if (data.status === "In Progress") {
                statusElement.classList.add("status-progress");
            } else {
                statusElement.classList.add("status-pending");
            }

            const responseSection =
                document.getElementById("responseSection");

            const staffResponse =
                document.getElementById("staffResponse");

            staffResponse.textContent =
                data.staffResponse || "No staff response yet.";

            responseSection.hidden = !data.staffResponse;

            resultBox.hidden = false;
            message.textContent = "Submission found successfully.";

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
