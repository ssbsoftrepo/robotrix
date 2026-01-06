
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Patient, Page } from '../types';
import { getPlansForPatient, createNewPlan, PlanMetadata, getNextPatientId, getNextPatientIdPreview } from '../utils/storage';
import { formatDate } from '../utils/date';
import LdfaModeModal from '../components/LdfaModeModal';
import ImplantThicknessModal from '../components/ImplantThicknessModal';

const PlannerOption: React.FC<{
    onClick: () => void,
    title: string[],
    icon: React.JSX.Element,
    disabled: boolean,
    color: string
}> = ({ onClick, title, icon, disabled, color }) => {

    const style = { '--planner-color': color } as React.CSSProperties;

    const disabledClasses = 'cursor-not-allowed opacity-50 bg-[#1e1f20]';
    const enabledClasses = `cursor-pointer group gemini-dark-card hover:shadow-lg hover:shadow-[var(--planner-color)]/20 border-2 border-[var(--planner-color)] hover:scale-105`;

    return (
        <div
            onClick={!disabled ? onClick : undefined}
            className={`flex flex-col items-center space-y-4 p-6 rounded-xl transition-all duration-300 ${disabled ? disabledClasses : enabledClasses} h-full justify-center`}
            style={style}
        >
            <div
                className={`h-24 w-24 md:h-32 md:w-32 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${disabled ? 'border-gray-600' : 'border-gray-700 group-hover:border-[var(--planner-color)] group-hover:bg-[var(--planner-color)]/20'}`}
            >
                {React.cloneElement(icon, { className: 'h-12 w-12 md:h-20 md:w-20 text-gray-200 group-hover:text-white transition-colors duration-300' })}
            </div>
            <p className="text-lg md:text-xl font-semibold text-center text-gray-200 transition-colors duration-300 group-hover:text-[var(--planner-color)]">{title.map(t => <span key={t} className="block">{t}</span>)}</p>
        </div>
    );
};

const ResultTypeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'long-leg' | 'valgus-stress') => void;
}> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="gemini-dark-card p-8 rounded-lg max-w-2xl text-center shadow-xl w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold text-gray-200 mb-8">Select Verification Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => onSelect('long-leg')}
                        className="p-4 rounded-lg border-2 border-[#6D282C] hover:bg-[#6D282C]/30 transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-white group-hover:text-red-200">Long Leg Film Result Verification</span>
                    </button>
                    <button
                        onClick={() => onSelect('valgus-stress')}
                        className="p-4 rounded-lg border-2 border-[#8B0000] hover:bg-[#8B0000]/30 transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-white group-hover:text-red-200">Valgus Stress Film Result Verification</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReportSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'long-leg' | 'valgus-stress') => void;
}> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="gemini-dark-card p-8 rounded-lg max-w-lg text-center shadow-xl w-full relative border border-gray-600">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold text-gray-200 mb-8">Select Report Type</h3>
                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => onSelect('long-leg')}
                        className="p-4 rounded-lg border-2 border-[#6D282C] hover:bg-[#6D282C]/30 transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-white group-hover:text-red-200">Long Leg Film Report</span>
                        <span className="text-sm text-gray-400">Standard varus knee analysis</span>
                    </button>
                    <button
                        onClick={() => onSelect('valgus-stress')}
                        className="p-4 rounded-lg border-2 border-[#8B0000] hover:bg-[#8B0000]/30 transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-white group-hover:text-red-200">Valgus Stress Film Report</span>
                        <span className="text-sm text-gray-400">Valgus knee specific planning</span>
                    </button>
                </div>
            </div>
        </div>
    );
};





const PlanSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    onSelectPlan: (planId: string) => void;
    intent: 'load' | 'result' | 'report';
}> = ({ isOpen, onClose, patientId, onSelectPlan, intent }) => {
    const [plans, setPlans] = useState<PlanMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');

    useEffect(() => {
        if (isOpen && patientId) {
            setLoading(true);
            getPlansForPatient(patientId).then(p => {
                setPlans(p);
                setLoading(false);
            });
        }
    }, [isOpen, patientId]);

    const handleCreate = async () => {
        if (!newPlanName.trim()) return;
        setLoading(true);
        try {
            const newId = await createNewPlan(patientId, newPlanName);
            onSelectPlan(newId);
            setNewPlanName('');
            setIsCreating(false);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="gemini-dark-card p-6 rounded-lg max-w-2xl w-full relative max-h-[80vh] flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold text-gray-200 mb-6">
                    {intent === 'load' ? 'Select or Create a Plan' : 'Select a Plan'}
                </h3>

                {loading && <p className="text-center text-gray-400">Loading...</p>}

                {!loading && !isCreating && (
                    <div className="flex-grow overflow-y-auto space-y-3 mb-6">
                        {plans.length === 0 ? (
                            <p className="text-gray-400 text-center">No plans found. Create one to start.</p>
                        ) : (
                            plans.map(plan => (
                                <button
                                    key={plan.id}
                                    onClick={() => onSelectPlan(plan.id)}
                                    className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 transition flex justify-between items-center group"
                                >
                                    <div>
                                        <p className="font-bold text-white text-lg">{plan.name}</p>


                                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                                            <span>Created: {formatDate(plan.createdAt)}</span>
                                            <span>•</span>
                                            <span className="text-indigo-300 font-medium">
                                                {plan.legSide === 'right' ? 'Right Leg' : 'Left Leg'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                                        Load
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {isCreating && (
                    <div className="mb-6">
                        <label className="block text-gray-300 mb-2">Plan Name</label>
                        <input
                            value={newPlanName}
                            onChange={(e) => setNewPlanName(e.target.value)}
                            className="gemini-dark-input w-full p-3 rounded mb-4"
                            placeholder="e.g. Pre-op Planning 1"
                            autoFocus
                        />

                        <div className="flex space-x-3">
                            <button onClick={handleCreate} disabled={!newPlanName.trim()} className="flex-1 bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold py-3 rounded disabled:opacity-50">Create Plan</button>
                            <button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded">Cancel</button>
                        </div>
                    </div>
                )}

                {!isCreating && !loading && intent === 'load' && (
                    <button onClick={() => setIsCreating(true)} className="w-full bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold text-lg py-3 px-8 rounded-full shadow-xl transition transform hover:scale-105">+ Create New Plan</button>
                )}
            </div>
        </div>
    );
};


const CaseManagementPage: React.FC = () => {
    const { patients, savePatient, currentPatientId, setCurrentPatientId, setCurrentPlanId, currentPlanId, setPage, setPlannerMode, setLdfaMode, setKneeType, setImplantThickness } = useAppContext();
    const [view, setView] = useState<'main' | 'list'>('main');


    const [isLdfaModalOpen, setIsLdfaModalOpen] = useState(false);
    const [implantModalConfig, setImplantModalConfig] = useState<{ isOpen: boolean, targetPage: Page | null }>({ isOpen: false, targetPage: null });


    const [planModalConfig, setPlanModalConfig] = useState<{ isOpen: boolean, patientId: string | null, intent: 'load' | 'result' | 'report' }>({ isOpen: false, patientId: null, intent: 'load' });


    const [isLongLegConfigOpen, setIsLongLegConfigOpen] = useState(false);
    const [tempLdfa, setTempLdfa] = useState<'native' | 'corrected' | null>(null);
    const [tempThickness, setTempThickness] = useState<number | null>(null);

    const [isResultTypeModalOpen, setIsResultTypeModalOpen] = useState(false);
    const [selectedPatientForResults, setSelectedPatientForResults] = useState<string | null>(null);

    const [isReportSelectionOpen, setIsReportSelectionOpen] = useState(false);

    const [formData, setFormData] = useState<Patient>({
        id: `PID-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        firstName: '',
        lastName: '',
        age: '',
        gender: 'Male',

    });

    const [suggestedId, setSuggestedId] = useState<string>('Loading...');

    useEffect(() => {
        if (!currentPatientId) {
            getNextPatientIdPreview().then(setSuggestedId);
        } else {
            setSuggestedId('');
        }
    }, [currentPatientId]);

    useEffect(() => {
        setCurrentPatientId(null);
        setCurrentPlanId(null);
        setPlannerMode(null);
        setLdfaMode(null);
        setImplantThickness(null);
    }, []);


    useEffect(() => {
        if (currentPatientId) {
            const patient = patients.find(p => p.id === currentPatientId);
            if (patient) {
                setFormData(patient);
            }
        } else {
            // If no patient is selected, reset form for a new entry
            setFormData({
                id: `PID-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                firstName: '',
                lastName: '',
                age: '',
                gender: 'Male',
                // legSide: 'Left',
            });
        }
    }, [currentPatientId, patients]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value as any }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let patientId: string;

        if (currentPatientId) {
            patientId = currentPatientId;
        } else {
            patientId = await getNextPatientId();
        }

        const patientToSave: Patient = {
            ...formData,
            id: patientId,
        };

        await savePatient(patientToSave);
        await setCurrentPatientId(patientId, patientToSave);

        if (!currentPatientId) {
            const planId = await createNewPlan(patientId, 'Initial Plan');
            await setCurrentPlanId(planId, patientToSave);
            setPlannerMode('advanced');
        }
    };

    const selectPatient = async (id: string) => {
        await setCurrentPatientId(id);
        setPlanModalConfig({ isOpen: true, patientId: id, intent: 'load' });
    };

    const handlePlanSelected = async (planId: string) => {
        await setCurrentPlanId(planId);
        const currentIntent = planModalConfig.intent;
        setPlanModalConfig(prev => ({ ...prev, isOpen: false }));

        if (currentIntent === 'load') {
            setPlannerMode('advanced');
            setView('main');
        } else if (currentIntent === 'result') {
            setSelectedPatientForResults(currentPatientId);
            setIsResultTypeModalOpen(true);
        } else if (currentIntent === 'report') {
            setIsReportSelectionOpen(true);
        }
    };

    const handleResultClick = async (patientId: string) => {

        const plans = await getPlansForPatient(patientId);
        if (plans.length > 1) {
            await setCurrentPatientId(patientId);
            setPlanModalConfig({ isOpen: true, patientId, intent: 'result' });
        } else if (plans.length === 1) {

            await setCurrentPatientId(patientId);
            await setCurrentPlanId(plans[0].id);
            setIsResultTypeModalOpen(true);
            setSelectedPatientForResults(patientId);
        } else {

            await setCurrentPatientId(patientId);
            setIsResultTypeModalOpen(true);
            setSelectedPatientForResults(patientId);
        }
    };

    const handleReportClick = async (patientId: string) => {
        const plans = await getPlansForPatient(patientId);
        if (plans.length > 1) {
            await setCurrentPatientId(patientId);
            setPlanModalConfig({ isOpen: true, patientId, intent: 'report' });
        } else if (plans.length === 1) {
            await setCurrentPatientId(patientId);
            await setCurrentPlanId(plans[0].id);
            setIsReportSelectionOpen(true);
        } else {
            await setCurrentPatientId(patientId);
            setIsReportSelectionOpen(true);
        }
    };

    const handleSelectResultType = async (type: 'long-leg' | 'valgus-stress') => {
        const pid = selectedPatientForResults || currentPatientId;
        if (!pid) return;


        if (currentPatientId !== pid) await setCurrentPatientId(pid);

        if (type === 'long-leg') {
            setPage('past-case-result');
        } else {
            setPage('past-case-valgus-result');
        }
        setIsResultTypeModalOpen(false);
        setSelectedPatientForResults(null);
    };

    const handleLongLegVarusClick = () => {
        setKneeType('varus');

        setTempLdfa(null);
        setTempThickness(null);
        setIsLongLegConfigOpen(true);
    };

    const handleLongLegConfigConfirm = () => {
        if (tempLdfa && tempThickness) {
            setLdfaMode(tempLdfa);
            setImplantThickness(tempThickness);
            setIsLongLegConfigOpen(false);
            setPage('planner-long-leg-laxity-check');
        }
    };

    const handleReportSelection = (type: 'long-leg' | 'valgus-stress') => {
        setIsReportSelectionOpen(false);
        if (type === 'long-leg') {
            setPage('report');
        } else {
            setPage('planner-valgus-stress-report');
        }
    };

    const isPatientSelected = !!currentPatientId;
    const isPlanSelected = !!currentPlanId;

    // Standardized to Maroon palettes
    const plannerColors = ['#6D282C', '#6D282C', '#6D282C', '#6D282C', '#6D282C', '#6D282C'];

    const planners: {
        page: string;
        title: string[];
        icon: React.JSX.Element;
        onClick?: () => void;
        disabled?: boolean;
    }[] = [
            // 1st Row
            {
                page: 'planner-long-leg-varus',
                title: ['Long leg film planner', 'for VARUS KNEE'],
                onClick: handleLongLegVarusClick,
                icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
            },
            {
                page: 'planner-valgus-stress',
                title: ['Valgus stress film planner', 'for VARUS KNEE'],
                onClick: () => setImplantModalConfig({ isOpen: true, targetPage: 'planner-valgus-stress-laxity-check' }),
                icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
            },
            {
                page: 'planner-long-leg-valgus',
                title: ['Long leg film Planner', 'for VALGUS KNEE'],
                onClick: () => { setKneeType('valgus'); setPage('planner-long-leg'); },
                icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125a1.125 1.125 0 00-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>
            },
            // 2nd Row
            {
                page: 'simulation',
                title: ['Resection', 'Simulation'],
                onClick: () => setPage('simulation'),
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-4.14-3.36-7.5-7.5-7.5S4.5 7.86 4.5 12 7.86 19.5 12 19.5s7.5-3.36 7.5-7.5Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
                        <circle cx="12" cy="7" r="2" fill="currentColor" className="opacity-50" />
                        <circle cx="12" cy="17" r="2" fill="currentColor" className="opacity-50" />
                    </svg>
                )
            },
            {
                page: 'report',
                title: ['Generate', 'Report'],
                onClick: () => setIsReportSelectionOpen(true),
                icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            },
            {
                page: 'view-cases',
                title: ['View Past', 'Case Files'],
                onClick: () => setView('list'),
                icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            },
        ];

    const renderListView = () => (
        <div className="mt-10">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-semibold">Past Cases</h3>
                <button onClick={() => setView('main')} className="gemini-dark-button font-bold py-2 px-4 rounded-md transition text-sm flex items-center space-x-2">
                    <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Planner
                    </span>
                </button>
            </div>
            <div className="space-y-4">
                {patients.length === 0 ? (
                    <p className="text-gray-400 text-lg">No past cases found.</p>
                ) : (
                    patients.map(p => (
                        <div key={p.id} className="gemini-dark-card p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <p className="font-semibold text-2xl">{p.firstName} {p.lastName} (ID: {p.id})</p>
                                <p className="text-lg text-gray-400 mt-2">{formatDate(p.date)}</p>
                            </div>
                            <div className="flex space-x-4 mt-4 md:mt-0">
                                <button onClick={() => selectPatient(p.id)} className="gemini-dark-button font-bold text-lg py-3 px-6 rounded-lg">Load Case</button>
                                <button onClick={() => handleResultClick(p.id)} className="bg-gray-600 hover:bg-gray-700 font-bold text-lg py-3 px-6 rounded-lg">Result</button>
                                <button onClick={() => handleReportClick(p.id)} className="bg-gray-600 hover:bg-gray-700 font-bold text-lg py-3 px-6 rounded-lg">Report</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full overflow-y-auto">
            {/* Modal for Legacy Flows */}
            <LdfaModeModal
                isOpen={isLdfaModalOpen}
                onClose={() => setIsLdfaModalOpen(false)}
                onSelect={(mode) => {
                    setLdfaMode(mode);
                    setIsLdfaModalOpen(false);
                    setImplantModalConfig({ isOpen: true, targetPage: 'planner-long-leg' });
                }}
            />
            <ImplantThicknessModal
                isOpen={implantModalConfig.isOpen}
                onClose={() => setImplantModalConfig({ isOpen: false, targetPage: null })}
                targetPage={implantModalConfig.targetPage}
            />
            <ResultTypeModal
                isOpen={isResultTypeModalOpen}
                onClose={() => setIsResultTypeModalOpen(false)}
                onSelect={handleSelectResultType}
            />

            <ReportSelectionModal
                isOpen={isReportSelectionOpen}
                onClose={() => setIsReportSelectionOpen(false)}
                onSelect={handleReportSelection}
            />

            <PlanSelectionModal
                isOpen={planModalConfig.isOpen}
                onClose={() => setPlanModalConfig(prev => ({ ...prev, isOpen: false }))}
                patientId={planModalConfig.patientId || ''}
                onSelectPlan={handlePlanSelected}
                intent={planModalConfig.intent}
            />

            {/* Combined Long Leg Config Modal */}
            {isLongLegConfigOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
                    <div className="flex flex-col items-center w-full max-w-5xl space-y-6">
                        {/* Close Button */}
                        <div className="w-full flex justify-end">
                            <button onClick={() => setIsLongLegConfigOpen(false)} className="text-gray-400 hover:text-white p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Box 1: LDFA Mode */}
                        <div className="bg-[#2b0e10] p-6 rounded-xl border-2 border-[#6D282C] w-full shadow-2xl">
                            <h3 className="text-2xl font-bold text-red-100 mb-6 text-center">1. Select LDFA Calculation Method</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={() => setTempLdfa('native')}
                                    className={`p-6 rounded-lg border-2 text-center items-center transition-all h-full flex flex-col ${tempLdfa === 'native' ? 'border-white bg-[#6D282C] text-white shadow-lg scale-[1.02]' : 'border-red-900/50 hover:bg-[#4a1a1c] text-red-200'}`}
                                >
                                    <span className="block font-bold text-2xl mb-3">Native (Uncorrected)</span>
                                    <span className="block text-lg leading-relaxed whitespace-normal">You take the actual mechanical axis from the real hip center including coxa vara/valga.</span>
                                </button>
                                <button
                                    onClick={() => setTempLdfa('corrected')}
                                    className={`p-6 rounded-lg border-2 text-center items-center transition-all h-full flex flex-col ${tempLdfa === 'corrected' ? 'border-white bg-[#6D282C] text-white shadow-lg scale-[1.02]' : 'border-red-900/50 hover:bg-[#4a1a1c] text-red-200'}`}
                                >
                                    <span className="block font-bold text-2xl mb-3">Corrected</span>
                                    <span className="block text-lg leading-relaxed whitespace-normal">You normalize the femoral head center to eliminate coxa vara/valga effect.</span>
                                </button>
                            </div>
                        </div>

                        {/* Box 2: Implant Thickness */}
                        <div className="bg-[#1e1e1e] p-4 rounded-xl border border-gray-600 w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-gray-200 mb-4 text-center">2. Select minimum composite thickness</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {[18, 19, 20, 21].map(thickness => (
                                    <button
                                        key={thickness}
                                        onClick={() => setTempThickness(thickness)}
                                        className={`h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${tempThickness === thickness ? 'border-[#6D282C] bg-[#6D282C]/30 ring-1 ring-[#6D282C]' : 'border-gray-600 bg-gray-800/20 hover:bg-gray-800/40'}`}
                                    >
                                        <span className="text-3xl font-bold text-white">{thickness}</span>
                                        <span className="text-sm text-red-400">mm</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                disabled={!tempLdfa || !tempThickness}
                                onClick={handleLongLegConfigConfirm}
                                className="bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold text-lg py-3 px-8 rounded-full shadow-xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Start Planning
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'list' ? renderListView() : (
                <>
                    <h2 className="text-5xl font-bold mb-8 text-start">Surgical Planner</h2>
                    <div className="flex justify-center">
                        <div className="gemini-dark-card p-4 rounded-lg mb-10 w-full max-w-6xl">
                            <h3 className="text-2xl font-semibold mb-2 text-gray-200 text-center">
                                Patient Details
                            </h3>
                            <form
                                onSubmit={handleSubmit}
                                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end 
                       max-w-4xl mx-auto justify-items-center"
                            >
                                <div className="md:col-span-3 w-full">
                                    <label className="block mb-2 text-sm font-medium text-gray-400 text-center">
                                        Patient Name
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="gemini-dark-input w-full h-14 p-3 rounded-md text-lg"
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-3 w-full">
                                    <label className="block mb-2 text-sm font-medium text-gray-400 text-center">
                                        Patient ID
                                    </label>
                                    <input
                                        type="text"
                                        id="id"
                                        value={currentPatientId ? formData.id : suggestedId}
                                        onChange={handleInputChange}
                                        disabled={!!currentPatientId}
                                        className="gemini-dark-input w-full h-14 p-3 rounded-md text-lg bg-gray-800"
                                        placeholder="Auto-generated ID"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-3 w-full">
                                    <label className="block mb-2 text-sm font-medium text-gray-400 text-center">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        id="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="gemini-dark-input w-full h-14 p-3 rounded-md text-lg"
                                    />
                                </div>

                                <div className="md:col-span-3 w-full">
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-[#6D282C] to-[#893338] hover:from-[#5a2023] hover:to-[#752b2f] text-white font-bold text-lg py-3 px-8 rounded-full shadow-xl transition transform hover:scale-105 w-full"
                                    >
                                        {isPatientSelected ? 'Update Details' : 'Save Details'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {!isPlanSelected && (
                        <div className="text-center p-4 mb-6 bg-yellow-900/50 border border-yellow-700 rounded-lg">
                            <p className="text-yellow-300 text-lg">
                                {currentPatientId ? 'Please select a plan to continue.' : 'Please enter and save patient details to begin planning.'}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {planners.map((p, index) => (
                            <PlannerOption
                                key={p.page}
                                onClick={p.onClick || (() => setPage(p.page as any))}
                                title={p.title}
                                icon={p.icon}
                                disabled={p.disabled !== undefined ? p.disabled : (p.page !== 'view-cases' && !isPlanSelected)}
                                color={plannerColors[index]}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};


export default CaseManagementPage;
