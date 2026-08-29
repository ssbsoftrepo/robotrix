package com.robotrix.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.Comparator;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    private final Path rootLocation;

    public LocalStorageService(@Value("${app.storage.local-dir:./uploads}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
            log.info("Initialized local disk image storage directory at: {}", this.rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize local storage folder: " + uploadDir, e);
        }
    }

    @Override
    public String uploadImage(UUID tenantId, Long planId, String imageType, String mimeType, byte[] data) {
        String tenantStr = tenantId != null ? tenantId.toString() : "global";
        String relativeKey = String.format("tenants/%s/plans/%d/%s", tenantStr, planId, imageType);

        try {
            Path destinationFile = this.rootLocation.resolve(relativeKey).normalize();
            if (!destinationFile.startsWith(this.rootLocation)) {
                throw new SecurityException("Cannot store file outside current storage directory.");
            }
            if (destinationFile.getParent() != null) {
                Files.createDirectories(destinationFile.getParent());
            }
            Files.write(destinationFile, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("Successfully stored image locally: {}", destinationFile);
            return relativeKey;
        } catch (IOException e) {
            log.error("Failed to store image locally at relative path {}: {}", relativeKey, e.getMessage(), e);
            throw new RuntimeException("Failed to store image on local disk: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] downloadImage(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return null;
        }
        try {
            Path file = this.rootLocation.resolve(storageKey).normalize();
            if (Files.exists(file) && Files.isReadable(file)) {
                return Files.readAllBytes(file);
            } else {
                log.warn("Local storage image file not found: {}", file);
                return null;
            }
        } catch (IOException e) {
            log.error("Failed to read local image file {}: {}", storageKey, e.getMessage(), e);
            throw new RuntimeException("Failed to read local image: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteObject(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) return;
        try {
            Path file = this.rootLocation.resolve(storageKey).normalize();
            Files.deleteIfExists(file);
            log.info("Deleted local image file: {}", file);
        } catch (IOException e) {
            log.error("Failed to delete local image {}: {}", storageKey, e.getMessage(), e);
        }
    }

    @Override
    public void deletePlanDirectory(UUID tenantId, Long planId) {
        String tenantStr = tenantId != null ? tenantId.toString() : "global";
        Path dir = this.rootLocation.resolve(String.format("tenants/%s/plans/%d", tenantStr, planId)).normalize();
        if (Files.exists(dir)) {
            try (Stream<Path> walk = Files.walk(dir)) {
                walk.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ignored) {}
                    });
                log.info("Deleted local plan image directory: {}", dir);
            } catch (IOException e) {
                log.error("Failed to delete local plan directory {}: {}", dir, e.getMessage(), e);
            }
        }
    }
}
