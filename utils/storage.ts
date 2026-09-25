import { Patient, initialCaseData } from '../types';
import { api, isNetworkError } from '../services/api';
import { isOnline } from '../services/networkStatus';
import {
    cachePatients,
    getCachedPatients,
    addCachedPatient,
    removeCachedPatient,
    cachePlanMeta,
    getCachedPlanMeta,
    addCachedPlanMeta,
    cachePlanData,
    getCachedPlanData,
    cachePlanImage,
    getCachedPlanImage,
    addToSyncQueue,
    addOrReplaceSyncQueueItem,
    resolveId,
    type SyncQueueItem,
} from '../services/offlineDb';
import { generateSyncId, generateOfflineId } from '../services/syncQueue';

export interface PlanMetadata {
    id: string;
    patientId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    legSide?: 'left' | 'right';
}

export const savePatients = async (patients: Patient[]) => {
    // No-op: patients are managed and saved on the server database.
};

export const getPatients = async (): Promise<Patient[]> => {
    if (!isOnline()) {
        console.warn('[Offline] Loading patients from cache (fast)');
        return await getCachedPatients();
    }
    try {
        const response = await api.getPatients();
        if (Array.isArray(response)) {
            const patients = response.map((p: any) => {
                const nameParts = (p.name || '').trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                return {
                    id: String(p.id),
                    pid: p.pid || `PID-${String(p.id).padStart(4, '0')}`,
                    firstName,
                    lastName,
                    age: p.age ? String(p.age) : '',
                    gender: p.gender || 'Male',
                    date: p.createdAt ? p.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
                } as Patient;
            });
            // Cache the fresh server data for offline use
            await cachePatients(patients);
            return patients;
        }
        return [];
    } catch (e: any) {
        // On network error, fall back to cached data
        if (isNetworkError(e)) {
            console.warn('[Offline] Loading patients from cache');
            return await getCachedPatients();
        }
        console.error('Failed to load patients', e);
        return [];
    }
};

export const getNextPatientId = async (): Promise<string> => {
    return 'PID-????';
};

export const getNextPatientIdPreview = async (): Promise<string> => {
    return 'PID-????';
};

export const getPlansForPatient = async (patientId: string): Promise<PlanMetadata[]> => {
    if (!isOnline()) {
        console.warn(`[Offline] Loading plans for patient ${patientId} from cache (fast)`);
        return await getCachedPlanMeta(patientId);
    }
    try {
        // Resolve in case this is an offline temp ID that's been synced
        const resolvedId = await resolveId(patientId);
        const serverPlans = await api.getPlansForPatient(resolvedId);
        if (Array.isArray(serverPlans)) {
            const plans = serverPlans.map((sp: any) => {
                let caseDataObj: any = {};
                try {
                    caseDataObj = typeof sp.caseData === 'string' ? JSON.parse(sp.caseData) : sp.caseData;
                } catch (e) {
                    console.error('Failed to parse caseData from server plan', e);
                }
                const planId = String(sp.id);
                const planName = caseDataObj.planName || `Plan ${sp.id}`;
                return {
                    id: planId,
                    patientId,
                    name: planName,
                    createdAt: sp.createdAt || new Date().toISOString(),
                    updatedAt: sp.updatedAt || new Date().toISOString(),
                    legSide: sp.legSide || 'left'
                } as PlanMetadata;
            });
            // Cache for offline use
            await cachePlanMeta(patientId, plans);
            return plans;
        }
        return [];
    } catch (e: any) {
        if (isNetworkError(e)) {
            console.warn(`[Offline] Loading plans for patient ${patientId} from cache`);
            return await getCachedPlanMeta(patientId);
        }
        console.error(`Failed to load plans for patient ${patientId}`, e);
        return [];
    }
};

