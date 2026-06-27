
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Page } from '../types';

interface ImplantThicknessModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetPage: Page | null;
}

const ImplantThicknessModal: React.FC<ImplantThicknessModalProps> = ({ isOpen, onClose, targetPage }) => {
    const { setImplantThickness, setPage } = useAppContext();

    const handleSelect = (thickness: number) => {
        setImplantThickness(thickness);
        if (targetPage) {
            setPage(targetPage);
        }
        onClose();
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
                <h3 className="text-xl font-bold text-[#E0E0E0] mb-4 relative z-10">Select minimum composite thickness of TKR system</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                    {[18, 19, 20].map((thickness) => (
                        <button
                            key={thickness}
                            onClick={() => handleSelect(thickness)}
                            className="h-20 rounded-lg border flex flex-col items-center justify-center transition-all border-[#333333] bg-[#1a1a1a] hover:bg-[#252525] hover:border-[#6D282C]/50"
                        >
                            <span className="text-3xl font-bold text-gray-200">{thickness}</span>
                            <span className="text-sm text-[#6D282C]">mm</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ImplantThicknessModal;
