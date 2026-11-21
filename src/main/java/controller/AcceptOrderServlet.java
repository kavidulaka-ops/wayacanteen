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

@WebServlet("/accept-order")
public class AcceptOrderServlet extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType(
                "application/json;charset=UTF-8"
        );

        String orderIdString =
                request.getParameter("orderId");

        if (orderIdString == null ||
                orderIdString.isEmpty()) {

            response.getWriter().println(
                    "{\"success\":false,\"message\":\"Order ID is missing\"}"
            );

            return;
        }

        int orderId;

        try {

            orderId =
                    Integer.parseInt(orderIdString);

        } catch (NumberFormatException e) {

            response.getWriter().println(
                    "{\"success\":false,\"message\":\"Invalid Order ID\"}"
            );

            return;
        }

        String sql =
                "UPDATE orders " +
                "SET status = 'Accepted', " +
                "accepted_date = CURDATE(), " +
                "accepted_time = CURTIME() " +
                "WHERE order_id = ? " +
                "AND status = 'Pending'";

        try (
            Connection connection =
                    DBConnection.getConnection();

            PreparedStatement statement =
                    connection.prepareStatement(sql)
        ) {

            if (connection == null) {

                response.getWriter().println(
                        "{\"success\":false,\"message\":\"DATABASE CONNECTION FAILED\"}"
                );

                return;
            }

            statement.setInt(
                    1,
                    orderId
            );

            int rowsUpdated =
                    statement.executeUpdate();

            if (rowsUpdated > 0) {

                response.getWriter().println(
                        "{"
                        + "\"success\":true,"
                        + "\"message\":\"Order accepted successfully\""
                        + "}"
                );

            } else {

                response.getWriter().println(
                        "{"
                        + "\"success\":false,"
                        + "\"message\":\"Order not found or already accepted\""
                        + "}"
                );
            }

        } catch (Exception e) {

            e.printStackTrace();

            response.getWriter().println(
                    "{"
                    + "\"success\":false,"
                    + "\"message\":\""
                    + e.getMessage()
                            .replace("\"", "\\\"")
                    + "\""
                    + "}"
            );
        }
    }
}