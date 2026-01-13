import { describe, it, expect, test } from 'vitest';
import {
    getLongLegCpakType,
    getLongLegValgusCut,
    getRecommendedVarusCut,
    classifyJloType,
    getCpakClassification,
} from '../utils/classificationFunctions';

// ============================================================================
// CPAK Classification Test Cases (16 tests)
// ============================================================================

describe('CPAK Classification', () => {
    describe('getLongLegCpakType', () => {
        // Test data from Google Sheet
        const cpakTestCases = [
            // Distal JLO (< 177)
            { id: 'TC-CPAK-01', ahka: -3, jlo: 170, ahkaClass: 'Varus', jloClass: 'Distal', expected: '1' },
            { id: 'TC-CPAK-02', ahka: -2.1, jlo: 176.9, ahkaClass: 'Varus', jloClass: 'Distal', expected: '1' },
            { id: 'TC-CPAK-03', ahka: -2, jlo: 176.9, ahkaClass: 'Neutral', jloClass: 'Distal', expected: '2' },
            { id: 'TC-CPAK-04', ahka: 0, jlo: 175, ahkaClass: 'Neutral', jloClass: 'Distal', expected: '2' },
            { id: 'TC-CPAK-05', ahka: 2, jlo: 176.9, ahkaClass: 'Neutral', jloClass: 'Distal', expected: '2' },
            { id: 'TC-CPAK-06', ahka: 2.1, jlo: 170, ahkaClass: 'Valgus', jloClass: 'Distal', expected: '3' },

            // Neutral JLO (177-183 inclusive)
            { id: 'TC-CPAK-07', ahka: -5, jlo: 177, ahkaClass: 'Varus', jloClass: 'Neutral', expected: '4' },
            { id: 'TC-CPAK-08', ahka: -2.1, jlo: 180, ahkaClass: 'Varus', jloClass: 'Neutral', expected: '4' },
            { id: 'TC-CPAK-09', ahka: -2, jlo: 177, ahkaClass: 'Neutral', jloClass: 'Neutral', expected: '5' },
            { id: 'TC-CPAK-10', ahka: 0, jlo: 180, ahkaClass: 'Neutral', jloClass: 'Neutral', expected: '5' },
            { id: 'TC-CPAK-11', ahka: 2, jlo: 183, ahkaClass: 'Neutral', jloClass: 'Neutral', expected: '5' },
            { id: 'TC-CPAK-12', ahka: 2.1, jlo: 180, ahkaClass: 'Valgus', jloClass: 'Neutral', expected: '6' },
            { id: 'TC-CPAK-13', ahka: 5, jlo: 183, ahkaClass: 'Valgus', jloClass: 'Neutral', expected: '6' },

            // Proximal JLO (> 183)
            { id: 'TC-CPAK-14', ahka: -3, jlo: 183.1, ahkaClass: 'Varus', jloClass: 'Proximal', expected: '7' },
            { id: 'TC-CPAK-15', ahka: -2, jlo: 185, ahkaClass: 'Neutral', jloClass: 'Proximal', expected: '8' },
            { id: 'TC-CPAK-16', ahka: 3, jlo: 190, ahkaClass: 'Valgus', jloClass: 'Proximal', expected: '9' },
        ];

        test.each(cpakTestCases)(
            '$id: aHKA=$ahka ($ahkaClass), JLO=$jlo ($jloClass) → CPAK $expected',
            ({ ahka, jlo, expected }) => {
                expect(getLongLegCpakType(ahka, jlo)).toBe(expected);
            }
        );
    });

    describe('getCpakClassification (Valgus Stress Planner - Obliquity Based)', () => {
        // New Valgus-specific classification based on Distal Obliquity Angle:
        // Angle ≥ 3° → CPAK 2 (Valgoid)
        // 1 ≤ Angle < 3 → CPAK 1 (Median)
        // 0 ≤ Angle < 1 → CPAK 4 (Varoid) or CPAK 5 (if LDFA = MPTA = 90°)

        const valgusObliquityTestCases = [
            // Significant obliquity (≥ 3°) → CPAK 2
            { id: 'VS-CPAK-01', obliquity: 5, ldfa: 85, mpta: 87, expected: '2', desc: 'Angle 5° → Valgoid' },
            { id: 'VS-CPAK-02', obliquity: 3, ldfa: 86, mpta: 88, expected: '2', desc: 'Angle 3° (boundary) → Valgoid' },
            { id: 'VS-CPAK-03', obliquity: 4.5, ldfa: 84, mpta: 89, expected: '2', desc: 'Angle 4.5° → Valgoid' },

            // Mild obliquity (1 ≤ Angle < 3) → CPAK 1
            { id: 'VS-CPAK-04', obliquity: 2, ldfa: 87, mpta: 88, expected: '1', desc: 'Angle 2° → Median' },
            { id: 'VS-CPAK-05', obliquity: 1, ldfa: 88, mpta: 89, expected: '1', desc: 'Angle 1° (boundary) → Median' },
            { id: 'VS-CPAK-06', obliquity: 2.9, ldfa: 86, mpta: 87, expected: '1', desc: 'Angle 2.9° → Median' },

            // Neutral obliquity (0 ≤ Angle < 1) → CPAK 4
            { id: 'VS-CPAK-07', obliquity: 0.5, ldfa: 88, mpta: 87, expected: '4', desc: 'Angle 0.5° → Varoid' },
            { id: 'VS-CPAK-08', obliquity: 0, ldfa: 89, mpta: 88, expected: '4', desc: 'Angle 0° (boundary) → Varoid' },
            { id: 'VS-CPAK-09', obliquity: 0.9, ldfa: 87, mpta: 89, expected: '4', desc: 'Angle 0.9° → Varoid' },

            // Special case: CPAK 5 (only if LDFA = MPTA = 90°)
            { id: 'VS-CPAK-10', obliquity: 0.5, ldfa: 90, mpta: 90, expected: '5', desc: 'Angle 0.5° + LDFA=MPTA=90 → CPAK 5' },
            { id: 'VS-CPAK-11', obliquity: 0, ldfa: 90, mpta: 90, expected: '5', desc: 'Angle 0° + LDFA=MPTA=90 → CPAK 5' },
        ];

        test.each(valgusObliquityTestCases)(
            '$id: $desc (Obliquity=$obliquity, LDFA=$ldfa, MPTA=$mpta) → CPAK $expected',
            ({ obliquity, ldfa, mpta, expected }) => {
                // ahka and jlo are unused in new logic, passing dummy values
                expect(getCpakClassification(0, 180, obliquity, ldfa, mpta)).toBe(expected);
            }
        );

        describe('Boundary Conditions', () => {
            it('Obliquity = 3 should be CPAK 2 (Valgoid)', () => {
                expect(getCpakClassification(0, 180, 3, 88, 89)).toBe('2');
            });

            it('Obliquity = 2.99 should be CPAK 1 (Median)', () => {
                expect(getCpakClassification(0, 180, 2.99, 88, 89)).toBe('1');
            });

            it('Obliquity = 1 should be CPAK 1 (Median)', () => {
                expect(getCpakClassification(0, 180, 1, 88, 89)).toBe('1');
            });

            it('Obliquity = 0.99 should be CPAK 4 (Varoid)', () => {
                expect(getCpakClassification(0, 180, 0.99, 88, 89)).toBe('4');
            });

            it('Obliquity = 0 with LDFA=MPTA=90 should be CPAK 5', () => {
                expect(getCpakClassification(0, 180, 0, 90, 90)).toBe('5');
            });

            it('Obliquity undefined should return "--"', () => {
                expect(getCpakClassification(0, 180)).toBe('--');
            });
        });
    });

    describe('Boundary Conditions - aHKA', () => {
        it('aHKA = -2 should be Neutral (not Varus)', () => {
            expect(getLongLegCpakType(-2, 180)).toBe('5'); // Neutral-Neutral = 5
        });

        it('aHKA = 2 should be Neutral (not Valgus)', () => {
            expect(getLongLegCpakType(2, 180)).toBe('5'); // Neutral-Neutral = 5
        });

        it('aHKA = -2.01 should be Varus', () => {
            expect(getLongLegCpakType(-2.01, 180)).toBe('4'); // Varus-Neutral = 4
        });

        it('aHKA = 2.01 should be Valgus', () => {
            expect(getLongLegCpakType(2.01, 180)).toBe('6'); // Valgus-Neutral = 6
        });
    });

    describe('Boundary Conditions - JLO', () => {
        it('JLO = 177 should be Neutral (not Distal)', () => {
            expect(getLongLegCpakType(0, 177)).toBe('5'); // Neutral-Neutral = 5
        });

        it('JLO = 183 should be Neutral (not Proximal)', () => {
            expect(getLongLegCpakType(0, 183)).toBe('5'); // Neutral-Neutral = 5
        });

        it('JLO = 176.99 should be Distal', () => {
            expect(getLongLegCpakType(0, 176.99)).toBe('2'); // Neutral-Distal = 2
        });

        it('JLO = 183.01 should be Proximal', () => {
            expect(getLongLegCpakType(0, 183.01)).toBe('8'); // Neutral-Proximal = 8
        });
    });
});

