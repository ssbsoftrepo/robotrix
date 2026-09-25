import { createStore, get, set, del, keys, clear } from 'idb-keyval';
import type { Patient } from '../types';
import type { PlanMetadata } from '../utils/storage';

// Dedicated IndexedDB database + store for Robotrix offline cache
const offlineStore = createStore('robotrix-offline', 'cache');

// ─── Per-user key namespacing ─────────────────────────────────────────
// Multiple doctors share the same tablet, so every cache key is prefixed
// with the logged-in user's username to prevent data leakage.

let _currentUser: string = '';

/**
 * Must be called on login (and on app startup if already logged in).
 * All cache read/writes use this username as a namespace prefix.
 */
export const setOfflineUser = (username: string): void => {
    _currentUser = username || '';
};

export const getOfflineUser = (): string => _currentUser;

const userKey = (key: string) => {
    if (!_currentUser) return key; // fallback — should not happen in production
    return `${_currentUser}:${key}`;
};

// ─── Key helpers ──────────────────────────────────────────────────────

const PATIENTS_KEY = 'patients';
const planMetaKey = (patientId: string) => `plan_meta:${patientId}`;
const planDataKey = (planId: string) => `plan_data:${planId}`;
const planImageKey = (planId: string, imageType: string) => `plan_image:${planId}:${imageType}`;
const SYNC_QUEUE_KEY = 'sync_queue';
const ID_MAP_KEY = 'id_map';

// ─── Patients ─────────────────────────────────────────────────────────

export const cachePatients = async (patients: Patient[]): Promise<void> => {
    await set(userKey(PATIENTS_KEY), patients, offlineStore);
};

export const getCachedPatients = async (): Promise<Patient[]> => {
    return (await get<Patient[]>(userKey(PATIENTS_KEY), offlineStore)) ?? [];
};

export const addCachedPatient = async (patient: Patient): Promise<void> => {
    const existing = await getCachedPatients();
    const idx = existing.findIndex(p => p.id === patient.id);
    if (idx !== -1) {
        existing[idx] = patient;
    } else {
        existing.push(patient);
    }
    await cachePatients(existing);
};

export const removeCachedPatient = async (patientId: string): Promise<void> => {
    const existing = await getCachedPatients();
    await cachePatients(existing.filter(p => p.id !== patientId));
};

// ─── Plan Metadata (list of plans per patient) ───────────────────────

export const cachePlanMeta = async (patientId: string, plans: PlanMetadata[]): Promise<void> => {
    await set(userKey(planMetaKey(patientId)), plans, offlineStore);
};

export const getCachedPlanMeta = async (patientId: string): Promise<PlanMetadata[]> => {
    let plans = await get<PlanMetadata[]>(userKey(planMetaKey(patientId)), offlineStore);
    if (plans && plans.length > 0) return plans;

    // Check if patientId resolves to a real ID
    const resolved = await resolveId(patientId);
    if (resolved !== patientId) {
        plans = await get<PlanMetadata[]>(userKey(planMetaKey(resolved)), offlineStore);
        if (plans && plans.length > 0) return plans;
    }

    // Reverse check: patientId is a real ID, look for temp ID
    const map = await getIdMap();
    for (const [tempId, realId] of Object.entries(map)) {
        if (realId === patientId) {
            plans = await get<PlanMetadata[]>(userKey(planMetaKey(tempId)), offlineStore);
            if (plans && plans.length > 0) return plans;
        }
    }

    return [];
};

export const addCachedPlanMeta = async (patientId: string, plan: PlanMetadata): Promise<void> => {
    const existing = await getCachedPlanMeta(patientId);
    const idx = existing.findIndex(p => p.id === plan.id);
    if (idx !== -1) {
        existing[idx] = plan;
    } else {
        existing.push(plan);
    }
    await cachePlanMeta(patientId, existing);

    // If patientId resolves to another ID, keep both in sync
    const resolved = await resolveId(patientId);
    if (resolved !== patientId) {
        await cachePlanMeta(resolved, existing);
    }
};

// ─── Plan Case Data (full JSON) ──────────────────────────────────────

export const cachePlanData = async (planId: string, data: any): Promise<void> => {
    await set(userKey(planDataKey(planId)), data, offlineStore);
};

export const getCachedPlanData = async (planId: string): Promise<any | null> => {
    // 1. Direct lookup
    let data = await get(userKey(planDataKey(planId)), offlineStore);
    if (data) return data;

    // 2. Check if planId is a temp ID that resolves to a real ID
    const resolved = await resolveId(planId);
    if (resolved !== planId) {
        data = await get(userKey(planDataKey(resolved)), offlineStore);
        if (data) return data;
    }

    // 3. Reverse check: planId is a real ID, look for temp ID
    const map = await getIdMap();
    for (const [tempId, realId] of Object.entries(map)) {
        if (realId === planId) {
            data = await get(userKey(planDataKey(tempId)), offlineStore);
            if (data) return data;
        }
    }

    return null;
};

// ─── Plan Images (Blobs) ─────────────────────────────────────────────

export const cachePlanImage = async (planId: string, imageType: string, blob: Blob): Promise<void> => {
    await set(userKey(planImageKey(planId, imageType)), blob, offlineStore);
};

export const getCachedPlanImage = async (planId: string, imageType: string): Promise<Blob | null> => {
    // 1. Direct lookup
    let blob = await get<Blob>(userKey(planImageKey(planId, imageType)), offlineStore);
    if (blob) return blob;

    // 2. Resolved ID lookup
    const resolved = await resolveId(planId);
    if (resolved !== planId) {
        blob = await get<Blob>(userKey(planImageKey(resolved, imageType)), offlineStore);
        if (blob) return blob;
    }

    // 3. Reverse check: planId is a real ID, look for temp ID
    const map = await getIdMap();
    for (const [tempId, realId] of Object.entries(map)) {
        if (realId === planId) {
            blob = await get<Blob>(userKey(planImageKey(tempId, imageType)), offlineStore);
            if (blob) return blob;
        }
    }

    return null;
};

