import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

interface SuperAdminDashboardProps {
    onLogout: () => void;
}

interface Hospital {
    id: string;
    hid: string;
    name: string;
    adminName: string;
    adminMobileNumber: string;
    adminEmail: string;
    active: boolean;
    subscriptionExpiresAt: string | null;
    lastRenewedAt: string | null;
    subscriptionStatus: string;
}

interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning';
    message: string;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout }) => {
    const { username } = useAppContext();
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Pagination & Search states
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(5);
    const [searchQuery, setSearchQuery] = useState('');

    // Creation Form states
    const [hospitalName, setHospitalName] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminMobileNumber, setAdminMobileNumber] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Edit Form states
    const [editHospital, setEditHospital] = useState<Hospital | null>(null);
    const [editName, setEditName] = useState('');
    const [editMobileNumber, setEditMobileNumber] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editActive, setEditActive] = useState(true);
    const [editLoading, setEditLoading] = useState(false);

    // Username validation states
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    // Toast notifications state
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const fetchHospitals = async (page = 0, search = searchQuery) => {
        try {
            const data = await api.getHospitals(page, pageSize, search);
            if (data) {
                setHospitals(data.content || []);
                setCurrentPage(data.currentPage || 0);
                setTotalPages(data.totalPages || 1);
                setTotalElements(data.totalElements || 0);
            }
        } catch (err: any) {
            showToast('error', 'Failed to load hospitals list');
        }
    };

    useEffect(() => {
        fetchHospitals(0, '');
    }, []);

    // Auto-debounced search: fires 400ms after user stops typing
    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchHospitals(0, searchQuery);
        }, 400);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    useEffect(() => {
        if (!adminUsername) {
            setUsernameStatus('idle');
            setStatusMessage('');
            return;
        }

        const trimmed = adminUsername.trim();
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
    }, [adminUsername]);

    const handleCreateHospital = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameStatus !== 'available') return;
        setLoading(true);

        try {
            await api.createHospital({
                hospitalName,
                adminUsername,
                adminPassword,
                adminMobileNumber,
                adminEmail
            });

            showToast('success', `Hospital "${hospitalName}" and admin user "${adminUsername}" registered successfully!`);
            setHospitalName('');
            setAdminUsername('');
            setAdminPassword('');
            setAdminMobileNumber('');
            setAdminEmail('');
            setIsModalOpen(false);
            fetchHospitals(0);
        } catch (err: any) {
            showToast('error', err.message || 'Failed to create hospital');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: string, name: string, currentlyActive: boolean) => {
        setActionLoading(id);
        try {
            await api.toggleHospital(id);
            showToast('success', `Hospital "${name}" is now ${currentlyActive ? 'INACTIVE' : 'ACTIVE'}.`);
            await fetchHospitals(currentPage);
        } catch (err: any) {
            showToast('error', `Failed to toggle status for hospital "${name}"`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRenewSubscription = async (id: string, name: string) => {
        setActionLoading(id);
        try {
            await api.renewSubscription(id);
            showToast('success', `Subscription renewed for "${name}" — active for 1 year from today.`);
            await fetchHospitals(currentPage);
        } catch (err: any) {
            showToast('error', `Failed to renew subscription for "${name}"`);
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getSubscriptionBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return { label: 'ACTIVE', cls: 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50' };
            case 'EXPIRING_SOON':
                return { label: 'EXPIRING SOON', cls: 'bg-yellow-950/20 text-yellow-400 border-yellow-900/50' };
            case 'EXPIRED':
                return { label: 'EXPIRED', cls: 'bg-red-950/20 text-red-400 border-red-900/50' };
            default:
                return { label: 'UNKNOWN', cls: 'bg-gray-950/20 text-gray-400 border-gray-900/50' };
        }
    };

    const handleEditClick = (h: Hospital) => {
        setEditHospital(h);
        setEditName(h.name);
        setEditMobileNumber(h.adminMobileNumber || '');
        setEditEmail(h.adminEmail || '');
        setEditActive(h.active);
    };

    const handleUpdateHospital = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editHospital) return;
        setEditLoading(true);

        try {
            await api.updateHospital(editHospital.id, {
                hospitalName: editName,
                adminMobileNumber: editMobileNumber,
                adminEmail: editEmail,
                active: editActive
            });

            showToast('success', `Hospital "${editName}" updated successfully!`);
            setEditHospital(null);
            fetchHospitals(currentPage);
        } catch (err: any) {
            showToast('error', err.message || 'Failed to update hospital');
        } finally {
            setEditLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-[#121212] to-[#0D0D0D] flex flex-col justify-between text-[#E0E0E0] select-none">
            {/* Cinematic Overhead Glow */}
            <div className="absolute top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-950/10 rounded-full blur-[120px] pointer-events-none" />
            
            {/* Stacked Toasts Container (Bottom Right) */}
            <div className="fixed bottom-12 right-6 z-50 flex flex-col-reverse space-y-4 space-y-reverse max-w-sm w-full pointer-events-none">
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
                            ROBOTRIX<span className="text-[#6D282C]">+</span> <span className="text-xs font-semibold text-gray-500 ml-2 tracking-widest">SUPER ADMIN</span>
                        </h1>
                        <p className="text-[0.625rem] text-[#888888] tracking-widest uppercase mt-1">
                            Platform Tenant Administration
                        </p>
                    </div>
                    <div className="flex items-center">
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
                </div>
            </header>

            {/* Main Content Dashboard */}
            <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
                <section className="bg-[#161616]/95 border border-[#2b2b2b] p-6 md:p-8 rounded-sm shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-cyan-950" />
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <h3 className="text-md font-black tracking-wider uppercase text-[#E0E0E0]">
                            Registered Hospital Tenants
                        </h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="py-2 px-5 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs tracking-wider rounded-sm transition-all duration-300 cursor-pointer active:scale-95 shadow-[0_4px_15px_rgba(109,40,44,0.3)]"
                        >
                            CREATE HOSPITAL
                        </button>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                            placeholder="Search by hospital name or ID..."
                        />
                    </div>

                    {hospitals.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 border border-dashed border-[#2b2b2b] rounded-sm">
                            No registered hospital tenants found.
                        </div>
                    ) : (
                        <>
                            <div className="w-full overflow-x-auto rounded-sm border border-[#2b2b2b]">
                                <table className="w-full text-left border-collapse min-w-[43.75rem]">
                                    <thead>
                                        <tr className="bg-[#1b1b1b] border-b border-[#2b2b2b] text-[0.625rem] font-bold tracking-widest text-[#888888] uppercase">
                                            <th className="px-4 py-3">Hospital ID</th>
                                            <th className="px-4 py-3">Hospital Name</th>
                                            <th className="px-4 py-3">Admin Mobile</th>
                                            <th className="px-4 py-3">Admin Email</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3 text-center">Subscription</th>
                                            <th className="px-4 py-3">Expires</th>
                                            <th className="px-4 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#232323] text-sm text-[#CCCCCC]">
                                        {hospitals.map((h) => (
                                            <tr key={h.id} className="hover:bg-[#1c1c1c]/50 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-[0.75rem] text-cyan-400 select-all">
                                                    {h.hid || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-white">
                                                    {h.name}
                                                </td>
                                                <td className="px-4 py-3 text-gray-300">
                                                    {h.adminMobileNumber || <span className="text-gray-600 font-light italic">None</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-300 select-all font-mono text-xs">
                                                    {h.adminEmail || <span className="text-gray-600 font-light italic">None</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`inline-flex items-center justify-center px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-sm border select-none min-w-[6.875rem] ${
                                                            h.active
                                                                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50'
                                                                : 'bg-red-950/20 text-red-400 border-red-900/50'
                                                        }`}
                                                    >
                                                        {h.active ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {(() => {
                                                        const badge = getSubscriptionBadge(h.subscriptionStatus);
                                                        return (
                                                            <span className={`inline-flex items-center justify-center px-3 py-1.5 text-[0.625rem] font-bold tracking-widest uppercase rounded-sm border select-none min-w-[6.875rem] ${badge.cls}`}>
                                                                {badge.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                                                    {formatDate(h.subscriptionExpiresAt)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(h)}
                                                            className="py-1 px-3 bg-[#1a1a1a] hover:bg-[#2b2b2b] border border-[#333] hover:border-[#6D282C] text-gray-400 hover:text-white font-bold text-xs tracking-wider rounded-sm transition-all duration-300 cursor-pointer active:scale-95"
                                                        >
                                                            EDIT
                                                        </button>
                                                        {(h.subscriptionStatus === 'EXPIRED' || h.subscriptionStatus === 'EXPIRING_SOON') && (
                                                            <button
                                                                onClick={() => handleRenewSubscription(h.id, h.name)}
                                                                disabled={actionLoading === h.id}
                                                                className="py-1 px-3 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/50 hover:border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold text-xs tracking-wider rounded-sm transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {actionLoading === h.id ? '...' : 'RENEW'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-[#232323] text-xs text-gray-400">
                                <div>
                                    Showing {hospitals.length > 0 ? (currentPage * pageSize + 1) : 0} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} hospitals
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => currentPage > 0 && fetchHospitals(currentPage - 1)}
                                        disabled={currentPage === 0}
                                        className="py-1.5 px-3 bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm hover:border-[#6D282C] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
                                    >
                                        PREV
                                    </button>
                                    <span className="px-2 text-[#E0E0E0] font-bold">
                                        Page {currentPage + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => currentPage < totalPages - 1 && fetchHospitals(currentPage + 1)}
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

            {/* Modal Dialog for Tenant Registration */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm transition-opacity" 
                        onClick={() => setIsModalOpen(false)}
                    />
                    
                    {/* Modal Card */}
                    <div className="relative z-10 max-w-xl w-full bg-[#161616] border border-[#2b2b2b] p-6 md:p-8 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D282C]" />
                        
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-md font-black tracking-wider uppercase text-[#E0E0E0]">
                                Register New Hospital Tenant
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-white text-sm font-bold transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateHospital} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Hospital Name */}
                                <div className="md:col-span-2 space-y-1">
                                    <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                        Hospital Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={hospitalName}
                                        onChange={(e) => setHospitalName(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="e.g. Apollo Hospital"
                                    />
                                </div>

                                {/* Admin Username */}
                                <div className="space-y-1">
                                    <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                        Admin Username
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={adminUsername}
                                        onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="Admin username"
                                    />
                                    {statusMessage && (
                                        <p className={`text-[0.6875rem] mt-1 font-semibold ${
                                            usernameStatus === 'available' ? 'text-green-500' :
                                            usernameStatus === 'checking' ? 'text-yellow-500' : 'text-red-500'
                                        }`}>
                                            {statusMessage}
                                        </p>
                                    )}
                                </div>

                                {/* Admin Password */}
                                <div className="space-y-1">
                                    <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                        Admin Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="Admin secure password"
                                    />
                                </div>

                                {/* Admin Email */}
                                <div className="space-y-1">
                                    <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                        Admin Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="e.g. admin@hospital.com"
                                    />
                                </div>

                                {/* Admin Mobile Number */}
                                <div className="space-y-1">
                                    <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                        Admin Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        value={adminMobileNumber}
                                        onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 10) setAdminMobileNumber(v); }}
                                        className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                        placeholder="e.g. 9999999999"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || usernameStatus !== 'available'}
                                className="w-full py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs tracking-widest rounded-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] cursor-pointer mt-2"
                            >
                                {loading ? 'CREATING...' : 'REGISTER TENANT'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Dialog for Tenant Editing */}
            {editHospital && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm transition-opacity" 
                        onClick={() => setEditHospital(null)}
                    />
                    
                    {/* Modal Card */}
                    <div className="relative z-10 max-w-md w-full bg-[#161616] border border-[#2b2b2b] p-6 md:p-8 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-cyan-950" />
                        
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-md font-black tracking-wider uppercase text-[#E0E0E0]">
                                Edit Hospital Details
                            </h3>
                            <button 
                                onClick={() => setEditHospital(null)}
                                className="text-gray-500 hover:text-white text-sm font-bold transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUpdateHospital} className="space-y-4">
                            {/* Hospital Name */}
                            <div className="space-y-1">
                                <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                    Hospital Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="Apollo Hospital"
                                />
                            </div>

                            {/* Admin Mobile Number */}
                            <div className="space-y-1">
                                <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                    Admin Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    required
                                    maxLength={10}
                                    value={editMobileNumber}
                                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 10) setEditMobileNumber(v); }}
                                    className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="e.g. 9999999999"
                                />
                            </div>

                            {/* Admin Email */}
                            <div className="space-y-1">
                                <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                    Admin Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="e.g. admin@hospital.com"
                                />
                            </div>

                            {/* Status Option */}
                            <div className="space-y-2">
                                <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                    Hospital Status
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
                                className="w-full py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs tracking-widest rounded-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] cursor-pointer mt-2"
                            >
                                {editLoading ? 'UPDATING...' : 'SAVE CHANGES'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="relative z-10 w-full py-4 border-t border-[#2b2b2b] bg-[#161616]/20 mt-8">
                <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between text-[0.625rem] text-gray-500 font-medium uppercase tracking-widest">
                    <span>© {new Date().getFullYear()} PLUS Orthopedics. All Rights Reserved.</span>
                    <span className="mt-2 md:mt-0">Powered by Robotrix+ Execution Platform</span>
                </div>
            </footer>
        </div>
    );
};

export default SuperAdminDashboard;
