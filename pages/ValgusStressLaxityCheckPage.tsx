
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { GoogleGenAI } from "@google/genai";


interface LaxityOptionProps {
    level: string;
    onClick: () => void;
    imageSrc?: string | null;
    isSelected: boolean;
    isSuggested: boolean;
    color: string;
}

const LaxityOption: React.FC<LaxityOptionProps> = ({ level, onClick, imageSrc, isSelected, isSuggested, color }) => {
    let bgClass = 'bg-[#1e1f20]';

    if (isSelected) {
        bgClass = 'bg-[#252629]';
    }

    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col p-3 rounded-xl border-4 cursor-pointer transition-all duration-200 h-full hover:scale-[1.02] ${bgClass}`}
            style={{
                borderColor: color,
                boxShadow: isSelected ? `0 0 20px ${color}60` : 'none'
            }}
        >
            {isSuggested && !isSelected && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold z-20 shadow-md whitespace-nowrap">
                    AI Suggestion
                </div>
            )}

            <div className="text-center mb-3 min-h-[3rem] flex items-center justify-center">
                <p className="font-bold text-lg leading-tight text-gray-100">{level}</p>
            </div>

            <div
                className="flex-grow w-full bg-black rounded-lg relative overflow-hidden border border-gray-800 group"
            >
                {imageSrc ? (
                    <img src={imageSrc} alt={`Reference for ${level}`} className="absolute inset-0 w-full h-full object-contain" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-600 italic text-sm px-4 text-center">No Reference Image</p>
                    </div>
                )}
            </div>

            <div
                className="mt-3 h-3 rounded-full w-full transition-colors duration-300"
                style={{ backgroundColor: isSelected ? color : '#374151' }}
            ></div>
        </div>
    );
};


const ValgusStressLaxityCheckPage: React.FC = () => {
    const {
        setPage,
        setLateralLaxity,
        valgusImageSrc,
        setValgusImageSrc
    } = useAppContext();
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [userSelection, setUserSelection] = useState<string | null>(null);

    const patientFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (valgusImageSrc) {
            setPreviewImage(valgusImageSrc);
        }
    }, [valgusImageSrc]);

    const analyzeLaxity = async (imageDataUrl: string) => {
        if (!imageDataUrl) return;
        setIsLoading(true);
        setAiSuggestion(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
            const base64Data = imageDataUrl.split(',')[1];

            const imagePart = {
                inlineData: { mimeType: 'image/jpeg', data: base64Data },
            };

            const textPart = {
                text: "Analyze this knee X-ray, likely a varus stress or one-leg standing view, for lateral laxity. Classify the degree of lateral joint space opening into one of these four categories: 'No Lateral Laxity' (joint space is closed), 'Mild lateral laxity' (slight opening of a few millimeters), 'Moderate lateral laxity' (clear opening), or 'Severe lateral laxity' (significant gapping or subluxation). Your response must consist of ONLY one of these four exact category names and nothing else.",
            };

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [imagePart, textPart] },
            });

            const suggestionText = response.text ? response.text.trim() : '';
            const validSuggestions = ['No Lateral Laxity', 'Mild lateral laxity', 'Moderate lateral laxity', 'Severe lateral laxity'];

            let foundSuggestion: string | null = null;
            for (const valid of validSuggestions) {
                if (suggestionText.includes(valid)) {
                    foundSuggestion = valid;
                    break;
                }
            }

            if (foundSuggestion) {
                setAiSuggestion(foundSuggestion);
            }

        } catch (error) {
            console.error("Error analyzing image with Gemini:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePatientFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setPreviewImage(result);
                setValgusImageSrc(result); // Persist to Valgus Planner context
                analyzeLaxity(result);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleConfirmSelection = () => {
        if (!userSelection) return;
        setLateralLaxity(userSelection);
        setPage('planner-valgus-stress');
    };

    const handleSkip = () => {
        setPage('planner-valgus-stress');
    };

    const goBack = () => {
        setLateralLaxity(null);
        setPage('case-management');
    };

    const laxityLevels = [
        'No Lateral Laxity',
        'Mild lateral laxity',
        'Moderate lateral laxity',
        'Severe lateral laxity',
    ];

    const laxityImages: Record<string, string> = {
        'No Lateral Laxity': '/nolaterl.jpeg',
        'Mild lateral laxity': '/mildlaterl.jpeg',
        'Moderate lateral laxity': '/moderate.jpeg',
        'Severe lateral laxity': '/severe.jpeg',
    };

    const laxityColors = ['#EF4444', '#EF4444', '#EF4444', '#EF4444']; // Green, Blue, Orange, Red

    return (
        <div className="flex flex-col h-full p-2 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-gray-100">Check for lateral laxity ( Valgus stress film)</h2>
                <div className="flex space-x-4">
                    <button onClick={handleSkip} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-lg text-md flex items-center transition shadow">
                        <span>Skip to Planner</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button onClick={goBack} className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-5 rounded-lg transition">
                        Cancel
                    </button>
                </div>
            </div>

            {/* Main Layout: Reference Group vs Patient X-ray */}
            <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-[65vh]">

                {/* Left Side: Reference Images Group */}
                <div className="flex-grow-[3] flex flex-col min-w-0">
                    <div className="bg-gray-800/50 p-2 rounded-t-lg border-b border-gray-700 mb-4">
                        <h3 className="text-xl font-bold text-gray-300 text-center">Laxity Level Reference Images</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-grow">
                        {laxityLevels.map((level, index) => {
                            const currentImage = laxityImages[level];

                            return (
                                <React.Fragment key={level}>
                                    <LaxityOption
                                        level={level}
                                        onClick={() => setUserSelection(level)}
                                        imageSrc={currentImage}
                                        isSelected={userSelection === level}
                                        isSuggested={aiSuggestion === level}
                                        color={laxityColors[index]}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Patient Upload */}
                <div className="flex-grow-[2] flex flex-col min-w-[300px]">
                    <div className="bg-gray-800/50 p-2 rounded-t-lg border-b border-gray-700 mb-4">
                        <h3 className="text-xl font-bold text-yellow-400 text-center">Patient X-ray</h3>
                    </div>
                    <div className="relative flex flex-col p-3 rounded-xl border-4 border-gray-600 bg-[#1e1f20] h-full hover:border-gray-500 transition-all flex-grow">
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
                                <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-lg text-cyan-300 font-semibold">AI Analyzing...</p>
                            </div>
                        )}

                        <div className="flex-grow w-full bg-black rounded-lg relative overflow-hidden border border-gray-700 group cursor-pointer" onClick={() => patientFileInputRef.current?.click()}>
                            {previewImage ? (
                                <img src={previewImage} alt="Patient X-ray" className="absolute inset-0 w-full h-full object-contain" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <p className="text-lg font-medium">Click to Upload X-ray</p>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-gray-800 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
                                    {previewImage ? 'Change Image' : 'Upload Image'}
                                </span>
                            </div>
                        </div>
                        <input type="file" ref={patientFileInputRef} onChange={handlePatientFileChange} accept="image/*" className="hidden" />
                        <div className="mt-3 h-3 rounded-full w-full bg-gray-700"></div>
                    </div>
                </div>
            </div>

            {/* Footer: Controls & Disclaimer */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start bg-[#1e1f20] p-4 rounded-lg border border-gray-700">
                <div className="lg:col-span-2 text-sm text-gray-400">
                    <p className="font-bold text-gray-300 mb-1">Important Note:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Lateral laxity is best made out in a varus stress film or a one-leg standing film.</li>
                        <li>Lateral laxity must not be compensated for by altering bony cuts. Suitable releases must be performed on the medial side to match the stretched lateral side.</li>
                    </ul>
                </div>
                <div className="lg:col-span-1 flex flex-col items-end justify-center h-full">
                    <p className="text-gray-300 text-sm mb-2 self-center lg:self-end">
                        Selected: <span className="font-bold text-white">{userSelection || 'None'}</span>
                    </p>
                    <button
                        onClick={handleConfirmSelection}
                        disabled={!userSelection}
                        className="w-full lg:w-auto bg-[#6D282C] hover:bg-[#893338] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-xl py-3 px-8 rounded-lg shadow-lg transition-all transform active:scale-95"
                    >
                        Confirm Selection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ValgusStressLaxityCheckPage;