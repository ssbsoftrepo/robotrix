
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
    isReduced?: boolean;
    onClick: () => void;
}> = ({ degree, isSelected, isRecommended, isReduced, onClick }) => (
    <div
        onClick={onClick}
        className={`relative flex flex-col items-center transition-all duration-300 cursor-pointer w-full ${isSelected ? 'scale-105 z-10' : 'opacity-60 hover:opacity-100'}`}
    >
        {isRecommended && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#6D282C] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-lg z-20 whitespace-nowrap tracking-wider">
                RECOMMENDED
            </div>
        )}

        <svg viewBox="0 0 320 130" className={`w-full h-auto max-h-[95px] ${isSelected ? 'drop-shadow-[0_0_10px_rgba(109,40,44,0.6)]' : 'drop-shadow-lg'}`}>
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
        longLegCoronalBalancingResults,
        setLongLegFunctionalCutDegree,
        longLegFunctionalCutDegree,
        legSide,
        tibiaBoundary,
    } = useAppContext();

    const isLeftLeg = legSide === 'left';

    // PRE-OP Calculated Tibia Cut (same logic as ResultAnalysisPage)
    const preOpTibiaCut = (() => {
        const mptaVal = longLegResults.mpta;
        if (mptaVal === null) return { degree: 0, label: '--' };
        let varusCut = 0;
        if (mptaVal <= 85) varusCut = 4;
        else if (mptaVal <= 87) varusCut = 3;
        else if (mptaVal <= 88) varusCut = 2;
        else if (mptaVal <= 90) varusCut = 1;
        if (tibiaBoundary === 'basic' && varusCut > 2) varusCut = 2;
        return { degree: varusCut, label: varusCut === 0 ? 'neutral' : 'varus' };
    })();

    const handleCheckLaxity = () => {
        if (kneeType === 'valgus') {
            setPreviousPage('planner-long-leg-coronal-balancing');
            setPage('planner-valgus-stress-laxity-check');
        } else {
            setPreviousPage('planner-long-leg-coronal-balancing');
            setPage('planner-long-leg-laxity-check');
        }
    };

    const { additionalFemurCut, additionalTibiaCut, additionalLaxity, functionalTibiaCutDegree } = intraOpCoronalBalancingData;
    const { medialGap, lateralGap, tibiaWidth } = intraOpValidationData;
    const { simFemoralCut } = longLegCoronalBalancingResults;

    const thickness = implantThickness ?? 10;
    const C = (tibiaWidth / 70) * 1.2;

    const baseMedial = medialGap + additionalFemurCut + additionalTibiaCut;
    const baseLateral = lateralGap + additionalFemurCut + additionalTibiaCut;
    const displayedLateralGap = baseLateral;

    // Gap match check from validation page
    const mpta = longLegResults.mpta ?? 86;
    const rawTightness = 86 - mpta;
    const anticipatedTightness = rawTightness > 4 ? 4 : Math.max(0, Math.round(rawTightness));
    const anticipatedMedialGap = thickness - anticipatedTightness;
    const anticipatedLateralGap = thickness;
    const medialDiff = medialGap - anticipatedMedialGap;
    const lateralDiff = lateralGap - anticipatedLateralGap;
    const gapsMatch = medialDiff === 0 && lateralDiff === 0;
    const showRevisedCut = gapsMatch || additionalLaxity > 0;

    const LMT = thickness - additionalLaxity;

    const revisedVarusCut = (LMT - baseMedial) / C;

    const thetaValue = Math.round((LMT - baseMedial) / C);
    const recommendedTheta = Math.max(0, Math.min(4, thetaValue));

    const [selectedJig, setSelectedJig] = React.useState<number>(() => {
        if (functionalTibiaCutDegree !== null && functionalTibiaCutDegree !== undefined) {
            return functionalTibiaCutDegree;
        }
        return recommendedTheta;
    });

    const handleSelectJig = (angle: number) => {
        setSelectedJig(angle);
        setIntraOpCoronalBalancingData(prev => ({
            ...prev,
            functionalTibiaCutDegree: angle
        }));
        setLongLegFunctionalCutDegree(angle);
    };

    React.useEffect(() => {
        if (functionalTibiaCutDegree === null || functionalTibiaCutDegree === undefined) {
            const initialCut = longLegFunctionalCutDegree !== null ? longLegFunctionalCutDegree : recommendedTheta;
            setSelectedJig(initialCut);
            setIntraOpCoronalBalancingData(prev => ({
                ...prev,
                functionalTibiaCutDegree: initialCut
            }));
            setLongLegFunctionalCutDegree(initialCut);
        }
    }, []);

    const nativeLDFA = longLegResults.ldfa ?? 87;
    const nativeMPTA = longLegResults.mpta ?? 87;
    let nativeCPAK = longLegResults.cpak;

    if (!nativeCPAK || ['--', 'N/A'].includes(nativeCPAK)) {
        const currentAhka = nativeMPTA - nativeLDFA;
        const currentJlo = nativeMPTA + nativeLDFA;
        nativeCPAK = getCpakType(currentAhka, currentJlo);
    }

    const plannedFemurCut = simFemoralCut ?? 3;

    const finalSimulatedMedialGap = baseMedial + (selectedJig * C);
    const simulatedLDFA = nativeLDFA - plannedFemurCut;
    const simulatedMPTA = nativeMPTA - selectedJig;

    const simulatedAHKA = simulatedMPTA - simulatedLDFA;
    const simulatedJLO = simulatedMPTA + simulatedLDFA;
    const simulatedCPAK = getCpakType(simulatedAHKA, simulatedJLO);

    const getRetentionStatus = () => {
        const normNative = nativeCPAK.replace('Type ', '');
        const normSim = simulatedCPAK.replace('Type ', '');

        if (normNative === normSim) {
            return { text: 'Constitutional Match', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' };
        }
        return { text: 'Phenotype Mismatch', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    };

    const retentionStatus = getRetentionStatus();

    const handleUpdateData = (field: string, delta: number) => {
        setIntraOpCoronalBalancingData(prev => ({
            ...prev,
            [field]: Math.max(0, (prev as any)[field] + delta)
        }));
    };
    return (
        <div className="relative flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center no-print shrink-0 px-2 py-1 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0] uppercase">INTRA – OP Coronal Balancing Screen (Long Leg)</h2>
            </div>

            <div className="flex-grow grid grid-cols-[25fr_50fr_25fr] gap-2 min-h-0 p-1 relative z-10">
                {/* Column 1: Simulation Controls */}
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="bg-[#1a1a1a] border border-[#333333] p-1 rounded-xl flex flex-col h-full shadow-2xl overflow-hidden">

                        {/* Section 1: +/- Controls — evenly spaced */}
                        <div className="flex flex-col justify-between px-1 h-full py-2" style={{ flex: '0 0 40%' }}>
                            {/* Femur Cut */}
                            <div className="flex flex-col items-center">
                                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center">Additional foundational distal femoral cut resection</label>
                                <div className="flex items-center justify-center gap-3 w-full">
                                    <button onClick={() => handleUpdateData('additionalFemurCut', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-20 py-1 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{additionalFemurCut}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('additionalFemurCut', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>

                            {/* Tibia Cut */}
                            <div className="flex flex-col items-center">
                                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center">Additional provisional 90 deg tibial cut resection</label>
                                <div className="flex items-center justify-center gap-3 w-full">
                                    <button onClick={() => handleUpdateData('additionalTibiaCut', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-20 py-1 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{additionalTibiaCut}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('additionalTibiaCut', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>

                            {/* Laxity */}
                            <div className="flex flex-col items-center">
                                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center">Apply Pre-op lateral laxity</label>
                                <div className="flex items-center justify-center gap-3 w-full">
                                    <button onClick={() => handleUpdateData('additionalLaxity', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-20 py-1 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{additionalLaxity}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('additionalLaxity', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Check Laxity */}
                        <div className="flex flex-col justify-center items-center gap-2 border-t border-[#333333] px-1 py-4" style={{ flex: '0 0 20%' }}>
                            <button onClick={handleCheckLaxity} className="w-full py-2.5 bg-[#6D282C] text-white text-xs font-black rounded-sm border border-[#893338] shadow-lg tracking-wider">CHECK LATERAL LAXITY</button>
                        </div>

                        {/* Section 3: Native CPAK & PRE-OP Calculated Tibia Cut */}
                        <div className="flex flex-col justify-center gap-3 border-t border-[#333333] px-2 py-2 relative" style={{ flex: '0 0 40%' }}>
                            <div className="bg-black border-2 border-[#333333] rounded-lg p-2.5 text-center w-full mt-2 shadow-lg">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">PRE –OP Calculated Tibia Cut</p>
                                <div className="flex items-center justify-center">
                                    <span className="text-2xl font-black text-[#ff8fa3]">{preOpTibiaCut.degree}°</span>
                                    <span className="text-sm font-bold text-[#ff8fa3] ml-1 uppercase">{preOpTibiaCut.label}</span>
                                </div>
                            </div>
                            <div className="bg-black/80 border border-[#333333] px-4 py-3.5 rounded-xl flex justify-between items-center w-full shadow-lg">
                                <span className="text-sm font-black text-white uppercase tracking-widest">Native CPAK</span>
                                <span className="text-2xl font-black text-white">
                                    {['--', 'N/A'].includes(nativeCPAK) ? nativeCPAK : `Type ${nativeCPAK}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Visual Simulation */}
                <div className="h-full flex flex-col gap-1">
                    <div className="relative flex-grow bg-black border border-[#333333] rounded-xl flex flex-col items-center justify-start p-1 overflow-hidden">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />

                        {/* Horizontal layout: Lateral Box - Image - Medial Box */}
                        <div className="flex items-center justify-center gap-2 flex-grow w-full relative">
                            {/* Left Box - swaps based on leg side */}
                            <div className="flex flex-col items-center shrink-0 z-20 self-start mt-4 ml-2 w-[100px]">
                                <div className={`bg-black/80 border-[3px] ${isLeftLeg ? 'border-[#6D282C]' : 'border-[#333333]'} rounded-xl w-[90px] h-[90px] flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(109,40,44,0.3)]`}>
                                    <p className={`${isLeftLeg ? 'text-[#ff8fa3]' : 'text-gray-500'} text-[9px] font-black uppercase tracking-wider mb-0.5`}>{isLeftLeg ? 'MEDIAL' : 'LATERAL'}</p>
                                    {isLeftLeg ? (
                                        <p className="text-2xl font-black text-[#ff8fa3]">{finalSimulatedMedialGap.toFixed(1)}<span className="text-sm text-[#ff8fa3]/70 ml-1">mm</span></p>
                                    ) : (
                                        <p className="text-2xl font-black text-white">{displayedLateralGap}<span className="text-sm text-gray-400 ml-1">mm</span></p>
                                    )}
                                </div>
                            </div>

                            {/* Center - Bone Image */}
                            <div className="flex-grow flex items-center justify-center relative w-full h-[90%]">
                                <img src={isLeftLeg ? '/intracoronal-left.png' : '/intracoronal-right.png'} alt="Simulation" className="h-full w-full object-cover" />

                                {/* Simulation Cut Lines - positioned to overlay on bone */}
                                {(() => {
                                    const femurBaseY = isLeftLeg ? 53.5 : 54.5;
                                    const tibiaBaseY = isLeftLeg ? 63.5 : 65;
                                    return (
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">

                                            <line
                                                x1="0" y1={`${femurBaseY - additionalFemurCut * 1}%`}
                                                x2="100%" y2={`${femurBaseY - additionalFemurCut * 1}%`}
                                                stroke="#6D282C" strokeWidth="4"
                                            />

                                            <line x1="0" y1={`${femurBaseY}%`} x2="100%" y2={`${femurBaseY}%`} stroke="#444444" strokeWidth="1.5" strokeDasharray="5,2" />

                                            <line
                                                x1="0" y1={`${tibiaBaseY + additionalTibiaCut * 1}%`}
                                                x2="100%" y2={`${tibiaBaseY + additionalTibiaCut * 1}%`}
                                                stroke="#6D282C" strokeWidth="4"
                                            />

                                            {/* Varus Angle Lines - pivot side based on leg */}
                                            <circle cx={isLeftLeg ? '100%' : '0'} cy={`${tibiaBaseY + additionalTibiaCut * 1}%`} r="6" fill="#6D282C" />
                                            {[0, 1, 2, 3, 4].map((angle) => {
                                                const isSelected = selectedJig === angle;
                                                const yOffsetPercent = angle * 2.5;
                                                const baseY = tibiaBaseY + additionalTibiaCut * 1;
                                                return (
                                                    <line
                                                        key={angle}
                                                        x1={isLeftLeg ? '100%' : '0'} y1={`${baseY}%`}
                                                        x2={isLeftLeg ? '0' : '100%'} y2={`${baseY + yOffsetPercent}%`}
                                                        stroke={isSelected ? "#6D282C" : "#333333"}
                                                        strokeWidth={isSelected ? "4" : "1.5"}
                                                        strokeDasharray={isSelected ? "0" : "5,2"}
                                                        opacity={isSelected ? 1 : 0.6}
                                                    />
                                                );
                                            })}
                                        </svg>
                                    );
                                })()}

                                {/* Angle indicator box inside bone */}
                                <div className="absolute top-[90%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center text-center">
                                    <div className="bg-black/60 backdrop-blur-md px-8 py-2 rounded-xl border-2 border-[#333333] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                        <p className="text-gray-500 text-[9px] uppercase tracking-wider font-bold mb-0">Corrected Varus</p>
                                        <p className="text-3xl font-extrabold text-white tracking-tighter">{selectedJig}°</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Box - swaps based on leg side */}
                            <div className="flex flex-col items-center shrink-0 z-20 self-start mt-4 mr-2 w-[100px]">
                                <div className={`bg-black/80 border-[3px] ${isLeftLeg ? 'border-[#333333]' : 'border-[#6D282C]'} rounded-xl w-[90px] h-[90px] flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(109,40,44,0.3)]`}>
                                    <p className={`${isLeftLeg ? 'text-gray-500' : 'text-[#ff8fa3]'} text-[9px] font-black uppercase tracking-wider mb-0.5`}>{isLeftLeg ? 'LATERAL' : 'MEDIAL'}</p>
                                    {isLeftLeg ? (
                                        <p className="text-2xl font-black text-white">{displayedLateralGap}<span className="text-sm text-gray-400 ml-1">mm</span></p>
                                    ) : (
                                        <p className="text-2xl font-black text-[#ff8fa3]">{finalSimulatedMedialGap.toFixed(1)}<span className="text-sm text-[#ff8fa3]/70 ml-1">mm</span></p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Likely Post-Op CPAK indicator below bone image */}
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-20">
                            <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-xl border-2 border-[#333333] shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2">
                                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-0">LIKELY POST-OP CPAK</p>
                                <p className="text-xl font-extrabold text-white tracking-tighter">Type {simulatedCPAK}</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Column 3: Jig Selection */}
                <div className="h-full flex flex-col gap-1">
                    <div className="bg-[#1a1a1a] border border-[#333333] p-4 rounded-xl flex flex-col gap-4 h-full">

                        <div className="flex-grow flex flex-col gap-3">
                            <div className="bg-[#6D282C]/10 border border-[#6D282C]/30 rounded-lg p-2.5 text-center w-full shrink-0 shadow-lg">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">REVISED FUNCTIONAL TIBIA CUT</p>
                                <div className="flex items-center justify-center">
                                    <span className="text-2xl font-black text-[#ff8fa3]">{Math.min(4, Math.max(0, Math.round(revisedVarusCut)))}°</span>
                                </div>
                                {/* <p className="text-[8px] text-gray-600 font-bold text-center mt-1">Calculated with tibial width ({tibiaWidth}mm)</p> */}
                            </div>

                            <p className="text-[10px] font-black text-gray-500 uppercase text-center mt-0 tracking-widest">Robotrix+ Universal Jigs</p>
                            <p className="text-[8px] text-gray-600 text-center uppercase -mt-1">Click block to simulate</p>

                            <div className="space-y-2 overflow-y-auto pr-1 py-2">
                                {/* Neutral jig */}
                                <div className="px-2">
                                    <button
                                        onClick={() => handleSelectJig(0)}
                                        className={`w-full py-2 rounded-sm border transition-all flex flex-col items-center bg-[#1A1A1A] relative ${selectedJig === 0 ? 'border-[#ff8fa3] shadow-lg scale-[1.02]' : 'border-[#333333] opacity-60 hover:opacity-100'}`}
                                    >
                                        {recommendedTheta === 0 && (
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#6D282C] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-lg z-20 whitespace-nowrap tracking-wider">
                                                RECOMMENDED
                                            </div>
                                        )}
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
                                            isReduced={showRevisedCut}
                                            onClick={() => handleSelectJig(angle)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {/* Footer proceeds to Report */}
            <div className="flex justify-between pb-1 shrink-0 px-2 relative z-10">
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
