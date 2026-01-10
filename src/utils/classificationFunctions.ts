/**
 * Classification Functions for Orthopedic Planning
 * 
 * These pure functions calculate CPAK classification and cut recommendations
 * based on biomechanical measurements (LDFA, MPTA, aHKA, JLO).
 */

/**
 * Get CPAK Type (1-9) based on aHKA alignment and JLO classification.
 * 
 * aHKA Classification:
 *   - Varus: < -2
 *   - Neutral: -2 to 2 (inclusive)
 *   - Valgus: > 2
 * 
 * JLO Classification:
 *   - Distal: < 177
 *   - Neutral: 177 to 183 (inclusive)
 *   - Proximal: > 183
 * 
 * @param ahka - Arithmetic Hip-Knee-Ankle angle (MPTA - LDFA)
 * @param jlo - Joint Line Orientation (MPTA + LDFA)
 * @returns CPAK type as string ('1' through '9')
 */
export const getLongLegCpakType = (ahka: number, jlo: number): string => {
    let ahkaClass: 'varus' | 'neutral' | 'valgus';

    // aHKA classification: strictly < -2 for varus, strictly > 2 for valgus
    if (ahka < -2) ahkaClass = 'varus';
    else if (ahka > 2) ahkaClass = 'valgus';
    else ahkaClass = 'neutral';

    let jloClass: 'distal' | 'neutral' | 'proximal';

    // JLO classification: strictly < 177 for distal, strictly > 183 for proximal
    if (jlo < 177) jloClass = 'distal';
    else if (jlo > 183) jloClass = 'proximal';
    else jloClass = 'neutral';

    // CPAK matrix based on alignment and joint line orientation
    if (jloClass === 'distal') {
        if (ahkaClass === 'varus') return '1';
        if (ahkaClass === 'neutral') return '2';
        return '3'; // valgus
    }
    if (jloClass === 'neutral') {
        if (ahkaClass === 'varus') return '4';
        if (ahkaClass === 'neutral') return '5';
        return '6'; // valgus
    }
    // Proximal
    if (ahkaClass === 'varus') return '7';
    if (ahkaClass === 'neutral') return '8';
    return '9'; // valgus
};

/**
 * Get recommended valgus cut for femur based on LDFA.
 * 
 * @param ldfa - Lateral Distal Femoral Angle (nullable)
 * @returns Recommended cut string
 */
export const getLongLegValgusCut = (ldfa: number | null): string => {
    if (ldfa === null) return '--';
    if (ldfa > 92) return '2° valgus cut';
    if (ldfa > 91) return '3° valgus cut';
    if (ldfa > 88) return '4° valgus cut';
    if (ldfa > 87) return '5° valgus cut';
    if (ldfa > 86) return '6° valgus cut';
    return '6° valgus cut (Warning: Native LDFA out of boundary)';
};

/**
 * Get recommended varus cut for tibia based on MPTA.
 * 
 * @param mpta - Medial Proximal Tibial Angle (nullable)
 * @returns Recommended cut string
 */
export const getRecommendedVarusCut = (mpta: number | null): string => {
    if (mpta === null) return '--';
    if (mpta > 89) return '0° (neutral cut)';
    if (mpta > 88) return '1° varus cut';
    if (mpta > 87) return '2° varus cut';
    if (mpta > 85) return '3° varus cut';
    if (mpta > 84) return '4° varus cut';
    return '4° varus cut (Warning: Native MPTA out of boundary)';
};

/**
 * Classify JLO type based on joint line orientation sum.
 * 
 * @param jlo - Joint Line Orientation (MPTA + LDFA)
 * @returns JLO classification string
 */
export const classifyJloType = (jlo: number): string => {
    if (jlo < 177) return 'APEX DISTAL';
    if (jlo > 183) return 'APEX PROXIMAL';
    return 'APEX NEUTRAL';
};

/**
 * CPAK classification for Valgus Stress planner (same logic as Long Leg).
 * 
 * @param ahka - Arithmetic Hip-Knee-Ankle angle
 * @param jlo - Joint Line Orientation
 * @param obliquity - Optional obliquity value (not used in classification)
 * @returns CPAK type as string ('1' through '9')
 */
export const getCpakClassification = (ahka: number, jlo: number, obliquity?: number): string => {
    // Same logic as getLongLegCpakType
    let alignment = 'neutral';
    if (ahka < -2) alignment = 'varus';
    else if (ahka > 2) alignment = 'valgus';
    else alignment = 'neutral';

    let jointLine = 'neutral';
    if (jlo < 177) jointLine = 'distal';
    else if (jlo > 183) jointLine = 'proximal';
    else jointLine = 'neutral';

    if (jointLine === 'distal') {
        if (alignment === 'varus') return '1';
        if (alignment === 'neutral') return '2';
        return '3';
    }
    if (jointLine === 'neutral') {
        if (alignment === 'varus') return '4';
        if (alignment === 'neutral') return '5';
        return '6';
    }
    // Proximal
    if (alignment === 'varus') return '7';
    if (alignment === 'neutral') return '8';
    return '9';
};
