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
}
