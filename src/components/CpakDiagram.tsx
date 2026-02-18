import React from 'react';

export const CpakDiagram: React.FC<{ cpakType: string | null }> = ({ cpakType }) => {
    if (!cpakType || cpakType === '--') return null;

    // Logic for diagrams:
    // Columns (Alignment):
    // Varus (Types 1, 4, 7): Bow legs < >
    // Neutral (Types 2, 5, 8): Straight | |
    // Valgus (Types 3, 6, 9): Knock knees > <

    // Rows (JLO):
    // Distal (Types 1, 2, 3): Slopes down \ /
    // Neutral (Types 4, 5, 6): Flat | | (Cross)
    // Proximal (Types 7, 8, 9): Slopes up / \

    const diagrams: { [key: string]: React.JSX.Element } = {
        // TYPE 1: Distal Varus (Bow legs < > + Slope down \ /)
        '1': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Left Leg: Bowed out (<) */}
            <path d="M 20 0 L 15 30 L 20 60" />
            {/* Right Leg: Bowed out (>) */}
            <path d="M 40 0 L 45 30 L 40 60" />
            {/* Joint Line: Distal (\ /) */}
            <path d="M 10 28 L 22 32" />
            <path d="M 50 28 L 38 32" />
        </g></svg>,

        // TYPE 2: Distal Neutral (Straight | | + Slope down \ /)
        '2': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Legs Straight */}
            <path d="M 15 0 L 15 60" />
            <path d="M 45 0 L 45 60" />
            {/* Joint Line: Distal */}
            <path d="M 10 28 L 20 32" />
            <path d="M 50 28 L 40 32" />
        </g></svg>,

        // TYPE 3: Distal Valgus (Knock knees > < + Slope down \ /)
        '3': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Left Leg: Knocked in (>) */}
            <path d="M 15 0 L 20 30 L 15 60" />
            {/* Right Leg: Knocked in (<) */}
            <path d="M 45 0 L 40 30 L 45 60" />
            {/* Joint Line: Distal */}
            <path d="M 10 28 L 22 32" />
            <path d="M 50 28 L 38 32" />
        </g></svg>,

        // TYPE 4: Neutral Varus (Bow legs < > + Flat -)
        '4': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Left Leg: Bowed out (<) */}
            <path d="M 20 0 L 15 30 L 20 60" />
            {/* Right Leg: Bowed out (>) */}
            <path d="M 40 0 L 45 30 L 40 60" />
            {/* Joint Line: Flat */}
            <path d="M 10 30 L 22 30" />
            <path d="M 50 30 L 38 30" />
        </g></svg>,

        // TYPE 5: Neutral Neutral (Straight | | + Flat -)
        '5': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Legs Straight */}
            <path d="M 15 0 L 15 60" />
            <path d="M 45 0 L 45 60" />
            {/* Joint Line: Flat */}
            <path d="M 10 30 L 20 30" />
            <path d="M 50 30 L 40 30" />
        </g></svg>,

        // TYPE 6: Neutral Valgus (Knock knees > < + Flat -)
        '6': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Left Leg: Knocked in (>) */}
            <path d="M 15 0 L 20 30 L 15 60" />
            {/* Right Leg: Knocked in (<) */}
            <path d="M 45 0 L 40 30 L 45 60" />
            {/* Joint Line: Flat */}
            <path d="M 10 30 L 22 30" />
            <path d="M 50 30 L 38 30" />
        </g></svg>,

        // TYPE 7: Proximal Varus (Bow legs < > + Slope up / \)
        '7': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Left Leg: Bowed out (<) */}
            <path d="M 20 0 L 15 30 L 20 60" />
            {/* Right Leg: Bowed out (>) */}
            <path d="M 40 0 L 45 30 L 40 60" />
            {/* Joint Line: Proximal */}
            <path d="M 10 32 L 22 28" />
            <path d="M 50 32 L 38 28" />
        </g></svg>,

        // TYPE 8: Proximal Neutral (Straight | | + Slope up / \)
        '8': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Legs Straight */}
            <path d="M 15 0 L 15 60" />
            <path d="M 45 0 L 45 60" />
            {/* Joint Line: Proximal */}
            <path d="M 10 32 L 20 28" />
            <path d="M 50 32 L 40 28" />
        </g></svg>,

        // TYPE 9: Proximal Valgus (Knock knees > < + Slope up / \)
        '9': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Left Leg: Knocked in (>) */}
            <path d="M 15 0 L 20 30 L 15 60" />
            {/* Right Leg: Knocked in (<) */}
            <path d="M 45 0 L 40 30 L 45 60" />
            {/* Joint Line: Proximal */}
            <path d="M 10 32 L 22 28" />
            <path d="M 50 32 L 38 28" />
        </g></svg>,
    };
    return <div className="h-14 w-14 md:h-16 md:w-16 text-[#ff8fa3]">{diagrams[cpakType] || null}</div>;
};
