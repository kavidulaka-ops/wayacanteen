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

@WebServlet("/register")
public class RegisterServlet extends HttpServlet {

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        String indexNumber = request.getParameter("indexNumber");
        String fullName = request.getParameter("fullName");
        String email = request.getParameter("email");
        String password = request.getParameter("password");
        String confirmPassword = request.getParameter("confirmPassword");

        if (indexNumber != null) {
            indexNumber = indexNumber.trim();
        }
        if (fullName != null) {
            fullName = fullName.trim();
        }
        if (email != null) {
            email = email.trim();
        }

        // Basic validation
        if (indexNumber == null || indexNumber.isEmpty()
                || fullName == null || fullName.isEmpty()
                || password == null || password.isEmpty()
                || confirmPassword == null || confirmPassword.isEmpty()) {
            response.sendRedirect("register.html?error=empty");
            return;
        }

        if (!password.equals(confirmPassword)) {
            response.sendRedirect("register.html?error=mismatch");
            return;
        }

        if (password.length() < 6) {
            response.sendRedirect("register.html?error=weak");
            return;
        }

        try (Connection connection = DBConnection.getConnection()) {
            if (connection == null) {
                response.sendRedirect("register.html?error=db");
                return;
            }

            // Check if student with index number already exists
            String checkSql = "SELECT student_id FROM students WHERE index_number = ?";
            try (PreparedStatement checkStmt = connection.prepareStatement(checkSql)) {
                checkStmt.setString(1, indexNumber);
                try (ResultSet rs = checkStmt.executeQuery()) {
                    if (rs.next()) {
                        response.sendRedirect("register.html?error=exists");
                        return;
                    }
                }
            }

            // Hash password using PasswordUtil
            String hashedPassword = PasswordUtil.hashPassword(password);

            // Insert new student record
            String insertSql = "INSERT INTO students (index_number, full_name, email, password) VALUES (?, ?, ?, ?)";
            try (PreparedStatement insertStmt = connection.prepareStatement(insertSql)) {
                insertStmt.setString(1, indexNumber);
                insertStmt.setString(2, fullName);
                insertStmt.setString(3, (email != null && !email.isEmpty()) ? email : null);
                insertStmt.setString(4, hashedPassword);

                int rowsAffected = insertStmt.executeUpdate();
                if (rowsAffected > 0) {
                    response.sendRedirect("login.html?registered=success");
                } else {
                    response.sendRedirect("register.html?error=failed");
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.sendRedirect("register.html?error=server");
        }
    }

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {
        response.sendRedirect("register.html");
    }
}
