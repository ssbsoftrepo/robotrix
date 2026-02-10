
import React from 'react';
import { useAppContext } from '../context/AppContext';

const getCpakType = (ahka: number, jlo: number): string => {
    let ahkaClass: 'varus' | 'neutral' | 'valgus';
    if (ahka < -2) ahkaClass = 'varus';
    else if (ahka > 2) ahkaClass = 'valgus';
    else ahkaClass = 'neutral';

    let jloClass: 'distal' | 'neutral' | 'proximal';
    if (jlo < 177) jloClass = 'distal';
    else if (jlo > 183) jloClass = 'proximal';
    else jloClass = 'neutral';

    if (jloClass === 'distal') {
        if (ahkaClass === 'varus') return '1';
        if (ahkaClass === 'neutral') return '2';
        return '3';
    }
    if (jloClass === 'neutral') {
        if (ahkaClass === 'varus') return '4';
        if (ahkaClass === 'neutral') return '5';
        return '6';
    }
    if (ahkaClass === 'varus') return '7';
    if (ahkaClass === 'neutral') return '8';
    return '9';
};

const CuttingBlock: React.FC<{
    degree: number;
    isSelected: boolean;
    isRecommended: boolean;
    onClick: () => void;
}> = ({ degree, isSelected, isRecommended, onClick }) => (
    <div
        onClick={onClick}
        className={`relative flex flex-col items-center transition-all duration-300 cursor-pointer w-full ${isSelected ? 'scale-105 z-10' : 'opacity-60 hover:opacity-100'}`}
    >
        {isRecommended && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#6D282C] text-white text-[8px] font-black px-2 py-0.5 rounded-sm shadow-lg z-20 whitespace-nowrap tracking-wider border border-[#ff8fa3]/30">
                RECOMMENDED
            </div>
        )}

        <svg viewBox="0 0 320 130" className={`w-full h-auto max-h-[70px] ${isSelected ? 'drop-shadow-[0_0_10px_rgba(109,40,44,0.6)]' : 'drop-shadow-lg'}`}>
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
                    stroke="#ff8fa3"
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

            <text x="100" y="75" fontSize="16" fontFamily="Arial, sans-serif" fontWeight="900" fill="#111827" textAnchor="start" letterSpacing="0.5">
                {degree} DEGREE VARUS
            </text>

            <text x="100" y="94" fontSize="8" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#4b5563" textAnchor="start" letterSpacing="1.5">
                ROBOTRIX+
            </text>
        </svg>
    </div>
);

