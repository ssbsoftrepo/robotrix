import React from 'react';
import { useAppContext } from '../context/AppContext';

const IntraOpInstructionsPage: React.FC = () => {
    const {
        setPage,
        previousPage,
        setPreviousPage,
        appliedFemoralCutSim,
        implantThickness,
        intraOpCoronalBalancingData,
        setIntraOpCoronalBalancingData,
        kneeType,
    } = useAppContext();

    // Use appliedFemoralCutSim
    const femoralValue = appliedFemoralCutSim ?? 0;
    const thickness = implantThickness ?? 18;

    // Pre-op laxity from coronal balancing data
    const preOpLaxity = intraOpCoronalBalancingData.additionalLaxity;

    const targetLateralGap = thickness;
    const targetMedialGap = targetLateralGap - preOpLaxity; // 1 deg ≈ 1mm

    const handleLaxityChange = (delta: number) => {
        setIntraOpCoronalBalancingData(prev => ({
            ...prev,
            additionalLaxity: Math.max(0, prev.additionalLaxity + delta)
        }));
    };

    const handleCheckLaxity = () => {
        if (kneeType === 'valgus') {
            setPreviousPage('intra-op-instructions');
            setPage('planner-valgus-stress-laxity-check');
        } else {
            setPreviousPage('intra-op-instructions');
            setPage('planner-long-leg-laxity-check');
        }
    };

    const handleBack = () => {
        if (previousPage) {
            setPage(previousPage);
        } else {
            setPage('case-management');
        }
    };

    return (
        <div className="w-full h-screen bg-gradient-to-br from-[#1E1E1E] to-[#121212] text-gray-200 flex flex-col font-sans relative">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[60fr_40fr] gap-6 p-4 min-h-0 relative z-10 overflow-y-auto lg:overflow-hidden">

                {/* Left Column: Steps */}
                <div className="flex flex-col gap-4 min-h-0">
                    {/* Step 1 */}
                    <div className="relative bg-[#1a1a1a] border border-[#333333] rounded-xl p-6 flex items-center gap-6 flex-1 min-h-0 shadow-xl">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="flex-grow relative z-10">
                            <span className="text-[#6D282C] font-black text-2xl uppercase mb-2 block tracking-wider">Step 1:</span>
                            <div className="text-lg md:text-xl font-bold uppercase tracking-wide text-gray-200 leading-relaxed">
                                PROCEED WITH THE FOUNDATIONAL DISTAL FEMORAL VALGUS CUT{' '}
                                <span className="inline-block bg-[#6D282C] text-white px-3.5 py-1 rounded-md text-2xl md:text-3xl font-black ml-1.5 shadow-md border border-[#893338] align-middle">
                                    {femoralValue.toFixed(0)}°
                                </span>
                            </div>
                        </div>
                        <div className="shrink-0 relative z-10">
                            <img src="/valguscut.png" alt="Femoral Cut" className="h-28 w-auto object-contain drop-shadow-lg" />
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative bg-[#1a1a1a] border border-[#333333] rounded-xl p-6 flex items-center gap-6 flex-1 min-h-0 shadow-xl">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="flex-grow relative z-10">
                            <span className="text-[#6D282C] font-black text-2xl uppercase mb-2 block tracking-wider">Step 2:</span>
                            <div className="text-lg md:text-xl font-bold uppercase tracking-wide text-gray-200 leading-relaxed">
                                PROCEED WITH THE PROVISIONAL{' '}
                                <span className="inline-block bg-[#6D282C] text-white px-3.5 py-1 rounded-md text-2xl md:text-3xl font-black mx-1 shadow-md border border-[#893338] align-middle">
                                    90°
                                </span>
                                {' '}PROXIMAL TIBIA CUT
                            </div>
                        </div>
                        <div className="shrink-0 relative z-10">
                            <img src="/tibialcut.png" alt="Tibial Cut" className="h-28 w-auto object-contain drop-shadow-lg" />
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative bg-[#1a1a1a] border border-[#333333] rounded-xl p-6 flex items-center gap-6 flex-1 min-h-0 shadow-xl">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
                        <div className="flex-grow relative z-10">
                            <span className="text-[#6D282C] font-black text-2xl uppercase mb-2 block tracking-wider">Step 3:</span>
                            <div className="text-lg md:text-xl font-bold uppercase tracking-wide text-gray-200 leading-relaxed">
                                RETAIN THE PINS<br />
                                PROCEED WITH THE INTRA OP GAP ASSESSMENT USING THE AI BLOCKS
                            </div>
                        </div>
                        <div className="shrink-0 relative z-10">
                            <img src="/fixation-pins.png" alt="Fixation Pins" className="h-28 w-auto object-contain drop-shadow-lg" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Laxity Controls (Blue / Slate styling matching design) */}
                <div className="flex flex-col justify-center min-h-0 h-full">
                    <div className="relative bg-[#131d2a]/90 border-2 border-[#2b4c72] rounded-xl p-6 lg:p-8 flex flex-col justify-center gap-6 lg:gap-8 flex-1 shadow-2xl">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />

                        {/* Optional Heading */}
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white uppercase tracking-widest text-center relative z-10 drop-shadow-md">
                            OPTIONAL
                        </h2>

                        {/* Check Lateral Laxity Button */}
                        <button
                            onClick={handleCheckLaxity}
                            className="w-full py-4 bg-[#284566] hover:bg-[#345982] hover:border-[#4d7cae] active:scale-[0.98] text-white text-base md:text-lg font-black rounded-lg border-2 border-[#3c6491] shadow-[0_4px_20px_rgba(25,50,80,0.5)] tracking-widest uppercase transition-all duration-300 relative z-10"
                        >
                            CHECK FOR LATERAL LAXITY
                        </button>

                        {/* Apply Pre-Op Lateral Laxity */}
                        <div className="flex flex-col items-center gap-3 relative z-10">
                            <h3 className="text-sm md:text-base font-bold text-slate-300 uppercase tracking-widest text-center">
                                APPLY PRE-OP LATERAL LAXITY
                            </h3>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => handleLaxityChange(-1)}
                                    className="w-14 h-14 rounded-lg text-white font-bold text-2xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_12px_rgba(25,50,80,0.5)] flex items-center justify-center bg-[#233d5c] border-2 border-[#385e8a]"
                                >-</button>
                                <div className="w-24 h-14 bg-black/90 border border-[#385e8a]/70 flex items-center justify-center rounded-lg shadow-inner">
                                    <span className="text-3xl font-black text-white">{preOpLaxity}°</span>
                                </div>
                                <button
                                    onClick={() => handleLaxityChange(1)}
                                    className="w-14 h-14 rounded-lg text-white font-bold text-2xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_12px_rgba(25,50,80,0.5)] flex items-center justify-center bg-[#233d5c] border-2 border-[#385e8a]"
                                >+</button>
                            </div>
                        </div>

                        {/* Target Gap Boxes */}
                        <div className="flex items-center justify-center gap-6 relative z-10">
                            {/* Target Lateral Gap */}
                            <div className="flex flex-col items-center flex-1">
                                <div className="w-full rounded-xl border-2 border-[#2b4c72] bg-[#1a2d42]/70 p-4 flex flex-col items-center justify-center shadow-md">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Target Lateral Gap</span>
                                    <span className="text-4xl font-black text-white">{targetLateralGap}</span>
                                    <span className="text-sm text-slate-400 font-bold">mm</span>
                                </div>
                            </div>

                            {/* Target Medial Gap */}
                            <div className="flex flex-col items-center flex-1">
                                <div className="w-full rounded-xl border-2 border-[#2b4c72] bg-[#1a2d42]/70 p-4 flex flex-col items-center justify-center shadow-md">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Target Medial Gap</span>
                                    <span className="text-4xl font-black text-white">{targetMedialGap}</span>
                                    <span className="text-sm text-slate-400 font-bold">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="shrink-0 p-4 flex justify-between relative z-10">
                <button
                    onClick={handleBack}
                    className="group relative py-2 px-6 bg-[#252525] border border-[#444444] rounded-sm shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)] active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-gray-200 tracking-wider group-hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        BACK
                    </span>
                </button>

                <button
                    onClick={() => setPage('intra-operative-validation')}
                    className="group relative py-2 px-8 bg-[#6D282C] border border-[#893338] rounded-sm shadow-[0_4px_20px_rgba(109,40,44,0.4)] transition-all duration-300 ease-out hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-wider">
                        INTRA OP
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </span>
                </button>
            </div>
        </div>
    );
};

export default IntraOpInstructionsPage;

