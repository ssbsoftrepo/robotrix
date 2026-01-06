
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
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#000000] border-2 border-red-500 p-8 rounded-lg max-w-2xl text-center shadow-2xl w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-3xl font-bold text-red-100 mb-8">Select minimum composite thickness of TKR system</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[18, 19, 20, 21].map((thickness) => (
                        <div
                            key={thickness}
                            onClick={() => handleSelect(thickness)}
                            className="p-6 border-2 border-red-800 bg-red-900/30 hover:bg-red-700/50 hover:border-indigo-400 rounded-lg cursor-pointer transition flex flex-col items-center justify-center aspect-square"
                        >
                            <span className="text-4xl font-bold text-red-100">{thickness}</span>
                            <span className="text-lg text-red-400">mm</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ImplantThicknessModal;
