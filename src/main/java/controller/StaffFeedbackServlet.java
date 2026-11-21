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

@WebServlet("/staff-feedback-data")
public class StaffFeedbackServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        String categoryFilter = request.getParameter("category");
        String ratingFilter = request.getParameter("rating");
        String statusFilter = request.getParameter("status");

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"error\":\"DATABASE CONNECTION FAILED\"}");
                return;
            }

            // 1. Calculate Summary Stats
            int totalCount = 0;
            int newCount = 0;
            int star5 = 0, star4 = 0, star3 = 0, star2 = 0, star1 = 0;
            double sumRatings = 0.0;

            String statsSql = "SELECT rating, status FROM feedback";
            try (PreparedStatement stmt = connection.prepareStatement(statsSql);
                 ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    int r = rs.getInt("rating");
                    String s = rs.getString("status");
                    totalCount++;
                    sumRatings += r;
                    if ("New".equalsIgnoreCase(s)) newCount++;

                    if (r == 5) star5++;
                    else if (r == 4) star4++;
                    else if (r == 3) star3++;
                    else if (r == 2) star2++;
                    else if (r == 1) star1++;
                }
            }

            double avgRating = totalCount > 0 ? (sumRatings / totalCount) : 5.0;

            // 2. Fetch Filtered Feedbacks List
            StringBuilder listSql = new StringBuilder(
                "SELECT feedback_id, student_id, student_name, index_number, category, rating, order_code, feedback_text, status, created_at " +
                "FROM feedback WHERE 1=1 "
            );

            if (categoryFilter != null && !categoryFilter.trim().isEmpty() && !categoryFilter.equalsIgnoreCase("All")) {
                listSql.append("AND category = ? ");
            }
            if (ratingFilter != null && !ratingFilter.trim().isEmpty() && !ratingFilter.equalsIgnoreCase("All")) {
                listSql.append("AND rating = ? ");
            }
            if (statusFilter != null && !statusFilter.trim().isEmpty() && !statusFilter.equalsIgnoreCase("All")) {
                listSql.append("AND status = ? ");
            }

            listSql.append("ORDER BY feedback_id DESC");

            StringBuilder itemsJson = new StringBuilder();
            itemsJson.append("[");
            boolean first = true;

            try (PreparedStatement listStmt = connection.prepareStatement(listSql.toString())) {
                int pIdx = 1;
                if (categoryFilter != null && !categoryFilter.trim().isEmpty() && !categoryFilter.equalsIgnoreCase("All")) {
                    listStmt.setString(pIdx++, categoryFilter.trim());
                }
                if (ratingFilter != null && !ratingFilter.trim().isEmpty() && !ratingFilter.equalsIgnoreCase("All")) {
                    listStmt.setInt(pIdx++, Integer.parseInt(ratingFilter.trim()));
                }
                if (statusFilter != null && !statusFilter.trim().isEmpty() && !statusFilter.equalsIgnoreCase("All")) {
                    listStmt.setString(pIdx++, statusFilter.trim());
                }

                try (ResultSet rs = listStmt.executeQuery()) {
                    while (rs.next()) {
                        if (!first) itemsJson.append(",");
                        first = false;

                        itemsJson.append("{")
                            .append("\"feedbackId\":").append(rs.getInt("feedback_id")).append(",")
                            .append("\"studentId\":").append(rs.getObject("student_id") != null ? rs.getInt("student_id") : "null").append(",")
                            .append("\"studentName\":\"").append(escapeJson(rs.getString("student_name"))).append("\",")
                            .append("\"indexNumber\":\"").append(escapeJson(rs.getString("index_number"))).append("\",")
                            .append("\"category\":\"").append(escapeJson(rs.getString("category"))).append("\",")
                            .append("\"rating\":").append(rs.getInt("rating")).append(",")
                            .append("\"orderCode\":\"").append(escapeJson(rs.getString("order_code") != null ? rs.getString("order_code") : "")).append("\",")
                            .append("\"feedbackText\":\"").append(escapeJson(rs.getString("feedback_text"))).append("\",")
                            .append("\"status\":\"").append(escapeJson(rs.getString("status"))).append("\",")
                            .append("\"createdAt\":\"").append(escapeJson(rs.getString("created_at"))).append("\"")
                            .append("}");
                    }
                }
            }
            itemsJson.append("]");

            StringBuilder fullResponse = new StringBuilder();
            fullResponse.append("{")
                .append("\"stats\":{")
                .append("\"totalCount\":").append(totalCount).append(",")
                .append("\"newCount\":").append(newCount).append(",")
                .append("\"avgRating\":").append(String.format(java.util.Locale.US, "%.1f", avgRating)).append(",")
                .append("\"star5\":").append(star5).append(",")
                .append("\"star4\":").append(star4).append(",")
                .append("\"star3\":").append(star3).append(",")
                .append("\"star2\":").append(star2).append(",")
                .append("\"star1\":").append(star1)
                .append("},")
                .append("\"items\":").append(itemsJson.toString())
                .append("}");

            response.getWriter().print(fullResponse.toString());

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().println("{\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String action = request.getParameter("action");
        String idStr = request.getParameter("feedbackId");

        if (idStr == null || idStr.trim().isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("{\"success\":false,\"message\":\"Missing feedback ID\"}");
            return;
        }

        int feedbackId;
        try {
            feedbackId = Integer.parseInt(idStr.trim());
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("{\"success\":false,\"message\":\"Invalid feedback ID\"}");
            return;
        }

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"success\":false,\"message\":\"Database connection failed.\"}");
                return;
            }

            if ("review".equalsIgnoreCase(action)) {
                String sql = "UPDATE feedback SET status = 'Reviewed' WHERE feedback_id = ?";
                try (PreparedStatement stmt = connection.prepareStatement(sql)) {
                    stmt.setInt(1, feedbackId);
                    int affected = stmt.executeUpdate();
                    response.getWriter().println("{\"success\":" + (affected > 0) + ",\"message\":\"Feedback marked as reviewed.\"}");
                }
            } else if ("delete".equalsIgnoreCase(action)) {
                String sql = "DELETE FROM feedback WHERE feedback_id = ?";
                try (PreparedStatement stmt = connection.prepareStatement(sql)) {
                    stmt.setInt(1, feedbackId);
                    int affected = stmt.executeUpdate();
                    response.getWriter().println("{\"success\":" + (affected > 0) + ",\"message\":\"Feedback deleted.\"}");
                }
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().println("{\"success\":false,\"message\":\"Unknown action\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
