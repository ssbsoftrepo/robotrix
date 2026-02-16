
import React, { useState, useEffect } from 'react';
import { useAppContext } from './context/AppContext';
import CaseManagementPage from './pages/CaseManagementPage';
import LongLegPlannerPage from './pages/LongLegPlannerPage';
import ValgusStressPlannerPage from './pages/ValgusStressPlannerPage';
import ValgusStressAnalysisResultsPage from './pages/ValgusStressAnalysisResultsPage';
import ValgusStressCoronalBalancingPage from './pages/ValgusStressCoronalBalancingPage';
import ValgusStressLaxityCheckPage from './pages/ValgusStressLaxityCheckPage';
import SimulationPage from './pages/SimulationPage';
import ReportPage from './pages/ReportPage';
import ResultAnalysisPage from './pages/ResultAnalysisPage';
import PastCaseResultPage from './pages/PastCaseResultPage';
import ValgusStressReportPage from './pages/ValgusStressReportPage';
import PastCaseValgusResultPage from './pages/PastCaseValgusResultPage';
import LongLegLaxityCheckPage from './pages/LongLegLaxityCheckPage';
import LongLegCoronalBalancingPage from './pages/LongLegCoronalBalancingPage';
import LongLegFunctionalTibialCutPage from './pages/LongLegFunctionalTibialCutPage';
import ValgusFunctionalTibialCutPage from './pages/ValgusFunctionalTibialCutPage';
import IntraOperativeValidationPage from './pages/IntraOperativeValidationPage';
import IntraOperativeCoronalBalancingPage from './pages/IntraOperativeCoronalBalancingPage';
import ValgusIntraOperativeValidationPage from './pages/ValgusIntraOperativeValidationPage';
import ValgusIntraOperativeCoronalBalancingPage from './pages/ValgusIntraOperativeCoronalBalancingPage';
import LandingPage from './pages/LandingPage';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';



async function requestAllPermissions() {
    try {
        const camPerm = await Camera.requestPermissions();
        const fsPerm = await Filesystem.requestPermissions();


    } catch (err) {
        console.error('Permission request failed', err);
    }
}



const App: React.FC = () => {
    const { page, setPage, setCurrentPatientId, setPlannerMode } = useAppContext();
    const [showIntro, setShowIntro] = useState(true);

    useEffect(() => {
        // Only run on native Android/iOS
        if (Capacitor.isNativePlatform()) {
            requestAllPermissions();
        }
    }, []);
    const renderPage = () => {
        switch (page) {
            case 'case-management':
                return <CaseManagementPage />;
            case 'planner-long-leg':
                return <LongLegPlannerPage />;
            case 'planner-valgus-stress':
                return <ValgusStressPlannerPage />;
            case 'planner-valgus-stress-results':
                return <ValgusStressAnalysisResultsPage />;
            case 'planner-valgus-stress-coronal-balancing':
                return <ValgusStressCoronalBalancingPage />;
            case 'planner-valgus-stress-laxity-check':
                return <ValgusStressLaxityCheckPage />;
            case 'planner-valgus-stress-report':
                return <ValgusStressReportPage />;
            case 'planner-valgus-functional-tibial-cut':
                return <ValgusFunctionalTibialCutPage />;
            case 'planner-long-leg-laxity-check':
                return <LongLegLaxityCheckPage />;
            case 'planner-long-leg-coronal-balancing':
                return <LongLegCoronalBalancingPage />;
            case 'planner-long-leg-functional-tibial-cut':
                return <LongLegFunctionalTibialCutPage />;
            case 'intra-operative-validation':
                return <IntraOperativeValidationPage />;
            case 'intra-operative-coronal-balancing':
                return <IntraOperativeCoronalBalancingPage />;
            case 'valgus-intra-operative-validation':
                return <ValgusIntraOperativeValidationPage />;
            case 'valgus-intra-operative-coronal-balancing':
                return <ValgusIntraOperativeCoronalBalancingPage />;
            case 'simulation':
                return <SimulationPage />;
            case 'report':
                return <ReportPage />;
            case 'results-analysis':
                return <ResultAnalysisPage />;
            case 'past-case-result':
                return <PastCaseResultPage />;
            case 'past-case-valgus-result':
                return <PastCaseValgusResultPage />;
            default:
                return <CaseManagementPage />;
        }
    };

    const handleHomeClick = () => {
        setCurrentPatientId(null);
        setPlannerMode(null);
        setPage('case-management');
    };

    if (showIntro) {
        return <LandingPage onEnter={() => setShowIntro(false)} />;
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <header className="relative flex items-center justify-center p-2 text-center border-b border-[#333333] shadow-md no-print bg-gradient-to-r from-[#1a1a1a] to-[#252525]">
                <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
                {page !== 'case-management' && (
                    <button
                        onClick={handleHomeClick}
                        className="group absolute top-1/2 left-6 transform -translate-y-1/2 py-2 px-4 rounded-sm 
                                   bg-[#6D282C] border border-[#893338]
                                   shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                   flex items-center justify-center transition-all duration-300 z-10"
                        title="Go to Home"
                        aria-label="Go to Home"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                        <span className="relative text-white font-bold tracking-wider">Home</span>
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    </button>
                )}
                <h1 className="relative z-10 text-4xl font-black text-[#E0E0E0] tracking-tighter drop-shadow-lg">
                    ROBOTRIX<span className="text-[#6D282C]">+</span>
                </h1>
            </header>

            <div className="flex flex-1 min-h-0">
                <main className="flex-1 p-1 md:p-1 overflow-hidden relative flex flex-col min-h-0">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

export default App;
