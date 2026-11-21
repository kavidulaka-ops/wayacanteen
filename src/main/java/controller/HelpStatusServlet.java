
package controller;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import db.DBConnection;

@WebServlet("/help-status")
public class HelpStatusServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String referenceCode = request.getParameter("referenceCode");
        if (referenceCode != null) {
            referenceCode = referenceCode.trim();
        }

        try (PrintWriter out = response.getWriter()) {

            if (referenceCode == null || referenceCode.isEmpty()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                out.print("{\"success\":false,\"message\":\"Please enter a valid reference or order code.\"}");
                return;
            }

            try (Connection con = DBConnection.getConnection()) {
                if (con == null) {
                    response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    out.print("{\"success\":false,\"message\":\"Database connection failed.\"}");
                    return;
                }

                // 1. Check help_requests (REQ-...)
                String reqSql = "SELECT reference_code, category, subject, message, status, " +
                        "target_amount, collected_amount, DATE_FORMAT(created_at, '%d %b %Y %h:%i %p') AS fdate " +
                        "FROM help_requests WHERE reference_code = ?";

                try (PreparedStatement ps = con.prepareStatement(reqSql)) {
                    ps.setString(1, referenceCode);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            double target = rs.getDouble("target_amount");
                            double collected = rs.getDouble("collected_amount");
                            int pct = target > 0 ? (int) Math.min(100, Math.round((collected / target) * 100)) : 0;
                            double remaining = Math.max(0, target - collected);

                            out.print("{\"success\":true,\"type\":\"request\",\"isHelpRequest\":true,"
                                    + "\"referenceCode\":\"" + escape(rs.getString("reference_code")) + "\","
                                    + "\"category\":\"" + escape(rs.getString("category")) + "\","
                                    + "\"subject\":\"" + escape(rs.getString("subject")) + "\","
                                    + "\"message\":\"" + escape(rs.getString("message")) + "\","
                                    + "\"status\":\"" + escape(rs.getString("status")) + "\","
                                    + "\"targetAmount\":" + target + ","
                                    + "\"collectedAmount\":" + collected + ","
                                    + "\"remainingAmount\":" + remaining + ","
                                    + "\"percentage\":" + pct + ","
                                    + "\"createdAt\":\"" + escape(rs.getString("fdate")) + "\"}");
                            return;
                        }
                    }
                }

                // 2. Check orders (CNT-...)
                String orderSql = "SELECT order_code, order_type, total_amount, status, " +
                        "DATE_FORMAT(order_date, '%d %b %Y') AS odate, TIME_FORMAT(order_time, '%h:%i %p') AS otime, " +
                        "pickup_slot, pickup_time FROM orders WHERE order_code = ?";

                try (PreparedStatement ps = con.prepareStatement(orderSql)) {
                    ps.setString(1, referenceCode);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            out.print("{\"success\":true,\"type\":\"order\",\"isOrder\":true,"
                                    + "\"referenceCode\":\"" + escape(rs.getString("order_code")) + "\","
                                    + "\"category\":\"" + escape(rs.getString("order_type")) + "\","
                                    + "\"subject\":\"Canteen " + escape(rs.getString("order_type")) + " Order\","
                                    + "\"status\":\"" + escape(rs.getString("status")) + "\","
                                    + "\"totalAmount\":" + rs.getDouble("total_amount") + ","
                                    + "\"pickupSlot\":\"" + escape(rs.getString("pickup_slot") != null ? rs.getString("pickup_slot") : "Morning") + "\","
                                    + "\"pickupTime\":\"" + escape(rs.getString("pickup_time") != null ? rs.getString("pickup_time") : "08:30") + "\","
                                    + "\"createdAt\":\"" + escape(rs.getString("odate") + " at " + rs.getString("otime")) + "\"}");
                            return;
                        }
                    }
                }

                // 3. Fallback: check help_submissions
                String subSql = "SELECT reference_code, category, subject, status, staff_response, created_at " +
                        "FROM help_submissions WHERE reference_code = ?";
                try (PreparedStatement ps = con.prepareStatement(subSql)) {
                    ps.setString(1, referenceCode);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            out.print("{\"success\":true,\"type\":\"submission\","
                                    + "\"referenceCode\":\"" + escape(rs.getString("reference_code")) + "\","
                                    + "\"category\":\"" + escape(rs.getString("category")) + "\","
                                    + "\"subject\":\"" + escape(rs.getString("subject")) + "\","
                                    + "\"status\":\"" + escape(rs.getString("status")) + "\","
                                    + "\"staffResponse\":\"" + escape(rs.getString("staff_response") != null ? rs.getString("staff_response") : "") + "\","
                                    + "\"createdAt\":\"" + escape(rs.getString("created_at")) + "\"}");
                            return;
                        }
                    }
                }

                // Not found
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                out.print("{\"success\":false,\"message\":\"No order or help request found with code '" + escape(referenceCode) + "'. Check your reference code and try again.\"}");

            } catch (Exception ex) {
                log("Status lookup error", ex);
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                out.print("{\"success\":false,\"message\":\"Database lookup error occurred.\"}");
            }
        }
    }

    private String escape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
