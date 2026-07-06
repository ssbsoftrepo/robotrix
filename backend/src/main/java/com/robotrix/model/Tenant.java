package com.robotrix.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenants")
@Data
public class Tenant {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String hid;

    private boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "subscription_expires_at")
    private LocalDateTime subscriptionExpiresAt;

    @Column(name = "last_renewed_at")
    private LocalDateTime lastRenewedAt;

    /**
     * A hospital is effectively operational only when it is both
     * manually active AND its subscription has not expired.
     * This is the single source of truth for "can this hospital operate?".
     */
    public boolean isEffectivelyActive() {
        return active && subscriptionExpiresAt != null
                && subscriptionExpiresAt.isAfter(LocalDateTime.now());
    }
}