// ============================================================================
// Valgus Cut Recommendation Test Cases (10 tests)
// ============================================================================

describe('Valgus Cut Recommendation', () => {
    describe('getLongLegValgusCut', () => {
        // Test data from User's Reference Table (using > instead of >=)
        const valgusCutTestCases = [
            { id: 'TC-CUT-01', ldfa: null, condition: 'null check', expected: '--' },
            { id: 'TC-CUT-02', ldfa: 95, condition: '> 92', expected: '2° valgus cut' },
            { id: 'TC-CUT-03', ldfa: 92, condition: '= 92 (becomes 3°)', expected: '3° valgus cut' },
            { id: 'TC-CUT-04', ldfa: 91.9, condition: '> 91', expected: '3° valgus cut' },
            { id: 'TC-CUT-05', ldfa: 91, condition: '= 91 (becomes 4°)', expected: '4° valgus cut' },
            { id: 'TC-CUT-06', ldfa: 90, condition: '> 88', expected: '4° valgus cut' },
            { id: 'TC-CUT-07', ldfa: 88, condition: '= 88 (becomes 5°)', expected: '5° valgus cut' },
            { id: 'TC-CUT-08', ldfa: 87.5, condition: '> 87', expected: '5° valgus cut' },
            { id: 'TC-CUT-09', ldfa: 87, condition: '= 87 (becomes 6°)', expected: '6° valgus cut' },
            { id: 'TC-CUT-10', ldfa: 86.5, condition: '> 86', expected: '6° valgus cut' },
            { id: 'TC-CUT-11', ldfa: 86, condition: '<= 86 (warning)', expected: '6° valgus cut (Native LDFA out of boundary)' },
        ];

        test.each(valgusCutTestCases)(
            '$id: LDFA=$ldfa ($condition) → "$expected"',
            ({ ldfa, expected }) => {
                expect(getLongLegValgusCut(ldfa)).toBe(expected);
            }
        );
    });

    describe('Boundary Edge Cases', () => {
        it('LDFA just below 92 should give 3° valgus cut', () => {
            expect(getLongLegValgusCut(91.999)).toBe('3° valgus cut');
        });

        it('LDFA just below 91 should give 4° valgus cut', () => {
            expect(getLongLegValgusCut(90.999)).toBe('4° valgus cut');
        });

        it('LDFA just below 88 should give 5° valgus cut', () => {
            expect(getLongLegValgusCut(87.999)).toBe('5° valgus cut');
        });

        it('LDFA just below 87 should give 6° valgus cut', () => {
            expect(getLongLegValgusCut(86.999)).toBe('6° valgus cut');
        });
    });
});

