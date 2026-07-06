package com.robotrix.controller;

import com.robotrix.model.Tenant;
import com.robotrix.model.User;
import com.robotrix.repository.TenantRepository;
import com.robotrix.repository.UserRepository;
import com.robotrix.security.JwtService;
import com.robotrix.security.RobotrixUserDetails;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam(value = "username") String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of("available", false, "message", "Username is required"));
        }
        String trimmed = username.trim();
        if (trimmed.length() < 4) {
            return ResponseEntity.ok(Map.of("available", false, "message", "Username must be at least 4 characters"));
        }
        if (!trimmed.equals(trimmed.toLowerCase())) {
            return ResponseEntity.ok(Map.of("available", false, "message", "Capital letters are not allowed"));
        }
        if (!trimmed.matches("^[a-z0-9_.-]+$")) {
            return ResponseEntity.ok(Map.of("available", false, "message", "Only lowercase letters, numbers, _, - and . are allowed"));
        }
        boolean exists = userRepository.existsByUsernameGlobal(trimmed);
        if (exists) {
            return ResponseEntity.ok(Map.of("available", false, "message", "Username is already taken"));
        }
        return ResponseEntity.ok(Map.of("available", true, "message", "Username is available"));
    }

    @PostMapping("/register-tenant")
    public ResponseEntity<?> registerTenant(@RequestBody TenantRegisterRequest request) {
        if (tenantRepository.findByName(request.getTenantName()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Hospital/Tenant already exists"));
        }

        String username = request.getUsername();
        if (username == null || username.trim().length() < 4 || !username.trim().equals(username.trim().toLowerCase()) || !username.trim().matches("^[a-z0-9_.-]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username must be at least 4 characters, lowercase, and contain only valid characters (a-z, 0-9, _, -, .)"));
        }

        if (userRepository.existsByUsernameGlobal(username.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
        }

        // Create Tenant
        Tenant tenant = new Tenant();
        tenant.setName(request.getTenantName());
        tenant.setSubscriptionExpiresAt(LocalDateTime.now().plusYears(1));
        tenantRepository.save(tenant);

        // Create Admin User for this Tenant
        User user = new User();
        user.setTenantId(tenant.getId());
        user.setUsername(username.trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole("ADMIN");
        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Tenant and Admin registered successfully"));
    }

    @PostMapping("/register-user")
    public ResponseEntity<?> registerUser(@RequestBody UserRegisterRequest request) {
        Optional<Tenant> tenantOpt = tenantRepository.findById(request.getTenantId());
        if (tenantOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Hospital/Tenant not found"));
        }

        String username = request.getUsername();
        if (username == null || username.trim().length() < 4 || !username.trim().equals(username.trim().toLowerCase()) || !username.trim().matches("^[a-z0-9_.-]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username must be at least 4 characters, lowercase, and contain only valid characters (a-z, 0-9, _, -, .)"));
        }

        if (userRepository.existsByUsernameGlobal(username.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
        }

        User user = new User();
        user.setTenantId(request.getTenantId());
        user.setUsername(username.trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole("USER");
        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        System.out.println("[Login Debug] Login attempt for username: '" + request.getUsername() + "'");
        Optional<User> userOpt = userRepository.findByUsernameGlobal(request.getUsername());
        if (userOpt.isEmpty()) {
            System.out.println("[Login Debug] User not found in database: '" + request.getUsername() + "'");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        User user = userOpt.get();
        boolean passwordMatch = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
        System.out.println("[Login Debug] User found: '" + user.getUsername() + "', role: " + user.getRole() + ", active: " + user.isActive());
        System.out.println("[Login Debug] Password match result: " + passwordMatch);
        
        if (!passwordMatch) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            System.out.println("[Login Debug] Spring Security authenticationManager.authenticate successful");
        } catch (Exception e) {
            System.out.println("[Login Debug] Spring Security authenticationManager.authenticate failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication failed: " + e.getMessage());
        }

        RobotrixUserDetails userDetails = new RobotrixUserDetails(user);
        String token = jwtService.generateToken(userDetails);

        String hospitalName = null;
        if (user.getTenantId() != null) {
            Optional<Tenant> tenantOpt = tenantRepository.findById(user.getTenantId());
            if (tenantOpt.isPresent()) {
                Tenant tenant = tenantOpt.get();
                if (!tenant.isEffectivelyActive()) {
                    String reason = !tenant.isActive() 
                        ? "Your hospital account is currently inactive. Please contact the administrator."
                        : "Your hospital subscription has expired. Please contact the administrator to renew.";
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(reason);
                }
                hospitalName = tenant.getName();
            }
        }

        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getTenantId(), hospitalName));
    }

    @Data
    public static class TenantRegisterRequest {
        private String tenantName;
        private String username;
        private String password;
    }

    @Data
    public static class UserRegisterRequest {
        private UUID tenantId;
        private String username;
        private String password;
    }

    @Data
    public static class LoginRequest {
        private String tenantName;
        private String username;
        private String password;
    }

    @Data
    public static class AuthResponse {
        private final String token;
        private final String username;
        private final UUID tenantId;
        private final String hospitalName;
    }
}
