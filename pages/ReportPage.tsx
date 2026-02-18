
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { printCurrentPage } from '../utils/printer';
import { formatDate } from '../utils/date';

// Reusable Label-Value component with enhanced styling
const ReportItem: React.FC<{ label: string; value: string | number | undefined | null; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className={`flex justify-between items-center py-0.5 border-b border-[#333333] last:border-0 ${highlight ? 'bg-[#6D282C]/10 px-2 rounded -mx-2' : ''}`}>
        <span className="text-gray-500 font-medium text-sm">{label}</span>
        <span className={`text-base font-bold ${highlight ? 'text-[#ff8fa3]' : 'text-gray-100'}`}>{value ?? '--'}</span>
    </div>
);

// Reusable Card component for sections
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

const getCpakType = (ahka: number, jlo: number): string => {
    let ahkaClass: 'varus' | 'neutral' | 'valgus';
    if (ahka < -2) ahkaClass = 'varus';
    else if (ahka > 2) ahkaClass = 'valgus';
    else ahkaClass = 'neutral';

    let jloClass: 'distal' | 'neutral' | 'proximal';
    if (jlo < 177) jloClass = 'distal';
    else if (jlo > 183) jloClass = 'proximal';
    else jloClass = 'neutral';

    if (jloClass === 'distal') {
        if (ahkaClass === 'varus') return '1';
        if (ahkaClass === 'neutral') return '2';
        return '3';
    }
    if (jloClass === 'neutral') {
        if (ahkaClass === 'varus') return '4';
        if (ahkaClass === 'neutral') return '5';
        return '6';
    }
    if (ahkaClass === 'varus') return '7';
    if (ahkaClass === 'neutral') return '8';
    return '9';
};

