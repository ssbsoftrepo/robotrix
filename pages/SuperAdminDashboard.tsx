import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface SuperAdminDashboardProps {
    onLogout: () => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout }) => {
    const [hospitalName, setHospitalName] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

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
        setMessage(null);
        setError(null);

        try {
            const response = await api.createHospital({
                hospitalName,
                adminUsername,
                adminPassword
            });

            setMessage(`Hospital "${hospitalName}" and admin user "${adminUsername}" registered successfully!`);
            setHospitalName('');
            setAdminUsername('');
            setAdminPassword('');
        } catch (err: any) {
            setError(err.message || 'Failed to create hospital');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 bg-[#0d0d0d] text-[#E0E0E0] p-6 flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-4xl flex items-center justify-between border-b border-[#2b2b2b] pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">
                        SUPER ADMIN <span className="text-[#6D282C]">PANEL</span>
                    </h1>
                    <p className="text-xs text-[#888888] tracking-widest uppercase">
                        Platform Management
                    </p>
                </div>
                <button
                    onClick={onLogout}
                    className="py-2 px-5 bg-transparent border border-[#333] hover:border-[#6D282C] text-[#888] hover:text-white font-bold text-xs tracking-wider rounded-sm transition-all duration-300 cursor-pointer"
                >
                    LOGOUT
                </button>
            </div>

            {/* Content Card */}
            <div className="w-full max-w-2xl bg-[#161616] border border-[#2b2b2b] p-8 rounded-sm shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D282C]" />

                <h3 className="text-lg font-black tracking-wide mb-6 uppercase text-[#E0E0E0]">
                     Register New Hospital Tenant
                </h3>

                {message && (
                    <div className="mb-6 p-4 bg-green-950/35 border border-green-900 rounded-sm text-green-400 text-sm">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-950/35 border border-red-900 rounded-sm text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleCreateHospital} className="space-y-6">
                    {/* Hospital Name */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold tracking-wider text-[#888888] uppercase">
                            Hospital Name
                        </label>
                        <input
                            type="text"
                            required
                            value={hospitalName}
                            onChange={(e) => setHospitalName(e.target.value)}
                            className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-3 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                            placeholder="e.g. Apollo Hospital"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Admin Username */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold tracking-wider text-[#888888] uppercase">
                                Admin Username
                            </label>
                            <input
                                type="text"
                                required
                                value={adminUsername}
                                onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                                className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-3 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                placeholder="Admin login name"
                            />
                            {statusMessage && (
                                <p className={`text-xs mt-1 font-semibold ${
                                    usernameStatus === 'available' ? 'text-green-500' :
                                    usernameStatus === 'checking' ? 'text-yellow-500' : 'text-red-500'
                                }`}>
                                    {statusMessage}
                                </p>
                            )}
                        </div>

                        {/* Admin Password */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold tracking-wider text-[#888888] uppercase">
                                Admin Password
                            </label>
                            <input
                                type="password"
                                required
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-3 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                placeholder="Admin secure password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || usernameStatus !== 'available'}
                        className="w-full py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-sm tracking-widest rounded-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] cursor-pointer"
                    >
                        {loading ? 'CREATING TENANT...' : 'REGISTER HOSPITAL'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
