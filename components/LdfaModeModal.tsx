import React from 'react';

interface LdfaModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (mode: 'native' | 'corrected') => void;
}

const LdfaModeModal: React.FC<LdfaModeModalProps> = ({ isOpen, onClose, onSelect }) => {

    const handleSelect = (mode: 'native' | 'corrected') => {
        onSelect(mode);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-gradient-to-br from-[#1E1E1E] to-[#181818] p-4 rounded-lg border border-[#333333] max-w-2xl text-center shadow-2xl w-full">
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-xl font-bold text-[#E0E0E0] mb-4 relative z-10">Select LDFA Calculation Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <button
                        onClick={() => handleSelect('native')}
                        className="p-4 rounded-lg border text-center items-center transition-all h-full flex flex-col border-[#333333] bg-[#1a1a1a] hover:bg-[#252525] hover:border-[#6D282C]/50"
                    >
                        <span className="block font-bold text-xl mb-2 text-gray-200">Native (Uncorrected)</span>
                        <span className="block text-sm leading-relaxed whitespace-normal text-gray-400">You take the actual mechanical axis from the real hip center including coxa vara/valga.</span>
                    </button>
                    <button
                        onClick={() => handleSelect('corrected')}
                        className="p-4 rounded-lg border text-center items-center transition-all h-full flex flex-col border-[#333333] bg-[#1a1a1a] hover:bg-[#252525] hover:border-[#6D282C]/50"
                    >
                        <span className="block font-bold text-xl mb-2 text-gray-200">Corrected</span>
                        <span className="block text-sm leading-relaxed whitespace-normal text-gray-400">You normalize the femoral head center to eliminate coxa vara/valga effect.</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LdfaModeModal;