package com.robotrix.controller;

import com.robotrix.model.Patient;
import com.robotrix.model.PlanImage;
import com.robotrix.model.SurgeryPlan;
import com.robotrix.repository.PatientRepository;
import com.robotrix.repository.PlanImageRepository;
import com.robotrix.repository.SurgeryPlanRepository;
import com.robotrix.security.RobotrixUserDetails;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@PreAuthorize("hasRole('DOCTOR')")
@CrossOrigin(origins = "*")
public class SurgeryController {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private SurgeryPlanRepository surgeryPlanRepository;

    @Autowired
    private PlanImageRepository planImageRepository;

    // 1. Get User's Patients (Tenant and User scoped)
    @GetMapping("/patients")
    public ResponseEntity<List<Patient>> getPatients(@AuthenticationPrincipal RobotrixUserDetails principal) {
        List<Patient> patients = patientRepository.findByUserId(principal.getId());
        return ResponseEntity.ok(patients);
    }

    // 2. Create Patient (Assigned to active tenant/user)
    @PostMapping("/patients")
    public ResponseEntity<?> createPatient(
            @RequestBody PatientDto patientDto,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        
        long count = patientRepository.countByTenantIdGlobal(principal.getTenantId());
        String pid = String.format("PID-%04d", count + 1);
        
        Patient patient = new Patient();
        patient.setTenantId(principal.getTenantId());
        patient.setUser(principal.getUserEntity());
        patient.setPid(pid);
        patient.setName(patientDto.getName());
        patient.setAge(patientDto.getAge());
        patient.setGender(patientDto.getGender());
        
        patientRepository.save(patient);
        return ResponseEntity.status(HttpStatus.CREATED).body(patient);
    }

    // 3. Save Plan and upload binary image BLOB
    @PostMapping(value = "/plans", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @Transactional
    public ResponseEntity<?> savePlan(
            @RequestParam("patientId") Long patientId,
            @RequestParam("legSide") String legSide,
            @RequestParam("caseDataJson") String caseDataJson,
            @RequestParam(value = "imageType", required = false) String imageType,
            @RequestPart(value = "image", required = false) MultipartFile imageFile,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        try {
            Patient patient = patientRepository.findById(patientId)
                    .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

            // Check if patient belongs to the same user
            if (!patient.getUser().getId().equals(principal.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Unauthorized access to this patient");
            }

            SurgeryPlan plan = new SurgeryPlan();
            plan.setTenantId(principal.getTenantId());
            plan.setPatient(patient);
            plan.setUser(principal.getUserEntity());
            plan.setLegSide(legSide);
            plan.setCaseData(caseDataJson);
            
            surgeryPlanRepository.save(plan);

            if (imageFile != null && !imageFile.isEmpty()) {
                PlanImage planImage = new PlanImage();
                planImage.setTenantId(principal.getTenantId());
                planImage.setPlan(plan);
                planImage.setImageType(imageType != null ? imageType : "original");
                planImage.setMimeType(imageFile.getContentType());
                planImage.setImageData(imageFile.getBytes());
                
                planImageRepository.save(planImage);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(plan.getId());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error saving plan: " + e.getMessage());
        }
    }

    // 4. Download Binary Image
    @GetMapping("/images/{planId}/{imageType}")
    public ResponseEntity<byte[]> getPlanImage(
            @PathVariable Long planId, 
            @PathVariable String imageType,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        
        Optional<PlanImage> planImageOpt = planImageRepository.findByPlanIdAndImageType(planId, imageType);
        if (planImageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        PlanImage planImage = planImageOpt.get();
        // Row level check: Make sure image belongs to user's tenant
        if (!planImage.getTenantId().equals(principal.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(planImage.getMimeType()))
                .body(planImage.getImageData());
    }

    // 5. Get Plans for Patient
    @GetMapping("/patients/{patientId}/plans")
    public ResponseEntity<List<SurgeryPlan>> getPlansForPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        
        List<SurgeryPlan> plans = surgeryPlanRepository.findByPatientId(patientId);
        // Verify tenant mapping
        if (!plans.isEmpty() && !plans.get(0).getTenantId().equals(principal.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(plans);
    }

    // 6. Get Plan details (caseData json string)
    @GetMapping("/plans/{planId}")
    public ResponseEntity<?> getPlanDetails(
            @PathVariable Long planId,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        
        Optional<SurgeryPlan> planOpt = surgeryPlanRepository.findById(planId);
        if (planOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SurgeryPlan plan = planOpt.get();
        if (!plan.getTenantId().equals(principal.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(plan.getCaseData());
    }

    @Data
    public static class PatientDto {
        private String name;
        private Integer age;
        private String gender;
    }
}
