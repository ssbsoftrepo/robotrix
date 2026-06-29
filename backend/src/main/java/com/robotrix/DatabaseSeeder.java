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
        String hash = "$2a$10$n27IK0xeK8MWXpb2C0M.8.G5PMP68CDlL5NZtEy2PlMzXX.Km9kZe";
        String[] candidates = {"superadmin", "admin", "password", "superadmin123", "admin123", "robotrix", "robotrix123", "root", "plus", "plus123"};
        for (String c : candidates) {
            if (passwordEncoder.matches(c, hash)) {
                System.out.println("FOUND MATCH: " + c);
            }
        }

        java.util.Optional<User> superadminOpt = userRepository.findByUsernameGlobal("superadmin");
        if (superadminOpt.isPresent()) {
            User superadmin = superadminOpt.get();
            superadmin.setPasswordHash(passwordEncoder.encode("superadmin"));
            userRepository.save(superadmin);
            System.out.println("Superadmin password updated successfully in DatabaseSeeder");
        } else {
            User superadmin = new User();
            superadmin.setUsername("superadmin");
            superadmin.setPasswordHash(passwordEncoder.encode("superadmin"));
            superadmin.setRole("SUPERADMIN");
            superadmin.setActive(true);
            userRepository.save(superadmin);
            System.out.println("Superadmin user created successfully in DatabaseSeeder");
        }
    }
}
