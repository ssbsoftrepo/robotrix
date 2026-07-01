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
import com.robotrix.model.TenantScopedEntity;
import java.util.UUID;

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

    private boolean isSameTenant(TenantScopedEntity entity, RobotrixUserDetails principal) {
        if (entity == null || principal == null) {
            return false;
        }
        UUID entityTenantId = entity.getTenantId();
        UUID principalTenantId = principal.getTenantId();
        if (entityTenantId == null || principalTenantId == null) {
            return false;
        }
        return entityTenantId.equals(principalTenantId);
    }

    private boolean isOwner(Patient patient, RobotrixUserDetails principal) {
        if (patient == null || principal == null) {
            return false;
        }
        return patient.getUser() != null && patient.getUser().getId().equals(principal.getId());
    }

    private boolean isOwner(SurgeryPlan plan, RobotrixUserDetails principal) {
        if (plan == null || principal == null) {
            return false;
        }
        return plan.getUser() != null && plan.getUser().getId().equals(principal.getId());
    }

    // 1. Get Hospital's Patients (Tenant-scoped, filtered by doctor)
    @GetMapping("/patients")
    public ResponseEntity<List<Patient>> getPatients(@AuthenticationPrincipal RobotrixUserDetails principal) {
        if (principal == null || principal.getTenantId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<Patient> patients = patientRepository.findByUserId(principal.getId());
        return ResponseEntity.ok(patients);
    }

    // 1b. Get Next PID for Hospital's Patients (Tenant-scoped)
    @GetMapping("/patients/next-pid")
    public ResponseEntity<?> getNextPid(@AuthenticationPrincipal RobotrixUserDetails principal) {
        if (principal == null || principal.getTenantId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
        }
        long nextId = patientRepository.countByTenantIdGlobal(principal.getTenantId()) + 1;
        String pid = String.format("PID-%04d", nextId);
        while (patientRepository.existsByTenantIdAndPid(principal.getTenantId(), pid)) {
            nextId++;
            pid = String.format("PID-%04d", nextId);
        }
        return ResponseEntity.ok(java.util.Map.of("pid", pid));
    }

    // 2. Create Patient (Assigned to active tenant/user)
    @PostMapping("/patients")
    public ResponseEntity<?> createPatient(
            @RequestBody PatientDto patientDto,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        if (principal == null || principal.getTenantId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
        }
        
        long nextId = patientRepository.countByTenantIdGlobal(principal.getTenantId()) + 1;
        String pid = String.format("PID-%04d", nextId);
        while (patientRepository.existsByTenantIdAndPid(principal.getTenantId(), pid)) {
            nextId++;
            pid = String.format("PID-%04d", nextId);
        }
        
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

    // 2b. Delete Patient (Enforces tenant scope and cascades to plans/images via database constraint)
    @DeleteMapping("/patients/{id}")
    @Transactional
    public ResponseEntity<?> deletePatient(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));
        if (!isSameTenant(patient, principal) || !isOwner(patient, principal)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
        }
        patientRepository.delete(patient);
        return ResponseEntity.ok(java.util.Map.of("message", "Patient deleted successfully"));
    }

    // 3. Save Plan and upload binary image BLOBs
    @PostMapping(value = "/plans", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @Transactional
    public ResponseEntity<?> savePlan(
            @RequestParam("patientId") Long patientId,
            @RequestParam("legSide") String legSide,
            @RequestParam("caseDataJson") String caseDataJson,
            @RequestParam(value = "planId", required = false) Long planId,
            org.springframework.web.multipart.MultipartHttpServletRequest request,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        try {
            Patient patient = patientRepository.findById(patientId)
                    .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

            // Check if patient belongs to the same tenant (hospital) and doctor
            if (!isSameTenant(patient, principal) || !isOwner(patient, principal)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Unauthorized access to this patient");
            }

            SurgeryPlan plan;
            if (planId != null) {
                plan = surgeryPlanRepository.findById(planId)
                        .orElseThrow(() -> new IllegalArgumentException("Plan not found"));
                if (!isSameTenant(plan, principal) || !isOwner(plan, principal)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
                }
                plan.setLegSide(legSide);
                plan.setCaseData(caseDataJson);
                plan.setUpdatedAt(java.time.LocalDateTime.now());
            } else {
                // Check if a plan with the same name already exists for this patient
                String newPlanName = "";
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(caseDataJson);
                    if (node.has("planName")) {
                        newPlanName = node.get("planName").asText().trim();
                    }
                } catch (Exception e) {
                    // Ignore
                }

                if (!newPlanName.isEmpty()) {
                    List<SurgeryPlan> existingPlans = surgeryPlanRepository.findByPatientId(patientId);
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    for (SurgeryPlan existingPlan : existingPlans) {
                        try {
                            com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(existingPlan.getCaseData());
                            if (node.has("planName")) {
                                String name = node.get("planName").asText().trim();
                                if (name.equalsIgnoreCase(newPlanName)) {
                                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                            .body("A plan with this name already exists for this patient.");
                                }
                            }
                        } catch (Exception e) {
                            // Ignore
                        }
                    }
                }

                plan = new SurgeryPlan();
                plan.setTenantId(principal.getTenantId());
                plan.setPatient(patient);
                plan.setUser(principal.getUserEntity());
                plan.setLegSide(legSide);
                plan.setCaseData(caseDataJson);
                plan.setCreatedAt(java.time.LocalDateTime.now());
                plan.setUpdatedAt(java.time.LocalDateTime.now());
            }
            
            surgeryPlanRepository.save(plan);

            // Handle dynamic image uploads
            java.util.Map<String, MultipartFile> fileMap = request.getFileMap();
            for (java.util.Map.Entry<String, MultipartFile> entry : fileMap.entrySet()) {
                String imageType = entry.getKey();
                MultipartFile imageFile = entry.getValue();
                
                if (imageFile != null && !imageFile.isEmpty()) {
                    // Check if an image with this type already exists for the plan
                    Optional<PlanImage> existingImageOpt = planImageRepository.findByPlanIdAndImageType(plan.getId(), imageType);
                    PlanImage planImage;
                    if (existingImageOpt.isPresent()) {
                        planImage = existingImageOpt.get();
                    } else {
                        planImage = new PlanImage();
                        planImage.setTenantId(principal != null ? principal.getTenantId() : null);
                        planImage.setPlan(plan);
                        planImage.setImageType(imageType);
                    }
                    planImage.setMimeType(imageFile.getContentType());
                    planImage.setImageData(imageFile.getBytes());
                    
                    planImageRepository.save(planImage);
                }
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
        
        Optional<SurgeryPlan> planOpt = surgeryPlanRepository.findById(planId);
        if (planOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SurgeryPlan plan = planOpt.get();
        if (!isSameTenant(plan, principal) || !isOwner(plan, principal)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<PlanImage> planImageOpt = planImageRepository.findByPlanIdAndImageType(planId, imageType);
        if (planImageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        PlanImage planImage = planImageOpt.get();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(planImage.getMimeType()))
                .body(planImage.getImageData());
    }

    // 5. Get Plans for Patient
    @GetMapping("/patients/{patientId}/plans")
    public ResponseEntity<List<SurgeryPlan>> getPlansForPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal RobotrixUserDetails principal) {
        
        Patient patient = patientRepository.findById(patientId)
                .orElse(null);
        if (patient == null) {
            return ResponseEntity.notFound().build();
        }
        if (!isSameTenant(patient, principal) || !isOwner(patient, principal)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<SurgeryPlan> plans = surgeryPlanRepository.findByPatientId(patientId);
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
        if (!isSameTenant(plan, principal) || !isOwner(plan, principal)) {
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
