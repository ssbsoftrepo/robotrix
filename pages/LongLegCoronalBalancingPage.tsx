
import React from 'react';
import { useAppContext } from '../context/AppContext';

const LongLegCoronalBalancingPage: React.FC = () => {
    const {
        setPage,
        implantThickness,
        longLegResults,
        setLongLegCoronalBalancingResults,
        lateralLaxity,
    } = useAppContext();

    // Calculation Logic
    const thickness = implantThickness ?? 10;
    const mpta = longLegResults.mpta ?? 86;

    const rawTightness = 86 - mpta;
    const anticipatedTightness = rawTightness > 4 ? 4 : Math.max(0, Math.round(rawTightness));

    const anticipatedMedialGap = thickness - anticipatedTightness;


    const handleProceed = () => {
        setLongLegCoronalBalancingResults({
            lateralGap: thickness.toString(),
            selectedSeries: anticipatedMedialGap,
            medialRelease: 0,
            simFemoralCut: 0,
            simTibialCut: 0,
            simResectionDepth: 0
        });
        setPage('planner-long-leg-functional-tibial-cut');
    };

    return (
        <div className="relative flex flex-col h-[44rem] overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center no-print shrink-0 px-2 py-1 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0]">Coronal Balancing Screen (Long Leg)</h2>
                {/* Back Button */}
                <button
                    onClick={() => setPage('results-analysis')}
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

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-2 min-h-0 px-2 relative z-10">
                {/* Column 1: Joint View & Implant Thickness */}
                <div className="h-full flex flex-col gap-2 overflow-hidden">
                    <div className="w-full relative flex-grow min-h-0 flex items-center justify-center bg-[#1a1a1a] overflow-hidden rounded-xl border border-[#333333]">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        {/* Horizontal layout: Left panel - Image - Right panel */}
                        <div className="flex items-stretch justify-center w-full h-full gap-0 p-4">
                            {/* Left Panel - Lateral Gap */}
                            <div className="flex flex-col items-center justify-center text-center shrink-0 mr-[6%] z-10">
                                <div className="min-h-[5rem] flex items-end justify-center pb-2">
                                    <p className="text-sm font-semibold text-gray-400 leading-snug mb-0">
                                        Adjust the <br />
                                        distal femoral &<br />
                                        proximal tibial cut<br />
                                        thickness to get
                                    </p>
                                </div>
                                <p className="text-base text-[#E0E0E0] font-bold mb-4">
                                    Lateral Gap
                                </p>
                                <div className="w-32 h-32 rounded-full border-[6px] border-[#6D282C] bg-black/80 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(109,40,44,0.6)] backdrop-blur-sm transition-all hover:scale-105">
                                    <span className="text-4xl font-bold text-white">{thickness}</span>
                                    <span className="text-base text-gray-400 font-bold mt-[-2px]">mm</span>
                                </div>
                            </div>

                            {/* Center - Bone Image */}
                            <div className="shrink-0 h-full flex items-center justify-center">
                                <img src="/center.png" alt="Knee View Reference" className="max-h-full object-contain" />
                            </div>

                            {/* Right Panel - Medial Gap */}
                            <div className="flex flex-col items-center justify-center text-center shrink-0 ml-[6%] z-10">
                                <div className="min-h-[5rem] flex items-end justify-center pb-2">
                                    <p className="text-sm font-semibold text-gray-400 leading-snug mb-0">
                                        <br />
                                        Anticipated
                                    </p>
                                </div>
                                <p className="text-base text-[#E0E0E0] font-bold mb-4">
                                    Medial Gap
                                </p>
                                <div className="w-32 h-32 rounded-full border-[6px] border-[#6D282C] bg-black/80 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(109,40,44,0.6)] backdrop-blur-sm transition-all hover:scale-105">
                                    <span className="text-4xl font-bold text-gray-100">{anticipatedMedialGap}</span>
                                    <span className="text-base text-gray-400 font-bold mt-[-2px]">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Implant Thickness Below Bone Model */}
                    <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#333333] shadow-lg flex items-center justify-center shrink-0 relative">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-2">
                                <p className="text-gray-500 text-xl uppercase tracking-[0.2em] font-black mb-0.5">Implant Thickness Chosen</p>
                                <span className="text-4xl font-black text-white">{thickness}</span>
                                <span className="text-xl font-bold text-gray-500">mm</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Instructions & Flowchart */}
                <div className="h-full flex flex-col gap-2 overflow-hidden">
                    {/* Instructions Section */}
                    <div className="relative bg-[#1a1a1a] border border-[#333333] p-2.5 rounded-xl flex flex-col items-center text-center overflow-y-auto shrink-0">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="w-full flex justify-center mb-1.5">
                            <span className="px-3 py-1 rounded-sm text-[12px] font-black bg-[#6D282C] text-white shadow-lg tracking-widest uppercase">STEP 4</span>
                        </div>
                        <p className="font-bold text-[#E0E0E0] mb-2 text-base leading-tight">
                            Use <span className="text-[#ff8fa3]">Robotrix+ AI blocks</span><br />
                            (Asymmetrical Incremental Blocks) To gauge lateral and media extension gaps
                        </p>
                        <div className="w-full max-h-[6rem] rounded-lg flex items-center justify-center relative overflow-hidden border border-[#333333] bg-black/40">
                            <img src="/leftside.png" alt="AI Block Reference" className="w-full h-full object-contain p-1" />
                        </div>
                    </div>

                    {/* Flowchart Logic */}
                    <div className="flex-grow flex flex-col gap-2 min-h-0">
                        {/* Right Path (Verification Success) */}
                        <div className="relative bg-[#1a1a1a] border border-[#6D282C]/30 rounded-xl p-2 flex flex-col items-center justify-center text-center overflow-hidden shadow-lg transition-all hover:bg-[#1f1f1f] flex-[0.8]">
                            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50"></div>
                            <div className="flex flex-row items-center justify-center gap-3 mb-2 mt-1">
                                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(22,163,74,0.4)] shrink-0">✓</div>
                                <h4 className="text-lg font-black text-white tracking-tight text-left leading-tight">
                                    Medial gap matches<br />anticipated gap
                                </h4>
                            </div>
                            <div className="bg-green-950/30 px-6 py-2 rounded-full border border-green-500/30">
                                <p className="text-sm text-green-400 font-bold uppercase tracking-wider">
                                    Proceed with Functional Tibia Cut
                                </p>
                            </div>
                        </div>

                        {/* Wrong Path */}
                        <div className="relative bg-[#1a1a1a] border border-[#6D282C] rounded-xl p-2 flex flex-col items-center justify-center text-center overflow-hidden shadow-lg transition-all hover:bg-[#1f1f1f] flex-[2]">
                            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#6D282C]"></div>
                            <div className="flex flex-row items-center justify-center gap-3 mb-2 mt-1 px-4">
                                <div className="w-8 h-8 rounded-full bg-[#6D282C] text-white flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(109,40,44,0.4)] shrink-0">✕</div>
                                <h4 className="text-lg font-black text-[#ff8fa3] tracking-tight leading-tight text-left">
                                    Medial gap does not<br />match anticipated gap
                                </h4>
                            </div>
                            <div className="flex flex-col gap-1 w-full">
                                <div className="bg-[#6D282C]/20 p-2 rounded-lg border border-[#6D282C]/80">
                                    <p className="text-sm font-bold text-[#ff8fa3]">Consider error on 90 deg tibial cut</p>
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                    <span className="text-[10px] text-gray-500 font-black tracking-widest font-mono">OR</span>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="bg-[#6D282C]/20 p-2 rounded-lg border border-[#6D282C]/80">
                                    <p className="text-sm font-bold text-[#ff8fa3]">Consider Pre op lateral laxity</p>
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                    <span className="text-[10px] text-gray-500 font-black tracking-widest font-mono">OR</span>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="bg-[#6D282C]/20 p-2 rounded-lg border border-[#6D282C]/80">
                                    <p className="text-sm font-bold text-[#ff8fa3]">Input of inaccurate data from long leg film</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-2 flex justify-end pb-1 shrink-0 px-2 relative z-10">
                {/* Proceed Button */}
                <button
                    onClick={handleProceed}
                    className="group relative py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                               active:scale-[0.98]"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-wider">
                        PROCEED FUNCTIONAL TIBIAL CUT
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

export default LongLegCoronalBalancingPage;