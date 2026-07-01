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
import com.robotrix.model.TenantScopedEntity;
import java.util.UUID;

@RestController
@RequestMapping("/api/hospitaladmin")
@PreAuthorize("hasRole('HOSPITAL_ADMIN')")
@CrossOrigin(origins = "*")
public class HospitalAdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private boolean isSameTenant(TenantScopedEntity entity, RobotrixUserDetails principal) {
        if (entity == null || principal == null) {
            return false;
        }
        UUID entityTenantId = entity.getTenantId();
        UUID principalTenantId = principal.getTenantId();
        if (entityTenantId == null || principalTenantId == null) {
            return false;
        }
        return entityTenantId.equals(principalTenantId);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(
            @RequestBody UserCreateRequest request,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        if (principal == null || principal.getTenantId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied: Missing tenant context"));
        }
        
        String username = request.getUsername();
        if (username == null || username.trim().length() < 4 || !username.trim().equals(username.trim().toLowerCase()) || !username.trim().matches("^[a-z0-9_.-]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username must be at least 4 characters, lowercase, and contain only valid characters (a-z, 0-9, _, -, .)"));
        }

        if (userRepository.existsByUsernameGlobal(username.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
        }

        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password is mandatory"));
        }

        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "First name is mandatory"));
        }

        if (request.getLastName() == null || request.getLastName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Last name is mandatory"));
        }

        if (request.getMobileNumber() == null || request.getMobileNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mobile number is mandatory"));
        }

        String mobile = request.getMobileNumber().replaceAll("\\D", "");
        if (mobile.length() != 10) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mobile number must be exactly 10 digits"));
        }

        // Scope new user to the logged-in Hospital Admin's tenant
        User doctor = new User();
        doctor.setTenantId(principal.getTenantId());
        doctor.setUsername(username.trim());
        doctor.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        doctor.setRole("DOCTOR");
        doctor.setActive(true);

        doctor.setFirstName(request.getFirstName().trim());
        doctor.setLastName(request.getLastName().trim());
        doctor.setMobileNumber(mobile);

        // Generate hospital-specific sequence for Consultant ID: CON-0001, CON-0002 etc.
        java.util.UUID tenantId = principal.getTenantId();
        long nextId = userRepository.countByTenantIdAndRoleNative(tenantId) + 1;
        String conId = String.format("CON-%04d", nextId);
        while (userRepository.findByTenantIdAndConsultantIdNative(tenantId, conId).isPresent()) {
            nextId++;
            conId = String.format("CON-%04d", nextId);
        }
        doctor.setConsultantId(conId);
        
        userRepository.save(doctor);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Consultant registered successfully", "consultantId", conId));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", defaultValue = "") String search,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        if (principal == null || principal.getTenantId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied: Missing tenant context"));
        }
        
        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<User> userPage = userRepository.findDoctorsWithSearch(search, pageRequest);
        
        java.util.List<UserDto> dtoList = userPage.getContent().stream().map(user -> {
            UserDto dto = new UserDto();
            dto.setId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setFirstName(user.getFirstName());
            dto.setLastName(user.getLastName());
            dto.setMobileNumber(user.getMobileNumber());
            dto.setConsultantId(user.getConsultantId());
            dto.setActive(user.isActive());
            dto.setCreatedAt(user.getCreatedAt());
            return dto;
        }).collect(java.util.stream.Collectors.toList());
        
        PaginatedUserResponse response = new PaginatedUserResponse();
        response.setContent(dtoList);
        response.setTotalElements(userPage.getTotalElements());
        response.setTotalPages(userPage.getTotalPages());
        response.setCurrentPage(userPage.getNumber());
        response.setSize(userPage.getSize());
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable("id") Long id,
            @RequestBody UserUpdateRequest request,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        
        java.util.Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = userOpt.get();
        if (!isSameTenant(user, principal)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied: User belongs to a different hospital"));
        }
        
        // Update first name, last name, mobile number, active status
        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "First name is mandatory"));
        }
        if (request.getLastName() == null || request.getLastName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Last name is mandatory"));
        }
        if (request.getMobileNumber() == null || request.getMobileNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mobile number is mandatory"));
        }

        String mobile = request.getMobileNumber().replaceAll("\\D", "");
        if (mobile.length() != 10) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mobile number must be exactly 10 digits"));
        }

        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setMobileNumber(mobile);

        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }
        
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "Consultant updated successfully"));
    }

    @Data
    public static class UserCreateRequest {
        private String username;
        private String password;
        private String firstName;
        private String lastName;
        private String mobileNumber;
    }

    @Data
    public static class UserUpdateRequest {
        private String firstName;
        private String lastName;
        private String mobileNumber;
        private Boolean active;
    }

    @Data
    public static class UserDto {
        private Long id;
        private String username;
        private String firstName;
        private String lastName;
        private String mobileNumber;
        private String consultantId;
        private boolean active;
        private java.time.LocalDateTime createdAt;
    }

    @Data
    public static class PaginatedUserResponse {
        private java.util.List<UserDto> content;
        private long totalElements;
        private int totalPages;
        private int currentPage;
        private int size;
    }
}
