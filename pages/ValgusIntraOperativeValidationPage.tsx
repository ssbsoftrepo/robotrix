
import React from 'react';
import { useAppContext } from '../context/AppContext';

const ValgusIntraOperativeValidationPage: React.FC = () => {
    const {
        setPage,
        implantThickness,
        valgusResults,
        valgusIntraOpValidationData,
        setValgusIntraOpValidationData,
    } = useAppContext();

    const { medialGap, lateralGap, tibiaWidth } = valgusIntraOpValidationData;

    React.useEffect(() => {
        if (valgusIntraOpValidationData.medialGap === 16 && valgusIntraOpValidationData.lateralGap === 16) {
        }
    }, []);

    const thickness = implantThickness ?? 10;
    const mpta = valgusResults.mpta ?? 86;
    const rawTightness = 86 - mpta;
    const anticipatedTightness = rawTightness > 4 ? 4 : Math.max(0, Math.round(rawTightness));
    const anticipatedMedialGap = thickness - anticipatedTightness;
    const anticipatedLateralGap = thickness;

    const medialDiff = medialGap - anticipatedMedialGap;
    const lateralDiff = lateralGap - anticipatedLateralGap;

    const getStatusColor = (diff: number) => {
        if (diff === 0) return 'text-green-500 border-green-500 bg-green-500/10';
        if (diff > 0) return 'text-amber-500 border-amber-500 bg-amber-500/10'; // Loose
        return 'text-red-500 border-red-500 bg-red-500/10'; // Tight
    };

    const getGapStatus = (diff: number) => {
        if (diff === 0) return 'MATCH';
        if (diff > 0) return `LOOSE (${diff}mm)`;
        return `TIGHT (${Math.abs(diff)}mm)`;
    };

    const C = (tibiaWidth / 70) * 1.2;
    const revisedVarusCut = (thickness - medialGap) / C;

    const handleUpdateData = (field: string, delta: number) => {
        setValgusIntraOpValidationData({
            ...valgusIntraOpValidationData,
            [field]: Math.max(0, (valgusIntraOpValidationData as any)[field] + delta)
        });
    };

    React.useEffect(() => {
        if (medialGap === 16 && lateralGap === 16) {
            setValgusIntraOpValidationData({
                ...valgusIntraOpValidationData,
                medialGap: anticipatedMedialGap,
                lateralGap: anticipatedLateralGap
            });
        }
    }, []);

    return (
        <div className="relative flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center no-print shrink-0 px-2 py-1 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0]">Intra-Operative Input Screen (Valgus)</h2>
            </div>

            <div className="flex-grow grid grid-cols-[25fr_45fr_30fr] gap-2 min-h-0 px-2 relative z-10">
                {/* Column 1: Inputs & Instructions */}
                <div className="h-full flex flex-col gap-2 overflow-hidden">
                    {/* Instructions Section */}
                    <div className="flex flex-col gap-2 flex-[1] min-h-0">
                        <div className="w-full flex justify-center">
                            <span className="px-4 py-1.5 rounded-sm text-xs font-black bg-[#6D282C] text-white shadow-lg tracking-widest uppercase">Actual Gaps</span>
                        </div>
                        <div className="relative bg-[#252525] p-3 rounded-lg border-l-4 border-[#6D282C] hover:bg-[#2a2a2a] transition-colors flex-[1] flex items-center gap-3 z-10 min-h-0">
                            <div className="bg-[#6D282C] text-white w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold shadow-lg border-2 border-[#893338]">1</div>
                            <p className="text-[18px] text-gray-400 leading-snug text-right w-full">Assess the Actual medial and lateral extensor gaps</p>
                        </div>
                        <div className="relative bg-[#252525] p-3 rounded-lg border-l-4 border-[#6D282C] hover:bg-[#2a2a2a] transition-colors flex-[1] flex items-center gap-3 z-10 min-h-0">
                            <div className="bg-[#6D282C] text-white w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold shadow-lg border-2 border-[#893338]">2</div>
                            <p className="text-[18px] text-gray-400 leading-snug text-right w-full">Measure the mediolateral tibial width using tibial calipers</p>
                        </div>
                    </div>

                    {/* Input Fields Section */}
                    <div className="bg-[#1a1a1a] border border-[#333333] p-5 rounded-xl flex-[1] flex flex-col justify-center">
                        <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-black uppercase tracking-widest text-center">Lateral Gap (mm)</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('lateralGap', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-2xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-24 py-3 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{lateralGap}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('lateralGap', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-2xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-black uppercase tracking-widest text-center">Medial Gap (mm)</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('medialGap', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-2xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-24 py-3 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{medialGap}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('medialGap', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-2xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-black uppercase tracking-widest text-center">Mid Tibia Width (mm)</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('tibiaWidth', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-2xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-24 py-3 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{tibiaWidth}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('tibiaWidth', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-2xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Visual Comparison */}
                <div className="h-full flex flex-col gap-1 overflow-hidden">
                    <div className="relative flex-grow bg-black border border-[#333333] rounded-xl flex items-stretch p-2">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />

                        {/* Left Side - Anticipated Lateral Gap (top) + Actual Circle (centered) */}
                        <div className="flex flex-col items-center z-20 px-3 shrink-0 w-[130px]">
                            {/* Anticipated box at top */}
                            <div className="bg-black/80 border-2 border-[#333333] rounded-lg px-3 py-3 text-center shadow-lg w-full mt-4">
                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-wider mb-1">ANTICIPATED<br />LATERAL GAP</p>
                                <p className="text-2xl font-black text-white">{anticipatedLateralGap}<span className="text-sm text-gray-400 ml-1">mm</span></p>
                            </div>
                            {/* Actual circle centered in remaining space */}
                            <div className="flex-grow flex flex-col items-center justify-center gap-1">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">ACTUAL LATERAL</p>
                                <div className={`w-20 h-20 rounded-full border-[4px] transition-all duration-500 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm shadow-lg ${getStatusColor(lateralDiff)}`}>
                                    <span className="text-2xl font-black leading-tight">{lateralGap}</span>
                                    <span className="text-xs font-bold opacity-60">mm</span>
                                </div>
                            </div>
                        </div>

                        {/* Center - Bone Image (full height) */}
                        <div className="flex-grow flex items-center justify-center z-10 min-w-0">
                            <img src="/intraval.png" alt="Joint Model" className="max-h-full max-w-full object-contain" />
                        </div>

                        {/* Right Side - Anticipated Medial Gap (top) + Actual Circle (centered) */}
                        <div className="flex flex-col items-center z-20 px-3 shrink-0 w-[130px]">
                            {/* Anticipated box at top */}
                            <div className="bg-black/80 border-2 border-[#6D282C] rounded-lg px-3 py-3 text-center shadow-lg w-full mt-4">
                                <p className="text-[#ff8fa3] text-[9px] font-black uppercase tracking-wider mb-1">ANTICIPATED<br />MEDIAL GAP</p>
                                <p className="text-2xl font-black text-[#ff8fa3]">{anticipatedMedialGap}<span className="text-sm text-[#ff8fa3]/70 ml-1">mm</span></p>
                            </div>

                            {/* Actual circle centered in remaining space */}
                            <div className="flex-grow flex flex-col items-center justify-center gap-1">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">ACTUAL MEDIAL</p>
                                <div className={`w-20 h-20 rounded-full border-[4px] transition-all duration-500 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm shadow-lg ${getStatusColor(medialDiff)}`}>
                                    <span className="text-2xl font-black leading-tight">{medialGap}</span>
                                    <span className="text-xs font-bold opacity-60">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Analysis & Formula */}
                <div className="h-full flex flex-col gap-2 overflow-hidden">
                    {/* Section 1: Analysis */}
                    <div className="bg-[#1a1a1a] border border-[#333333] p-4 rounded-xl flex flex-col flex-[1] min-h-0">
                        <div className="w-full flex justify-center mb-3">
                            <span className="px-4 py-1.5 rounded-sm text-xs font-black bg-[#6D282C] text-white shadow-lg tracking-widest uppercase">ANALYSIS</span>
                        </div>
                        <div className="flex-grow flex flex-col gap-3 justify-center">
                            <div className={`p-4 rounded-lg border border-white/5 flex flex-col items-center justify-center ${getStatusColor(lateralDiff).replace('bg-', 'bg-opacity-5 ')}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${lateralDiff === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">LATERAL ANALYSIS</p>
                                </div>
                                <p className={`text-xl font-black ${lateralDiff === 0 ? 'text-green-500' : 'text-red-500'}`}>{getGapStatus(lateralDiff)}</p>
                            </div>
                            <div className={`p-4 rounded-lg border border-white/5 flex flex-col items-center justify-center ${getStatusColor(medialDiff).replace('bg-', 'bg-opacity-5 ')}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${medialDiff === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">MEDIAL ANALYSIS</p>
                                </div>
                                <p className={`text-xl font-black ${medialDiff === 0 ? 'text-green-500' : 'text-red-500'}`}>{getGapStatus(medialDiff)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Revised Cut / Error Considerations */}
                    {medialDiff === 0 && lateralDiff === 0 ? (
                        <div className="bg-[#6D282C]/10 border-2 border-[#6D282C]/30 rounded-xl p-5 flex flex-col items-center justify-center flex-[1] min-h-0">
                            <h3 className="text-gray-200 text-lg font-bold uppercase tracking-wider mb-4 text-center">
                                REVISED FUNCTIONAL TIBIA CUT
                            </h3>
                            <div className="flex items-start mb-3">
                                <span className="text-7xl font-black text-[#ff8fa3] tracking-tighter leading-none">
                                    {Math.min(4, Math.max(0, Math.round(revisedVarusCut)))}
                                </span>
                                <span className="text-4xl font-black text-[#ff8fa3] mt-1 ml-1">°</span>
                            </div>
                            <p className="text-gray-400 text-sm font-medium text-center max-w-[90%]">
                                Calculated using patient-specific tibial width ({tibiaWidth}mm)
                            </p>
                        </div>
                    ) : (
                        <div className="bg-[#6D282C]/10 border-2 border-[#6D282C]/30 rounded-xl p-5 flex flex-col flex-[1] min-h-0">
                            <div className="flex items-center gap-3 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-amber-500 font-bold text-base">Actual gaps do not match.</span>
                            </div>
                            <div className="flex-grow">
                                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-3">CONSIDER THE FOLLOWING:</p>
                                <div className="space-y-2">
                                    {[
                                        "Input of inaccurate data",
                                        "Under/over resection of foundations",
                                        "Presence of pre-op lateral laxity",
                                        "Error in Provisional 90° tibial cut"
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-black/20 p-2.5 rounded border border-[#6D282C]/20">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                            <span className="text-gray-300 text-sm font-bold">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer proceeds to Coronal Balancing */}
            <div className="mt-2 flex justify-between pb-1 shrink-0 px-2 relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => setPage('planner-valgus-functional-tibial-cut')}
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
                    onClick={() => setPage('valgus-intra-operative-coronal-balancing')}
                    className="group relative py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-wider">
                        PROCEED CORONAL BALANCING
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

export default ValgusIntraOperativeValidationPage;
