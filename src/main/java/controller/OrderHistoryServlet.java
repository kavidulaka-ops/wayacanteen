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

@WebServlet("/order-history")
public class OrderHistoryServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType(
                "application/json;charset=UTF-8"
        );

        String sql =
                "SELECT " +
                "o.order_id, " +
                "o.order_code, " +
                "o.order_type, " +
                "o.total_amount, " +
                "o.status, " +
                "o.order_date, " +
                "o.order_time, " +
                "o.accepted_date, " +
                "o.accepted_time, " +
                "s.index_number, " +
                "s.full_name " +
                "FROM orders o " +
                "INNER JOIN students s " +
                "ON o.student_id = s.student_id " +
                "WHERE o.status = 'Accepted' " +
                "ORDER BY o.order_id DESC";

        try (
            Connection connection =
                    DBConnection.getConnection()
        ) {

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

                boolean firstOrder = true;

                while (result.next()) {

                    if (!firstOrder) {
                        json.append(",");
                    }

                    int orderId =
                            result.getInt("order_id");

                    String orderCode =
                            result.getString("order_code");

                    String orderType =
                            result.getString("order_type");

                    double totalAmount =
                            result.getDouble("total_amount");

                    String status =
                            result.getString("status");

                    String orderDate =
                            result.getString("order_date");

                    String orderTime =
                            result.getString("order_time");

                    String acceptedDate =
                            result.getString("accepted_date");

                    String acceptedTime =
                            result.getString("accepted_time");

                    String indexNumber =
                            result.getString("index_number");

                    String fullName =
                            result.getString("full_name");


                    // =================================
                    // ORDER DATA
                    // =================================

                    json.append("{");

                    json.append("\"orderId\":")
                            .append(orderId)
                            .append(",");

                    json.append("\"orderCode\":\"")
                            .append(escapeJson(orderCode))
                            .append("\",");

                    json.append("\"orderType\":\"")
                            .append(escapeJson(orderType))
                            .append("\",");

                    json.append("\"totalAmount\":")
                            .append(totalAmount)
                            .append(",");

                    json.append("\"status\":\"")
                            .append(escapeJson(status))
                            .append("\",");

                    json.append("\"orderDate\":\"")
                            .append(escapeJson(orderDate))
                            .append("\",");

                    json.append("\"orderTime\":\"")
                            .append(escapeJson(orderTime))
                            .append("\",");

                    json.append("\"acceptedDate\":\"")
                            .append(escapeJson(acceptedDate))
                            .append("\",");

                    json.append("\"acceptedTime\":\"")
                            .append(escapeJson(acceptedTime))
                            .append("\",");

                    json.append("\"indexNumber\":\"")
                            .append(escapeJson(indexNumber))
                            .append("\",");

                    json.append("\"fullName\":\"")
                            .append(escapeJson(fullName))
                            .append("\",");


                    // =================================
                    // ORDER ITEMS
                    // =================================

                    json.append("\"items\":[");

                    String itemSQL =
                            "SELECT " +
                            "item_type, " +
                            "item_name, " +
                            "quantity, " +
                            "unit_price, " +
                            "subtotal " +
                            "FROM order_items " +
                            "WHERE order_id = ?";

                    try (
                        PreparedStatement itemStatement =
                                connection.prepareStatement(
                                        itemSQL
                                )
                    ) {

                        itemStatement.setInt(
                                1,
                                orderId
                        );

                        try (
                            ResultSet itemResult =
                                    itemStatement.executeQuery()
                        ) {

                            boolean firstItem = true;

                            while (itemResult.next()) {

                                if (!firstItem) {
                                    json.append(",");
                                }

                                String itemType =
                                        itemResult.getString(
                                                "item_type"
                                        );

                                String itemName =
                                        itemResult.getString(
                                                "item_name"
                                        );

                                int quantity =
                                        itemResult.getInt(
                                                "quantity"
                                        );

                                double unitPrice =
                                        itemResult.getDouble(
                                                "unit_price"
                                        );

                                double subtotal =
                                        itemResult.getDouble(
                                                "subtotal"
                                        );


                                json.append("{");

                                json.append(
                                        "\"itemType\":\""
                                )
                                .append(
                                        escapeJson(itemType)
                                )
                                .append("\",");

                                json.append(
                                        "\"name\":\""
                                )
                                .append(
                                        escapeJson(itemName)
                                )
                                .append("\",");

                                json.append(
                                        "\"quantity\":"
                                )
                                .append(quantity)
                                .append(",");

                                json.append(
                                        "\"price\":"
                                )
                                .append(unitPrice)
                                .append(",");

                                json.append(
                                        "\"subtotal\":"
                                )
                                .append(subtotal);

                                json.append("}");

                                firstItem = false;
                            }
                        }
                    }

                    json.append("]");

                    json.append("}");

                    firstOrder = false;
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
                    +
                    escapeJson(
                            e.getMessage()
                    )
                    +
                    "\"}"
            );
        }
    }


    // =====================================
    // ESCAPE JSON
    // =====================================

    private String escapeJson(String value) {

        if (value == null) {
            return "";
        }

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}