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

@WebServlet("/food")
public class FoodServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String sql =
                "SELECT food_id, food_name, description, category, price, image_url " +
                "FROM food_items " +
                "WHERE available = TRUE ORDER BY food_id ASC";

        try (Connection connection = DBConnection.getConnection()) {

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

                StringBuilder json = new StringBuilder();

                json.append("[");

                boolean first = true;

                while (result.next()) {

                    if (!first) {
                        json.append(",");
                    }

                    int id = result.getInt("food_id");
                    String name = result.getString("food_name");
                    String description = result.getString("description");
                    double price = result.getDouble("price");
                    String category = result.getString("category");
                    String imageUrl = result.getString("image_url");

                    if (category == null || category.trim().isEmpty()) {
                        category = "Food";
                        if (name != null && name.toLowerCase().contains("rice")) {
                            category = "Rice";
                        } else if (name != null && name.toLowerCase().contains("kottu")) {
                            category = "Kottu";
                        }
                    }

                    json.append("{");

                    json.append("\"id\":").append(id).append(",");

                    json.append("\"name\":\"")
                            .append(escapeJson(name))
                            .append("\",");

                    json.append("\"description\":\"")
                            .append(description == null
                                    ? ""
                                    : escapeJson(description))
                            .append("\",");

                    json.append("\"price\":")
                            .append(price)
                            .append(",");

                    json.append("\"category\":\"")
                            .append(escapeJson(category))
                            .append("\",");

                    json.append("\"imageUrl\":\"")
                            .append(imageUrl != null ? escapeJson(imageUrl) : "")
                            .append("\"");

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
