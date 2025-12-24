
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

// Reusable Component for the Cutting Jig Visualization
const CuttingBlock: React.FC<{
    degree: number;
    isRecommended: boolean;
    isSelected: boolean;
    onClick: () => void;
}> = ({ degree, isRecommended, isSelected, onClick }) => (
    <div
        onClick={onClick}
        className={`relative flex flex-col items-center transition-all duration-300 cursor-pointer w-full ${isSelected ? 'scale-105 z-10' : 'opacity-60 hover:opacity-100 hover:scale-102'}`}
    >
        {isRecommended && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20 whitespace-nowrap tracking-wider">
                RECOMMENDED
            </div>
        )}

        {/* SVG Representation of a Metal Cutting Jig */}
        <svg viewBox="0 0 320 130" className={`w-full h-auto max-h-[120px] ${isSelected ? 'drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]' : 'drop-shadow-lg'}`}>
            <defs>
                {/* Metallic Surface Gradient */}
                <linearGradient id={`metalGrad-${degree}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f3f4f6" /> {/* gray-100 */}
                    <stop offset="20%" stopColor="#d1d5db" /> {/* gray-300 */}
                    <stop offset="50%" stopColor="#9ca3af" /> {/* gray-400 */}
                    <stop offset="80%" stopColor="#6b7280" /> {/* gray-500 */}
                    <stop offset="100%" stopColor="#374151" /> {/* gray-700 */}
                </linearGradient>

                {/* Recessed/Dark Areas Gradient */}
                <linearGradient id="recessGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1f2937" />
                    <stop offset="100%" stopColor="#000000" />
                </linearGradient>
            </defs>

            {/* Selection Ring */}
            {isSelected && (
                <path
                    d="M 8,13 L 312,13 Q 317,13 317,18 L 317,72 L 262,117 Q 257,122 252,122 L 68,122 Q 63,122 58,117 L 3,72 L 3,18 Q 3,13 8,13 Z"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="4"
                />
            )}

            {/* Jig Body Shape */}
            <path
                d="M 10,15 
                   L 310,15 
                   Q 315,15 315,20 
                   L 315,70 
                   L 260,115 
                   Q 255,120 250,120 
                   L 70,120 
                   Q 65,120 60,115 
                   L 5,70 
                   L 5,20 
                   Q 5,15 10,15 Z"
                fill={`url(#metalGrad-${degree})`}
                stroke="#4b5563"
                strokeWidth="1"
            />

            {/* Main Cutting Slot (Top) - Fixed 1.5 degree slant for all */}
            <g transform="rotate(1.5, 160, 29)">
                <rect x="20" y="25" width="280" height="8" rx="4" fill="url(#recessGrad)" stroke="#374151" strokeWidth="0.5" />
            </g>

            {/* Second Rectangular Black Slot (Below Main Slot) */}
            <rect x="100" y="45" width="120" height="6" rx="2" fill="url(#recessGrad)" stroke="#374151" strokeWidth="0.5" />

            {/* Pin Holes (Right Cluster - Vertical) */}
            <circle cx="280" cy="65" r="6" fill="url(#recessGrad)" stroke="#374151" />
            <circle cx="295" cy="75" r="6" fill="url(#recessGrad)" stroke="#374151" />
            <circle cx="280" cy="85" r="6" fill="url(#recessGrad)" stroke="#374151" />

            {/* Engraved Text */}
            <text x="100" y="75" fontSize="14" fontFamily="Arial, sans-serif" fontWeight="900" fill="#111827" textAnchor="start" letterSpacing="0.5">
                {degree} DEGREE VARUS
            </text>

            <text x="100" y="92" fontSize="7" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#4b5563" textAnchor="start" letterSpacing="1.5">
                ROBOTRIX+
            </text>

        </svg>
    </div>
);

const LongLegFunctionalTibialCutPage: React.FC = () => {
    const {
        setPage,
        longLegResults,
        tibiaBoundary,
        longLegCoronalBalancingResults,
        lateralLaxity,
        longLegFunctionalTibialCutImage,
        setLongLegFunctionalTibialCutImage,
        setLongLegFunctionalCutDegree,
        longLegFunctionalLinesY,
        setLongLegFunctionalLinesY
    } = useAppContext();


    // Line Dragging State
    // Line Position (Static)
    const [linesYPercent, setLinesYPercent] = useState<number>(longLegFunctionalLinesY || 30); // Vertical position as %
    const containerRef = useRef<HTMLDivElement>(null);

    // Logic for calculating the anticipated tibial cut
    const anticipatedVarusCut = useMemo(() => {
        const mpta = longLegResults.mpta;
        if (mpta === null) return 0;

        let varusCut = 0;
        if (mpta < 85) varusCut = 4;
        else if (mpta < 87) varusCut = 3;
        else if (mpta < 88) varusCut = 2;
        else if (mpta < 89) varusCut = 1;

        if (tibiaBoundary === 'basic' && varusCut > 2) {
            varusCut = 2;
        }

        return varusCut;
    }, [longLegResults.mpta, tibiaBoundary]);

    // This state tracks the currently recommended cut based on laxity adjustments
    const [currentRecommendation, setCurrentRecommendation] = useState<number>(anticipatedVarusCut);
    const [selectedDegree, setSelectedDegree] = useState<number>(anticipatedVarusCut || 2);

    // Initialize recommendation
    useEffect(() => {
        if (anticipatedVarusCut > 0) {
            setCurrentRecommendation(anticipatedVarusCut);
            setSelectedDegree(anticipatedVarusCut);
        } else {
            setCurrentRecommendation(2); // Default fallback
            setSelectedDegree(2);
        }
    }, [anticipatedVarusCut]);

    useEffect(() => {
        setLongLegFunctionalCutDegree(selectedDegree);
    }, [selectedDegree, setLongLegFunctionalCutDegree]);

    useEffect(() => {
        setLongLegFunctionalLinesY(linesYPercent);
    }, [linesYPercent, setLongLegFunctionalLinesY]);

    useEffect(() => {
        if (!longLegFunctionalTibialCutImage) {
            setLongLegFunctionalTibialCutImage('/tibiacut.jpeg');
        }
    }, [longLegFunctionalTibialCutImage, setLongLegFunctionalTibialCutImage]);


    const applyLateralLaxity = () => {
        let adjustedDegree = anticipatedVarusCut;

        if (lateralLaxity === 'Mild lateral laxity' || lateralLaxity === 'Moderate lateral laxity') {
            adjustedDegree = adjustedDegree - 1;
        } else if (lateralLaxity === 'Severe lateral laxity') {
            adjustedDegree = adjustedDegree - 2;
        }

        // Ensure non-negative
        adjustedDegree = Math.max(0, adjustedDegree);

        setCurrentRecommendation(adjustedDegree);
        setSelectedDegree(adjustedDegree);
    };

    // No dragging logic needed as per user request (static lines)

    const lateralGapValue = longLegCoronalBalancingResults?.lateralGap || '--';
    const baseMedialGap = longLegCoronalBalancingResults?.selectedSeries || 0;

    // Dynamic Medial Gap: Base Medial Gap + (Selected Degree * 1.2)
    const medialGapValue = (baseMedialGap + (selectedDegree * 1.2)).toFixed(1);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-1 no-print shrink-0">
                <h2 className="text-4xl font-bold text-gray-100">Definitive Functional Tibia Cut (Long leg)</h2>
                <button onClick={() => setPage('planner-long-leg-coronal-balancing')} className="gemini-dark-button font-bold py-1 px-3 rounded-md transition text-sm flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span>Back</span>
                </button>
            </div>

            <div className="flex flex-col flex-grow relative min-h-0">
                {/* Step Indicator */}
                <div className="text-left mb-2 shrink-0">
                    <span className="inline-block px-3 py-1 rounded-full text-base font-bold bg-teal-600 text-white shadow-lg shadow-teal-900/50 tracking-wide">STEP 5 &gt;</span>
                </div>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 h-full">

                    {/* Left Column: Instructions (Span 3) */}
                    <div className="lg:col-span-3 flex flex-col space-y-4 h-full overflow-y-auto pr-1">
                        <div className="gemini-dark-card p-5 rounded-xl border-l-4 border-blue-500 hover:bg-[#2a2b2c] transition-colors flex flex-col items-center text-center gap-3">
                            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-xl font-bold shadow-lg border-2 border-blue-400">
                                1
                            </div>
                            <p className="text-base text-gray-200 leading-relaxed">
                                Choose appropriate <span className="text-blue-400 font-bold">Robotrix+ universal varus cutting jigs</span> to do a functional recut of the tibia to open medial gap avoid/minimise soft tissue release.
                            </p>
                        </div>

                        <div className="gemini-dark-card p-5 rounded-xl border-l-4 border-purple-500 hover:bg-[#2a2b2c] transition-colors flex flex-col items-center text-center gap-3">
                            <div className="bg-purple-600 text-white w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-xl font-bold shadow-lg border-2 border-purple-400">
                                2
                            </div>
                            <p className="text-base text-gray-200 leading-relaxed">
                                Changing the 90 deg cut by <span className="text-purple-400 font-bold">1° varus</span> will open the medial gap by <span className="text-purple-400 font-bold">~ 1.2 mms</span> in average-sized tibia (70 mms width).
                            </p>
                        </div>

                        <div className="bg-yellow-900/40 border-2 border-yellow-600 rounded-xl p-4 text-center shadow-lg mt-auto">
                            <p className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-2">Anticipated Tibia Cut</p>
                            <p className="text-4xl font-extrabold text-yellow-300">{anticipatedVarusCut}° <span className="text-lg">Varus</span></p>
                        </div>

                        <div className="bg-gray-800/60 border border-gray-600 rounded-xl p-4 flex flex-col items-center gap-3">
                            <p className="text-gray-400 text-sm text-center">Laxity Status: <span className="text-white font-bold">{lateralLaxity || 'Unknown'}</span></p>
                            <button
                                onClick={applyLateralLaxity}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg transition-colors text-base"
                            >
                                Apply Lateral Laxity
                            </button>
                        </div>
                    </div>

                    {/* Center Column: Image Upload & Red Lines (Span 5) */}
                    <div className="lg:col-span-5 flex flex-col h-full items-center justify-start relative p-0 overflow-hidden">

                        {/* Container for Image & Lines */}
                        <div
                            ref={containerRef}
                            className="relative aspect-[3/4] h-full mx-auto bg-black border-2 border-gray-700 rounded-xl overflow-hidden shadow-2xl group"
                            style={{ touchAction: 'none' }}
                        >

                            {/* Gap Info Overlays - Symmetrical Display with Highlighting */}

                            {/* Lateral Gap - Left Side */}
                            <div className="absolute top-6 left-6 z-40 bg-gray-900/90 backdrop-blur-xl border-2 border-gray-500 rounded-2xl px-6 py-4 text-center shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-none min-w-[140px] transform transition-transform hover:scale-105">
                                <p className="text-xs text-gray-300 uppercase font-extrabold tracking-widest mb-1 shadow-black drop-shadow-md">Lateral Gap</p>
                                <p className="text-5xl font-black text-white leading-none drop-shadow-xl">{lateralGapValue} <span className="text-xl text-gray-500 font-bold">mm</span></p>
                            </div>

                            {/* Medial Gap - Right Side */}
                            <div className="absolute top-6 right-6 z-40 bg-gray-900/90 backdrop-blur-xl border-2 border-yellow-500 rounded-2xl px-6 py-4 text-center shadow-[0_0_30px_rgba(234,179,8,0.3)] pointer-events-none min-w-[140px] transform transition-transform hover:scale-105">
                                <p className="text-xs text-yellow-500 uppercase font-extrabold tracking-widest mb-1 shadow-black drop-shadow-md">Medial Gap</p>
                                <p className="text-5xl font-black text-yellow-400 leading-none drop-shadow-xl">{medialGapValue} <span className="text-xl text-yellow-700 font-bold">mm</span></p>
                            </div>

                            {/* Corrected Varus Overlay (Centered) - MOVED DOWN AND MADE SMALLER */}
                            <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center text-center">
                                <div className="bg-black/60 backdrop-blur-md px-5 py-3 rounded-xl border-2 border-gray-600 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                    <p className="text-gray-400 text-[10px] uppercase tracking-wider font-bold mb-0">Corrected Varus</p>
                                    <p className="text-4xl font-extrabold text-white tracking-tighter">{selectedDegree}°</p>
                                </div>
                            </div>

                            {/* Image Layer */}
                            <img src="/tibiacut.jpeg" alt="X-ray Reference" className="w-full h-full object-contain pointer-events-none" />

                            {/* Red Lines Overlay */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                                <circle cx="0" cy={`${linesYPercent}%`} r="6" fill="#ef4444" />
                                {[0, 1, 2, 3, 4].map(deg => {
                                    const isTarget = deg === selectedDegree;
                                    const yOffsetPercent = deg * 2.5;
                                    return (
                                        <g key={deg}>
                                            <line
                                                x1="0"
                                                y1={`${linesYPercent}%`}
                                                x2="100%"
                                                y2={`${linesYPercent + yOffsetPercent}%`}
                                                stroke={isTarget ? "#ef4444" : "#7f1d1d"}
                                                strokeWidth={isTarget ? "4" : "1.5"}
                                                strokeDasharray={isTarget ? "0" : "5,2"}
                                                opacity={isTarget ? 1 : 0.6}
                                            />
                                            {isTarget && (
                                                <text
                                                    x="95%"
                                                    y={`${linesYPercent + yOffsetPercent - 2}%`}
                                                    fill="#ef4444"
                                                    fontSize="14"
                                                    fontWeight="bold"
                                                    textAnchor="end"
                                                >
                                                    {deg}°
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Static indicator or just remove it if not needed. Removing as per "stable, dont change any other" */}
                        </div>
                    </div>

                    {/* Right Column: Cutting Jigs (Span 4) */}
                    <div className="lg:col-span-4 h-full flex flex-col min-h-0">
                        <div className="bg-gray-900/40 border-2 border-gray-700 rounded-xl shadow-inner h-full flex flex-col overflow-hidden">
                            <div className="p-2 bg-gray-800/50 border-b border-gray-700 text-center shrink-0">
                                <h3 className="text-lg font-bold text-cyan-400 uppercase tracking-wider">
                                    Robotrix+ Universal Jigs
                                </h3>
                            </div>
                            <div className="p-1 flex-grow flex flex-col justify-evenly items-center h-full overflow-hidden">
                                <p className="text-center text-gray-500 text-[10px] mb-0 shrink-0">Click block to simulate</p>

                                {/* 0 Degree Neutral Cut Button */}
                                <div className="flex-1 w-full flex items-center justify-center max-h-[15%] mb-1">
                                    <button
                                        onClick={() => setSelectedDegree(0)}
                                        className={`w-full py-1 rounded-lg border-2 font-bold text-base transition-all shadow-lg flex flex-col items-center justify-center relative h-full ${selectedDegree === 0
                                            ? 'bg-gray-200 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-95 z-10'
                                            : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white scale-90'
                                            }`}
                                    >
                                        {currentRecommendation === 0 && (
                                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg z-20 whitespace-nowrap tracking-wider">
                                                RECOMMENDED
                                            </div>
                                        )}
                                        <span>0 DEGREE</span>
                                        <span className="text-[10px] font-normal opacity-80">NEUTRAL CUT</span>
                                    </button>
                                </div>

                                {/* Jigs 1-4 */}
                                {[1, 2, 3, 4].map(deg => (
                                    <div key={deg} className="flex-1 w-full flex items-center justify-center max-h-[18%]">
                                        <CuttingBlock
                                            degree={deg}
                                            isRecommended={deg === currentRecommendation}
                                            isSelected={deg === selectedDegree}
                                            onClick={() => setSelectedDegree(deg)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* Footer Action Button */}
            <div className="flex justify-end pb-2 mt-2 shrink-0">
                <button
                    onClick={() => setPage('simulation')}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold text-lg py-2 px-8 rounded-full transition shadow-lg flex items-center gap-2"
                >
                    Proceed to Simulation &rarr;
                </button>
            </div>
        </div>
    );
};

export default LongLegFunctionalTibialCutPage;
