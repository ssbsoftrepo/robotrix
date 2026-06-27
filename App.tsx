
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
import PreOpReportPage from './pages/PreOpReportPage';
import ValgusPreOpReportPage from './pages/ValgusPreOpReportPage';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import HospitalAdminDashboard from './pages/HospitalAdminDashboard';
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
    const { page, setPage, token, role, hospitalName, login, logout } = useAppContext();

    useEffect(() => {
        // Only run on native Android/iOS
        if (Capacitor.isNativePlatform()) {
            requestAllPermissions();
        }
    }, []);

    // 1. Session check: if not authenticated, render Login Page
    if (!token) {
        return <LoginPage onLoginSuccess={login} />;
    }

    // 2. Super Admin Dashboard routing
    if (role === 'SUPERADMIN') {
        return <SuperAdminDashboard onLogout={logout} />;
    }

    // 3. Hospital Admin Dashboard routing
    if (role === 'HOSPITAL_ADMIN') {
        return <HospitalAdminDashboard hospitalName={hospitalName || 'Clinic'} onLogout={logout} />;
    }

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
            case 'pre-op-report':
                return <PreOpReportPage />;
            case 'valgus-pre-op-report':
                return <ValgusPreOpReportPage />;
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
        setPage('case-management');
    };

    return (
        <div className="h-screen flex flex-col">
            <header
                className="relative z-50 flex items-center justify-between px-2 pb-2 border-b border-[#333333] shadow-md no-print bg-gradient-to-r from-[#1a1a1a] to-[#252525]"
                style={{ paddingTop: 'max(0.2rem, env(safe-area-inset-top, 0.2rem))' }}
            >
                <div className="flex-1" />
                <h1 className="text-4xl font-black text-[#E0E0E0] tracking-tighter drop-shadow-lg pointer-events-none select-none relative z-10">
                    ROBOTRIX<span className="text-[#6D282C]">+</span>
                </h1>
                <div className="flex-1 flex justify-end pr-3 gap-3">
                    {page !== 'case-management' && (
                        <button
                            onClick={handleHomeClick}
                            className="relative z-50 py-2 px-6 rounded-sm 
                                       bg-[#6D282C] border border-[#893338]
                                       shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                       hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                       active:scale-[0.98]
                                       flex items-center justify-center transition-all duration-300 touch-manipulation select-none cursor-pointer"
                            title="Go to Home"
                            aria-label="Go to Home"
                        >
                            <span className="text-white font-bold tracking-widest select-none">HOME</span>
                        </button>
                    )}
                    <button
                        onClick={logout}
                        className="relative z-50 py-2 px-6 rounded-sm 
                                   bg-transparent border border-[#333] hover:border-[#6D282C]
                                   text-[#888] hover:text-white
                                   active:scale-[0.98]
                                   flex items-center justify-center transition-all duration-300 touch-manipulation select-none cursor-pointer"
                        title="Logout"
                        aria-label="Logout"
                    >
                        <span className="font-bold tracking-widest select-none">LOGOUT</span>
                    </button>
                </div>
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
