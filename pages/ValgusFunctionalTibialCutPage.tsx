
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import tibiaCutBg from '../assets/tibiacut.png';

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
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#6D282C] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-lg z-20 whitespace-nowrap tracking-wider">
                RECOMMENDED
            </div>
        )}

        {/* SVG Representation of a Metal Cutting Jig */}
        <svg viewBox="0 0 320 130" className={`w-full h-auto max-h-[120px] ${isSelected ? 'drop-shadow-[0_0_10px_rgba(109,40,44,0.6)]' : 'drop-shadow-lg'}`}>
            <defs>
                <linearGradient id={`metalGrad-${degree}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f3f4f6" />
                    <stop offset="20%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#9ca3af" />
                    <stop offset="80%" stopColor="#6b7280" />
                    <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                <linearGradient id="recessGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1f2937" />
                    <stop offset="100%" stopColor="#000000" />
                </linearGradient>
            </defs>

            {isSelected && (
                <path
                    d="M 8,13 L 312,13 Q 317,13 317,18 L 317,72 L 262,117 Q 257,122 252,122 L 68,122 Q 63,122 58,117 L 3,72 L 3,18 Q 3,13 8,13 Z"
                    fill="none"
                    stroke="#6D282C"
                    strokeWidth="4"
                />
            )}

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

            <g transform="rotate(1.5, 160, 29)">
                <rect x="20" y="25" width="280" height="8" rx="4" fill="url(#recessGrad)" stroke="#374151" strokeWidth="0.5" />
            </g>

            <rect x="100" y="45" width="120" height="6" rx="2" fill="url(#recessGrad)" stroke="#374151" strokeWidth="0.5" />

            <circle cx="280" cy="65" r="6" fill="url(#recessGrad)" stroke="#374151" />
            <circle cx="295" cy="75" r="6" fill="url(#recessGrad)" stroke="#374151" />
            <circle cx="280" cy="85" r="6" fill="url(#recessGrad)" stroke="#374151" />

            <text x="100" y="75" fontSize="14" fontFamily="Arial, sans-serif" fontWeight="900" fill="#111827" textAnchor="start" letterSpacing="0.5">
                {degree} DEGREE VARUS
            </text>

            <text x="100" y="92" fontSize="7" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#4b5563" textAnchor="start" letterSpacing="1.5">
                ROBOTRIX+
            </text>

        </svg>
    </div>
);

const ValgusFunctionalTibialCutPage: React.FC = () => {
    const {
        setPage,
        valgusResults,
        valgusCoronalBalancingResults,
        lateralLaxity,
        valgusFunctionalTibialCutImage,
        setValgusFunctionalTibialCutImage,
        setValgusFunctionalCutDegree,
        valgusFunctionalLinesY,
        setValgusFunctionalLinesY
    } = useAppContext();


    // Line Position (Static)
    const [linesYPercent, setLinesYPercent] = useState<number>(31); // Vertical position as %
    const containerRef = useRef<HTMLDivElement>(null);

    // Logic for calculating the anticipated tibial cut based on Valgus results
    const anticipatedVarusCut = useMemo(() => {
        const mpta = valgusResults.mpta;
        if (mpta === null) return 0;

        let varusCut = 0;
        if (mpta <= 85) varusCut = 4;  // Significant varoid (includes out of boundary ≤84)
        else if (mpta <= 87) varusCut = 3;  // Moderate varoid: 85 < MPTA ≤ 87
        else if (mpta <= 88) varusCut = 2;  // Mild varoid: 87 < MPTA ≤ 88
        else if (mpta <= 90) varusCut = 1;  // Neutral tibia: 88 < MPTA ≤ 90
        // MPTA > 90 = 0° (valgoid tibia / neutral cut)

        // Limit to 3 max for Valgus path
        return Math.min(varusCut, 3);
    }, [valgusResults.mpta]);

    // This state tracks the currently recommended cut based on laxity adjustments
    const [currentRecommendation, setCurrentRecommendation] = useState<number>(anticipatedVarusCut);
    const [selectedDegree, setSelectedDegree] = useState<number>(anticipatedVarusCut || 2);

    useEffect(() => {
        if (anticipatedVarusCut > 0) {
            setCurrentRecommendation(anticipatedVarusCut);
            setSelectedDegree(anticipatedVarusCut);
        } else {
            setCurrentRecommendation(2);
            setSelectedDegree(2);
        }
    }, [anticipatedVarusCut]);

    useEffect(() => {
        setValgusFunctionalCutDegree(selectedDegree);
    }, [selectedDegree, setValgusFunctionalCutDegree]);

    useEffect(() => {
        setValgusFunctionalLinesY(linesYPercent);
    }, [linesYPercent, setValgusFunctionalLinesY]);

    useEffect(() => {
        if (!valgusFunctionalTibialCutImage || valgusFunctionalTibialCutImage === '/tibiacut.png') {
            setValgusFunctionalTibialCutImage(tibiaCutBg);
        }
    }, [valgusFunctionalTibialCutImage, setValgusFunctionalTibialCutImage]);


    const applyLateralLaxity = () => {
        let adjustedDegree = anticipatedVarusCut;

        if (lateralLaxity === 'Mild lateral laxity' || lateralLaxity === 'Moderate lateral laxity') {
            adjustedDegree = adjustedDegree - 1;
        } else if (lateralLaxity === 'Severe lateral laxity') {
            adjustedDegree = adjustedDegree - 2;
        }

        adjustedDegree = Math.max(0, adjustedDegree);

        setCurrentRecommendation(adjustedDegree);
        setSelectedDegree(adjustedDegree);
    };

    // No dragging logic needed as per user request (static lines)

    const lateralGapValue = valgusCoronalBalancingResults?.lateralGap || '--';
    const baseMedialGap = valgusCoronalBalancingResults?.selectedSeries || 0;
    const medialGapValue = (baseMedialGap + (selectedDegree * 1.2)).toFixed(1);

    return (
        <div className="relative flex flex-col h-[40rem] overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center no-print shrink-0 px-2 py-1 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0]">Functional Tibia Cut (Valgus)</h2>
                {/* Back Button */}
                <button
                    onClick={() => setPage('planner-valgus-stress-coronal-balancing')}
                    className="group relative py-2 px-4 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-wider">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        BACK
                    </span>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>
            </div>

            <div className="flex flex-col flex-grow relative min-h-0 px-1 relative z-10 overflow-hidden">
                {/* Step Indicator */}
                <div className="text-left shrink-0">
                    <span className="inline-block px-3 py-1 rounded-sm text-sm font-bold bg-[#6D282C] text-white shadow-lg tracking-wider">STEP 5 &gt;</span>
                </div>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr] gap-0 min-h-0 overflow-hidden mt-1">

                    {/* Left Column: Instructions */}
                    <div className="h-full">
                        <div className="relative bg-[#1a1a1a] border border-[#333333] rounded-xl shadow-inner h-full flex flex-col p-1.5 space-y-1 overflow-hidden">
                            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />

                            <div className="relative bg-[#252525] p-3 rounded-lg border-l-4 border-[#6D282C] hover:bg-[#2a2a2a] transition-colors flex-[1.5] flex flex-col justify-center items-center text-center gap-1 z-10 min-h-0">
                                <div className="bg-[#6D282C] text-white w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold shadow-lg border-2 border-[#893338]">
                                    1
                                </div>
                                <p className="text-[14px] text-gray-400 leading-snug">
                                    Choose appropriate <span className="text-white font-bold">Robotrix+ universal varus cutting jigs</span> to do a functional recut of the tibia to open medial gap avoid/minimise soft tissue release.
                                </p>
                            </div>

                            <div className="relative bg-[#252525] p-3 rounded-lg border-l-4 border-[#6D282C] hover:bg-[#2a2a2a] transition-colors flex-[1.5] flex flex-col justify-center items-center text-center gap-1 z-10 min-h-0">
                                <div className="bg-[#6D282C] text-white w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold shadow-lg border-2 border-[#893338]">
                                    2
                                </div>
                                <p className="text-[14px] text-gray-400 leading-snug">
                                    Changing the 90 deg cut by <span className="text-[#ff8fa3] font-bold">1° varus</span> will open the medial gap by <span className="text-[#ff8fa3] font-bold">~ 1.2 mms</span> in average-sized tibia (70 mms width).
                                </p>
                            </div>

                            <div className="relative bg-[#1a1a1a] border-2 border-[#333333] rounded-lg p-2 text-center shadow-lg z-10 flex-[0.8] flex flex-col justify-center min-h-0">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0">Anticipated Cut</p>
                                <p className="text-2xl font-black text-white">{anticipatedVarusCut}° <span className="text-sm">Varus</span></p>
                            </div>

                            <div className="relative bg-[#252525] border border-[#333333] rounded-lg p-2 flex-[0.8] flex flex-col justify-center items-center gap-1 z-10 min-h-0">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0">Laxity Status</p>
                                <p className="text-md font-black text-white">{lateralLaxity || 'Unknown'}</p>
                                <button
                                    onClick={applyLateralLaxity}
                                    className="group relative w-full py-1 bg-[#6D282C] border border-[#893338] rounded-sm 
                                               shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                               transition-all duration-300 ease-out
                                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                               active:scale-[0.98]"
                                >
                                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                                    <span className="relative text-sm font-bold text-white tracking-wider">APPLY LAXITY</span>
                                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Center Column: Image Upload & Red Lines */}
                    <div className="flex flex-col h-full items-center justify-center relative p-0 overflow-hidden">

                        <div
                            ref={containerRef}
                            className="relative h-full w-[80%] max-w-full aspect-[3/4] mx-auto bg-black border-2 border-[#333333] rounded-xl overflow-hidden shadow-2xl group"
                            style={{ touchAction: 'none' }}
                        >

                            {/* Gap Info Overlays */}
                            <div className="absolute top-4 left-4 z-40 bg-[#1a1a1a]/90 backdrop-blur-xl border-2 border-[#333333] rounded-lg px-4 py-3 text-center shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-none min-w-[100px] transform transition-transform hover:scale-105">
                                <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 shadow-black drop-shadow-md">Lateral Gap</p>
                                <p className="text-2xl font-black text-white leading-none drop-shadow-xl">{lateralGapValue} <span className="text-sm text-gray-500 font-bold">mm</span></p>
                            </div>

                            <div className="absolute top-4 right-4 z-40 bg-[#1a1a1a]/90 backdrop-blur-xl border-2 border-[#6D282C] rounded-lg px-4 py-3 text-center shadow-[0_0_30px_rgba(109,40,44,0.3)] pointer-events-none min-w-[100px] transform transition-transform hover:scale-105">
                                <p className="text-[10px] text-[#ff8fa3] uppercase font-extrabold tracking-widest mb-1 shadow-black drop-shadow-md">Medial Gap</p>
                                <p className="text-2xl font-black text-[#ff8fa3] leading-none drop-shadow-xl">{medialGapValue} <span className="text-sm text-[#ff8fa3]/70 font-bold">mm</span></p>
                            </div>

                            {/* Corrected Varus Overlay */}
                            <div className="absolute top-[75%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center text-center">
                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border-2 border-[#333333] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                    <p className="text-gray-500 text-[9px] uppercase tracking-wider font-bold mb-0">Corrected Varus</p>
                                    <p className="text-3xl font-extrabold text-white tracking-tighter">{selectedDegree}°</p>
                                </div>
                            </div>

                            {/* Image Layer */}
                            <img src={tibiaCutBg} alt="X-ray Reference" className="w-full h-full object-contain pointer-events-none" />

                            {/* Red Lines Overlay */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                                <circle cx="0" cy={`${linesYPercent}%`} r="6" fill="#6D282C" />
                                {[0, 1, 2, 3].map(deg => {
                                    const isTarget = deg === selectedDegree;
                                    const yOffsetPercent = deg * 2.5;
                                    return (
                                        <g key={deg}>
                                            <line
                                                x1="0"
                                                y1={`${linesYPercent}%`}
                                                x2="100%"
                                                y2={`${linesYPercent + yOffsetPercent}%`}
                                                stroke={isTarget ? "#6D282C" : "#333333"}
                                                strokeWidth={isTarget ? "4" : "1.5"}
                                                strokeDasharray={isTarget ? "0" : "5,2"}
                                                opacity={isTarget ? 1 : 0.6}
                                            />
                                            {isTarget && (
                                                <text
                                                    x="95%"
                                                    y={`${linesYPercent + yOffsetPercent - 2}%`}
                                                    fill="#6D282C"
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

                        </div>
                    </div>

                    {/* Right Column: Cutting Jigs */}
                    <div className="h-full flex flex-col min-h-0">
                        <div className="relative bg-[#1a1a1a] border border-[#333333] rounded-xl shadow-inner h-full flex flex-col overflow-hidden">
                            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                            <div className="p-1.5 bg-[#252525] border-b border-[#333333] text-center shrink-0 relative z-10">
                                <h3 className="text-sm font-bold text-[#E0E0E0] uppercase tracking-wider">
                                    Robotrix+ Universal Jigs
                                </h3>
                            </div>
                            <div className="p-0.5 flex-grow flex flex-col justify-evenly items-center h-full overflow-hidden relative z-10">
                                <p className="text-center text-gray-500 text-xs mb-0 shrink-0">Click block to simulate</p>

                                {/* 0 Degree Neutral Cut Button */}
                                <div className="flex-1 w-full flex items-center justify-center mb-0">
                                    <button
                                        onClick={() => setSelectedDegree(0)}
                                        className={`w-full py-2 rounded-lg border-2 font-bold text-lg transition-all shadow-lg flex flex-col items-center justify-center relative h-full ${selectedDegree === 0
                                            ? 'bg-gray-200 text-black border-[#6D282C] shadow-[0_0_15px_rgba(109,40,44,0.5)] scale-95 z-10'
                                            : 'bg-[#252525] text-gray-400 border-[#333333] hover:bg-[#333333] hover:text-white scale-90'
                                            }`}
                                    >
                                        {currentRecommendation === 0 && (
                                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#6D282C] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-lg z-20 whitespace-nowrap tracking-wider">
                                                RECOMMENDED
                                            </div>
                                        )}
                                        <span>0 DEGREE</span>
                                        <span className="text-[10px] font-normal opacity-80">NEUTRAL CUT</span>
                                    </button>
                                </div>

                                {/* Jigs 1-3 ONLY (Removed 4) */}
                                {[1, 2, 3].map(deg => (
                                    <div key={deg} className="flex-1 w-full flex items-center justify-center">
                                        <div className="transform scale-90 w-full">
                                            <CuttingBlock
                                                degree={deg}
                                                isRecommended={deg === currentRecommendation}
                                                isSelected={deg === selectedDegree}
                                                onClick={() => setSelectedDegree(deg)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* Footer Action Button */}
            <div className="flex justify-end mt-2 pb-1 shrink-0 px-2 relative z-10">
                <button
                    onClick={() => setPage('planner-valgus-stress-report')}
                    className="group relative py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-wider">
                        VIEW REPORT
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>
            </div>
        </div>
    );
};

export default ValgusFunctionalTibialCutPage;