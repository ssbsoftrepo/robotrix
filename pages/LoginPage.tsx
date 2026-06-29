import React, { useState } from 'react';
import { api } from '../services/api';

interface LoginPageProps {
    onLoginSuccess: (token: string, role: string, username: string, tenantId: string | null) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'warning'; message: string }>>([]);

    const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

                showToast('success', 'Logged in successfully!');
                setTimeout(() => {
                    onLoginSuccess(response.token, role, response.username, response.hospitalName);
                }, 800);
            } else {
                showToast('error', 'Authentication failed. Invalid response from server.');
            }
        } catch (err: any) {
            const msg = err.message || 'Login failed. Please check your credentials.';
            showToast('error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-[#1E1E1E] to-[#121212] flex flex-col justify-between items-center p-4 md:p-8 select-none">
            {/* Stacked Toasts Container (Bottom Right) */}
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
