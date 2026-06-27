package com.robotrix;

import com.robotrix.model.User;
import com.robotrix.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Platform-wide SuperAdmin has null tenantId
        if (userRepository.findByUsernameGlobal("superadmin").isEmpty()) {
            User superAdmin = new User();
            superAdmin.setUsername("superadmin");
            superAdmin.setPasswordHash(passwordEncoder.encode("admin@123"));
            superAdmin.setRole("SUPERADMIN");
            superAdmin.setTenantId(null);
            
            userRepository.save(superAdmin);
            System.out.println("--- ROBOTRIX BACKEND SEEDING ---");
            System.out.println("Platform SuperAdmin created successfully!");
            System.out.println("Username: superadmin");
            System.out.println("Password: admin@123");
            System.out.println("--------------------------------");
        }
    }
}
