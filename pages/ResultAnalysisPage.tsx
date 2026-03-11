
import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

// A more visually appealing component for selecting boundary options
const BoundarySelector: React.FC<{
    title: string;
    bone: 'femur' | 'tbia';
    options: { key: 'basic' | 'expanded'; label: string; range: string; }[];
}> = ({ title, bone, options }) => {
    const { femurBoundary, setFemurBoundary, tibiaBoundary, setTibiaBoundary, setFemoralCutSim, setTibialCutSim } = useAppContext();
    const currentBoundary = bone === 'femur' ? femurBoundary : tibiaBoundary;

    const handleSelectBoundary = (key: 'basic' | 'expanded') => {
        if (bone === 'femur' && femurBoundary !== key) {
            setFemurBoundary(key);
            setFemoralCutSim(null); // Force reset on simulation page
        } else if (bone === 'tbia' && tibiaBoundary !== key) {
            setTibiaBoundary(key);
            setTibialCutSim(null); // Force reset on simulation page
        }
    };

    return (
        <div className="relative bg-[#1a1a1a] border border-[#333333] p-3 rounded-lg flex-1 flex flex-col justify-center min-h-0">
            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
            <h3 className="text-center font-bold text-lg text-[#E0E0E0] mb-2 relative z-10">{title}</h3>
            <div className="space-y-2 relative z-10">
                {options.map(opt => (
                    <div
                        key={opt.key}
                        onClick={() => handleSelectBoundary(opt.key)}
                        className={`p-2 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${currentBoundary === opt.key ? 'border-[#6D282C] bg-[#6D282C]/20' : 'border-[#333333] hover:border-[#6D282C]/50 hover:bg-[#252525]'}`}
                    >
                        <div>
                            <p className="font-semibold text-sm text-gray-100">{opt.label}</p>
                            <p className="text-gray-400 text-xs">{opt.range}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${currentBoundary === opt.key ? 'bg-[#6D282C] border-[#893338]' : 'border-gray-600 bg-[#252525]'}`}>
                            {currentBoundary === opt.key && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WarningMessage: React.FC<{ message: string }> = ({ message }) => (
    <div className="bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg p-4 flex items-center space-x-4 w-full justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#ff8fa3] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.636-1.1 2.15-1.1 2.786 0l5.483 9.558c.636 1.1-.124 2.493-1.393 2.493H4.167c-1.27 0-2.029-1.393-1.393-2.493l5.483-9.558zM10 12a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-[#ff8fa3] text-lg font-medium">{message}</p>
    </div>
);

import { CpakDiagram } from '../src/components/CpakDiagram';

const ImageUploadBox: React.FC<{
    imageSrc: string | null;
    onImageChange?: (src: string | null) => void;
    transparent?: boolean;
    seamless?: boolean;
}> = ({ imageSrc, onImageChange, transparent, seamless }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => onImageChange(ev.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    let containerClasses = "w-32 h-32 flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden group transition-all cursor-pointer rounded-xl ";

    if (seamless) {
        containerClasses += "hover:opacity-90";
    } else if (transparent) {
        containerClasses += "hover:bg-white/5";
    } else {
        containerClasses += "border-2 border-dashed border-[#333333] bg-black/40 hover:bg-black/60 hover:border-[#6D282C]/50";
    }

    return (
        <div
            className={`${containerClasses} ${!onImageChange ? 'cursor-default pointer-events-none' : ''}`}
            onClick={() => onImageChange && fileInputRef.current?.click()}
        >
            {onImageChange && <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />}
            {imageSrc ? (
                <img src={imageSrc} className="w-full h-full object-contain rounded-xl" alt="Step Upload" />
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-2 ${transparent || seamless ? 'text-gray-300 opacity-50' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={`text-sm text-center px-2 ${transparent || seamless ? 'text-gray-300 opacity-70' : 'text-gray-500'}`}>Upload Reference</span>
                </>
            )}
            {imageSrc && onImageChange && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                    <span className="text-sm text-white font-bold">Change</span>
                </div>
            )}
        </div>
    );
};

const StepCard: React.FC<{
    step: number;
    title: string;
    value: string;
    subTitle?: string;
    subValue?: string;
    colorTheme: 'yellow' | 'pink' | 'blue';
    imageSrc?: string | null;
    setImageSrc?: (src: string | null) => void;
    className?: string;
    hideStepBadge?: boolean;
    transparentImage?: boolean;
    seamlessImage?: boolean;
}> = ({ step, title, value, subTitle, subValue, colorTheme, imageSrc, setImageSrc, className = "", hideStepBadge, transparentImage, seamlessImage }) => {
    // Using maroon theme for all cards
    const theme = {
        bg: 'bg-[#6D282C]/10',
        border: 'border-[#6D282C]/30',
        text: 'text-[#ff8fa3]',
        badge: 'bg-[#6D282C]/40 text-[#ff8fa3] border border-[#6D282C]/50'
    };

    return (
        <div className={`${theme.bg} border-2 ${theme.border} rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 ${className}`}>
            <div className="flex-grow text-center md:text-left flex flex-col justify-center items-center md:items-start h-full">
                {!hideStepBadge && <span className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-2 ${theme.badge}`}>STEP {step} &gt;</span>}
                <h4 className="text-xl text-gray-200 font-bold mb-2 leading-tight">{title}</h4>
                <div className={`text-3xl font-extrabold ${theme.text} mb-1`}>{value}</div>

                {subTitle && <p className="text-sm text-gray-400 mt-1 font-medium">{subTitle}</p>}
                {subValue && <div className={`text-2xl font-extrabold ${theme.text} mt-2 border-2 border-dashed border-[#333333] inline-block px-3 py-2 rounded-lg shadow-md bg-black/20`}>{subValue}</div>}
            </div>
            {(imageSrc || setImageSrc) && (
                <div className="flex flex-col justify-center">
                    <ImageUploadBox imageSrc={imageSrc || null} onImageChange={setImageSrc} transparent={transparentImage} seamless={seamlessImage} />
                </div>
            )}
        </div>
    );
};

const ResultAnalysisPage: React.FC = () => {
    const {
        setPage,
        longLegCanvasDataUrl,
        longLegResults,
        femurBoundary, setFemurBoundary,
        tibiaBoundary, setTibiaBoundary,
        longLegCoronalBalancingResults, setLongLegCoronalBalancingResults,
        longLegFunctionalCutDegree, setLongLegFunctionalCutDegree
    } = useAppContext();

    useEffect(() => {
        if (femurBoundary === null) setFemurBoundary('expanded');
        if (tibiaBoundary === null) setTibiaBoundary('expanded');
    }, [femurBoundary, tibiaBoundary, setFemurBoundary, setTibiaBoundary]);

    const getFemurClassification = (ldfa: number) => {
        if (ldfa > 92) return { type: 'Significant varoid femur', cut: '2° valgus cut' };
        if (ldfa > 91) return { type: 'Mild varoid femur', cut: '3° valgus cut' };
        if (ldfa > 88) return { type: 'Median (neutral) femur', cut: '4° valgus cut' };
        if (ldfa > 87) return { type: 'Mild valgoid femur', cut: '5° valgus cut' };
        if (ldfa > 86) return { type: 'Significant valgoid femur', cut: '6° valgus cut' };
        return {
            type: 'Significant valgoid femur',
            cut: '6° valgus cut (Native LDFA out of boundary)'
        };
    };

    const getFemoralCut = () => {
        const originalCut = longLegResults.cut;
        // Re-calculate cut based on loaded LDFA to ensure consistency with new logic
        if (longLegResults.ldfa !== null) {
            const classification = getFemurClassification(longLegResults.ldfa);
            let displayCut = classification.cut;

            // Apply Basic Matrix constraint (3-5) if selected
            if (femurBoundary === 'basic') {
                // Parse the degree
                const match = displayCut.match(/(\d+)°/);
                if (match) {
                    const degree = parseInt(match[1]);
                    if (degree < 3) displayCut = '3° valgus cut';
                    else if (degree > 5) displayCut = '5° valgus cut';
                }
            }
            return displayCut;
        }
        return originalCut || '--';
    };

    const getTibialCut = () => {
        const mpta = longLegResults.mpta;
        if (mpta === null) return '--';
        let varusCut = 0;
        if (mpta <= 85) varusCut = 4;  // Significant varoid (includes out of boundary ≤84)
        else if (mpta <= 87) varusCut = 3;  // Moderate varoid: 85 < MPTA ≤ 87
        else if (mpta <= 88) varusCut = 2;  // Mild varoid: 87 < MPTA ≤ 88
        else if (mpta <= 90) varusCut = 1;  // Neutral tibia: 88 < MPTA ≤ 90
        // MPTA > 90 = 0° (valgoid tibia / neutral cut)
        if (tibiaBoundary === 'basic' && varusCut > 2) varusCut = 2;
        if (varusCut === 0) return '0° (neutral cut)';
        return `${varusCut}° varus`;
    };

    const displayFemoralCut = getFemoralCut();
    const displayTibialCut = getTibialCut();

    // Sync calculated values to context for downstream pages
    useEffect(() => {
        // Parse Femoral Cut
        let numericFemoralCut = 3; // Default
        if (displayFemoralCut !== '--') {
            const match = displayFemoralCut.match(/(\d+)°/);
            if (match) numericFemoralCut = parseInt(match[1]);
        }

        // Parse Tibial Cut
        let numericTibialCut = 0;
        if (displayTibialCut !== '--') {
            const match = displayTibialCut.match(/(\d+)°/);
            if (match) numericTibialCut = parseInt(match[1]);
        }

        // Update if different
        if (longLegCoronalBalancingResults.simFemoralCut !== numericFemoralCut) {
            setLongLegCoronalBalancingResults({ ...longLegCoronalBalancingResults, simFemoralCut: numericFemoralCut });
        }

        if (longLegFunctionalCutDegree !== numericTibialCut) {
            setLongLegFunctionalCutDegree(numericTibialCut);
        }
    }, [displayFemoralCut, displayTibialCut, longLegCoronalBalancingResults, setLongLegCoronalBalancingResults, longLegFunctionalCutDegree, setLongLegFunctionalCutDegree]);

    const showLdfaWarning = longLegResults.ldfa !== null && longLegResults.ldfa <= 86;
    const showMptaWarning = longLegResults.mpta !== null && longLegResults.mpta <= 84;

    return (
        <div className="relative h-full flex flex-col overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex justify-between items-center no-print px-2 py-1 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0]">PRE – OP Long leg Film Analysis</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-grow min-h-0 px-2 relative z-10 overflow-hidden">

                {/* Column 1: Image */}
                <div className="lg:col-span-3 relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg flex items-center justify-center min-h-[300px] lg:min-h-0 bg-black text-center">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    {longLegCanvasDataUrl ?
                        <img src={longLegCanvasDataUrl} alt="Long Leg Analysis" className="max-w-full max-h-full object-contain rounded-md relative z-10" /> :
                        <p className="text-gray-500 text-lg relative z-10">No analysis image.</p>
                    }
                </div>

                {/* Column 2: Data & Matrix */}
                <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto">
                    {/* Results Box */}
                    <div className="relative bg-[#1a1a1a] border border-[#333333] p-4 rounded-lg min-h-0 shrink-0">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />

                        {/* Headings Row */}
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <p className="text-sm text-white font-bold uppercase tracking-wider border-r border-[#333333] pr-4">Femur Type:</p>
                            <p className="text-sm text-white font-bold uppercase tracking-wider">CPAK Type:</p>
                        </div>

                        {/* Values Row */}
                        <div className="grid grid-cols-2 gap-4 mt-2 relative z-10">
                            <div className="border-r border-[#333333] pr-4 flex items-center justify-center text-center">
                                <p className="font-bold text-2xl text-[#ff8fa3] leading-tight">{longLegResults.jloType}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="font-bold text-2xl text-[#ff8fa3] leading-none">CPAK {longLegResults.cpak}</p>
                                <CpakDiagram cpakType={longLegResults.cpak} />
                            </div>
                        </div>
                    </div>

                    {/* Matrix Selectors */}
                    <div className="flex-grow flex flex-col gap-2 min-h-0">
                        <BoundarySelector
                            title="Distal Femur cut"
                            bone="femur"
                            options={[
                                { key: 'basic', label: 'Basic matrix', range: '3-5 deg' },
                                { key: 'expanded', label: 'Expanded matrix', range: '2-6 deg' }
                            ]}
                        />
                        <BoundarySelector
                            title="Proximal tibial cut"
                            bone="tbia"
                            options={[
                                { key: 'basic', label: 'Basic matrix', range: '0-2 deg varus' },
                                { key: 'expanded', label: 'Expanded matrix', range: '0 to 4 deg varus' }
                            ]}
                        />
                    </div>
                </div>

                {/* Column 3: Steps & Recommendations */}
                <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto">
                    <div className="p-1 rounded-lg bg-transparent flex-grow flex flex-col gap-3 min-h-0">
                        <StepCard
                            step={1}
                            title="Recommended Foundational distal femoral cut"
                            value={displayFemoralCut}
                            colorTheme="pink"
                            imageSrc="/valguscut.png"
                            className="flex-1"
                            seamlessImage={true}
                        />
                        <StepCard
                            step={2}
                            title="Provisional 90 deg tibial cut"
                            value="90°"
                            colorTheme="pink"
                            imageSrc="/tibialcut.png"
                            className="flex-1"
                            transparentImage={true}
                        />
                        <StepCard
                            step={3}
                            title="Anticipated Functional tibia cut"
                            value={displayTibialCut}
                            colorTheme="pink"
                            className="flex-1"
                            hideStepBadge={true}
                        />
                    </div>
                </div>
            </div>

            {/* Footer / Warning Section */}
            <div className="pt-1 space-y-1 pb-1 px-2 relative z-10 shrink-0">
                {(showLdfaWarning || showMptaWarning) && (
                    <div className="space-y-1">
                        {showLdfaWarning && <WarningMessage message="Native LDFA Out of boundary – release anticipated." />}
                        {showMptaWarning && <WarningMessage message="Native MPTA Out of boundary – release anticipated." />}
                    </div>
                )}

                <div className="flex justify-between w-full">
                    {/* Back Button */}
                    <button
                        onClick={() => setPage('planner-long-leg')}
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
                        onClick={() => setPage('simulation')}
                        disabled={!longLegResults.cpak || longLegResults.cpak === '--'}
                        className="group relative py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                                   shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                   active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
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
        </div>
    );
};

export default ResultAnalysisPage;
