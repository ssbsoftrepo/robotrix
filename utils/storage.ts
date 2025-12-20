
import { get, set, del } from 'idb-keyval';
import { Patient } from '../types';
import { saveImageToFilesystem, loadImageFromFilesystem, deleteImageFromFilesystem } from './filesystem';

const PATIENTS_KEY = 'cpakPatients';

export const savePatients = async (patients: Patient[]) => {
    try {
        await set(PATIENTS_KEY, patients);
    } catch (e) {
        console.error('Failed to save patients to IDB', e);
    }
};

// --- Plan Interfaces & Management ---

export interface PlanMetadata {
    id: string;
    patientId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

const PLAN_INDEX_PREFIX = 'patientPlans_';

export const getPlansForPatient = async (patientId: string): Promise<PlanMetadata[]> => {
    try {
        const plans = await get<PlanMetadata[]>(`${PLAN_INDEX_PREFIX}${patientId}`);
        if (plans && plans.length > 0) return plans;

        // Backward compatibility: Check if legacy caseData exists
        // If so, verify if it actually has meaningful data (optional, but good practice)
        // For now, if no plans exist, we check if there's a legacy case blob.
        const legacyData = await get(`caseData_${patientId}`);
        const lsLegacyData = localStorage.getItem(`caseData_${patientId}`);

        if ((legacyData || lsLegacyData) && (legacyData?.longLegImageSrc || legacyData?.valgusImageSrc || (lsLegacyData && (lsLegacyData.includes('longLegImageSrc') || lsLegacyData.includes('valgusImageSrc'))))) {
            // Virtual "Default Plan" - Only if it has actual images/data
            return [{
                id: `legacy_${patientId}`,
                patientId,
                name: 'Default Plan',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }];
        }

        return [];
    } catch (e) {
        console.error(`Failed to load plans for patient ${patientId}`, e);
        return [];
    }
};

export const createNewPlan = async (patientId: string, name: string): Promise<string> => {
    const planId = `plan_${Date.now()}`;
    const newPlan: PlanMetadata = {
        id: planId,
        patientId,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        const currentPlans = (await get<PlanMetadata[]>(`${PLAN_INDEX_PREFIX}${patientId}`)) || [];
        // If this is the first real plan being created, we should seemingly migrate the legacy plan if it exists
        // OR we just append this new one. If we append, the legacy one might be lost if we don't return it in getPlans.
        // Let's ensure if we are creating a new plan, we check and "solidify" the legacy plan if it exists?
        // Actually, getPlans returns a virtual one.
        // If we write to this array, next time getPlans is called, it returns what's in DB.
        // So we MUST include the virtual plan in the DB now if we are starting to save explicit plans.

        if (currentPlans.length === 0) {
            const legacyData = await get(`caseData_${patientId}`);
            const lsLegacyData = localStorage.getItem(`caseData_${patientId}`);
            if ((legacyData || lsLegacyData) && (legacyData?.longLegImageSrc || legacyData?.valgusImageSrc || (lsLegacyData && (lsLegacyData.includes('longLegImageSrc') || lsLegacyData.includes('valgusImageSrc'))))) {
                const legacyPlan: PlanMetadata = {
                    id: `legacy_${patientId}`,
                    patientId,
                    name: 'Default Plan',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                currentPlans.push(legacyPlan);
                // Note: The data for this legacy plan is already at caseData_${patientId}
                // Our load logic handles `legacy_${patientId}` special case?
                // Or we should migrate the DATA too?
                // Simpler: loadCaseData handles the key mapping.
            }
        }

        currentPlans.push(newPlan);
        await set(`${PLAN_INDEX_PREFIX}${patientId}`, currentPlans);
        return planId;
    } catch (e) {
        console.error(`Failed to create plan for patient ${patientId}`, e);
        throw e;
    }
};

export const getPatients = async (): Promise<Patient[]> => {
    try {
        const patients = await get<Patient[]>(PATIENTS_KEY);
        if (patients) return patients;

        const lsPatients = localStorage.getItem(PATIENTS_KEY);
        if (lsPatients) {
            const parsed = JSON.parse(lsPatients);
            await set(PATIENTS_KEY, parsed);
            return parsed;
        }
        return [];
    } catch (e) {
        console.error('Failed to load patients', e);
        return [];
    }
};



const FILE_PREFIX = 'filesystem:';

// Helper to check if a string is a base64 image
const isBase64Image = (str: string) => str.startsWith('data:image');

// Helper to check if a string is a file reference
const isFileRef = (str: string) => str.startsWith(FILE_PREFIX);

// Recursive function to process data before saving
const processForSave = async (data: any): Promise<any> => {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
        return Promise.all(data.map(item => processForSave(item)));
    }

    if (typeof data === 'object') {
        const newData: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];

                // If value is a Base64 image string, save it
                if (typeof value === 'string' && isBase64Image(value)) {
                    try {
                        const fileName = await saveImageToFilesystem(value);
                        newData[key] = `${FILE_PREFIX}${fileName}`;
                    } catch (e) {
                        console.error(`Failed to save image for key ${key}`, e);
                        // Fallback: keep original data if save fails? 
                        // Or set null? Keeping original might blow up quota if that was the issue.
                        // Let's keep original to prevent data loss.
                        newData[key] = value;
                    }
                } else {
                    // Recurse
                    newData[key] = await processForSave(value);
                }
            }
        }
        return newData;
    }

    return data;
};

