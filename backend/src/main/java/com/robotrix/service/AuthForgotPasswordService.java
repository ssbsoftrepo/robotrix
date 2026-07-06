package com.robotrix.service;

import com.robotrix.model.PasswordResetOtp;
import com.robotrix.model.User;
import com.robotrix.repository.PasswordResetOtpRepository;
import com.robotrix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthForgotPasswordService {

    private final UserRepository userRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void requestForgotPasswordOtp(String email) {
        String trimmedEmail = email.trim();
        
        User user = userRepository.findByEmailGlobal(trimmedEmail)
            .orElseThrow(() -> new IllegalArgumentException("User with email '" + email + "' not found"));

        // Generate 6-digit OTP
        String otp = String.format("%06d", new Random().nextInt(1000000));

        // Delete any existing OTPs for this email to clean up
        otpRepository.findByEmailIgnoreCase(trimmedEmail)
            .forEach(otpRepository::delete);

        // Save new OTP
        PasswordResetOtp otpEntity = new PasswordResetOtp();
        otpEntity.setEmail(trimmedEmail);
        otpEntity.setOtp(otp);
        otpEntity.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        otpEntity.setVerified(false);
        otpRepository.save(otpEntity);

        // Send OTP via SMTP
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("ssbsoftrepo@gmail.com");
            helper.setTo(trimmedEmail);
            helper.setSubject("Robotrix+ — Password Reset OTP");
            
            String htmlContent = getOtpEmailTemplate(otp);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send SMTP email to {}: {}", trimmedEmail, e.getMessage());
            // Do not fail the request since mail config might be dummy/mocked.
        }
    }

    @Transactional
    public void verifyOtp(String email, String otp) {
        String trimmedEmail = email.trim();
        PasswordResetOtp otpEntity = otpRepository.findFirstByEmailIgnoreCaseAndOtpOrderByCreatedAtDesc(trimmedEmail, otp)
            .orElseThrow(() -> new IllegalArgumentException("Invalid or incorrect OTP"));

        if (otpEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP has expired. Please request a new one.");
        }

        otpEntity.setVerified(true);
        otpRepository.save(otpEntity);
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword, String confirmPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Password cannot be empty");
        }
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        String trimmedEmail = email.trim();
        PasswordResetOtp otpEntity = otpRepository.findFirstByEmailIgnoreCaseAndOtpAndVerifiedTrueOrderByCreatedAtDesc(trimmedEmail, otp)
            .orElseThrow(() -> new IllegalArgumentException("OTP verification has expired or is invalid. Please verify again."));

        if (otpEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP verification session has expired. Please request a new OTP.");
        }

        User user = userRepository.findByEmailGlobal(trimmedEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Delete the used OTP record
        otpRepository.delete(otpEntity);
        log.info("Password successfully reset for user: {}", user.getUsername());
    }

    private String getOtpEmailTemplate(String otp) {
        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0; width: 100%;">
                    <tr>
                        <td align="center" style="padding: 0;">
                            <table align="center" role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02); overflow: hidden; border: 1px solid #e2e8f0;">
                                <!-- Header -->
                                <tr>
                                    <td style="background-color: #1e1e1e; background: linear-gradient(to bottom, #2a2a2a 0%, #121212 100%); background-image: linear-gradient(to bottom, #2a2a2a 0%, #121212 100%); padding: 32px 40px; text-align: left;">
                                        <h1 style="margin: 0; color: #E0E0E0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">ROBOTRIX<span style="color: #6D282C;">+</span></h1>
                                        <p style="margin: 4px 0 0 0; color: #888888; font-size: 14px; font-weight: 500;">Secure Identity & Access Management</p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px 40px 32px 40px;">
                                        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 600; line-height: 1.3;">Password Verification Code</h2>
                                        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                                            We received a request to reset the password for your Robotrix+ account. Use the verification code below to authorize this request:
                                        </p>
                                        
                                        <!-- OTP Box -->
                                        <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                                            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">Verification Code</div>
                                            <div style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 38px; font-weight: 700; color: #1a1a1a; letter-spacing: 6px; margin: 0; padding-left: 6px;">[OTP]</div>
                                        </div>
                                        
                                        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                                            <strong style="color: #a70f0fff;">Important:</strong> This code is valid for <strong>5 minutes</strong>. If you did not initiate this request, you can safely ignore this email. Your password will remain unchanged.
                                        </p>
                                        
                                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 24px 0;" />
                                        
                                        <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #475569;">
                                            Regards,<br>
                                            <strong style="color: #0f172a;">The Robotrix+ Team</strong>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                                            This is an automated notification. Please do not reply directly to this email.
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                                            &copy; 2026 Robotrix+ Inc. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """;
        return html.replace("[OTP]", otp);
    }
}
