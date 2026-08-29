package com.robotrix.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.util.List;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
public class S3StorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    @Value("${aws.s3.bucket-name:robotrix-medical-records}")
    private String bucketName;

    private final S3Client s3Client;

    public S3StorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String generateS3Key(UUID tenantId, Long planId, String imageType) {
        String tenantStr = tenantId != null ? tenantId.toString() : "global";
        return String.format("tenants/%s/plans/%d/%s", tenantStr, planId, imageType);
    }

    public String uploadImage(UUID tenantId, Long planId, String imageType, String mimeType, byte[] data) {
        String s3Key = generateS3Key(tenantId, planId, imageType);
        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(mimeType != null ? mimeType : "application/octet-stream")
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromBytes(data));
            log.info("Successfully uploaded image to S3: s3://{}/{}", bucketName, s3Key);
            return s3Key;
        } catch (Exception e) {
            log.error("Failed to upload image to S3: s3://{}/{}", bucketName, s3Key, e);
            throw new RuntimeException("Error uploading image to S3: " + e.getMessage(), e);
        }
    }

    public byte[] downloadImage(String s3Key) {
        try {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            return s3Client.getObjectAsBytes(getRequest).asByteArray();
        } catch (NoSuchKeyException e) {
            log.warn("S3 object not found: s3://{}/{}", bucketName, s3Key);
            return null;
        } catch (Exception e) {
            log.error("Failed to download image from S3: s3://{}/{}", bucketName, s3Key, e);
            throw new RuntimeException("Error downloading image from S3: " + e.getMessage(), e);
        }
    }

    public void deleteObject(String s3Key) {
        if (s3Key == null || s3Key.isBlank()) {
            return;
        }
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();
            s3Client.deleteObject(deleteRequest);
            log.info("Deleted image from S3: s3://{}/{}", bucketName, s3Key);
        } catch (Exception e) {
            log.error("Failed to delete S3 object: s3://{}/{}", bucketName, s3Key, e);
        }
    }

    public void deletePlanDirectory(UUID tenantId, Long planId) {
        String prefix = String.format("tenants/%s/plans/%d/", tenantId != null ? tenantId.toString() : "global", planId);
        try {
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            List<S3Object> objects = listResponse.contents();

            for (S3Object s3Object : objects) {
                deleteObject(s3Object.key());
            }
        } catch (Exception e) {
            log.error("Failed to delete directory from S3 for prefix: {}", prefix, e);
        }
    }
}
