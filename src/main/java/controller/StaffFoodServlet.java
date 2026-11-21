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

@WebServlet("/staff-food")
public class StaffFoodServlet extends HttpServlet {

    // GET: Returns all food items for staff management
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String sql = "SELECT food_id, food_name, description, category, price, available, " +
                "DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_str " +
                "FROM food_items ORDER BY available DESC, food_id ASC";

        try (Connection conn = DBConnection.getConnection()) {
            if (conn == null) {
                response.getWriter().println("{\"error\":\"Database connection failed\"}");
                return;
            }

            try (PreparedStatement stmt = conn.prepareStatement(sql);
                 ResultSet rs = stmt.executeQuery()) {

                StringBuilder json = new StringBuilder();
                json.append("[");
                boolean first = true;

                while (rs.next()) {
                    if (!first) {
                        json.append(",");
                    }

                    int id = rs.getInt("food_id");
                    String name = rs.getString("food_name");
                    String desc = rs.getString("description");
                    String cat = rs.getString("category");
                    double price = rs.getDouble("price");
                    boolean available = rs.getBoolean("available");
                    String createdAt = rs.getString("created_str");

                    if (cat == null || cat.trim().isEmpty()) {
                        cat = "Food";
                    }

                    json.append("{");
                    json.append("\"id\":").append(id).append(",");
                    json.append("\"name\":\"").append(escapeJson(name)).append("\",");
                    json.append("\"description\":\"").append(escapeJson(desc != null ? desc : "")).append("\",");
                    json.append("\"category\":\"").append(escapeJson(cat)).append("\",");
                    json.append("\"price\":").append(price).append(",");
                    json.append("\"available\":").append(available).append(",");
                    json.append("\"createdAt\":\"").append(escapeJson(createdAt != null ? createdAt : "")).append("\"");
                    json.append("}");

                    first = false;
                }

                json.append("]");
                response.getWriter().println(json.toString());
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("{\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    // POST: Add, Toggle Availability, Edit, or Delete
    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");

        String action = request.getParameter("action");
        if (action == null || action.trim().isEmpty()) {
            response.getWriter().println("{\"success\":false,\"message\":\"Missing action parameter\"}");
            return;
        }

        try (Connection conn = DBConnection.getConnection()) {
            if (conn == null) {
                response.getWriter().println("{\"success\":false,\"message\":\"Database connection failed\"}");
                return;
            }

            switch (action.toLowerCase()) {
                case "add":
                    handleAddFood(request, response, conn);
                    break;
                case "toggle":
                    handleToggleAvailability(request, response, conn);
                    break;
                case "edit":
                    handleEditFood(request, response, conn);
                    break;
                case "delete":
                    handleDeleteFood(request, response, conn);
                    break;
                default:
                    response.getWriter().println("{\"success\":false,\"message\":\"Unknown action: " + escapeJson(action) + "\"}");
                    break;
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("{\"success\":false,\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handleAddFood(HttpServletRequest req, HttpServletResponse resp, Connection conn) throws Exception {
        String name = req.getParameter("name");
        String desc = req.getParameter("description");
        String cat = req.getParameter("category");
        String priceStr = req.getParameter("price");
        String availStr = req.getParameter("available");

        if (name == null || name.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Food item name is required\"}");
            return;
        }

        if (priceStr == null || priceStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Price is required\"}");
            return;
        }

        double price;
        try {
            price = Double.parseDouble(priceStr.trim());
            if (price < 0) {
                resp.getWriter().println("{\"success\":false,\"message\":\"Price cannot be negative\"}");
                return;
            }
        } catch (NumberFormatException e) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Invalid price format\"}");
            return;
        }

        if (cat == null || cat.trim().isEmpty()) {
            cat = "Food";
        }

        int available = 1;
        if ("0".equals(availStr) || "false".equalsIgnoreCase(availStr)) {
            available = 0;
        }

        String sql = "INSERT INTO food_items (food_name, description, category, price, available) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name.trim());
            ps.setString(2, desc != null ? desc.trim() : "");
            ps.setString(3, cat.trim());
            ps.setDouble(4, price);
            ps.setInt(5, available);

            int rows = ps.executeUpdate();
            if (rows > 0) {
                int newId = -1;
                try (ResultSet gk = ps.getGeneratedKeys()) {
                    if (gk.next()) {
                        newId = gk.getInt(1);
                    }
                }
                resp.getWriter().println("{\"success\":true,\"message\":\"Food item added successfully!\",\"foodId\":" + newId + "}");
            } else {
                resp.getWriter().println("{\"success\":false,\"message\":\"Could not insert food item\"}");
            }
        }
    }

