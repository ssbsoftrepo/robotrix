
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, Point, ValgusResults, LegSide } from '../types';

// --- Helper Functions ---
const HANDLE_RADIUS = 3.5; // Reduced from 6
const LANDMARK_COLORS = {
    jointLine: '#800000',
    femurAnatomicAxis: '#9400D3',
    tibiaAnatomicAxis: '#008080',
};
const landmarkInstructions = {
    jointLine: ["Mark the center of the medial M joint space.", "Mark the center of the lateral L joint space."],
    femurAnatomicAxis: ["Mark mid femur axis."],
    tibiaAnatomicAxis: ["Mark mid tibia axis."],
};
const angleBetweenVectors = (v1: Point, v2: Point) => {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    if (mag1 === 0 || mag2 === 0) return 0;
    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosTheta) * (180 / Math.PI);
};
const getLongLegCpakType = (ahka: number, jlo: number): string => {
    // Classification based on provided table:
    // aHKA: Varus (< -2), Neutral (-2 to 2), Valgus (> 2)
    // JLO: Apex Distal (< 177), Apex Neutral (177 to 183), Apex Proximal (> 183)

    let ahkaClass: 'varus' | 'neutral' | 'valgus';
    if (ahka < -2) {
        ahkaClass = 'varus';
    } else if (ahka > 2) {
        ahkaClass = 'valgus';
    } else {
        ahkaClass = 'neutral';
    }

    let jloClass: 'distal' | 'neutral' | 'proximal';
    if (jlo < 177) {
        jloClass = 'distal';
    } else if (jlo > 183) {
        jloClass = 'proximal';
    } else {
        jloClass = 'neutral';
    }

    // Determine CPAK type from the 3x3 grid
    if (jloClass === 'distal') {
        if (ahkaClass === 'varus') return 'I';
        if (ahkaClass === 'neutral') return 'II';
        if (ahkaClass === 'valgus') return 'III';
    } else if (jloClass === 'neutral') {
        if (ahkaClass === 'varus') return 'IV';
        if (ahkaClass === 'neutral') return 'V';
        if (ahkaClass === 'valgus') return 'VI';
    } else if (jloClass === 'proximal') {
        if (ahkaClass === 'varus') return 'VII';
        if (ahkaClass === 'neutral') return 'VIII';
        if (ahkaClass === 'valgus') return 'IX';
    }

    return '--';
};

