
import React from 'react';
import { useAppContext } from '../context/AppContext';

const IntraOperativeValidationPage: React.FC = () => {
    const {
        setPage,
        implantThickness,
        longLegResults,
        intraOpValidationData,
        setIntraOpValidationData,
    } = useAppContext();

    const { medialGap, lateralGap, tibiaWidth } = intraOpValidationData;

    const thickness = implantThickness ?? 10;
    const mpta = longLegResults.mpta ?? 86;
    const rawTightness = 86 - mpta;
    const anticipatedTightness = rawTightness > 4 ? 4 : Math.max(0, Math.round(rawTightness));
    const anticipatedMedialGap = thickness - anticipatedTightness;
    const anticipatedLateralGap = thickness;

    const medialDiff = medialGap - anticipatedMedialGap;
    const lateralDiff = lateralGap - anticipatedLateralGap;

    const getStatusColor = (diff: number) => {
        if (diff === 0) return 'text-green-500 border-green-500 bg-green-500/10';
        if (Math.abs(diff) <= 1) return 'text-amber-500 border-amber-500 bg-amber-500/10';
        return 'text-red-500 border-red-500 bg-red-500/10';
    };

    const getGapStatus = (diff: number) => {
        if (diff === 0) return 'MATCH';
        if (diff > 0) return `LOOSE (${diff}mm)`;
        return `TIGHT (${Math.abs(diff)}mm)`;
    };

    const C = (tibiaWidth / 70) * 1.2;
    const revisedVarusCut = (thickness - medialGap) / C;

    const handleUpdateData = (field: string, delta: number) => {
        setIntraOpValidationData({
            ...intraOpValidationData,
            [field]: Math.max(0, (intraOpValidationData as any)[field] + delta)
        });
    };

    return (
        <div className="relative flex flex-col h-[44rem] overflow-hidden bg-[#0A0A0A]">
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-red-900/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="flex justify-between items-center no-print shrink-0 px-2 py-1 relative z-10 border-b border-[#333333] bg-black/40">
                <h2 className="text-xl font-bold text-[#E0E0E0] tracking-tighter uppercase">Intra-Operative Input Screen</h2>
                <button
                    onClick={() => setPage('simulation')}
                    className="group relative py-1.5 px-3 bg-[#1A1A1A] border border-[#333333] rounded-sm transition-all hover:bg-[#252525]"
                >
                    <span className="relative flex items-center gap-2 text-[10px] font-black text-gray-400 tracking-wider">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        BACK
                    </span>
                </button>
            </div>

            <div className="flex-grow grid grid-cols-[25fr_45fr_30fr] gap-2 min-h-0 px-2 relative z-10">
                {/* Column 1: Inputs & Instructions */}
                <div className="h-full flex flex-col gap-4 overflow-hidden">
                    {/* Instructions Section */}
                    <div className="bg-[#1a1a1a] border border-[#333333] p-5 rounded-xl">
                        <div className="w-full flex justify-center mb-3">
                            <span className="px-4 py-1.5 rounded-sm text-xs font-black bg-[#6D282C] text-white shadow-lg tracking-widest uppercase">Actual Gaps</span>
                        </div>
                        <p className="text-gray-300 text-base font-bold text-center leading-relaxed mb-2">
                            1. Assess the Actual medial and lateral extensor gaps
                        </p>
                        <p className="text-gray-300 text-base font-bold text-center leading-relaxed">
                            2. Measure the mediolateral tibial width using tibial calipers
                        </p>
                    </div>

                    {/* Input Fields Section */}
                    <div className="bg-[#1a1a1a] border border-[#333333] p-5 rounded-xl flex-grow flex flex-col justify-center">
                        <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-black uppercase tracking-widest text-center">Medial Gap (mm)</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('medialGap', -1)} className="w-12 h-12 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-2xl hover:bg-[#6D282C] transition-colors">-</button>
                                    <div className="w-24 py-3 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-4xl font-black text-white">{medialGap}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('medialGap', 1)} className="w-12 h-12 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-2xl hover:bg-[#6D282C] transition-colors">+</button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-black uppercase tracking-widest text-center">Lateral Gap (mm)</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('lateralGap', -1)} className="w-12 h-12 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-2xl hover:bg-[#6D282C] transition-colors">-</button>
                                    <div className="w-24 py-3 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-4xl font-black text-white">{lateralGap}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('lateralGap', 1)} className="w-12 h-12 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-2xl hover:bg-[#6D282C] transition-colors">+</button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-black uppercase tracking-widest text-center">Mid Tibia Width (mm)</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => handleUpdateData('tibiaWidth', -1)} className="w-12 h-12 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-2xl hover:bg-[#6D282C] transition-colors">-</button>
                                    <div className="w-24 py-3 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-4xl font-black text-white">{tibiaWidth}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('tibiaWidth', 1)} className="w-12 h-12 rounded-sm bg-[#1A1A1A] border border-[#333333] text-white font-bold text-2xl hover:bg-[#6D282C] transition-colors">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Visual Comparison */}
                <div className="h-full flex flex-col gap-2 overflow-hidden">
                    <div className="relative flex-grow bg-[#1a1a1a] border border-[#333333] rounded-xl flex flex-col items-center justify-start p-4">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />

                        <div className="w-full flex flex-col items-center z-20 mb-2">
                            <span className="px-2 py-0.5 rounded-sm text-[8px] font-black bg-[#333333] text-gray-400 tracking-widest uppercase mb-2">ANTICIPATED GAPS</span>
                            <div className="flex gap-16">
                                <div className="text-center">
                                    <p className="text-gray-200 text-xl font-black">{anticipatedLateralGap}mm</p>
                                    <p className="text-gray-500 text-[9px] font-black uppercase">LATERAL</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-gray-200 text-xl font-black">{anticipatedMedialGap}mm</p>
                                    <p className="text-gray-500 text-[9px] font-black uppercase">MEDIAL</p>
                                </div>
                            </div>
                        </div>

                        {/* Horizontal layout: Circle - Image - Circle */}
                        <div className="flex items-center justify-center gap-4 flex-grow w-full">
                            {/* Left Circle - Actual Lateral */}
                            <div className="flex flex-col items-center shrink-0">
                                <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-2">Actual Lateral</p>
                                <div className={`w-24 h-24 rounded-full border-[4px] transition-all duration-500 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm shadow-lg ${getStatusColor(lateralDiff)}`}>
                                    <span className="text-3xl font-black leading-tight">{lateralGap}</span>
                                    <span className="text-xs font-bold opacity-60">mm</span>
                                </div>
                            </div>

                            {/* Center - Bone Image */}
                            <div className="flex-grow flex items-center justify-center max-h-full">
                                <img src="/resources/intraval.png" alt="Joint Model" className="max-h-[420px] object-contain" />
                            </div>

                            {/* Right Circle - Actual Medial */}
                            <div className="flex flex-col items-center shrink-0">
                                <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-2">Actual Medial</p>
                                <div className={`w-24 h-24 rounded-full border-[4px] transition-all duration-500 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm shadow-lg ${getStatusColor(medialDiff)}`}>
                                    <span className="text-3xl font-black leading-tight">{medialGap}</span>
                                    <span className="text-xs font-bold opacity-60">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Analysis & Formula */}
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="bg-[#111111] border border-[#222222] p-5 rounded-xl flex flex-col h-full">
                        <div className="w-full flex justify-center mb-4">
                            <span className="px-4 py-1.5 rounded-sm text-xs font-black bg-[#6D282C] text-white shadow-lg tracking-widest uppercase">ANALYSIS</span>
                        </div>

                        <div className="flex-grow flex flex-col gap-5">
                            <div className={`p-5 rounded-lg border-l-4 shadow-inner ${getStatusColor(medialDiff)}`}>
                                <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-60">Medial Gap Analysis</p>
                                <p className="text-2xl font-black">{getGapStatus(medialDiff)}</p>
                            </div>

                            <div className={`p-5 rounded-lg border-l-4 shadow-inner ${getStatusColor(lateralDiff)}`}>
                                <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-60">Lateral Gap Analysis</p>
                                <p className="text-2xl font-black">{getGapStatus(lateralDiff)}</p>
                            </div>

                            {/* Revised Cut Info */}
                            <div className="mt-auto bg-black/40 p-5 rounded-xl border border-[#333333]">
                                <p className="text-[#ff8fa3] text-sm font-black uppercase tracking-widest mb-4 border-b border-[#ff8fa3]/20 pb-2 italic">Revised Varus Formula</p>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Correction Factor (C):</span>
                                            <span className="text-white font-black text-lg">{C.toFixed(2)}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-600 leading-tight italic">
                                            ( {tibiaWidth} / 70 ) × 1.2 = {C.toFixed(2)} mm per 1°
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-white/5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-100 text-sm font-bold">Revised Varus Cut (θ):</span>
                                            <span className="text-[#ff8fa3] text-2xl font-black">{revisedVarusCut.toFixed(2)}°</span>
                                        </div>
                                        <p className="text-[10px] text-gray-600 leading-tight italic mt-1">
                                            ( {thickness} - {medialGap} ) / {C.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer proceeds to Coronal Balancing */}
            <div className="mt-2 flex justify-end pb-1 shrink-0 px-2 relative z-10">
                <button
                    onClick={() => setPage('intra-operative-coronal-balancing')}
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

export default IntraOperativeValidationPage;
