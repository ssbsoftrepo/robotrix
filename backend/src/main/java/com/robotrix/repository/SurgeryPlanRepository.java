package com.robotrix.repository;

import com.robotrix.model.SurgeryPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SurgeryPlanRepository extends JpaRepository<SurgeryPlan, Long> {
    List<SurgeryPlan> findByUserId(Long userId);
    List<SurgeryPlan> findByPatientId(Long patientId);
}
