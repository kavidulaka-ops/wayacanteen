
package controller;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import db.DBConnection;

@WebServlet("/help-status")
public class HelpStatusServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        String referenceCode =
                request.getParameter("referenceCode");

        try (PrintWriter out = response.getWriter()) {

            if (referenceCode == null ||
                    !referenceCode.matches("HELP-[A-F0-9]{8}")) {

                response.setStatus(
                        HttpServletResponse.SC_BAD_REQUEST);

                out.print("{\"success\":false,"
                        + "\"message\":\"Please enter a valid reference number.\"}");
                return;
            }

            String sql =
                    "SELECT reference_code, category, subject, "
                    + "status, staff_response, created_at "
                    + "FROM help_submissions "
                    + "WHERE reference_code = ?";

            try (Connection con = DBConnection.getConnection();
                 PreparedStatement ps = con.prepareStatement(sql)) {

                ps.setString(1, referenceCode);

                try (ResultSet rs = ps.executeQuery()) {

                    if (rs.next()) {

                        String code = rs.getString("reference_code");
                        String category = rs.getString("category");
                        String subject = rs.getString("subject");
                        String status = rs.getString("status");
                        String staffResponse =
                                rs.getString("staff_response");
                        String createdAt =
                                rs.getString("created_at");

                        out.print("{\"success\":true,"
                                + "\"referenceCode\":\"" + code + "\","
                                + "\"category\":\"" + escape(category) + "\","
                                + "\"subject\":\"" + escape(subject) + "\","
                                + "\"status\":\"" + escape(status) + "\","
                                + "\"staffResponse\":\""
                                + escape(staffResponse == null ? "" : staffResponse)
                                + "\","
                                + "\"createdAt\":\"" + escape(createdAt) + "\"}");
                    } else {
                        response.setStatus(
                                HttpServletResponse.SC_NOT_FOUND);

                        out.print("{\"success\":false,"
                                + "\"message\":\"No submission found for this reference number.\"}");
                    }
                }

            } catch (Exception ex) {
                log("Help status lookup failed.", ex);

                response.setStatus(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

                out.print("{\"success\":false,"
                        + "\"message\":\"Unable to retrieve status.\"}");
            }
        }
    }

    private String escape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
