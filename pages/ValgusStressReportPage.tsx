
import React from 'react';
import { useAppContext } from '../context/AppContext';
import tibiaCutBg from '../assets/tibiacut.png';
import { formatDate } from '../utils/date';

// Reusable Label-Value component matching ReportPage
const ReportItem: React.FC<{ label: string; value: string | number | undefined | null; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className={`flex justify-between items-center py-0.5 border-b border-[#333333] last:border-0 ${highlight ? 'bg-[#6D282C]/10 px-2 rounded -mx-2' : ''}`}>
        <span className="text-gray-500 font-medium text-sm">{label}</span>
        <span className={`text-base font-bold ${highlight ? 'text-[#ff8fa3]' : 'text-gray-100'}`}>{value ?? '--'}</span>
    </div>
);

// Reusable Card component matching ReportPage
const ReportCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`relative bg-[#1a1a1a] border border-[#333333] rounded-xl overflow-hidden shadow-xl print-break-inside-avoid ${className}`}>
        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-xl" />
        <div className="bg-[#252525] px-3 py-2 border-b border-[#333333] relative z-10">
            <h3 className="text-lg font-bold text-[#E0E0E0] uppercase tracking-wide">{title}</h3>
        </div>
        <div className="p-3 relative z-10">
            {children}
        </div>
    </div>
);