export const createNewPlan = async (patientId: string, legSide: 'left' | 'right'): Promise<string> => {
    const name = legSide === 'left' ? 'Left Leg' : 'Right Leg';
    const initialData = {
        ...initialCaseData,
        planName: name,
        legSide,
    };

    if (isOnline()) {
        try {
            const resolvedPatientId = await resolveId(patientId);
            const formData = new FormData();
            formData.append('patientId', resolvedPatientId);
            formData.append('legSide', legSide);
            formData.append('caseDataJson', JSON.stringify(initialData));

            const response = await api.savePlan(formData);
            const planId = String(response);

            // Cache the new plan locally
            await cachePlanData(planId, initialData);
            await addCachedPlanMeta(patientId, {
                id: planId,
                patientId,
                name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                legSide,
            });

            return planId;
        } catch (e: any) {
            if (!isNetworkError(e)) throw e;
            // Fall through to offline creation
        }
    }

    // Offline: create with temp ID and queue for sync
    const tempPlanId = generateOfflineId();
    console.warn(`[Offline] Creating plan offline with temp ID: ${tempPlanId}`);

    await cachePlanData(tempPlanId, initialData);
    await addCachedPlanMeta(patientId, {
        id: tempPlanId,
        patientId,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        legSide,
    });

    await addToSyncQueue({
        id: generateSyncId(),
        type: 'CREATE_PLAN',
        payload: {
            patientId,
            legSide,
            caseDataJson: JSON.stringify(initialData),
        },
        tempId: tempPlanId,
        patientId,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
    });

    return tempPlanId;
};

export const updatePlanLegSide = async (patientId: string, planId: string, legSide: 'left' | 'right') => {
    // No-op because the auto-save effect will automatically sync updated legSide to DB.
};

const isBase64Image = (str: string) => typeof str === 'string' && str.startsWith('data:image');
const isDbImageRef = (str: string) => typeof str === 'string' && str.startsWith('dbimage:');

/**
 * Returns true if the image string can be rendered in an <img> tag.
 * Returns false for null, undefined, empty strings, and internal dbimage: references
 * that haven't been resolved yet (e.g. when offline and image is not cached).
 */
export const isDisplayableImage = (src: string | null | undefined): boolean => {
    if (!src) return false;
    if (isDbImageRef(src)) return false;
    return true;
};


const processForSave = async (data: any, files: { [key: string]: Blob }, path: string = ''): Promise<any> => {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
        return Promise.all(data.map((item, index) => processForSave(item, files, `${path}_${index}`)));
    }

    if (typeof data === 'object') {
        const newData: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                const currentPath = path ? `${path}_${key}` : key;

                if (typeof value === 'string' && isBase64Image(value)) {
                    try {
                        const res = await fetch(value);
                        const blob = await res.blob();
                        files[currentPath] = blob;
                        newData[key] = `dbimage:${currentPath}`;
                    } catch (e) {
                        console.error(`Failed to process base64 image at ${currentPath}`, e);
                        newData[key] = value;
                    }
                } else if (typeof value === 'object') {
                    newData[key] = await processForSave(value, files, currentPath);
                } else {
                    newData[key] = value;
                }
            }
        }
        return newData;
    }

    return data;
};

