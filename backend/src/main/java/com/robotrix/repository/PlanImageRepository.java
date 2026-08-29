package com.robotrix.repository;

import com.robotrix.model.PlanImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlanImageRepository extends JpaRepository<PlanImage, Long> {
    Optional<PlanImage> findByPlanIdAndImageType(Long planId, String imageType);
    List<PlanImage> findByS3KeyIsNull();
    List<PlanImage> findByPlanId(Long planId);
}
