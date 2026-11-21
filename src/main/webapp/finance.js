
document.addEventListener("DOMContentLoaded", function () {
    loadFinanceData();
    loadMonthlyBudget();

    const budgetInput = document.getElementById("budgetAmount");

    if (budgetInput) {
        budgetInput.addEventListener("input", function () {
            const message = document.getElementById("budgetMessage");

            if (message) {
                message.textContent = "";
            }
        });
    }
});

let monthlyBudget = 0;
let currentMonthlySpending = 0;

// Navigate to Home
function goHome() {
    window.location.href = "home.html";
}

// Load finance data from the servlet
async function loadFinanceData() {
    const chartContainer = document.getElementById("chartContainer");
    const errorMessage = document.getElementById("errorMessage");

    try {
        if (errorMessage) {
            errorMessage.textContent = "";
        }

        if (chartContainer) {
            chartContainer.textContent = "Loading spending data...";
        }

        const response = await fetch("finance-data", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            if (chartContainer) {
                chartContainer.textContent =
                    "Please log in to view your spending.";
            }

            if (errorMessage) {
                errorMessage.textContent =
                    "Your student session has expired. Please log in again.";
            }

            return;
        }

        if (!response.ok) {
            throw new Error("Unable to retrieve finance data.");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(
                data.message || "Unable to load finance data."
            );
        }

        // Update monthly spending FIRST
        currentMonthlySpending = Number(data.monthlyTotal) || 0;

        // Update summary cards and budget progress
        displayFinanceSummary(data);

        // Food vs Stationery breakdown
        const food = Number(data.foodTotal) || 0;
        const stationery = Number(data.stationeryTotal) || 0;
        const categoryTotal = food + stationery;

        const foodTotalElement =
            document.getElementById("foodTotal");

        const stationeryTotalElement =
            document.getElementById("stationeryTotal");

        const foodBar = document.getElementById("foodBar");
        const stationeryBar =
            document.getElementById("stationeryBar");

        if (foodTotalElement) {
            foodTotalElement.textContent = formatCurrency(food);
        }

        if (stationeryTotalElement) {
            stationeryTotalElement.textContent =
                formatCurrency(stationery);
        }

        if (foodBar) {
            foodBar.style.width =
                (categoryTotal > 0
                    ? food / categoryTotal * 100
                    : 0) + "%";
        }

        if (stationeryBar) {
            stationeryBar.style.width =
                (categoryTotal > 0
                    ? stationery / categoryTotal * 100
                    : 0) + "%";
        }

        // Monthly spending graph
        displayMonthlyChart(data.months || []);

        // Monthly comparison
        displayMonthlyComparison(data);

        // Recalculate budget progress using the actual numeric value
        updateBudgetDisplay();

    } catch (error) {
        console.error("Finance error:", error);

        if (chartContainer) {
            chartContainer.textContent =
                "Unable to load spending graph.";
        }

        if (errorMessage) {
            errorMessage.textContent =
                "Could not load finance data. Please check your connection and try again.";
        }
    }
}

// Update summary cards
function displayFinanceSummary(data) {
    const monthlyTotal = document.getElementById("monthlyTotal");
    const monthLabel = document.getElementById("monthLabel");
    const orderCount = document.getElementById("orderCount");
    const todayTotal = document.getElementById("todayTotal");
    const lifetimeTotal = document.getElementById("lifetimeTotal");

    currentMonthlySpending = Number(data.monthlyTotal) || 0;

    if (monthlyTotal) {
        monthlyTotal.textContent =
            formatCurrency(currentMonthlySpending);
    }

    if (monthLabel) {
        monthLabel.textContent =
            data.currentMonth || "Current Month";
    }

    if (orderCount) {
        orderCount.textContent =
            Number(data.orderCount || 0).toLocaleString();
    }

    if (todayTotal) {
        todayTotal.textContent =
            formatCurrency(data.todayTotal);
    }

    if (lifetimeTotal) {
        lifetimeTotal.textContent =
            formatCurrency(data.lifetimeTotal);
    }
}

// Display current month vs previous month
function displayMonthlyComparison(data) {
    const months = data.months || [];
    const current = Number(data.monthlyTotal) || 0;

    const previousMonth = new Date();
    previousMonth.setDate(1);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const previous = months.find(function (month) {
        return Number(month.year) === previousMonth.getFullYear()
            && month.label === previousMonth.toLocaleString(
                "en-US",
                { month: "short" }
            );
    });

    const previousAmount = previous
        ? Number(previous.amount) || 0
        : 0;

    const currentElement =
        document.getElementById("comparisonCurrent");

    const previousElement =
        document.getElementById("comparisonPrevious");

    const message = document.getElementById("comparisonMessage");

    if (currentElement) {
        currentElement.textContent = formatCurrency(current);
    }

    if (previousElement) {
        previousElement.textContent =
            formatCurrency(previousAmount);
    }

    if (message) {
        if (current > previousAmount) {
            message.textContent =
                "Spending increased by " +
                formatCurrency(current - previousAmount) +
                " compared with last month.";
        } else if (current < previousAmount) {
            message.textContent =
                "Spending decreased by " +
                formatCurrency(previousAmount - current) +
                " compared with last month.";
        } else {
            message.textContent =
                "Your spending is the same as last month.";
        }
    }
}

