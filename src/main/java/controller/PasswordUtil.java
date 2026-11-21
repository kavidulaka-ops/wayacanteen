
package controller;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public class PasswordUtil {

    private static final int ITERATIONS = 210000;
    private static final int SALT_LENGTH = 16;
    private static final int KEY_LENGTH = 256;

    public static String hashPassword(String password)
            throws Exception {

        byte[] salt = new byte[SALT_LENGTH];
        new SecureRandom().nextBytes(salt);

        PBEKeySpec spec = new PBEKeySpec(
                password.toCharArray(),
                salt,
                ITERATIONS,
                KEY_LENGTH
        );

        byte[] hash;

        try {
            SecretKeyFactory factory =
                    SecretKeyFactory.getInstance(
                            "PBKDF2WithHmacSHA256");

            hash = factory.generateSecret(spec).getEncoded();
        } finally {
            spec.clearPassword();
        }

        return "PBKDF2$" + ITERATIONS + "$"
                + Base64.getEncoder().encodeToString(salt)
                + "$"
                + Base64.getEncoder().encodeToString(hash);
    }

    public static boolean verifyPassword(
            String password, String storedPassword)
            throws Exception {

        if (storedPassword == null
                || !storedPassword.startsWith("PBKDF2$")) {
            return false;
        }

        String[] parts = storedPassword.split("\\$");

        if (parts.length != 4) {
            return false;
        }

        int iterations = Integer.parseInt(parts[1]);
        byte[] salt = Base64.getDecoder().decode(parts[2]);
        byte[] expectedHash =
                Base64.getDecoder().decode(parts[3]);

        PBEKeySpec spec = new PBEKeySpec(
                password.toCharArray(),
                salt,
                iterations,
                expectedHash.length * 8
        );

        byte[] actualHash;

        try {
            SecretKeyFactory factory =
                    SecretKeyFactory.getInstance(
                            "PBKDF2WithHmacSHA256");

            actualHash = factory.generateSecret(spec).getEncoded();
        } finally {
            spec.clearPassword();
        }

        return MessageDigest.isEqual(expectedHash, actualHash);
    }
}
