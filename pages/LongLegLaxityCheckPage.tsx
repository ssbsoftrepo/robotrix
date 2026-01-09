
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
            className={`group relative flex flex-col p-3 rounded-lg cursor-pointer transition-all duration-300 h-full
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

            <div className="text-center mb-3 min-h-[3rem] flex items-center justify-center relative z-10">
                <p className="font-bold text-lg leading-tight text-[#E0E0E0]">{level}</p>
            </div>

            <div className="flex-grow w-full bg-black rounded-lg relative overflow-hidden border border-[#333333] group-hover:border-[#444444]">
                {imageSrc ? (
                    <img src={imageSrc} alt={`Reference for ${level}`} className="absolute inset-0 w-full h-full object-contain" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-600 italic text-sm px-4 text-center">No Reference Image</p>
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
        setPlannerMode('advanced');
        setPage('planner-long-leg');
    };

    const handleSkip = () => {
        setPage('planner-long-leg');
    };

    const goBack = () => {
        setLateralLaxity(null);
        setPlannerMode(null);
        setPage('case-management');
    };

    const laxityLevels = [
        'No Lateral Laxity',
        'Mild lateral laxity',
        'Moderate lateral laxity',
        'Severe lateral laxity',
    ];

    const laxityColors = ['#6D282C', '#6D282C', '#6D282C', '#6D282C'];

    return (
        <div className="relative flex flex-col h-full p-4 overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Overhead Surgical Lamp Effect */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center mb-4 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0]">Check for Lateral Laxity (Long Leg)</h2>
                <div className="flex space-x-4">
                    {/* Skip Button */}
                    <button
                        onClick={handleSkip}
                        className="group relative py-2 px-5 bg-[#6D282C] border border-[#893338] rounded-sm 
                                   shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                                   active:scale-[0.98] flex items-center"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                        <span className="relative font-bold text-white tracking-wider flex items-center">
                            SKIP TO PLANNER
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    </button>
                    {/* Cancel Button */}
                    <button
                        onClick={goBack}
                        className="group relative py-2 px-5 bg-[#252525] border border-[#444444] rounded-sm 
                                   shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                                   active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                        <span className="relative font-bold text-gray-200 tracking-wider group-hover:text-white">CANCEL</span>
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-[65vh] relative z-10">

                {/* Left Side: Reference Images Group */}
                <div className="flex-grow-[3] flex flex-col min-w-0">
                    <div className="relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg mb-4">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <h3 className="text-xl font-bold text-[#E0E0E0] text-center relative z-10">Laxity Level Reference Images</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-grow">
                        {laxityLevels.map((level, index) => {
                            let staticImage = null;
                            if (level === 'No Lateral Laxity') staticImage = '/nolaterl.jpeg';
                            else if (level === 'Mild lateral laxity') staticImage = '/mildlaterl.jpeg';
                            else if (level === 'Moderate lateral laxity') staticImage = '/moderate.jpeg';
                            else if (level === 'Severe lateral laxity') staticImage = '/severe.jpeg';

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
                <div className="flex-grow-[2] flex flex-col min-w-[300px]">
                    <div className="relative bg-[#1a1a1a] border border-[#6D282C]/50 p-2 rounded-lg mb-4">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                        <h3 className="text-xl font-bold text-[#ff8fa3] text-center relative z-10">Patient X-ray</h3>
                    </div>
                    <div className="relative flex flex-col p-3 rounded-lg border border-[#333333] bg-[#1a1a1a] h-full hover:border-[#6D282C]/50 transition-all flex-grow">
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
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative z-10 bg-[#1a1a1a] border border-[#333333] p-4 rounded-lg">
                <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                <div className="lg:col-span-2 text-sm text-gray-500 relative z-10">
                    <p className="font-bold text-[#E0E0E0] mb-1">Important Note:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Lateral laxity is best made out in a varus stress film or a one-leg standing film.</li>
                        <li>Lateral laxity must not be compensated for by altering bony cuts. Suitable releases must be performed on the medial side to match the stretched lateral side.</li>
                    </ul>
                </div>
                <div className="lg:col-span-1 flex flex-col items-end justify-center h-full relative z-10">
                    <p className="text-gray-400 text-sm mb-2 self-center lg:self-end">
                        Selected: <span className="font-bold text-[#E0E0E0]">{userSelection || 'None'}</span>
                    </p>
                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirmSelection}
                        disabled={!userSelection}
                        className="group relative w-full lg:w-auto py-3 px-8 bg-[#6D282C] border border-[#893338] rounded-sm 
                                   shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                   active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6D282C] disabled:hover:shadow-none"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                        <span className="relative text-xl font-bold text-white tracking-widest">CONFIRM SELECTION</span>
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LongLegLaxityCheckPage;
