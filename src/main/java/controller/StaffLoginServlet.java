
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

@WebServlet("/staff-login")
public class StaffLoginServlet extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        String username = request.getParameter("staffId");
        String password = request.getParameter("password");

        if (username == null || password == null
                || username.trim().isEmpty()
                || password.isEmpty()) {

            response.sendRedirect("staff-login.html?error=empty");
            return;
        }

        String sql = "SELECT staff_id, staff_username, password, "
                + "full_name, role FROM staff WHERE staff_username = ?";

        try (Connection connection = DBConnection.getConnection()) {

            if (connection == null) {
                response.sendError(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                        "Database connection failed.");
                return;
            }

            try (PreparedStatement ps = connection.prepareStatement(sql)) {

                ps.setString(1, username.trim());

                try (ResultSet rs = ps.executeQuery()) {

                    if (!rs.next()) {
                        response.sendRedirect(
                                "staff-login.html?error=invalid");
                        return;
                    }

                    String storedPassword = rs.getString("password");
                    boolean validPassword = false;

                    if (storedPassword != null
                            && storedPassword.startsWith("PBKDF2$")) {

                        validPassword = PasswordUtil.verifyPassword(
                                password, storedPassword);

                    } else if (storedPassword != null
                            && password.equals(storedPassword)) {

                        // Migrate a legacy plain-text password to a hash.
                        String newHash =
                                PasswordUtil.hashPassword(password);

                        try (PreparedStatement update =
                                connection.prepareStatement(
                                        "UPDATE staff SET password = ? "
                                        + "WHERE staff_id = ?")) {

                            update.setString(1, newHash);
                            update.setInt(2, rs.getInt("staff_id"));
                            update.executeUpdate();
                        }

                        validPassword = true;
                    }

                    if (!validPassword) {
                        response.sendRedirect(
                                "staff-login.html?error=invalid");
                        return;
                    }

                    int staffId = rs.getInt("staff_id");
                    String staffUsername =
                            rs.getString("staff_username");
                    String fullName = rs.getString("full_name");
                    String role = rs.getString("role");

                    if (role == null
                            || (!role.equalsIgnoreCase("ADMIN")
                            && !role.equalsIgnoreCase("STAFF"))) {
                        response.sendError(
                                HttpServletResponse.SC_FORBIDDEN,
                                "Invalid staff role.");
                        return;
                    }

                    HttpSession oldSession = request.getSession(false);

                    if (oldSession != null) {
                        oldSession.invalidate();
                    }

                    HttpSession session = request.getSession(true);

                    session.setAttribute("staffId", staffId);
                    session.setAttribute("staffUsername", staffUsername);
                    session.setAttribute("staffName", fullName);
                    session.setAttribute("role", role.toUpperCase());

                    session.setMaxInactiveInterval(30 * 60);

                    if (role.equalsIgnoreCase("ADMIN")) {
                        response.sendRedirect("admin-dashboard.html");
                    } else {
                        response.sendRedirect("staff-dashboard.html");
                    }
                }
            }

        } catch (Exception e) {

            getServletContext().log("Staff login failed.", e);

            response.sendError(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Unable to process login right now.");
        }
    }
}
