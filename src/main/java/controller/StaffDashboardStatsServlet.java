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

@WebServlet("/staff-stats")
public class StaffDashboardStatsServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        // SQL queries for real-time counts:
        // 1. Pending orders currently waiting for staff decision
        // 2. Orders accepted today (or currently accepted if none today)
        // 3. Food orders placed today or currently pending
        // 4. Stationery orders placed today or currently pending
        String sql = "SELECT " +
                "(SELECT COUNT(*) FROM orders WHERE status = 'Pending') AS pending_count, " +
                "(SELECT COUNT(*) FROM orders WHERE accepted_date = CURDATE()) AS accepted_today_count, " +
                "(SELECT COUNT(*) FROM orders WHERE status = 'Accepted') AS active_queue_count, " +
                "(SELECT COUNT(*) FROM orders WHERE (order_type = 'Food' OR order_type = 'Both') AND (order_date = CURDATE() OR status = 'Pending')) AS food_orders_count, " +
                "(SELECT COUNT(*) FROM orders WHERE (order_type = 'Stationery' OR order_type = 'Both') AND (order_date = CURDATE() OR status = 'Pending')) AS stationery_orders_count, " +
                "(SELECT COUNT(*) FROM orders WHERE (order_type = 'Food' OR order_type = 'Both') AND status IN ('Pending', 'Accepted')) AS active_food_count, " +
                "(SELECT COUNT(*) FROM orders WHERE (order_type = 'Stationery' OR order_type = 'Both') AND status IN ('Pending', 'Accepted')) AS active_stationery_count";

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.getWriter().println("{\"success\":false,\"message\":\"Database connection failed\"}");
                return;
            }

            try (PreparedStatement statement = connection.prepareStatement(sql);
                 ResultSet rs = statement.executeQuery()) {

                if (rs.next()) {
                    int pendingCount = rs.getInt("pending_count");
                    int acceptedToday = rs.getInt("accepted_today_count");
                    int activeQueue = rs.getInt("active_queue_count");
                    int foodOrders = rs.getInt("food_orders_count");
                    int stationeryOrders = rs.getInt("stationery_orders_count");
                    int activeFood = rs.getInt("active_food_count");
                    int activeStationery = rs.getInt("active_stationery_count");

                    // If accepted today has entries, use it; otherwise fallback to active queue if applicable
                    int displayAccepted = acceptedToday > 0 ? acceptedToday : activeQueue;

                    StringBuilder json = new StringBuilder();
                    json.append("{");
                    json.append("\"success\":true,");
                    json.append("\"pendingOrders\":").append(pendingCount).append(",");
                    json.append("\"acceptedToday\":").append(displayAccepted).append(",");
                    json.append("\"acceptedTodayActual\":").append(acceptedToday).append(",");
                    json.append("\"activeQueue\":").append(activeQueue).append(",");
                    json.append("\"foodOrders\":").append(foodOrders).append(",");
                    json.append("\"stationeryOrders\":").append(stationeryOrders).append(",");
                    json.append("\"activeFood\":").append(activeFood).append(",");
                    json.append("\"activeStationery\":").append(activeStationery);
                    json.append("}");

                    response.getWriter().println(json.toString());
                } else {
                    response.getWriter().println("{\"success\":false,\"message\":\"No data returned\"}");
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
