import React, { useState } from 'react';
import { api } from '../services/api';

interface LoginPageProps {
    onLoginSuccess: (token: string, role: string, username: string, tenantId: string | null) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'warning'; message: string }>>([]);

    const [flowState, setFlowState] = useState<'login' | 'request' | 'verify' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            showToast('error', 'Email is required');
            return;
        }
        setActionLoading(true);
        try {
            await api.forgotPasswordRequest(email.trim());
            showToast('success', 'OTP sent to your email successfully');
            setFlowState('verify');
        } catch (err: any) {
            showToast('error', err.message || 'Failed to request OTP');
        } finally {
            setActionLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim()) {
            showToast('error', 'OTP is required');
            return;
        }
        setActionLoading(true);
        try {
            await api.forgotPasswordVerify(email.trim(), otp.trim());
            showToast('success', 'OTP verified successfully');
            setFlowState('reset');
        } catch (err: any) {
            showToast('error', err.message || 'Invalid or expired OTP');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword) {
            showToast('error', 'New password is required');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('error', 'Passwords do not match');
            return;
        }
        setActionLoading(true);
        try {
            await api.forgotPasswordReset({
                email: email.trim(),
                otp: otp.trim(),
                newPassword,
                confirmPassword
            });
            showToast('success', 'Password reset successfully. Please log in.');
            setFlowState('login');
            setEmail('');
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            showToast('error', err.message || 'Failed to reset password');
        } finally {
            setActionLoading(false);
        }
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

                setLoginSuccess(true);
                showToast('success', 'Logged in successfully!');
                setTimeout(() => {
                    onLoginSuccess(response.token, role, response.username, response.hospitalName);
                }, 800);
            } else {
                showToast('error', 'Authentication failed. Invalid response from server.');
                setLoading(false);
            }
        } catch (err: any) {
            const msg = err.message || 'Login failed. Please check your credentials.';
            showToast('error', `${msg} (Server: ${api.getApiBaseUrl()})`);
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-[#1E1E1E] to-[#121212] flex flex-col justify-between items-center p-4 md:p-8 select-none">
            {/* Stacked Toasts Container (Bottom Right) */}
            <div className="fixed bottom-12 right-6 z-50 flex flex-col-reverse space-y-4 space-y-reverse max-w-sm w-full pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-sm border shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 animate-slide-in ${t.type === 'success'
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
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${t.type === 'success' ? 'text-emerald-400' : t.type === 'error' ? 'text-red-400' : 'text-yellow-400'
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
                <div className="w-full bg-[#161616]/90 backdrop-blur-md border border-[#333333] rounded-lg p-6 md:p-8 shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    {/* Visual Accent Bar */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-[#6D282C]" />

                    {flowState === 'login' && (
                        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                            {/* Username */}
                            <div className="space-y-1 text-left">
                                <label className="block text-[0.625rem] md:text-xs font-bold tracking-wider text-[#888888] uppercase">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-[#333333] text-[#E0E0E0] px-4 py-2.5 md:py-3 rounded-lg text-sm focus:outline-none focus:border-[#6D282C] focus:ring-1 focus:ring-[#6D282C] transition-colors"
                                    placeholder="Enter username"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1 text-left">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[0.625rem] md:text-xs font-bold tracking-wider text-[#888888] uppercase">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setFlowState('request')}
                                        className="text-[0.625rem] md:text-xs font-bold text-gray-500 hover:text-white transition-colors focus:outline-none cursor-pointer"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#333333] text-[#E0E0E0] pl-4 pr-11 py-2.5 md:py-3 rounded-lg text-sm focus:outline-none focus:border-[#6D282C] focus:ring-1 focus:ring-[#6D282C] transition-colors"
                                        placeholder="Enter password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none cursor-pointer p-1 rounded-full hover:bg-white/5 transition-colors"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.895 7.895L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full py-2.5 md:py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs md:text-sm tracking-widest rounded-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] cursor-pointer mt-2"
                            >
                                {loginSuccess ? 'REDIRECTING...' : loading ? 'AUTHENTICATING...' : 'LOGIN'}
                            </button>

                        </form>
                    )}

                    {flowState === 'request' && (
                        <form onSubmit={handleRequestOtp} className="space-y-4 md:space-y-5">
                            <h2 className="text-sm font-bold text-[#E0E0E0] uppercase tracking-wider mb-2">Forgot Password</h2>
                            <p className="text-xs text-gray-400 font-light">We will send a 6-digit OTP to your registered email address.</p>

                            {/* Email */}
                            <div className="space-y-1 text-left">
                                <label className="block text-[0.625rem] md:text-xs font-bold tracking-wider text-[#888888] uppercase">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-[#333333] text-[#E0E0E0] px-4 py-2.5 md:py-3 rounded-lg text-sm focus:outline-none focus:border-[#6D282C] focus:ring-1 focus:ring-[#6D282C] transition-colors"
                                    placeholder="Enter your email"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="group relative w-full py-2.5 md:py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs md:text-sm tracking-widest rounded-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] cursor-pointer mt-2"
                            >
                                {actionLoading ? 'SENDING OTP...' : 'SEND OTP'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setFlowState('login')}
                                className="w-full text-center text-xs font-bold text-gray-500 hover:text-white transition-colors focus:outline-none cursor-pointer py-1"
                            >
                                Back to Login
                            </button>
                        </form>
                    )}

                    {flowState === 'verify' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4 md:space-y-5">
                            <h2 className="text-sm font-bold text-[#E0E0E0] uppercase tracking-wider mb-2">Verify OTP</h2>
                            <p className="text-xs text-gray-400 font-light">Please enter the 6-digit OTP code sent to <strong className="text-gray-300">{email}</strong>.</p>

                            {/* OTP */}
                            <div className="space-y-1 text-left">
                                <label className="block text-[0.625rem] md:text-xs font-bold tracking-wider text-[#888888] uppercase">
                                    OTP Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-[#333333] text-[#E0E0E0] px-4 py-2.5 md:py-3 rounded-lg text-sm tracking-[0.2em] font-mono focus:outline-none focus:border-[#6D282C] focus:ring-1 focus:ring-[#6D282C] transition-colors"
                                    placeholder="000000"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="group relative w-full py-2.5 md:py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs md:text-sm tracking-widest rounded-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] cursor-pointer mt-2"
                            >
                                {actionLoading ? 'VERIFYING...' : 'VERIFY OTP'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setFlowState('request')}
                                className="w-full text-center text-xs font-bold text-gray-500 hover:text-white transition-colors focus:outline-none cursor-pointer py-1"
                            >
                                Change Email / Re-send OTP
                            </button>
                        </form>
                    )}

                    {flowState === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4 md:space-y-5">
                            <h2 className="text-sm font-bold text-[#E0E0E0] uppercase tracking-wider mb-2">Reset Password</h2>
                            <p className="text-xs text-gray-400 font-light">Create a secure new password for your account.</p>

                            {/* New Password */}
                            <div className="space-y-1 text-left">
                                <label className="block text-[0.625rem] md:text-xs font-bold tracking-wider text-[#888888] uppercase">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#333333] text-[#E0E0E0] pl-4 pr-11 py-2.5 md:py-3 rounded-lg text-sm focus:outline-none focus:border-[#6D282C] focus:ring-1 focus:ring-[#6D282C] transition-colors"
                                        placeholder="New password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none cursor-pointer p-1 rounded-full hover:bg-white/5 transition-colors"
                                    >
                                        {showNewPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.895 7.895L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1 text-left">
                                <label className="block text-[0.625rem] md:text-xs font-bold tracking-wider text-[#888888] uppercase">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-[#333333] text-[#E0E0E0] pl-4 pr-11 py-2.5 md:py-3 rounded-lg text-sm focus:outline-none focus:border-[#6D282C] focus:ring-1 focus:ring-[#6D282C] transition-colors"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none cursor-pointer p-1 rounded-full hover:bg-white/5 transition-colors"
                                    >
                                        {showConfirmPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.895 7.895L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="group relative w-full py-2.5 md:py-3 bg-[#6D282C] hover:bg-[#893338] border border-[#893338] hover:border-[#a04046] text-white font-bold text-xs md:text-sm tracking-widest rounded-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-[0_4px_20px_rgba(109,40,44,0.4)] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] cursor-pointer mt-2"
                            >
                                {actionLoading ? 'RESETTING...' : 'RESET PASSWORD'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setFlowState('login')}
                                className="w-full text-center text-xs font-bold text-gray-500 hover:text-white transition-colors focus:outline-none cursor-pointer py-1"
                            >
                                Cancel
                            </button>
                        </form>
                    )}
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
