
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Patient, Page, LongLegResults, ValgusResults, LegSide, Landmarks, FunctionalPlannerMode, KneeType } from '../types';
import { savePatients, getPatients, saveCaseData, loadCaseData } from '../utils/storage';

export interface CoronalBalancingResults {
    selectedSeries: number | null;
    lateralGap: string;
    medialRelease: number;
    simFemoralCut: number;
    simTibialCut: number;
    simResectionDepth: number;
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
    valgusFunctionalCutDegree: number;
    longLegFunctionalCutDegree: number;

    // Line Positions Persistence
    valgusFunctionalLinesY: number;
    longLegFunctionalLinesY: number;
}

// Combine all context values into a single interface
interface AppContextType extends CaseData {
    page: Page;
    setPage: (page: Page) => void;
    patients: Patient[];
    savePatient: (patient: Patient) => void;
    currentPatientId: string | null;
    setCurrentPatientId: (id: string | null) => void;
    currentPlanId: string | null;
    setCurrentPlanId: (id: string | null) => void;

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

    setValgusFunctionalCutDegree: (degree: number) => void;
    setLongLegFunctionalCutDegree: (degree: number) => void;

    setValgusFunctionalLinesY: (y: number) => void;
    setLongLegFunctionalLinesY: (y: number) => void;

    isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial states for complex objects
const initialLongLegResults: LongLegResults = { ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', vca: null };
const initialValgusResults: ValgusResults = { obliquity: null, femurType: '--', cpak: '--', cut: '--', ldfa: null, mpta: null };
const initialCoronalBalancingResults: CoronalBalancingResults = { selectedSeries: null, lateralGap: '', medialRelease: 0, simFemoralCut: 3.0, simTibialCut: 0.0, simResectionDepth: 20 };

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
    valgusFunctionalCutDegree: 2,
    longLegFunctionalCutDegree: 2,
    valgusFunctionalLinesY: 30,
    longLegFunctionalLinesY: 30,
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [page, setPage] = useState<Page>('case-management');
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

    // Persist case data to IDB whenever it changes for the current patient/plan
    useEffect(() => {
        if (currentPlanId) {
            saveCaseData(currentPlanId, caseData);
        } else if (currentPatientId) {
            // Fallback for when specific plan isn't selected (shouldn't really happen with new flow, but safe)
            // Or maybe we treat "no plan selected" as "don't save"?
            // For backward compatibility, if only patientId is set, we might be in a "default" state or not.
            // But we changed logic to require a plan ID for saving new stuff properly.
            // However, existing usage of saveCaseData supports `legacy_${patientId}` if passed explicitly.
            // Let's assume the UI manages setting currentPlanId.
            // But wait, if we are in "Default Plan" mode, we might want to save to `legacy_${patientId}`? 
            // Or `caseData_${patientId}` directly.

            // To be safe: checks if we have a planId. If we don't, we probably shouldn't auto-save to some random location
            // unless we are sure. BUT valid legacy behavior was saving to patientId.
            // So if `currentPlanId` is null but `currentPatientId` is set, let's NOT save automatically to avoid overwriting "Default" without intent?
            // Actually, `currentPatientId` is set when we select a patient.
            // We only want to save if a PLAN is active.

            // Revert to: Only save if we have a plan ID OR if we decide to treat patientID as default key (legacy).
            // Let's stick to: we need a planId to save.
            // If the user selects "Default Plan", `currentPlanId` will be `legacy_${patientId}`.
            // So relying on `currentPlanId` is sufficient.
        }
    }, [caseData, currentPlanId]);

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
                    legSide: patientToSave.legSide.toLowerCase() as LegSide,
                };
                await saveCaseData(patientToSave.id, updatedCaseData);
            })();

            return newPatientsList;
        });
    }, [caseData, currentPatientId]);


    const setCurrentPatientId = async (id: string | null) => {
        if (id === currentPatientId) return; // No change, no reset
        _setCurrentPatientId(id);
        setCurrentPlanId(null); // Reset plan when patient changes
        if (id) {
            // We DO NOT load case data here anymore automatically!
            // We wait for the user to select a plan.
            // However, to keep the UI from breaking or showing empty data if they navigate,
            // we might want to clear the case data?
            setCaseData(initialCaseData);

            // Special handling: If we want to support existing flows where we just "load patient",
            // we might need to be careful. But the requirement is "add another planner",
            // implying an interstitial step.
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

    const setPlanAndLoad = async (planId: string | null) => {
        setCurrentPlanId(planId);
        if (planId) {
            setIsLoading(true);
            try {
                const storedData = await loadCaseData(planId);
                // We also need to ensure legSide is correct for the patient if it's a new plan?
                // The plan might have stored data.
                // If it's a new plan, storedData is null (or we should initialize it before calling this?)

                // If we are creating a new plan, we probably want to init with patient defaults.
                // We can handle that in the UI or here.
                // If storedData is found, use it.
                if (storedData) {
                    setCaseData({ ...initialCaseData, ...storedData });
                } else {
                    // Start fresh
                    setCaseData(initialCaseData);
                    // If we have a current patient, we should probably set legSide from it?
                    if (currentPatientId) {
                        const patient = patients.find(p => p.id === currentPatientId);
                        if (patient) {
                            setCaseData(prev => ({ ...prev, legSide: patient.legSide.toLowerCase() as LegSide }));
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading plan", e);
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

    const value: AppContextType = {
        page,
        setPage,
        patients,
        savePatient,
        currentPatientId,
        setCurrentPatientId,
        currentPlanId,
        setCurrentPlanId: setPlanAndLoad,
        isLoading,
        ...caseData,
        setLegSide: createSetter('legSide'),
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
