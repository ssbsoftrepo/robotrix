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
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="gemini-dark-card p-8 rounded-lg max-w-2xl text-center shadow-xl w-full relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold text-gray-200 mb-6">Select LDFA Calculation Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div 
                        onClick={() => handleSelect('native')} 
                        className="p-6 border-2 border-gray-600 hover:border-[#6D282C] hover:bg-[#6D282C]/20 rounded-lg cursor-pointer transition"
                    >
                        <h4 className="text-xl font-semibold text-gray-100 mb-2">Use Native (Uncorrected) LDFA</h4>
                        <p className="text-gray-400">You take the actual mechanical axis from the real hip center including coxa vara/valga.</p>
                    </div>
                    <div 
                        onClick={() => handleSelect('corrected')}
                        className="p-6 border-2 border-gray-600 hover:border-[#6D282C] hover:bg-[#6D282C]/20 rounded-lg cursor-pointer transition"
                    >
                        <h4 className="text-xl font-semibold text-gray-100 mb-2">Discount Hip Deformity (Corrected LDFA)</h4>
                        <p className="text-gray-400">You normalize the femoral head center to eliminate coxa vara/valga effect.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LdfaModeModal;