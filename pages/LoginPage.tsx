import React, { useState } from 'react';
import { api } from '../services/api';

interface LoginPageProps {
    onLoginSuccess: (token: string, role: string, username: string, tenantId: string | null) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; show: boolean } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await api.login({
                username,
                password
            });

            if (response && response.token) {
                // Decode payload to retrieve role
                const payloadBase64 = response.token.split('.')[1];
                const payloadJson = JSON.parse(atob(payloadBase64));
                const role = payloadJson.role || 'DOCTOR';

                onLoginSuccess(response.token, role, response.username, response.hospitalName);
            } else {
                setError('Authentication failed. Invalid response from server.');
            }
        } catch (err: any) {
            const msg = err.message || 'Login failed. Please check your credentials.';
            setError(msg);
            if (msg.toLowerCase().includes('inactive')) {
                setToast({ message: msg, show: true });
                setTimeout(() => {
                    setToast(prev => prev ? { ...prev, show: false } : null);
                }, 5000);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-[#1E1E1E] to-[#121212] flex flex-col justify-between items-center p-4 md:p-8 select-none">
            {/* Toast Notification */}
            {toast && toast.show && (
                <div className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-sm bg-[#161616] border-l-4 border-red-600 shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-4 rounded-sm transition-all duration-300 flex items-start space-x-3 z-50 border border-y-[#2c2c2c] border-r-[#2c2c2c]">
                    <span className="text-red-500 text-base mt-0.5">⚠️</span>
                    <div className="flex-1 text-left">
                        <h4 className="text-xs font-bold text-red-500 tracking-wider uppercase">Hospital Inactive</h4>
                        <p className="text-xs text-[#E0E0E0] mt-1 font-medium">{toast.message}</p>
                    </div>
                    <button 
                        onClick={() => setToast(null)}
                        className="text-gray-500 hover:text-white text-xs font-bold transition-colors focus:outline-none cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
            )}
            {/* Cinematic Overhead Surgical Lamp Effect */}
            <div className="absolute top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Spacer */}
            <div className="hidden md:block flex-1" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center space-y-6 md:space-y-8 max-w-md w-full px-2 md:px-4 py-8 my-auto">
                
                {/* Brand Header */}
                <div className="space-y-3 text-center">
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#E0E0E0] tracking-tighter leading-none drop-shadow-lg uppercase">
                        ROBOTRIX<span className="text-[#6D282C]">+</span>
                    </h1>
                    <div className="h-1 w-24 bg-[#2C2C2C] mx-auto rounded-full" />
                </div>

                {/* Subtext Description */}
                <div className="space-y-1 text-center">
                    <p className="text-lg md:text-xl text-gray-400 font-light tracking-wide">
                        Safe & Personalized TKR Functional Alignment
                    </p>
                    <p className="text-xs md:text-sm text-[#6D282C] font-semibold tracking-[0.2em] uppercase">
                        Execution Platform
                    </p>
                </div>

                {/* Login Card */}
                <div className="w-full bg-[#161616]/90 backdrop-blur-md border border-[#2c2c2c] rounded-sm p-6 md:p-8 shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    {/* Visual Accent Bar */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D282C]" />

                    {error && (
                        <div className="mb-4 p-3 bg-red-950/40 border border-red-900 rounded-sm text-red-400 text-xs md:text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                        {/* Username */}
                        <div className="space-y-1 text-left">
                            <label className="block text-[10px] md:text-xs font-bold tracking-wider text-[#888888] uppercase">
                                Username
                            </label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 md:py-3 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                placeholder="Enter username"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1 text-left">
                            <label className="block text-[10px] md:text-xs font-bold tracking-wider text-[#888888] uppercase">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[#E0E0E0] px-4 py-2.5 md:py-3 rounded-sm text-sm focus:outline-none focus:border-[#6D282C] transition-colors"
                                placeholder="Enter password"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full py-2.5 md:py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs md:text-sm tracking-widest rounded-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] cursor-pointer mt-2"
                        >
                            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                        </button>
                    </form>

                    {/* Corner Accents for Technical Feel */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 pointer-events-none" />
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer */}
            <div className="relative z-10 text-gray-500 text-xs md:text-sm font-medium tracking-wider uppercase text-center mt-4">
                Powered by PLUS Orthopedics
            </div>

            {/* Vignette for Focus */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(18,18,18,0.8)_100%)]" />
        </div>
    );
};

export default LoginPage;
