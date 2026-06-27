package com.robotrix.repository;

import com.robotrix.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findByName(String name);
    Optional<Tenant> findByHid(String hid);

    @Query(
        value = "SELECT * FROM tenants t WHERE " +
        "CAST(:search AS text) IS NULL OR LOWER(t.name) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')) " +
        "OR LOWER(t.hid) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%'))",
        countQuery = "SELECT COUNT(*) FROM tenants t WHERE " +
        "CAST(:search AS text) IS NULL OR LOWER(t.name) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')) " +
        "OR LOWER(t.hid) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%'))",
        nativeQuery = true
    )
    Page<Tenant> searchTenants(
        @Param("search") String search,
        Pageable pageable
    );
}
