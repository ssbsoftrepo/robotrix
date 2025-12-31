
import React from 'react';
import { useAppContext } from '../context/AppContext';
import tibiaCutBg from '../assets/tibiacut.jpeg';

// Reusable Label-Value component matching ReportPage
const ReportItem: React.FC<{ label: string; value: string | number | undefined | null; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className={`flex justify-between items-center py-2 border-b border-gray-700 last:border-0 ${highlight ? 'bg-white/5 px-2 rounded -mx-2' : ''}`}>
        <span className="text-gray-400 font-medium text-lg">{label}</span>
        <span className={`text-xl font-bold ${highlight ? 'text-yellow-400' : 'text-gray-100'}`}>{value ?? '--'}</span>
    </div>
);

// Reusable Card component matching ReportPage
const ReportCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`gemini-dark-card rounded-xl overflow-hidden border border-gray-700 shadow-xl print-break-inside-avoid ${className}`}>
        <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700">
            <h3 className="text-2xl font-bold text-gray-200 uppercase tracking-wide">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

import { printCurrentPage } from '../utils/printer';

const ValgusStressReportPage: React.FC = () => {
    const {
        patients,
        currentPatientId,
        valgusCanvasDataUrl,
        valgusResults,
        lateralLaxity,
        valgusCoronalBalancingResults,
        setPage,
        valgusFunctionalTibialCutImage,
        valgusFunctionalCutDegree,
        valgusFunctionalLinesY
    } = useAppContext();
    const patient = patients.find(p => p.id === currentPatientId);

    const handlePrint = () => {
        // Guard: Ensure base64 conversion is complete before printing
        if (typeof tibiaCutBg === 'string' && !tibiaCutBg.startsWith('data:') && (!base64TibiaBg || !base64TibiaBg.startsWith('data:'))) {
            alert("Preparing report images... please wait a moment and try again.");
            return;
        }
        printCurrentPage('Valgus Stress Report');
    };

    const { obliquity, femurType, cpak, cut, ldfa, mpta } = valgusResults;
    const { selectedSeries, lateralGap } = valgusCoronalBalancingResults;

    // Logic from functional cut page for display consistency
    const gapDifference = (selectedSeries !== null && lateralGap !== '' && !isNaN(parseFloat(lateralGap))) ? Math.abs(selectedSeries - parseFloat(lateralGap)) : null;
    let recommendedTibialRecut = '--';
    if (gapDifference !== null) {
        if (gapDifference >= 4) recommendedTibialRecut = '3° Varus';
        else if (gapDifference >= 3) recommendedTibialRecut = '2° Varus';
        else if (gapDifference < 3 && gapDifference >= 1) recommendedTibialRecut = '1° Varus';
        else recommendedTibialRecut = '0° Neutral';
    }

    // Base64 conversion state for app printing
    const [base64TibiaBg, setBase64TibiaBg] = React.useState<string>(tibiaCutBg);

    React.useEffect(() => {
        const convertToBase64 = () => {
            // Only convert if it's a path (not already data url)
            if (typeof tibiaCutBg === 'string' && !tibiaCutBg.startsWith('data:')) {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        try {
                            const dataURL = canvas.toDataURL('image/jpeg');
                            setBase64TibiaBg(dataURL);
                        } catch (e) {
                            console.warn("Canvas toDataURL failed (tainted?)", e);
                        }
                    }
                };
                img.onerror = (e) => {
                    console.error("Image load failed for conversion", e);
                };
                img.src = tibiaCutBg;
            }
        };
        convertToBase64();
    }, []);

    const selectedDegree = valgusFunctionalCutDegree || 0;
    const lateralGapValue = lateralGap || '--';
    const baseMedialGap = selectedSeries || 0;
    const medialGapValue = (baseMedialGap + (selectedDegree * 1.2)).toFixed(1);

    // Determine the image source for print safety
    // Priority: User's functional cut (if base64) > Converted Base64 Background > Default Asset (Web only)
    const functionalCutImageSrc = valgusFunctionalTibialCutImage && valgusFunctionalTibialCutImage.startsWith('data:')
        ? valgusFunctionalTibialCutImage
        : base64TibiaBg;

    return (
        <div className="min-h-full pb-8 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 no-print px-2">
                <h2 className="text-4xl font-extrabold text-white tracking-tight">Valgus Surgical Case Report</h2>
                <div className="flex space-x-4">
                    <button
                        onClick={() => setPage('planner-valgus-stress-results')}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:scale-105"
                    >
                        Result Analysis
                    </button>
                    <button
                        id="print-report-btn"
                        onClick={handlePrint}
                        className="gemini-dark-button font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:scale-105 flex items-center space-x-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print Report</span>
                    </button>
                </div>
            </div>

            <div id="report-content" className="space-y-8 flex-grow">
                {/* Patient Info Card - Full Width */}
                {patient && (
                    <ReportCard title="Patient Details" className="border-t-4 border-t-cyan-500">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                            <div>
                                <p className="text-gray-500 text-sm uppercase font-bold tracking-wider">Patient Name</p>
                                <p className="text-3xl font-bold text-white mt-1 print-text-black">{patient.firstName} {patient.lastName}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm uppercase font-bold tracking-wider">ID / Case Number</p>
                                <p className="text-2xl text-gray-200 mt-1">{patient.id}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm uppercase font-bold tracking-wider">Date</p>
                                <p className="text-xl text-gray-200 mt-1">{patient.date}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm uppercase font-bold tracking-wider">Surgical Side</p>
                                <div className="inline-block mt-1 px-4 py-1 rounded bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 font-bold text-lg uppercase">
                                    {patient.legSide} Leg
                                </div>
                            </div>
                        </div>
                    </ReportCard>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print-grid-2">

                    {/* Left Col: Analysis */}
                    <ReportCard title="Pre-Operative Analysis" className="h-full border-t-4 border-t-purple-500">
                        <div className="space-y-2">
                            <ReportItem label="Femur Type" value={femurType} highlight />
                            <ReportItem label="CPAK Classification" value={`CPAK ${cpak}`} highlight />
                            <div className="py-2"></div>
                            <ReportItem label="Obliquity" value={`${obliquity?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="LDFA" value={`${ldfa?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="MPTA" value={`${mpta?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="Lateral Laxity Status" value={lateralLaxity} />
                        </div>
                    </ReportCard>

                    {/* Right Col: Surgical Plan */}
                    <ReportCard title="Surgical Decision Matrix" className="h-full border-t-4 border-t-yellow-500">
                        <div className="space-y-4">
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                <p className="text-sm text-gray-400 font-bold uppercase mb-2">Coronal Balancing Data</p>
                                <div className="space-y-2">
                                    <ReportItem label="Implant Thickness (Lateral Gap)" value={`${lateralGap || '--'} mm`} />
                                    <ReportItem label="Anticipated Medial Gap" value={`${selectedSeries ?? '--'} mm`} />
                                </div>
                            </div>

                            <div className="space-y-4 mt-4">
                                <div className="flex items-center justify-between p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                                    <span className="text-gray-300 text-lg font-medium">Initial Femoral Cut</span>
                                    <span className="text-3xl font-extrabold text-yellow-400">{cut}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                                    <span className="text-gray-300 text-lg font-medium">Rec. Tibial Recut</span>
                                    <span className="text-3xl font-extrabold text-yellow-400">{recommendedTibialRecut}</span>
                                </div>
                            </div>
                        </div>
                    </ReportCard>
                </div>

                {/* Explicit Page Break */}
                <div className="print-break-before w-full h-1"></div>

                {/* X-Ray & Functional Planning Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print-grid-2">
                    <ReportCard title="Annotated X-Ray Analysis" className="border-t-4 border-t-blue-500 h-full">
                        {valgusCanvasDataUrl ? (
                            <div className="bg-black border-2 border-gray-700 rounded-lg overflow-hidden flex items-center justify-center p-2 relative h-[400px] print-image-container">
                                <img src={valgusCanvasDataUrl} alt="Valgus Analysis" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center bg-black border-2 border-gray-700 rounded-lg">
                                <p className="text-gray-500">No analysis image available.</p>
                            </div>
                        )}
                    </ReportCard>

                    <ReportCard title="Functional Tibial Planning" className="border-t-4 border-t-green-500 h-full">
                        {/* Always show the section if we have the static image fallback */}
                        <div className="bg-black border-2 border-gray-700 rounded-lg overflow-hidden flex items-center justify-center relative aspect-[3/4] h-[400px] w-full mx-auto print-image-container">
                            <img src={functionalCutImageSrc} alt="Functional Cut Plan" className="w-full h-full object-contain" />

                            {/* Red Lines Overlay */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                                {[0, 1, 2, 3].map(deg => {
                                    const isTarget = deg === selectedDegree;
                                    const startYPercent = valgusFunctionalLinesY || 30;
                                    const yOffsetPercent = deg * 2.5;
                                    return (
                                        <g key={deg}>
                                            <line
                                                x1="0"
                                                y1={`${startYPercent}%`}
                                                x2="100%"
                                                y2={`${startYPercent + yOffsetPercent}%`}
                                                stroke={isTarget ? "#ef4444" : "#7f1d1d"}
                                                strokeWidth={isTarget ? "4" : "1.5"}
                                                strokeDasharray={isTarget ? "0" : "5,2"}
                                                opacity={isTarget ? 1 : 0.6}
                                            />
                                            {isTarget && (
                                                <text
                                                    x="95%"
                                                    y={`${startYPercent + yOffsetPercent - 2}%`}
                                                    fill="#ef4444"
                                                    fontSize="14"
                                                    fontWeight="bold"
                                                    textAnchor="end"
                                                >
                                                    {deg}°
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                                <circle cx="0" cy={`${valgusFunctionalLinesY || 30}%`} r="6" fill="#ef4444" />
                            </svg>

                            {/* Gap Info Overlays - Scaled Down slightly for report */}
                            <div className="absolute top-4 left-4 z-40 bg-gray-900/90 backdrop-blur-sm border-2 border-gray-500 rounded-xl px-4 py-2 text-center shadow-lg">
                                <p className="text-[10px] text-gray-300 uppercase font-bold tracking-widest mb-0.5">Lateral Gap</p>
                                <p className="text-2xl font-black text-white leading-none">{lateralGapValue} <span className="text-sm text-gray-500 font-bold">mm</span></p>
                            </div>

                            <div className="absolute top-4 right-4 z-40 bg-gray-900/90 backdrop-blur-sm border-2 border-yellow-500 rounded-xl px-4 py-2 text-center shadow-lg">
                                <p className="text-[10px] text-yellow-500 uppercase font-bold tracking-widest mb-1 shadow-black drop-shadow-md">Medial Gap</p>
                                <p className="text-2xl font-black text-yellow-400 leading-none">{medialGapValue} <span className="text-sm text-yellow-700 font-bold">mm</span></p>
                            </div>

                            {/* Corrected Varus Overlay */}
                            <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-gray-600 shadow-lg text-center">
                                <p className="text-gray-400 text-[10px] uppercase tracking-wider font-bold mb-0">Corrected Varus</p>
                                <p className="text-2xl font-extrabold text-white">{selectedDegree}°</p>
                            </div>
                        </div>
                    </ReportCard>
                </div>
            </div>
        </div>
    );
};

export default ValgusStressReportPage;
