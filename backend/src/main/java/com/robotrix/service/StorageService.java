package com.robotrix.service;

import java.util.UUID;

public interface StorageService {

    String uploadImage(UUID tenantId, Long planId, String imageType, String mimeType, byte[] data);

    byte[] downloadImage(String storageKey);

    void deleteObject(String storageKey);

    void deletePlanDirectory(UUID tenantId, Long planId);
}
