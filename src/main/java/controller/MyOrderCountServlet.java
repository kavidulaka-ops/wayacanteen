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

@WebServlet("/my-order-count")
public class MyOrderCountServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);

        if (session == null ||
                session.getAttribute("studentId") == null) {

            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED);

            response.getWriter().write(
                    "{\"error\":\"Please login first\"}");

            return;
        }

        int studentId = ((Number)
                session.getAttribute("studentId")).intValue();

        String sql =
                "SELECT COUNT(*) AS order_count " +
                "FROM orders WHERE student_id = ?";

        try (Connection con = DBConnection.getConnection()) {

            if (con == null) {
                throw new java.sql.SQLException(
                        "Database connection failed");
            }

            try (PreparedStatement ps =
                    con.prepareStatement(sql)) {

                ps.setInt(1, studentId);

                try (ResultSet rs = ps.executeQuery()) {

                    int count = 0;

                    if (rs.next()) {
                        count = rs.getInt("order_count");
                    }

                    response.getWriter().write(
                            "{\"count\":" + count + "}");
                }
            }

        } catch (Exception e) {

            getServletContext().log(
                    "Error loading student order count", e);

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

            response.getWriter().write(
                    "{\"error\":\"Unable to load order count\"}");
        }
    }
}
