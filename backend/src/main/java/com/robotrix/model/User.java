package com.robotrix.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "users",
    uniqueConstraints = @UniqueConstraint(columnNames = {"username"})
)
@Data
@EqualsAndHashCode(callSuper = true)
public class User extends TenantScopedEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role; // e.g. "USER", "ADMIN"

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
