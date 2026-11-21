
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

@WebServlet("/login")
public class LoginServlet extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        String indexNumber = request.getParameter("indexNumber");
        String password = request.getParameter("password");

        if (indexNumber == null || password == null
                || indexNumber.isBlank() || password.isEmpty()) {
            response.sendRedirect("login.html?error=empty");
            return;
        }

        String sql = "SELECT student_id, index_number, full_name, email, password FROM students WHERE index_number = ?";

        try (Connection connection = DBConnection.getConnection()) {

            if (connection == null) {
                response.sendError(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                        "Database connection failed.");
                return;
            }

            try (PreparedStatement statement =
                    connection.prepareStatement(sql)) {

                statement.setString(1, indexNumber);

                try (ResultSet result = statement.executeQuery()) {

                    if (!result.next()) {
                        response.sendRedirect(
                                "login.html?error=invalid");
                        return;
                    }

                    String storedPassword =
                            result.getString("password");

                    boolean validPassword;

                    if (storedPassword != null
                            && storedPassword.startsWith("PBKDF2$")) {

                        validPassword = PasswordUtil.verifyPassword(
                                password, storedPassword);

                    } else {
                        // Compatibility with existing plain-text passwords
                        validPassword =
                                storedPassword != null
                                && storedPassword.equals(password);

                        // Upgrade the old password after successful login
                        if (validPassword) {
                            String hashedPassword =
                                    PasswordUtil.hashPassword(password);

                            try (PreparedStatement update =
                                    connection.prepareStatement(
                                            "UPDATE students "
                                            + "SET password = ? "
                                            + "WHERE student_id = ?")) {

                                update.setString(1, hashedPassword);
                                update.setInt(
                                        2, result.getInt("student_id"));
                                update.executeUpdate();
                            }
                        }
                    }

                    if (!validPassword) {
                        response.sendRedirect(
                                "login.html?error=invalid");
                        return;
                    }

                    int studentId = result.getInt("student_id");
                    String savedIndex = result.getString("index_number");
                    String fullName = result.getString("full_name");
                    String email = result.getString("email");

                    HttpSession oldSession = request.getSession(false);

                    if (oldSession != null) {
                        oldSession.invalidate();
                    }

                    HttpSession session = request.getSession(true);

                    session.setAttribute("studentId", studentId);
                    session.setAttribute("indexNumber", savedIndex);
                    session.setAttribute("fullName", fullName);
                    session.setAttribute("email", email);

                    response.sendRedirect("home.html");
                }
            }

        } catch (Exception e) {
            getServletContext().log("Student login failed.", e);

            response.sendError(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Login could not be completed. Please try again.");
        }
    }
}
