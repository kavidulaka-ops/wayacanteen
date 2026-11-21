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

@WebServlet("/staff-stationery")
public class StaffStationeryServlet extends HttpServlet {

    // GET: Returns all stationery items for staff management
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String sql = "SELECT stationery_id, item_name, description, category, price, available, " +
                "DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_str " +
                "FROM stationery_items ORDER BY available DESC, stationery_id ASC";

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

                    int id = rs.getInt("stationery_id");
                    String name = rs.getString("item_name");
                    String desc = rs.getString("description");
                    String cat = rs.getString("category");
                    double price = rs.getDouble("price");
                    boolean available = rs.getBoolean("available");
                    String createdAt = rs.getString("created_str");

                    if (cat == null || cat.trim().isEmpty()) {
                        cat = "Stationery";
                    }

                    json.append("{");
                    json.append("\"id\":").append(id).append(",");
                    json.append("\"stationeryId\":").append(id).append(",");
                    json.append("\"name\":\"").append(escapeJson(name)).append("\",");
                    json.append("\"itemName\":\"").append(escapeJson(name)).append("\",");
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
                    handleAddStationery(request, response, conn);
                    break;
                case "toggle":
                    handleToggleAvailability(request, response, conn);
                    break;
                case "edit":
                    handleEditStationery(request, response, conn);
                    break;
                case "delete":
                    handleDeleteStationery(request, response, conn);
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

    private void handleAddStationery(HttpServletRequest req, HttpServletResponse resp, Connection conn) throws Exception {
        String name = req.getParameter("name");
        if (name == null || name.trim().isEmpty()) {
            name = req.getParameter("itemName");
        }
        String desc = req.getParameter("description");
        String cat = req.getParameter("category");
        String priceStr = req.getParameter("price");
        String availStr = req.getParameter("available");

        if (name == null || name.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Stationery item name is required\"}");
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
            cat = "Stationery";
        }

        int available = 1;
        if ("0".equals(availStr) || "false".equalsIgnoreCase(availStr)) {
            available = 0;
        }

        String sql = "INSERT INTO stationery_items (item_name, description, category, price, available) VALUES (?, ?, ?, ?, ?)";
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
                resp.getWriter().println("{\"success\":true,\"message\":\"Stationery item added successfully!\",\"stationeryId\":" + newId + ",\"id\":" + newId + "}");
            } else {
                resp.getWriter().println("{\"success\":false,\"message\":\"Could not insert stationery item\"}");
            }
        }
    }

    private void handleToggleAvailability(HttpServletRequest req, HttpServletResponse resp, Connection conn) throws Exception {
        String idStr = req.getParameter("stationeryId");
        if (idStr == null || idStr.trim().isEmpty()) {
            idStr = req.getParameter("id");
        }
        if (idStr == null || idStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Stationery ID is required\"}");
            return;
        }

        int stationeryId = Integer.parseInt(idStr.trim());
        String availParam = req.getParameter("available");

        String sql;
        if (availParam != null && !availParam.trim().isEmpty()) {
            sql = "UPDATE stationery_items SET available = ? WHERE stationery_id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                int availVal = ("1".equals(availParam) || "true".equalsIgnoreCase(availParam)) ? 1 : 0;
                ps.setInt(1, availVal);
                ps.setInt(2, stationeryId);
                int rows = ps.executeUpdate();
                if (rows > 0) {
                    resp.getWriter().println("{\"success\":true,\"message\":\"Availability updated successfully!\",\"available\":" + (availVal == 1) + "}");
                } else {
                    resp.getWriter().println("{\"success\":false,\"message\":\"Stationery item not found\"}");
                }
            }
        } else {
            // Toggle to opposite of current value
            sql = "UPDATE stationery_items SET available = NOT available WHERE stationery_id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, stationeryId);
                int rows = ps.executeUpdate();
                if (rows > 0) {
                    boolean newStatus = false;
                    try (PreparedStatement check = conn.prepareStatement("SELECT available FROM stationery_items WHERE stationery_id = ?")) {
                        check.setInt(1, stationeryId);
                        try (ResultSet rs = check.executeQuery()) {
                            if (rs.next()) {
                                newStatus = rs.getBoolean("available");
                            }
                        }
                    }
                    resp.getWriter().println("{\"success\":true,\"message\":\"Availability toggled!\",\"available\":" + newStatus + "}");
                } else {
                    resp.getWriter().println("{\"success\":false,\"message\":\"Stationery item not found\"}");
                }
            }
        }
    }

    private void handleEditStationery(HttpServletRequest req, HttpServletResponse resp, Connection conn) throws Exception {
        String idStr = req.getParameter("stationeryId");
        if (idStr == null || idStr.trim().isEmpty()) {
            idStr = req.getParameter("id");
        }
        String name = req.getParameter("name");
        if (name == null || name.trim().isEmpty()) {
            name = req.getParameter("itemName");
        }
        String desc = req.getParameter("description");
        String cat = req.getParameter("category");
        String priceStr = req.getParameter("price");

        if (idStr == null || idStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Stationery ID is required\"}");
            return;
        }

        if (name == null || name.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Stationery item name is required\"}");
            return;
        }

        if (priceStr == null || priceStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Price is required\"}");
            return;
        }

        int stationeryId = Integer.parseInt(idStr.trim());
        double price = Double.parseDouble(priceStr.trim());

        if (cat == null || cat.trim().isEmpty()) {
            cat = "Stationery";
        }

        String sql = "UPDATE stationery_items SET item_name = ?, description = ?, category = ?, price = ? WHERE stationery_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, name.trim());
            ps.setString(2, desc != null ? desc.trim() : "");
            ps.setString(3, cat.trim());
            ps.setDouble(4, price);
            ps.setInt(5, stationeryId);

            int rows = ps.executeUpdate();
            if (rows > 0) {
                resp.getWriter().println("{\"success\":true,\"message\":\"Stationery item updated successfully!\"}");
            } else {
                resp.getWriter().println("{\"success\":false,\"message\":\"Stationery item not found\"}");
            }
        }
    }

    private void handleDeleteStationery(HttpServletRequest req, HttpServletResponse resp, Connection conn) throws Exception {
        String idStr = req.getParameter("stationeryId");
        if (idStr == null || idStr.trim().isEmpty()) {
            idStr = req.getParameter("id");
        }
        if (idStr == null || idStr.trim().isEmpty()) {
            resp.getWriter().println("{\"success\":false,\"message\":\"Stationery ID is required\"}");
            return;
        }

        int stationeryId = Integer.parseInt(idStr.trim());

        String sql = "DELETE FROM stationery_items WHERE stationery_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, stationeryId);
            int rows = ps.executeUpdate();
            if (rows > 0) {
                resp.getWriter().println("{\"success\":true,\"message\":\"Stationery item deleted successfully!\"}");
            } else {
                resp.getWriter().println("{\"success\":false,\"message\":\"Stationery item not found\"}");
            }
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
