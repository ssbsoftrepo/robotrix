
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Patient, Page, LongLegResults, ValgusResults, LegSide, Landmarks, FunctionalPlannerMode, KneeType } from '../types';
import { savePatients, getPatients, saveCaseData, loadCaseData, updatePlanLegSide } from '../utils/storage';
import { api } from '../services/api';

export interface CoronalBalancingResults {
    selectedSeries: number | null;
    lateralGap: string;
    medialRelease: number;
    simFemoralCut: number;
    simTibialCut: number;
    simResectionDepth: number;
}

export interface IntraOpValidationData {
    medialGap: number;
    lateralGap: number;
    tibiaWidth: number;
}

export interface IntraOpCoronalBalancingData {
    additionalFemurCut: number;
    additionalTibiaCut: number;
    additionalLaxity: number;
    functionalTibiaCutDegree: number | null;
}

// Centralized data structure for a single case
export interface CaseData {
    legSide: LegSide;
    plannerMode: 'basic' | 'advanced' | null;
    kneeType: KneeType | null;
    ldfaMode: 'native' | 'corrected' | null;
    femurBoundary: 'basic' | 'expanded' | null;
    tibiaBoundary: 'basic' | 'expanded' | null;
    functionalPlannerMode: FunctionalPlannerMode;
    lateralLaxity: string | null;
    implantThickness: number | null;

    longLegImageSrc: string | null;
    longLegLandmarks: Landmarks;
    longLegResults: LongLegResults;
    longLegCanvasDataUrl: string | null;

    valgusImageSrc: string | null;
    valgusLandmarks: Landmarks;
    valgusResults: ValgusResults;
    valgusCanvasDataUrl: string | null;

    simAfterImage: string | null;
    femoralCutSim: number | null;
    tibialCutSim: number | null;
    appliedFemoralCutSim: number | null;
    appliedTibialCutSim: number | null;

    valgusCoronalBalancingResults: CoronalBalancingResults;
    longLegCoronalBalancingResults: CoronalBalancingResults;

    // Image Persistence
    coronalBalancingSimImage: string | null;
    postOpLongLegImage: string | null;
    postOpLongLegLandmarks: Landmarks;
    postOpLongLegResults: Partial<LongLegResults>;

    postOpValgusImage: string | null;
    postOpValgusLandmarks: Landmarks;
    postOpValgusResults: Partial<ValgusResults>;

    // New persisted images
    longLegCoronalBalancingMainImage: string | null;
    longLegCoronalBalancingBlockImage: string | null;
    longLegFunctionalTibialCutImage: string | null;

    // Valgus specific persisted images
    valgusCoronalBalancingMainImage: string | null;
    valgusCoronalBalancingBlockImage: string | null;
    valgusFunctionalTibialCutImage: string | null;

    resultAnalysisFemoralImage: string | null;
    resultAnalysisTibialImage: string | null;

    // Laxity Reference Images
    valgusLaxityReferenceImages: Record<string, string | null>;
    longLegLaxityReferenceImages: Record<string, string | null>;

    // Functional Cut Degrees for Report
    valgusFunctionalCutDegree: number | null;
    longLegFunctionalCutDegree: number | null;

    // Line Positions Persistence
    valgusFunctionalLinesY: number;
    longLegFunctionalLinesY: number;
    intraOpValidationData: IntraOpValidationData;
    valgusIntraOpValidationData: IntraOpValidationData;
    intraOpCoronalBalancingData: IntraOpCoronalBalancingData;
    valgusIntraOpCoronalBalancingData: IntraOpCoronalBalancingData;
}

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
    setLongLegLandmarks: (landmarks: Landmarks) => void;
    setLongLegResults: (results: LongLegResults) => void;
    setLongLegCanvasDataUrl: (url: string | null) => void;

    setValgusImageSrc: (src: string | null) => void;
    setValgusLandmarks: (landmarks: Landmarks) => void;
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
    setPostOpLongLegLandmarks: (landmarks: Landmarks) => void;
    setPostOpLongLegResults: (results: Partial<LongLegResults>) => void;

    setPostOpValgusImage: (src: string | null) => void;
    setPostOpValgusLandmarks: (landmarks: Landmarks) => void;
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
    setIntraOpCoronalBalancingData: (data: IntraOpCoronalBalancingData) => void;
    setValgusIntraOpCoronalBalancingData: (data: IntraOpCoronalBalancingData) => void;

    isLoading: boolean;
    token: string | null;
    role: string | null;
    username: string | null;
    hospitalName: string | null;
    login: (token: string, role: string, username: string, tenantId: string | null) => void;
    logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial states for complex objects