    private void handleToggleAvailability(HttpServletRequest req, HttpServletResponse resp, Connection conn) throws Exception {
        String idStr = req.getParameter("foodId");
        if (idStr == null || idStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Food ID is required\"}");
            return;
        }

        int foodId = Integer.parseInt(idStr.trim());
        String availParam = req.getParameter("available");

        String sql;
        if (availParam != null && !availParam.trim().isEmpty()) {
            sql = "UPDATE food_items SET available = ? WHERE food_id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                int availVal = ("1".equals(availParam) || "true".equalsIgnoreCase(availParam)) ? 1 : 0;
                ps.setInt(1, availVal);
                ps.setInt(2, foodId);
                int rows = ps.executeUpdate();
                if (rows > 0) {
                    resp.getWriter().println("{\"success\":true,\"message\":\"Availability updated successfully!\",\"available\":" + (availVal == 1) + "}");
                } else {
                    resp.getWriter().println("{\"success\":false,\"message\":\"Food item not found\"}");
                }
            }
        } else {
            // Toggle to opposite of current value
            sql = "UPDATE food_items SET available = NOT available WHERE food_id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, foodId);
                int rows = ps.executeUpdate();
                if (rows > 0) {
                    // Fetch new status
                    boolean newStatus = false;
                    try (PreparedStatement check = conn.prepareStatement("SELECT available FROM food_items WHERE food_id = ?")) {
                        check.setInt(1, foodId);
                        try (ResultSet rs = check.executeQuery()) {
                            if (rs.next()) {
                                newStatus = rs.getBoolean("available");
                            }
                        }
                    }
                    resp.getWriter().println("{\"success\":true,\"message\":\"Availability toggled!\",\"available\":" + newStatus + "}");
                } else {
                    resp.getWriter().println("{\"success\":false,\"message\":\"Food item not found\"}");
                }
            }
        }
    }

    private void handleEditFood(HttpServletRequest req, HttpServletResponse resp, Connection conn) throws Exception {
        String idStr = req.getParameter("foodId");
        String name = req.getParameter("name");
        String desc = req.getParameter("description");
        String cat = req.getParameter("category");
        String priceStr = req.getParameter("price");

        if (idStr == null || idStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Food ID is required\"}");
            return;
        }

        if (name == null || name.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Food name is required\"}");
            return;
        }

        if (priceStr == null || priceStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Price is required\"}");
            return;
        }

        int foodId = Integer.parseInt(idStr.trim());
        double price = Double.parseDouble(priceStr.trim());

        if (cat == null || cat.trim().isEmpty()) {
            cat = "Food";
        }

        String sql = "UPDATE food_items SET food_name = ?, description = ?, category = ?, price = ? WHERE food_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, name.trim());
            ps.setString(2, desc != null ? desc.trim() : "");
            ps.setString(3, cat.trim());
            ps.setDouble(4, price);
            ps.setInt(5, foodId);

            int rows = ps.executeUpdate();
            if (rows > 0) {
                resp.getWriter().println("{\"success\":true,\"message\":\"Food item updated successfully!\"}");
            } else {
                resp.getWriter().println("{\"success\":false,\"message\":\"Food item not found\"}");
            }
        }
    }

    private void handleDeleteFood(HttpServletRequest req, HttpServletResponse resp, Connection conn) throws Exception {
        String idStr = req.getParameter("foodId");
        if (idStr == null || idStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Food ID is required\"}");
            return;
        }

        int foodId = Integer.parseInt(idStr.trim());

        String sql = "DELETE FROM food_items WHERE food_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, foodId);
            int rows = ps.executeUpdate();
            if (rows > 0) {
                resp.getWriter().println("{\"success\":true,\"message\":\"Food item deleted successfully!\"}");
            } else {
                resp.getWriter().println("{\"success\":false,\"message\":\"Food item not found\"}");
            }
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