const IntraOperativeCoronalBalancingPage: React.FC = () => {
    const {
        setPage,
        setPreviousPage,
        longLegResults,
        implantThickness,
        intraOpValidationData,
        intraOpCoronalBalancingData,
        setIntraOpCoronalBalancingData,
        kneeType,
        lateralLaxity,
    } = useAppContext();

    const handleCheckLaxity = () => {
        if (kneeType === 'valgus') {
            setPreviousPage('planner-long-leg-coronal-balancing');
            setPage('planner-valgus-stress-laxity-check');
        } else {
            setPreviousPage('planner-long-leg-coronal-balancing');
            setPage('planner-long-leg-laxity-check');
        }
    };

    const { additionalFemurCut, additionalTibiaCut, additionalLaxity } = intraOpCoronalBalancingData;
    const { medialGap, lateralGap, tibiaWidth } = intraOpValidationData;

    const thickness = implantThickness ?? 10;
    const C = (tibiaWidth / 70) * 1.2;

    const baseMedial = medialGap + additionalFemurCut + additionalTibiaCut;
    const baseLateral = lateralGap + additionalFemurCut + additionalTibiaCut;

    const LMT = thickness - additionalLaxity;

    const thetaValue = Math.round((LMT - baseMedial) / C);
    const recommendedTheta = Math.max(0, Math.min(4, thetaValue));

    const [selectedJig, setSelectedJig] = React.useState<number>(recommendedTheta);

    React.useEffect(() => {
        setSelectedJig(recommendedTheta);
    }, [recommendedTheta]);

    const nativeLDFA = longLegResults.ldfa ?? 87;
    const nativeMPTA = longLegResults.mpta ?? 87;
    let nativeCPAK = longLegResults.cpak;

    // Fallback calculation if CPAK is not present
    if (!nativeCPAK || ['--', 'N/A'].includes(nativeCPAK)) {
        const currentAhka = nativeMPTA - nativeLDFA;
        const currentJlo = nativeMPTA + nativeLDFA;
        nativeCPAK = getCpakType(currentAhka, currentJlo);
    }

    const finalSimulatedMedialGap = baseMedial + (selectedJig * C);
    const simulatedLDFA = nativeLDFA + 3 + additionalFemurCut;
    const simulatedMPTA = nativeMPTA + selectedJig + additionalTibiaCut;

    const simulatedAHKA = simulatedMPTA - simulatedLDFA;
    const simulatedJLO = simulatedMPTA + simulatedLDFA;
    const simulatedCPAK = getCpakType(simulatedAHKA, simulatedJLO);

    const handleUpdateData = (field: string, delta: number) => {
        setIntraOpCoronalBalancingData({
            ...intraOpCoronalBalancingData,
            [field]: Math.max(0, (intraOpCoronalBalancingData as any)[field] + delta)
        });
    };

    return (
        <div className="relative flex flex-col h-[44rem] overflow-hidden bg-[#0A0A0A]">
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-red-900/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="flex justify-between items-center no-print shrink-0 px-2 py-1 relative z-10 border-b border-[#333333] bg-black/40">
                <h2 className="text-xl font-bold text-[#E0E0E0] tracking-tighter uppercase">Intra-operative Coronal Balancing</h2>
            </div>

            <div className="flex-grow grid grid-cols-[25fr_50fr_25fr] gap-2 min-h-0 p-2 relative z-10">
                {/* Column 1: Simulation Controls */}
                <div className="h-full flex flex-col gap-2">
                    <div className="bg-[#111111] border border-[#222222] p-4 rounded-xl flex flex-col gap-6 h-full shadow-2xl">
                        <p className="text-[#ff8fa3] text-[11px] font-black leading-tight uppercase tracking-widest italic opacity-80">
                            Aim for lateral space to match the minimum composite thickness of your TKR system
                        </p>

                        <div className="space-y-6">
                            {/* Femur Cut */}
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center">Additional foundational distal femoral cut resection</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('additionalFemurCut', -1)} className="w-10 h-10 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-xl hover:bg-[#6D282C] transition-colors">-</button>
                                    <div className="w-20 py-2 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{additionalFemurCut}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('additionalFemurCut', 1)} className="w-10 h-10 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-xl hover:bg-[#6D282C] transition-colors">+</button>
                                </div>
                            </div>

                            {/* Tibia Cut */}
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center">Additional provisional 90 deg tibial cut resection</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('additionalTibiaCut', -1)} className="w-10 h-10 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-xl hover:bg-[#6D282C] transition-colors">-</button>
                                    <div className="w-20 py-2 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{additionalTibiaCut}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('additionalTibiaCut', 1)} className="w-10 h-10 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-xl hover:bg-[#6D282C] transition-colors">+</button>
                                </div>
                            </div>

                            {/* Laxity */}
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center">Apply Pre-op lateral laxity</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('additionalLaxity', -1)} className="w-10 h-10 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-xl hover:bg-[#6D282C] transition-colors">-</button>
                                    <div className="w-20 py-2 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{additionalLaxity}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('additionalLaxity', 1)} className="w-10 h-10 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-xl hover:bg-[#6D282C] transition-colors">+</button>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col items-center gap-3">
                                <button onClick={handleCheckLaxity} className="w-full py-2 bg-[#6D282C] text-white text-[10px] font-black rounded-sm border border-[#893338] shadow-lg">CHECK LATERAL LAXITY</button>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Laxity Level:</span>
                                    <span className="text-[10px] font-black text-pink-400 uppercase">{lateralLaxity ?? 'Not checked'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-[#333333]">
                            <div className="bg-black/80 border border-[#333333] p-4 rounded flex justify-between items-center">
                                <span className="text-[12px] font-black text-white uppercase tracking-widest">Native CPAK</span>
                                <span className="text-xl font-black text-[#ff8fa3]">
                                    {['--', 'N/A'].includes(nativeCPAK) ? nativeCPAK : `Type ${nativeCPAK}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Visual Simulation */}
                <div className="h-full flex flex-col gap-2">
                    <div className="relative flex-grow bg-[#1a1a1a] border border-[#333333] rounded-xl flex flex-col items-center justify-start p-1 overflow-hidden">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />

                        {/* Horizontal layout: Lateral Box - Image - Medial Box */}
                        <div className="flex items-center justify-center gap-4 flex-grow w-full relative">
                            {/* Left Box - Lateral Gap */}
                            <div className="flex flex-col items-center shrink-0 z-20">
                                <div className="bg-black/80 border-2 border-[#333333] rounded-lg px-4 py-3 text-center shadow-lg">
                                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-wider mb-1">LATERAL</p>
                                    <p className="text-3xl font-black text-white">{baseLateral}<span className="text-sm text-gray-400 ml-1">mm</span></p>
                                </div>
                            </div>

                            {/* Center - Bone Image */}
                            <div className="flex-grow flex items-center justify-center max-h-full relative w-full">
                                <img src="/intracoronal.png" alt="Simulation" className="h-full w-full object-contain" />

                                {/* Simulation Cut Lines - positioned to overlay on bone */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                                    {/* Femur horizontal cut line - at bottom edge of femur */}
                                    <line
                                        x1="10" y1={`${58 - additionalFemurCut * 1}`}
                                        x2="90" y2={`${58 - additionalFemurCut * 1}`}
                                        stroke="#6D282C" strokeWidth="1.5"
                                    />

                                    {/* Baseline Tibia dotted line - at top edge of tibia */}
                                    <line x1="10" y1="57" x2="90" y2="57" stroke="#444444" strokeWidth="0.5" strokeDasharray="2,1" />

                                    {/* Dynamic Tibia horizontal cut - at top edge of tibia */}
                                    <line
                                        x1="10" y1={`${71 + additionalTibiaCut * 1}`}
                                        x2="90" y2={`${71 + additionalTibiaCut * 1}`}
                                        stroke="#6D282C" strokeWidth="1.5"
                                    />

                                    {/* Varus Angle Lines - fan out from left pivot on tibia */}
                                    {[0, 1, 2, 3, 4].map((angle) => {
                                        const isSelected = selectedJig === angle;
                                        const yOffset = angle * 1.5; // Each degree adds offset to right side
                                        const baseY = 71 + additionalTibiaCut * 1;
                                        return (
                                            <line
                                                key={angle}
                                                x1="10" y1={`${baseY}`}
                                                x2="90" y2={`${baseY + yOffset}`}
                                                stroke={isSelected ? "#ff8fa3" : "#555555"}
                                                strokeWidth={isSelected ? "1.2" : "0.5"}
                                                strokeDasharray={isSelected ? "" : "2,1"}
                                                opacity={isSelected ? 1 : 0.5}
                                            />
                                        );
                                    })}
                                </svg>

                                {/* Angle indicator box inside bone */}
                                <div className="absolute bottom-[15%] bg-black/80 border border-[#333333] px-4 py-2 rounded-lg shadow-lg">
                                    <span className="text-lg font-black text-white">{selectedJig}°</span>
                                </div>
                            </div>

                            {/* Right Box - Medial Gap */}
                            <div className="flex flex-col items-center shrink-0 z-20">
                                <div className="bg-black/80 border-2 border-[#6D282C] rounded-lg px-4 py-3 text-center shadow-lg">
                                    <p className="text-[#ff8fa3] text-[9px] font-black uppercase tracking-wider mb-1">MEDIAL</p>
                                    <p className="text-3xl font-black text-[#ff8fa3]">{baseMedial}<span className="text-sm text-[#ff8fa3]/70 ml-1">mm</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Footer */}
                        <div className="w-full flex justify-between items-end mt-2">
                            <div className="flex flex-col items-start gap-1">
                                <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Phenotype Retention Analysis</p>
                                <p className="text-[10px] font-black text-green-500 uppercase px-2 py-0.5 bg-green-500/10 border border-green-500/30">Constitutional Match</p>
                            </div>
                            <div className="h-10 w-20 bg-green-500 flex items-center justify-center rounded-sm">
                                <span className="text-[10px] font-black text-black">CPAK {simulatedCPAK}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Column 3: Jig Selection */}
                <div className="h-full flex flex-col gap-2">
                    <div className="bg-[#111111] border border-[#222222] p-4 rounded-xl flex flex-col gap-4 h-full">
                        <div className="bg-[#6D282C] py-4 px-2 rounded-sm text-center border-t-2 border-[#ff8fa3]">
                            <p className="text-[8px] text-white/60 font-black uppercase tracking-widest mb-1">Revised Functional Tibia Cut (θ)</p>
                            <p className="text-5xl font-black text-white">{recommendedTheta}°</p>
                        </div>

                        <div className="flex-grow flex flex-col gap-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase text-center mt-2 tracking-widest">Robotrix+ Universal Jigs</p>
                            <p className="text-[8px] text-gray-600 text-center uppercase -mt-2">Click block to simulate</p>

                            <div className="space-y-4 overflow-y-auto pr-1 py-1">
                                {/* Neutral jig */}
                                <div className="px-2">
                                    <button
                                        onClick={() => setSelectedJig(0)}
                                        className={`w-full py-2.5 rounded-sm border transition-all flex flex-col items-center bg-[#1A1A1A] ${selectedJig === 0 ? 'border-[#ff8fa3] shadow-lg scale-[1.02]' : 'border-[#333333] opacity-60 hover:opacity-100'}`}
                                    >
                                        <span className="text-sm font-black text-white uppercase">0 Degree</span>
                                        <span className="text-[8px] font-bold text-gray-500 uppercase">Neutral Cut</span>
                                    </button>
                                </div>

                                {/* Jigs 1-4 using CuttingBlock component */}
                                {[1, 2, 3, 4].map((angle) => (
                                    <div key={angle} className="px-2">
                                        <CuttingBlock
                                            degree={angle}
                                            isSelected={selectedJig === angle}
                                            isRecommended={recommendedTheta === angle}
                                            onClick={() => setSelectedJig(angle)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {/* Footer proceeds to Report */}
            <div className="mt-2 flex justify-between pb-1 shrink-0 px-2 relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => setPage('intra-operative-validation')}
                    className="group relative py-2 px-4 bg-[#252525] border border-[#444444] rounded-sm 
                               shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-gray-200 tracking-wider group-hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        BACK
                    </span>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                </button>

                <button
                    onClick={() => setPage('report')}
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
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>
            </div>
        </div>
    );
};

export default IntraOperativeCoronalBalancingPage;
