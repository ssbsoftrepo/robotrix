


export interface Patient {
    id: string;
    pid?: string;
    date: string;
    firstName: string;
    lastName: string;
    age: string;
    gender: 'Male' | 'Female' | 'Other';
}

export type LegSide = 'left' | 'right';

export interface Point {
    x: number;
    y: number;
}

export interface Landmarks {
    [key: string]: Point;
}

export interface LongLegResults {
    ldfa: number | null;
    mpta: number | null;
    ahka: number | null;
    mhka: number | null;
    jlo: number | null;
    jloType: string;
    cpak: string;
    cut: string;
    recommendedVarusCut: string;
    ama: number | null;
}

export interface ValgusResults {
    obliquity: number | null;
    femurType: string;           // LDFA-based classification
    femurTypeByObliquity: string; // Obliquity-based classification (Valgoid/Median/Varoid)
    cpak: string;
    cut: string;
    ldfa: number | null;
    mpta: number | null;
    ahka?: number | null;
    jlo?: number | null;
    tibiaType?: string;
    tibialCut?: string;
}

export type FunctionalPlannerMode = 'tibial_check' | 'alignment_check';
export type KneeType = 'varus' | 'valgus';


export type Page =
    'case-management' |
    'planner-long-leg' |
    'planner-valgus-stress' |
    'planner-valgus-stress-results' |
    'planner-valgus-stress-coronal-balancing' |
    'planner-valgus-stress-laxity-check' |
    'planner-valgus-stress-report' |
    'planner-valgus-functional-tibial-cut' |
    'simulation' |
    'report' |
    'results-analysis' |
    'past-case-result' |
    'past-case-valgus-result' |
    'planner-long-leg-laxity-check' |
    'planner-long-leg-coronal-balancing' |
    'planner-long-leg-functional-tibial-cut' |
    'intra-operative-validation' |
    'intra-operative-coronal-balancing' |
    'valgus-intra-operative-validation' |
    'valgus-intra-operative-coronal-balancing';

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

    coronalBalancingSimImage: string | null;
    postOpLongLegImage: string | null;
    postOpLongLegLandmarks: Landmarks;
    postOpLongLegResults: Partial<LongLegResults>;

    postOpValgusImage: string | null;
    postOpValgusLandmarks: Landmarks;
    postOpValgusResults: Partial<ValgusResults>;

    longLegCoronalBalancingMainImage: string | null;
    longLegCoronalBalancingBlockImage: string | null;
    longLegFunctionalTibialCutImage: string | null;

    valgusCoronalBalancingMainImage: string | null;
    valgusCoronalBalancingBlockImage: string | null;
    valgusFunctionalTibialCutImage: string | null;

    resultAnalysisFemoralImage: string | null;
    resultAnalysisTibialImage: string | null;

    valgusLaxityReferenceImages: Record<string, string | null>;
    longLegLaxityReferenceImages: Record<string, string | null>;

    valgusFunctionalCutDegree: number | null;
    longLegFunctionalCutDegree: number | null;

    valgusFunctionalLinesY: number;
    longLegFunctionalLinesY: number;
    intraOpValidationData: IntraOpValidationData;
    valgusIntraOpValidationData: IntraOpValidationData;
    intraOpCoronalBalancingData: IntraOpCoronalBalancingData;
    valgusIntraOpCoronalBalancingData: IntraOpCoronalBalancingData;
}

export const initialLongLegResults: LongLegResults = { ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', ama: null };
export const initialValgusResults: ValgusResults = { obliquity: null, femurType: '--', femurTypeByObliquity: '--', cpak: '--', cut: '--', ldfa: null, mpta: null };
export const initialCoronalBalancingResults: CoronalBalancingResults = { selectedSeries: null, lateralGap: '', medialRelease: 0, simFemoralCut: 3.0, simTibialCut: 0.0, simResectionDepth: 20 };
export const initialIntraOpValidationData: IntraOpValidationData = { medialGap: 16, lateralGap: 16, tibiaWidth: 70 };
export const initialIntraOpCoronalBalancingData: IntraOpCoronalBalancingData = { additionalFemurCut: 0, additionalTibiaCut: 0, additionalLaxity: 0, functionalTibiaCutDegree: null };

export const initialCaseData: CaseData = {
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