const getCpakClassification = (obliquity: number, ldfa: number | null, mpta: number | null): string => {
    if (typeof obliquity !== 'number' || isNaN(obliquity)) return '--';

    if (obliquity >= 3) {
        return '2';
    } else if (obliquity >= 1) {
        return '1';
    } else {
        if (ldfa !== null && mpta !== null && Math.round(ldfa) === 90 && Math.round(mpta) === 90) {
            return '5';
        }
        return '4';
    }
};

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
        legSide,
        valgusIntraOpValidationData,
        valgusIntraOpCoronalBalancingData,
        implantThickness
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

    const thickness = implantThickness ?? 10;
    const mptaVal = mpta ?? 86;
    const rawTightness = 86 - mptaVal;
    const anticipatedTightness = rawTightness > 4 ? 4 : Math.max(0, Math.round(rawTightness));
    const anticipatedMedialGap = thickness - anticipatedTightness;
    const anticipatedLateralGap = thickness;

    const finalLateralGap = lateralGap || anticipatedLateralGap;
    const finalMedialGap = selectedSeries ?? anticipatedMedialGap;

    // Logic from functional cut page for display consistency
    const gapDifference = Math.abs(finalMedialGap - Number(finalLateralGap));
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
    const lateralGapValue = finalLateralGap;
    const baseMedialGap = finalMedialGap;
    const medialGapValue = (baseMedialGap + (selectedDegree * 1.2)).toFixed(1);

    // Post-Op Simulation (Re-calculated for report)
    const nativeLDFA = ldfa ?? 87;
    const nativeMPTA = mpta ?? 87;
    const initialSimFemoralCut = valgusCoronalBalancingResults.simFemoralCut ?? 3;
    const initialSimTibialCut = selectedDegree;

    const simulatedLDFA = nativeLDFA - initialSimFemoralCut;
    const simulatedMPTA = nativeMPTA - initialSimTibialCut;

    const simulatedJLO = simulatedMPTA + simulatedLDFA;
    const simulatedObliquity = Math.abs(180 - simulatedJLO);
    const simulatedCPAK = getCpakClassification(simulatedObliquity, simulatedLDFA, simulatedMPTA);

    // Determine the image source for print safety
    // Priority: User's functional cut (if base64) > Converted Base64 Background > Default Asset (Web only)
    const functionalCutImageSrc = valgusFunctionalTibialCutImage && valgusFunctionalTibialCutImage.startsWith('data:')
        ? valgusFunctionalTibialCutImage
        : base64TibiaBg;

    return (
        <div className="relative h-full flex flex-col overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center no-print px-4 pt-1 relative z-10 shrink-0">
                <h2 className="text-3xl font-extrabold text-[#E0E0E0] tracking-tight uppercase">POST – OP Valgus Surgical Report</h2>
            </div>

            {/* Scrollable Content */}
            <div id="report-content" className="space-y-8 flex-grow px-4 py-4 relative z-10 overflow-y-auto min-h-0">
                {/* Patient Info Card - Full Width */}
                {patient && (
                    <ReportCard title="Patient Details" className="border-t-4 border-t-[#6D282C]">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                            <div>
                                <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Patient Name</p>
                                <p className="text-xl font-bold text-white mt-0.5 print-text-black">{patient.firstName} {patient.lastName}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">ID / Case Number</p>
                                <p className="text-lg text-gray-200 mt-0.5">{patient.pid || patient.id}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Date</p>
                                <p className="text-base text-gray-200 mt-0.5">{formatDate(patient.date)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Surgical Side</p>
                                <div className="inline-block mt-0.5 px-3 py-0.5 rounded bg-[#6D282C]/30 border border-[#6D282C] text-red-200 font-bold text-base uppercase">
                                    {legSide} Leg
                                </div>
                            </div>
                        </div>
                    </ReportCard>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-grid-2">

                    {/* Left Col: Analysis */}
                    <ReportCard title="Pre-Operative Analysis" className="h-full border-t-4 border-t-[#6D282C]">
                        <div className="space-y-1">
                            <ReportItem label="Femur Type" value={femurType} highlight />
                            <ReportItem label="CPAK Classification" value={`CPAK ${cpak}`} highlight />
                            <div className="py-1"></div>
                            <ReportItem label="Obliquity" value={`${obliquity?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="LDFA" value={`${ldfa?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="MPTA" value={`${mpta?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="Lateral Laxity Status" value={lateralLaxity} />
                        </div>
                    </ReportCard>

                    {/* Right Col: Surgical Plan */}
                    <ReportCard title="Surgical Decision Matrix" className="h-full border-t-4 border-t-[#6D282C]">
                        <div className="space-y-2">
                            <div className="bg-[#252525] p-2 rounded-lg border border-[#333333]">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Coronal Balancing Data</p>
                                <div className="space-y-1">
                                    <ReportItem label="Minimum Composite Implant thickness (Lateral Gap)" value={`${finalLateralGap} mm`} />
                                    <ReportItem label="Anticipated Medial Gap" value={`${finalMedialGap} mm`} />
                                </div>
                            </div>

                            <div className="space-y-2 mt-2">
                                <div className="flex items-center justify-between p-2 bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg">
                                    <span className="text-gray-400 text-sm font-medium">Recommended Femoral Cut</span>
                                    <span className="text-xl font-extrabold text-[#ff8fa3]">{cut}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg">
                                    <span className="text-gray-400 text-sm font-medium">Recommended Tibial Recut</span>
                                    <span className="text-xl font-extrabold text-[#ff8fa3]">{recommendedTibialRecut}</span>
                                </div>
                            </div>
                        </div>
                    </ReportCard>
                </div>

                {/* Explicit Page Break */}
                <div className="print-break-before w-full h-0"></div>

                {/* X-Ray & Functional Planning Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-grid-2">
                    <ReportCard title="Annotated X-Ray Analysis" className="border-t-4 border-t-[#6D282C] h-full">
                        {valgusCanvasDataUrl ? (
                            <div className="bg-black border-2 border-[#333333] rounded-lg overflow-hidden flex items-center justify-center p-2 relative h-[18.75rem] print-image-container">
                                <img src={valgusCanvasDataUrl} alt="Valgus Analysis" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="h-[18.75rem] flex items-center justify-center bg-black border-2 border-[#333333] rounded-lg">
                                <p className="text-gray-500 text-sm">No analysis image available.</p>
                            </div>
                        )}
                    </ReportCard>

                    <ReportCard title="Functional Tibial Planning" className="border-t-4 border-t-[#6D282C] h-full">
                        <div className="bg-black border-2 border-[#333333] rounded-lg overflow-hidden flex items-center justify-center relative aspect-[3/4] h-[18.75rem] w-full mx-auto print-image-container">
                            <img src={functionalCutImageSrc} alt="Functional Cut Plan" className="w-full h-full object-contain" />

                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                                {[0, 1, 2, 3].map(deg => {
                                    const isTarget = deg === selectedDegree;
                                    const startYPercent = 21;
                                    const yOffsetPercent = deg * 2.5;
                                    return (
                                        <g key={deg}>
                                            <line
                                                x1="0"
                                                y1={`${startYPercent}%`}
                                                x2="100%"
                                                y2={`${startYPercent + yOffsetPercent}%`}
                                                stroke={isTarget ? "#6D282C" : "#333333"}
                                                strokeWidth={isTarget ? "4" : "1.5"}
                                                strokeDasharray={isTarget ? "0" : "5,2"}
                                                opacity={isTarget ? 1 : 0.6}
                                            />
                                            {isTarget && (
                                                <text
                                                    x="95%"
                                                    y={`${startYPercent + yOffsetPercent - 2}%`}
                                                    fill="#6D282C"
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
                                <circle cx="0" cy="25%" r="6" fill="#6D282C" />
                            </svg>

                            {/* Gap Info Overlays - Scaled Down slightly for report */}
                            <div className="absolute bottom-4 left-4 z-40 bg-[#1a1a1a]/90 backdrop-blur-sm border-2 border-[#333333] rounded-xl px-4 py-2 text-center shadow-lg">
                                <p className="text-[0.625rem] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Lateral Gap</p>
                                <p className="text-2xl font-black text-white leading-none">{lateralGapValue} <span className="text-sm text-gray-500 font-bold">mm</span></p>
                            </div>

                            <div className="absolute bottom-4 right-4 z-40 bg-[#1a1a1a]/90 backdrop-blur-sm border-2 border-[#6D282C] rounded-xl px-4 py-2 text-center shadow-lg">
                                <p className="text-[0.625rem] text-[#ff8fa3] uppercase font-bold tracking-widest mb-1 shadow-black drop-shadow-md">Medial Gap</p>
                                <p className="text-2xl font-black text-[#ff8fa3] leading-none">{medialGapValue} <span className="text-sm text-[#ff8fa3]/70 font-bold">mm</span></p>
                            </div>

                            {/* Corrected Varus Overlay */}
                            <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-[#333333] shadow-lg text-center">
                                <p className="text-gray-500 text-[0.625rem] uppercase tracking-wider font-bold mb-0">Corrected Varus</p>
                                <p className="text-2xl font-extrabold text-white">{selectedDegree}°</p>
                            </div>
                        </div>
                    </ReportCard>
                </div>

                {/* Intra-Operative Actual Values - Full Width */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-grid-2">
                    <ReportCard title="INTRA OPERATIVE ACTUAL VALUES" className="border-t-4 border-t-[#6D282C] h-full">
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Coronal Balancing Data</p>
                                <div className="space-y-1">
                                    <ReportItem label="Mes. Lateral Gap" value={`${valgusIntraOpValidationData.lateralGap}mm`} />
                                    <ReportItem label="Mes. Medial Gap" value={`${valgusIntraOpValidationData.medialGap}mm`} />
                                    <ReportItem label="Mes. Tibial Width" value={`${valgusIntraOpValidationData.tibiaWidth}mm`} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg">
                                <span className="text-gray-400 text-sm font-medium">Revised Functional Tibia cut</span>
                                <span className="text-lg font-extrabold text-[#ff8fa3]">{selectedDegree}° varus cut</span>
                            </div>
                        </div>
                    </ReportCard>

                    <ReportCard title="SURGICAL DECISION MATRIX" className="border-t-4 border-t-[#6D282C] h-full">
                        <div className="space-y-4">
                            {/* Lateral Laxity */}
                            <div>
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Lateral laxity</p>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-[#252525] border border-[#333333] rounded-lg p-2 text-center">
                                        <p className="text-[0.625rem] text-gray-500 uppercase font-bold tracking-wider mb-1">Laxity Level</p>
                                        <p className="text-sm font-bold text-[#ff8fa3]">{lateralLaxity ?? 'Not checked'}</p>
                                    </div>
                                    <div className="flex-1 bg-[#252525] border border-[#333333] rounded-lg p-2 text-center">
                                        <p className="text-[0.625rem] text-gray-500 uppercase font-bold tracking-wider mb-1">Laxity Applied</p>
                                        <p className="text-sm font-bold text-white">{valgusIntraOpCoronalBalancingData.additionalLaxity} mm</p>
                                    </div>
                                </div>
                            </div>

                            {/* Coronal Balancing Achieved */}
                            <div>
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Coronal Balancing Achieved</p>
                                <div className="space-y-1">
                                    <ReportItem label="Lateral Gap" value={`${Number(finalLateralGap) + valgusIntraOpCoronalBalancingData.additionalFemurCut + valgusIntraOpCoronalBalancingData.additionalTibiaCut + valgusIntraOpCoronalBalancingData.additionalLaxity}mm`} />
                                    <ReportItem label="Medial Gap" value={`${finalMedialGap + valgusIntraOpCoronalBalancingData.additionalFemurCut + valgusIntraOpCoronalBalancingData.additionalTibiaCut}mm`} />
                                </div>
                            </div>

                            {/* Post Operative CPAK */}
                            <div className="flex items-center justify-between p-2 bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg">
                                <span className="text-gray-400 text-sm font-medium">Post Operative CPAK</span>
                                <span className="text-lg font-extrabold text-[#ff8fa3]">TYPE {simulatedCPAK}</span>
                            </div>
                        </div>
                    </ReportCard>
                </div>
            </div>

            {/* Fixed Bottom Buttons */}
            <div className="mt-1 flex justify-between px-2 pb-2 relative z-10 shrink-0 no-print">
                {/* PRE OP - Left with left arrow */}
                <button
                    onClick={() => setPage('planner-valgus-stress-results')}
                    className="group relative py-2 px-4 bg-[#252525] border border-[#444444] rounded-sm 
                               shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-gray-200 tracking-wider group-hover:text-white">
                        {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg> */}
                        PRE OP
                    </span>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                </button>

                {/* PRINT REPORT - Center */}
                <button
                    id="print-report-btn"
                    onClick={handlePrint}
                    className="group relative py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                               active:scale-[0.98] flex items-center space-x-2"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="relative h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="relative text-sm font-bold text-white tracking-widest">PRINT REPORT</span>
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>

                {/* INTRA OP - Right with right arrow */}
                <button
                    onClick={() => setPage('valgus-intra-operative-validation')}
                    className="group relative py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-widest">
                        INTRA OP
                        {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg> */}
                    </span>
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>
            </div>
        </div>
    );
};

export default ValgusStressReportPage;
