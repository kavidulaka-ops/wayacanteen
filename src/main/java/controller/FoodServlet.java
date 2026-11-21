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
                "SELECT food_id, food_name, description, category, price " +
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

                    String name =
                            result.getString("food_name");

                    String description =
                            result.getString("description");

                    double price =
                            result.getDouble("price");

                    String category = "Food";

                    if (name.toLowerCase().contains("rice")) {
                        category = "Rice";
                    } else if (
                            name.toLowerCase().contains("kottu")) {
                        category = "Kottu";
                    }

                    json.append("{");

                    json.append("\"name\":\"")
                            .append(name.replace("\"", "\\\""))
                            .append("\",");

                    json.append("\"description\":\"")
                            .append(description == null
                                    ? ""
                                    : description.replace("\"", "\\\""))
                            .append("\",");

                    json.append("\"price\":")
                            .append(price)
                            .append(",");

                    json.append("\"category\":\"")
                            .append(category)
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
                    + e.getMessage().replace("\"", "\\\"")
                    + "\"}"
            );
        }
    }
}