import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { Patient, Page, LongLegResults, ValgusResults, LegSide, Landmarks, FunctionalPlannerMode, KneeType, CaseData, CoronalBalancingResults, IntraOpValidationData, IntraOpCoronalBalancingData, initialCaseData } from '../types';
import { savePatients, getPatients, saveCaseData, loadCaseData, updatePlanLegSide, getPlansForPatient } from '../utils/storage';
import { api, isNetworkError } from '../services/api';
import { initNetworkMonitor, isOnline as getIsOnline, onStatusChange } from '../services/networkStatus';
import { processSyncQueue, onSyncStatus } from '../services/syncQueue';
import { getPendingSyncCount, getCachedPatients, cachePatients, addCachedPatient, removeCachedPatient, addToSyncQueue, setOfflineUser, clearUserCache } from '../services/offlineDb';
import { generateSyncId, generateOfflineId } from '../services/syncQueue';


// Combine all context values into a single interface
interface AppContextType extends CaseData {
    page: Page;
    setPage: (page: Page) => void;
    previousPage: Page | null;
    setPreviousPage: (page: Page | null) => void;
    patients: Patient[];
    savePatient: (patient: Patient) => Promise<Patient | undefined>;
    deletePatient: (patientId: string) => void;
    currentPatientId: string | null;
    setCurrentPatientId: (id: string | null) => void;
    currentPlanId: string | null;
    setCurrentPlanId: (id: string | null, overridePatient?: Patient, initialLegSide?: LegSide) => void;

    // Setters for all case data properties
    setLegSide: (side: LegSide) => void;
    setPlannerMode: (mode: 'basic' | 'advanced' | null) => void;
    setKneeType: (type: KneeType | null) => void;
    setLdfaMode: (mode: 'native' | 'corrected' | null) => void;
    setFemurBoundary: (boundary: 'basic' | 'expanded' | null) => void;
    setTibiaBoundary: (boundary: 'basic' | 'expanded' | null) => void;
    setFunctionalPlannerMode: (mode: FunctionalPlannerMode) => void;
    setLateralLaxity: (laxity: string | null) => void;
    setImplantThickness: (thickness: number | null) => void;

    setLongLegImageSrc: (src: string | null) => void;
    setLongLegLandmarks: React.Dispatch<React.SetStateAction<Landmarks>>;
    setLongLegResults: (results: LongLegResults) => void;
    setLongLegCanvasDataUrl: (url: string | null) => void;

    setValgusImageSrc: (src: string | null) => void;
    setValgusLandmarks: React.Dispatch<React.SetStateAction<Landmarks>>;
    setValgusResults: (results: ValgusResults) => void;
    setValgusCanvasDataUrl: (url: string | null) => void;

    setSimAfterImage: (url: string | null) => void;
    setFemoralCutSim: (cut: number | null) => void;
    setTibialCutSim: (cut: number | null) => void;
    setAppliedFemoralCutSim: (cut: number | null) => void;
    setAppliedTibialCutSim: (cut: number | null) => void;

    setValgusCoronalBalancingResults: (results: CoronalBalancingResults) => void;
    setLongLegCoronalBalancingResults: (results: CoronalBalancingResults) => void;

    setCoronalBalancingSimImage: (src: string | null) => void;
    setPostOpLongLegImage: (src: string | null) => void;
    setPostOpLongLegLandmarks: React.Dispatch<React.SetStateAction<Landmarks>>;
    setPostOpLongLegResults: (results: Partial<LongLegResults>) => void;

    setPostOpValgusImage: (src: string | null) => void;
    setPostOpValgusLandmarks: React.Dispatch<React.SetStateAction<Landmarks>>;
    setPostOpValgusResults: (results: Partial<ValgusResults>) => void;

    setLongLegCoronalBalancingMainImage: (src: string | null) => void;
    setLongLegCoronalBalancingBlockImage: (src: string | null) => void;
    setLongLegFunctionalTibialCutImage: (src: string | null) => void;

    setValgusCoronalBalancingMainImage: (src: string | null) => void;
    setValgusCoronalBalancingBlockImage: (src: string | null) => void;
    setValgusFunctionalTibialCutImage: (src: string | null) => void;

    setResultAnalysisFemoralImage: (src: string | null) => void;
    setResultAnalysisTibialImage: (src: string | null) => void;

