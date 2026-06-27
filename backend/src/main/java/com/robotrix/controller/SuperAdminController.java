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
        
        tenantRepository.save(tenant);

        // Create Hospital Admin for this Tenant
        User admin = new User();
        admin.setTenantId(tenant.getId());
        admin.setUsername(request.getAdminUsername());
        admin.setPasswordHash(passwordEncoder.encode(request.getAdminPassword()));
        admin.setMobileNumber(request.getAdminMobileNumber());
        admin.setRole("HOSPITAL_ADMIN");
        userRepository.save(admin);

        return ResponseEntity.status(HttpStatus.CREATED).body(new HospitalCreateResponse(tenant.getId(), admin.getUsername()));
    }

    @GetMapping("/hospitals")
    public ResponseEntity<?> getHospitals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        
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
            userRepository.findHospitalAdminByTenantId(tenant.getId())
                .ifPresent(user -> {
                    dto.setAdminName(user.getUsername());
                    dto.setAdminMobileNumber(user.getMobileNumber());
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
        
        // Update admin mobile number
        java.util.Optional<User> adminOpt = userRepository.findHospitalAdminByTenantId(id);
        if (adminOpt.isPresent()) {
            User admin = adminOpt.get();
            if (request.getAdminMobileNumber() != null) {
                admin.setMobileNumber(request.getAdminMobileNumber().trim());
            }
            userRepository.save(admin);
        }

        // Update active status
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

    @Data
    public static class HospitalDto {
        private UUID id;
        private String hid;
        private String name;
        private String adminName;
        private String adminMobileNumber;
        private boolean active;
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
    }

    @Data
    public static class HospitalUpdateRequest {
        private String hospitalName;
        private String adminMobileNumber;
        private Boolean active;
    }

    @Data
    public static class HospitalCreateResponse {
        private final UUID tenantId;
        private final String adminUsername;
    }
}
