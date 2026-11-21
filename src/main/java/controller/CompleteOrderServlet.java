package controller;

import db.DBConnection;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@WebServlet("/complete-order")
public class CompleteOrderServlet extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String orderCodeParam = request.getParameter("orderCode");
        String orderIdParam = request.getParameter("orderId");

        String identifier = null;
        if (orderCodeParam != null && !orderCodeParam.trim().isEmpty()) {
            identifier = orderCodeParam.trim();
        } else if (orderIdParam != null && !orderIdParam.trim().isEmpty()) {
            identifier = orderIdParam.trim();
        }

        if (identifier == null) {
            response.getWriter().println("{\"success\":false,\"message\":\"Order ID or Code is missing\"}");
            return;
        }

        boolean isNumeric = identifier.matches("\\d+");
        int numericId = isNumeric ? Integer.parseInt(identifier) : -1;

        // 1. Check current order status
        String selectSql = "SELECT o.order_id, o.order_code, o.status, o.total_amount, " +
                "o.order_date, o.order_time, s.index_number, s.full_name " +
                "FROM orders o " +
                "LEFT JOIN students s ON o.student_id = s.student_id " +
                "WHERE o.order_code = ? OR o.order_id = ?";

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"success\":false,\"message\":\"Database connection failed\"}");
                return;
            }

            int foundOrderId = -1;
            String foundOrderCode = "";
            String currentStatus = "";
            double totalAmount = 0.0;
            String studentIndex = "";
            String studentName = "";

            try (PreparedStatement checkStmt = connection.prepareStatement(selectSql)) {
                checkStmt.setString(1, identifier);
                checkStmt.setInt(2, numericId);

                try (ResultSet rs = checkStmt.executeQuery()) {
                    if (!rs.next()) {
                        response.getWriter().println("{\"success\":false,\"message\":\"Order not found: " + escapeJson(identifier) + "\"}");
                        return;
                    }

                    foundOrderId = rs.getInt("order_id");
                    foundOrderCode = rs.getString("order_code");
                    currentStatus = rs.getString("status");
                    totalAmount = rs.getDouble("total_amount");
                    studentIndex = rs.getString("index_number");
                    studentName = rs.getString("full_name");
                }
            }

            // Already completed check
            if ("Completed".equalsIgnoreCase(currentStatus)) {
                response.getWriter().println("{" +
                        "\"success\":false," +
                        "\"alreadyCompleted\":true," +
                        "\"message\":\"This order is ALREADY marked as Paid & Completed.\"," +
                        "\"orderId\":" + foundOrderId + "," +
                        "\"orderCode\":\"" + escapeJson(foundOrderCode) + "\"," +
                        "\"totalAmount\":" + totalAmount + "," +
                        "\"studentIndex\":\"" + escapeJson(studentIndex) + "\"," +
                        "\"studentName\":\"" + escapeJson(studentName) + "\"}");
                return;
            }

            // Pending check: QR scan CANNOT complete pending orders, staff must accept first
            if ("Pending".equalsIgnoreCase(currentStatus)) {
                response.getWriter().println("{" +
                        "\"success\":false," +
                        "\"isPending\":true," +
                        "\"message\":\"This order is still Pending. Please Accept the order first from Pending Orders.\"," +
                        "\"orderId\":" + foundOrderId + "," +
                        "\"orderCode\":\"" + escapeJson(foundOrderCode) + "\"," +
                        "\"totalAmount\":" + totalAmount + "," +
                        "\"studentIndex\":\"" + escapeJson(studentIndex) + "\"," +
                        "\"studentName\":\"" + escapeJson(studentName) + "\"}");
                return;
            }

            // Rejected check
            if ("Rejected".equalsIgnoreCase(currentStatus)) {
                response.getWriter().println("{" +
                        "\"success\":false," +
                        "\"message\":\"Cannot complete: This order was Rejected by staff.\"," +
                        "\"orderId\":" + foundOrderId + "," +
                        "\"orderCode\":\"" + escapeJson(foundOrderCode) + "\"}");
                return;
            }

            // Must be in Accepted status to be completed via QR scan / counter payment
            if (!"Accepted".equalsIgnoreCase(currentStatus)) {
                response.getWriter().println("{" +
                        "\"success\":false," +
                        "\"message\":\"Cannot complete: Order status is " + escapeJson(currentStatus) + "\"," +
                        "\"orderId\":" + foundOrderId + "," +
                        "\"orderCode\":\"" + escapeJson(foundOrderCode) + "\"}");
                return;
            }

            // 2. Mark order as Completed (strictly for Accepted orders)
            String updateSql = "UPDATE orders SET " +
                    "status = 'Completed', " +
                    "completed_date = CURDATE(), " +
                    "completed_time = CURTIME() " +
                    "WHERE order_id = ? AND status = 'Accepted'";

            try (PreparedStatement updateStmt = connection.prepareStatement(updateSql)) {
                updateStmt.setInt(1, foundOrderId);
                int rows = updateStmt.executeUpdate();

                if (rows > 0) {
                    response.getWriter().println("{" +
                            "\"success\":true," +
                            "\"message\":\"Order successfully marked as Paid & Completed!\"," +
                            "\"orderId\":" + foundOrderId + "," +
                            "\"orderCode\":\"" + escapeJson(foundOrderCode) + "\"," +
                            "\"totalAmount\":" + totalAmount + "," +
                            "\"studentIndex\":\"" + escapeJson(studentIndex) + "\"," +
                            "\"studentName\":\"" + escapeJson(studentName) + "\"," +
                            "\"status\":\"Completed\"}");
                } else {
                    response.getWriter().println("{\"success\":false,\"message\":\"Failed to update order status\"}");
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
