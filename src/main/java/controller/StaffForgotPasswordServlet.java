
package controller;

import db.DBConnection;
import service.EmailService;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;

@WebServlet("/staff-forgot-password")
public class StaffForgotPasswordServlet extends HttpServlet {

    private final SecureRandom secureRandom = new SecureRandom();

    private String hashOtp(String otp) throws Exception {

        MessageDigest digest =
                MessageDigest.getInstance("SHA-256");

        byte[] hash = digest.digest(
                otp.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );

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

        String contextPath = request.getContextPath();

        String staffUsername = request.getParameter("staffUsername");

        if (staffUsername == null || staffUsername.trim().isEmpty()) {

            response.sendRedirect(
                    contextPath + "/staff-forgot-password.html?error=empty"
            );
            return;
        }

        staffUsername = staffUsername.trim();

        try (Connection connection = DBConnection.getConnection()) {

            if (connection == null) {
                throw new IllegalStateException(
                        "Database connection unavailable."
                );
            }

            int staffId;
            String email;

            // Find the staff account.
            String findStaffSql =
                    "SELECT staff_id, email FROM staff "
                    + "WHERE staff_username = ?";

            try (PreparedStatement ps =
                         connection.prepareStatement(findStaffSql)) {

                ps.setString(1, staffUsername);

                try (ResultSet rs = ps.executeQuery()) {

                    if (!rs.next()) {
                        response.sendRedirect(
                                contextPath
                                + "/staff-forgot-password.html?sent=1"
                        );
                        return;
                    }

                    staffId = rs.getInt("staff_id");
                    email = rs.getString("email");
                }
            }

            if (email == null || email.isBlank()) {
                response.sendRedirect(
                        contextPath
                        + "/staff-forgot-password.html?sent=1"
                );
                return;
            }

            // Maximum 3 OTP requests within 15 minutes.
            String countSql =
                    "SELECT COUNT(*) "
                    + "FROM staff_password_reset_otps "
                    + "WHERE staff_id = ? "
                    + "AND created_at >= "
                    + "NOW() - INTERVAL 15 MINUTE";

            try (PreparedStatement ps =
                         connection.prepareStatement(countSql)) {

                ps.setInt(1, staffId);

                try (ResultSet rs = ps.executeQuery()) {

                    if (rs.next() && rs.getInt(1) >= 3) {
                        response.sendRedirect(
                                contextPath
                                + "/staff-forgot-password.html?sent=1"
                        );
                        return;
                    }
                }
            }

            // Generate a 6-digit OTP.
            String otp = String.format(
                    "%06d",
                    secureRandom.nextInt(1_000_000)
            );

            String otpHash = hashOtp(otp);

            // Invalidate earlier unused OTPs.
            String invalidateSql =
                    "UPDATE staff_password_reset_otps "
                    + "SET used = 1 "
                    + "WHERE staff_id = ? AND used = 0";

            try (PreparedStatement ps =
                         connection.prepareStatement(invalidateSql)) {

                ps.setInt(1, staffId);
                ps.executeUpdate();
            }

            // Store the hashed OTP for 5 minutes.
            LocalDateTime now = LocalDateTime.now();

            String insertSql =
                    "INSERT INTO staff_password_reset_otps "
                    + "(staff_id, otp_hash, created_at, expires_at, "
                    + "attempts, verified, used) "
                    + "VALUES (?, ?, ?, ?, 0, 0, 0)";

            try (PreparedStatement ps =
                         connection.prepareStatement(insertSql)) {

                ps.setInt(1, staffId);
                ps.setString(2, otpHash);
                ps.setTimestamp(3, Timestamp.valueOf(now));
                ps.setTimestamp(
                        4,
                        Timestamp.valueOf(now.plusMinutes(5))
                );

                ps.executeUpdate();
            }

            // Send OTP by email.
            try {

                EmailService.sendOtp(email, otp);

            } catch (Exception mailError) {

                String invalidateFailedOtpSql =
                        "UPDATE staff_password_reset_otps "
                        + "SET used = 1 "
                        + "WHERE staff_id = ? AND otp_hash = ?";

                try (PreparedStatement ps =
                             connection.prepareStatement(
                                     invalidateFailedOtpSql)) {

                    ps.setInt(1, staffId);
                    ps.setString(2, otpHash);
                    ps.executeUpdate();
                }

                throw mailError;
            }

            // Store the staff ID in the session for the reset process.
            HttpSession session = request.getSession(true);

            session.removeAttribute("staffPasswordResetStaffId");
            session.setAttribute("staffPasswordResetStaffId", staffId);

            // OTP sent successfully: show the reset form.
            response.sendRedirect(
                    contextPath + "/staff-reset-password.html"
            );
            return;

        } catch (Exception e) {

            getServletContext().log(
                    "Staff password reset OTP request failed.",
                    e
            );

            response.sendRedirect(
                    contextPath
                    + "/staff-forgot-password.html?error=server"
            );
        }
    }
}
