
package controller;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import db.DBConnection;

@WebServlet("/help-submit")
public class HelpSubmitServlet extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");

        String category = request.getParameter("category");
        String subject = request.getParameter("subject");
        String message = request.getParameter("message");

        try (PrintWriter out = response.getWriter()) {

            if (category == null || subject == null
                    || message == null) {

                response.setStatus(
                        HttpServletResponse.SC_BAD_REQUEST);

                out.print("{\"success\":false,"
                        + "\"message\":\"Missing required fields.\"}");
                return;
            }

            category = category.trim();
            subject = subject.trim();
            message = message.trim();

            if (category.isEmpty() || subject.isEmpty()
                    || message.isEmpty()
                    || subject.length() > 150
                    || message.length() > 5000
                    || category.length() > 50) {

                response.setStatus(
                        HttpServletResponse.SC_BAD_REQUEST);

                out.print("{\"success\":false,"
                        + "\"message\":\"Please check your input.\"}");
                return;
            }

            if (!category.equals("Food")
                    && !category.equals("Cleanliness")
                    && !category.equals("Staff")
                    && !category.equals("Suggestion")
                    && !category.equals("Other")) {

                response.setStatus(
                        HttpServletResponse.SC_BAD_REQUEST);

                out.print("{\"success\":false,"
                        + "\"message\":\"Invalid category.\"}");
                return;
            }

            String referenceCode =
                    "HELP-" + UUID.randomUUID()
                            .toString()
                            .substring(0, 8)
                            .toUpperCase();

            String sql =
                    "INSERT INTO help_submissions "
                    + "(reference_code, category, subject, message) "
                    + "VALUES (?, ?, ?, ?)";

            try (Connection con =
                         DBConnection.getConnection();
                 PreparedStatement ps =
                         con.prepareStatement(sql)) {

                ps.setString(1, referenceCode);
                ps.setString(2, category);
                ps.setString(3, subject);
                ps.setString(4, message);

                int rows = ps.executeUpdate();

                if (rows == 1) {
                    response.setStatus(
                            HttpServletResponse.SC_CREATED);

                    out.print("{\"success\":true,"
                            + "\"referenceCode\":\""
                            + referenceCode + "\","
                            + "\"message\":\"Submission received.\"}");
                } else {
                    response.setStatus(
                            HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

                    out.print("{\"success\":false,"
                            + "\"message\":\"Submission could not be saved.\"}");
                }

            } catch (SQLException ex) {
                log("Failed to save help submission.", ex);

                response.setStatus(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

                out.print("{\"success\":false,"
                        + "\"message\":\"Database error. Please try again.\"}");
            }

        }
    }
}