export const renamePlanCache = async (oldPlanId: string, newPlanId: string): Promise<void> => {
    // Copy plan data to new ID
    const data = await getCachedPlanData(oldPlanId);
    if (data) {
        await cachePlanData(newPlanId, data);
        // Keep oldPlanId key intact as alias so in-memory React state can still read it
    }
    
    // Copy all plan images to new ID
    const allKeys = await keys(offlineStore);
    const prefix = userKey(`plan_image:${oldPlanId}:`);
    for (const key of allKeys) {
        const k = String(key);
        if (k.startsWith(prefix)) {
            const imageType = k.substring(prefix.length);
            const blob = await get<Blob>(key, offlineStore);
            if (blob) {
                await cachePlanImage(newPlanId, imageType, blob);
            }
            // Keep old key intact as alias
        }
    }
};

// ─── Sync Queue ──────────────────────────────────────────────────────

export interface SyncQueueItem {
    id: string;
    type: 'CREATE_PATIENT' | 'UPDATE_PATIENT' | 'SAVE_PLAN' | 'CREATE_PLAN' | 'DELETE_PATIENT';
    payload: any;
    tempId?: string;        // Temporary offline ID (for patient/plan creation)
    patientId?: string;     // For linking plan operations to their patient
    createdAt: number;
    retryCount: number;
    status: 'pending' | 'in_progress' | 'failed';
}

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
    return (await get<SyncQueueItem[]>(userKey(SYNC_QUEUE_KEY), offlineStore)) ?? [];
};

export const setSyncQueue = async (queue: SyncQueueItem[]): Promise<void> => {
    await set(userKey(SYNC_QUEUE_KEY), queue, offlineStore);
    const pendingCount = queue.filter(q => q.status === 'pending' || q.status === 'failed').length;
    window.dispatchEvent(new CustomEvent('robotrix-sync-queue-updated', { detail: pendingCount }));
};

export const addToSyncQueue = async (item: SyncQueueItem): Promise<void> => {
    const queue = await getSyncQueue();
    queue.push(item);
    await setSyncQueue(queue);
};

/**
 * Add to sync queue, but if a pending item of the same type and planId
 * already exists, replace it instead of adding a duplicate.
 * This prevents the auto-save debounce (fires every 1.5s) from flooding
 * the queue with hundreds of SAVE_PLAN entries for the same plan.
 */
export const addOrReplaceSyncQueueItem = async (item: SyncQueueItem): Promise<void> => {
    const queue = await getSyncQueue();

    if (item.type === 'SAVE_PLAN' && item.payload?.planId) {
        // Find and replace any existing pending SAVE_PLAN for the same planId
        const existingIdx = queue.findIndex(
            q => q.type === 'SAVE_PLAN' &&
                 q.status === 'pending' &&
                 q.payload?.planId === item.payload.planId
        );
        if (existingIdx !== -1) {
            queue[existingIdx] = item;
            await setSyncQueue(queue);
            return;
        }
    }

    queue.push(item);
    await setSyncQueue(queue);
};

export const removeFromSyncQueue = async (itemId: string): Promise<void> => {
    const queue = await getSyncQueue();
    await setSyncQueue(queue.filter(q => q.id !== itemId));
};

export const updateSyncQueueItem = async (itemId: string, updates: Partial<SyncQueueItem>): Promise<void> => {
    const queue = await getSyncQueue();
    const idx = queue.findIndex(q => q.id === itemId);
    if (idx !== -1) {
        queue[idx] = { ...queue[idx], ...updates };
        await setSyncQueue(queue);
    }
};

// ─── ID Map (offline temp IDs → real server IDs) ─────────────────────

export const getIdMap = async (): Promise<Record<string, string>> => {
    return (await get<Record<string, string>>(userKey(ID_MAP_KEY), offlineStore)) ?? {};
};

export const setIdMap = async (map: Record<string, string>): Promise<void> => {
    await set(userKey(ID_MAP_KEY), map, offlineStore);
};

export const addIdMapping = async (tempId: string, realId: string): Promise<void> => {
    const map = await getIdMap();
    map[tempId] = realId;
    await setIdMap(map);
};

/**
 * Resolve a possibly-temporary ID to a real server ID.
 * Returns the input unchanged if no mapping exists.
 */
export const resolveId = async (id: string): Promise<string> => {
    if (!id.startsWith('offline-')) return id;
    const map = await getIdMap();
    return map[id] ?? id;
};

// ─── Utilities ───────────────────────────────────────────────────────

export const getPendingSyncCount = async (): Promise<number> => {
    const queue = await getSyncQueue();
    return queue.filter(q => q.status === 'pending' || q.status === 'failed' || q.status === 'in_progress').length;
};

/**
 * Clear only this user's offline cache data (patients, plans, images).
 * Does NOT clear the sync queue — that is handled separately on logout.
 */
export const clearUserCache = async (): Promise<void> => {
    // We must iterate keys and delete only those belonging to the current user
    const allKeys = await keys(offlineStore);
    const prefix = _currentUser ? `${_currentUser}:` : '';
    for (const key of allKeys) {
        const k = String(key);
        if (prefix && k.startsWith(prefix)) {
            // Don't clear the sync queue — it needs to finish processing
            if (!k.endsWith(SYNC_QUEUE_KEY) && !k.endsWith(ID_MAP_KEY)) {
                await del(key, offlineStore);
            }
        }
    }
};

export const clearOfflineCache = async (): Promise<void> => {
    await clear(offlineStore);
};
