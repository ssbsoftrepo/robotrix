import { api } from './api';
import { isOnline } from './networkStatus';
import {
    getSyncQueue,
    setSyncQueue,
    removeFromSyncQueue,
    updateSyncQueueItem,
    addIdMapping,
    resolveId,
    getIdMap,
    getCachedPlanData,
    getCachedPlanImage,
    addCachedPatient,
    renamePlanCache,
    type SyncQueueItem,
} from './offlineDb';

type SyncStatusCallback = (status: 'idle' | 'syncing' | 'error' | 'done', pendingCount: number, message?: string) => void;

let _statusCallback: SyncStatusCallback | null = null;
let _isSyncing = false;

/**
 * Register a callback that receives sync status updates.
 */
export const onSyncStatus = (cb: SyncStatusCallback) => {
    _statusCallback = cb;
};

const notify = (status: 'idle' | 'syncing' | 'error' | 'done', count: number, message?: string) => {
    if (_statusCallback) {
        try { _statusCallback(status, count, message); } catch { /* swallow */ }
    }
};

/**
 * Process the sync queue. Called when the device comes online.
 * Items are processed in FIFO order to preserve creation-before-mutation ordering.
 */
export const processSyncQueue = async (): Promise<void> => {
    if (_isSyncing) return;
    if (!isOnline()) return;

    _isSyncing = true;
    const queue = await getSyncQueue();
    const pending = queue.filter(q => q.status === 'pending' || q.status === 'failed');

    if (pending.length === 0) {
        _isSyncing = false;
        notify('idle', 0);
        return;
    }

    notify('syncing', pending.length);

    for (const item of pending) {
        if (!isOnline()) {
            // Lost connectivity mid-sync — stop and resume later
            _isSyncing = false;
            const remaining = (await getSyncQueue()).filter(q => q.status === 'pending' || q.status === 'failed').length;
            notify('idle', remaining);
            return;
        }

        try {
            await updateSyncQueueItem(item.id, { status: 'in_progress' });
            await processItem(item);
            await removeFromSyncQueue(item.id);

            const remaining = (await getSyncQueue()).filter(q => q.status === 'pending' || q.status === 'failed').length;
            notify('syncing', remaining);
        } catch (e: any) {
            console.error(`[SyncQueue] Failed to process item ${item.id} (${item.type}):`, e);
            const newRetryCount = item.retryCount + 1;
            if (newRetryCount >= 3) {
                await updateSyncQueueItem(item.id, { status: 'failed', retryCount: newRetryCount });
                notify('error', 0, `Failed to sync ${item.type}: ${e.message || 'Unknown error'}`);
            } else {
                await updateSyncQueueItem(item.id, { status: 'pending', retryCount: newRetryCount });
                // Exponential backoff: wait before next retry
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, newRetryCount) * 1000));
            }
        }
    }

    _isSyncing = false;
    const finalQueue = await getSyncQueue();
    const finalPending = finalQueue.filter(q => q.status === 'pending' || q.status === 'failed').length;
    notify(finalPending > 0 ? 'idle' : 'done', finalPending);
};

/**
 * Process a single sync queue item.
 */
const processItem = async (item: SyncQueueItem): Promise<void> => {
    switch (item.type) {
        case 'CREATE_PATIENT':
            await processCreatePatient(item);
            break;
        case 'UPDATE_PATIENT':
            await processUpdatePatient(item);
            break;
        case 'CREATE_PLAN':
            await processCreatePlan(item);
            break;
        case 'SAVE_PLAN':
            await processSavePlan(item);
            break;
        case 'DELETE_PATIENT':
            await processDeletePatient(item);
            break;
        default:
            console.warn(`[SyncQueue] Unknown item type: ${(item as any).type}`);
    }
};

/**
 * Sync a patient created offline → server, then store the real ID mapping.
 */
