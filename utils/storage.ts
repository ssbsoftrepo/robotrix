import { Patient, initialCaseData } from '../types';
import { api } from '../services/api';

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
    try {
        const response = await api.getPatients();
        if (Array.isArray(response)) {
            return response.map((p: any) => {
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
                };
            });
        }
        return [];
    } catch (e) {
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
    try {
        const serverPlans = await api.getPlansForPatient(patientId);
        if (Array.isArray(serverPlans)) {
            return serverPlans.map((sp: any) => {
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
                };
            });
        }
        return [];
    } catch (e) {
        console.error(`Failed to load plans for patient ${patientId}`, e);
        return [];
    }
};

export const createNewPlan = async (patientId: string, name: string): Promise<string> => {
    try {
        const initialData = {
            ...initialCaseData,
            planName: name,
        };
        const formData = new FormData();
        formData.append('patientId', patientId);
        formData.append('legSide', 'left');
        formData.append('caseDataJson', JSON.stringify(initialData));

        const response = await api.savePlan(formData);
        return String(response);
    } catch (e) {
        console.error(`Failed to create plan for patient ${patientId}`, e);
        throw e;
    }
};

export const updatePlanLegSide = async (patientId: string, planId: string, legSide: 'left' | 'right') => {
    // No-op because the auto-save effect will automatically sync updated legSide to DB.
};

const isBase64Image = (str: string) => typeof str === 'string' && str.startsWith('data:image');
const isDbImageRef = (str: string) => typeof str === 'string' && str.startsWith('dbimage:');

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
                    try {
                        const blob = await api.getPlanImage(planId, imageType);
                        if (blob instanceof Blob) {
                            const base64 = await blobToBase64(blob);
                            newData[key] = base64;
                        } else {
                            newData[key] = null;
                        }
                    } catch (e) {
                        console.error(`Failed to load db image ${imageType} for plan ${planId}`, e);
                        newData[key] = null;
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
        const files: { [key: string]: Blob } = {};
        const optimizedData = await processForSave(caseData, files);
        
        // Construct FormData to send to the backend
        const formData = new FormData();
        formData.append('patientId', patientId);
        formData.append('legSide', caseData.legSide || 'left');
        formData.append('planId', id);
        formData.append('caseDataJson', JSON.stringify(optimizedData));

        // Append all the Blobs to the FormData
        for (const [key, blob] of Object.entries(files)) {
            formData.append(key, blob, `${key}.png`);
        }

        await api.savePlan(formData);
        console.log(`Successfully saved case data and images to DB for plan ID ${id}`);
    } catch (e) {
        console.error(`Failed to save case data for ${id}`, e);
    }
};

export const loadCaseData = async (id: string): Promise<any | null> => {
    try {
        const caseData = await api.getPlanDetails(id);
        if (caseData) {
            return await processForLoad(caseData, id);
        }
        return null;
    } catch (e) {
        console.error(`Failed to load case data for plan ${id}`, e);
        return null;
    }
};

export const clearCaseData = async (patientId: string) => {
    // No-op: we do not maintain case data locally.
};
