
import React from 'react';
import { useAppContext } from '../context/AppContext';

const ValgusStressCoronalBalancingPage: React.FC = () => {
    const {
        setPage,
        implantThickness,
        valgusResults,
        setValgusCoronalBalancingResults,
        lateralLaxity,
    } = useAppContext();

    // Calculation Logic
    const thickness = implantThickness ?? 10;
    const mpta = valgusResults.mpta ?? 86;

    const rawTightness = 86 - mpta;
    const anticipatedTightness = rawTightness > 4 ? 4 : Math.max(0, Math.round(rawTightness));

    const anticipatedMedialGap = thickness - anticipatedTightness;


    const handleProceed = () => {
        setValgusCoronalBalancingResults({
            lateralGap: thickness.toString(),
            selectedSeries: anticipatedMedialGap,
            medialRelease: 0,
            simFemoralCut: 0,
            simTibialCut: 0,
            simResectionDepth: 0
        });
        setPage('planner-valgus-functional-tibial-cut');
    };

    return (
        <div className="relative flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center no-print shrink-0 px-2 py-1 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0]">Coronal Balancing Screen (Valgus Stress)</h2>
            </div>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-[25fr_50fr_25fr] gap-0.5 min-h-0 px-2 relative z-10">
                {/* Column 1: Instructions & Block Upload */}
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="relative bg-[#1a1a1a] border border-[#333333] p-1.5 rounded-lg flex-grow flex flex-col items-start text-left overflow-y-auto">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <div className="w-full shrink-0 relative z-10">
                            <span className="inline-block px-3 py-1 rounded-sm text-sm font-bold mb-2 bg-[#6D282C] text-white shadow-lg float-left tracking-wider">STEP 4 &gt;</span>
                        </div>

                        <p className="font-bold text-[#E0E0E0] mb-2 text-xl leading-snug w-full text-center shrink-0 relative z-10">
                            Use <span className="text-[#ff8fa3]">Robotrix+ AI blocks</span> (Asymmetrical Incremental blocks) To gauge lateral and medial extension gaps
                        </p>

                        <div className="w-full aspect-square max-h-[220px] rounded-lg flex items-center justify-center relative overflow-hidden my-auto self-center border border-[#333333] bg-black shrink-0 z-10">
                            <img src="/leftside.png" alt="AI Block Reference" className="w-full h-full object-contain" />
                        </div>

                        <div className="mt-auto bg-[#1a1a1a] p-2 rounded-lg w-full border border-[#6D282C]/50 shadow-lg text-center shrink-0 relative z-10">
                            <p className="text-gray-500 text-xs mb-0 uppercase tracking-wider font-semibold">Implant Thickness Chosen</p>
                            <p className="text-3xl font-extrabold text-white">{thickness} <span className="text-sm text-gray-500">mm</span></p>
                        </div>
                    </div>
                </div>

                {/* Column 2: Image with Side Panels */}
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="w-full relative flex-grow min-h-0 flex items-center justify-center bg-[#1a1a1a] overflow-hidden rounded-xl border border-[#333333]">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="flex items-stretch justify-center w-full h-full gap-0 p-4">
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

                    {/* Footer: Lateral Laxity Check */}
                    <div className="relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg flex items-center justify-between shrink-0">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <button
                            onClick={() => setPage('planner-valgus-stress-laxity-check')}
                            className="group relative py-2 px-4 bg-[#6D282C] border border-[#893338] rounded-sm 
                                       shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                       transition-all duration-300 ease-out
                                       hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                       active:scale-[0.98] z-10"
                        >
                            <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                            <span className="relative text-sm font-bold text-white tracking-wider">CHECK LATERAL LAXITY</span>
                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        </button>
                        <div className="text-right relative z-10">
                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider mr-1">Laxity Level:</span>
                            <span className={`text-lg font-bold ${!lateralLaxity ? 'text-gray-500' : lateralLaxity === 'No Lateral Laxity' ? 'text-green-400' : 'text-[#ff8fa3]'}`}>
                                {lateralLaxity || 'Skipped'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Column 3: Flowchart Logic */}
                <div className="h-full flex flex-col gap-1 min-h-0">
                    {/* Right Path (Verification Success) */}
                    <div className="relative bg-[#1a1a1a] border border-[#6D282C]/30 rounded-xl p-2 flex flex-col items-center justify-center text-center overflow-hidden shadow-lg transition-all hover:bg-[#1f1f1f] flex-[0.8]">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50"></div>
                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(22,163,74,0.4)] shrink-0">✓</div>
                        <div className="flex flex-row items-center justify-center gap-3 mb-2 mt-1">
                            <h4 className="text-lg font-black text-white tracking-tight text-center leading-tight">
                                Medial gap matches<br />anticipated gap
                            </h4>
                        </div>
                        <div className="bg-black/40 p-2 rounded-lg border border-green-500/30 w-full backdrop-blur-md relative z-10">
                            <p className="text-sm text-green-400 font-bold uppercase tracking-wider">
                                Proceed with Functional Tibia Cut
                            </p>
                        </div>
                    </div>

                    {/* Wrong Path */}
                    <div className="relative bg-[#1a1a1a] border-2 border-[#6D282C] rounded-xl p-2 flex flex-col items-center justify-center text-center overflow-hidden shadow-lg hover:bg-[#252525] transition-colors flex-[2] min-h-0">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#6D282C]"></div>
                        <div className="w-8 h-8 rounded-full bg-[#6D282C] text-white flex items-center justify-center font-bold text-base mb-2 shadow-[0_0_10px_#6D282C] shrink-0 relative z-10">✕</div>
                        <h4 className="text-lg font-extrabold text-base mb-2 leading-tight relative z-10">
                            Medial gap does not<br />match anticipated gap
                        </h4>
                        <div className="flex flex-col gap-1 w-full relative z-10">
                            <div className="bg-black/40 p-2 rounded-lg border border-[#6D282C]/50 backdrop-blur-md hover:border-[#6D282C]/80 transition-colors">
                                <p className="text-md text-[#ff8fa3] font-bold leading-tight">
                                    Consider error on<br />90 deg tibial cut
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 shrink-0">
                                <div className="h-px bg-[#333333] flex-grow"></div>
                                <div className="text-gray-500 font-bold text-sm uppercase">OR</div>
                                <div className="h-px bg-[#333333] flex-grow"></div>
                            </div>
                            <div className="bg-black/40 p-2 rounded-lg border border-[#6D282C]/50 backdrop-blur-md hover:border-[#6D282C]/80 transition-colors">
                                <p className="text-md text-[#ff8fa3] font-bold leading-tight">
                                    Consider Pre op<br />lateral laxity
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 shrink-0">
                                <div className="h-px bg-[#333333] flex-grow"></div>
                                <div className="text-gray-500 font-bold text-sm uppercase">OR</div>
                                <div className="h-px bg-[#333333] flex-grow"></div>
                            </div>
                            <div className="bg-black/40 p-2 rounded-lg border border-[#6D282C]/50 backdrop-blur-md hover:border-[#6D282C]/80 transition-colors">
                                <p className="text-md text-[#ff8fa3] font-bold leading-tight">
                                    Input of inaccurate data from Valgus stress film
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-2 flex justify-between pb-1 shrink-0 px-2 relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => setPage('planner-valgus-stress-results')}
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

export default ValgusStressCoronalBalancingPage;