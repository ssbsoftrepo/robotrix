
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
    return (
        <div
            onClick={onClick}
            className={`group relative flex flex-col p-1.5 rounded-lg cursor-pointer transition-all duration-300 h-full
                        ${isSelected ? 'bg-[#252525] border-2' : 'bg-[#1a1a1a] border border-[#333333] hover:border-[#6D282C]/50'}
                        hover:shadow-[0_0_20px_rgba(109,40,44,0.15)]`}
            style={{
                borderColor: isSelected ? color : undefined,
                boxShadow: isSelected ? `0 0 25px ${color}40` : undefined
            }}
        >
            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />

            {isSuggested && !isSelected && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#6D282C] text-white px-3 py-1 rounded-sm text-xs font-bold z-20 shadow-md whitespace-nowrap tracking-wider">
                    AI SUGGESTION
                </div>
            )}

            <div className="text-center mb-1 min-h-[2rem] flex items-center justify-center relative z-10">
                <p className="font-bold text-md leading-tight text-[#E0E0E0]">{level}</p>
            </div>

            <div className="flex-grow w-full bg-black rounded-lg relative overflow-hidden border border-[#333333] group-hover:border-[#444444]">
                {imageSrc ? (
                    <img src={imageSrc} alt={`Reference for ${level}`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-500 italic text-sm px-4 text-center">No Reference Image</p>
                    </div>
                )}
            </div>

            <div
                className="mt-3 h-2 rounded-full w-full transition-colors duration-300"
                style={{ backgroundColor: isSelected ? color : '#333333' }}
            ></div>
        </div>
    );
};


const LongLegLaxityCheckPage: React.FC = () => {
    const {
        setPage,
        previousPage,
        setLateralLaxity,
        longLegImageSrc,
        setPlannerMode,
    } = useAppContext();
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [userSelection, setUserSelection] = useState<string | null>(null);

    const patientFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (longLegImageSrc) {
            setPreviewImage(longLegImageSrc);
        }
    }, [longLegImageSrc]);

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
                analyzeLaxity(result);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };


    const handleConfirmSelection = () => {
        if (!userSelection) return;
        setLateralLaxity(userSelection);
        setPage('intra-operative-coronal-balancing');
    };

    const handleSkip = () => {
        if (previousPage) {
            setPage(previousPage);
        } else {
            setPage('planner-long-leg');
        }
    };

    const goBack = () => {
        setPage('intra-operative-coronal-balancing');
    };

    const laxityLevels = [
        'No Lateral Laxity',
        'Mild lateral laxity',
        'Moderate lateral laxity',
        'Severe lateral laxity',
    ];

    const laxityColors = ['#6D282C', '#6D282C', '#6D282C', '#6D282C'];

    return (
        <div className="relative flex flex-col h-full p-2 overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Overhead Surgical Lamp Effect */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center mb-1 relative z-10 shrink-0">
                <h2 className="text-3xl font-bold text-[#E0E0E0] uppercase">Check for Lateral Laxity (Long Leg)</h2>
                <div className="flex space-x-2">
                    {/* Cancel Button */}
                    <button
                        onClick={goBack}
                        className="group relative py-2 px-4 bg-[#252525] border border-[#444444] rounded-sm 
                                   shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                                   active:scale-[0.98] flex items-center"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                        <span className="relative font-bold text-sm text-gray-200 tracking-wider flex items-center group-hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            CANCEL
                        </span>
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-white/50" />
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex flex-col lg:flex-row gap-4 flex-grow min-h-0 relative z-10 overflow-visible lg:overflow-hidden pb-4">

                {/* Left Side: Reference Images Group */}
                <div className="flex-grow-[3] flex flex-col min-w-0 h-full overflow-visible lg:overflow-hidden">
                    <div className="relative bg-[#1a1a1a] border border-[#333333] p-1 rounded-lg mb-1 shrink-0">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <h3 className="text-md font-bold text-[#E0E0E0] text-center relative z-10 uppercase">Laxity Level Reference Images</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-grow min-h-[37.5rem] lg:min-h-0">
                        {laxityLevels.map((level, index) => {
                            let staticImage = null;
                            if (level === 'No Lateral Laxity') staticImage = '/nolaterl.png';
                            else if (level === 'Mild lateral laxity') staticImage = '/mildlaterl.png';
                            else if (level === 'Moderate lateral laxity') staticImage = '/moderate.png';
                            else if (level === 'Severe lateral laxity') staticImage = '/severe.png';

                            return (
                                <LaxityOption
                                    key={level}
                                    level={level}
                                    onClick={() => setUserSelection(level)}
                                    imageSrc={staticImage}
                                    isSelected={userSelection === level}
                                    isSuggested={aiSuggestion === level}
                                    color={laxityColors[index]}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Patient Upload */}
                <div className="flex-grow-[2] flex flex-col min-w-[15.625rem] h-full overflow-visible lg:overflow-hidden min-h-[28.125rem] lg:min-h-0">
                    <div className="relative bg-[#1a1a1a] border border-[#6D282C]/50 p-1 rounded-lg mb-1 shrink-0">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <h3 className="text-md font-bold text-[#ff8fa3] text-center relative z-10 uppercase">Patient X-ray</h3>
                    </div>
                    <div className="relative flex flex-col p-1 rounded-lg border border-[#333333] bg-[#1a1a1a] h-full hover:border-[#6D282C]/50 transition-all flex-grow min-h-0">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />

                        {isLoading && (
                            <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
                                <div className="w-12 h-12 border-4 border-[#6D282C] border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-lg text-[#ff8fa3] font-semibold tracking-wider">AI ANALYZING...</p>
                            </div>
                        )}

                        <div className="flex-grow w-full bg-black rounded-lg relative overflow-hidden border border-[#333333] group cursor-pointer" onClick={() => patientFileInputRef.current?.click()}>
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
                                <span className="bg-[#6D282C] text-white px-4 py-2 rounded-sm font-semibold text-sm shadow-lg tracking-wider">
                                    {previewImage ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}
                                </span>
                            </div>
                        </div>
                        <input type="file" ref={patientFileInputRef} onChange={handlePatientFileChange} accept="image/*" className="hidden" />
                        <div className="mt-3 h-2 rounded-full w-full bg-[#333333]"></div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-1 flex flex-col md:flex-row items-stretch md:items-center justify-between relative z-10 bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg shrink-0 gap-4">
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                <div className="flex flex-col justify-center relative z-10 text-md text-gray-500">
                    <p className="font-bold text-[#E0E0E0] mb-1">Important Note:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Lateral laxity is best made out in a varus stress film or a one-leg standing film.</li>
                        <li>Lateral laxity must not be compensated for by altering bony cuts. Suitable releases must be performed on the medial side to match the stretched lateral side.</li>
                    </ul>
                </div>

                <div className="flex flex-col items-stretch md:items-end justify-center relative z-10 shrink-0 md:ml-4">
                    <p className="text-gray-400 text-md mb-2 self-center lg:self-end">
                        Selected: <span className="font-bold text-[#E0E0E0]">{userSelection || 'None'}</span>
                    </p>
                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirmSelection}
                        disabled={!userSelection}
                        className="group relative w-full lg:w-auto py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                                   shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                   active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6D282C] disabled:hover:shadow-none"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                        <span className="relative flex items-center justify-center gap-2 text-sm font-bold text-white tracking-wider">
                            CONFIRM SELECTION
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LongLegLaxityCheckPage;
