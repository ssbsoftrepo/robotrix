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
        tenantRepository.save(tenant);

        // Create Hospital Admin for this Tenant
        User admin = new User();
        admin.setTenantId(tenant.getId());
        admin.setUsername(request.getAdminUsername());
        admin.setPasswordHash(passwordEncoder.encode(request.getAdminPassword()));
        admin.setRole("HOSPITAL_ADMIN");
        userRepository.save(admin);

        return ResponseEntity.status(HttpStatus.CREATED).body(new HospitalCreateResponse(tenant.getId(), admin.getUsername()));
    }

    @Data
    public static class HospitalCreateRequest {
        private String hospitalName;
        private String adminUsername;
        private String adminPassword;
    }

    @Data
    public static class HospitalCreateResponse {
        private final UUID tenantId;
        private final String adminUsername;
    }
}
