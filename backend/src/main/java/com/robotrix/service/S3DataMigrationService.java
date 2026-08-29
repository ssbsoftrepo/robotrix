package com.robotrix.service;

import com.robotrix.model.PlanImage;
import com.robotrix.repository.PlanImageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
public class S3DataMigrationService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(S3DataMigrationService.class);

    private final PlanImageRepository planImageRepository;
    private final S3StorageService s3StorageService;

    public S3DataMigrationService(PlanImageRepository planImageRepository, S3StorageService s3StorageService) {
        this.planImageRepository = planImageRepository;
        this.s3StorageService = s3StorageService;
    }

    @Override
    public void run(ApplicationArguments args) {
        migrateExistingBlobImagesToS3();
    }

    @Transactional
    public void migrateExistingBlobImagesToS3() {
        try {
            List<PlanImage> unmigratedImages = planImageRepository.findByS3KeyIsNull();
            if (unmigratedImages.isEmpty()) {
                log.info("S3 Migration: No unmigrated database images found.");
                return;
            }

            log.info("S3 Migration: Found {} images to migrate from PostgreSQL to AWS S3...", unmigratedImages.size());
            int successCount = 0;
            int failureCount = 0;

            for (PlanImage image : unmigratedImages) {
                if (image.getImageData() == null || image.getImageData().length == 0) {
                    continue;
                }

                try {
                    Long planId = image.getPlan() != null ? image.getPlan().getId() : 0L;
                    String s3Key = s3StorageService.uploadImage(
                            image.getTenantId(),
                            planId,
                            image.getImageType(),
                            image.getMimeType(),
                            image.getImageData()
                    );

                    image.setS3Key(s3Key);
                    // Nullify the raw binary blob in PostgreSQL once safely uploaded to S3 to save DB space
                    image.setImageData(null);
                    planImageRepository.save(image);
                    successCount++;
                } catch (Exception e) {
                    log.error("S3 Migration: Failed to migrate image ID {} (type: {}) to S3: {}",
                            image.getId(), image.getImageType(), e.getMessage());
                    failureCount++;
                }
            }

            log.info("S3 Migration Completed: {} succeeded, {} failed.", successCount, failureCount);
        } catch (Exception e) {
            log.warn("S3 Migration runner encountered an issue: {}. Will retry on next startup or manual trigger.", e.getMessage());
        }
    }
}