const processForLoad = async (data: any, planId: string): Promise<any> => {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
        return Promise.all(data.map(item => processForLoad(item, planId)));
    }

    if (typeof data === 'object') {
        const newData: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];

                if (typeof value === 'string' && isDbImageRef(value)) {
                    const imageType = value.replace('dbimage:', '');

                    // Try loading from cache first
                    const cachedBlob = await getCachedPlanImage(planId, imageType);
                    if (cachedBlob) {
                        newData[key] = await blobToBase64(cachedBlob);
                        continue;
                    }

                    // Try server
                    try {
                        const blob = await api.getPlanImage(planId, imageType);
                        if (blob instanceof Blob) {
                            // Cache the image blob for offline use
                            await cachePlanImage(planId, imageType, blob);
                            const base64 = await blobToBase64(blob);
                            newData[key] = base64;
                        } else {
                            // Preserve the dbimage: reference so auto-save doesn't destroy it
                            newData[key] = value;
                        }
                    } catch (e: any) {
                        if (isNetworkError(e)) {
                            console.warn(`[Offline] Image ${imageType} for plan ${planId} not cached, preserving reference`);
                        } else {
                            console.error(`Failed to load db image ${imageType} for plan ${planId}`, e);
                        }
                        // Preserve the dbimage: reference so auto-save doesn't destroy it
                        newData[key] = value;
                    }
                } else if (typeof value === 'object') {
                    newData[key] = await processForLoad(value, planId);
                } else {
                    newData[key] = value;
                }
            }
        }
        return newData;
    }

    return data;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const saveCaseData = async (id: string, caseData: any, patientId: string) => {
    try {
        const resolvedId = await resolveId(id);
        const resolvedPatientId = await resolveId(patientId);
        const files: { [key: string]: Blob } = {};
        const optimizedData = await processForSave(caseData, files);

        // Always save to local cache first (offline-first) under both IDs
        await cachePlanData(id, optimizedData);
        if (resolvedId !== id) {
            await cachePlanData(resolvedId, optimizedData);
        }

        // Cache extracted image blobs locally under both IDs
        for (const [key, blob] of Object.entries(files)) {
            await cachePlanImage(id, key, blob);
            if (resolvedId !== id) {
                await cachePlanImage(resolvedId, key, blob);
            }
        }

        if (isOnline()) {
            try {
                // Construct FormData to send to the backend
                const formData = new FormData();
                formData.append('patientId', resolvedPatientId);
                formData.append('legSide', caseData.legSide || 'left');
                formData.append('planId', resolvedId);
                formData.append('caseDataJson', JSON.stringify(optimizedData));

                // Append all the Blobs to the FormData
                for (const [key, blob] of Object.entries(files)) {
                    formData.append(key, blob, `${key}.png`);
                }

                await api.savePlan(formData);
                console.log(`Successfully saved case data and images to DB for plan ID ${resolvedId}`);
                return; // Success — no need to queue
            } catch (e: any) {
                if (!isNetworkError(e)) {
                    console.error(`Failed to save case data for ${id}`, e);
                    return; // Server error, don't queue
                }
                // Network error — fall through to queue
            }
        }

        // Offline or network error: queue for later sync (deduplicated per planId)
        console.warn(`[Offline] Queuing save for plan ${id}`);
        await addOrReplaceSyncQueueItem({
            id: generateSyncId(),
            type: 'SAVE_PLAN',
            payload: {
                planId: id,
                patientId,
                legSide: caseData.legSide || 'left',
                caseDataJson: JSON.stringify(optimizedData),
                imageKeys: Object.keys(files),
            },
            patientId,
            createdAt: Date.now(),
            retryCount: 0,
            status: 'pending',
        });
    } catch (e) {
        console.error(`Failed to save case data for ${id}`, e);
    }
};

export const loadCaseData = async (id: string): Promise<any | null> => {
    const resolvedId = await resolveId(id);

    // Try loading from server first when online
    if (isOnline()) {
        try {
            const caseData = await api.getPlanDetails(resolvedId);
            if (caseData) {
                const processed = await processForLoad(caseData, resolvedId);
                // Cache for offline use under both IDs
                await cachePlanData(id, caseData);
                if (resolvedId !== id) {
                    await cachePlanData(resolvedId, caseData);
                }
                return processed;
            }
        } catch (e: any) {
            if (!isNetworkError(e)) {
                console.error(`Failed to load case data for plan ${id}`, e);
            }
            // Fall through to cache
        }
    }

    // Offline (or server request failed): load from cache
    console.warn(`[Offline/Cache] Loading case data for plan ${id} (${resolvedId}) from cache`);
    const cachedData = (await getCachedPlanData(resolvedId)) ?? (await getCachedPlanData(id));
    if (cachedData) {
        return await processForLoad(cachedData, resolvedId || id);
    }
    return null;
};

export const clearCaseData = async (patientId: string) => {
    // No-op: we do not maintain case data locally.
};
