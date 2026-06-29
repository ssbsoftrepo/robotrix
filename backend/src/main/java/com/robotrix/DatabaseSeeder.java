package com.robotrix;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Override
    public void run(String... args) {
        // No seeding required as initial superadmin is created via SQL migration
    }
}
