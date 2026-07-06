import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

interface HospitalAdminDashboardProps {
    hospitalName: string;
    onLogout: () => void;
}

interface Doctor {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    mobileNumber: string;
    email: string;
    consultantId: string;
    active: boolean;
    createdAt: string;
}

interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning';
    message: string;
}

const HospitalAdminDashboard: React.FC<HospitalAdminDashboardProps> = ({ hospitalName, onLogout }) => {
    const { username } = useAppContext();
    // List & Loading states
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(true);

    // Pagination & Search states
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');

    // Creation Form states
    const [consultantUsername, setConsultantUsername] = useState('');
    const [consultantPassword, setConsultantPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Edit Form states
    const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editMobileNumber, setEditMobileNumber] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editActive, setEditActive] = useState(true);
    const [editLoading, setEditLoading] = useState(false);

    // Username validation states
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    // Load doctors/consultants list
    const fetchDoctors = async (page = 0, search = searchQuery) => {
        setLoadingDoctors(true);
        try {
            const data = await api.getDoctors(page, pageSize, search);
            if (data) {
                setDoctors(data.content || []);
                setCurrentPage(data.currentPage || 0);
                setTotalPages(data.totalPages || 1);
                setTotalElements(data.totalElements || 0);
            }
        } catch (err: any) {
            showToast('error', 'Failed to load consultants list');
        } finally {
            setLoadingDoctors(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchDoctors(0);
    }, []);

    // Auto-debounced search: fires 400ms after user stops typing
    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchDoctors(0, searchQuery);
        }, 400);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    // Real-time username check (only for creation)
    useEffect(() => {
        if (!consultantUsername) {
            setUsernameStatus('idle');
            setStatusMessage('');
            return;
        }

        const trimmed = consultantUsername.trim();
        if (trimmed.length < 4) {
            setUsernameStatus('invalid');
            setStatusMessage('Username must be at least 4 characters');
            return;
        }

        if (!/^[a-z0-9_.-]+$/.test(trimmed)) {
            setUsernameStatus('invalid');
            setStatusMessage('Only lowercase letters, numbers, _, - and . are allowed');
            return;
        }

        setUsernameStatus('checking');
        setStatusMessage('Checking availability...');

        const delayDebounce = setTimeout(async () => {
            try {
                const res = await api.checkUsername(trimmed);
                if (res.available) {
                    setUsernameStatus('available');
                    setStatusMessage('Username is available');
                } else {
                    setUsernameStatus('taken');
                    setStatusMessage(res.message || 'Username is already taken');
                }
            } catch (err: any) {
                setUsernameStatus('invalid');
                setStatusMessage('Failed to check username availability');
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [consultantUsername]);

    const handleCreateConsultant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameStatus !== 'available') return;

        if (mobileNumber && mobileNumber.length !== 10) {
            showToast('error', 'Mobile number must be exactly 10 digits');
            return;
        }

        setLoading(true);

        try {
            await api.createDoctor({
                username: consultantUsername,
                password: consultantPassword,
                firstName: firstName,
                lastName: lastName,
                mobileNumber: mobileNumber,
                email: email
            });

            showToast('success', `Consultant account for "${consultantUsername}" created successfully!`);
            setConsultantUsername('');
            setConsultantPassword('');
            setFirstName('');
            setLastName('');
            setMobileNumber('');
            setEmail('');
            setIsModalOpen(false);
            fetchDoctors(0);
        } catch (err: any) {
            showToast('error', err.message || 'Failed to create consultant account');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (d: Doctor) => {
        setEditDoctor(d);
        setEditFirstName(d.firstName || '');
        setEditLastName(d.lastName || '');
        setEditMobileNumber(d.mobileNumber || '');
        setEditEmail(d.email || '');
        setEditActive(d.active);
    };

    const handleUpdateConsultant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editDoctor) return;

        if (editMobileNumber && editMobileNumber.length !== 10) {
            showToast('error', 'Mobile number must be exactly 10 digits');
            return;
        }

        setEditLoading(true);

        try {
            await api.updateDoctor(editDoctor.id, {
                firstName: editFirstName,
                lastName: editLastName,
                mobileNumber: editMobileNumber,
                email: editEmail,
                active: editActive
            });

            showToast('success', `Consultant "${editDoctor.username}" updated successfully!`);
            setEditDoctor(null);
            fetchDoctors(currentPage);
        } catch (err: any) {
            showToast('error', err.message || 'Failed to update consultant');
        } finally {
            setEditLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-[#121212] to-[#0D0D0D] flex flex-col justify-between text-[#E0E0E0] select-none">
            {/* Cinematic Overhead Glow */}
            <div className="absolute top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-950/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Stacked Toasts Container */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse space-y-4 space-y-reverse max-w-sm w-full pointer-events-none">
                {toasts.map(t => (
                    <div 
                        key={t.id} 
                        className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-sm border shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 animate-slide-in ${
                            t.type === 'success' 
                                ? 'bg-[#121c15] border-emerald-900 border-l-4 border-l-emerald-500 text-emerald-400' 
                                : t.type === 'error'
                                ? 'bg-[#1c1212] border-red-900 border-l-4 border-l-red-600 text-red-400'
                                : 'bg-[#1c1a12] border-yellow-950 border-l-4 border-l-yellow-600 text-yellow-400'
                        }`}
                    >
                        <span className="text-base mt-0.5">
                            {t.type === 'success' ? '✓' : '⚠️'}
                        </span>
                        <div className="flex-1 text-left">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${
                                t.type === 'success' ? 'text-emerald-400' : t.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                                {t.type === 'success' ? 'Success' : t.type === 'error' ? 'Error' : 'Warning'}
                            </h4>
                            <p className="text-xs text-[#E0E0E0] mt-1 font-medium">{t.message}</p>
                        </div>
                        <button 
                            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                            className="text-gray-500 hover:text-white text-xs font-bold transition-colors focus:outline-none cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {/* Header */}
            <header className="relative z-10 w-full border-b border-[#2b2b2b] bg-[#161616]/40 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight uppercase leading-none">
                            ROBOTRIX<span className="text-[#6D282C]">+</span> <span className="text-xs font-semibold text-gray-500 ml-2 tracking-widest">HOSPITAL ADMIN</span>
                        </h1>
                        <p className="text-[10px] text-[#888888] tracking-widest uppercase mt-1">
                            {hospitalName || 'Tenant'} Administration
                        </p>
                    </div>
                    <div className="flex items-center gap-3 bg-[#1e1e1e]/60 border border-[#333] px-3.5 py-1.5 rounded-full relative z-50">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            strokeWidth={2} 
                            stroke="#888888" 
                            className="w-4 h-4"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                        <span className="text-xs font-semibold text-[#E0E0E0] select-none tracking-wide">
                            {username}
                        </span>
                        <div className="w-[1px] h-3.5 bg-[#333]" />
                        <button
                            onClick={onLogout}
                            className="text-[#888888] hover:text-[#6D282C] active:scale-[0.9] transition-all duration-300 cursor-pointer flex items-center justify-center"
                            title="Logout"
                            aria-label="Logout"
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={2} 
                                stroke="currentColor" 
                                className="w-4 h-4"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Dashboard */}
            <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
                {/* Search & Actions Header */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
                    <div className="relative w-full max-w-md">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by ID, name, username or mobile..."
                            className="w-full bg-[#161616] border border-[#2b2b2b] text-[#E0E0E0] placeholder-gray-500 pl-10 pr-4 py-3 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                        />
                        <span className="absolute left-3.5 top-3.5 text-gray-500 text-sm">🔍</span>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                                CLEAR
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full sm:w-auto py-3 px-6 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs tracking-widest rounded-sm transition-all duration-300 active:scale-[0.98] select-none shadow-[0_4px_25px_rgba(109,40,45,0.45)] cursor-pointer"
                    >
                        CREATE CONSULTANT
                    </button>
                </div>

                {/* Consultants Table */}
                <section className="bg-[#161616]/90 border border-[#2b2b2b] p-6 rounded-sm shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D282C]" />

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-black tracking-wider uppercase text-gray-400">
                            Registered Hospital Consultants
                        </h2>
                        <span className="text-[10px] bg-[#232323] px-2.5 py-1 text-gray-500 font-bold uppercase rounded-full">
                            Total: {totalElements}
                        </span>
                    </div>

                    {loadingDoctors ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="w-8 h-8 border-2 border-[#6D282C] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-bold tracking-widest uppercase text-gray-500">LOADING CONSULTANTS...</span>
                        </div>
                    ) : doctors.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-2 border border-dashed border-[#232323] rounded-sm">
                            <span className="text-3xl">👥</span>
                            <h3 className="text-sm font-bold text-[#E0E0E0] uppercase tracking-wider">No consultants found</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">
                                {searchQuery ? 'Try adjusting your search criteria' : 'Get started by creating a new consultant'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#232323] text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                                            <th className="px-6 py-4">Consultant ID</th>
                                            <th className="px-6 py-4">Username</th>
                                            <th className="px-6 py-4">First Name</th>
                                            <th className="px-6 py-4">Last Name</th>
                                            <th className="px-6 py-4">Mobile Number</th>
                                            <th className="px-6 py-4">Email</th>
                                            <th className="px-6 py-4">Created Date</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#232323] text-sm text-[#CCCCCC]">
                                        {doctors.map((d) => (
                                            <tr key={d.id} className="hover:bg-[#1c1c1c]/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-emerald-400 tracking-wider">
                                                    {d.consultantId || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-white">
                                                    {d.username}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {d.firstName || '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {d.lastName || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-300">
                                                    {d.mobileNumber || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-300 select-all font-mono text-xs">
                                                    {d.email || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400">
                                                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`inline-flex items-center justify-center px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-sm border select-none min-w-[110px] ${
                                                            d.active
                                                                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50'
                                                                : 'bg-red-950/20 text-red-400 border-red-900/50'
                                                        }`}
                                                    >
                                                        {d.active ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleEditClick(d)}
                                                        className="py-1.5 px-4 bg-[#1a1a1a] hover:bg-[#2b2b2b] border border-[#333] hover:border-[#6D282C] text-gray-400 hover:text-white font-bold text-xs tracking-wider rounded-sm transition-all duration-300 cursor-pointer active:scale-95"
                                                    >
                                                        EDIT
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-[#232323] text-xs text-gray-400">
                                <div>
                                    Showing {doctors.length > 0 ? (currentPage * pageSize + 1) : 0} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} consultants
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => currentPage > 0 && fetchDoctors(currentPage - 1)}
                                        disabled={currentPage === 0}
                                        className="py-1.5 px-3 bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm hover:border-[#6D282C] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
                                    >
                                        PREV
                                    </button>
                                    <span className="px-2 text-[#E0E0E0] font-bold">
                                        Page {currentPage + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => currentPage < totalPages - 1 && fetchDoctors(currentPage + 1)}
                                        disabled={currentPage >= totalPages - 1}
                                        className="py-1.5 px-3 bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm hover:border-[#6D282C] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
                                    >
                                        NEXT
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>

            {/* Modal Dialog for Consultant Registration */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm transition-opacity" 
                        onClick={() => setIsModalOpen(false)}
                    />
                    
                    {/* Modal Card */}
                    <div className="relative z-10 max-w-xl w-full bg-[#161616] border border-[#2b2b2b] p-6 md:p-8 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-y-auto max-h-[90vh]">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D282C]" />
                        
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-md font-black tracking-wider uppercase text-[#E0E0E0]">
                                Register New Consultant
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-white text-sm font-bold transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateConsultant} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Username */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                        Consultant Username
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={consultantUsername}
                                        onChange={(e) => setConsultantUsername(e.target.value.toLowerCase())}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="e.g. john_doe"
                                    />
                                    {statusMessage && (
                                        <p className={`text-[11px] mt-1 font-semibold ${
                                            usernameStatus === 'available' ? 'text-green-500' :
                                            usernameStatus === 'checking' ? 'text-yellow-500' : 'text-red-500'
                                        }`}>
                                            {statusMessage}
                                        </p>
                                    )}
                                </div>

                                {/* Password */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                        Consultant Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={consultantPassword}
                                        onChange={(e) => setConsultantPassword(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {/* First Name */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="Enter first name"
                                    />
                                </div>

                                {/* Last Name */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="Enter last name"
                                    />
                                </div>

                                {/* Email Address */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="Enter email address"
                                    />
                                </div>

                                {/* Mobile Number */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                        Mobile Number
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={mobileNumber}
                                        maxLength={10}
                                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="Enter 10-digit mobile number"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || usernameStatus !== 'available'}
                                className="w-full py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs tracking-widest rounded-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] cursor-pointer mt-4"
                            >
                                {loading ? 'CREATING...' : 'REGISTER CONSULTANT'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Dialog for Consultant Editing */}
            {editDoctor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm transition-opacity" 
                        onClick={() => setEditDoctor(null)}
                    />
                    
                    {/* Modal Card */}
                    <div className="relative z-10 max-w-md w-full bg-[#161616] border border-[#2b2b2b] p-6 md:p-8 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-y-auto max-h-[90vh]">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D282C]" />
                        
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-md font-black tracking-wider uppercase text-[#E0E0E0]">
                                Edit Consultant Details
                            </h3>
                            <button 
                                onClick={() => setEditDoctor(null)}
                                className="text-gray-500 hover:text-white text-sm font-bold transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUpdateConsultant} className="space-y-4">


                            {/* First Name */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editFirstName}
                                    onChange={(e) => setEditFirstName(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                    placeholder="Enter first name"
                                />
                            </div>

                            {/* Last Name */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editLastName}
                                    onChange={(e) => setEditLastName(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                    placeholder="Enter last name"
                                />
                            </div>

                            {/* Mobile Number */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                    Mobile Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editMobileNumber}
                                    maxLength={10}
                                    onChange={(e) => setEditMobileNumber(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                    placeholder="Enter 10-digit mobile number"
                                />
                            </div>

                            {/* Email Address */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                    placeholder="Enter email address"
                                />
                            </div>

                            {/* Status Option */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold tracking-wider text-[#888888] uppercase">
                                    Consultant Status
                                </label>
                                <div className="flex items-center space-x-6 py-1">
                                    <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#E0E0E0] cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="editActive"
                                            checked={editActive === true}
                                            onChange={() => setEditActive(true)}
                                            style={{ accentColor: '#6D282C' }}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                        <span className="text-emerald-400">ACTIVE</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#E0E0E0] cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="editActive"
                                            checked={editActive === false}
                                            onChange={() => setEditActive(false)}
                                            style={{ accentColor: '#6D282C' }}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                        <span className="text-red-400">INACTIVE</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={editLoading}
                                className="w-full py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs tracking-widest rounded-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] cursor-pointer mt-4"
                            >
                                {editLoading ? 'UPDATING...' : 'SAVE CHANGES'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="relative z-10 w-full py-4 border-t border-[#2b2b2b] bg-[#161616]/20 mt-8">
                <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                    <span>© {new Date().getFullYear()} PLUS Orthopedics. All Rights Reserved.</span>
                    <span className="mt-2 md:mt-0">Powered by Robotrix+ Execution Platform</span>
                </div>
            </footer>
        </div>
    );
};

export default HospitalAdminDashboard;
