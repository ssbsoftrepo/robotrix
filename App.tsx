
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
        <div className="min-h-screen flex flex-col">
            <header className="relative flex items-center justify-center p-4 text-center border-b border-gray-700 shadow-md no-print">
                <h1 className="text-5xl font-bold text-gray-200">
                    ROBOTRIX<span className="text-dark-maroon">+</span>
                </h1>
                {page !== 'case-management' && (
                    <button
                        onClick={handleHomeClick}
                        className="absolute top-1/2 right-6 transform -translate-y-1/2 w-14 h-14 rounded-full bg-[#6D282C] hover:bg-[#893338] flex items-center justify-center transition-colors shadow-lg"
                        title="Go to Home"
                        aria-label="Go to Home"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2l-7 7-7-7" /></svg>
                    </button>
                )}
            </header>
            <div className="flex flex-grow">
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {renderPage()}
                </main>
            </div>
            <Footer />
        </div>
    );
};

const Footer: React.FC = () => {
    return (
        <footer className="text-center p-4 text-gray-500 text-lg no-print">
            Powered by PLUS Orthopedics
        </footer>
    );
};


export default App;
