package com.robotrix.repository;

import com.robotrix.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Note: This query is automatically tenant-scoped by Hibernate filter if enabled
    Optional<User> findByUsername(String username);

    @Query(value = "SELECT * FROM users WHERE username = :username", nativeQuery = true)
    Optional<User> findByUsernameGlobal(@Param("username") String username);

    @Query(value = "SELECT EXISTS(SELECT 1 FROM users WHERE username = :username)", nativeQuery = true)
    boolean existsByUsernameGlobal(@Param("username") String username);

    @Query(value = "SELECT * FROM users WHERE tenant_id = :tenantId AND role = 'HOSPITAL_ADMIN' LIMIT 1", nativeQuery = true)
    Optional<User> findHospitalAdminByTenantId(@Param("tenantId") java.util.UUID tenantId);

    @Query("SELECT u FROM User u WHERE u.role = 'DOCTOR' AND (:search IS NULL OR :search = '' OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.mobileNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.consultantId) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<User> findDoctorsWithSearch(@Param("search") String search, org.springframework.data.domain.Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM users WHERE tenant_id = :tenantId AND role = 'DOCTOR'", nativeQuery = true)
    long countByTenantIdAndRoleNative(@Param("tenantId") java.util.UUID tenantId);

    @Query(value = "SELECT * FROM users WHERE tenant_id = :tenantId AND consultant_id = :consultantId LIMIT 1", nativeQuery = true)
    Optional<User> findByTenantIdAndConsultantIdNative(@Param("tenantId") java.util.UUID tenantId, @Param("consultantId") String consultantId);

    @Query(value = "SELECT * FROM users WHERE email = :email LIMIT 1", nativeQuery = true)
    Optional<User> findByEmailGlobal(@Param("email") String email);
}
