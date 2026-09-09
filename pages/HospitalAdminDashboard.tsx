import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { Capacitor } from '@capacitor/core';

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

    const [resetPasswordDoctor, setResetPasswordDoctor] = useState<Doctor | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

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

    useEffect(() => {
        fetchDoctors(0);
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchDoctors(0, searchQuery);
        }, 400);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetPasswordDoctor) return;
        if (!newPassword || newPassword.trim().length < 4) {
            showToast('error', 'Password must be at least 4 characters');
            return;
        }

        setResetLoading(true);
        try {
            await api.resetDoctorPassword(resetPasswordDoctor.id, newPassword.trim());
            showToast('success', `Password for "${resetPasswordDoctor.username}" reset successfully!`);
            setResetPasswordDoctor(null);
            setNewPassword('');
        } catch (err: any) {
            showToast('error', err.message || 'Failed to reset password');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-[#121212] to-[#0D0D0D] flex flex-col justify-between text-[#E0E0E0] select-none">
            <div className="absolute top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-950/10 rounded-full blur-[120px] pointer-events-none" />

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
                        <span className="text-base mt-0.5">{t.type === 'success' ? '✓' : '⚠️'}</span>
                        <div className="flex-1 text-left">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${t.type === 'success' ? 'text-emerald-400' : t.type === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                                {t.type === 'success' ? 'Success' : t.type === 'error' ? 'Error' : 'Warning'}
                            </h4>
                            <p className="text-xs text-[#E0E0E0] mt-1 font-medium">{t.message}</p>
                        </div>
                        <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-gray-500 hover:text-white text-xs font-bold transition-colors cursor-pointer">✕</button>
                    </div>
                ))}
            </div>

            <header className="relative z-50 w-full border-b border-[#333333] bg-gradient-to-r from-[#1a1a1a] to-[#252525] shadow-md" style={{ paddingTop: Capacitor.isNativePlatform() ? 'max(1.8rem, env(safe-area-inset-top, 1.8rem))' : 'max(0.2rem, env(safe-area-inset-top, 0.2rem))' }}>
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight uppercase leading-none">
                            ROBOTRIX<span className="text-[#6D282C]">+</span> <span className="text-xs font-semibold text-gray-500 ml-2 tracking-widest">HOSPITAL ADMIN</span>
                        </h1>
                        <p className="text-[0.625rem] text-[#888888] tracking-widest uppercase mt-1">{hospitalName || 'Tenant'} Administration</p>
                    </div>
                    <div className="flex items-center gap-3 bg-[#1e1e1e]/60 border border-[#333] px-3.5 py-1.5 rounded-full relative z-50">
                        <span className="text-xs font-semibold text-[#E0E0E0] select-none tracking-wide">{username}</span>
                        <button onClick={onLogout} className="text-[#888888] hover:text-[#6D282C] transition-all cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
                    <div className="relative w-full max-w-md">
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by ID, name, username or mobile..." className="w-full bg-[#161616] border border-[#2b2b2b] text-[#E0E0E0] placeholder-gray-500 pl-10 pr-4 py-3 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors" />
                        <span className="absolute left-3.5 top-3.5 text-gray-500 text-sm">🔍</span>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto py-3 px-6 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] text-white font-bold text-xs tracking-widest rounded-sm transition-all cursor-pointer">CREATE CONSULTANT</button>
                </div>

                <section className="bg-[#161616]/90 border border-[#2b2b2b] p-6 rounded-sm shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D282C]" />
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-black tracking-wider uppercase text-gray-400">Registered Hospital Consultants</h2>
                        <span className="text-[0.625rem] bg-[#232323] px-2.5 py-1 text-gray-500 font-bold uppercase rounded-full">Total: {totalElements}</span>
                    </div>

                    {loadingDoctors ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4"><div className="w-8 h-8 border-2 border-[#6D282C] border-t-transparent rounded-full animate-spin" /><span className="text-xs font-bold tracking-widest uppercase text-gray-500">LOADING...</span></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#232323] text-[0.625rem] font-bold tracking-wider text-gray-500 uppercase">
                                        <th className="px-6 py-4">Consultant ID</th>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Mobile</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#232323] text-sm text-[#CCCCCC]">
                                    {doctors.map((d) => (
                                        <tr key={d.id} className="hover:bg-[#1c1c1c]/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-emerald-400">{d.consultantId || 'N/A'}</td>
                                            <td className="px-6 py-4">{d.firstName} {d.lastName}</td>
                                            <td className="px-6 py-4">{d.mobileNumber || '—'}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{d.email || '—'}</td>
                                            <td className="px-6 py-4 text-center"><span className={`inline-flex px-4 py-2 text-xs font-bold uppercase rounded-sm border ${d.active ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50' : 'bg-red-950/20 text-red-400 border-red-900/50'}`}>{d.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                                            <td className="px-6 py-4 text-center space-x-2">
                                                <button onClick={() => handleEditClick(d)} className="py-1.5 px-4 bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white rounded-sm text-xs transition-all cursor-pointer font-bold">EDIT</button>
                                                <button onClick={() => setResetPasswordDoctor(d)} className="py-1.5 px-3 bg-[#1a1a1a] hover:bg-[#6D282C]/20 border border-[#333] hover:border-[#6D282C] text-[#c0565b] hover:text-white rounded-sm text-xs font-bold transition-all cursor-pointer" title="Reset Password">
                                                    RESET PASS
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative z-10 max-w-xl w-full bg-[#161616] border border-[#2b2b2b] p-8 rounded-sm">
                        <h3 className="text-md font-black uppercase mb-6">Register New Consultant</h3>
                        <form onSubmit={handleCreateConsultant} className="space-y-4">
                            <input type="text" required value={consultantUsername} onChange={(e) => setConsultantUsername(e.target.value.toLowerCase())} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" placeholder="Username (required)" />
                            <input type="password" required value={consultantPassword} onChange={(e) => setConsultantPassword(e.target.value)} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" placeholder="Password (required)" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" placeholder="First Name (required)" />
                                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" placeholder="Last Name (required)" />
                            </div>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" placeholder="Email Address (optional)" />
                            <input type="text" value={mobileNumber} maxLength={10} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" placeholder="Mobile Number (optional)" />
                            <button type="submit" disabled={loading || usernameStatus !== 'available'} className="w-full py-3 bg-[#6D282C] text-white font-bold rounded-sm cursor-pointer">{loading ? '...' : 'REGISTER'}</button>
                        </form>
                    </div>
                </div>
            )}

            {editDoctor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm" onClick={() => setEditDoctor(null)} />
                    <div className="relative z-10 max-w-md w-full bg-[#161616] border p-8 rounded-sm">
                        <h3 className="text-md font-black uppercase mb-6">Edit Details</h3>
                        <form onSubmit={handleUpdateConsultant} className="space-y-4">
                            <input type="text" required value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" />
                            <input type="text" required value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" />
                            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" placeholder="Email (optional)" />
                            <input type="text" value={editMobileNumber} maxLength={10} onChange={(e) => setEditMobileNumber(e.target.value.replace(/\D/g, ''))} className="w-full bg-[#1e1e1e] border p-2.5 rounded-sm" placeholder="Mobile (optional)" />
                            <div className="flex items-center space-x-4">
                                <label><input type="radio" checked={editActive} onChange={() => setEditActive(true)} /> Active</label>
                                <label><input type="radio" checked={!editActive} onChange={() => setEditActive(false)} /> Inactive</label>
                            </div>
                            <button type="submit" className="w-full py-3 bg-[#6D282C] text-white font-bold rounded-sm cursor-pointer">SAVE CHANGES</button>
                        </form>
                    </div>
                </div>
            )}

            {resetPasswordDoctor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm" onClick={() => setResetPasswordDoctor(null)} />
                    <div className="relative z-10 max-w-md w-full bg-[#161616] border border-[#2b2b2b] p-6 sm:p-8 rounded-sm shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#6D282C]" />

                        <div className="flex items-center justify-between pb-4 border-b border-[#2b2b2b] mb-6">
                            <div>
                                <h3 className="text-sm font-black tracking-widest text-[#E0E0E0] uppercase">
                                    Reset Consultant Password
                                </h3>
                                <p className="text-xs text-[#c0565b] font-semibold mt-0.5">
                                    Dr. {resetPasswordDoctor.firstName} {resetPasswordDoctor.lastName} <span className="text-gray-500 font-mono">({resetPasswordDoctor.consultantId || resetPasswordDoctor.username})</span>
                                </p>
                            </div>
                            <button onClick={() => setResetPasswordDoctor(null)} className="text-gray-500 hover:text-white text-xl font-bold transition-colors cursor-pointer p-1">✕</button>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div className="space-y-1">
                                <label className="block text-[0.625rem] font-bold tracking-wider text-[#888888] uppercase">
                                    New Password
                                </label>
                                <input type="password" required minLength={4} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors" placeholder="Enter new password (min 4 chars)" />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setResetPasswordDoctor(null)} className="py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#2b2b2b] border border-[#333] text-gray-300 font-bold text-xs tracking-wider rounded-sm transition-all duration-300 cursor-pointer">CANCEL</button>
                                <button type="submit" disabled={resetLoading} className="py-2.5 px-6 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] text-white font-bold text-xs tracking-widest rounded-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] cursor-pointer">{resetLoading ? 'RESETTING...' : 'RESET PASSWORD'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <footer className="relative z-10 w-full py-4 border-t border-[#2b2b2b] bg-[#161616]/20 mt-8">
                <div className="max-w-7xl mx-auto px-4 text-[0.625rem] text-gray-500 uppercase tracking-widest text-center">© {new Date().getFullYear()} PLUS Orthopedics.</div>
            </footer>
        </div>
    );
};

export default HospitalAdminDashboard;
