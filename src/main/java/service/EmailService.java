
package service;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.util.Properties;

public class EmailService {

    public static void sendOtp(String recipient, String otp)
            throws Exception {

        String username = System.getenv("CANTIN_MAIL_USER");
        String appPassword =
                System.getenv("CANTIN_MAIL_APP_PASSWORD");

        if (username == null || appPassword == null
                || username.isBlank() || appPassword.isBlank()) {
            throw new IllegalStateException(
                    "Gmail credentials are not configured.");
        }

        Properties props = new Properties();

        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", "smtp.gmail.com");
        props.put("mail.smtp.port", "587");
        props.put("mail.smtp.ssl.protocols", "TLSv1.2");

        Session session = Session.getInstance(
                props,
                new Authenticator() {
                    @Override
                    protected PasswordAuthentication
                            getPasswordAuthentication() {
                        return new PasswordAuthentication(
                                username, appPassword);
                    }
                });

        Message message = new MimeMessage(session);

        message.setFrom(new InternetAddress(username));

        message.setRecipients(
                Message.RecipientType.TO,
                InternetAddress.parse(recipient));

        message.setSubject("Cantin - Password Reset OTP");

        message.setText(
                "Your Cantin password reset code is: " + otp
                + "\n\nThis code expires in 5 minutes."
                + "\nIf you did not request this, ignore this email.");

        Transport.send(message);

        System.out.println("Email sent successfully.");
    }
}