const processCreatePatient = async (item: SyncQueueItem): Promise<void> => {
    const { name, age, gender } = item.payload;
    const savedPatient = await api.createPatient({ name, age, gender });

    const realId = String(savedPatient.id);
    const tempId = item.tempId!;

    // Store the mapping so subsequent plan syncs use the real patient ID
    await addIdMapping(tempId, realId);

    // Update the cached patient with the real ID
    const nameParts = (savedPatient.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    await addCachedPatient({
        id: realId,
        pid: savedPatient.pid || `PID-${realId.padStart(4, '0')}`,
        firstName,
        lastName,
        age: savedPatient.age ? String(savedPatient.age) : '',
        gender: savedPatient.gender || 'Male',
        date: savedPatient.createdAt ? savedPatient.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    });

    // Also update any remaining queue items that reference this temp patient ID
    const queue = await getSyncQueue();
    let updated = false;
    for (const q of queue) {
        if (q.patientId === tempId) {
            q.patientId = realId;
            if (q.payload && q.payload.patientId === tempId) {
                q.payload.patientId = realId;
            }
            updated = true;
        }
    }
    if (updated) {
        await setSyncQueue(queue);
    }

    console.log(`[SyncQueue] Patient synced: ${tempId} → ${realId}`);
};

/**
 * Sync a patient update to the server.
 */
const processUpdatePatient = async (item: SyncQueueItem): Promise<void> => {
    const patientId = await resolveId(item.payload.id);
    if (patientId.startsWith('offline-')) {
        console.warn(`[SyncQueue] Cannot update offline-only patient ${patientId} without creating first.`);
        return;
    }
    const { name, age, gender } = item.payload;
    await api.updatePatient(patientId, { name, age, gender });
    console.log(`[SyncQueue] Patient updated: ${patientId}`);
};

/**
 * Sync a plan created offline → server, then store the real plan ID mapping.
 */
const processCreatePlan = async (item: SyncQueueItem): Promise<void> => {
    const patientId = await resolveId(item.patientId || item.payload.patientId);
    const { legSide, caseDataJson } = item.payload;

    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('legSide', legSide);
    formData.append('caseDataJson', caseDataJson);

    const response = await api.savePlan(formData);
    const realPlanId = String(response);
    const tempPlanId = item.tempId!;

    await addIdMapping(tempPlanId, realPlanId);
    await renamePlanCache(tempPlanId, realPlanId);

    // Update queue items referencing temp plan ID
    const queue = await getSyncQueue();
    let updated = false;
    for (const q of queue) {
        if (q.payload && q.payload.planId === tempPlanId) {
            q.payload.planId = realPlanId;
            updated = true;
        }
    }
    if (updated) {
        await setSyncQueue(queue);
    }

    console.log(`[SyncQueue] Plan synced: ${tempPlanId} → ${realPlanId}`);
};

/**
 * Sync a plan save (case data + images) to the server.
 */
const processSavePlan = async (item: SyncQueueItem): Promise<void> => {
    const planId = await resolveId(item.payload.planId);
    const patientId = await resolveId(item.payload.patientId);

    // Re-read the latest cached plan data (it may have been updated since queuing)
    const cachedData = await getCachedPlanData(planId) ?? await getCachedPlanData(item.payload.planId);

    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('legSide', item.payload.legSide || 'left');
    formData.append('planId', planId);
    formData.append('caseDataJson', item.payload.caseDataJson || JSON.stringify(cachedData));

    // Attach any cached images that were part of this save
    if (item.payload.imageKeys && Array.isArray(item.payload.imageKeys)) {
        for (const key of item.payload.imageKeys) {
            const blob = await getCachedPlanImage(item.payload.planId, key);
            if (blob) {
                formData.append(key, blob, `${key}.png`);
            }
        }
    }

    await api.savePlan(formData);
    console.log(`[SyncQueue] Plan data synced for planId: ${planId}`);
};

/**
 * Sync a patient deletion to the server.
 */
const processDeletePatient = async (item: SyncQueueItem): Promise<void> => {
    const patientId = await resolveId(item.payload.patientId);

    // If this was an offline-only patient that never made it to the server,
    // the ID won't resolve and we can skip the server call
    if (patientId.startsWith('offline-')) {
        console.log(`[SyncQueue] Skipping delete for offline-only patient: ${patientId}`);
        return;
    }

    await api.deletePatient(patientId);
    console.log(`[SyncQueue] Patient deleted on server: ${patientId}`);
};

/**
 * Generate a unique ID for a sync queue item.
 */
export const generateSyncId = (): string => {
    return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Generate a temporary offline ID for new entities.
 */
export const generateOfflineId = (): string => {
    return `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