const initialLongLegResults: LongLegResults = { ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', ama: null };
const initialValgusResults: ValgusResults = { obliquity: null, femurType: '--', femurTypeByObliquity: '--', cpak: '--', cut: '--', ldfa: null, mpta: null };
const initialCoronalBalancingResults: CoronalBalancingResults = { selectedSeries: null, lateralGap: '', medialRelease: 0, simFemoralCut: 3.0, simTibialCut: 0.0, simResectionDepth: 20 };
const initialIntraOpValidationData: IntraOpValidationData = { medialGap: 16, lateralGap: 16, tibiaWidth: 70 };
const initialIntraOpCoronalBalancingData: IntraOpCoronalBalancingData = { additionalFemurCut: 0, additionalTibiaCut: 0, additionalLaxity: 0, functionalTibiaCutDegree: null };

// The single source of truth for a new/cleared case
const initialCaseData: CaseData = {
    legSide: 'left',
    plannerMode: null,
    kneeType: null,
    ldfaMode: null,
    femurBoundary: null,
    tibiaBoundary: null,
    functionalPlannerMode: 'tibial_check',
    lateralLaxity: null,
    implantThickness: null,
    longLegImageSrc: null,
    longLegLandmarks: {},
    longLegResults: initialLongLegResults,
    longLegCanvasDataUrl: null,
    valgusImageSrc: null,
    valgusLandmarks: {},
    valgusResults: initialValgusResults,
    valgusCanvasDataUrl: null,
    simAfterImage: null,
    femoralCutSim: null,
    tibialCutSim: null,
    appliedFemoralCutSim: null,
    appliedTibialCutSim: null,
    valgusCoronalBalancingResults: initialCoronalBalancingResults,
    longLegCoronalBalancingResults: initialCoronalBalancingResults,
    coronalBalancingSimImage: null,
    postOpLongLegImage: null,
    postOpLongLegLandmarks: {},
    postOpLongLegResults: {},
    postOpValgusImage: null,
    postOpValgusLandmarks: {},
    postOpValgusResults: {},
    longLegCoronalBalancingMainImage: null,
    longLegCoronalBalancingBlockImage: null,
    longLegFunctionalTibialCutImage: null,
    valgusCoronalBalancingMainImage: null,
    valgusCoronalBalancingBlockImage: null,
    valgusFunctionalTibialCutImage: null,
    resultAnalysisFemoralImage: null,
    resultAnalysisTibialImage: null,
    valgusLaxityReferenceImages: {},
    longLegLaxityReferenceImages: {},
    valgusFunctionalCutDegree: null,
    longLegFunctionalCutDegree: null,
    valgusFunctionalLinesY: 30,
    longLegFunctionalLinesY: 30,
    intraOpValidationData: initialIntraOpValidationData,
    valgusIntraOpValidationData: initialIntraOpValidationData,
    intraOpCoronalBalancingData: initialIntraOpCoronalBalancingData,
    valgusIntraOpCoronalBalancingData: initialIntraOpCoronalBalancingData,
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [page, setPage] = useState<Page>('case-management');
    const [previousPage, setPreviousPage] = useState<Page | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [currentPatientId, _setCurrentPatientId] = useState<string | null>(null);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Authentication States
    const [token, setToken] = useState<string | null>(sessionStorage.getItem('robotrix_token'));
    const [role, setRole] = useState<string | null>(sessionStorage.getItem('robotrix_role'));
    const [username, setUsername] = useState<string | null>(sessionStorage.getItem('robotrix_username'));
    const [hospitalName, setHospitalName] = useState<string | null>(sessionStorage.getItem('robotrix_tenant'));

    const login = useCallback((newToken: string, newRole: string, newUsername: string, tenantId: string | null) => {
        sessionStorage.setItem('robotrix_token', newToken);
        sessionStorage.setItem('robotrix_role', newRole);
        sessionStorage.setItem('robotrix_username', newUsername);
        if (tenantId) {
            sessionStorage.setItem('robotrix_tenant', tenantId);
            setHospitalName(tenantId);
        } else {
            sessionStorage.removeItem('robotrix_tenant');
            setHospitalName(null);
        }
        setToken(newToken);
        setRole(newRole);
        setUsername(newUsername);
    }, []);

    const logout = useCallback(() => {
        sessionStorage.removeItem('robotrix_token');
        sessionStorage.removeItem('robotrix_role');
        sessionStorage.removeItem('robotrix_username');
        sessionStorage.removeItem('robotrix_tenant');
        setToken(null);
        setRole(null);
        setUsername(null);
        setHospitalName(null);
        setPatients([]);
        _setCurrentPatientId(null);
        setCurrentPlanId(null);
        setCaseData(initialCaseData);
    }, []);

    // All data for the currently loaded patient is in this state object.
    const [caseData, setCaseData] = useState<CaseData>(initialCaseData);

    // Fetch patients list from server
    useEffect(() => {
        if (token && role === 'DOCTOR') {
            api.getPatients()
                .then((data: any) => {
                    if (Array.isArray(data)) {
                        const mapped = data.map((p: any) => {
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
                        setPatients(mapped);
                    }
                })
                .catch(err => {
                    console.error('Failed to load patients from server', err);
                });
        } else {
            setPatients([]);
        }
    }, [token, role]);

    // Save case data locally instantly, and sync to remote database with a debounce
    useEffect(() => {
        if (!currentPlanId) return;

        // 1. Instantly save to IndexedDB local storage
        saveCaseData(currentPlanId, caseData);

        // 2. Debounce HTTP save to Spring Boot database (3s)
        const handler = setTimeout(async () => {
            if (role !== 'DOCTOR' || !currentPatientId) return;

            try {
                const formData = new FormData();
                formData.append('patientId', currentPatientId);
                formData.append('legSide', caseData.legSide);
                formData.append('caseDataJson', JSON.stringify(caseData));

                // If there's a longLegImageSrc that is base64, append it
                if (caseData.longLegImageSrc && caseData.longLegImageSrc.startsWith('data:')) {
                    const res = await fetch(caseData.longLegImageSrc);
                    const blob = await res.blob();
                    formData.append('image', blob, 'longleg.png');
                    formData.append('imageType', 'longleg');
                }

                await api.savePlan(formData);
                console.log('Successfully auto-saved plan and image to remote database.');
            } catch (e) {
                console.error('Failed to auto-save plan to server', e);
            }
        }, 3000);

        return () => clearTimeout(handler);
    }, [caseData, currentPlanId, currentPatientId, role]);

    const deletePatient = useCallback((patientId: string) => {
        setPatients(currentPatients => {
            return currentPatients.filter(p => p.id !== patientId);
        });
        // Clear current patient if we're deleting it
        if (currentPatientId === patientId) {
            _setCurrentPatientId(null);
            setCurrentPlanId(null);
            setCaseData(initialCaseData);
        }
    }, [currentPatientId]);

    const savePatient = useCallback(async (patientToSave: Patient) => {
        if (role !== 'DOCTOR') return;

        try {
            const fullName = `${patientToSave.firstName || ''} ${patientToSave.lastName || ''}`.trim();
            const savedPatient = await api.createPatient({
                name: fullName || 'Unknown',
                age: patientToSave.age ? parseInt(patientToSave.age, 10) : null,
                gender: patientToSave.gender
            });

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

            // Update local state
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
            return mappedSavedPatient;
        } catch (e) {
            console.error('Failed to register patient on server', e);
            return undefined;
        }
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

            } catch (e) {
                console.error("Error loading plan", e);
                setCaseData(initialCaseData); // Should we also enforce leg side here? Ideally yes, but error case.
            } finally {
                setIsLoading(false);
            }
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
        setCaseData(prev => ({ ...prev, legSide: side }));
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
