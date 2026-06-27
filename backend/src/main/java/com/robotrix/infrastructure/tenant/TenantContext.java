package com.robotrix.infrastructure.tenant;

import java.util.UUID;

public final class TenantContext {

    private static final ThreadLocal<UUID> TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> SUPER_ADMIN = ThreadLocal.withInitial(() -> Boolean.FALSE);

    private TenantContext() {}

    public static UUID get() {
        return TENANT_ID.get();
    }

    public static void set(UUID id) {
        TENANT_ID.set(id);
    }

    public static boolean isSuperAdmin() {
        return Boolean.TRUE.equals(SUPER_ADMIN.get());
    }

    public static void setSuperAdmin(boolean superAdmin) {
        SUPER_ADMIN.set(superAdmin);
    }

    public static UUID require() {
        UUID id = TENANT_ID.get();
        if (id == null) {
            throw new IllegalStateException("No tenant in context. This operation requires a tenant-scoped user.");
        }
        return id;
    }

    public static void clear() {
        TENANT_ID.remove();
        SUPER_ADMIN.remove();
    }
}
