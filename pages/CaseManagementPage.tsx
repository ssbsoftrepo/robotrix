
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

    const disabledClasses = 'cursor-not-allowed opacity-40 bg-[#1a1a1a] border-gray-700';
    const enabledClasses = `cursor-pointer group bg-[#1a1a1a] hover:bg-[#252525] border-2 border-[#333333] hover:border-[var(--planner-color)]/70 hover:shadow-[0_0_25px_rgba(109,40,44,0.15)]`;

    return (
        <div
            onClick={!disabled ? onClick : undefined}
            className={`relative flex flex-col items-center space-y-2 p-4 rounded-lg transition-all duration-300 ${disabled ? disabledClasses : enabledClasses} h-full justify-center`}
            style={style}
        >
            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
            <div
                className={`h-18 w-18 md:h-22 md:w-22 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${disabled ? 'border-gray-700' : 'border-[#333333] group-hover:border-[var(--planner-color)] group-hover:bg-[var(--planner-color)]/10'}`}
            >
                {React.cloneElement(icon, { className: 'h-10 w-10 md:h-14 md:w-14 text-gray-300 group-hover:text-[var(--planner-color)] transition-colors duration-300' })}
            </div>
            <p className="text-md md:text-lg font-semibold text-center text-gray-300 transition-colors duration-300 group-hover:text-[var(--planner-color)]">{title.map(t => <span key={t} className="block">{t}</span>)}</p>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-gradient-to-br from-[#1E1E1E] to-[#181818] p-8 rounded-lg max-w-2xl text-center shadow-2xl w-full border border-[#333333]">
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold text-[#E0E0E0] mb-8 uppercase">Select Verification Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => onSelect('long-leg')}
                        className="p-4 rounded-lg border border-[#333333] bg-[#1a1a1a] hover:bg-[#6D282C]/20 hover:border-[#6D282C] transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-gray-200 group-hover:text-[#ff8fa3]">Long Leg Film Result Verification</span>
                    </button>
                    <button
                        onClick={() => onSelect('valgus-stress')}
                        className="p-4 rounded-lg border border-[#333333] bg-[#1a1a1a] hover:bg-[#6D282C]/20 hover:border-[#6D282C] transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-gray-200 group-hover:text-[#ff8fa3]">Valgus Stress Film Result Verification</span>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-gradient-to-br from-[#1E1E1E] to-[#181818] p-8 rounded-lg max-w-2xl text-center shadow-2xl w-full border border-[#333333]">
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold text-[#E0E0E0] mb-8 uppercase">Select Report Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => onSelect('long-leg')}
                        className="p-4 rounded-lg border border-[#333333] bg-[#1a1a1a] hover:bg-[#6D282C]/20 hover:border-[#6D282C] transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-gray-200 group-hover:text-[#ff8fa3]">Long Leg Film Report</span>
                    </button>
                    <button
                        onClick={() => onSelect('valgus-stress')}
                        className="p-4 rounded-lg border border-[#333333] bg-[#1a1a1a] hover:bg-[#6D282C]/20 hover:border-[#6D282C] transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-gray-200 group-hover:text-[#ff8fa3]">Valgus Stress Film Report</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const IntraOpSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'long-leg' | 'valgus-stress') => void;
}> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-gradient-to-br from-[#1E1E1E] to-[#181818] p-8 rounded-lg max-w-2xl text-center shadow-2xl w-full border border-[#333333]">
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold text-[#E0E0E0] mb-8 uppercase">Select Intra-Op Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => onSelect('long-leg')}
                        className="p-4 rounded-lg border border-[#333333] bg-[#1a1a1a] hover:bg-[#6D282C]/20 hover:border-[#6D282C] transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-gray-200 group-hover:text-[#ff8fa3]">Long Leg Film Intra-Op</span>
                    </button>
                    <button
                        onClick={() => onSelect('valgus-stress')}
                        className="p-4 rounded-lg border border-[#333333] bg-[#1a1a1a] hover:bg-[#6D282C]/20 hover:border-[#6D282C] transition flex flex-col items-center group"
                    >
                        <span className="text-xl font-bold text-gray-200 group-hover:text-[#ff8fa3]">Valgus Stress Film Intra-Op</span>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-gradient-to-br from-[#1E1E1E] to-[#181818] p-6 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col border border-[#333333] shadow-2xl">
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold text-[#E0E0E0] mb-6 relative z-10 uppercase">
                    {intent === 'load' ? 'Select or Create a Plan' : 'Select a Plan'}
                </h3>

                {loading && <p className="text-center text-gray-500">Loading...</p>}

                {!loading && !isCreating && (
                    <div className="flex-grow overflow-y-auto space-y-3 mb-6 relative z-10">
                        {plans.length === 0 ? (
                            <p className="text-gray-500 text-center">No plans found. Create one to start.</p>
                        ) : (
                            plans.map(plan => (
                                <button
                                    key={plan.id}
                                    onClick={() => onSelectPlan(plan.id)}
                                    className="w-full text-left p-4 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] hover:border-[#6D282C]/70 transition flex justify-between items-center group"
                                >
                                    <div>
                                        <p className="font-bold text-gray-200 text-lg">{plan.name}</p>
                                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                                            <span>Created: {formatDate(plan.createdAt)}</span>
                                            <span>•</span>
                                            <span className="text-[#6D282C] font-medium">
                                                {plan.legSide === 'right' ? 'Right Leg' : 'Left Leg'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-gray-500 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
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
                    <div className="mb-6 relative z-10">
                        <label className="block text-gray-400 mb-2">Plan Name</label>
                        <input
                            value={newPlanName}
                            onChange={(e) => setNewPlanName(e.target.value)}
                            className="w-full p-3 rounded bg-[#2A2B2C] border border-[#333333] text-gray-200 focus:outline-none focus:border-[#6D282C] mb-4"
                            placeholder="e.g. Pre-op Planning 1"
                            autoFocus
                        />
                        <div className="flex space-x-3">
                            {/* Create Plan - Primary Button */}
                            <button
                                onClick={handleCreate}
                                disabled={!newPlanName.trim()}
                                className="group relative flex-1 py-3 bg-[#6D282C] border border-[#893338] rounded-sm 
                                           shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                           transition-all duration-300 ease-out
                                           hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                           active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                                <span className="relative font-bold text-white tracking-wider">CREATE PLAN</span>
                                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                            </button>
                            {/* Cancel - Secondary Button */}
                            <button
                                onClick={() => setIsCreating(false)}
                                className="group relative flex-1 py-3 bg-[#252525] border border-[#444444] rounded-sm 
                                           shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                           transition-all duration-300 ease-out
                                           hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                                           active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                                <span className="relative font-bold text-gray-200 tracking-wider group-hover:text-white">CANCEL</span>
                                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                            </button>
                        </div>
                    </div>
                )}

                {!isCreating && !loading && intent === 'load' && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="group relative z-10 w-full py-4 bg-[#6D282C] border border-[#893338] rounded-sm 
                                   shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                   active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                        <span className="relative text-lg font-bold text-white tracking-widest">+ CREATE NEW PLAN</span>
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    </button>
                )}
            </div>
        </div>
    );
};


const CaseManagementPage: React.FC = () => {
    const { patients, savePatient, deletePatient, currentPatientId, setCurrentPatientId, setCurrentPlanId, currentPlanId, setPage, setPlannerMode, setLdfaMode, setKneeType, setImplantThickness, legSide } = useAppContext();
    const [view, setView] = useState<'main' | 'list'>('main');
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [activePlanName, setActivePlanName] = useState<string | null>(null);


    const [isLdfaModalOpen, setIsLdfaModalOpen] = useState(false);
    const [implantModalConfig, setImplantModalConfig] = useState<{ isOpen: boolean, targetPage: Page | null }>({ isOpen: false, targetPage: null });


    const [planModalConfig, setPlanModalConfig] = useState<{ isOpen: boolean, patientId: string | null, intent: 'load' | 'result' | 'report' }>({ isOpen: false, patientId: null, intent: 'load' });


    const [isLongLegConfigOpen, setIsLongLegConfigOpen] = useState(false);
    const [tempLdfa, setTempLdfa] = useState<'native' | 'corrected' | null>(null);
    const [tempThickness, setTempThickness] = useState<number | null>(null);

    const [isResultTypeModalOpen, setIsResultTypeModalOpen] = useState(false);
    const [selectedPatientForResults, setSelectedPatientForResults] = useState<string | null>(null);

    const [isReportSelectionOpen, setIsReportSelectionOpen] = useState(false);
    const [isIntraOpSelectionOpen, setIsIntraOpSelectionOpen] = useState(false);

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

    // Fetch active plan name when a plan is loaded
    useEffect(() => {
        if (currentPatientId && currentPlanId) {
            getPlansForPatient(currentPatientId).then(plans => {
                const plan = plans.find(p => p.id === currentPlanId);
                setActivePlanName(plan?.name || 'Plan');
            });
        } else {
            setActivePlanName(null);
        }
    }, [currentPatientId, currentPlanId]);


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
            setPage('planner-long-leg');
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

    const handleDeleteCase = (patientId: string) => {
        deletePatient(patientId);
        setDeleteConfirmId(null);
    };

    const handleNewCase = () => {
        setCurrentPatientId(null);
        setCurrentPlanId(null);
        setPlannerMode(null);
        setLdfaMode(null);
        setImplantThickness(null);
    };

    const handleSwitchCase = () => {
        setView('list');
    };

    const isPatientSelected = !!currentPatientId;
    const isPlanSelected = !!currentPlanId;
    const activePatient = currentPatientId ? patients.find(p => p.id === currentPatientId) : null;
    const hasActiveCase = isPatientSelected && isPlanSelected;

    // Standardized to Maroon palettes
    const plannerColors = ['#6D282C', '#6D282C', '#6D282C', '#6D282C', '#6D282C', '#6D282C', '#6D282C', '#6D282C'];

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
                onClick: () => setImplantModalConfig({ isOpen: true, targetPage: 'planner-valgus-stress' }),
                icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
            },
            {
                page: 'planner-long-leg-valgus',
                title: ['Long leg film Planner', 'for VALGUS KNEE'],
                onClick: () => { setKneeType('valgus'); setPage('planner-long-leg'); },
                icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125a1.125 1.125 0 00-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>
            },
            {
                page: 'intra-operative-planning',
                title: ['Intra-Operative', 'Planning'],
                onClick: () => setIsIntraOpSelectionOpen(true),
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                )
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
                page: 'post-operative-cpak',
                title: ['Post-Operative', 'CPAK Verification'],
                onClick: () => setIsResultTypeModalOpen(true),
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            },
            {
                page: 'view-cases',
                title: ['View Past', 'Case Files'],
                onClick: () => setView('list'),
                icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            },
        ];

    const renderListView = () => {
        // Filter patients by search term (case-insensitive)
        const filteredPatients = patients
            .filter(p => {
                const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                return fullName.includes(searchTerm.toLowerCase());
            })
            // Sort by date descending (latest first)
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });

        return (
            <div className="mt-10 p-6 relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-3xl font-semibold text-[#E0E0E0] uppercase">Past Cases</h3>
                    <button
                        onClick={() => { setView('main'); setSearchTerm(''); }}
                        className="group relative py-2 px-4 bg-[#6D282C] border border-[#893338] rounded-sm 
                                   shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                   active:scale-[0.98] flex items-center"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                        <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-wider">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            BACK TO PLANNER
                        </span>
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    </button>
                </div>

                {/* Search Box */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by patient name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#2A2B2C] border border-[#333333] text-gray-200 
                                       placeholder-gray-500 focus:outline-none focus:border-[#6D282C] focus:ring-1 focus:ring-[#6D282C]
                                       transition-all duration-200"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredPatients.length === 0 ? (
                        <p className="text-gray-500 text-lg">
                            {searchTerm ? `No cases found matching "${searchTerm}".` : 'No past cases found.'}
                        </p>
                    ) : (
                        filteredPatients.map(p => (
                            <div key={p.id} className="relative bg-[#1a1a1a] border border-[#333333] p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center hover:border-[#6D282C]/50 transition">
                                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                                <div className="relative z-10">
                                    <p className="font-semibold text-2xl text-gray-200">{p.firstName} {p.lastName} (ID: {p.id})</p>
                                    <p className="text-lg text-gray-500 mt-2">{formatDate(p.date)}</p>
                                </div>
                                <div className="flex space-x-4 mt-4 md:mt-0 relative z-10">
                                    {/* Load Case - Primary Button */}
                                    <button
                                        onClick={() => selectPatient(p.id)}
                                        className="group relative py-3 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                                                   shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                                   transition-all duration-300 ease-out
                                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                                   active:scale-[0.98]"
                                    >
                                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                                        <span className="relative text-lg font-bold text-white tracking-wider">LOAD CASE</span>
                                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                    </button>
                                    {/* Result - Secondary Button */}
                                    <button
                                        onClick={() => handleResultClick(p.id)}
                                        className="group relative py-3 px-6 bg-[#252525] border border-[#444444] rounded-sm 
                                                   shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                                   transition-all duration-300 ease-out
                                                   hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                                                   active:scale-[0.98]"
                                    >
                                        <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                                        <span className="relative text-lg font-bold text-gray-200 tracking-wider group-hover:text-white">RESULT</span>
                                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                    </button>
                                    {/* Report - Secondary Button */}
                                    <button
                                        onClick={() => handleReportClick(p.id)}
                                        className="group relative py-3 px-6 bg-[#252525] border border-[#444444] rounded-sm 
                                                   shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                                   transition-all duration-300 ease-out
                                                   hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                                                   active:scale-[0.98]"
                                    >
                                        <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                                        <span className="relative text-lg font-bold text-gray-200 tracking-wider group-hover:text-white">REPORT</span>
                                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                    </button>
                                    {/* Delete - Danger Button */}
                                    <button
                                        onClick={() => setDeleteConfirmId(p.id)}
                                        className="group relative py-3 px-6 bg-[#252525] border border-[#444444] rounded-sm 
                                                   shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                                   transition-all duration-300 ease-out
                                                   hover:bg-red-900/30 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]
                                                   active:scale-[0.98]"
                                    >
                                        <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                                        <span className="relative text-lg font-bold text-gray-200 tracking-wider group-hover:text-red-400 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            DELETE
                                        </span>
                                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-red-500/50" />
                                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-red-500/50" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="relative h-full overflow-y-auto bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Overhead Surgical Lamp Effect */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />
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

            <IntraOpSelectionModal
                isOpen={isIntraOpSelectionOpen}
                onClose={() => setIsIntraOpSelectionOpen(false)}
                onSelect={(type) => {
                    setIsIntraOpSelectionOpen(false);
                    if (type === 'long-leg') {
                        setPage('intra-operative-validation');
                    } else {
                        setPage('valgus-intra-operative-validation');
                    }
                }}
            />

            <PlanSelectionModal
                isOpen={planModalConfig.isOpen}
                onClose={() => setPlanModalConfig(prev => ({ ...prev, isOpen: false }))}
                patientId={planModalConfig.patientId || ''}
                onSelectPlan={handlePlanSelected}
                intent={planModalConfig.intent}
            />

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="relative bg-gradient-to-br from-[#1E1E1E] to-[#181818] p-8 rounded-lg max-w-md text-center shadow-2xl w-full border border-[#333333]">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <div className="relative z-10">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-[#E0E0E0] mb-4 uppercase">Delete Case?</h3>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete this case? This action cannot be undone and all associated data will be permanently removed.
                            </p>
                            <div className="flex space-x-4">
                                {/* Cancel Button */}
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="group relative flex-1 py-3 bg-[#252525] border border-[#444444] rounded-sm 
                                               shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                               transition-all duration-300 ease-out
                                               hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                                               active:scale-[0.98]"
                                >
                                    <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                                    <span className="relative font-bold text-gray-200 tracking-wider group-hover:text-white">CANCEL</span>
                                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                </button>
                                {/* Delete Button */}
                                <button
                                    onClick={() => handleDeleteCase(deleteConfirmId)}
                                    className="group relative flex-1 py-3 bg-red-900/50 border border-red-500/50 rounded-sm 
                                               shadow-[0_4px_15px_rgba(239,68,68,0.3)] 
                                               transition-all duration-300 ease-out
                                               hover:bg-red-800/60 hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]
                                               active:scale-[0.98]"
                                >
                                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                                    <span className="relative font-bold text-white tracking-wider">DELETE</span>
                                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-red-400/30 transition-colors group-hover:border-white/50" />
                                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-red-400/30 transition-colors group-hover:border-white/50" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Combined Long Leg Config Modal */}
            {isLongLegConfigOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="flex flex-col items-center w-full max-w-5xl space-y-6">
                        {/* Close Button */}
                        <div className="w-full flex justify-end">
                            <button type="button" onClick={() => setIsLongLegConfigOpen(false)} className="text-gray-500 hover:text-white p-2 transition-colors z-20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Box 1: LDFA Mode */}
                        <div className="relative bg-gradient-to-br from-[#1E1E1E] to-[#181818] p-4 rounded-lg border border-[#333333] w-full shadow-2xl">
                            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                            <h3 className="text-xl font-bold text-[#E0E0E0] mb-4 text-center relative z-10 uppercase">1. Select LDFA Calculation Method</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                <button
                                    onClick={() => setTempLdfa('native')}
                                    className={`p-4 rounded-lg border text-center items-center transition-all h-full flex flex-col ${tempLdfa === 'native' ? 'border-[#6D282C] bg-[#6D282C]/30' : 'border-[#333333] bg-[#1a1a1a] hover:bg-[#252525] hover:border-[#6D282C]/50'}`}
                                >
                                    <span className="block font-bold text-xl mb-2 text-gray-200">Native (Uncorrected)</span>
                                    <span className="block text-sm leading-relaxed whitespace-normal text-gray-400">You take the actual mechanical axis from the real hip center including coxa vara/valga.</span>
                                </button>
                                <button
                                    onClick={() => setTempLdfa('corrected')}
                                    className={`p-4 rounded-lg border text-center items-center transition-all h-full flex flex-col ${tempLdfa === 'corrected' ? 'border-[#6D282C] bg-[#6D282C]/30' : 'border-[#333333] bg-[#1a1a1a] hover:bg-[#252525] hover:border-[#6D282C]/50'}`}
                                >
                                    <span className="block font-bold text-xl mb-2 text-gray-200">Corrected</span>
                                    <span className="block text-sm leading-relaxed whitespace-normal text-gray-400">You normalize the femoral head center to eliminate coxa vara/valga effect.</span>
                                </button>
                            </div>
                        </div>

                        {/* Box 2: Implant Thickness */}
                        <div className="relative bg-gradient-to-br from-[#1E1E1E] to-[#181818] p-4 rounded-lg border border-[#333333] w-full shadow-2xl">
                            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                            <h3 className="text-xl font-bold text-[#E0E0E0] mb-4 text-center relative z-10 uppercase">2. Select minimum composite thickness</h3>
                            <div className="grid grid-cols-4 gap-4 relative z-10">
                                {[18, 19, 20, 21].map(thickness => (
                                    <button
                                        key={thickness}
                                        onClick={() => setTempThickness(thickness)}
                                        className={`h-20 rounded-lg border flex flex-col items-center justify-center transition-all ${tempThickness === thickness ? 'border-[#6D282C] bg-[#6D282C]/30' : 'border-[#333333] bg-[#1a1a1a] hover:bg-[#252525] hover:border-[#6D282C]/50'}`}
                                    >
                                        <span className="text-3xl font-bold text-gray-200">{thickness}</span>
                                        <span className="text-sm text-[#6D282C]">mm</span>
                                    </button>
                                ))}
                            </div>
                        </div>


                        <div className="pt-4">
                            <button
                                disabled={!tempLdfa || !tempThickness}
                                onClick={handleLongLegConfigConfirm}
                                className="group relative py-3 px-10 bg-[#6D282C] border border-[#893338] rounded-sm 
                                           shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                           transition-all duration-300 ease-out
                                           hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                           active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-[#6D282C]"
                            >
                                <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                                <span className="relative text-xl font-bold text-white tracking-widest">
                                    START PLANNING
                                </span>
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {view === 'list' ? renderListView() : (
                <div className="p-6 relative z-10">
                    <h2 className="text-5xl font-bold mb-8 text-start text-[#E0E0E0] uppercase">Surgical Planner</h2>

                    {/* Active Case — shown when a case + plan is loaded */}
                    {hasActiveCase && activePatient ? (
                        <div className="flex justify-center">
                            <div className="relative bg-[#1a1a1a] border border-[#333333] p-4 rounded-lg mb-10 w-full max-w-6xl">
                                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                                <h3 className="text-2xl font-semibold mb-2 text-[#E0E0E0] text-center relative z-10 uppercase">
                                    Patient Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end max-w-5xl mx-auto justify-items-center relative z-10">
                                    <div className="md:col-span-3 w-full">
                                        <label className="block mb-2 text-sm font-medium text-gray-400 text-center">
                                            Patient Name
                                        </label>
                                        <div className="w-full h-14 p-3 rounded-md text-lg bg-[#2A2B2C] border border-[#333333] text-gray-200 flex items-center">
                                            {activePatient.firstName} {activePatient.lastName}
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 w-full">
                                        <label className="block mb-2 text-sm font-medium text-gray-400 text-center">
                                            Patient ID
                                        </label>
                                        <div className="w-full h-14 p-3 rounded-md text-lg bg-[#1a1a1a] border border-[#333333] text-gray-400 flex items-center">
                                            {activePatient.id}
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 w-full">
                                        <label className="block mb-2 text-sm font-medium text-gray-400 text-center">
                                            Plan
                                        </label>
                                        <div className="w-full h-14 p-3 rounded-md text-lg bg-[#2A2B2C] border border-[#333333] text-gray-200 flex items-center font-medium">
                                            {activePlanName || 'Plan'}
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 w-full">
                                        <label className="block mb-2 text-sm font-medium text-gray-400 text-center">
                                            Date
                                        </label>
                                        <div className="w-full h-14 p-3 rounded-md text-lg bg-[#2A2B2C] border border-[#333333] text-gray-200 flex items-center">
                                            {formatDate(activePatient.date)}
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 w-full flex gap-2">
                                        <button
                                            onClick={handleSwitchCase}
                                            type="button"
                                            className="group relative flex-1 h-14 bg-[#252525] border border-[#444444] rounded-sm 
                                                       shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                                       transition-all duration-300 ease-out
                                                       hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                                                       active:scale-[0.98] flex items-center justify-center"
                                        >
                                            <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                                            <span className="relative text-sm font-bold text-gray-200 tracking-wider group-hover:text-white">SWITCH</span>
                                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                                        </button>
                                        <button
                                            onClick={handleNewCase}
                                            type="button"
                                            className="group relative flex-1 h-14 bg-[#6D282C] border border-[#893338] rounded-sm 
                                                       shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                                       transition-all duration-300 ease-out
                                                       hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                                       active:scale-[0.98] flex items-center justify-center"
                                        >
                                            <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                                            <span className="relative text-sm font-bold text-white tracking-wider">+ NEW</span>
                                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Patient Form — shown when NO active case */
                        <>
                            <div className="flex justify-center">
                                <div className="relative bg-[#1a1a1a] border border-[#333333] p-4 rounded-lg mb-10 w-full max-w-6xl">
                                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                                    <h3 className="text-2xl font-semibold mb-2 text-[#E0E0E0] text-center relative z-10 uppercase">
                                        Patient Details
                                    </h3>
                                    <form
                                        onSubmit={handleSubmit}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end max-w-4xl mx-auto justify-items-center relative z-10"
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
                                                className="w-full h-14 p-3 rounded-md text-lg bg-[#2A2B2C] border border-[#333333] text-gray-200 focus:outline-none focus:border-[#6D282C]"
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
                                                className="w-full h-14 p-3 rounded-md text-lg bg-[#1a1a1a] border border-[#333333] text-gray-400"
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
                                                className="w-full h-14 p-3 rounded-md text-lg bg-[#2A2B2C] border border-[#333333] text-gray-200 focus:outline-none focus:border-[#6D282C]"
                                            />
                                        </div>

                                        <div className="md:col-span-3 w-full">
                                            <button
                                                type="submit"
                                                className="group relative w-full h-14 px-8 bg-[#6D282C] border border-[#893338] rounded-sm 
                                                           shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                                           transition-all duration-300 ease-out
                                                           hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                                           active:scale-[0.98]"
                                            >
                                                <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                                                <span className="relative text-lg font-bold text-white tracking-widest transition-colors">
                                                    {isPatientSelected ? 'UPDATE DETAILS' : 'SAVE DETAILS'}
                                                </span>
                                                {/* Corner Accents for Technical Feel */}
                                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {!isPlanSelected && (
                                <div className="text-center p-4 mb-6 bg-[#6D282C]/20 border border-[#6D282C]/50 rounded-lg">
                                    <p className="text-[#ff8fa3] text-lg">
                                        {currentPatientId ? 'Please select a plan to continue.' : 'Please enter and save patient details to begin planning.'}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
                </div>
            )}
        </div>
    );
};


export default CaseManagementPage;
