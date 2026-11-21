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

@WebServlet("/reject-order")
public class RejectOrderServlet extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String orderIdString = request.getParameter("orderId");
        String reason = request.getParameter("reason");

        if (reason == null || reason.trim().isEmpty()) {
            reason = "Not available in this moment";
        } else {
            reason = reason.trim();
        }

        if (orderIdString == null || orderIdString.trim().isEmpty()) {
            response.getWriter().println("{\"success\":false,\"message\":\"Order ID is missing\"}");
            return;
        }

        int orderId;
        try {
            orderId = Integer.parseInt(orderIdString);
        } catch (NumberFormatException e) {
            response.getWriter().println("{\"success\":false,\"message\":\"Invalid Order ID\"}");
            return;
        }

        String sql = "UPDATE orders SET status = 'Rejected', rejection_reason = ? WHERE order_id = ? AND status = 'Pending'";

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"success\":false,\"message\":\"DATABASE CONNECTION FAILED\"}");
                return;
            }

            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setString(1, reason);
                statement.setInt(2, orderId);

                int rowsUpdated = statement.executeUpdate();
                if (rowsUpdated > 0) {
                    response.getWriter().println(
                            "{\"success\":true,\"message\":\"Order rejected: "
                            + escapeJson(reason)
                            + "\"}"
                    );
                } else {
                    response.getWriter().println(
                            "{\"success\":false,\"message\":\"Order not found or not in pending state\"}"
                    );
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
