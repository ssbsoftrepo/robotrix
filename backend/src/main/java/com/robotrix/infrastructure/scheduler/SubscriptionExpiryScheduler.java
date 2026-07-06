package com.robotrix.infrastructure.scheduler;

import com.robotrix.model.Tenant;
import com.robotrix.repository.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled task that runs daily to auto-deactivate hospitals
 * whose 1-year subscription has expired.
 *
 * This is the enforcement mechanism for the subscription lifecycle.
 * Even between cron runs, the TenantResolutionFilter uses
 * isEffectivelyActive() to block expired tenants in real-time.
 */
@Component
public class SubscriptionExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionExpiryScheduler.class);

    @Autowired
    private TenantRepository tenantRepository;

    /**
     * Runs daily at midnight server time.
     * Finds all tenants that are still active but whose subscription
     * has expired, and deactivates them.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void deactivateExpiredHospitals() {
        LocalDateTime now = LocalDateTime.now();
        List<Tenant> expiredTenants = tenantRepository.findExpiredActiveTenants(now);

        if (expiredTenants.isEmpty()) {
            log.info("Subscription expiry check: No expired hospitals found.");
            return;
        }

        log.info("Subscription expiry check: Found {} hospital(s) with expired subscriptions.", expiredTenants.size());

        for (Tenant tenant : expiredTenants) {
            tenant.setActive(false);
            tenantRepository.save(tenant);
            log.info("Auto-deactivated hospital '{}' (HID: {}) — subscription expired at {}",
                    tenant.getName(), tenant.getHid(), tenant.getSubscriptionExpiresAt());
        }

        log.info("Subscription expiry check complete. Deactivated {} hospital(s).", expiredTenants.size());
    }
}