const ReportPage: React.FC = () => {
    const {
        patients,
        currentPatientId,
        longLegCanvasDataUrl,
        longLegResults,
        simAfterImage,
        femurBoundary,
        tibiaBoundary,
        setPage,
        longLegCoronalBalancingResults,
        legSide,
        intraOpValidationData,
        intraOpCoronalBalancingData,
        longLegFunctionalCutDegree,
        lateralLaxity
    } = useAppContext();

    // Logic: Post-Op Simulation (Re-calculated for report)
    const nativeLDFA = longLegResults.ldfa ?? 87;
    const nativeMPTA = longLegResults.mpta ?? 87;
    const initialSimFemoralCut = longLegCoronalBalancingResults.simFemoralCut ?? 3;
    const initialSimTibialCut = longLegFunctionalCutDegree ?? 2;

    const simulatedLDFA = nativeLDFA + initialSimFemoralCut;
    const simulatedMPTA = 90 - initialSimTibialCut;

    const simulatedAHKA = simulatedMPTA - simulatedLDFA;
    const simulatedJLO = simulatedMPTA + simulatedLDFA;
    const simulatedCPAK = getCpakType(simulatedAHKA, simulatedJLO);

    const patient = patients.find(p => p.id === currentPatientId);

    const handlePrint = () => {
        printCurrentPage('Robotrix_Report');
    };

    const getFemoralCut = () => {
        const originalCut = longLegResults.cut;
        if (!originalCut || originalCut === '--') return '--';

        if (femurBoundary === 'basic') {
            if (originalCut === '2° valgus cut') return '3° valgus cut';
            if (originalCut === '6° valgus cut') return '5° valgus cut';
        }
        return originalCut;
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

        if (tibiaBoundary === 'basic' && varusCut > 2) {
            varusCut = 2;
        }

        if (varusCut === 0) return '0° (neutral cut)';
        return `${varusCut}° varus cut`;
    };

    const displayFemoralCut = getFemoralCut();
    const displayTibialCut = getTibialCut();
    const { lateralGap, selectedSeries } = longLegCoronalBalancingResults;

    return (
        <div className="relative h-full overflow-y-auto pb-8 flex flex-col bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center mb-4 no-print px-4 pt-1 relative z-10">
                <h2 className="text-3xl font-extrabold text-[#E0E0E0] tracking-tight">Surgical Case Report</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setPage('results-analysis')}
                        className="group relative py-2 px-4 bg-[#252525] border border-[#333333] rounded-sm 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#333333] hover:border-[#6D282C]/50
                                   active:scale-[0.98] flex items-center"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                        <span className="relative text-sm font-bold text-gray-300 tracking-wider">RESULT ANALYSIS</span>
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-[#ff8fa3]/50" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-[#ff8fa3]/50" />
                    </button>
                    <button
                        id="print-report-btn"
                        onClick={handlePrint}
                        className="group relative py-3 px-8 bg-[#6D282C] border border-[#893338] rounded-sm 
                                   shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                   active:scale-[0.98] flex items-center space-x-2"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                        <svg xmlns="http://www.w3.org/2000/svg" className="relative h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span className="relative text-lg font-bold text-white tracking-widest">PRINT REPORT</span>
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    </button>
                </div>
            </div>

            <div id="report-content" className="space-y-8 flex-grow px-4 relative z-10">

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
                                <p className="text-lg text-gray-200 mt-0.5">{patient.id}</p>
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
                            <ReportItem label="JLO Type" value={longLegResults.jloType} highlight />
                            <ReportItem label="CPAK Classification" value={`CPAK ${longLegResults.cpak}`} highlight />
                            <div className="py-1"></div>
                            <ReportItem label="mHKA (Mechanical Axis)" value={`${longLegResults.mhka?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="aHKA (Arithmetic HKA)" value={`${longLegResults.ahka?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="LDFA (Lateral Distal Femoral Angle)" value={`${longLegResults.ldfa?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="MPTA (Medial Proximal Tibial Angle)" value={`${longLegResults.mpta?.toFixed(1) ?? '--'}°`} />
                            <ReportItem label="JLO (Joint Line Obliquity)" value={`${longLegResults.jlo?.toFixed(1) ?? '--'}°`} />
                        </div>
                    </ReportCard>

                    {/* Right Col: Surgical Plan */}
                    <ReportCard title="Surgical Decision Matrix" className="h-full border-t-4 border-t-[#6D282C]">
                        <div className="space-y-2">
                            <div className="bg-[#252525] p-2 rounded-lg border border-[#333333]">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Matrix Selection</p>
                                <div className="flex justify-between gap-2">
                                    <div className="flex-1 text-center bg-black/30 p-1 rounded">
                                        <p className="text-[10px] text-gray-500">Femur</p>
                                        <p className="text-sm text-[#ff8fa3] font-bold capitalize">{femurBoundary ?? 'Expanded'} Matrix</p>
                                    </div>
                                    <div className="flex-1 text-center bg-black/30 p-1 rounded">
                                        <p className="text-[10px] text-gray-500">Tibia</p>
                                        <p className="text-sm text-[#ff8fa3] font-bold capitalize">{tibiaBoundary ?? 'Expanded'} Matrix</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#252525] p-2 rounded-lg border border-[#333333]">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Coronal Balancing Data</p>
                                <div className="space-y-1">
                                    <ReportItem label="Implant Thickness (Lateral Gap)" value={`${lateralGap || '--'} mm`} />
                                    <ReportItem label="Anticipated Medial Gap" value={`${selectedSeries ?? '--'} mm`} />
                                </div>
                            </div>

                            <div className="space-y-2 mt-1">
                                <div className="flex items-center justify-between p-2 bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg">
                                    <span className="text-gray-400 text-sm font-medium">Rec. Femoral Cut</span>
                                    <span className="text-xl font-extrabold text-[#ff8fa3]">{displayFemoralCut}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg">
                                    <span className="text-gray-400 text-sm font-medium">Rec. Tibial Cut</span>
                                    <span className="text-xl font-extrabold text-[#ff8fa3]">{displayTibialCut}</span>
                                </div>
                            </div>
                        </div>
                    </ReportCard>
                </div>

                {/* Explicit Page Break */}
                <div className="print-break-before w-full h-0"></div>

                {/* Simulation Section - Full Width */}
                {(simAfterImage || longLegCanvasDataUrl) && (
                    <ReportCard title="Surgical Simulation" className="border-t-4 border-t-[#6D282C]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-grid-2">
                            <div className="flex flex-col">
                                <div className="bg-black border-2 border-[#333333] rounded-lg overflow-hidden flex items-center justify-center p-2 relative h-[300px] print-image-container">
                                    <span className="absolute top-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-xs font-bold border border-[#333333] z-10 print-badge">PRE-OP</span>
                                    {longLegCanvasDataUrl ? (
                                        <img src={longLegCanvasDataUrl} className="w-full h-full object-contain" alt="Pre-Op Xray" />
                                    ) : <p className="text-gray-500 text-sm">No Image</p>}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="bg-black border-2 border-[#6D282C] rounded-lg overflow-hidden flex items-center justify-center p-2 relative h-[300px] print-image-container">
                                    <span className="absolute top-2 left-2 bg-[#6D282C] text-white px-2 py-0.5 rounded text-xs font-bold border border-[#893338] z-10 print-badge">SIMULATION</span>
                                    {simAfterImage ? (
                                        <img src={simAfterImage} className="w-full h-full object-contain" alt="Post-Op Simulation" />
                                    ) : <p className="text-gray-500 text-sm">No Simulation</p>}
                                </div>
                            </div>
                        </div>
                    </ReportCard>
                )}

                {/* Intra-Operative Actual Values - Full Width */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-grid-2">
                    <ReportCard title="INTRA OPERATIVE ACTUAL VALUES" className="border-t-4 border-t-[#6D282C] h-full">
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Coronal Balancing Data</p>
                                <div className="space-y-1">
                                    <ReportItem label="Mes. Lateral Gap" value={`${intraOpValidationData.lateralGap}mm`} />
                                    <ReportItem label="Mes. Medial Gap" value={`${intraOpValidationData.medialGap}mm`} />
                                    <ReportItem label="Mes. Tibial Width" value={`${intraOpValidationData.tibiaWidth}mm`} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg">
                                <span className="text-gray-400 text-sm font-medium">Revised Functional Tibia cut</span>
                                <span className="text-lg font-extrabold text-[#ff8fa3]">{longLegFunctionalCutDegree ?? 0}° varus cut</span>
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
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Laxity Level</p>
                                        <p className="text-sm font-bold text-[#ff8fa3]">{lateralLaxity ?? 'Not checked'}</p>
                                    </div>
                                    <div className="flex-1 bg-[#252525] border border-[#333333] rounded-lg p-2 text-center">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Laxity Applied</p>
                                        <p className="text-sm font-bold text-white">{intraOpCoronalBalancingData.additionalLaxity} mm</p>
                                    </div>
                                </div>
                            </div>

                            {/* Coronal Balancing Achieved */}
                            <div>
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Coronal Balancing Achieved</p>
                                <div className="space-y-1">
                                    <ReportItem label="Lateral Gap" value={`${Number(lateralGap || 0) + intraOpCoronalBalancingData.additionalFemurCut + intraOpCoronalBalancingData.additionalTibiaCut + intraOpCoronalBalancingData.additionalLaxity}mm`} />
                                    <ReportItem label="Medial Gap" value={`${(selectedSeries ?? 0) + intraOpCoronalBalancingData.additionalFemurCut + intraOpCoronalBalancingData.additionalTibiaCut}mm`} />
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
        </div>
    );
};

export default ReportPage;
