package com.robotrix.aspect;

import com.robotrix.infrastructure.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Aspect
@Component
public class TenantFilterAspect {

    @PersistenceContext
    private EntityManager entityManager;

    @Before("execution(* com.robotrix.repository..*.*(..)) || execution(* com.robotrix.controller..*.*(..))")
    public void enableFilters() {
        try {
            Session session = entityManager.unwrap(Session.class);
            if (session != null && session.isOpen()) {
                UUID tenantId = TenantContext.get();
                if (tenantId != null) {
                    session.enableFilter("tenantFilter")
                           .setParameter("tenantId", tenantId);
                } else {
                    session.disableFilter("tenantFilter");
                }
            }
        } catch (Exception ignored) {}
    }
}
