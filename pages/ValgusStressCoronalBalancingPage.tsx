
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
        // Save the calculated gaps to context so the next page can read them
        setValgusCoronalBalancingResults({
            lateralGap: thickness.toString(), // Store Lateral Gap (Implant Thickness)
            selectedSeries: anticipatedMedialGap, // Store Base Medial Gap
            // Defaults for unused fields in this flow
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
            <div className="flex justify-between items-center mb-1 no-print shrink-0 p-2 relative z-10">
                <h2 className="text-2xl font-bold text-[#E0E0E0]">Coronal Balancing Screen (Valgus Stress)</h2>
                {/* Back Button */}
                <button
                    onClick={() => setPage('planner-valgus-stress-results')}
                    className="group relative py-1.5 px-3 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-xs font-bold text-white tracking-wider">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        BACK
                    </span>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>
            </div>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-[25fr_50fr_25fr] gap-1 min-h-0 px-2 mb-2 relative z-10">
                {/* Column 1: Instructions & Block Upload */}
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="relative bg-[#1a1a1a] border border-[#333333] p-1.5 rounded-lg flex-grow flex flex-col items-start text-left overflow-y-auto">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <div className="w-full shrink-0 relative z-10">
                            <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-bold mb-1 bg-[#6D282C] text-white shadow-lg float-left tracking-wider">STEP 4 &gt;</span>
                        </div>

                        <p className="font-bold text-[#E0E0E0] mb-1 text-sm leading-snug w-full text-center shrink-0 relative z-10">
                            Use <span className="text-[#ff8fa3]">Robotrix+ AI blocks</span> (Asymmetrical Incremental blocks) To gauge lateral and medial extension gaps
                        </p>

                        <div className="w-full aspect-square max-h-[220px] rounded-lg flex items-center justify-center relative overflow-hidden my-auto self-center border border-[#333333] bg-black shrink-0 z-10">
                            <img src="/leftside.png" alt="AI Block Reference" className="w-full h-full object-contain" />
                        </div>

                        <div className="mt-auto bg-[#1a1a1a] p-1.5 rounded-lg w-full border border-[#6D282C]/50 shadow-lg text-center shrink-0 relative z-10">
                            <p className="text-gray-500 text-[10px] mb-0 uppercase tracking-wider font-semibold">Implant Thickness Chosen</p>
                            <p className="text-2xl font-extrabold text-white">{thickness} <span className="text-xs text-gray-500">mm</span></p>
                        </div>
                    </div>
                </div>

                {/* Column 2: Image with Side Panels */}
                <div className="h-full flex flex-col gap-1 overflow-hidden">
                    <div className="w-full relative flex-grow min-h-0 flex items-center justify-center bg-transparent overflow-hidden rounded-xl border border-[#333333]">
                        {/* Horizontal layout: Left panel - Image - Right panel */}
                        <div className="flex items-center justify-center w-full h-full gap-1 p-0.5">
                            {/* Left Panel - Lateral Gap */}
                            <div className="flex flex-col items-center text-center shrink-0 mx-4">
                                <p className="text-[10px] font-semibold text-gray-400 leading-snug mb-0.5">
                                    Adjust the distal femoral<br />
                                    and proximal tibial cut<br />
                                    thickness to get
                                </p>
                                <p className="text-sm text-[#E0E0E0] font-bold mb-1">
                                    Lateral Gap
                                </p>
                                <div className="w-16 h-16 rounded-full border-4 border-[#6D282C] bg-black/80 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(109,40,44,0.6)] backdrop-blur-sm">
                                    <span className="text-xl font-bold text-white">{thickness}</span>
                                    <span className="text-[10px] text-gray-400 font-bold mt-[-2px]">mm</span>
                                </div>
                            </div>

                            {/* Center - Bone Image */}
                            <div className="flex-grow h-full flex items-center justify-center min-w-0">
                                <img src="/center.png" alt="Knee View Reference" className="max-w-[75%] max-h-[75%] object-contain" />
                            </div>

                            {/* Right Panel - Medial Gap */}
                            <div className="flex flex-col items-center text-center shrink-0 mx-4">
                                <p className="text-[10px] font-semibold text-gray-400 leading-snug mb-0.5">
                                    Anticipated
                                </p>
                                <p className="text-sm text-[#E0E0E0] font-bold mb-1">
                                    Medial Gap
                                </p>
                                <div className="w-16 h-16 rounded-full border-4 border-[#6D282C] bg-black/80 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(109,40,44,0.6)] backdrop-blur-sm">
                                    <span className="text-xl font-bold text-gray-100">{anticipatedMedialGap}</span>
                                    <span className="text-[10px] text-gray-400 font-bold mt-[-2px]">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer: Lateral Laxity Check */}
                    <div className="relative bg-[#1a1a1a] border border-[#333333] p-1.5 rounded-lg flex items-center justify-between shrink-0">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <button
                            onClick={() => setPage('planner-valgus-stress-laxity-check')}
                            className="group relative py-1.5 px-3 bg-[#6D282C] border border-[#893338] rounded-sm 
                                       shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                       transition-all duration-300 ease-out
                                       hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                       active:scale-[0.98] z-10"
                        >
                            <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                            <span className="relative text-xs font-bold text-white tracking-wider">CHECK LATERAL LAXITY</span>
                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        </button>
                        <div className="text-right relative z-10">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mr-1">Laxity Level:</span>
                            <span className={`text-base font-bold ${!lateralLaxity ? 'text-gray-500' : lateralLaxity === 'No Lateral Laxity' ? 'text-green-400' : 'text-[#ff8fa3]'}`}>
                                {lateralLaxity || 'Skipped'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Column 3: Flowchart Logic */}
                <div className="h-full flex flex-col gap-1 min-h-0">
                    {/* Right Path (Verification Success) */}
                    <div className="relative bg-[#1a1a1a] border-2 border-[#6D282C] rounded-xl p-1.5 flex flex-col items-center text-center overflow-hidden shadow-lg hover:bg-[#252525] transition-colors flex-1 min-h-0 shrink">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#6D282C]"></div>
                        <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs mb-0.5 shadow-[0_0_10px_#22c55e] shrink-0 relative z-10">✓</div>
                        <h4 className="text-sm font-extrabold text-[#ff8fa3] mb-0.5 leading-tight relative z-10">Medial gap matches anticipated gap</h4>
                        <div className="flex-grow flex items-center justify-center w-full min-h-0 relative z-10">
                            <div className="bg-black/40 p-1.5 rounded-lg border border-[#6D282C]/50 w-full backdrop-blur-md">
                                <p className="text-sm text-gray-200 font-bold tracking-wide leading-snug">Proceed with the Functional Tibia Cut</p>
                            </div>
                        </div>
                    </div>

                    {/* Wrong Path */}
                    <div className="relative bg-[#1a1a1a] border-2 border-[#6D282C] rounded-xl p-1.5 flex flex-col items-center text-center overflow-hidden shadow-lg hover:bg-[#252525] transition-colors flex-1 min-h-0 shrink">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#6D282C]"></div>
                        <div className="w-5 h-5 rounded-full bg-[#6D282C] text-white flex items-center justify-center font-bold text-xs mb-0.5 shadow-[0_0_10px_#6D282C] shrink-0 relative z-10">✕</div>
                        <h4 className="text-sm font-extrabold text-[#ff8fa3] mb-0.5 leading-tight relative z-10">Medial gap does not match anticipated gap</h4>
                        <div className="flex-grow flex flex-col gap-1 justify-center w-full min-h-0 relative z-10">
                            <div className="bg-black/40 p-1.5 rounded-lg border border-[#6D282C]/50 backdrop-blur-md hover:border-[#6D282C]/80 transition-colors">
                                <p className="text-[#ff8fa3] text-xs font-bold">Consider error on 90 deg tibial cut</p>
                            </div>
                            <div className="flex items-center justify-center gap-1 shrink-0">
                                <div className="h-px bg-[#333333] flex-grow"></div>
                                <div className="text-gray-500 font-bold text-[10px] uppercase">OR</div>
                                <div className="h-px bg-[#333333] flex-grow"></div>
                            </div>
                            <div className="bg-black/40 p-1.5 rounded-lg border border-[#6D282C]/50 backdrop-blur-md hover:border-[#6D282C]/80 transition-colors">
                                <p className="text-[#ff8fa3] text-xs font-bold">Consider Pre op lateral laxity</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-1 flex justify-end pb-1 shrink-0 px-2 relative z-10">
                {/* Proceed Button */}
                <button
                    onClick={handleProceed}
                    className="group relative py-3 px-8 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                               active:scale-[0.98]"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative text-lg font-bold text-white tracking-widest">PROCEED FUNCTIONAL TIBIAL CUT</span>
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>
            </div>
        </div>
    );
};

export default ValgusStressCoronalBalancingPage;
