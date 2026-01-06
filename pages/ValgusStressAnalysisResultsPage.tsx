
import React, { useRef } from 'react';
import { useAppContext } from '../context/AppContext';

// Helper component for statically selected matrix options
const BoundarySelector: React.FC<{
    title: string;
    range: string;
}> = ({ title, range }) => (
    <div className="p-2 border-2 rounded-lg flex items-center justify-between border-cyan-400 bg-cyan-900/30 ring-2 ring-cyan-400/50">
        <div>
            <p className="font-semibold text-sm text-gray-100">{title}</p>
            <p className="text-gray-300 text-xs">{range}</p>
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 bg-cyan-400 border-cyan-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
        </div>
    </div>
);

const CpakDiagram: React.FC<{ cpakType: string | null }> = ({ cpakType }) => {
    if (!cpakType || cpakType === '--') return null;
    const diagrams: { [key: string]: React.JSX.Element } = {
        'I': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 15 0 L 20 30 L 15 60 M 10 28 L 20 32" /><path d="M 45 0 L 40 30 L 45 60 M 50 28 L 40 32" /></g></svg>,
        'II': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 15 0 L 15 60 M 10 28 L 20 32" /><path d="M 45 0 L 45 60 M 50 28 L 40 32" /></g></svg>,
        'III': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 20 0 L 15 30 L 20 60 M 10 28 L 20 32" /><path d="M 40 0 L 45 30 L 40 60 M 50 28 L 40 32" /></g></svg>,
        'IV': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 15 0 L 20 30 L 15 60 M 10 30 L 20 30" /><path d="M 45 0 L 40 30 L 45 60 M 50 30 L 40 30" /></g></svg>,
        'V': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 15 0 L 15 60 M 10 30 L 20 30" /><path d="M 45 0 L 45 60 M 50 30 L 40 30" /></g></svg>,
        'VI': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 20 0 L 15 30 L 20 60 M 10 30 L 20 30" /><path d="M 40 0 L 45 30 L 40 60 M 50 30 L 40 30" /></g></svg>,
        'VII': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 15 0 L 20 30 L 15 60 M 10 32 L 20 28" /><path d="M 45 0 L 40 30 L 45 60 M 50 32 L 40 28" /></g></svg>,
        'VIII': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 15 0 L 15 60 M 10 32 L 20 28" /><path d="M 45 0 L 45 60 M 50 32 L 40 28" /></g></svg>,
        'IX': <svg viewBox="0 0 60 60"><g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M 20 0 L 15 30 L 20 60 M 10 32 L 20 28" /><path d="M 40 0 L 45 30 L 40 60 M 50 32 L 40 28" /></g></svg>,
    };
    return <div className="h-20 w-20 md:h-24 md:w-24 text-yellow-400">{diagrams[cpakType] || null}</div>;
};


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
            reader.onload = (ev) => onImageChange?.(ev.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    let containerClasses = "w-32 h-32 flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden group transition-all cursor-pointer rounded-xl ";

    if (seamless) {
        containerClasses += "hover:opacity-90";
    } else if (transparent) {
        containerClasses += "hover:bg-white/5";
    } else {
        containerClasses += "border-2 border-dashed border-gray-500 bg-black/40 hover:bg-black/60 hover:border-gray-300";
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
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-2 ${transparent || seamless ? 'text-gray-300 opacity-50' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={`text-sm text-center px-2 ${transparent || seamless ? 'text-gray-300 opacity-70' : 'text-gray-400'}`}>Upload Reference</span>
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
    let theme;
    switch (colorTheme) {
        case 'yellow':
            theme = {
                bg: 'bg-yellow-600/10',
                border: 'border-yellow-600/30',
                text: 'text-yellow-200',
                badge: 'bg-yellow-900/40 text-yellow-100 border border-yellow-700/50'
            };
            break;
        case 'pink':
            theme = {
                bg: 'bg-rose-600/10',
                border: 'border-rose-600/30',
                text: 'text-rose-200',
                badge: 'bg-rose-900/40 text-rose-100 border border-rose-700/50'
            };
            break;
        case 'blue':
            theme = {
                bg: 'bg-sky-600/10',
                border: 'border-sky-600/30',
                text: 'text-sky-200',
                badge: 'bg-sky-900/40 text-sky-100 border border-sky-700/50'
            };
            break;
        default:
            theme = { bg: 'bg-gray-800/30', border: 'border-gray-700', text: 'text-gray-300', badge: 'bg-gray-700 text-gray-200' };
    }

    return (
        <div className={`${theme.bg} border-2 ${theme.border} rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 ${className}`}>
            <div className="flex-grow text-center md:text-left flex flex-col justify-center items-center md:items-start h-full">
                {!hideStepBadge && <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold mb-1 ${theme.badge}`}>STEP {step} &gt;</span>}
                <h4 className="text-base text-gray-200 font-bold mb-1 leading-tight">{title}</h4>
                <div className={`text-xl font-extrabold ${theme.text} mb-1`}>{value}</div>

                {subTitle && <p className="text-xs text-gray-300 mt-0.5 font-medium">{subTitle}</p>}
                {subValue && <div className={`text-xl font-extrabold ${theme.text} mt-1 border-2 border-dashed border-gray-600 inline-block px-2 py-1 rounded-lg shadow-md bg-black/20`}>{subValue}</div>}
            </div>
            {(imageSrc || setImageSrc) && (
                <div className="flex flex-col justify-center">
                    <ImageUploadBox imageSrc={imageSrc || null} onImageChange={setImageSrc} transparent={transparentImage} seamless={seamlessImage} />
                </div>
            )}
        </div>
    );
};

const ValgusStressAnalysisResultsPage: React.FC = () => {
    const {
        setPage,
        valgusCanvasDataUrl,
        valgusResults,
    } = useAppContext();

    const getAnticipatedTibiaCut = () => {
        const mpta = valgusResults.mpta;
        if (mpta === null) return '--';

        let varusCut = 0;
        if (mpta < 85) varusCut = 4;
        else if (mpta < 87) varusCut = 3;
        else if (mpta < 88) varusCut = 2;
        else if (mpta < 89) varusCut = 1;

        // Apply basic matrix constraint (0-3 for Valgus per logic)
        varusCut = Math.min(varusCut, 3);

        if (varusCut === 0) return '0° (neutral cut)';
        return `${varusCut}° varus`;
    };

    const anticipatedTibiaCut = getAnticipatedTibiaCut();
    const recommendedFemoralCut = valgusResults.cut || '--';

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2 no-print">
                <h2 className="text-4xl font-bold">Valgus Stress Analysis</h2>
                <button onClick={() => setPage('planner-valgus-stress')} className="gemini-dark-button font-bold py-2 px-4 rounded-md transition text-sm flex items-center space-x-2">
                    <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back
                    </span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-grow min-h-0">

                {/* Column 1: Image (Reduced Width ~25%) */}
                <div className="lg:col-span-3 gemini-dark-card p-2 rounded-lg flex items-center justify-center min-h-[300px] lg:min-h-0 bg-black text-center">
                    {valgusCanvasDataUrl ?
                        <img src={valgusCanvasDataUrl} alt="Valgus Analysis" className="max-w-full max-h-full object-contain rounded-md" /> :
                        <p className="text-gray-500 text-lg">No analysis image.</p>
                    }
                </div>

                {/* Column 2: Data & Matrix (Medium Width ~33%) */}
                <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto">
                    {/* Results Box - Compact Horizontal */}
                    <div className="gemini-dark-card p-2 rounded-lg flex flex-row items-center justify-around min-h-0 shrink-0">
                        <div className="text-center border-r border-gray-700 pr-4">
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Femur Type</p>
                            <p className="font-bold text-lg text-yellow-400">{valgusResults.femurType}</p>
                        </div>
                        <div className="text-center flex flex-col items-center pl-4">
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">CPAK Type</p>
                            <div className="flex flex-row items-center gap-2">
                                <p className="font-bold text-xl text-yellow-400 leading-none">CPAK {valgusResults.cpak}</p>
                                <div className="scale-50 transform origin-center -my-2">
                                    <CpakDiagram cpakType={valgusResults.cpak} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Matrix Selectors - STATIC FOR VALGUS */}
                    <div className="flex-grow flex flex-col gap-2 min-h-0">
                        <div className="bg-yellow-900/40 border border-yellow-700/50 rounded-lg p-1.5 text-center shrink-0">
                            <p className="text-yellow-300 text-xs font-bold uppercase tracking-wider">Only Basic Matrix is possible</p>
                        </div>

                        <div className="gemini-dark-card p-3 rounded-lg flex-1 flex flex-col justify-center min-h-0">
                            <h3 className="text-center font-bold text-lg text-gray-200 mb-2">Distal Femur cut</h3>
                            <div className="mt-1">
                                <BoundarySelector
                                    title="Basic matrix"
                                    range="3-5 deg"
                                />
                            </div>
                        </div>

                        <div className="gemini-dark-card p-3 rounded-lg flex-1 flex flex-col justify-center min-h-0">
                            <h3 className="text-center font-bold text-lg text-gray-200 mb-2">Proximal tibial cut</h3>
                            <div className="mt-1">
                                <BoundarySelector
                                    title="Basic matrix"
                                    range="0-3 deg varus"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Steps & Recommendations (Widest ~42%) */}
                <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto">
                    <div className="gemini-dark-card p-1 rounded-lg bg-transparent flex-grow flex flex-col gap-3 min-h-0">
                        <h3 className="text-2xl font-bold text-gray-100 text-center hidden">Recommendations</h3>

                        {/* STEP 1 */}
                        <StepCard
                            step={1}
                            title="Recommended Foundational distal femoral cut"
                            value={recommendedFemoralCut}
                            colorTheme="pink"
                            imageSrc="/valguscut.png"
                            className="flex-1"
                            seamlessImage={true}
                        />

                        {/* STEP 2 */}
                        <StepCard
                            step={2}
                            title="Provisional 90 deg tibial cut"
                            value="90°"
                            colorTheme="pink"
                            imageSrc="/tibialcut.png"
                            className="flex-1"
                            transparentImage={true}
                        />

                        {/* STEP 3 */}
                        <StepCard
                            step={3}
                            title="Anticipated tibial cut"
                            value={anticipatedTibiaCut}
                            colorTheme="pink"
                            className="flex-1"
                            hideStepBadge={true}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Section */}
            <div className="mt-auto pt-3 space-y-2 pb-4">
                <div className="flex justify-end w-full">
                    <button
                        onClick={() => setPage('planner-valgus-stress-coronal-balancing')}
                        className="bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold text-lg py-3 px-8 rounded-full shadow-xl transition transform hover:scale-105"
                        disabled={!valgusResults.cpak || valgusResults.cpak === '--'}
                    >
                        Proceed to Coronal Balancing
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ValgusStressAnalysisResultsPage;
