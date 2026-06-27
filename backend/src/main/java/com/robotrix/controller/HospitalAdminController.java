package com.robotrix.controller;

import com.robotrix.model.User;
import com.robotrix.repository.UserRepository;
import com.robotrix.security.RobotrixUserDetails;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/hospitaladmin")
@PreAuthorize("hasRole('HOSPITAL_ADMIN')")
@CrossOrigin(origins = "*")
public class HospitalAdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/users")
    public ResponseEntity<?> createUser(
            @RequestBody UserCreateRequest request,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        
        String username = request.getUsername();
        if (username == null || username.trim().length() < 4 || !username.trim().equals(username.trim().toLowerCase()) || !username.trim().matches("^[a-z0-9_.-]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username must be at least 4 characters, lowercase, and contain only valid characters (a-z, 0-9, _, -, .)"));
        }

        if (userRepository.existsByUsernameGlobal(username.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
        }

        // Scope new user to the logged-in Hospital Admin's tenant
        User doctor = new User();
        doctor.setTenantId(principal.getTenantId());
        doctor.setUsername(username.trim());
        doctor.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        doctor.setRole("DOCTOR");
        
        userRepository.save(doctor);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Doctor user registered successfully"));
    }

    @Data
    public static class UserCreateRequest {
        private String username;
        private String password;
    }
}
