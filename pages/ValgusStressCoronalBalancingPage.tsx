
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
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 no-print shrink-0">
                <h2 className="text-4xl font-bold text-gray-100">Coronal Balancing screen (Valgus Stress)</h2>
                <button onClick={() => setPage('planner-valgus-stress-results')} className="gemini-dark-button font-bold py-2 px-4 rounded-md transition text-sm flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span>Back</span>
                </button>
            </div>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                {/* Column 1: Instructions & Block Upload (Span 1) */}
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="gemini-dark-card p-3 rounded-lg flex-grow flex flex-col items-start text-left overflow-y-auto">
                        <div className="w-full shrink-0">
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-bold mb-4 bg-[#6D282C] text-white shadow-lg shadow-maroon-900/50 float-left">STEP 4 &gt;</span>
                        </div>

                        <p className="font-bold text-gray-100 mb-4 text-lg leading-snug w-full text-center shrink-0">
                            Use <span className="text-cyan-400">Robotrix+ AI blocks</span> (Asymmetrical Incremental blocks) To guage lateral and medial extension gaps
                        </p>

                        <div className="w-full aspect-square max-h-[300px] rounded-lg flex items-center justify-center relative overflow-hidden mb-4 self-center border border-gray-700 bg-black shrink-0">
                            <img src="/leftside.png" alt="AI Block" className="w-full h-full object-cover" />
                        </div>

                        <div className="mt-auto bg-gray-800/80 p-3 rounded-xl w-full border border-gray-700 shadow-lg text-center shrink-0">
                            <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-semibold">Implant Thickness Chosen</p>
                            <p className="text-3xl font-extrabold text-white">{thickness} <span className="text-sm text-gray-500">mm</span></p>
                        </div>
                    </div>
                </div>

                {/* Column 2: Image & Overlays (Span 1) */}
                <div className="h-full flex flex-col gap-2 overflow-hidden">
                    <div className="w-full relative flex-grow min-h-0 flex items-center justify-center bg-transparent overflow-hidden rounded-xl border border-gray-800">
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                            <img src="/center.png" alt="Knee View" className="w-full h-full object-contain" />
                        </div>

                        {/* Overlay Container - Centered Vertically */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 flex justify-between pointer-events-none z-10 w-full items-center">

                            {/* Left Group */}
                            <div className="flex flex-col items-start text-left max-w-[120px]">
                                <div className="h-16 flex flex-col justify-end mb-1 w-full">
                                    <p className="text-xs font-semibold text-gray-300 leading-snug drop-shadow-md">
                                        Adjust the distal femoral<br />
                                        and proximal tibial cut<br />
                                        thickness to get
                                    </p>
                                </div>
                                <p className="text-lg text-gray-100 font-bold mb-2 shadow-black drop-shadow-lg">
                                    Lateral Gap
                                </p>
                                <div className="w-24 h-24 rounded-full border-4 border-[#6D282C] bg-black/80 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(109,40,44,0.6)] backdrop-blur-sm ml-2">
                                    <span className="text-3xl font-bold text-white">{thickness}</span>
                                    <span className="text-xs text-gray-300 font-bold mt-[-2px]">mm</span>
                                </div>
                            </div>

                            {/* Right Group */}
                            <div className="flex flex-col items-end text-right max-w-[120px]">
                                <div className="h-16 flex flex-col justify-end mb-1 w-full">
                                    <p className="text-xs font-semibold text-gray-300 leading-snug drop-shadow-md">
                                        Anticipated
                                    </p>
                                </div>
                                <p className="text-lg text-gray-100 font-bold mb-2 shadow-black drop-shadow-lg">
                                    Medial Gap
                                </p>
                                <div className="w-24 h-24 rounded-full border-4 border-[#6D282C] bg-black/80 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(109,40,44,0.6)] backdrop-blur-sm ml-2">
                                    <span className="text-3xl font-bold text-white">{anticipatedMedialGap}</span>
                                    <span className="text-xs text-gray-300 font-bold mt-[-2px]">mm</span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer: Lateral Laxity Check */}
                    <div className="gemini-dark-card p-2 rounded-lg flex items-center justify-between border border-gray-700 shrink-0">
                        <button
                            onClick={() => setPage('planner-valgus-stress-laxity-check')}
                            className="bg-[#6D282C] hover:bg-[#5a2023] text-white font-bold py-2 px-4 rounded-lg transition text-sm shadow-lg"
                        >
                            Check Lateral Laxity
                        </button>
                        <div className="text-right">
                            <span className="text-gray-400 text-xs uppercase font-bold tracking-wider mr-2">Laxity Level:</span>
                            <span className={`text-lg font-bold ${!lateralLaxity ? 'text-gray-500' : lateralLaxity === 'No Lateral Laxity' ? 'text-green-400' : 'text-red-400'}`}>
                                {lateralLaxity || 'Skipped'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Column 3: Flowchart Logic (Span 1) */}
                <div className="h-full flex flex-col gap-2 min-h-0">
                    {/* Right Path (Verification Success) */}
                    <div className="bg-[#1a1a1a] border-2 border-[#6D282C] rounded-xl p-3 flex flex-col items-center text-center relative overflow-hidden shadow-lg hover:bg-[#2a2a2a] transition-colors flex-1 min-h-0 shrink">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#6D282C]"></div>
                        <div className="w-8 h-8 rounded-full bg-[#6D282C] text-white flex items-center justify-center font-bold text-lg mb-2 shadow-[0_0_10px_#6D282C] shrink-0">✓</div>
                        <h4 className="text-lg font-extrabold text-red-100 mb-2 leading-tight">Medial gap matches anticipated gap</h4>
                        <div className="flex-grow flex items-center justify-center w-full min-h-0">
                            <div className="bg-black/40 p-3 rounded-lg border border-[#6D282C]/50 w-full backdrop-blur-md">
                                <p className="text-base text-gray-200 font-bold tracking-wide leading-snug">Proceed with the Functional Tibia Cut</p>
                            </div>
                        </div>
                    </div>

                    {/* Wrong Path (Red/Maroon) */}
                    <div className="bg-[#1a1a1a] border-2 border-[#6D282C] rounded-xl p-3 flex flex-col items-center text-center relative overflow-hidden shadow-lg hover:bg-[#2a2a2a] transition-colors flex-1 min-h-0 shrink">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#6D282C]"></div>
                        <div className="w-8 h-8 rounded-full bg-[#6D282C] text-white flex items-center justify-center font-bold text-lg mb-2 shadow-[0_0_10px_#6D282C] shrink-0">✕</div>
                        <h4 className="text-lg font-extrabold text-red-100 mb-2 leading-tight">Medial gap does not match anticipated gap</h4>
                        <div className="flex-grow flex flex-col gap-2 justify-center w-full min-h-0">
                            <div className="bg-black/40 p-2 rounded-lg border border-[#6D282C]/50 backdrop-blur-md hover:border-[#6D282C]/80 transition-colors">
                                <p className="text-red-100 text-sm font-bold">Consider error on 90 deg tibial cut</p>
                            </div>
                            <div className="flex items-center justify-center gap-2 shrink-0">
                                <div className="h-px bg-gray-600 flex-grow"></div>
                                <div className="text-gray-400 font-bold text-xs uppercase">OR</div>
                                <div className="h-px bg-gray-600 flex-grow"></div>
                            </div>
                            <div className="bg-black/40 p-2 rounded-lg border border-[#6D282C]/50 backdrop-blur-md hover:border-[#6D282C]/80 transition-colors">
                                <p className="text-red-100 text-sm font-bold">Consider Pre op lateral laxity</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-2 flex justify-end pb-2 shrink-0">
                <button
                    onClick={handleProceed}
                    className="bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold text-lg py-3 px-8 rounded-full shadow-xl transition transform hover:scale-105"
                >
                    Proceed Functional Tibial Cut
                </button>
            </div>
        </div>
    );
};

export default ValgusStressCoronalBalancingPage;
