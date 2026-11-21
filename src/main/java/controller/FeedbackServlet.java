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

@WebServlet("/feedback")
public class FeedbackServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        String categoryFilter = request.getParameter("category");
        String ratingFilter = request.getParameter("rating");

        StringBuilder sql = new StringBuilder(
            "SELECT feedback_id, student_id, student_name, index_number, category, rating, order_code, feedback_text, status, created_at " +
            "FROM feedback WHERE 1=1 "
        );

        if (categoryFilter != null && !categoryFilter.trim().isEmpty() && !categoryFilter.equalsIgnoreCase("All")) {
            sql.append("AND category = ? ");
        }

        if (ratingFilter != null && !ratingFilter.trim().isEmpty() && !ratingFilter.equalsIgnoreCase("All")) {
            sql.append("AND rating = ? ");
        }

        sql.append("ORDER BY feedback_id DESC");

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"error\":\"DATABASE CONNECTION FAILED\"}");
                return;
            }

            try (PreparedStatement statement = connection.prepareStatement(sql.toString())) {
                int paramIdx = 1;
                if (categoryFilter != null && !categoryFilter.trim().isEmpty() && !categoryFilter.equalsIgnoreCase("All")) {
                    statement.setString(paramIdx++, categoryFilter.trim());
                }
                if (ratingFilter != null && !ratingFilter.trim().isEmpty() && !ratingFilter.equalsIgnoreCase("All")) {
                    statement.setInt(paramIdx++, Integer.parseInt(ratingFilter.trim()));
                }

                try (ResultSet rs = statement.executeQuery()) {
                    StringBuilder json = new StringBuilder();
                    json.append("[");
                    boolean first = true;

                    while (rs.next()) {
                        if (!first) json.append(",");
                        first = false;

                        json.append("{")
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

                    json.append("]");
                    response.getWriter().print(json.toString());
                }
            }
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

        String studentName = request.getParameter("studentName");
        String indexNumber = request.getParameter("indexNumber");
        String category = request.getParameter("category");
        String ratingStr = request.getParameter("rating");
        String orderCode = request.getParameter("orderCode");
        String feedbackText = request.getParameter("feedbackText");
        String isAnonymousStr = request.getParameter("isAnonymous");

        boolean isAnonymous = "true".equalsIgnoreCase(isAnonymousStr);

        if (isAnonymous) {
            studentName = "Anonymous Student";
            indexNumber = "";
        } else {
            if (studentName == null || studentName.trim().isEmpty()) {
                studentName = "Valued Student";
            }
            if (indexNumber == null) {
                indexNumber = "";
            }
        }

        if (category == null || category.trim().isEmpty()) {
            category = "General";
        }

        int rating = 5;
        if (ratingStr != null && !ratingStr.trim().isEmpty()) {
            try {
                rating = Integer.parseInt(ratingStr.trim());
                if (rating < 1) rating = 1;
                if (rating > 5) rating = 5;
            } catch (NumberFormatException e) {
                rating = 5;
            }
        }

        if (feedbackText == null || feedbackText.trim().isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().println("{\"success\":false,\"message\":\"Please enter your feedback comments.\"}");
            return;
        }

        if (orderCode != null && orderCode.trim().isEmpty()) {
            orderCode = null;
        }

        Integer studentId = null;
        HttpSession session = request.getSession(false);
        if (session != null && !isAnonymous) {
            Object sId = session.getAttribute("studentId");
            if (sId instanceof Integer) {
                studentId = (Integer) sId;
            }
        }

        String sql = "INSERT INTO feedback (student_id, student_name, index_number, category, rating, order_code, feedback_text, status) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, 'New')";

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"success\":false,\"message\":\"Database connection failed.\"}");
                return;
            }

            try (PreparedStatement stmt = connection.prepareStatement(sql)) {
                if (studentId != null) {
                    stmt.setInt(1, studentId);
                } else {
                    stmt.setNull(1, java.sql.Types.INTEGER);
                }
                stmt.setString(2, studentName.trim());
                stmt.setString(3, indexNumber.trim());
                stmt.setString(4, category.trim());
                stmt.setInt(5, rating);
                if (orderCode != null) {
                    stmt.setString(6, orderCode.trim());
                } else {
                    stmt.setNull(6, java.sql.Types.VARCHAR);
                }
                stmt.setString(7, feedbackText.trim());

                int affected = stmt.executeUpdate();
                if (affected > 0) {
                    response.getWriter().println("{\"success\":true,\"message\":\"Thank you! Your feedback has been received.\"}");
                } else {
                    response.getWriter().println("{\"success\":false,\"message\":\"Could not save feedback.\"}");
                }
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