// ============================================================================
// Varus Cut Recommendation Test Cases (10 tests)
// ============================================================================

describe('Varus Cut Recommendation', () => {
    describe('getRecommendedVarusCut', () => {
        // Test data from User's Reference Table (updated to use > 90 for neutral cut)
        const varusCutTestCases = [
            { id: 'TC-VAR-01', mpta: null, condition: 'null check', expected: '--' },
            { id: 'TC-VAR-02', mpta: 95, condition: '> 90', expected: '0° (neutral cut)' },
            { id: 'TC-VAR-03', mpta: 90, condition: '= 90 (becomes 1°)', expected: '1° varus cut' },
            { id: 'TC-VAR-04', mpta: 89.9, condition: '> 88', expected: '1° varus cut' },
            { id: 'TC-VAR-05', mpta: 88, condition: '= 88 (becomes 2°)', expected: '2° varus cut' },
            { id: 'TC-VAR-06', mpta: 87.9, condition: '> 87', expected: '2° varus cut' },
            { id: 'TC-VAR-07', mpta: 87, condition: '= 87 (becomes 3°)', expected: '3° varus cut' },
            { id: 'TC-VAR-08', mpta: 86.9, condition: '> 85', expected: '3° varus cut' },
            { id: 'TC-VAR-09', mpta: 85, condition: '= 85 (becomes 4°)', expected: '4° varus cut' },
            { id: 'TC-VAR-10', mpta: 84.5, condition: '> 84', expected: '4° varus cut' },
            { id: 'TC-VAR-11', mpta: 84, condition: '<= 84 (warning)', expected: '4° varus cut (Native MPTA out of boundary)' },
        ];

        test.each(varusCutTestCases)(
            '$id: MPTA=$mpta ($condition) → "$expected"',
            ({ mpta, expected }) => {
                expect(getRecommendedVarusCut(mpta)).toBe(expected);
            }
        );
    });

    describe('Boundary Edge Cases', () => {
        it('MPTA just below 90 should give 1° varus cut', () => {
            expect(getRecommendedVarusCut(89.999)).toBe('1° varus cut');
        });

        it('MPTA just below 88 should give 2° varus cut', () => {
            expect(getRecommendedVarusCut(87.999)).toBe('2° varus cut');
        });

        it('MPTA just below 87 should give 3° varus cut', () => {
            expect(getRecommendedVarusCut(86.999)).toBe('3° varus cut');
        });

        it('MPTA just below 85 should give 4° varus cut', () => {
            expect(getRecommendedVarusCut(84.999)).toBe('4° varus cut');
        });
    });
});

// ============================================================================
// JLO Type Classification Test Cases
// ============================================================================

describe('JLO Type Classification', () => {
    describe('classifyJloType', () => {
        it('JLO < 177 should be APEX DISTAL', () => {
            expect(classifyJloType(170)).toBe('APEX DISTAL');
            expect(classifyJloType(176.9)).toBe('APEX DISTAL');
        });

        it('JLO 177-183 should be APEX NEUTRAL', () => {
            expect(classifyJloType(177)).toBe('APEX NEUTRAL');
            expect(classifyJloType(180)).toBe('APEX NEUTRAL');
            expect(classifyJloType(183)).toBe('APEX NEUTRAL');
        });

        it('JLO > 183 should be APEX PROXIMAL', () => {
            expect(classifyJloType(183.1)).toBe('APEX PROXIMAL');
            expect(classifyJloType(190)).toBe('APEX PROXIMAL');
        });
    });
});
