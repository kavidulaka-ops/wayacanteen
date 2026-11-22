package controller;

import db.DBConnection;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

@WebServlet("/staff-food")
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024 * 1, // 1 MB
    maxFileSize = 1024 * 1024 * 10,      // 10 MB
    maxRequestSize = 1024 * 1024 * 20    // 20 MB
)
public class StaffFoodServlet extends HttpServlet {

    // GET: Returns all food items for staff management
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String sql = "SELECT food_id, food_name, description, category, price, available, image_url, " +
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
                    String imageUrl = rs.getString("image_url");
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
                    json.append("\"imageUrl\":\"").append(escapeJson(imageUrl != null ? imageUrl : "")).append("\",");
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

    // Saves uploaded image file to webapp and project source folders
    private String saveUploadedImage(HttpServletRequest req, String prefix) {
        try {
            Part filePart = req.getPart("imageFile");
            if (filePart != null && filePart.getSize() > 0) {
                String submitted = filePart.getSubmittedFileName();
                String ext = ".png";
                if (submitted != null && submitted.contains(".")) {
                    String subExt = submitted.substring(submitted.lastIndexOf(".")).toLowerCase();
                    if (subExt.equals(".jpg") || subExt.equals(".jpeg") || subExt.equals(".png") || subExt.equals(".webp") || subExt.equals(".gif")) {
                        ext = subExt;
                    }
                }
                String fileName = prefix + "_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000) + ext;

                // 1. Save to deployed webapp uploads directory
                String webappPath = req.getServletContext().getRealPath("/images/uploads");
                if (webappPath != null) {
                    File dir = new File(webappPath);
                    if (!dir.exists()) dir.mkdirs();
                    File target = new File(dir, fileName);
                    try (InputStream is = filePart.getInputStream()) {
                        Files.copy(is, target.toPath(), StandardCopyOption.REPLACE_EXISTING);
                    }
                }

                // 2. Mirror to source workspace and OOP project target folders
                String[] targetDirs = new String[] {
                    "E:/uni/~ PROJECT/antigravity project/src/main/webapp/images/uploads",
                    "E:/uni/OOP project/CantinWeb/build/web/images/uploads",
                    "E:/uni/OOP project/CantinWeb/web/images/uploads"
                };
                for (String tDir : targetDirs) {
                    try {
                        File d = new File(tDir);
                        if (d.exists() && webappPath != null) {
                            File sf = new File(webappPath, fileName);
                            if (sf.exists()) {
                                File tf = new File(d, fileName);
                                Files.copy(sf.toPath(), tf.toPath(), StandardCopyOption.REPLACE_EXISTING);
                            }
                        }
                    } catch (Exception ignore) {}
                }

                return "images/uploads/" + fileName;
            }
        } catch (Exception e) {
            System.err.println("Error saving uploaded image: " + e.getMessage());
        }
        return null;
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

        // Save image if uploaded
        String uploadedUrl = saveUploadedImage(req, "food");
        String imageUrl = uploadedUrl;
        if (imageUrl == null) {
            String existing = req.getParameter("existingImage");
            if (existing != null && !existing.trim().isEmpty()) {
                imageUrl = existing.trim();
            }
        }

        String sql = "INSERT INTO food_items (food_name, description, category, price, available, image_url) VALUES (?, ?, ?, ?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name.trim());
            ps.setString(2, desc != null ? desc.trim() : "");
            ps.setString(3, cat.trim());
            ps.setDouble(4, price);
            ps.setInt(5, available);
            ps.setString(6, imageUrl);

            int rows = ps.executeUpdate();
            if (rows > 0) {
                int newId = -1;
                try (ResultSet gk = ps.getGeneratedKeys()) {
                    if (gk.next()) {
                        newId = gk.getInt(1);
                    }
                }
                resp.getWriter().println("{\"success\":true,\"message\":\"Food item added successfully!\",\"foodId\":" + newId + ",\"imageUrl\":\"" + (imageUrl != null ? escapeJson(imageUrl) : "") + "\"}");
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
            sql = "UPDATE food_items SET available = NOT available WHERE food_id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, foodId);
                int rows = ps.executeUpdate();
                if (rows > 0) {
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
        String removeImage = req.getParameter("removeImage");

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

        String uploadedUrl = saveUploadedImage(req, "food");

        String sql;
        if (uploadedUrl != null) {
            sql = "UPDATE food_items SET food_name = ?, description = ?, category = ?, price = ?, image_url = ? WHERE food_id = ?";
        } else if ("1".equals(removeImage) || "true".equalsIgnoreCase(removeImage)) {
            sql = "UPDATE food_items SET food_name = ?, description = ?, category = ?, price = ?, image_url = NULL WHERE food_id = ?";
        } else {
            sql = "UPDATE food_items SET food_name = ?, description = ?, category = ?, price = ? WHERE food_id = ?";
        }

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, name.trim());
            ps.setString(2, desc != null ? desc.trim() : "");
            ps.setString(3, cat.trim());
            ps.setDouble(4, price);
            if (uploadedUrl != null) {
                ps.setString(5, uploadedUrl);
                ps.setInt(6, foodId);
            } else {
                ps.setInt(5, foodId);
            }

            int rows = ps.executeUpdate();
            if (rows > 0) {
                resp.getWriter().println("{\"success\":true,\"message\":\"Food item updated successfully!\",\"imageUrl\":\"" + (uploadedUrl != null ? escapeJson(uploadedUrl) : "") + "\"}");
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
