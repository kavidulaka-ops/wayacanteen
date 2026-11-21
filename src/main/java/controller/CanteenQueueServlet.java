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
import java.sql.Statement;

@WebServlet("/canteen-queue")
public class CanteenQueueServlet extends HttpServlet {

    // GET is public: students (logged in or not) can view live queue status
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String selectSql = "SELECT queue_level, estimated_wait, note, " +
                "TIME_FORMAT(updated_at, '%h:%i %p') AS formatted_time " +
                "FROM canteen_queue WHERE id = 1";

        String activeCountSql = "SELECT COUNT(*) AS active_count FROM orders WHERE status = 'Accepted'";

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"success\":false,\"message\":\"Database connection error\"}");
                return;
            }

            String queueLevel = "Low";
            int estimatedWait = 5;
            String note = "Normal queue";
            String updatedTime = "Just now";
            int activeQueueOrders = 0;

            try (Statement stmt = connection.createStatement();
                 ResultSet rs = stmt.executeQuery(selectSql)) {
                if (rs.next()) {
                    queueLevel = rs.getString("queue_level");
                    estimatedWait = rs.getInt("estimated_wait");
                    note = rs.getString("note");
                    String time = rs.getString("formatted_time");
                    if (time != null) {
                        updatedTime = time;
                    }
                }
            } catch (Exception e) {
                // Keep defaults if query fails
            }

            try (Statement stmt = connection.createStatement();
                 ResultSet rs = stmt.executeQuery(activeCountSql)) {
                if (rs.next()) {
                    activeQueueOrders = rs.getInt("active_count");
                }
            } catch (Exception ignored) {}

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"success\":true,");
            json.append("\"queueLevel\":\"").append(escapeJson(queueLevel)).append("\",");
            json.append("\"estimatedWait\":").append(estimatedWait).append(",");
            json.append("\"note\":\"").append(escapeJson(note != null ? note : "")).append("\",");
            json.append("\"activeQueueOrders\":").append(activeQueueOrders).append(",");
            json.append("\"updatedAt\":\"").append(escapeJson(updatedTime)).append("\"");
            json.append("}");

            response.getWriter().println(json.toString());

        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    // POST: staff adjusts the queue level (Low, Medium, High)
    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");

        String queueLevel = request.getParameter("queueLevel");
        if (queueLevel == null || queueLevel.trim().isEmpty()) {
            response.getWriter().println("{\"success\":false,\"message\":\"Queue level is required (Low, Medium, High)\"}");
            return;
        }

        queueLevel = queueLevel.trim();
        // Normalize value
        if (queueLevel.equalsIgnoreCase("low")) {
            queueLevel = "Low";
        } else if (queueLevel.equalsIgnoreCase("medium")) {
            queueLevel = "Medium";
        } else if (queueLevel.equalsIgnoreCase("high")) {
            queueLevel = "High";
        } else {
            response.getWriter().println("{\"success\":false,\"message\":\"Invalid queue level. Must be Low, Medium, or High\"}");
            return;
        }

        String waitParam = request.getParameter("estimatedWait");
        int estimatedWait;
        if (waitParam != null && !waitParam.trim().isEmpty()) {
            try {
                estimatedWait = Integer.parseInt(waitParam.trim());
            } catch (NumberFormatException e) {
                estimatedWait = getDefaultWait(queueLevel);
            }
        } else {
            estimatedWait = getDefaultWait(queueLevel);
        }

        String note = request.getParameter("note");
        if (note == null || note.trim().isEmpty()) {
            note = getDefaultNote(queueLevel);
        }

        String updateSql = "INSERT INTO canteen_queue (id, queue_level, estimated_wait, note) " +
                "VALUES (1, ?, ?, ?) " +
                "ON DUPLICATE KEY UPDATE queue_level = VALUES(queue_level), " +
                "estimated_wait = VALUES(estimated_wait), " +
                "note = VALUES(note), " +
                "updated_at = CURRENT_TIMESTAMP";

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"success\":false,\"message\":\"Database connection error\"}");
                return;
            }

            try (PreparedStatement statement = connection.prepareStatement(updateSql)) {
                statement.setString(1, queueLevel);
                statement.setInt(2, estimatedWait);
                statement.setString(3, note);

                statement.executeUpdate();

                response.getWriter().println("{" +
                        "\"success\":true," +
                        "\"message\":\"Canteen queue level updated successfully\"," +
                        "\"queueLevel\":\"" + escapeJson(queueLevel) + "\"," +
                        "\"estimatedWait\":" + estimatedWait + "," +
                        "\"note\":\"" + escapeJson(note) + "\"}");
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private int getDefaultWait(String level) {
        switch (level) {
            case "Medium": return 12;
            case "High": return 25;
            case "Low":
            default: return 5;
        }
    }

    private String getDefaultNote(String level) {
        switch (level) {
            case "Medium": return "Moderate crowd - Normal wait times";
            case "High": return "Heavy rush / Long queue - Pre-orders recommended";
            case "Low":
            default: return "Few or no line - Fast counter service";
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
