import React from 'react';
import { useAppContext } from '../context/AppContext';

const IntraOpInstructionsPage: React.FC = () => {
    const { setPage, appliedFemoralCutSim } = useAppContext();

    // Use appliedFemoralCutSim
    const femoralValue = appliedFemoralCutSim ?? 0;

    return (
        <div className="w-full h-screen bg-[#111111] text-gray-200 flex flex-col font-sans">
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto w-full">
                <div className="flex flex-col gap-12 w-full text-left bg-[#1a1a1a] p-12 border border-[#333333] rounded-lg shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
                    
                    {/* Step 1 */}
                    <div className="flex flex-col relative z-10">
                        <span className="text-[#6D282C] font-black text-2xl uppercase mb-2">Step 1:</span>
                        <div className="text-xl font-bold uppercase tracking-wide text-gray-300 flex items-baseline gap-2 whitespace-nowrap">
                            <span>PROCEED WITH THE FOUNDATIONAL DISTAL FEMORAL VALGUS CUT</span>
                            <span className="text-[#6D282C] text-2xl font-black">({femoralValue.toFixed(1)}°)</span>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col relative z-10">
                        <span className="text-[#6D282C] font-black text-2xl uppercase mb-2">Step 2:</span>
                        <div className="text-xl font-bold uppercase tracking-wide text-gray-300 flex flex-wrap items-baseline gap-2">
                            <span>PROCEED WITH THE PROVISIONAL <span className="text-[#6D282C] text-2xl font-black">90</span> DEG PROXIMAL TIBIA CUT</span>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col relative z-10">
                        <span className="text-[#6D282C] font-black text-2xl uppercase mb-2">Step 3:</span>
                        <div className="text-xl font-bold uppercase tracking-wide text-gray-300 flex flex-wrap items-baseline gap-2">
                            <span>PROCEED WITH THE INTRA OP GAP ASSESSMENT USING THE AI BLOCKS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="shrink-0 p-4 bg-[#1a1a1a] border-t border-[#333333] flex justify-between relative z-10">
                <button
                    onClick={() => setPage('simulation')}
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
