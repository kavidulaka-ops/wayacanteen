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

@WebServlet("/student-notifications")
public class StudentNotificationsServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("studentId") == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"success\":false,\"message\":\"Student not logged in\",\"notifications\":[]}");
            return;
        }

        int studentId = (Integer) session.getAttribute("studentId");

        String sql =
                "SELECT order_id, order_code, order_type, total_amount, status, " +
                "rejection_reason, order_date, order_time, " +
                "accepted_date, accepted_time, completed_date, completed_time " +
                "FROM orders " +
                "WHERE student_id = ? " +
                "ORDER BY order_id DESC " +
                "LIMIT 20";

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.getWriter().write("{\"success\":false,\"message\":\"Database connection error\",\"notifications\":[]}");
                return;
            }

            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setInt(1, studentId);

                try (ResultSet result = statement.executeQuery()) {
                    StringBuilder json = new StringBuilder();
                    json.append("{\"success\":true,\"notifications\":[");

                    boolean first = true;
                    int unreadCount = 0;

                    while (result.next()) {
                        int orderId = result.getInt("order_id");
                        String orderCode = result.getString("order_code");
                        String status = result.getString("status");
                        String rejectionReason = result.getString("rejection_reason");
                        String orderDate = result.getString("order_date");
                        String orderTime = result.getString("order_time");
                        String acceptedDate = result.getString("accepted_date");
                        String acceptedTime = result.getString("accepted_time");
                        String completedDate = result.getString("completed_date");
                        String completedTime = result.getString("completed_time");

                        if (status == null) status = "Pending";

                        String title = "";
                        String message = "";
                        String timeDisplay = (orderDate != null ? orderDate : "") + (orderTime != null ? " " + orderTime : "");
                        String type = status.toLowerCase();

                        if ("Rejected".equalsIgnoreCase(status)) {
                            title = "Order Rejected";
                            String reason = (rejectionReason != null && !rejectionReason.trim().isEmpty())
                                    ? rejectionReason
                                    : "Not available in this moment";
                            message = "Order #" + orderCode + " was rejected: " + reason;
                            unreadCount++;
                        } else if ("Accepted".equalsIgnoreCase(status)) {
                            title = "Order Accepted";
                            message = "Order #" + orderCode + " has been accepted! Your order is in queue ready for pickup.";
                            if (acceptedDate != null) {
                                timeDisplay = acceptedDate + (acceptedTime != null ? " " + acceptedTime : "");
                            }
                            unreadCount++;
                        } else if ("Completed".equalsIgnoreCase(status)) {
                            title = "Order Completed";
                            message = "Order #" + orderCode + " was marked as Paid & Completed. Thank you!";
                            if (completedDate != null) {
                                timeDisplay = completedDate + (completedTime != null ? " " + completedTime : "");
                            }
                        } else {
                            title = "Order Pending";
                            message = "Order #" + orderCode + " is placed and waiting for staff approval.";
                        }

                        if (!first) {
                            json.append(",");
                        }

                        json.append("{");
                        json.append("\"orderId\":").append(orderId).append(",");
                        json.append("\"orderCode\":\"").append(escapeJson(orderCode)).append("\",");
                        json.append("\"status\":\"").append(escapeJson(status)).append("\",");
                        json.append("\"type\":\"").append(escapeJson(type)).append("\",");
                        json.append("\"title\":\"").append(escapeJson(title)).append("\",");
                        json.append("\"message\":\"").append(escapeJson(message)).append("\",");
                        json.append("\"rejectionReason\":\"").append(escapeJson(rejectionReason != null ? rejectionReason : "")).append("\",");
                        json.append("\"time\":\"").append(escapeJson(timeDisplay)).append("\"");
                        json.append("}");

                        first = false;
                    }

                    json.append("],\"count\":").append(unreadCount).append("}");
                    response.getWriter().write(json.toString());
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write("{\"success\":false,\"message\":\"Error loading notifications\",\"notifications\":[]}");
        }
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder escaped = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"':  escaped.append("\\\""); break;
                case '\\': escaped.append("\\\\"); break;
                case '\b': escaped.append("\\b"); break;
                case '\f': escaped.append("\\f"); break;
                case '\n': escaped.append("\\n"); break;
                case '\r': escaped.append("\\r"); break;
                case '\t': escaped.append("\\t"); break;
                default:
                    if (c < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) c));
                    } else {
                        escaped.append(c);
                    }
                    break;
            }
        }
        return escaped.toString();
    }
}