// Display monthly spending chart
function displayMonthlyChart(months) {
    const container = document.getElementById("chartContainer");

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!months.length) {
        container.textContent =
            "No monthly spending data available.";
        return;
    }

    const chart = document.createElement("div");
    chart.className = "chart-bars";

    const maximum = Math.max(
        ...months.map(function (month) {
            return Number(month.amount) || 0;
        }),
        0
    );

    months.forEach(function (month) {
        const amount = Number(month.amount) || 0;

        const column = document.createElement("div");
        column.className = "chart-column";

        const amountLabel = document.createElement("div");
        amountLabel.className = "bar-amount";
        amountLabel.textContent = formatCompactCurrency(amount);

        const barArea = document.createElement("div");
        barArea.className = "bar-area";

        const bar = document.createElement("div");
        bar.className = "chart-bar";

        const barHeight = maximum > 0
            ? amount / maximum * 100
            : 0;

        bar.style.height = barHeight + "%";

        if (amount === 0) {
            bar.classList.add("zero-bar");
        }

        bar.title =
            month.label + " " + month.year + ": " +
            formatCurrency(amount);

        bar.setAttribute("role", "img");
        bar.setAttribute(
            "aria-label",
            month.label + " " + month.year + ": " +
            formatCurrency(amount)
        );

        barArea.appendChild(bar);

        const monthLabel = document.createElement("div");
        monthLabel.className = "bar-label";
        monthLabel.textContent =
            month.label + " " + month.year;

        column.appendChild(amountLabel);
        column.appendChild(barArea);
        column.appendChild(monthLabel);

        chart.appendChild(column);
    });

    container.appendChild(chart);
}

// Load saved budget
async function loadMonthlyBudget() {
    const message = document.getElementById("budgetMessage");

    try {
        const response = await fetch("budget-data", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            if (message) {
                message.textContent =
                    "Please log in to manage your budget.";
            }
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load budget.");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(
                data.message || "Unable to load budget."
            );
        }

        monthlyBudget = Number(data.budgetAmount) || 0;

        const input = document.getElementById("budgetAmount");

        if (input) {
            input.value =
                monthlyBudget > 0 ? monthlyBudget.toFixed(2) : "";
        }

        updateBudgetDisplay();

    } catch (error) {
        console.error("Budget loading error:", error);

        if (message) {
            message.textContent =
                "Could not load your budget. Please refresh and try again.";
        }
    }
}

// Save budget to database
async function saveMonthlyBudget() {
    const input = document.getElementById("budgetAmount");
    const message = document.getElementById("budgetMessage");
    const button = document.getElementById("saveBudgetBtn");

    if (!input || !message || !button) {
        return;
    }

    const rawAmount = input.value.trim();
    const amount = Number(rawAmount);

    if (
        rawAmount === "" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 99999999.99 ||
        Math.round(amount * 100) !== amount * 100
    ) {
        message.textContent =
            "Please enter a valid budget greater than Rs. 0.";
        return;
    }

    button.disabled = true;
    message.textContent = "Saving budget...";

    try {
        const body = new URLSearchParams();
        body.set("budgetAmount", amount.toFixed(2));

        const response = await fetch("budget-data", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body: body.toString()
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to save budget."
            );
        }

        monthlyBudget = amount;

        updateBudgetDisplay();

        message.textContent =
            "Monthly budget saved successfully!";

    } catch (error) {
        console.error("Budget saving error:", error);

        message.textContent =
            "Could not save the budget. Please try again.";
    } finally {
        button.disabled = false;
    }
}

// Update spent amount, remaining amount, and progress bar
function updateBudgetDisplay() {
    const spentElement =
        document.getElementById("budgetSpent");

    const remainingElement =
        document.getElementById("budgetRemaining");

    const percentElement =
        document.getElementById("budgetPercent");

    const progress =
        document.getElementById("budgetProgress");

    const bar =
        document.getElementById("budgetProgressBar");

    if (
        !spentElement ||
        !remainingElement ||
        !percentElement ||
        !progress ||
        !bar
    ) {
        return;
    }

    // Use the numeric value received from finance-data
    const spent = Math.max(0, currentMonthlySpending);
    const remaining = monthlyBudget - spent;

    spentElement.textContent = formatCurrency(spent);

    // Show negative remaining amount if budget is exceeded
    remainingElement.textContent =
        formatCurrency(remaining);

    const percent = monthlyBudget > 0
        ? spent / monthlyBudget * 100
        : 0;

    const displayedPercent = Math.min(100, percent);

    bar.style.width = displayedPercent + "%";

    progress.setAttribute(
        "aria-valuenow",
        String(Math.round(displayedPercent))
    );

    bar.classList.remove("warning", "over-budget");

    if (monthlyBudget <= 0) {
        percentElement.textContent =
            "Set a budget to track your spending.";
    } else if (percent >= 100) {
        bar.classList.add("over-budget");

        percentElement.textContent =
            "Budget exceeded by " +
            formatCurrency(spent - monthlyBudget) + ".";
    } else if (percent >= 80) {
        bar.classList.add("warning");

        percentElement.textContent =
            percent.toFixed(1) +
            "% of your monthly budget used.";
    } else {
        percentElement.textContent =
            percent.toFixed(1) +
            "% of your monthly budget used.";
    }
}

// Currency formatting
function formatCurrency(amount) {
    return "Rs. " + Number(amount || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatCompactCurrency(amount) {
    const value = Number(amount || 0);

    if (value >= 1000000) {
        return "Rs. " + (value / 1000000).toFixed(1) + "M";
    }

    if (value >= 1000) {
        return "Rs. " + (value / 1000).toFixed(1) + "k";
    }

    return "Rs. " + value.toFixed(0);
}
