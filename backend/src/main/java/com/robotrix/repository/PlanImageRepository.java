package com.robotrix.repository;

import com.robotrix.model.PlanImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PlanImageRepository extends JpaRepository<PlanImage, Long> {
    Optional<PlanImage> findByPlanIdAndImageType(Long planId, String imageType);
}
