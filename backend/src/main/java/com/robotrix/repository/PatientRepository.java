package com.robotrix.repository;

import com.robotrix.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    // Automatically filtered by tenant_id (via Hibernate Filter) and scoped by userId
    List<Patient> findByUserId(Long userId);

    List<Patient> findByTenantId(java.util.UUID tenantId);

    boolean existsByTenantIdAndPid(java.util.UUID tenantId, String pid);

    @Query(value = "SELECT COUNT(*) FROM patients WHERE tenant_id = :tenantId", nativeQuery = true)
    long countByTenantIdGlobal(@Param("tenantId") UUID tenantId);
}
