
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
    const {
        page,
        setPage,
        token,
        role,
        hospitalName,
        login,
        logout,
        showIdleModal,
        idleCountdown,
        keepSessionAlive
    } = useAppContext();

    useEffect(() => {
        // Only run on native Android/iOS
        if (Capacitor.isNativePlatform()) {
            requestAllPermissions();
        }
    }, []);

    const handleHomeClick = () => {
        setPage('case-management');
    };

    const renderContent = () => {
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

    return (
        <>
            {renderContent()}
            {showIdleModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md">
                    <div className="relative w-full max-w-md p-6 bg-[#1a1a1a] border border-[#333333] rounded-lg shadow-[0_10px_50px_rgba(0,0,0,0.8)] text-center">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#6D282C] rounded-t-lg" />
                        
                        <div className="mb-4 flex justify-center text-[#ff4d4d]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        
                        <h2 className="text-2xl font-black text-[#E0E0E0] tracking-wider mb-2">
                            SESSION EXPIRING
                        </h2>
                        
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            You have been inactive for 9 minutes. To protect medical records and patient data, you will be automatically logged out in:
                            <span className="block text-4xl font-extrabold text-[#ff4d4d] mt-3 tracking-widest font-mono">
                                {idleCountdown}s
                            </span>
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={keepSessionAlive}
                                className="w-full py-3 bg-[#6D282C] border border-[#893338] rounded-sm text-white font-bold tracking-widest shadow-[0_4px_15px_rgba(109,40,44,0.4)] transition-all duration-300 hover:bg-[#893338] hover:shadow-[0_0_20px_rgba(109,40,44,0.6)] active:scale-[0.98] cursor-pointer"
                            >
                                STAY LOGGED IN
                            </button>
                            <button
                                onClick={logout}
                                className="w-full py-3 bg-transparent border border-[#333333] rounded-sm text-gray-400 font-bold tracking-widest hover:text-white hover:border-[#6D282C] transition-all duration-300 active:scale-[0.98] cursor-pointer"
                            >
                                LOGOUT NOW
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default App;
