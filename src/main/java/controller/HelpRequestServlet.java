package controller;

import db.DBConnection;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

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

@WebServlet("/help-requests")
public class HelpRequestServlet extends HttpServlet {

    // GET: Public Community Board & Tracking
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        String type = request.getParameter("type");
        if (type == null || type.trim().isEmpty()) {
            type = "public";
        }

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                out.println("{\"success\":false,\"message\":\"Database connection error\"}");
                return;
            }

            // Tracking a specific reference code
            if ("track".equalsIgnoreCase(type)) {
                String code = request.getParameter("code");
                if (code == null || code.trim().isEmpty()) {
                    out.println("{\"success\":false,\"message\":\"Reference code required\"}");
                    return;
                }

                String sql = "SELECT help_id, reference_code, category, subject, message, " +
                        "target_amount, collected_amount, status, " +
                        "DATE_FORMAT(created_at, '%d %b %Y %h:%i %p') AS formatted_date " +
                        "FROM help_requests WHERE reference_code = ?";

                try (PreparedStatement ps = connection.prepareStatement(sql)) {
                    ps.setString(1, code.trim());
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            double target = rs.getDouble("target_amount");
                            double collected = rs.getDouble("collected_amount");
                            int pct = target > 0 ? (int) Math.min(100, Math.round((collected / target) * 100)) : 0;
                            double remaining = Math.max(0, target - collected);

                            out.println("{" +
                                    "\"success\":true," +
                                    "\"helpId\":" + rs.getInt("help_id") + "," +
                                    "\"referenceCode\":\"" + escapeJson(rs.getString("reference_code")) + "\"," +
                                    "\"category\":\"" + escapeJson(rs.getString("category")) + "\"," +
                                    "\"subject\":\"" + escapeJson(rs.getString("subject")) + "\"," +
                                    "\"message\":\"" + escapeJson(rs.getString("message")) + "\"," +
                                    "\"targetAmount\":" + formatMoney(target) + "," +
                                    "\"collectedAmount\":" + formatMoney(collected) + "," +
                                    "\"remainingAmount\":" + formatMoney(remaining) + "," +
                                    "\"percentage\":" + pct + "," +
                                    "\"status\":\"" + rs.getString("status") + "\"," +
                                    "\"createdAt\":\"" + escapeJson(rs.getString("formatted_date")) + "\"" +
                                    "}");
                        } else {
                            // Check if it is a canteen order code (e.g. CNT-...)
                            String orderSql = "SELECT order_code, order_type, total_amount, status, " +
                                    "DATE_FORMAT(order_date, '%d %b %Y') AS odate, TIME_FORMAT(order_time, '%h:%i %p') AS otime, " +
                                    "pickup_slot, pickup_time FROM orders WHERE order_code = ?";
                            try (PreparedStatement ops = connection.prepareStatement(orderSql)) {
                                ops.setString(1, code.trim());
                                try (ResultSet ors = ops.executeQuery()) {
                                    if (ors.next()) {
                                        String pSlot = ors.getString("pickup_slot") != null ? ors.getString("pickup_slot") : "Morning";
                                        String pTime = ors.getString("pickup_time") != null ? ors.getString("pickup_time") : "08:30";
                                        out.println("{" +
                                                "\"success\":true," +
                                                "\"isOrder\":true," +
                                                "\"referenceCode\":\"" + escapeJson(ors.getString("order_code")) + "\"," +
                                                "\"category\":\"" + escapeJson(ors.getString("order_type")) + "\"," +
                                                "\"subject\":\"Canteen " + escapeJson(ors.getString("order_type")) + " Order\"," +
                                                "\"message\":\"Scheduled Counter Collection: " + escapeJson(pSlot) + " (" + escapeJson(pTime) + ")\"," +
                                                "\"targetAmount\":\"" + formatMoney(ors.getDouble("total_amount")) + "\"," +
                                                "\"collectedAmount\":\"" + formatMoney(ors.getDouble("total_amount")) + "\"," +
                                                "\"remainingAmount\":\"0.00\"," +
                                                "\"percentage\":100," +
                                                "\"status\":\"" + ors.getString("status") + "\"," +
                                                "\"createdAt\":\"" + escapeJson(ors.getString("odate") + " at " + ors.getString("otime")) + "\"" +
                                                "}");
                                        return;
                                    }
                                }
                            }
                            out.println("{\"success\":false,\"message\":\"No request or order found with reference code '" + escapeJson(code.trim()) + "'\"}");
                        }
                    }
                }
                return;
            }

            // Public community board: only Approved or Funded requests, 100% ANONYMOUS
            String categoryFilter = request.getParameter("category");
            StringBuilder sql = new StringBuilder(
                    "SELECT help_id, reference_code, category, subject, message, " +
                    "target_amount, collected_amount, status, " +
                    "DATE_FORMAT(created_at, '%d %b %Y') AS formatted_date " +
                    "FROM help_requests " +
                    "WHERE status IN ('Approved', 'Funded') "
            );

            if (categoryFilter != null && !categoryFilter.equalsIgnoreCase("All") && !categoryFilter.trim().isEmpty()) {
                sql.append("AND category = ? ");
            }

            sql.append("ORDER BY FIELD(status, 'Approved', 'Funded'), created_at DESC");

            try (PreparedStatement ps = connection.prepareStatement(sql.toString())) {
                if (categoryFilter != null && !categoryFilter.equalsIgnoreCase("All") && !categoryFilter.trim().isEmpty()) {
                    ps.setString(1, categoryFilter.trim());
                }

                try (ResultSet rs = ps.executeQuery()) {
                    StringBuilder json = new StringBuilder("[");
                    boolean first = true;

                    while (rs.next()) {
                        if (!first) json.append(",");
                        first = false;

                        double target = rs.getDouble("target_amount");
                        double collected = rs.getDouble("collected_amount");
                        int pct = target > 0 ? (int) Math.min(100, Math.round((collected / target) * 100)) : 0;
                        double remaining = Math.max(0, target - collected);

                        json.append("{");
                        json.append("\"helpId\":").append(rs.getInt("help_id")).append(",");
                        json.append("\"referenceCode\":\"").append(escapeJson(rs.getString("reference_code"))).append("\",");
                        json.append("\"category\":\"").append(escapeJson(rs.getString("category"))).append("\",");
                        json.append("\"subject\":\"").append(escapeJson(rs.getString("subject"))).append("\",");
                        json.append("\"message\":\"").append(escapeJson(rs.getString("message"))).append("\",");
                        json.append("\"targetAmount\":").append(formatMoney(target)).append(",");
                        json.append("\"collectedAmount\":").append(formatMoney(collected)).append(",");
                        json.append("\"remainingAmount\":").append(formatMoney(remaining)).append(",");
                        json.append("\"percentage\":").append(pct).append(",");
                        json.append("\"status\":\"").append(rs.getString("status")).append("\",");
                        json.append("\"createdAt\":\"").append(escapeJson(rs.getString("formatted_date"))).append("\"");
                        json.append("}");
                    }
                    json.append("]");
                    out.println(json.toString());
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            out.println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    // POST: Submit a new anonymous help request
    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();

        String category = request.getParameter("category");
        String subject = request.getParameter("subject");
        String message = request.getParameter("message");
        String targetAmountStr = request.getParameter("targetAmount");

        if (category == null || category.trim().isEmpty() ||
            subject == null || subject.trim().isEmpty() ||
            message == null || message.trim().isEmpty() ||
            targetAmountStr == null || targetAmountStr.trim().isEmpty()) {

            out.println("{\"success\":false,\"message\":\"Please fill in all required fields.\"}");
            return;
        }

        double targetAmount;
        try {
            targetAmount = Double.parseDouble(targetAmountStr.trim());
            if (targetAmount <= 0) {
                out.println("{\"success\":false,\"message\":\"Amount must be greater than zero.\"}");
                return;
            }
        } catch (NumberFormatException e) {
            out.println("{\"success\":false,\"message\":\"Invalid target amount value.\"}");
            return;
        }

        // Student identity (kept confidential in DB, never exposed to other students)
        HttpSession session = request.getSession(false);
        Integer studentId = null;
        String studentIndex = null;

        if (session != null) {
            Object idObj = session.getAttribute("studentId");
            if (idObj instanceof Integer) {
                studentId = (Integer) idObj;
            }
            Object idxObj = session.getAttribute("indexNumber");
            if (idxObj instanceof String) {
                studentIndex = (String) idxObj;
            }
        }

        if (studentIndex == null) {
            studentIndex = request.getParameter("studentIndex");
            if (studentIndex != null) studentIndex = studentIndex.trim();
        }

        // Generate unique reference code: REQ-YYYYMMDD-XXX
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd");
        String datePart = sdf.format(new Date());
        int randomDigits = 100 + new Random().nextInt(900);
        String referenceCode = "REQ-" + datePart + "-" + randomDigits;

        String insertSql = "INSERT INTO help_requests " +
                "(category, subject, message, target_amount, collected_amount, status, student_id, student_index, reference_code) " +
                "VALUES (?, ?, ?, ?, 0.00, 'Pending', ?, ?, ?)";

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                out.println("{\"success\":false,\"message\":\"Database connection error.\"}");
                return;
            }

            try (PreparedStatement statement = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS)) {
                statement.setString(1, category.trim());
                statement.setString(2, subject.trim());
                statement.setString(3, message.trim());
                statement.setDouble(4, targetAmount);
                if (studentId != null) {
                    statement.setInt(5, studentId);
                } else {
                    statement.setNull(5, java.sql.Types.INTEGER);
                }
                statement.setString(6, studentIndex);
                statement.setString(7, referenceCode);

                int rows = statement.executeUpdate();
                if (rows > 0) {
                    out.println("{" +
                            "\"success\":true," +
                            "\"referenceCode\":\"" + referenceCode + "\"," +
                            "\"targetAmount\":" + formatMoney(targetAmount) + "," +
                            "\"message\":\"Your help request has been submitted anonymously! It will be reviewed by canteen staff and published to the solidarity board.\" " +
                            "}");
                } else {
                    out.println("{\"success\":false,\"message\":\"Failed to save help request.\"}");
                }
            }

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
