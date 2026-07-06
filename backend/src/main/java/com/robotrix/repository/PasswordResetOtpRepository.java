package com.robotrix.repository;

import com.robotrix.model.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, UUID> {
    
    List<PasswordResetOtp> findByEmailIgnoreCase(String email);

    Optional<PasswordResetOtp> findFirstByEmailIgnoreCaseAndOtpOrderByCreatedAtDesc(String email, String otp);

    Optional<PasswordResetOtp> findFirstByEmailIgnoreCaseAndOtpAndVerifiedTrueOrderByCreatedAtDesc(String email, String otp);
}
