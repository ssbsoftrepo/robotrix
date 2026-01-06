
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { printCurrentPage } from '../utils/printer';
import { formatDate } from '../utils/date';

// Reusable Label-Value component with enhanced styling
const ReportItem: React.FC<{ label: string; value: string | number | undefined | null; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className={`flex justify-between items-center py-0.5 border-b border-gray-700 last:border-0 ${highlight ? 'bg-white/5 px-2 rounded -mx-2' : ''}`}>
        <span className="text-gray-400 font-medium text-sm">{label}</span>
        <span className={`text-base font-bold ${highlight ? 'text-yellow-400' : 'text-gray-100'}`}>{value ?? '--'}</span>
    </div>
);

// Reusable Card component for sections
const ReportCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`gemini-dark-card rounded-xl overflow-hidden border border-gray-700 shadow-xl print-break-inside-avoid ${className}`}>
        <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700">
            <h3 className="text-lg font-bold text-gray-200 uppercase tracking-wide">{title}</h3>
        </div>
        <div className="p-3">
            {children}
        </div>
    </div>
);

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
        legSide
    } = useAppContext();
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
        if (mpta < 85) varusCut = 4;
        else if (mpta < 87) varusCut = 3;
        else if (mpta < 88) varusCut = 2;
        else if (mpta < 89) varusCut = 1;

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
        <div className="h-full overflow-y-auto pb-8 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 no-print px-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Surgical Case Report</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setPage('results-analysis')}
                        className="gemini-dark-button font-bold py-2 px-4 rounded-md transition text-sm flex items-center space-x-2"
                    >
                        <span>Result Analysis</span>
                    </button>
                    <button
                        id="print-report-btn"
                        onClick={handlePrint}
                        className="bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold text-lg py-3 px-8 rounded-full shadow-xl transition transform hover:scale-105 flex items-center space-x-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print Report</span>
                    </button>
                </div>
            </div>

            <div id="report-content" className="space-y-8 flex-grow">

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
                            <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Matrix Selection</p>
                                <div className="flex justify-between gap-2">
                                    <div className="flex-1 text-center bg-black/30 p-1 rounded">
                                        <p className="text-[10px] text-gray-500">Femur</p>
                                        <p className="text-sm text-cyan-300 font-bold capitalize">{femurBoundary ?? 'Expanded'} Matrix</p>
                                    </div>
                                    <div className="flex-1 text-center bg-black/30 p-1 rounded">
                                        <p className="text-[10px] text-gray-500">Tibia</p>
                                        <p className="text-sm text-cyan-300 font-bold capitalize">{tibiaBoundary ?? 'Expanded'} Matrix</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Coronal Balancing Data</p>
                                <div className="space-y-1">
                                    <ReportItem label="Implant Thickness (Lateral Gap)" value={`${lateralGap || '--'} mm`} />
                                    <ReportItem label="Anticipated Medial Gap" value={`${selectedSeries ?? '--'} mm`} />
                                </div>
                            </div>

                            <div className="space-y-2 mt-1">
                                <div className="flex items-center justify-between p-2 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                                    <span className="text-gray-300 text-sm font-medium">Rec. Femoral Cut</span>
                                    <span className="text-xl font-extrabold text-yellow-400">{displayFemoralCut}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                                    <span className="text-gray-300 text-sm font-medium">Rec. Tibial Cut</span>
                                    <span className="text-xl font-extrabold text-yellow-400">{displayTibialCut}</span>
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
                                <div className="bg-black border-2 border-gray-700 rounded-lg overflow-hidden flex items-center justify-center p-2 relative h-[300px] print-image-container">
                                    <span className="absolute top-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-xs font-bold border border-gray-600 z-10 print-badge">PRE-OP</span>
                                    {longLegCanvasDataUrl ? (
                                        <img src={longLegCanvasDataUrl} className="w-full h-full object-contain" alt="Pre-Op Xray" />
                                    ) : <p className="text-gray-500 text-sm">No Image</p>}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="bg-black border-2 border-[#6D282C] rounded-lg overflow-hidden flex items-center justify-center p-2 relative h-[300px] print-image-container">
                                    <span className="absolute top-2 left-2 bg-[#6D282C] text-white px-2 py-0.5 rounded text-xs font-bold border border-red-400 z-10 print-badge">SIMULATION</span>
                                    {simAfterImage ? (
                                        <img src={simAfterImage} className="w-full h-full object-contain" alt="Post-Op Simulation" />
                                    ) : <p className="text-gray-500 text-sm">No Simulation</p>}
                                </div>
                            </div>
                        </div>
                    </ReportCard>
                )}
            </div>
        </div>
    );
};

export default ReportPage;
