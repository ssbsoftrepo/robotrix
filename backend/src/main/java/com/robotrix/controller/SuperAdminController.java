package com.robotrix.controller;

import com.robotrix.model.Tenant;
import com.robotrix.model.User;
import com.robotrix.repository.TenantRepository;
import com.robotrix.repository.UserRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@RestController
@RequestMapping("/api/superadmin")
@PreAuthorize("hasRole('SUPERADMIN')")
@CrossOrigin(origins = "*")
public class SuperAdminController {

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/hospitals")
    public ResponseEntity<?> createHospital(@RequestBody HospitalCreateRequest request) {
        if (tenantRepository.findByName(request.getHospitalName()).isPresent()) {
            return ResponseEntity.badRequest().body("Hospital already exists");
        }

        if (request.getAdminEmail() == null || request.getAdminEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Admin email is mandatory");
        }

        if (userRepository.findByEmailGlobal(request.getAdminEmail().trim()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        // Create Tenant
        Tenant tenant = new Tenant();
        tenant.setName(request.getHospitalName());
        
        // Generate HID-0001 style sequential ID
        long nextId = tenantRepository.count() + 1;
        String hid = String.format("HID-%04d", nextId);
        while (tenantRepository.findByHid(hid).isPresent()) {
            nextId++;
            hid = String.format("HID-%04d", nextId);
        }
        tenant.setHid(hid);

        // Set subscription: 1 year from now
        tenant.setSubscriptionExpiresAt(LocalDateTime.now().plusYears(1));
        
        tenantRepository.save(tenant);

        // Create Hospital Admin for this Tenant
        User admin = new User();
        admin.setTenantId(tenant.getId());
        admin.setUsername(request.getAdminUsername());
        admin.setPasswordHash(passwordEncoder.encode(request.getAdminPassword()));
        admin.setMobileNumber(request.getAdminMobileNumber());
        admin.setEmail(request.getAdminEmail().trim());
        admin.setRole("HOSPITAL_ADMIN");
        userRepository.save(admin);

        return ResponseEntity.status(HttpStatus.CREATED).body(new HospitalCreateResponse(tenant.getId(), admin.getUsername()));
    }

    @GetMapping("/hospitals")
    public ResponseEntity<?> getHospitals(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search) {
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Tenant> tenantPage = tenantRepository.searchTenants(
                search == null || search.trim().isEmpty() ? null : search.trim(),
                pageable
        );
        
        java.util.List<HospitalDto> dtoList = tenantPage.getContent().stream().map(tenant -> {
            HospitalDto dto = new HospitalDto();
            dto.setId(tenant.getId());
            dto.setHid(tenant.getHid());
            dto.setName(tenant.getName());
            dto.setActive(tenant.isActive());
            dto.setSubscriptionExpiresAt(tenant.getSubscriptionExpiresAt());
            dto.setLastRenewedAt(tenant.getLastRenewedAt());
            dto.setSubscriptionStatus(computeSubscriptionStatus(tenant));
            userRepository.findHospitalAdminByTenantId(tenant.getId())
                .ifPresent(user -> {
                    dto.setAdminName(user.getUsername());
                    dto.setAdminMobileNumber(user.getMobileNumber());
                    dto.setAdminEmail(user.getEmail());
                });
            return dto;
        }).collect(java.util.stream.Collectors.toList());
        
        PaginatedHospitalResponse response = new PaginatedHospitalResponse();
        response.setContent(dtoList);
        response.setTotalElements(tenantPage.getTotalElements());
        response.setTotalPages(tenantPage.getTotalPages());
        response.setCurrentPage(tenantPage.getNumber());
        response.setSize(tenantPage.getSize());
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/hospitals/{id}")
    public ResponseEntity<?> updateHospital(@PathVariable("id") UUID id, @RequestBody HospitalUpdateRequest request) {
        java.util.Optional<Tenant> tenantOpt = tenantRepository.findById(id);
        if (tenantOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Tenant tenant = tenantOpt.get();
        
        // If hospital name is changed, check uniqueness
        if (request.getHospitalName() != null && !request.getHospitalName().trim().isEmpty() && !request.getHospitalName().equals(tenant.getName())) {
            java.util.Optional<Tenant> existing = tenantRepository.findByName(request.getHospitalName().trim());
            if (existing.isPresent()) {
                return ResponseEntity.badRequest().body("Hospital name already exists");
            }
            tenant.setName(request.getHospitalName().trim());
            tenantRepository.save(tenant);
        }
        
        // Update admin mobile number & email
        java.util.Optional<User> adminOpt = userRepository.findHospitalAdminByTenantId(id);
        if (adminOpt.isPresent()) {
            User admin = adminOpt.get();
            if (request.getAdminMobileNumber() != null) {
                admin.setMobileNumber(request.getAdminMobileNumber().trim());
            }
            if (request.getAdminEmail() != null) {
                String newEmail = request.getAdminEmail().trim();
                if (newEmail.isEmpty()) {
                    return ResponseEntity.badRequest().body("Admin email is mandatory");
                }
                java.util.Optional<User> existingUserWithEmail = userRepository.findByEmailGlobal(newEmail);
                if (existingUserWithEmail.isPresent() && !existingUserWithEmail.get().getId().equals(admin.getId())) {
                    return ResponseEntity.badRequest().body("Email already exists");
                }
                admin.setEmail(newEmail);
            }
            userRepository.save(admin);
        }

        // Update active status (manual toggle — does NOT affect subscription timer)
        if (request.getActive() != null) {
            tenant.setActive(request.getActive());
            tenantRepository.save(tenant);
        }
        
        java.util.Map<String, String> responseMap = new java.util.HashMap<>();
        responseMap.put("message", "Hospital updated successfully");
        return ResponseEntity.ok(responseMap);
    }

    @PostMapping("/hospitals/{id}/toggle")
    public ResponseEntity<?> toggleHospital(@PathVariable("id") UUID id) {
        java.util.Optional<Tenant> tenantOpt = tenantRepository.findById(id);
        if (tenantOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Tenant tenant = tenantOpt.get();
        tenant.setActive(!tenant.isActive());
        tenantRepository.save(tenant);
        return ResponseEntity.ok(tenant);
    }

    /**
     * Renew a hospital's subscription for another year from TODAY.
     * This also re-activates the hospital if it was auto-deactivated due to expiry.
     * Manual deactivation is separate — if admin manually disabled it AND subscription
     * expired, renewal re-enables it (the assumption being: payment was made, hospital
     * should be operational).
     */
    @PostMapping("/hospitals/{id}/renew")
    public ResponseEntity<?> renewSubscription(@PathVariable("id") UUID id) {
        java.util.Optional<Tenant> tenantOpt = tenantRepository.findById(id);
        if (tenantOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Tenant tenant = tenantOpt.get();
        LocalDateTime now = LocalDateTime.now();

        tenant.setSubscriptionExpiresAt(now.plusYears(1));
        tenant.setLastRenewedAt(now);
        tenant.setActive(true); // Re-enable if it was deactivated (by expiry or manually)
        tenantRepository.save(tenant);

        java.util.Map<String, Object> responseMap = new java.util.HashMap<>();
        responseMap.put("message", "Subscription renewed successfully for 1 year");
        responseMap.put("expiresAt", tenant.getSubscriptionExpiresAt().toString());
        return ResponseEntity.ok(responseMap);
    }

    /**
     * Computes a human-readable subscription status for display purposes.
     * - EXPIRED: subscription_expires_at is in the past
     * - EXPIRING_SOON: less than 30 days remaining
     * - ACTIVE: more than 30 days remaining
     */
    private String computeSubscriptionStatus(Tenant tenant) {
        if (tenant.getSubscriptionExpiresAt() == null) {
            return "EXPIRED";
        }
        LocalDateTime now = LocalDateTime.now();
        if (tenant.getSubscriptionExpiresAt().isBefore(now) || tenant.getSubscriptionExpiresAt().isEqual(now)) {
            return "EXPIRED";
        }
        long daysRemaining = ChronoUnit.DAYS.between(now, tenant.getSubscriptionExpiresAt());
        if (daysRemaining <= 30) {
            return "EXPIRING_SOON";
        }
        return "ACTIVE";
    }

    @Data
    public static class HospitalDto {
        private UUID id;
        private String hid;
        private String name;
        private String adminName;
        private String adminMobileNumber;
        private String adminEmail;
        private boolean active;
        private LocalDateTime subscriptionExpiresAt;
        private LocalDateTime lastRenewedAt;
        private String subscriptionStatus; // "ACTIVE", "EXPIRING_SOON", "EXPIRED"
    }

    @Data
    public static class PaginatedHospitalResponse {
        private java.util.List<HospitalDto> content;
        private long totalElements;
        private int totalPages;
        private int currentPage;
        private int size;
    }

    @Data
    public static class HospitalCreateRequest {
        private String hospitalName;
        private String adminUsername;
        private String adminPassword;
        private String adminMobileNumber;
        private String adminEmail;
    }

    @Data
    public static class HospitalUpdateRequest {
        private String hospitalName;
        private String adminMobileNumber;
        private String adminEmail;
        private Boolean active;
    }

    @Data
    public static class HospitalCreateResponse {
        private final UUID tenantId;
        private final String adminUsername;
    }
}
