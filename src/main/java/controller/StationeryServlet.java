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

@WebServlet("/stationery")
public class StationeryServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType(
                "application/json;charset=UTF-8"
        );

        String sql =
                "SELECT stationery_id, item_name, description, category, price, image_url " +
                "FROM stationery_items " +
                "WHERE available = TRUE " +
                "ORDER BY stationery_id ASC";

        try (Connection connection =
                DBConnection.getConnection()) {

            if (connection == null) {
                response.getWriter().println(
                        "{\"error\":\"DATABASE CONNECTION FAILED\"}"
                );
                return;
            }

            try (
                PreparedStatement statement =
                        connection.prepareStatement(sql);
                ResultSet result =
                        statement.executeQuery()
            ) {

                StringBuilder json =
                        new StringBuilder();

                json.append("[");
                boolean first = true;

                while (result.next()) {
                    if (!first) {
                        json.append(",");
                    }

                    int id = result.getInt("stationery_id");
                    String name = result.getString("item_name");
                    String description = result.getString("description");
                    String category = result.getString("category");
                    double price = result.getDouble("price");
                    String imageUrl = result.getString("image_url");

                    if (category == null || category.trim().isEmpty()) {
                        category = "Other";
                    }

                    json.append("{");
                    json.append("\"id\":").append(id).append(",");
                    json.append("\"name\":\"").append(escapeJson(name)).append("\",");
                    json.append("\"description\":\"").append(escapeJson(description != null ? description : "")).append("\",");
                    json.append("\"price\":").append(price).append(",");
                    json.append("\"category\":\"").append(escapeJson(category)).append("\",");
                    json.append("\"imageUrl\":\"").append(escapeJson(imageUrl != null ? imageUrl : "")).append("\"");
                    json.append("}");

                    first = false;
                }

                json.append("]");

                response.getWriter().println(
                        json.toString()
                );
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println(
                    "{\"error\":\""
                    + escapeJson(e.getMessage())
                    + "\"}"
            );
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
