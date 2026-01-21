import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

// --- SHARED/HELPER COMPONENTS ---

const KneeJointDrawing: React.FC = () => (
    <div className="p-4 bg-black rounded-lg flex items-center justify-center h-full">
        <svg viewBox="0 0 200 150" className="w-full h-auto max-w-[250px]" aria-label="Diagram of a knee joint with medial and lateral spaces indicated.">
            {/* Distal Femur */}
            <path d="M 40 10 C 20 10, 10 30, 10 50 L 10 60 L 190 60 L 190 50 C 190 30, 180 10, 160 10 Z" fill="#e3e3e3" />

            {/* Proximal Tibia */}
            <path d="M 10 90 L 10 110 C 10 130, 20 140, 40 140 L 160 140 C 180 140, 190 130, 190 110 L 190 90 Z" fill="#e3e3e3" />

            {/* Labels and Lines for Gaps */}
            <text x="45" y="80" fill="#89CFF0" fontSize="16" fontWeight="bold" textAnchor="middle">Medial</text>
            <line x1="10" y1="75" x2="80" y2="75" stroke="#89CFF0" strokeWidth="3" />

            <text x="155" y="80" fill="#F08080" fontSize="16" fontWeight="bold" textAnchor="middle">Lateral</text>
            <line x1="120" y1="75" x2="190" y2="75" stroke="#F08080" strokeWidth="3" />
        </svg>
    </div>
);


const LaxityCheckModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSetLaxity: (laxity: boolean) => void;
}> = ({ isOpen, onClose, onSetLaxity }) => {
    const { longLegImageSrc } = useAppContext();
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setPreviewImage(null);
        }
    }, [isOpen]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setPreviewImage(event.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="gemini-dark-card p-8 rounded-lg max-w-2xl text-center shadow-xl w-full flex flex-col relative">
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-semibold mb-6">Check for Lateral Laxity</h3>
                <div className="h-96 w-full flex items-center justify-center bg-black rounded-md mb-6 overflow-hidden">
                    {previewImage ? (
                        <img src={previewImage} alt="X-ray Preview" className="object-contain max-w-full max-h-full" />
                    ) : (<p className="text-gray-500">Select an image to view</p>)}
                </div>
                <div className="flex justify-center space-x-4 mb-6">
                    <button onClick={() => setPreviewImage(longLegImageSrc)} disabled={!longLegImageSrc} className="gemini-dark-button font-semibold py-3 px-6 rounded-md transition text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        View Long Film
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <button onClick={handleUploadClick} className="gemini-dark-button font-semibold py-3 px-6 rounded-md transition text-lg">
                        Upload X-ray
                    </button>
                </div>
                <div className="flex justify-center space-x-6">
                    <button onClick={() => { onSetLaxity(false); onClose(); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg">No Lateral Laxity</button>
                    <button onClick={() => { onSetLaxity(true); onClose(); }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg">There is Lateral Laxity</button>
                </div>
            </div>
        </div>
    );
};

// --- Tibial Cut Accuracy Check UI ---
const TibialCutAccuracyCheck = () => {
    const { longLegResults, setPage, tibiaBoundary } = useAppContext();
    const [hasLateralLaxity, setHasLateralLaxity] = useState<boolean | null>(null);
    const [isLaxityModalOpen, setIsLaxityModalOpen] = useState(true);
    const [medialSpace, setMedialSpace] = useState<string>('');
    const [lateralSpace, setLateralSpace] = useState<string>('');

    const getRecommendedTibialCut = () => {
        const mpta = longLegResults.mpta;
        if (mpta === null) return '--';
        let varusCut = 0;
        if (mpta <= 85) varusCut = 4;  // Significant varoid (includes out of boundary ≤84)
        else if (mpta <= 87) varusCut = 3;  // Moderate varoid: 85 < MPTA ≤ 87
        else if (mpta <= 88) varusCut = 2;  // Mild varoid: 87 < MPTA ≤ 88
        else if (mpta <= 90) varusCut = 1;  // Neutral tibia: 88 < MPTA ≤ 90
        // MPTA > 90 = 0° (valgoid tibia / neutral cut)

        if (tibiaBoundary === 'basic' && varusCut > 2) {
            varusCut = 2;
        }

        if (varusCut === 0) return '0° (neutral cut)';
        return `${varusCut}° varus cut`;
    };
    const anticipatedTightness = useMemo(() => {
        const mpta = longLegResults.mpta ?? 86;
        return Math.round(Math.max(0, 86 - mpta));
    }, [longLegResults.mpta]);
    const measuredDifference = useMemo(() => {
        const medialVal = parseFloat(medialSpace);
        const lateralVal = parseFloat(lateralSpace);
        return (!isNaN(medialVal) && !isNaN(lateralVal)) ? Math.abs(medialVal - lateralVal) : null;
    }, [medialSpace, lateralSpace]);

    const isMatch = measuredDifference !== null && anticipatedTightness === Math.round(measuredDifference);

    const renderConclusion = () => {
        if (measuredDifference === null) {
            return <p className="text-gray-500 text-center text-lg italic">Enter spacer block values to see verification.</p>
        }

        const matchMessage = isMatch ? (
            <div className="p-4 bg-green-900/50 border border-green-700 rounded-lg text-center">
                <p className="font-semibold text-xl text-green-300">The medial gap matches the tightness anticipated.</p>
            </div>
        ) : (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-center">
                <p className="font-semibold text-xl text-red-300">The medial gap does not match the tightness anticipated.</p>
                <p className="text-md text-red-400 mt-1">Consider error in the 90 degree tibial cut.</p>
            </div>
        );

        const warningMessage = hasLateralLaxity ? (
            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-center">
                <p className="font-semibold text-md text-yellow-300">Warning:</p>
                <p className="text-sm text-yellow-400 mt-1">The more medial to lateral difference, the more the need for medial release & adjust Varus cut as appropriate.</p>
            </div>
        ) : null;

        return <>{matchMessage}{warningMessage}</>;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <LaxityCheckModal isOpen={isLaxityModalOpen} onClose={() => setIsLaxityModalOpen(false)} onSetLaxity={setHasLateralLaxity} />
            <h2 className="text-4xl font-bold mb-2 text-center shrink-0">Tibial Cut Accuracy Check</h2>
            <div className="gemini-dark-card p-4 rounded-lg mb-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-center shrink-0">
                <div>
                    <p className="text-lg text-yellow-500">Long Leg Film CPAK Type</p>
                    <p className="font-bold text-3xl text-yellow-400">CPAK {longLegResults.cpak}</p>
                </div>
                <div className="border-t md:border-t-0 md:border-l border-gray-700 pt-2 md:pt-0">
                    <p className="text-lg text-yellow-500">Recommended Tibial Varus Cut</p>
                    <p className="font-bold text-3xl text-yellow-400">{getRecommendedTibialCut()}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow min-h-0 overflow-y-auto">
                <div className="gemini-dark-card p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-center">1. Anticipated Medial Tightness</h3>
                    <div className="space-y-2">
                        {["No medial tightness", "1 mm", "2 mm", "3 mm", "4 mm+"].map((text, index) => (
                            <div key={index} className={`p-2 text-base rounded-md text-center transition ${((index === 4) ? (anticipatedTightness >= 4) : (anticipatedTightness === index)) ? 'bg-green-800 text-white font-bold ring-2 ring-green-500' : 'bg-gray-800 text-gray-300'}`}>
                                {text}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="gemini-dark-card p-4 rounded-lg flex flex-col justify-center">
                    <h3 className="text-lg font-semibold mb-2 text-center">2. Assess Medial & Lateral Spaces</h3>
                    <p className="text-center text-gray-400 text-sm mb-2">Use the Robotrix+ asymetric incremental blocks.</p>
                    <div className="flex justify-around items-center mt-2 space-x-2">
                        <div>
                            <label className="block text-center text-base mb-1">Medial (mm)</label>
                            <input type="number" value={medialSpace} onChange={e => setMedialSpace(e.target.value)} className="gemini-dark-input w-24 p-2 text-lg text-center rounded-md" />
                        </div>
                        <div>
                            <label className="block text-center text-base mb-1">Lateral (mm)</label>
                            <input type="number" value={lateralSpace} onChange={e => setLateralSpace(e.target.value)} className="gemini-dark-input w-24 p-2 text-lg text-center rounded-md" />
                        </div>
                    </div>
                    {measuredDifference !== null && (
                        <div className="mt-4 text-center bg-gray-900 p-2 rounded-md">
                            <p className="text-base text-gray-400">Measured Difference</p>
                            <p className="text-2xl font-bold text-white">{measuredDifference.toFixed(1)} mm</p>
                        </div>
                    )}
                </div>
                <div className="gemini-dark-card p-4 rounded-lg flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-center">3. Verification</h3>
                        <button onClick={() => setIsLaxityModalOpen(true)} className="w-full bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold py-2 px-4 rounded-lg text-base mb-2">Check Lateral Laxity</button>
                        <div className="text-center bg-gray-900 p-2 rounded-md mb-4">
                            <p className="text-base text-gray-400">Lateral Laxity Status:</p>
                            <p className={`text-xl font-bold ${hasLateralLaxity ? 'text-red-400' : hasLateralLaxity === false ? 'text-green-400' : 'text-gray-500'}`}>{hasLateralLaxity ? 'Present' : hasLateralLaxity === false ? 'Absent' : 'Not Set'}</p>
                        </div>
                    </div>
                    <div className="mt-2">{renderConclusion()}</div>
                </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center shrink-0">
                Ensure medial and lateral spaces are assessed accurately.
            </div>
            <div className="mt-4 flex justify-between shrink-0">
                <button onClick={() => setPage('results-analysis')} className="group relative py-2 px-4 bg-[#6D282C] border border-[#893338] rounded-sm 
                           shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                           transition-all duration-300 ease-out
                           hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                           active:scale-[0.98] flex items-center">
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
                <button onClick={() => setPage('simulation')} className="group relative py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                           shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                           transition-all duration-300 ease-out
                           hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                           active:scale-[0.98] flex items-center">
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-wider">
                        SIMULATION
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

// --- Functional Alignment Planner UI ---
const FunctionalAlignmentPlanner = () => {
    const { valgusResults, setPage } = useAppContext();
    const [hasLateralLaxity, setHasLateralLaxity] = useState<boolean | null>(null);
    const [isLaxityModalOpen, setIsLaxityModalOpen] = useState(true);
    const [medialSpace, setMedialSpace] = useState<string>('');
    const [lateralSpace, setLateralSpace] = useState<string>('');

    const measuredDifference = useMemo(() => {
        const medialVal = parseFloat(medialSpace);
        const lateralVal = parseFloat(lateralSpace);
        return (!isNaN(medialVal) && !isNaN(lateralVal)) ? Math.abs(medialVal - lateralVal) : null;
    }, [medialSpace, lateralSpace]);

    const functionalRecut = useMemo(() => {
        if (measuredDifference === null) return '--';
        if (measuredDifference >= 4) return '3° varus';
        if (measuredDifference >= 3) return '2° varus';
        return '1° varus';
    }, [measuredDifference]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <LaxityCheckModal isOpen={isLaxityModalOpen} onClose={() => setIsLaxityModalOpen(false)} onSetLaxity={setHasLateralLaxity} />
            <h2 className="text-4xl font-bold mb-4 text-center shrink-0">Functional Alignment Planner</h2>
            <div className="gemini-dark-card p-4 rounded-lg mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-center shrink-0">
                <div>
                    <p className="text-lg text-yellow-500">Valgus Stress Film CPAK Type</p>
                    <p className="font-bold text-3xl text-yellow-400">CPAK {valgusResults.cpak}</p>
                </div>
                <div className="border-t md:border-t-0 md:border-l border-gray-700 pt-2 md:pt-0">
                    <p className="text-lg text-yellow-500">Recommended Femoral Valgus Cut</p>
                    <p className="font-bold text-3xl text-yellow-400">{valgusResults.cut}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow min-h-0 overflow-y-auto">
                <div className="gemini-dark-card p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4 text-center">1. Assess Medial & Lateral Spaces</h3>
                    <p className="text-center text-gray-400 text-sm mb-4">Use the Robotrix+ asymetric incremental blocks.</p>
                    <div className="flex justify-around items-center mt-4 space-x-4">
                        <div>
                            <label className="block text-center text-lg mb-2">Medial (mm)</label>
                            <input type="number" value={medialSpace} onChange={e => setMedialSpace(e.target.value)} className="gemini-dark-input w-28 p-2 text-xl text-center rounded-md" />
                        </div>
                        <div>
                            <label className="block text-center text-lg mb-2">Lateral (mm)</label>
                            <input type="number" value={lateralSpace} onChange={e => setLateralSpace(e.target.value)} className="gemini-dark-input w-28 p-2 text-xl text-center rounded-md" />
                        </div>
                    </div>
                    {measuredDifference !== null && (
                        <div className="mt-6 text-center bg-gray-900 p-3 rounded-md">
                            <p className="text-lg text-gray-400">Measured Difference</p>
                            <p className="text-3xl font-bold text-white">{measuredDifference.toFixed(1)} mm</p>
                        </div>
                    )}
                </div>
                <div className="gemini-dark-card p-6 rounded-lg flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-center">2. Determine Functional Recut</h3>
                        <button onClick={() => setIsLaxityModalOpen(true)} className="w-full bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold py-3 px-4 rounded-lg text-lg mb-4">Check Lateral Laxity</button>
                        <div className="text-center bg-gray-800/80 p-4 rounded-lg">
                            <p className="text-2xl text-yellow-500">Functional Tibia Recut</p>
                            <p className="font-bold text-6xl text-yellow-400">{functionalRecut}</p>
                        </div>
                        <p className="text-center text-md text-gray-400 mt-4 p-2 bg-gray-900/50 rounded-md">Note: The recommended tibial varus cut is 0 to 3 degree.</p>
                        {hasLateralLaxity && (
                            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-center">
                                <p className="font-semibold text-md text-yellow-300">Warning:</p>
                                <p className="text-sm text-yellow-400 mt-1">The more medial to lateral difference, the more the need for medial release & adjust Varus cut as appropriate.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-8 flex justify-start shrink-0">
                <button onClick={() => setPage('planner-valgus-stress')} className="group relative py-2 px-4 bg-[#6D282C] border border-[#893338] rounded-sm 
                           shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                           transition-all duration-300 ease-out
                           hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                           active:scale-[0.98] flex items-center">
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
        </div>
    );
}


// --- Main Page Component (Router) ---
const DynamicFunctionalPlannerPage: React.FC = () => {
    const { functionalPlannerMode } = useAppContext();
    return functionalPlannerMode === 'alignment_check' ? <FunctionalAlignmentPlanner /> : <TibialCutAccuracyCheck />;
};

export default DynamicFunctionalPlannerPage;