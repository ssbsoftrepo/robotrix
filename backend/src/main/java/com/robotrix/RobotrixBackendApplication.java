package com.robotrix;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@SpringBootApplication
@EnableAspectJAutoProxy
public class RobotrixBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(RobotrixBackendApplication.class, args);
    }
}