// Recursive function to process data after loading
const processForLoad = async (data: any): Promise<any> => {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
        return Promise.all(data.map(item => processForLoad(item)));
    }

    if (typeof data === 'object') {
        const newData: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];

                // If value is a file reference, load it
                if (typeof value === 'string' && isFileRef(value)) {
                    const fileName = value.replace(FILE_PREFIX, '');
                    try {
                        const imageContent = await loadImageFromFilesystem(fileName);
                        newData[key] = imageContent || null; // If load fails, maybe null?
                    } catch (e) {
                        console.error(`Failed to load image for key ${key}`, e);
                        newData[key] = null;
                    }
                } else {
                    // Recurse
                    newData[key] = await processForLoad(value);
                }
            }
        }
        return newData;
    }

    return data;
};


// Helper to get correct storage key
const getStorageKey = (id: string) => {
    if (id.startsWith('legacy_')) {
        return `caseData_${id.replace('legacy_', '')}`;
    } else if (id.startsWith('plan_')) {
        return `caseData_${id}`;
    }
    // Fallback for direct patient ID usage
    return `caseData_${id}`;
};

export const saveCaseData = async (id: string, caseData: any) => {
    try {
        const key = getStorageKey(id);
        // Process data to offload images
        const optimizedData = await processForSave(caseData);
        await set(key, optimizedData);
    } catch (e) {
        console.error(`Failed to save case data for ${id}`, e);
    }
};



export const loadCaseData = async (id: string): Promise<any | null> => {
    // If id starts with "legacy_", it maps to caseData_<patientId>
    // If id starts with "plan_", it maps to caseData_<planId>
    // If id is just a raw patientId (old behavior), maps to caseData_<patientId>

    let storageKey = `caseData_${id}`;

    if (id.startsWith('legacy_')) {
        const realPatientId = id.replace('legacy_', '');
        storageKey = `caseData_${realPatientId}`;
    } else if (id.startsWith('plan_')) {
        storageKey = `caseData_${id}`;
    }

    return loadDataByKey(storageKey, id);
};

const loadDataByKey = async (storageKey: string, debugId: string): Promise<any | null> => {
    try {
        let data = await get(storageKey);
        // Fallback for migration inside helper if needed, but the main logic is:
        if (!data && !debugId.startsWith('plan_')) {
            // Try LS for legacy IDs
            const lsData = localStorage.getItem(storageKey);
            if (lsData) {
                data = JSON.parse(lsData);
                localStorage.removeItem(storageKey);
            }
        }

        if (data) {
            return await processForLoad(data);
        }
        return null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export const clearCaseData = async (patientId: string) => {
    // Ideally we should also delete the files?
    // This is tricky because we need to know WHICH files.
    // If we want to be clean, we load first, find refs, delete files, then delete IDB.
    try {
        const data = await get(`caseData_${patientId}`);
        if (data) {
            // Helper to find and delete
            const deleteFilesParams = async (obj: any) => {
                if (!obj) return;
                if (typeof obj === 'object') {
                    for (const key in obj) {
                        const val = obj[key];
                        if (typeof val === 'string' && isFileRef(val)) {
                            await deleteImageFromFilesystem(val.replace(FILE_PREFIX, ''));
                        } else if (typeof val === 'object') {
                            await deleteFilesParams(val);
                        }
                    }
                }
            };
            await deleteFilesParams(data);
        }
        await del(`caseData_${patientId}`);
    } catch (e) {
        console.error("Error clearing case data", e);
    }
};
