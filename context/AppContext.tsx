
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Patient, Page, LongLegResults, ValgusResults, LegSide, Landmarks, FunctionalPlannerMode, KneeType } from '../types';
import { savePatients, getPatients, saveCaseData, loadCaseData, updatePlanLegSide } from '../utils/storage';

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
    intraOpCoronalBalancingData: IntraOpCoronalBalancingData;
}

// Combine all context values into a single interface
interface AppContextType extends CaseData {
    page: Page;
    setPage: (page: Page) => void;
    previousPage: Page | null;
    setPreviousPage: (page: Page | null) => void;
    patients: Patient[];
    savePatient: (patient: Patient) => void;
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
    setIntraOpCoronalBalancingData: (data: IntraOpCoronalBalancingData) => void;

    isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial states for complex objects
const initialLongLegResults: LongLegResults = { ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', vca: null };
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
    intraOpCoronalBalancingData: initialIntraOpCoronalBalancingData,
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [page, setPage] = useState<Page>('case-management');
    const [previousPage, setPreviousPage] = useState<Page | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [currentPatientId, _setCurrentPatientId] = useState<string | null>(null);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // All data for the currently loaded patient is in this state object.
    const [caseData, setCaseData] = useState<CaseData>(initialCaseData);

    // Load patients list on mount
    useEffect(() => {
        getPatients().then(setPatients);
    }, []);

    // Reactively sync legSide logic REMOVED. Leg Side is now Plan-specific.

    // Persist case data to IDB whenever it changes for the current patient/plan
    useEffect(() => {
        if (currentPlanId) {
            saveCaseData(currentPlanId, caseData);
        } else if (currentPatientId) {
            // See note below about legacy saving behavior
        }
    }, [caseData, currentPlanId]);

    const deletePatient = useCallback((patientId: string) => {
        setPatients(currentPatients => {
            const newPatientsList = currentPatients.filter(p => p.id !== patientId);
            savePatients(newPatientsList);
            return newPatientsList;
        });
        // Clear current patient if we're deleting it
        if (currentPatientId === patientId) {
            _setCurrentPatientId(null);
            setCurrentPlanId(null);
            setCaseData(initialCaseData);
        }
    }, [currentPatientId]);

    const savePatient = useCallback((patientToSave: Patient) => {
        setPatients(currentPatients => {
            const index = currentPatients.findIndex(p => p.id === patientToSave.id);
            const isNewPatient = index === -1;
            const newPatientsList = [...currentPatients];

            if (isNewPatient) {
                newPatientsList.push(patientToSave);
            } else {
                newPatientsList[index] = patientToSave;
            }

            savePatients(newPatientsList);

            // We also need to Initialize case data for new patient or update legside
            // Async load check not needed here as we are in sync flow usually, 
            // but strictly speaking we should probably just save the current caseData if it matches ID,
            // or load/mix.
            // Original logic was: load base, merge, save.
            // Since this is usually used to CREATE/UPDATE patient metadata, 
            // case data might not be loaded yet if we are in case management page?
            // Actually savePatient is called when creating a NEW patient usually.

            // Let's assume for new patient we just want to ensure entry exists.
            // We can fire-and-forget the case data update

            (async () => {
                let currentData = initialCaseData;
                // If we are currently editing this patient, use state
                if (currentPatientId === patientToSave.id) {
                    currentData = caseData;
                } else {
                    // Try to load existing
                    const existing = await loadCaseData(patientToSave.id);
                    if (existing) currentData = existing;
                }

                const updatedCaseData = {
                    ...initialCaseData, // Ensure defaults
                    ...currentData,
                    // legSide: patientToSave.legSide.toLowerCase() as LegSide, // REMOVED: Patient no longer has legSide
                };
                await saveCaseData(patientToSave.id, updatedCaseData);
            })();

            return newPatientsList;
        });
    }, [caseData, currentPatientId]);


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
        setIntraOpCoronalBalancingData: createSetter('intraOpCoronalBalancingData'),
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
