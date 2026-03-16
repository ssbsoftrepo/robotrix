
import React from 'react';
import { useAppContext } from '../context/AppContext';

const IntraOperativeValidationPage: React.FC = () => {
    const {
        setPage,
        implantThickness,
        longLegResults,
        intraOpValidationData,
        setIntraOpValidationData,
        legSide,
    } = useAppContext();

    const isLeftLeg = legSide === 'left';

    const { medialGap, lateralGap, tibiaWidth } = intraOpValidationData;

    React.useEffect(() => {
        if (intraOpValidationData.medialGap === 16 && intraOpValidationData.lateralGap === 16) {
        }
    }, []);


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
        return 'text-red-500 border-red-500 bg-red-500/10'; // No Match
    };

    const getGapStatus = (diff: number) => {
        if (diff === 0) return 'MATCH';
        return 'NO MATCH';
    };

    const C = (tibiaWidth / 70) * 1.2;
    const revisedVarusCut = (thickness - medialGap) / C;

    const handleUpdateData = (field: string, delta: number) => {
        setIntraOpValidationData({
            ...intraOpValidationData,
            [field]: Math.max(0, (intraOpValidationData as any)[field] + delta)
        });
    };

    React.useEffect(() => {
        if (medialGap === 16 && lateralGap === 16) {
            setIntraOpValidationData({
                ...intraOpValidationData,
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
                <h2 className="text-3xl font-bold text-[#E0E0E0] uppercase">INTRA – OP INPUT SCREEN</h2>
            </div>

            <div className="flex-grow grid grid-cols-[22fr_52fr_26fr] gap-2 min-h-0 px-2 relative z-10">
                {/* Column 1: Instructions & Images */}
                <div className="h-full flex flex-col gap-2 overflow-hidden">
                    <div className="flex flex-col gap-3 flex-grow min-h-0">
                        <div className="relative bg-[#2a2a2a]/60 p-2 rounded-xl border-l-4 border-[#6D282C] flex flex-col gap-2 flex-[1] min-h-0 shadow-lg justify-center items-center">
                            <div className="flex items-start gap-2 w-full">
                                <div className="bg-[#6D282C] text-white w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-lg border border-[#893338] mt-0.5">1</div>
                                <p className="text-[16px] font-bold text-gray-300 leading-snug w-full uppercase">Use Robotrix AI Blocks (Asymmetrical incremental) to gauge Medial and Lateral extension gaps</p>
                            </div>
                            <div style={{ marginTop: '0.5rem' }} className="w-full flex justify-center shrink min-h-0 items-center">
                                <img src="/AI_blocks.png" alt="AI Blocks" className="max-h-[150px] max-w-[80%] object-contain drop-shadow-lg" />
                            </div>
                        </div>

                        <div className="relative bg-[#2a2a2a]/60 p-2 rounded-xl border-l-4 border-[#6D282C] flex flex-col gap-2 flex-[1] min-h-0 shadow-lg justify-center items-center">
                            <div className="flex items-start gap-2 w-full">
                                <div className="bg-[#6D282C] text-white w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-lg border border-[#893338] mt-0.5">2</div>
                                <p className="text-[16px] font-bold text-gray-300 leading-snug w-full uppercase">Measure Mid Mediolateral Tibial width using tibial callipers</p>
                            </div>
                            <div className="w-full flex justify-center shrink min-h-0 items-center">
                                <img src="/calipper.png" alt="Tibia Caliper" className="max-h-[140px] max-w-[75%] object-contain drop-shadow-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Visual Comparison */}
                <div className="h-full flex flex-col gap-1 overflow-hidden">
                    <div className="relative flex-grow bg-[#1a1a1a] border border-[#333333] rounded-xl flex items-stretch p-2">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />

                        {/* Left Side */}
                        <div className="flex flex-col items-center z-20 px-2 shrink-0 w-[130px]">
                            <div className={`bg-black/90 border-2 ${isLeftLeg ? 'border-[#6D282C]' : 'border-[#333333]'} rounded-xl p-2 text-center shadow-[0_4px_15px_rgba(0,0,0,0.5)] w-full mt-2`}>
                                <p className={`${isLeftLeg ? 'text-[#ff8fa3]' : 'text-gray-500'} text-[10px] font-black uppercase tracking-wider mb-1 leading-tight`}>ANTICIPATED<br />{isLeftLeg ? 'MEDIAL GAP' : 'LATERAL GAP'}</p>
                                <p className={`text-3xl font-black ${isLeftLeg ? 'text-[#ff8fa3]' : 'text-white'}`}>{isLeftLeg ? anticipatedMedialGap : anticipatedLateralGap}<span className={`text-sm ${isLeftLeg ? 'text-[#ff8fa3]/70' : 'text-gray-400'} ml-1`}>mm</span></p>
                            </div>
                            <div className="flex-grow flex flex-col items-center justify-center gap-2">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">ACTUAL {isLeftLeg ? 'MEDIAL' : 'LATERAL'}</p>
                                <div className="flex flex-col items-center gap-2 w-full">
                                    <div className={`w-22 h-22 rounded-full border-[4px] transition-all duration-500 flex flex-col items-center justify-center bg-[#0a0a0a] shadow-[0_0_20px_rgba(0,0,0,0.8)] ${getStatusColor(isLeftLeg ? medialDiff : lateralDiff)}`} style={{ width: '5.5rem', height: '5.5rem' }}>
                                        <span className={`text-3xl font-black leading-none`}>{isLeftLeg ? medialGap : lateralGap}</span>
                                        <span className="text-xs font-bold opacity-70 mt-0.5">mm</span>
                                    </div>
                                    <div className={`px-3 py-1 rounded-md text-sm font-black uppercase tracking-widest w-[110px] text-center shadow-lg ${isLeftLeg ? (medialDiff === 0 ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-red-500/20 text-red-500 border border-red-500/50') : (lateralDiff === 0 ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-red-500/20 text-red-500 border border-red-500/50')}`}>
                                        {isLeftLeg ? getGapStatus(medialDiff) : getGapStatus(lateralDiff)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Center - Bone Image */}
                        <div className="flex-grow flex items-center justify-center z-10 min-w-0 px-2">
                            <img src={isLeftLeg ? '/intraval-left.png' : '/intraval-right.png'} alt="Joint Model" className="max-h-[95%] max-w-full object-contain filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
                        </div>

                        {/* Right Side */}
                        <div className="flex flex-col items-center z-20 px-2 shrink-0 w-[130px]">
                            <div className={`bg-black/90 border-2 ${isLeftLeg ? 'border-[#333333]' : 'border-[#6D282C]'} rounded-xl p-2 text-center shadow-[0_4px_15px_rgba(0,0,0,0.5)] w-full mt-2`}>
                                <p className={`${isLeftLeg ? 'text-gray-500' : 'text-[#ff8fa3]'} text-[10px] font-black uppercase tracking-wider mb-1 leading-tight`}>ANTICIPATED<br />{isLeftLeg ? 'LATERAL GAP' : 'MEDIAL GAP'}</p>
                                <p className={`text-3xl font-black ${isLeftLeg ? 'text-white' : 'text-[#ff8fa3]'}`}>{isLeftLeg ? anticipatedLateralGap : anticipatedMedialGap}<span className={`text-sm ${isLeftLeg ? 'text-gray-400' : 'text-[#ff8fa3]/70'} ml-1`}>mm</span></p>
                            </div>
                            <div className="flex-grow flex flex-col items-center justify-center gap-2">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">ACTUAL {isLeftLeg ? 'LATERAL' : 'MEDIAL'}</p>
                                <div className="flex flex-col items-center gap-2 w-full">
                                    <div className={`w-22 h-22 rounded-full border-[4px] transition-all duration-500 flex flex-col items-center justify-center bg-[#0a0a0a] shadow-[0_0_20px_rgba(0,0,0,0.8)] ${getStatusColor(isLeftLeg ? lateralDiff : medialDiff)}`} style={{ width: '5.5rem', height: '5.5rem' }}>
                                        <span className={`text-3xl font-black leading-none`}>{isLeftLeg ? lateralGap : medialGap}</span>
                                        <span className="text-xs font-bold opacity-70 mt-0.5">mm</span>
                                    </div>
                                    <div className={`px-3 py-1 rounded-md text-sm font-black uppercase tracking-widest w-[110px] text-center shadow-lg ${isLeftLeg ? (lateralDiff === 0 ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-red-500/20 text-red-500 border border-red-500/50') : (medialDiff === 0 ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-red-500/20 text-red-500 border border-red-500/50')}`}>
                                        {isLeftLeg ? getGapStatus(lateralDiff) : getGapStatus(medialDiff)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Inputs & Formula */}
                <div className="h-full flex flex-col gap-2 overflow-hidden">
                    {/* Inputs Section */}
                    <div className="bg-[#1a1a1a] border border-[#333333] pt-2 pb-2 px-2 rounded-xl flex flex-col flex-[45] min-h-0 justify-center relative mt-2">
                        <div className="absolute top-0 inset-x-0 w-full flex justify-center mt-2 z-10">
                            <span className="px-4 py-2 rounded-sm text-[10px] font-black bg-[#6D282C] text-white shadow-lg tracking-widest uppercase border border-[#893338]">ACTUAL GAPS</span>
                        </div>
                        <div className="space-y-4 w-full px-1 mt-2">
                            {/* First gap input: Medial for left knee, Lateral for right knee */}
                            <div className="flex flex-col gap-0.5">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest text-center">{isLeftLeg ? 'MEDIAL' : 'LATERAL'} GAP (MM)</label>
                                <div className="flex items-center justify-center gap-3">
                                    <button onClick={() => handleUpdateData(isLeftLeg ? 'medialGap' : 'lateralGap', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-20 py-1 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{isLeftLeg ? medialGap : lateralGap}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData(isLeftLeg ? 'medialGap' : 'lateralGap', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>
                            {/* Second gap input: Lateral for left knee, Medial for right knee */}
                            <div className="flex flex-col gap-0.5">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest text-center">{isLeftLeg ? 'LATERAL' : 'MEDIAL'} GAP (MM)</label>
                                <div className="flex items-center justify-center gap-3">
                                    <button onClick={() => handleUpdateData(isLeftLeg ? 'lateralGap' : 'medialGap', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-20 py-1 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{isLeftLeg ? lateralGap : medialGap}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData(isLeftLeg ? 'lateralGap' : 'medialGap', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>
                            {/* Tibia Width */}
                            <div className="flex flex-col gap-0.5">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest text-center">MID TIBIA WIDTH (MM)</label>
                                <div className="flex items-center justify-center gap-3">
                                    <button onClick={() => handleUpdateData('tibiaWidth', -1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>-</button>
                                    <div className="w-20 py-1 bg-black border border-[#333333] flex items-center justify-center rounded-sm">
                                        <span className="text-2xl font-black text-white">{tibiaWidth}</span>
                                    </div>
                                    <button onClick={() => handleUpdateData('tibiaWidth', 1)} className="w-10 h-10 rounded-sm text-white font-bold text-xl transition-all duration-300 hover:brightness-125 active:scale-95 shadow-[0_2px_10px_rgba(109,40,44,0.5)]"
                                        style={{ background: 'linear-gradient(180deg, rgba(109,40,44,0.25) 0%, rgba(60,18,22,0.4) 100%)', border: '2px solid transparent', borderImage: 'linear-gradient(180deg, #a04046, #6D282C, #4a1a1e) 1' }}>+</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Error Considerations */}
                    <div className="flex-[55] min-h-0 flex flex-col">
                        <div className="bg-[#6D282C]/10 border border-[#6D282C]/30 rounded-xl p-3 flex flex-col h-full shadow-[0_0_20px_rgba(109,40,44,0.1)]">
                            <div className="flex items-center gap-2 mb-2 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-amber-500 font-bold text-lg leading-tight flex-grow text-center uppercase">Actual gaps do not match.</span>
                            </div>
                            <div className="flex-grow flex flex-col justify-center">
                                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2 px-1">CONSIDER THE FOLLOWING:</p>
                                <div className="space-y-1.5 px-1">
                                    {[
                                        "Input of inaccurate data",
                                        "Under/over resection of foundations",
                                        "Presence of pre-op lateral laxity",
                                        "Error in Provisional 90° tibial cut"
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-[#1a1a1a] p-2 rounded border border-[#333333]">
                                            <span className="w-2 h-2 rounded-full bg-amber-500/80 shrink-0 ml-1" />
                                            <span className="text-gray-300 text-[14px] font-medium leading-tight uppercase">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer proceeds to Coronal Balancing */}
            <div className="mt-2 flex justify-between pb-1 shrink-0 px-2 relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => setPage('pre-op-report')}
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