const PostOpValgusPlanner: React.FC = () => {
    const { postOpValgusImage, setPostOpValgusImage } = useAppContext();
    const [fileName, setFileName] = useState('No file chosen');
    const [legSide, setLegSide] = useState<LegSide>('left');
    const [landmarks, setLandmarks] = useState<Landmarks>({});
    const [results, setResults] = useState<Partial<ValgusResults>>({});
    const [visibleLandmarkSets, setVisibleLandmarkSets] = useState<Set<string>>(new Set());

    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const draggingPointRef = useRef<string | null>(null);
    const localResultsRef = useRef(results);
    useEffect(() => { localResultsRef.current = results; }, [results]);

    const resetLandmarks = useCallback((canvas: HTMLCanvasElement) => {
        const w = canvas.width; const h = canvas.height;
        setLandmarks({
            medialJointSpace: { x: w * 0.45, y: h * 0.5 },
            lateralJointSpace: { x: w * 0.55, y: h * 0.5 },
            femurAxisPoint: { x: w * 0.5, y: h * 0.2 },
            tibiaAxisPoint: { x: w * 0.5, y: h * 0.8 },
        });
    }, []);

    const updateCalculations = useCallback(() => {
        const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = landmarks;
        let newResults: Partial<ValgusResults> = { obliquity: null, ldfa: null, mpta: null, femurType: '--', cpak: '--' };

        if (visibleLandmarkSets.has('jointLine') && medialJointSpace && lateralJointSpace) {
            let angleRad = Math.atan2(medialJointSpace.y - lateralJointSpace.y, medialJointSpace.x - lateralJointSpace.x);
            let angleDeg = Math.abs(angleRad * (180 / Math.PI));
            if (angleDeg > 90) angleDeg = 180 - angleDeg;
            newResults.obliquity = angleDeg;
            const jointCenter = { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 };
            const onScreenLeftPoint = medialJointSpace.x < lateralJointSpace.x ? medialJointSpace : lateralJointSpace;
            const onScreenRightPoint = medialJointSpace.x > lateralJointSpace.x ? medialJointSpace : lateralJointSpace;
            const medialPoint = legSide === 'left' ? onScreenLeftPoint : onScreenRightPoint;
            const lateralPoint = legSide === 'left' ? onScreenRightPoint : onScreenLeftPoint;

            if (visibleLandmarkSets.has('femurAnatomicAxis') && femurAxisPoint) {
                const femurAxisVec = { x: femurAxisPoint.x - jointCenter.x, y: femurAxisPoint.y - jointCenter.y };
                const femoralJointLineVec = legSide === 'left' ? { x: lateralPoint.x - medialPoint.x, y: lateralPoint.y - medialPoint.y } : { x: medialPoint.x - lateralPoint.x, y: medialPoint.y - lateralPoint.y };
                newResults.ldfa = angleBetweenVectors(femurAxisVec, femoralJointLineVec);
            }
            if (visibleLandmarkSets.has('tibiaAnatomicAxis') && tibiaAxisPoint) {
                const tibiaAxisVec = { x: tibiaAxisPoint.x - jointCenter.x, y: tibiaAxisPoint.y - jointCenter.y };
                const tibialJointLineVec = { x: medialPoint.x - lateralPoint.x, y: medialPoint.y - lateralPoint.y };
                newResults.mpta = angleBetweenVectors(tibiaAxisVec, tibialJointLineVec);
            }
        }
        if (newResults.ldfa !== null && newResults.mpta !== null) {
            newResults.cpak = getLongLegCpakType(newResults.mpta - newResults.ldfa, newResults.mpta + newResults.ldfa);
            if (newResults.obliquity !== null) {
                if (newResults.obliquity >= 3) {
                    newResults.femurType = 'Valgoid';
                } else if (newResults.obliquity >= 1) {
                    newResults.femurType = 'Median';
                } else {
                    newResults.femurType = 'Varoid';
                }
            }
        }
        setResults(newResults);
    }, [landmarks, visibleLandmarkSets, legSide]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || Object.keys(landmarks).length === 0) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = landmarks;
        if (visibleLandmarkSets.has('jointLine') && medialJointSpace && lateralJointSpace) {
            ctx.strokeStyle = LANDMARK_COLORS.jointLine; ctx.fillStyle = LANDMARK_COLORS.jointLine; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(medialJointSpace.x, medialJointSpace.y); ctx.lineTo(lateralJointSpace.x, lateralJointSpace.y); ctx.stroke();
            [medialJointSpace, lateralJointSpace].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); });
        }
        const jointCenter = (medialJointSpace && lateralJointSpace) ? { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 } : null;
        if (visibleLandmarkSets.has('femurAnatomicAxis') && femurAxisPoint && jointCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(femurAxisPoint.x, femurAxisPoint.y); ctx.lineTo(jointCenter.x, jointCenter.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(femurAxisPoint.x, femurAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
        }
        if (visibleLandmarkSets.has('tibiaAnatomicAxis') && tibiaAxisPoint && jointCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.tibiaAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.tibiaAnatomicAxis; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tibiaAxisPoint.x, tibiaAxisPoint.y); ctx.lineTo(jointCenter.x, jointCenter.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(tibiaAxisPoint.x, tibiaAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
        }
        updateCalculations();
    }, [landmarks, visibleLandmarkSets, updateCalculations]);

    useEffect(() => { draw(); }, [draw]);
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) { setPostOpValgusImage(event.target.result as string); setFileName(file.name); }
            };
            reader.readAsDataURL(file);
        }
    };
    const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect(); return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
        for (const key in landmarks) {
            if (landmarks[key] && (landmarks[key].x - pos.x) ** 2 + (landmarks[key].y - pos.y) ** 2 < (HANDLE_RADIUS + 5) ** 2) {
                draggingPointRef.current = key; break;
            }
        }
    };
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingPointRef.current || !canvasRef.current) return;
        const pos = getCanvasPos(canvasRef.current, e.clientX, e.clientY);
        setLandmarks(prev => ({ ...prev, [draggingPointRef.current!]: pos }));
    }, []);
    const handleMouseUp = useCallback(() => { draggingPointRef.current = null; }, []);
    // TOUCH SUPPORT — ADD THESE
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
        const hitRadius = HANDLE_RADIUS + 10; // Larger hit area for fingers

        for (const key in landmarks) {
            const point = landmarks[key];
            if (point && (point.x - pos.x) ** 2 + (point.y - pos.y) ** 2 < hitRadius ** 2) {
                draggingPointRef.current = key;
                break;
            }
        }
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!draggingPointRef.current || !canvasRef.current) return;
        e.preventDefault(); // Critical: stops scrolling

        const touch = e.touches[0];
        if (!touch) return;

        const pos = getCanvasPos(canvasRef.current, touch.clientX, touch.clientY);
        setLandmarks(prev => ({ ...prev, [draggingPointRef.current!]: pos }));
    }, []);

    const handleTouchEnd = useCallback(() => {
        draggingPointRef.current = null;
    }, []);


    useEffect(() => {
        // Mouse
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // Touch — ADD THESE
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    const toggleLandmarkSet = (setName: keyof typeof landmarkInstructions) => {
        const newSets = new Set(visibleLandmarkSets);
        newSets.has(setName) ? newSets.delete(setName) : newSets.add(setName);
        setVisibleLandmarkSets(newSets);
    };

    return (
        <div className="flex flex-col h-full space-y-4 bg-gray-900 rounded-lg p-2">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-grow h-full">
                {/* Controls */}
                <div className="lg:col-span-1 flex flex-col space-y-3">
                    <div>
                        <h4 className="text-md font-semibold text-gray-300 mb-1">Upload Post-Op</h4>
                        <label htmlFor="postop-xray-upload" className="cursor-pointer text-center p-2 rounded-lg font-semibold text-sm bg-[#2a2b2c] border border-[#5f6368] hover:bg-[#6D282C] block">
                            Choose File
                        </label>
                        <input type="file" id="postop-xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <span className="text-xs text-gray-400 truncate mt-1 inline-block">{fileName}</span>
                    </div>
                    <div>
                        <h4 className="text-md font-semibold text-gray-300 mb-1">Leg Side</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setLegSide('left')} className={`py-2 px-2 rounded-lg font-semibold text-sm border ${legSide === 'left' ? 'bg-[#6D282C] text-white border-[#893338]' : 'bg-[#2a2b2c] border-[#5f6368]'}`}>Left</button>
                            <button onClick={() => setLegSide('right')} className={`py-2 px-2 rounded-lg font-semibold text-sm border ${legSide === 'right' ? 'bg-[#6D282C] text-white border-[#893338]' : 'bg-[#2a2b2c] border-[#5f6368]'}`}>Right</button>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-md font-semibold text-gray-300 mb-1">Mark Landmarks</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {Object.keys(landmarkInstructions).map((key) => (
                                <button key={key} onClick={() => toggleLandmarkSet(key as any)} style={{ '--landmark-color': LANDMARK_COLORS[key as keyof typeof LANDMARK_COLORS] } as React.CSSProperties} className={`w-full text-left py-2 px-3 rounded-lg font-semibold text-sm border-2 ${visibleLandmarkSets.has(key) ? 'bg-[var(--landmark-color)] border-transparent text-white' : 'bg-transparent border-[var(--landmark-color)] text-gray-200'}`}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Viewer */}
                <div className="lg:col-span-3 relative w-full h-full bg-black rounded-lg flex items-center justify-center overflow-hidden min-h-[400px]">
                    {postOpValgusImage ? (<>
                        <img ref={imageRef} src={postOpValgusImage} className="block max-w-full max-h-full object-contain" onLoad={() => { if (canvasRef.current) resetLandmarks(canvasRef.current); }} />
                        <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 w-full h-full touch-none"
                            style={{ touchAction: 'none' }} 
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}  
                        />
                    </>) : <p className="text-gray-500 text-center p-2 text-sm">Upload post-op X-ray.</p>}
                </div>
            </div>
            {/* Results */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <p className="text-sm text-yellow-500 font-bold uppercase">Distal Obliquity</p>
                    <p className="font-bold text-2xl text-yellow-400">{results.obliquity?.toFixed(1) ?? '--'}°</p>
                </div>
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <p className="text-sm text-yellow-500 font-bold uppercase">Femur Type</p>
                    <p className="font-bold text-2xl text-yellow-400">{results.femurType ?? '--'}</p>
                </div>
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <p className="text-sm text-yellow-500 font-bold uppercase">CPAK Type</p>
                    <p className="font-bold text-2xl text-yellow-400">{results.cpak ?? '--'}</p>
                </div>
            </div>
        </div>
    );
};

