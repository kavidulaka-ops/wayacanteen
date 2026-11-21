package controller;

import db.DBConnection;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;

@WebServlet("/staff-help-requests")
public class StaffHelpCenterServlet extends HttpServlet {

    // GET: Staff review and dashboard list
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        String statusFilter = request.getParameter("status");

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                out.println("{\"success\":false,\"message\":\"Database connection error\"}");
                return;
            }

            // Summary metrics
            int pendingCount = 0;
            int activeCount = 0;
            int fundedCount = 0;
            int completedCount = 0;
            double totalRaised = 0.0;

            String countSql = "SELECT " +
                    "SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_c, " +
                    "SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS active_c, " +
                    "SUM(CASE WHEN status = 'Funded' THEN 1 ELSE 0 END) AS funded_c, " +
                    "SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_c, " +
                    "COALESCE(SUM(collected_amount), 0.0) AS total_raised " +
                    "FROM help_requests WHERE status != 'Rejected'";

            try (Statement stmt = connection.createStatement();
                 ResultSet rs = stmt.executeQuery(countSql)) {
                if (rs.next()) {
                    pendingCount = rs.getInt("pending_c");
                    activeCount = rs.getInt("active_c");
                    fundedCount = rs.getInt("funded_c");
                    completedCount = rs.getInt("completed_c");
                    totalRaised = rs.getDouble("total_raised");
                }
            } catch (Exception ignored) {}

            // Requests list
            StringBuilder sql = new StringBuilder(
                    "SELECT help_id, reference_code, student_id, student_index, " +
                    "category, subject, message, target_amount, collected_amount, status, " +
                    "DATE_FORMAT(created_at, '%d %b %Y, %h:%i %p') AS formatted_date " +
                    "FROM help_requests "
            );

            if (statusFilter != null && !statusFilter.equalsIgnoreCase("All") && !statusFilter.trim().isEmpty()) {
                sql.append("WHERE status = ? ");
            }

            sql.append("ORDER BY " +
                    "CASE status " +
                    "  WHEN 'Pending' THEN 1 " +
                    "  WHEN 'Funded' THEN 2 " +
                    "  WHEN 'Approved' THEN 3 " +
                    "  WHEN 'Completed' THEN 4 " +
                    "  ELSE 5 END, created_at DESC");

            StringBuilder itemsJson = new StringBuilder("[");
            try (PreparedStatement ps = connection.prepareStatement(sql.toString())) {
                if (statusFilter != null && !statusFilter.equalsIgnoreCase("All") && !statusFilter.trim().isEmpty()) {
                    ps.setString(1, statusFilter.trim());
                }

                try (ResultSet rs = ps.executeQuery()) {
                    boolean first = true;
                    while (rs.next()) {
                        if (!first) itemsJson.append(",");
                        first = false;

                        double target = rs.getDouble("target_amount");
                        double collected = rs.getDouble("collected_amount");
                        int pct = target > 0 ? (int) Math.min(100, Math.round((collected / target) * 100)) : 0;
                        double remaining = Math.max(0, target - collected);

                        itemsJson.append("{");
                        itemsJson.append("\"helpId\":").append(rs.getInt("help_id")).append(",");
                        itemsJson.append("\"referenceCode\":\"").append(escapeJson(rs.getString("reference_code"))).append("\",");
                        itemsJson.append("\"studentIndex\":\"").append(escapeJson(rs.getString("student_index"))).append("\",");
                        itemsJson.append("\"category\":\"").append(escapeJson(rs.getString("category"))).append("\",");
                        itemsJson.append("\"subject\":\"").append(escapeJson(rs.getString("subject"))).append("\",");
                        itemsJson.append("\"message\":\"").append(escapeJson(rs.getString("message"))).append("\",");
                        itemsJson.append("\"targetAmount\":").append(formatMoney(target)).append(",");
                        itemsJson.append("\"collectedAmount\":").append(formatMoney(collected)).append(",");
                        itemsJson.append("\"remainingAmount\":").append(formatMoney(remaining)).append(",");
                        itemsJson.append("\"percentage\":").append(pct).append(",");
                        itemsJson.append("\"status\":\"").append(rs.getString("status")).append("\",");
                        itemsJson.append("\"createdAt\":\"").append(escapeJson(rs.getString("formatted_date"))).append("\"");
                        itemsJson.append("}");
                    }
                }
            }
            itemsJson.append("]");

            out.println("{" +
                    "\"success\":true," +
                    "\"pendingCount\":" + pendingCount + "," +
                    "\"activeCount\":" + activeCount + "," +
                    "\"fundedCount\":" + fundedCount + "," +
                    "\"completedCount\":" + completedCount + "," +
                    "\"totalRaised\":" + formatMoney(totalRaised) + "," +
                    "\"requests\":" + itemsJson.toString() +
                    "}");

        } catch (Exception e) {
            e.printStackTrace();
            out.println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    // POST: Approve, Reject, Record Counter Contribution, or Complete
    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        String action = request.getParameter("action");
        String helpIdStr = request.getParameter("helpId");

        if (action == null || helpIdStr == null) {
            out.println("{\"success\":false,\"message\":\"Missing action or request ID.\"}");
            return;
        }

        int helpId;
        try {
            helpId = Integer.parseInt(helpIdStr.trim());
        } catch (NumberFormatException e) {
            out.println("{\"success\":false,\"message\":\"Invalid help ID.\"}");
            return;
        }

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                out.println("{\"success\":false,\"message\":\"Database connection error.\"}");
                return;
            }

            // 1. APPROVE REQUEST
            if ("approve".equalsIgnoreCase(action)) {
                String sql = "UPDATE help_requests SET status = 'Approved' WHERE help_id = ?";
                try (PreparedStatement ps = connection.prepareStatement(sql)) {
                    ps.setInt(1, helpId);
                    int updated = ps.executeUpdate();
                    if (updated > 0) {
                        out.println("{\"success\":true,\"message\":\"Help request approved and published to the community board!\"}");
                    } else {
                        out.println("{\"success\":false,\"message\":\"Request not found.\"}");
                    }
                }
                return;
            }

            // 2. REJECT REQUEST
            if ("reject".equalsIgnoreCase(action)) {
                String sql = "UPDATE help_requests SET status = 'Rejected' WHERE help_id = ?";
                try (PreparedStatement ps = connection.prepareStatement(sql)) {
                    ps.setInt(1, helpId);
                    int updated = ps.executeUpdate();
                    if (updated > 0) {
                        out.println("{\"success\":true,\"message\":\"Help request rejected.\"}");
                    } else {
                        out.println("{\"success\":false,\"message\":\"Request not found.\"}");
                    }
                }
                return;
            }

            // 3. RECORD COUNTER CASH CONTRIBUTION (Donation from Student B or Customer)
            if ("record_donation".equalsIgnoreCase(action)) {
                String amountStr = request.getParameter("amount");
                String donorNote = request.getParameter("donorNote");

                if (amountStr == null || amountStr.trim().isEmpty()) {
                    out.println("{\"success\":false,\"message\":\"Donation amount is required.\"}");
                    return;
                }

                double donationAmount;
                try {
                    donationAmount = Double.parseDouble(amountStr.trim());
                    if (donationAmount <= 0) {
                        out.println("{\"success\":false,\"message\":\"Amount must be greater than zero.\"}");
                        return;
                    }
                } catch (NumberFormatException e) {
                    out.println("{\"success\":false,\"message\":\"Invalid donation amount.\"}");
                    return;
                }

                // Check current request
                double currentTarget = 0.0;
                double currentCollected = 0.0;
                String currentStatus = "Approved";

                String checkSql = "SELECT target_amount, collected_amount, status FROM help_requests WHERE help_id = ?";
                try (PreparedStatement ps = connection.prepareStatement(checkSql)) {
                    ps.setInt(1, helpId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            currentTarget = rs.getDouble("target_amount");
                            currentCollected = rs.getDouble("collected_amount");
                            currentStatus = rs.getString("status");
                        } else {
                            out.println("{\"success\":false,\"message\":\"Request not found.\"}");
                            return;
                        }
                    }
                }

                double newCollected = currentCollected + donationAmount;
                String newStatus = currentStatus;
                if (newCollected >= currentTarget && !currentStatus.equals("Completed")) {
                    newStatus = "Funded";
                }

                // Record in help_contributions
                SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd");
                String donRef = "DON-" + sdf.format(new Date()) + "-" + (100 + new Random().nextInt(900));

                String donSql = "INSERT INTO help_contributions " +
                        "(request_id, amount, payment_reference, status, confirmed_at) " +
                        "VALUES (?, ?, ?, 'Confirmed', NOW())";

                try (PreparedStatement ps = connection.prepareStatement(donSql)) {
                    ps.setInt(1, helpId);
                    ps.setDouble(2, donationAmount);
                    ps.setString(3, donRef);
                    ps.executeUpdate();
                } catch (Exception ex) {
                    // ignore if duplicate ref, retry once
                }

                // Update request
                String updateSql = "UPDATE help_requests SET collected_amount = ?, status = ? WHERE help_id = ?";
                try (PreparedStatement ps = connection.prepareStatement(updateSql)) {
                    ps.setDouble(1, newCollected);
                    ps.setString(2, newStatus);
                    ps.setInt(3, helpId);
                    ps.executeUpdate();
                }

                int pct = currentTarget > 0 ? (int) Math.min(100, Math.round((newCollected / currentTarget) * 100)) : 0;
                double remaining = Math.max(0, currentTarget - newCollected);

                out.println("{" +
                        "\"success\":true," +
                        "\"message\":\"Rs. " + formatMoney(donationAmount) + " contribution recorded successfully!\"," +
                        "\"collectedAmount\":" + formatMoney(newCollected) + "," +
                        "\"targetAmount\":" + formatMoney(currentTarget) + "," +
                        "\"remainingAmount\":" + formatMoney(remaining) + "," +
                        "\"percentage\":" + pct + "," +
                        "\"status\":\"" + newStatus + "\"" +
                        "}");
                return;
            }

            // 4. MARK AS HANDED OVER / COMPLETED
            if ("complete".equalsIgnoreCase(action)) {
                String sql = "UPDATE help_requests SET status = 'Completed' WHERE help_id = ?";
                try (PreparedStatement ps = connection.prepareStatement(sql)) {
                    ps.setInt(1, helpId);
                    int updated = ps.executeUpdate();
                    if (updated > 0) {
                        out.println("{\"success\":true,\"message\":\"Request marked as Handed Over & Completed!\"}");
                    } else {
                        out.println("{\"success\":false,\"message\":\"Request not found.\"}");
                    }
                }
                return;
            }

            out.println("{\"success\":false,\"message\":\"Unknown action: " + escapeJson(action) + "\"}");

        } catch (Exception e) {
            e.printStackTrace();
            out.println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private String formatMoney(double val) {
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP).toString();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
