
import React, { useRef } from 'react';
import { useAppContext } from '../context/AppContext';

const ValgusStressCoronalBalancingPage: React.FC = () => {
    const { 
        setPage, 
        implantThickness, 
        valgusResults, 
        setValgusCoronalBalancingResults, 
        lateralLaxity,
        valgusCoronalBalancingMainImage, setValgusCoronalBalancingMainImage,
        valgusCoronalBalancingBlockImage, setValgusCoronalBalancingBlockImage
    } = useAppContext();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const blockInputRef = useRef<HTMLInputElement>(null);

    // Calculation Logic
    const thickness = implantThickness ?? 10; 
    const mpta = valgusResults.mpta ?? 86; 
    
    const rawTightness = 86 - mpta;
    const anticipatedTightness = rawTightness > 4 ? 4 : Math.max(0, Math.round(rawTightness)); 
    
    const anticipatedMedialGap = thickness - anticipatedTightness;

    const handleMainUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setValgusCoronalBalancingMainImage(ev.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleBlockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setValgusCoronalBalancingBlockImage(ev.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-4xl font-bold text-gray-100">Coronal Balancing screen (Valgus Stress)</h2>
                 <button onClick={() => setPage('planner-valgus-stress-results')} className="gemini-dark-button font-bold py-2 px-4 rounded-md transition text-md flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span>Back</span>
                </button>
            </div>

            <div className="flex flex-col lg:flex-row flex-grow gap-6">
                {/* Column 1: Instructions & Block Upload (1/4 Width) */}
                <div className="w-full lg:w-1/4 gemini-dark-card p-6 rounded-lg flex flex-col items-start text-left">
                    <div className="w-full">
                        <span className="inline-block px-6 py-2 rounded-full text-xl font-bold mb-8 bg-yellow-600 text-black shadow-lg shadow-yellow-900/50 float-left">STEP 4 &gt;</span>
                    </div>
                    
                    <p className="font-bold text-gray-100 mb-10 text-3xl leading-snug w-full text-center">
                        Use <span className="text-cyan-400">Robotrix+ AI blocks</span> (Asymmetrical Incremental blocks) To guage lateral and medial extension gaps
                    </p>
                    
                    <div 
                        className="w-full aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-800 transition relative overflow-hidden mb-6 group self-center"
                        onClick={() => blockInputRef.current?.click()}
                    >
                        {valgusCoronalBalancingBlockImage ? (
                            <img src={valgusCoronalBalancingBlockImage} alt="AI Block" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-500 flex flex-col items-center group-hover:text-cyan-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="font-medium">Upload Block Image</span>
                            </div>
                        )}
                        <input type="file" ref={blockInputRef} className="hidden" onChange={handleBlockUpload} accept="image/*"/>
                    </div>

                    <div className="mt-auto bg-gray-800/80 p-6 rounded-xl w-full border border-gray-700 shadow-lg text-center">
                        <p className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-semibold">Implant Thickness Chosen</p>
                        <p className="text-5xl font-extrabold text-white">{thickness} <span className="text-xl text-gray-500">mm</span></p>
                    </div>
                </div>

                {/* Column 2: Image & Overlays (2/4 Width) */}
                <div className="w-full lg:w-2/4 flex flex-col gap-4">
                    <div className="w-full relative flex-grow min-h-[450px] flex items-center justify-center bg-transparent overflow-hidden group">
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleMainUpload} accept="image/*"/>
                        <div 
                            className="absolute inset-0 flex items-center justify-center cursor-pointer z-0"
                            onClick={() => !valgusCoronalBalancingMainImage && fileInputRef.current?.click()}
                        >
                            {valgusCoronalBalancingMainImage ? (
                                <img src={valgusCoronalBalancingMainImage} alt="Knee View" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-gray-600 flex flex-col items-center animate-pulse">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <p className="text-2xl font-bold">Click to upload visual reference</p>
                                </div>
                            )}
                        </div>
                        
                        {valgusCoronalBalancingMainImage && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 p-3 rounded-full text-white opacity-0 group-hover:opacity-100 transition z-20 border border-gray-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                        )}

                        {/* Overlay Container - Centered Vertically */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-12 flex justify-between pointer-events-none z-10 w-full items-center">
                            
                            {/* Left Group */}
                            <div className="flex flex-col items-start text-left max-w-xs">
                                <div className="h-24 flex flex-col justify-end mb-2 w-full">
                                    <p className="text-xl font-semibold text-gray-300 leading-snug drop-shadow-md">
                                        Adjust the distal femoral<br/>
                                        and proximal tibial cut<br/>
                                        thickness to get
                                    </p>
                                </div>
                                <p className="text-3xl text-gray-100 font-bold mb-4 shadow-black drop-shadow-lg">
                                    Lateral Gap
                                </p>
                                <div className="w-40 h-40 rounded-full border-8 border-[#6D282C] bg-black/80 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(109,40,44,0.6)] backdrop-blur-sm ml-4">
                                    <span className="text-6xl font-bold text-white">{thickness}</span>
                                    <span className="text-lg text-gray-300 font-bold mt-[-5px]">mm</span>
                                </div>
                            </div>

                            {/* Right Group */}
                            <div className="flex flex-col items-end text-right max-w-xs">
                                <div className="h-24 flex flex-col justify-end mb-2 w-full">
                                    <p className="text-xl font-semibold text-gray-300 leading-snug drop-shadow-md">
                                        Anticipated
                                    </p>
                                </div>
                                <p className="text-3xl text-gray-100 font-bold mb-4 shadow-black drop-shadow-lg">
                                    Medial Gap
                                </p>
                                <div className="w-40 h-40 rounded-full border-8 border-yellow-500 bg-black/80 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.6)] backdrop-blur-sm mr-4">
                                    <span className="text-6xl font-bold text-yellow-400">{anticipatedMedialGap}</span>
                                    <span className="text-lg text-yellow-600 font-bold mt-[-5px]">mm</span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer: Lateral Laxity Check */}
                    <div className="gemini-dark-card p-4 rounded-lg flex items-center justify-between border border-gray-700">
                        <button 
                            onClick={() => setPage('planner-valgus-stress-laxity-check')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition text-lg shadow-lg"
                        >
                            Check Lateral Laxity
                        </button>
                        <div className="text-right">
                            <span className="text-gray-400 text-sm uppercase font-bold tracking-wider mr-3">Laxity Level:</span>
                            <span className={`text-xl font-bold ${!lateralLaxity ? 'text-gray-500' : lateralLaxity === 'No Lateral Laxity' ? 'text-green-400' : 'text-red-400'}`}>
                                {lateralLaxity || 'Skipped'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Column 3: Flowchart Logic (1/4 Width) */}
                <div className="w-full lg:w-1/4 flex flex-col gap-6">
                    {/* Right Path (Green) */}
                    <div className="bg-[#064e3b]/30 border-2 border-[#059669]/50 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden shadow-lg hover:bg-[#064e3b]/40 transition-colors flex-1">
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#10b981]"></div>
                        <div className="w-16 h-16 rounded-full bg-[#10b981] text-black flex items-center justify-center font-bold text-3xl mb-4 shadow-[0_0_15px_#10b981]">✓</div>
                        <h4 className="text-2xl font-extrabold text-[#6ee7b7] mb-6">Medial gap matches anticipated gap</h4>
                        <div className="flex-grow flex items-center justify-center w-full">
                            <div className="bg-black/40 p-6 rounded-lg border border-[#10b981]/30 w-full backdrop-blur-md">
                                <p className="text-2xl text-white font-bold tracking-wide leading-snug">Proceed with the Functional Tibia Cut</p>
                            </div>
                        </div>
                    </div>

                    {/* Wrong Path (Red) */}
                    <div className="bg-[#7f1d1d]/30 border-2 border-[#dc2626]/50 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden shadow-lg hover:bg-[#7f1d1d]/40 transition-colors flex-1">
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#ef4444]"></div>
                        <div className="w-16 h-16 rounded-full bg-[#ef4444] text-white flex items-center justify-center font-bold text-3xl mb-4 shadow-[0_0_15px_#ef4444]">✕</div>
                        <h4 className="text-2xl font-extrabold text-[#fca5a5] mb-6">Medial gap does not match anticipated gap</h4>
                        <div className="flex-grow flex flex-col gap-3 justify-center w-full">
                            <div className="bg-black/40 p-4 rounded-lg border border-[#ef4444]/30 backdrop-blur-md hover:border-[#ef4444]/60 transition-colors">
                                <p className="text-red-100 text-xl font-bold">Consider error on 90 deg tibial cut</p>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-px bg-gray-500 flex-grow"></div>
                                <div className="text-gray-400 font-bold text-sm uppercase">OR</div>
                                <div className="h-px bg-gray-500 flex-grow"></div>
                            </div>
                            <div className="bg-black/40 p-4 rounded-lg border border-[#ef4444]/30 backdrop-blur-md hover:border-[#ef4444]/60 transition-colors">
                                <p className="text-red-100 text-xl font-bold">Consider Pre op lateral laxity</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 flex justify-end pb-4">
                <button 
                    onClick={handleProceed} 
                    className="bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold text-2xl py-4 px-12 rounded-full shadow-xl transition transform hover:scale-105"
                >
                    Proceed Functional Tibial Cut
                </button>
            </div>
        </div>
    );
};

export default ValgusStressCoronalBalancingPage;
