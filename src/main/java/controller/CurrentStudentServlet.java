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

@WebServlet("/current-student")
public class CurrentStudentServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);

        if (session == null || session.getAttribute("studentId") == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"loggedIn\":false}");
            return;
        }

        Object studentIdObj = session.getAttribute("studentId");
        int studentId = (studentIdObj instanceof Number) ? ((Number) studentIdObj).intValue() : 0;
        String indexNumber = (String) session.getAttribute("indexNumber");
        String fullName = (String) session.getAttribute("fullName");
        String email = (String) session.getAttribute("email");

        // If indexNumber, fullName or email is missing, fetch directly from DB
        if (indexNumber == null || fullName == null || email == null) {
            try (Connection conn = DBConnection.getConnection()) {
                if (conn != null) {
                    String sql = "SELECT index_number, full_name, email FROM students WHERE student_id = ?";
                    try (PreparedStatement ps = conn.prepareStatement(sql)) {
                        ps.setInt(1, studentId);
                        try (ResultSet rs = ps.executeQuery()) {
                            if (rs.next()) {
                                indexNumber = rs.getString("index_number");
                                fullName = rs.getString("full_name");
                                email = rs.getString("email");
                                session.setAttribute("indexNumber", indexNumber);
                                session.setAttribute("fullName", fullName);
                                session.setAttribute("email", email);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        if (indexNumber == null) indexNumber = "";
        if (fullName == null) fullName = "Student";
        if (email == null) email = "";

        String json = String.format(
                "{\"loggedIn\":true,\"studentId\":%d,\"indexNumber\":\"%s\",\"fullName\":\"%s\",\"email\":\"%s\"}",
                studentId,
                escapeJson(indexNumber),
                escapeJson(fullName),
                escapeJson(email)
        );

        response.getWriter().write(json);
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
