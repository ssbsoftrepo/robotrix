package com.robotrix.service;

import com.robotrix.model.PasswordResetOtp;
import com.robotrix.model.User;
import com.robotrix.repository.PasswordResetOtpRepository;
import com.robotrix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
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

        // Log the OTP (crucial for local testing / dummy config as requested by the user!)
        log.info("--------------------------------------------------");
        log.info("GENERATED PASSWORD RESET OTP: {} FOR EMAIL: {}", otp, trimmedEmail);
        log.info("--------------------------------------------------");

        // Send OTP via SMTP
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("dummy.email@gmail.com");
            message.setTo(trimmedEmail);
            message.setSubject("Robotrix+ — Password Reset OTP");
            message.setText("You requested to reset your password.\n\n" +
                           "Your OTP is: " + otp + "\n\n" +
                           "This OTP is valid for 5 minutes.");
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
}
