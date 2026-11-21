
package controller;

import db.DBConnection;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;

@WebServlet("/staff-reset-password")
public class StaffResetPasswordServlet extends HttpServlet {

    private String hashOtp(String otp) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256")
                .digest(otp.getBytes(StandardCharsets.UTF_8));

        StringBuilder result = new StringBuilder();

        for (byte b : hash) {
            result.append(String.format("%02x", b & 0xff));
        }

        return result.toString();
    }

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        HttpSession session = request.getSession(false);

        if (session == null
                || session.getAttribute("staffPasswordResetStaffId") == null) {
            response.sendRedirect(
                    "staff-forgot-password.html?error=session");
            return;
        }

        int staffId = (Integer) session.getAttribute(
                "staffPasswordResetStaffId");

        String otp = request.getParameter("otp");
        String newPassword = request.getParameter("newPassword");
        String confirmPassword = request.getParameter("confirmPassword");

        if (otp == null || !otp.matches("\\d{6}")
                || newPassword == null || newPassword.length() < 8
                || confirmPassword == null
                || !newPassword.equals(confirmPassword)) {

            response.sendRedirect(
                    "staff-reset-password.html?error=input");
            return;
        }

        Connection connection = null;

        try {
            connection = DBConnection.getConnection();

            if (connection == null) {
                throw new SQLException("Database connection unavailable.");
            }

            connection.setAutoCommit(false);

            String otpSql =
                    "SELECT id, otp_hash, expires_at, attempts "
                    + "FROM staff_password_reset_otps "
                    + "WHERE staff_id = ? AND used = 0 "
                    + "ORDER BY created_at DESC, id DESC "
                    + "LIMIT 1 FOR UPDATE";

            int otpId;
            String storedHash;
            Timestamp expiresAt;
            int attempts;

            try (PreparedStatement ps =
                         connection.prepareStatement(otpSql)) {

                ps.setInt(1, staffId);

                try (ResultSet rs = ps.executeQuery()) {

                    if (!rs.next()) {
                        connection.rollback();
                        response.sendRedirect(
                                "staff-reset-password.html?error=otp");
                        return;
                    }

                    otpId = rs.getInt("id");
                    storedHash = rs.getString("otp_hash");
                    expiresAt = rs.getTimestamp("expires_at");
                    attempts = rs.getInt("attempts");
                }
            }

            if (attempts >= 5) {
                connection.rollback();
                response.sendRedirect(
                        "staff-reset-password.html?error=locked");
                return;
            }

            if (expiresAt == null
                    || !expiresAt.toLocalDateTime()
                            .isAfter(LocalDateTime.now())) {

                try (PreparedStatement ps = connection.prepareStatement(
                        "UPDATE staff_password_reset_otps "
                        + "SET used = 1 WHERE id = ?")) {
                    ps.setInt(1, otpId);
                    ps.executeUpdate();
                }

                connection.commit();
                response.sendRedirect(
                        "staff-reset-password.html?error=expired");
                return;
            }

            String submittedHash = hashOtp(otp);

            if (!MessageDigest.isEqual(
                    storedHash.getBytes(StandardCharsets.UTF_8),
                    submittedHash.getBytes(StandardCharsets.UTF_8))) {

                try (PreparedStatement ps = connection.prepareStatement(
                        "UPDATE staff_password_reset_otps "
                        + "SET attempts = attempts + 1 WHERE id = ?")) {
                    ps.setInt(1, otpId);
                    ps.executeUpdate();
                }

                connection.commit();
                response.sendRedirect(
                        "staff-reset-password.html?error=otp");
                return;
            }

            // Hash the new password using the existing student utility.
            String passwordHash = PasswordUtil.hashPassword(newPassword);

            try (PreparedStatement ps = connection.prepareStatement(
                    "UPDATE staff SET password = ? WHERE staff_id = ?")) {

                ps.setString(1, passwordHash);
                ps.setInt(2, staffId);

                if (ps.executeUpdate() != 1) {
                    throw new SQLException("Staff account was not updated.");
                }
            }

            try (PreparedStatement ps = connection.prepareStatement(
                    "UPDATE staff_password_reset_otps "
                    + "SET used = 1, verified = 1 WHERE id = ?")) {

                ps.setInt(1, otpId);
                ps.executeUpdate();
            }

            connection.commit();

            session.removeAttribute("staffPasswordResetStaffId");

            response.sendRedirect("staff-login.html?reset=success");

        } catch (Exception e) {

            if (connection != null) {
                try {
                    connection.rollback();
                } catch (SQLException ignored) {
                    // Log the original failure below.
                }
            }

            getServletContext().log(
                    "Staff password reset failed.", e);

            response.sendRedirect(
                    "staff-reset-password.html?error=server");

        } finally {

            if (connection != null) {
                try {
                    connection.setAutoCommit(true);
                    connection.close();
                } catch (SQLException ignored) {
                    // Connection cleanup.
                }
            }
        }
    }
}