const ResultItem: React.FC<{ label: string; value: string | number | null; large?: boolean }> = ({ label, value, large = false }) => (
    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
        <p className="text-sm text-yellow-500 font-bold uppercase">{label}</p>
        <p className={`font-bold text-yellow-400 ${large ? 'text-4xl' : 'text-2xl'}`}>{value ?? '--'}</p>
    </div>
);

const PastCaseValgusResultPage: React.FC = () => {
    const { setPage, valgusCanvasDataUrl, valgusResults } = useAppContext();

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="text-4xl font-bold">Valgus Stress Result Verification</h2>
                <button onClick={() => setPage('case-management')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition text-lg">&larr; Back to Cases</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
                {/* Column 1: Pre-op */}
                <div className="gemini-dark-card p-4 rounded-lg flex flex-col h-full border-2 border-gray-700">
                    <h3 className="text-2xl font-bold text-center mb-4 text-gray-200 uppercase tracking-wider bg-gray-800/50 py-2 rounded">Pre-Op Analysis</h3>
                    <div className="w-full flex-grow bg-black rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-gray-800">
                        {valgusCanvasDataUrl ?
                            <img src={valgusCanvasDataUrl} alt="Pre-op Analysis" className="max-w-full max-h-full object-contain" /> :
                            <p className="text-gray-500 italic">No pre-op image available.</p>
                        }
                    </div>
                    <div className="mt-auto grid grid-cols-3 gap-3 text-center">
                        <ResultItem label="Distal Obliquity" value={valgusResults.obliquity?.toFixed(1) + '°'} />
                        <ResultItem label="Femur Type" value={valgusResults.femurType} />
                        <ResultItem label="CPAK Type" value={valgusResults.cpak} />
                    </div>
                </div>

                {/* Column 2: Post-op */}
                <div className="gemini-dark-card p-4 rounded-lg flex flex-col h-full border-2 border-gray-700 bg-gray-800/30">
                    <h3 className="text-2xl font-bold text-center mb-4 text-gray-200 uppercase tracking-wider bg-gray-800/50 py-2 rounded">Post-Op Verification</h3>
                    <div className="flex-grow">
                        <PostOpValgusPlanner />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PastCaseValgusResultPage;
