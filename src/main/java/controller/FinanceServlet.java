
package controller;

import db.DBConnection;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@WebServlet("/finance-data")
public class FinanceServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);

        // Check whether a student is logged in
        if (session == null ||
                session.getAttribute("studentId") == null) {

            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED);

            response.getWriter().write(
                    "{\"success\":false,"
                    + "\"message\":\"Student not logged in\"}");

            return;
        }

        int studentId =
                (Integer) session.getAttribute("studentId");

        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.from(today);
        YearMonth firstMonth = currentMonth.minusMonths(5);

        Map<YearMonth, Double> monthlyAmounts =
                new LinkedHashMap<>();

        Map<YearMonth, Integer> monthlyOrders =
                new LinkedHashMap<>();

        // Initialize all six months, including empty months
        for (int i = 0; i < 6; i++) {
            YearMonth month = firstMonth.plusMonths(i);
            monthlyAmounts.put(month, 0.0);
            monthlyOrders.put(month, 0);
        }

        String sql =
                "SELECT YEAR(order_date) AS order_year, "
                + "MONTH(order_date) AS order_month, "
                + "COALESCE(SUM(total_amount), 0) "
                + "AS total_spending, COUNT(*) AS order_count "
                + "FROM orders "
                + "WHERE student_id = ? "
                + "AND status IN ('Accepted', 'Completed') "
                + "AND order_date >= ? "
                + "AND order_date <= ? "
                + "GROUP BY YEAR(order_date), MONTH(order_date) "
                + "ORDER BY order_year, order_month";

        try (Connection connection =
                     DBConnection.getConnection()) {

            if (connection == null) {
                response.setStatus(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

                response.getWriter().write(
                        "{\"success\":false,"
                        + "\"message\":\"Database connection failed\"}");

                return;
            }

            try (PreparedStatement statement =
                         connection.prepareStatement(sql)) {

                statement.setInt(1, studentId);
                statement.setDate(
                        2, java.sql.Date.valueOf(firstMonth.atDay(1)));
                statement.setDate(
                        3, java.sql.Date.valueOf(today));

                try (ResultSet result =
                             statement.executeQuery()) {

                    while (result.next()) {

                        int year =
                                result.getInt("order_year");

                        int monthNumber =
                                result.getInt("order_month");

                        YearMonth month =
                                YearMonth.of(year, monthNumber);

                        if (monthlyAmounts.containsKey(month)) {

                            monthlyAmounts.put(
                                    month,
                                    result.getDouble("total_spending"));

                            monthlyOrders.put(
                                    month,
                                    result.getInt("order_count"));
                        }
                    }
                }
            }
// Calculate today's and all-time spending
double todayTotal = 0.0;
double lifetimeTotal = 0.0;
double foodTotal = 0.0;
double stationeryTotal = 0.0;

String totalsSQL =
        "SELECT "
        + "COALESCE(SUM(CASE "
        + "WHEN order_date = ? THEN total_amount "
        + "ELSE 0 END), 0) AS today_spending, "
        + "COALESCE(SUM(total_amount), 0) AS total_spending "
        + "FROM orders "
        + "WHERE student_id = ? "
        + "AND status IN ('Accepted', 'Completed')";

try (PreparedStatement totalsStatement =
             connection.prepareStatement(totalsSQL)) {

    totalsStatement.setDate(
            1, java.sql.Date.valueOf(today));

    totalsStatement.setInt(2, studentId);

    try (ResultSet totalsResult =
                 totalsStatement.executeQuery()) {

        if (totalsResult.next()) {
            todayTotal =
                    totalsResult.getDouble("today_spending");

            lifetimeTotal =
                    totalsResult.getDouble("total_spending");
        }
    }
}
// Calculate this month's Food and Stationery spending
String categorySQL =
        "SELECT "
        + "COALESCE(SUM(CASE "
        + "WHEN LOWER(oi.item_type) = 'food' "
        + "THEN oi.subtotal ELSE 0 END), 0) AS food_total, "
        + "COALESCE(SUM(CASE "
        + "WHEN LOWER(oi.item_type) = 'stationery' "
        + "THEN oi.subtotal ELSE 0 END), 0) AS stationery_total "
        + "FROM orders o "
        + "JOIN order_items oi ON o.order_id = oi.order_id "
        + "WHERE o.student_id = ? "
        + "AND o.status IN ('Accepted', 'Completed') "
        + "AND o.order_date >= ? "
        + "AND o.order_date < ?";

try (PreparedStatement categoryStatement =
             connection.prepareStatement(categorySQL)) {

    categoryStatement.setInt(1, studentId);

    categoryStatement.setDate(
            2, java.sql.Date.valueOf(currentMonth.atDay(1)));

    categoryStatement.setDate(
            3, java.sql.Date.valueOf(today.plusDays(1)));

    try (ResultSet categoryResult =
                 categoryStatement.executeQuery()) {

        if (categoryResult.next()) {
            foodTotal =
                    categoryResult.getDouble("food_total");

            stationeryTotal =
                    categoryResult.getDouble("stationery_total");
        }
    }
}
            double currentMonthTotal =
                    monthlyAmounts.get(currentMonth);

            int totalOrderCount = 0;

            for (int count : monthlyOrders.values()) {
                totalOrderCount += count;
            }

            DateTimeFormatter monthFormatter =
                    DateTimeFormatter.ofPattern(
                            "MMMM yyyy", Locale.ENGLISH);

            StringBuilder json = new StringBuilder();

            json.append("{");
            json.append("\"success\":true,");
            json.append("\"monthlyTotal\":")
                    .append(currentMonthTotal).append(",");
            json.append("\"todayTotal\":")
        .append(todayTotal).append(",");

json.append("\"lifetimeTotal\":")
        .append(lifetimeTotal).append(",");
json.append("\"foodTotal\":")
        .append(foodTotal).append(",");

json.append("\"stationeryTotal\":")
        .append(stationeryTotal).append(",");
            json.append("\"currentMonth\":\"")
                    .append(currentMonth.format(monthFormatter))
                    .append("\",");
            json.append("\"orderCount\":")
                    .append(totalOrderCount).append(",");
            json.append("\"months\":[");

            boolean first = true;

            for (YearMonth month : monthlyAmounts.keySet()) {

                if (!first) {
                    json.append(",");
                }

                json.append("{");
                json.append("\"label\":\"")
                        .append(month.format(
                                DateTimeFormatter.ofPattern(
                                        "MMM", Locale.ENGLISH)))
                        .append("\",");
                json.append("\"year\":")
                        .append(month.getYear()).append(",");
                json.append("\"amount\":")
                        .append(monthlyAmounts.get(month)).append(",");
                json.append("\"orderCount\":")
                        .append(monthlyOrders.get(month));
                json.append("}");

                first = false;
            }

            json.append("]}");

            response.getWriter().write(json.toString());

        } catch (Exception e) {

            e.printStackTrace();

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

            response.getWriter().write(
                    "{\"success\":false,"
                    + "\"message\":\"Unable to load finance data\"}");
        }
    }
}