    setValgusLaxityReferenceImages: (images: Record<string, string | null>) => void;
    setLongLegLaxityReferenceImages: (images: Record<string, string | null>) => void;

    setValgusFunctionalCutDegree: (degree: number | null) => void;
    setLongLegFunctionalCutDegree: (degree: number | null) => void;

    setValgusFunctionalLinesY: (y: number) => void;
    setLongLegFunctionalLinesY: (y: number) => void;
    setIntraOpValidationData: (data: IntraOpValidationData) => void;
    setValgusIntraOpValidationData: (data: IntraOpValidationData) => void;
    setIntraOpCoronalBalancingData: React.Dispatch<React.SetStateAction<IntraOpCoronalBalancingData>>;
    setValgusIntraOpCoronalBalancingData: React.Dispatch<React.SetStateAction<IntraOpCoronalBalancingData>>;

    isLoading: boolean;
    token: string | null;
    role: string | null;
    username: string | null;
    hospitalName: string | null;
    login: (token: string, role: string, username: string, tenantId: string | null) => void;
    logout: () => void;

    // Offline state
    isOffline: boolean;
    syncStatus: 'idle' | 'syncing' | 'error' | 'done';
    pendingSyncCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);



export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [page, setPage] = useState<Page>('case-management');
    const [previousPage, setPreviousPage] = useState<Page | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [currentPatientId, _setCurrentPatientId] = useState<string | null>(null);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const loadedPlanIdRef = useRef<string | null>(null);

    // Offline state
    const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'done'>('idle');
    const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

    // Authentication States
    const [token, setToken] = useState<string | null>(() => {
        const storedToken = localStorage.getItem('robotrix_token');
        if (storedToken) {
            try {
                const payloadBase64 = storedToken.split('.')[1];
                const payloadJson = JSON.parse(atob(payloadBase64));
                const exp = payloadJson.exp;
                if (exp && Date.now() >= exp * 1000) {
                    localStorage.removeItem('robotrix_token');
                    localStorage.removeItem('robotrix_role');
                    localStorage.removeItem('robotrix_username');
                    localStorage.removeItem('robotrix_tenant');
                    return null;
                }
                return storedToken;
            } catch (e) {
                return storedToken;
            }
        }
        return null;
    });
    const [role, setRole] = useState<string | null>(() => token ? localStorage.getItem('robotrix_role') : null);
    const [username, setUsername] = useState<string | null>(() => {
        const storedUsername = token ? localStorage.getItem('robotrix_username') : null;
        // Initialise offline cache namespace for the already-logged-in user
        if (storedUsername) setOfflineUser(storedUsername);
        return storedUsername;
    });
    const [hospitalName, setHospitalName] = useState<string | null>(() => token ? localStorage.getItem('robotrix_tenant') : null);

    const login = useCallback((newToken: string, newRole: string, newUsername: string, tenantId: string | null) => {
        localStorage.setItem('robotrix_token', newToken);
        localStorage.setItem('robotrix_role', newRole);
        localStorage.setItem('robotrix_username', newUsername);
        if (tenantId) {
            localStorage.setItem('robotrix_tenant', tenantId);
            setHospitalName(tenantId);
        } else {
            localStorage.removeItem('robotrix_tenant');
            setHospitalName(null);
        }
        setToken(newToken);
        setRole(newRole);
        setUsername(newUsername);
        // Set offline cache namespace for this doctor
        setOfflineUser(newUsername);
        setPage('case-management');
    }, []);



    const logout = useCallback(async () => {
        const pendingCount = await getPendingSyncCount();
        
        if (pendingCount > 0) {
            if (!getIsOnline()) {
                alert(`You have ${pendingCount} unsynced changes.\n\nPlease connect to the internet to sync your data before logging out, otherwise your offline changes will be trapped on this device.`);
                return; // Block logout
            }

            // Try to sync before logging out
            try {
                await processSyncQueue();
                // Check if it actually cleared
                const newCount = await getPendingSyncCount();
                if (newCount > 0) {
                    alert(`Failed to sync ${newCount} changes to the server.\n\nPlease ensure your connection is stable before logging out.`);
                    return; // Block logout
                }
            } catch (err) {
                alert('An error occurred while syncing your data. Please try again before logging out.');
                return;
            }
        }

        localStorage.removeItem('robotrix_token');
        localStorage.removeItem('robotrix_role');
        localStorage.removeItem('robotrix_username');
        localStorage.removeItem('robotrix_tenant');
        setToken(null);
        setRole(null);
        setUsername(null);
        setHospitalName(null);
        setPatients([]);
        _setCurrentPatientId(null);
        setCurrentPlanId(null);
        setCaseData(initialCaseData);
        setPage('case-management');
        loadedPlanIdRef.current = null;
        // Clear offline user context (cache data stays per-user namespaced so it's safe)
        setOfflineUser('');
    }, []);

    useEffect(() => {
        const handleAuthError = () => {
            logout();
        };
        window.addEventListener('auth-error', handleAuthError);
        return () => {
            window.removeEventListener('auth-error', handleAuthError);
        };
    }, [logout]);

    // ─── Network & Sync Initialisation ────────────────────────────────
    useEffect(() => {
        initNetworkMonitor();

        const unsub = onStatusChange((online) => {
            setIsOffline(!online);
            if (online) {
                // Trigger sync queue processing when we come back online
                processSyncQueue();
            }
        });

        // Listen for sync status updates
        onSyncStatus((status, count, message) => {
            setSyncStatus(status);
            setPendingSyncCount(count);
            if (status === 'done') {
                // After successful sync, refresh patients from server
                getPatients().then(p => setPatients(p)).catch(() => {});
            }
            if (status === 'error' && message) {
                console.error('[Sync Error]', message);
            }
        });

        // Load initial pending count
        getPendingSyncCount().then(setPendingSyncCount);

        const handleSyncQueueUpdate = (e: any) => {
            setPendingSyncCount(e.detail);
        };
        window.addEventListener('robotrix-sync-queue-updated', handleSyncQueueUpdate);

        return () => {
            unsub();
            window.removeEventListener('robotrix-sync-queue-updated', handleSyncQueueUpdate);
        };
    }, []);


    // All data for the currently loaded patient is in this state object.
    const [caseData, setCaseData] = useState<CaseData>(initialCaseData);

    // Fetch patients list from server (with offline cache fallback)
    useEffect(() => {
        if (token && role === 'DOCTOR') {
            getPatients()
                .then((data: Patient[]) => {
                    if (Array.isArray(data)) {
                        setPatients(data);
                    }
                })
                .catch(err => {
                    console.error('Failed to load patients', err);
                });
        } else {
            setPatients([]);
        }
    }, [token, role]);

    // Sync to remote database with a debounce
    useEffect(() => {
        if (isLoading || !currentPlanId || !currentPatientId || role !== 'DOCTOR') return;

        // Skip saving if the plan ID has changed but the data is not yet loaded for it
        if (currentPlanId !== loadedPlanIdRef.current) return;

        const handler = setTimeout(async () => {
            try {
                const planName = caseData.legSide === 'left' ? 'Left Leg' : 'Right Leg';

                const caseDataWithMeta = {
                    ...caseData,
                    planName,
                };

                await saveCaseData(currentPlanId, caseDataWithMeta, currentPatientId);
            } catch (e) {
                console.error('Failed to auto-save plan to server', e);
            }
        }, 1500);

        return () => clearTimeout(handler);
    }, [caseData, currentPlanId, currentPatientId, role, isLoading]);

    const deletePatient = useCallback(async (patientId: string) => {
        // Optimistically remove from local state & cache
        setPatients(currentPatients => {
            return currentPatients.filter(p => p.id !== patientId);
        });
        await removeCachedPatient(patientId);

        // Clear current patient if we're deleting it
        if (currentPatientId === patientId) {
            _setCurrentPatientId(null);
            setCurrentPlanId(null);
            setCaseData(initialCaseData);
            loadedPlanIdRef.current = null;
        }

        if (getIsOnline() && !patientId.startsWith('offline-')) {
            try {
                await api.deletePatient(patientId);
            } catch (e: any) {
                if (isNetworkError(e)) {
                    // Queue for later sync
                    await addToSyncQueue({
                        id: generateSyncId(),
                        type: 'DELETE_PATIENT',
                        payload: { patientId },
                        createdAt: Date.now(),
                        retryCount: 0,
                        status: 'pending',
                    });
                    getPendingSyncCount().then(setPendingSyncCount);
                } else {
                    console.error('Failed to delete patient from server', e);
                }
            }
        } else if (!patientId.startsWith('offline-')) {
            // Offline: queue deletion
            await addToSyncQueue({
                id: generateSyncId(),
                type: 'DELETE_PATIENT',
                payload: { patientId },
                createdAt: Date.now(),
                retryCount: 0,
                status: 'pending',
            });
            getPendingSyncCount().then(setPendingSyncCount);
        }
        // If it's an offline-only patient, no server call needed — just remove locally
    }, [currentPatientId]);

    const savePatient = useCallback(async (patientToSave: Patient) => {
        if (role !== 'DOCTOR') return;

        const fullName = `${patientToSave.firstName || ''} ${patientToSave.lastName || ''}`.trim();
        const payload = {
            name: fullName || 'Unknown',
            age: patientToSave.age ? parseInt(patientToSave.age, 10) : null,
            gender: patientToSave.gender
        };

        const isUpdate = !!patientToSave.id;

        // Try online creation/update first
        if (getIsOnline()) {
            try {
                let savedPatient;
                if (isUpdate) {
                    // Update existing patient
                    savedPatient = await api.updatePatient(patientToSave.id, payload);
                } else {
                    // Create new patient
                    savedPatient = await api.createPatient(payload);
                }

                const nameParts = (savedPatient.name || '').trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                const mappedSavedPatient: Patient = {
                    id: String(savedPatient.id),
                    pid: savedPatient.pid || `PID-${String(savedPatient.id).padStart(4, '0')}`,
                    firstName,
                    lastName,
                    age: savedPatient.age ? String(savedPatient.age) : '',
                    gender: savedPatient.gender || 'Male',
                    date: savedPatient.createdAt ? savedPatient.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
                };

                // Update local state & cache
                setPatients(currentPatients => {
                    const index = currentPatients.findIndex(p => p.id === mappedSavedPatient.id);
                    const newPatientsList = [...currentPatients];
                    if (index === -1) {
                        newPatientsList.push(mappedSavedPatient);
                    } else {
                        newPatientsList[index] = mappedSavedPatient;
                    }
                    return newPatientsList;
                });
                await addCachedPatient(mappedSavedPatient);
                return mappedSavedPatient;
            } catch (e: any) {
                if (!isNetworkError(e)) {
                    console.error('Failed to register patient on server', e);
                    return undefined;
                }
                // Network error — fall through to offline creation
            }
        }

        // Offline: update or create patient
        let offlinePatient: Patient;
        
        if (isUpdate) {
            offlinePatient = {
                ...patientToSave,
                date: patientToSave.date || new Date().toISOString().split('T')[0],
            };
            
            // Update local state & cache
            setPatients(currentPatients => {
                const index = currentPatients.findIndex(p => p.id === offlinePatient.id);
                const newPatientsList = [...currentPatients];
                if (index !== -1) {
                    newPatientsList[index] = offlinePatient;
                } else {
                    newPatientsList.push(offlinePatient);
                }
                return newPatientsList;
            });
            await addCachedPatient(offlinePatient);
            
            // Queue for sync
            await addToSyncQueue({
                id: generateSyncId(),
                type: 'UPDATE_PATIENT',
                payload: { id: offlinePatient.id, ...payload },
                patientId: offlinePatient.id,
                createdAt: Date.now(),
                retryCount: 0,
                status: 'pending',
            });
            console.warn(`[Offline] Patient updated locally with ID: ${offlinePatient.id}`);
        } else {
            // Offline: create patient with temp ID
            const tempId = generateOfflineId();
            offlinePatient = {
                id: tempId,
                pid: 'PID-????',
                firstName: patientToSave.firstName || '',
                lastName: patientToSave.lastName || '',
                age: patientToSave.age || '',
                gender: patientToSave.gender || 'Male',
                date: new Date().toISOString().split('T')[0],
            };

            // Update local state & cache
            setPatients(currentPatients => [...currentPatients, offlinePatient]);
            await addCachedPatient(offlinePatient);

            // Queue for sync
            await addToSyncQueue({
                id: generateSyncId(),
                type: 'CREATE_PATIENT',
                payload,
                tempId,
                createdAt: Date.now(),
                retryCount: 0,
                status: 'pending',
            });
            console.warn(`[Offline] Patient created locally with temp ID: ${tempId}`);
        }

        // Update pending count
        getPendingSyncCount().then(setPendingSyncCount);

        return offlinePatient;
    }, [role]);


    const setCurrentPatientId = async (id: string | null, overridePatient?: Patient) => {
        if (id === currentPatientId) return; // No change, no reset
        _setCurrentPatientId(id);
        setCurrentPlanId(null); // Reset plan when patient changes
        if (id) {
            // Find the patient to set initial defaults correctly
            const patient = patients.find(p => p.id === id);

            // Initialize with patient's leg side instead of generic default
            setCaseData({
                ...initialCaseData,
                legSide: 'left' // Default to left, or whatever was previously there. Real override happens in setPlanAndLoad if needed.
            });
        } else {
            setCaseData(initialCaseData);
        }
    };

    // New helper to load a specific plan
    const loadPlan = async (planId: string) => {
        setCurrentPlanId(planId);
        setIsLoading(true);
        try {
            const storedData = await loadCaseData(planId);
            if (storedData) {
                setCaseData({ ...initialCaseData, ...storedData });
            } else {
                // Should not happen for existing plans, but for new ones
                setCaseData(initialCaseData);
            }
            loadedPlanIdRef.current = planId;
        } catch (error) {
            console.error("Error loading plan data", error);
            setCaseData(initialCaseData);
        } finally {
            setIsLoading(false);
        }
    };

    // We need to expose loadPlan functionality.
    // Ideally we'd modify setCurrentPatientId to NOT return a promise of loaded data, but it was void/async.
    // We can add loadPlan to the context.

    /*
     * Note: effectively `setCurrentPatientId` now just selects the patient context.
     * The actual loading happens when `setCurrentPlanId` (which we need to expose) or a dedicated `loadPlan` is called.
     * Since `setCurrentPlanId` is just state setter, we should add a `loadPlan` wrapper in the context value?
     * Or just expose `setCurrentPlanId` and a SIDE EFFECT to load data?
     * Side effect is better for consistency.
     */

    // Let's add an effect for currentPlanId changes to load data?
    // BUT we already have an effect that SAVES data on change.
    // If we change ID, we don't want to save old data to new ID.
    // The save effect has [caseData, currentPlanId] dependency.
    // If we change currentPlanId, the effect fires.
    // We must ensure we LOAD data before the SAVE effect overwrites it with current state.
    // This is a classic race condition in React contexts.

    // Better approach: `loadPlan` function that updates state AND loads data, similar to how setCurrentPatientId used to work.
    // And we keep `currentPlanId` state.

    // Wait, the previous implementation of `setCurrentPatientId` (lines 257+) did exactly this: set ID, then load.
    // So if we make `setCurrentPlanId` do the loading, we are good.

    const setPlanAndLoad = async (planId: string | null, overridePatient?: Patient, initialLegSide?: LegSide) => {
        setCurrentPlanId(planId);
        if (planId) {
            setIsLoading(true);
            try {
                const storedData = await loadCaseData(planId);

                // Determine base data (stored or fresh)
                let nextCaseData = storedData ? { ...initialCaseData, ...storedData } : initialCaseData;

                // CRITICAL: Leg Side is now PLAN specific.
                // If we are creating a new plan (passed initialLegSide), set it.
                // Otherwise use the stored one (from nextCaseData).

                if (initialLegSide) {
                    nextCaseData = {
                        ...nextCaseData,
                        legSide: initialLegSide
                    };
                }

                // REMOVED: Logic that forced patient.legSide overwrite

                setCaseData(nextCaseData);
                loadedPlanIdRef.current = planId; // Set the ref to the loaded plan ID

            } catch (e) {
                console.error("Error loading plan", e);
                setCaseData(initialCaseData); // Should we also enforce leg side here? Ideally yes, but error case.
            } finally {
                setIsLoading(false);
            }
        } else {
            loadedPlanIdRef.current = null;
        }
    };

    const createSetter = <K extends keyof CaseData>(key: K) =>
        useCallback((value: React.SetStateAction<CaseData[K]>) => {
            setCaseData(prev => {
                const prevValue = prev[key];
                const newValue = value instanceof Function ? value(prevValue) : value;
                return { ...prev, [key]: newValue };
            });
        }, []);

    // Special setter for LegSide - just updates case data now
    const handleSetLegSide = useCallback((side: LegSide) => {
        const newPlanName = side === 'left' ? 'Left Leg' : 'Right Leg';
        setCaseData(prev => ({ ...prev, legSide: side, planName: newPlanName }));
        // Sync to plan metadata for list display
        if (currentPatientId && currentPlanId && currentPlanId.startsWith('plan_')) {
            updatePlanLegSide(currentPatientId, currentPlanId, side);
        }
    }, [currentPatientId, currentPlanId]);

    const value: AppContextType = {
        page,
        setPage,
        previousPage,
        setPreviousPage,
        patients,
        savePatient,
        deletePatient,
        currentPatientId,
        setCurrentPatientId,
        currentPlanId,
        setCurrentPlanId: setPlanAndLoad,
        isLoading,
        token,
        role,
        username,
        hospitalName,
        login,
        logout,
        isOffline,
        syncStatus,
        pendingSyncCount,
        ...caseData,
        setLegSide: handleSetLegSide,
        setPlannerMode: createSetter('plannerMode'),
        setKneeType: createSetter('kneeType'),
        setLdfaMode: createSetter('ldfaMode'),
        setFemurBoundary: createSetter('femurBoundary'),
        setTibiaBoundary: createSetter('tibiaBoundary'),
        setFunctionalPlannerMode: createSetter('functionalPlannerMode'),
        setLateralLaxity: createSetter('lateralLaxity'),
        setImplantThickness: createSetter('implantThickness'),
        setLongLegImageSrc: createSetter('longLegImageSrc'),
        setLongLegLandmarks: createSetter('longLegLandmarks'),
        setLongLegResults: createSetter('longLegResults'),
        setLongLegCanvasDataUrl: createSetter('longLegCanvasDataUrl'),
        setValgusImageSrc: createSetter('valgusImageSrc'),
        setValgusLandmarks: createSetter('valgusLandmarks'),
        setValgusResults: createSetter('valgusResults'),
        setValgusCanvasDataUrl: createSetter('valgusCanvasDataUrl'),
        setSimAfterImage: createSetter('simAfterImage'),
        setFemoralCutSim: createSetter('femoralCutSim'),
        setTibialCutSim: createSetter('tibialCutSim'),
        setAppliedFemoralCutSim: createSetter('appliedFemoralCutSim'),
        setAppliedTibialCutSim: createSetter('appliedTibialCutSim'),
        setValgusCoronalBalancingResults: createSetter('valgusCoronalBalancingResults'),
        setLongLegCoronalBalancingResults: createSetter('longLegCoronalBalancingResults'),
        setCoronalBalancingSimImage: createSetter('coronalBalancingSimImage'),
        setPostOpLongLegImage: createSetter('postOpLongLegImage'),
        setPostOpLongLegLandmarks: createSetter('postOpLongLegLandmarks'),
        setPostOpLongLegResults: createSetter('postOpLongLegResults'),

        setPostOpValgusImage: createSetter('postOpValgusImage'),
        setPostOpValgusLandmarks: createSetter('postOpValgusLandmarks'),
        setPostOpValgusResults: createSetter('postOpValgusResults'),

        setLongLegCoronalBalancingMainImage: createSetter('longLegCoronalBalancingMainImage'),
        setLongLegCoronalBalancingBlockImage: createSetter('longLegCoronalBalancingBlockImage'),
        setLongLegFunctionalTibialCutImage: createSetter('longLegFunctionalTibialCutImage'),

        setValgusCoronalBalancingMainImage: createSetter('valgusCoronalBalancingMainImage'),
        setValgusCoronalBalancingBlockImage: createSetter('valgusCoronalBalancingBlockImage'),
        setValgusFunctionalTibialCutImage: createSetter('valgusFunctionalTibialCutImage'),

        setResultAnalysisFemoralImage: createSetter('resultAnalysisFemoralImage'),
        setResultAnalysisTibialImage: createSetter('resultAnalysisTibialImage'),

        setValgusLaxityReferenceImages: createSetter('valgusLaxityReferenceImages'),
        setLongLegLaxityReferenceImages: createSetter('longLegLaxityReferenceImages'),

        setValgusFunctionalCutDegree: createSetter('valgusFunctionalCutDegree'),
        setLongLegFunctionalCutDegree: createSetter('longLegFunctionalCutDegree'),

        setValgusFunctionalLinesY: createSetter('valgusFunctionalLinesY'),
        setLongLegFunctionalLinesY: createSetter('longLegFunctionalLinesY'),
        setIntraOpValidationData: createSetter('intraOpValidationData'),
        setValgusIntraOpValidationData: createSetter('valgusIntraOpValidationData'),
        setIntraOpCoronalBalancingData: createSetter('intraOpCoronalBalancingData'),
        setValgusIntraOpCoronalBalancingData: createSetter('valgusIntraOpCoronalBalancingData'),
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
