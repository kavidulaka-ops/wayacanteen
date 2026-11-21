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

@WebServlet("/student-order-history")
public class StudentOrderHistoryServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        // Check student login session
        HttpSession session = request.getSession(false);

        if (session == null ||
                session.getAttribute("studentId") == null) {

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

            response.getWriter().write(
                    "{\"success\":false,\"message\":\"Student not logged in\"}"
            );

            return;
        }

        int studentId =
                (Integer) session.getAttribute("studentId");

        String sql =
                "SELECT order_id, order_code, order_type, " +
                "total_amount, status, rejection_reason, order_date, order_time, " +
                "accepted_date, accepted_time, completed_date, completed_time, pickup_slot, pickup_time " +
                "FROM orders " +
                "WHERE student_id = ? " +
                "ORDER BY order_id DESC";

        try (Connection connection = DBConnection.getConnection()) {

            if (connection == null) {

                response.setStatus(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR
                );

                response.getWriter().write(
                        "{\"success\":false,\"message\":\"Database connection failed\"}"
                );

                return;
            }

            try (PreparedStatement statement =
                    connection.prepareStatement(sql)) {

                statement.setInt(1, studentId);

                try (ResultSet result = statement.executeQuery()) {

                    StringBuilder json = new StringBuilder();

                    json.append("{");
                    json.append("\"success\":true,");
                    json.append("\"orders\":[");

                    boolean firstOrder = true;

                    while (result.next()) {

                        if (!firstOrder) {
                            json.append(",");
                        }

                        int orderId =
                                result.getInt("order_id");

                        String orderCode =
                                result.getString("order_code");

                        String orderType =
                                result.getString("order_type");

                        double totalAmount =
                                result.getDouble("total_amount");

                        String status =
                                result.getString("status");

                        String rejectionReason =
                                result.getString("rejection_reason");

                        String orderDate =
                                result.getString("order_date");

                        String orderTime =
                                result.getString("order_time");

                        String acceptedDate =
                                result.getString("accepted_date");

                        String acceptedTime =
                                result.getString("accepted_time");

                        String completedDate =
                                result.getString("completed_date");

                        String completedTime =
                                result.getString("completed_time");

                        String pickupSlot =
                                result.getString("pickup_slot");

                        String pickupTime =
                                result.getString("pickup_time");

                        json.append("{");

                        json.append("\"orderId\":")
                                .append(orderId).append(",");

                        json.append("\"orderCode\":\"")
                                .append(escapeJson(orderCode))
                                .append("\",");

                        json.append("\"orderType\":\"")
                                .append(escapeJson(orderType))
                                .append("\",");

                        json.append("\"totalAmount\":")
                                .append(totalAmount).append(",");

                        json.append("\"status\":\"")
                                .append(escapeJson(status))
                                .append("\",");

                        json.append("\"rejectionReason\":\"")
                                .append(escapeJson(rejectionReason != null ? rejectionReason : ""))
                                .append("\",");

                        json.append("\"orderDate\":\"")
                                .append(escapeJson(orderDate))
                                .append("\",");

                        json.append("\"orderTime\":\"")
                                .append(escapeJson(orderTime))
                                .append("\",");

                        json.append("\"pickupSlot\":\"")
                                .append(escapeJson(pickupSlot != null ? pickupSlot : "Morning"))
                                .append("\",");

                        json.append("\"pickupTime\":\"")
                                .append(escapeJson(pickupTime != null ? pickupTime : ""))
                                .append("\",");

                        json.append("\"acceptedDate\":\"")
                                .append(escapeJson(acceptedDate))
                                .append("\",");

                        json.append("\"acceptedTime\":\"")
                                .append(escapeJson(acceptedTime))
                                .append("\",");

                        json.append("\"completedDate\":\"")
                                .append(escapeJson(completedDate))
                                .append("\",");

                        json.append("\"completedTime\":\"")
                                .append(escapeJson(completedTime))
                                .append("\"");

                        json.append("}");

                        firstOrder = false;
                    }

                    json.append("]}");

                    response.getWriter().write(json.toString());
                }
            }

        } catch (Exception e) {

            e.printStackTrace();

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR
            );

            response.getWriter().write(
                    "{\"success\":false,\"message\":\"Unable to load order history\"}"
            );
        }
    }

    // Safely escape JSON string values
    private String escapeJson(String value) {

        if (value == null) {
            return "";
        }

        StringBuilder escaped = new StringBuilder();

        for (int i = 0; i < value.length(); i++) {

            char c = value.charAt(i);

            switch (c) {

                case '"':
                    escaped.append("\\\"");
                    break;

                case '\\':
                    escaped.append("\\\\");
                    break;

                case '\b':
                    escaped.append("\\b");
                    break;

                case '\f':
                    escaped.append("\\f");
                    break;

                case '\n':
                    escaped.append("\\n");
                    break;

                case '\r':
                    escaped.append("\\r");
                    break;

                case '\t':
                    escaped.append("\\t");
                    break;

                default:
                    if (c < 0x20) {
                        escaped.append(
                                String.format("\\u%04x", (int) c)
                        );
                    } else {
                        escaped.append(c);
                    }
                    break;
            }
        }

        return escaped.toString();
    }
}
