
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
import java.sql.Timestamp;

@WebServlet("/reset-password")
public class ResetPasswordServlet extends HttpServlet {

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
                || session.getAttribute("passwordResetStudentId") == null) {
            response.sendRedirect("forgot-password.html?error=session");
            return;
        }

        int studentId = (Integer) session.getAttribute(
                "passwordResetStudentId");

        String otp = request.getParameter("otp");
        String newPassword = request.getParameter("newPassword");
        String confirmPassword = request.getParameter("confirmPassword");

        if (otp == null || !otp.matches("[0-9]{6}")
                || newPassword == null
                || confirmPassword == null) {
            response.sendRedirect("reset-password.html?error=input");
            return;
        }

        if (newPassword.length() < 8
                || !newPassword.equals(confirmPassword)) {
            response.sendRedirect("reset-password.html?error=password");
            return;
        }

        Connection con = null;

        try {
            con = DBConnection.getConnection();

            if (con == null) {
                response.sendError(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                        "Database connection failed.");
                return;
            }

            con.setAutoCommit(false);

            int otpId;
            String storedHash;
            Timestamp expiresAt;
            int attempts;
            boolean used;

            String selectSql =
                    "SELECT id, otp_hash, expires_at, attempts, used "
                    + "FROM password_reset_otps "
                    + "WHERE student_id = ? AND used = FALSE "
                    + "ORDER BY created_at DESC, id DESC "
                    + "LIMIT 1 FOR UPDATE";

            try (PreparedStatement ps =
                    con.prepareStatement(selectSql)) {

                ps.setInt(1, studentId);

                try (ResultSet rs = ps.executeQuery()) {

                    if (!rs.next()) {
                        con.rollback();
                        response.sendRedirect(
                                "reset-password.html?error=otp");
                        return;
                    }

                    otpId = rs.getInt("id");
                    storedHash = rs.getString("otp_hash");
                    expiresAt = rs.getTimestamp("expires_at");
                    attempts = rs.getInt("attempts");
                    used = rs.getBoolean("used");
                }
            }

            if (used || attempts >= 5) {
                try (PreparedStatement ps = con.prepareStatement(
                        "UPDATE password_reset_otps "
                        + "SET used = TRUE WHERE id = ?")) {
                    ps.setInt(1, otpId);
                    ps.executeUpdate();
                }

                con.commit();

                response.sendRedirect(
                        "reset-password.html?error=otp");
                return;
            }

            if (expiresAt == null
                    || !expiresAt.after(new Timestamp(
                            System.currentTimeMillis()))) {

                try (PreparedStatement ps = con.prepareStatement(
                        "UPDATE password_reset_otps "
                        + "SET used = TRUE WHERE id = ?")) {
                    ps.setInt(1, otpId);
                    ps.executeUpdate();
                }

                con.commit();

                response.sendRedirect(
                        "reset-password.html?error=expired");
                return;
            }

            String submittedHash = hashOtp(otp);

            if (!MessageDigest.isEqual(
                    storedHash.getBytes(StandardCharsets.UTF_8),
                    submittedHash.getBytes(StandardCharsets.UTF_8))) {

                try (PreparedStatement ps = con.prepareStatement(
                        "UPDATE password_reset_otps "
                        + "SET attempts = attempts + 1 "
                        + "WHERE id = ?")) {

                    ps.setInt(1, otpId);
                    ps.executeUpdate();
                }

                con.commit();

                response.sendRedirect(
                        "reset-password.html?error=otp");
                return;
            }

            // Hash the new password before saving it.
            String passwordHash =
                    PasswordUtil.hashPassword(newPassword);

            try (PreparedStatement ps = con.prepareStatement(
                    "UPDATE students SET password = ? "
                    + "WHERE student_id = ?")) {

                ps.setString(1, passwordHash);
                ps.setInt(2, studentId);

                if (ps.executeUpdate() != 1) {
                    throw new IllegalStateException(
                            "Student password could not be updated.");
                }
            }

            // Mark the OTP as used so it cannot be reused.
            try (PreparedStatement ps = con.prepareStatement(
                    "UPDATE password_reset_otps "
                    + "SET used = TRUE WHERE id = ?")) {

                ps.setInt(1, otpId);
                ps.executeUpdate();
            }

            con.commit();

            session.removeAttribute("passwordResetStudentId");

            response.sendRedirect("index.html?reset=success");

        } catch (Exception e) {

            if (con != null) {
                try {
                    con.rollback();
                } catch (Exception rollbackError) {
                    getServletContext().log(
                            "Password reset rollback failed.",
                            rollbackError);
                }
            }

            getServletContext().log(
                    "Password reset failed.", e);

            response.sendError(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Unable to reset the password. Please try again.");

        } finally {

            if (con != null) {
                try {
                    con.setAutoCommit(true);
                    con.close();
                } catch (Exception closeError) {
                    getServletContext().log(
                            "Database connection close failed.",
                            closeError);
                }
            }
        }
    }
}
