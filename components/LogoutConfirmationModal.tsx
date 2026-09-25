import React from 'react';

interface LogoutConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    pendingSyncCount?: number;
    isOffline?: boolean;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    pendingSyncCount = 0,
    isOffline = false,
}) => {
    if (!isOpen) return null;

    const hasPendingChanges = pendingSyncCount > 0;
    const actualIsOffline = isOffline || !navigator.onLine;
    const showWarning = hasPendingChanges && actualIsOffline;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div
                className="relative bg-gradient-to-b from-[#222222] to-[#161616] p-6 rounded-2xl border border-[#383838] max-w-md text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background noise effect */}
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-2xl" />

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-20 cursor-pointer p-1 rounded-md hover:bg-white/5"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Logout Icon */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(109,40,44,0.35)] relative z-10 ${showWarning
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                        : 'bg-[#6D282C]/25 border border-[#893338]/50 text-[#ff8fa3]'
                    }`}>
                    {showWarning ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                        </svg>
                    )}
                </div>

                {/* Modal Title & Description */}
                <h3 className="text-xl font-bold text-[#E0E0E0] mb-2 tracking-tight relative z-10">
                    {showWarning ? 'Unsynced Changes' : 'Confirm Logout'}
                </h3>

                {showWarning ? (
                    <div className="relative z-10 mb-6">
                        <p className="text-sm text-amber-300/90 leading-relaxed mb-3">
                            You have <span className="font-bold text-amber-200">{pendingSyncCount}</span> unsynced change{pendingSyncCount !== 1 ? 's' : ''}.
                        </p>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-left">
                            <p className="text-xs text-amber-200/80 leading-relaxed">
                                Your changes are saved locally on this device. They will automatically sync to the server when you log back in with internet connectivity.
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed relative z-10">
                        Are you sure you want to log out of <span className="text-gray-200 font-semibold">ROBOTRIX+</span>?
                        {hasPendingChanges && (
                            <span className="block mt-2 text-blue-300/80 text-xs">
                                {pendingSyncCount} pending change{pendingSyncCount !== 1 ? 's' : ''} will sync before logout.
                            </span>
                        )}
                    </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-center gap-3 relative z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-lg bg-[#252525] border border-[#383838] hover:bg-[#303030] text-gray-300 hover:text-white font-semibold text-sm transition-all duration-200 cursor-pointer active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 px-4 rounded-lg border font-bold text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] text-white ${showWarning
                                ? 'bg-amber-600/80 border-amber-500/50 hover:bg-amber-600 shadow-[0_4px_16px_rgba(180,83,9,0.3)] hover:shadow-[0_0_24px_rgba(180,83,9,0.5)]'
                                : 'bg-[#6D282C] border-[#893338] hover:bg-[#893338] shadow-[0_4px_16px_rgba(109,40,44,0.4)] hover:shadow-[0_0_24px_rgba(109,40,44,0.6)]'
                            }`}
                    >
                        {showWarning ? 'Log Out Anyway' : 'Log Out'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmationModal;
