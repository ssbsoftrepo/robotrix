
import { Page as Page_2 } from './types';

export interface Patient {
    id: string;
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
    vca: number | null;
}

export interface ValgusResults {
    obliquity: number | null;
    femurType: string;
    cpak: string;
    cut: string;
    ldfa: number | null;
    mpta: number | null;
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
    'planner-long-leg-functional-tibial-cut';
