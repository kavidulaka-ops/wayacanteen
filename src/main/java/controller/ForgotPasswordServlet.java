
package controller;

import db.DBConnection;
import service.EmailService;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;

@WebServlet("/forgot-password")
public class ForgotPasswordServlet extends HttpServlet {

    private static final SecureRandom RANDOM = new SecureRandom();

    private String hashOtp(String otp) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256")
                .digest(otp.getBytes(
                        java.nio.charset.StandardCharsets.UTF_8));

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

        System.out.println("ForgotPasswordServlet doPost called");

        request.setCharacterEncoding("UTF-8");

        String indexNumber = request.getParameter("indexNumber");

        if (indexNumber == null || indexNumber.trim().isEmpty()) {
            response.sendRedirect("forgot-password.html?error=empty");
            return;
        }

        indexNumber = indexNumber.trim();

        System.out.println("Index number received: " + indexNumber);

        try (Connection con = DBConnection.getConnection()) {

            if (con == null) {
                response.sendError(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                        "Database connection failed.");
                return;
            }

            System.out.println("Database connection opened");

            int studentId;
            String email;

            String studentSql =
                    "SELECT student_id, email FROM students "
                    + "WHERE index_number = ?";

            try (PreparedStatement ps =
                    con.prepareStatement(studentSql)) {

                ps.setString(1, indexNumber);

                try (ResultSet rs = ps.executeQuery()) {

                    if (!rs.next()) {
                        System.out.println("Student not found");

                        response.sendRedirect(
                                "forgot-password.html?sent=1");
                        return;
                    }

                    studentId = rs.getInt("student_id");
                    email = rs.getString("email");

                    System.out.println("Student found in database");
                    System.out.println("Student email retrieved");
                }
            }

            if (email == null || email.trim().isEmpty()) {
                response.sendRedirect("forgot-password.html?sent=1");
                return;
            }

            // Maximum 3 OTP requests within 15 minutes.
            String limitSql =
                    "SELECT COUNT(*) FROM password_reset_otps "
                    + "WHERE student_id = ? "
                    + "AND created_at >= NOW() - INTERVAL 15 MINUTE";

            try (PreparedStatement ps =
                    con.prepareStatement(limitSql)) {

                ps.setInt(1, studentId);

                try (ResultSet rs = ps.executeQuery()) {

                    if (rs.next()) {
    int recentRequests = rs.getInt(1);

    System.out.println(
            "Recent OTP requests: " + recentRequests);

    if (recentRequests >= 3) {
        System.out.println("OTP request limit reached");

        response.sendRedirect(
                "forgot-password.html?sent=1");
        return;
    }
}
                }
            }

            // Invalidate previous unused OTPs.
            String invalidateSql =
                    "UPDATE password_reset_otps "
                    + "SET used = TRUE "
                    + "WHERE student_id = ? AND used = FALSE";

            try (PreparedStatement ps =
                    con.prepareStatement(invalidateSql)) {

                ps.setInt(1, studentId);
                ps.executeUpdate();
            }

            // Generate a six-digit OTP.
            String otp = String.format(
                    "%06d", RANDOM.nextInt(1_000_000));

            String otpHash = hashOtp(otp);

            String insertSql =
                    "INSERT INTO password_reset_otps "
                    + "(student_id, otp_hash, expires_at, attempts, used) "
                    + "VALUES (?, ?, ?, 0, FALSE)";

            int otpRecordId;

            // Save OTP hash and expiration time.
            try (PreparedStatement ps = con.prepareStatement(
                    insertSql,
                    PreparedStatement.RETURN_GENERATED_KEYS)) {

                ps.setInt(1, studentId);
                ps.setString(2, otpHash);

                ps.setTimestamp(
                        3,
                        Timestamp.valueOf(
                                LocalDateTime.now().plusMinutes(5)));

                ps.executeUpdate();

                try (ResultSet keys = ps.getGeneratedKeys()) {

                    if (!keys.next()) {
                        throw new IllegalStateException(
                                "Could not create OTP record.");
                    }

                    otpRecordId = keys.getInt(1);
                }
            }

            System.out.println("OTP record inserted successfully");
            System.out.println("Starting Gmail OTP send...");

            // Send OTP email.
            try {

                EmailService.sendOtp(email, otp);

                System.out.println("Gmail OTP send completed.");

            } catch (Exception mailError) {

                System.out.println("Gmail OTP send FAILED!");

                mailError.printStackTrace();

                getServletContext().log(
                        "Failed to send password reset email.",
                        mailError);

                // Invalidate the OTP if sending fails.
                try (PreparedStatement ps = con.prepareStatement(
                        "UPDATE password_reset_otps "
                        + "SET used = TRUE WHERE id = ?")) {

                    ps.setInt(1, otpRecordId);
                    ps.executeUpdate();
                }

                response.sendRedirect(
                        "forgot-password.html?error=mail");
                return;
            }

           // Keep the student ID temporarily for password reset.
jakarta.servlet.http.HttpSession session =
        request.getSession(true);

session.setAttribute("passwordResetStudentId", studentId);

// Open the OTP verification form.
response.sendRedirect("reset-password.html");
        } catch (Exception e) {

            getServletContext().log(
                    "Forgot password request failed.", e);

            response.sendError(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Unable to process the request right now.");
        }
    }
}
