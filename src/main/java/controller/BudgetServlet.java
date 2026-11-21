
package controller;

import db.DBConnection;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.YearMonth;

@WebServlet("/budget-data")
public class BudgetServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);
        Object sObj = session != null ? session.getAttribute("studentId") : null;
        int studentId = 0;
        if (sObj instanceof Number) {
            studentId = ((Number) sObj).intValue();
        } else if (sObj != null) {
            try {
                studentId = Integer.parseInt(sObj.toString().trim());
            } catch (Exception ignored) {}
        }

        if (studentId <= 0) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(
                    "{\"success\":false,\"message\":\"Please log in as student\"}");
            return;
        }

        String month = YearMonth.now().toString() + "-01";

        String sql =
                "SELECT budget_amount FROM cantin_budgets "
                + "WHERE student_id = ? AND budget_month = ?";

        try (Connection connection = DBConnection.getConnection()) {

            if (connection == null) {
                throw new Exception("Database connection failed");
            }

            try (PreparedStatement statement =
                    connection.prepareStatement(sql)) {

                statement.setInt(1, studentId);
                statement.setDate(
                        2, java.sql.Date.valueOf(month));

                try (ResultSet result = statement.executeQuery()) {
                    String amount = "0.00";

                    if (result.next()) {
                        amount = result.getBigDecimal(
                                "budget_amount").toPlainString();
                    }

                    response.getWriter().write(
                            "{\"success\":true,\"budgetAmount\":"
                            + amount + "}");
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(
                    "{\"success\":false,"
                    + "\"message\":\"Unable to load budget\"}");
        }
    }

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);
        Object sObj = session != null ? session.getAttribute("studentId") : null;
        int studentId = 0;
        if (sObj instanceof Number) {
            studentId = ((Number) sObj).intValue();
        } else if (sObj != null) {
            try {
                studentId = Integer.parseInt(sObj.toString().trim());
            } catch (Exception ignored) {}
        }

        if (studentId <= 0) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(
                    "{\"success\":false,\"message\":\"Please log in as student\"}");
            return;
        }

        try {
            String rawAmountStr = request.getParameter("budgetAmount");
            if (rawAmountStr == null || rawAmountStr.trim().isEmpty()) {
                throw new IllegalArgumentException("Budget amount is required");
            }

            BigDecimal amount = new BigDecimal(rawAmountStr.trim().replaceAll("[, ]", ""));

            if (amount.compareTo(BigDecimal.ZERO) <= 0
                    || amount.compareTo(
                            new BigDecimal("99999999.99")) > 0) {
                throw new IllegalArgumentException(
                        "Enter a valid positive budget amount");
            }

            amount = amount.setScale(2, java.math.RoundingMode.HALF_UP);

            String month = YearMonth.now().toString() + "-01";

            String sql =
                    "INSERT INTO cantin_budgets "
                    + "(student_id, budget_month, budget_amount) "
                    + "VALUES (?, ?, ?) "
                    + "ON DUPLICATE KEY UPDATE "
                    + "budget_amount = VALUES(budget_amount)";

            try (Connection connection = DBConnection.getConnection()) {

                if (connection == null) {
                    throw new Exception("Database connection failed");
                }

                try (PreparedStatement statement =
                        connection.prepareStatement(sql)) {

                    statement.setInt(1, studentId);
                    statement.setDate(
                            2, java.sql.Date.valueOf(month));
                    statement.setBigDecimal(3, amount);

                    statement.executeUpdate();
                }
            }

            response.getWriter().write(
                    "{\"success\":true,\"message\":\"Budget saved successfully!\",\"budgetAmount\":" + amount.toPlainString() + "}");

        } catch (IllegalArgumentException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write(
                    "{\"success\":false,"
                    + "\"message\":\"" + escapeJson(e.getMessage()) + "\"}");

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(
                    "{\"success\":false,"
                    + "\"message\":\"Unable to save budget\"}");
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
