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

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@WebServlet("/order")
public class OrderServlet extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType(
                "application/json;charset=UTF-8"
        );


        // =====================================
        // GET LOGGED-IN STUDENT
        // =====================================

        HttpSession session =
                request.getSession(false);

        if (session == null ||
                session.getAttribute("studentId") == null) {

            response.getWriter().println(
                    "{\"success\":false,\"message\":\"Student not logged in\"}"
            );

            return;
        }


        int studentId =
                (Integer) session.getAttribute(
                        "studentId"
                );


        // =====================================
        // GET ORDER DATA
        // =====================================

        String orderCode =
                request.getParameter("orderCode");

        String orderType =
                request.getParameter("orderType");

        String totalAmountString =
                request.getParameter("totalAmount");

        String orderDate =
                request.getParameter("orderDate");

        String orderTime =
                request.getParameter("orderTime");

        String cartItems =
                request.getParameter("cartItems");


        // =====================================
        // VALIDATE DATA
        // =====================================

        if (orderCode == null ||
                orderType == null ||
                totalAmountString == null ||
                orderDate == null ||
                orderTime == null ||
                cartItems == null ||
                cartItems.isEmpty()) {

            response.getWriter().println(
                    "{\"success\":false,\"message\":\"Missing order data\"}"
            );

            return;
        }


        double totalAmount;

        try {

            totalAmount =
                    Double.parseDouble(
                            totalAmountString
                    );

        } catch (NumberFormatException e) {

            response.getWriter().println(
                    "{\"success\":false,\"message\":\"Invalid total amount\"}"
            );

            return;
        }


        // =====================================
        // DATABASE CONNECTION
        // =====================================

        Connection connection =
                DBConnection.getConnection();


        if (connection == null) {

            response.getWriter().println(
                    "{\"success\":false,\"message\":\"DATABASE CONNECTION FAILED\"}"
            );

            return;
        }


        try {

            connection.setAutoCommit(false);


            // =====================================
            // INSERT MAIN ORDER
            // =====================================

            String orderSQL =
                    "INSERT INTO orders " +
                    "(order_code, student_id, order_type, " +
                    "total_amount, status, order_date, order_time) " +
                    "VALUES (?, ?, ?, ?, 'Pending', ?, ?)";


            int orderId;


            try (
                PreparedStatement statement =
                        connection.prepareStatement(
                                orderSQL,
                                PreparedStatement.RETURN_GENERATED_KEYS
                        )
            ) {

                statement.setString(
                        1,
                        orderCode
                );

                statement.setInt(
                        2,
                        studentId
                );

                statement.setString(
                        3,
                        orderType
                );

                statement.setDouble(
                        4,
                        totalAmount
                );

                statement.setString(
                        5,
                        orderDate
                );

                statement.setString(
                        6,
                        orderTime
                );


                statement.executeUpdate();


                try (
                    ResultSet generatedKeys =
                            statement.getGeneratedKeys()
                ) {

                    if (!generatedKeys.next()) {

                        connection.rollback();

                        response.getWriter().println(
                                "{\"success\":false,\"message\":\"Could not create order\"}"
                        );

                        return;
                    }


                    orderId =
                            generatedKeys.getInt(1);
                }
            }


            // =====================================
            // INSERT ORDER ITEMS
            // =====================================

            String itemSQL =
                    "INSERT INTO order_items " +
                    "(order_id, item_type, item_id, " +
                    "item_name, quantity, unit_price, subtotal) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?)";


            try (
                PreparedStatement itemStatement =
                        connection.prepareStatement(itemSQL)
            ) {


                // =====================================
                // READ CART JSON
                // =====================================

                /*
                 * Example:
                 *
                 * [
                 *   {
                 *     "name":"Chicken Rice",
                 *     "price":250,
                 *     "quantity":1,
                 *     "itemType":"Food"
                 *   }
                 * ]
                 */


                Pattern itemPattern =
                        Pattern.compile(
                            "\\{([^{}]*)\\}"
                        );


                Matcher itemMatcher =
                        itemPattern.matcher(
                                cartItems
                        );


                boolean foundItem = false;


                while (itemMatcher.find()) {

                    String itemData =
                            itemMatcher.group(1);


                    // =====================================
                    // GET NAME
                    // =====================================

                    String itemName =
                            getJsonString(
                                    itemData,
                                    "name"
                            );


                    // =====================================
                    // GET ITEM TYPE
                    // =====================================

                    String itemType =
                            getJsonString(
                                    itemData,
                                    "itemType"
                            );


                    // =====================================
                    // GET PRICE
                    // =====================================

                    double price =
                            getJsonNumber(
                                    itemData,
                                    "price"
                            );


                    // =====================================
                    // GET QUANTITY
                    // =====================================

                    int quantity =
                            (int) getJsonNumber(
                                    itemData,
                                    "quantity"
                            );


                    if (itemName == null ||
                            itemName.isEmpty()) {

                        continue;
                    }


                    if (itemType == null ||
                            itemType.isEmpty()) {

                        itemType = "Food";
                    }


                    if (quantity <= 0) {

                        continue;
                    }


                    // =====================================
                    // ITEM ID
                    // =====================================

                    int itemId =
                            findItemId(
                                    connection,
                                    itemName,
                                    itemType
                            );


                    // If item is not found,
                    // do not save invalid item.

                    if (itemId == -1) {

                        throw new Exception(
                                "Item not found: "
                                + itemName
                        );
                    }


                    double subtotal =
                            price * quantity;


                    // =====================================
                    // INSERT ITEM
                    // =====================================

                    itemStatement.setInt(
                            1,
                            orderId
                    );

                    itemStatement.setString(
                            2,
                            itemType
                    );

                    itemStatement.setInt(
                            3,
                            itemId
                    );

                    itemStatement.setString(
                            4,
                            itemName
                    );

                    itemStatement.setInt(
                            5,
                            quantity
                    );

                    itemStatement.setDouble(
                            6,
                            price
                    );

                    itemStatement.setDouble(
                            7,
                            subtotal
                    );


                    itemStatement.executeUpdate();


                    foundItem = true;
                }


                if (!foundItem) {

                    connection.rollback();

                    response.getWriter().println(
                            "{\"success\":false,\"message\":\"No valid cart items found\"}"
                    );

                    return;
                }
            }


            // =====================================
            // COMMIT
            // =====================================

            connection.commit();


            // =====================================
            // SUCCESS RESPONSE
            // =====================================

            response.getWriter().println(
                    "{"
                    + "\"success\":true,"
                    + "\"message\":\"Order saved successfully\","
                    + "\"orderId\":" + orderId + ","
                    + "\"orderCode\":\""
                    + orderCode
                    + "\""
                    + "}"
            );


        } catch (Exception e) {

            try {

                connection.rollback();

            } catch (Exception ignored) {
            }


            e.printStackTrace();


            response.getWriter().println(
                    "{\"success\":false,\"message\":\""
                    + e.getMessage()
                            .replace("\"", "\\\"")
                    + "\"}"
            );


        } finally {

            try {

                connection.close();

            } catch (Exception ignored) {
            }

        }

    }


    // =====================================
    // GET JSON STRING
    // =====================================

    private String getJsonString(
            String json,
            String key) {

        Pattern pattern =
                Pattern.compile(
                        "\"" + key
                        + "\"\\s*:\\s*\"([^\"]*)\""
                );


        Matcher matcher =
                pattern.matcher(json);


        if (matcher.find()) {

            return matcher.group(1);

        }


        return null;
    }


    // =====================================
    // GET JSON NUMBER
    // =====================================

    private double getJsonNumber(
            String json,
            String key) {

        Pattern pattern =
                Pattern.compile(
                        "\"" + key
                        + "\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)"
                );


        Matcher matcher =
                pattern.matcher(json);


        if (matcher.find()) {

            return Double.parseDouble(
                    matcher.group(1)
            );

        }


        return 0;
    }


    // =====================================
    // FIND ITEM ID
    // =====================================

    private int findItemId(
            Connection connection,
            String itemName,
            String itemType)
            throws Exception {


        String sql;


        if (itemType.equalsIgnoreCase(
                "Stationery")) {

            sql =
                    "SELECT stationery_id "
                    + "FROM stationery_items "
                    + "WHERE item_name = ?";

        } else {

            sql =
                    "SELECT food_id "
                    + "FROM food_items "
                    + "WHERE food_name = ?";
        }


        try (
            PreparedStatement statement =
                    connection.prepareStatement(sql)
        ) {

            statement.setString(
                    1,
                    itemName
            );


            try (
                ResultSet result =
                        statement.executeQuery()
            ) {

                if (result.next()) {

                    return result.getInt(1);

                }
            }
        }


        return -1;
    }
}