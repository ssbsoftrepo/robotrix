
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, Point, ValgusResults, LegSide } from '../types';

// --- Helper Functions ---
const HANDLE_RADIUS = 3.5; // Reduced from 6
const LANDMARK_COLORS = {
    jointLine: '#6D282C',
    femurAnatomicAxis: '#6D282C',
    tibiaAnatomicAxis: '#6D282C',
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
        if (ahkaClass === 'varus') return '1';
        if (ahkaClass === 'neutral') return '2';
        if (ahkaClass === 'valgus') return '3';
    } else if (jloClass === 'neutral') {
        if (ahkaClass === 'varus') return '4';
        if (ahkaClass === 'neutral') return '5';
        if (ahkaClass === 'valgus') return '6';
    } else if (jloClass === 'proximal') {
        if (ahkaClass === 'varus') return '7';
        if (ahkaClass === 'neutral') return '8';
        if (ahkaClass === 'valgus') return '9';
    }

    return '--';
};

const calculateLineAngle = (p1: Point, p2: Point, p3: Point, p4: Point) => {
    const vec1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const vec2 = { x: p4.x - p3.x, y: p4.y - p3.y };

    const angle = angleBetweenVectors(vec1, vec2);
    return angle;
};

const getFemurClassification = (ldfa: number) => {
    if (ldfa > 92) return { type: 'Significant varoid femur', cut: '2° valgus cut' };
    if (ldfa > 91) return { type: 'Mild varoid femur', cut: '3° valgus cut' };
    if (ldfa > 88) return { type: 'Median (neutral) femur', cut: '4° valgus cut' };
    if (ldfa > 87) return { type: 'Mild valgoid femur', cut: '5° valgus cut' };
    if (ldfa > 86) return { type: 'Significant valgoid femur', cut: '6° valgus cut' };
    return {
        type: 'Significant valgoid femur',
        cut: '6° valgus cut (Warning: Native LDFA out of boundary)'
    };
};

const PostOpValgusPlanner: React.FC = () => {
    const {
        postOpValgusImage,
        setPostOpValgusImage,
        postOpValgusLandmarks: landmarks,
        setPostOpValgusLandmarks: setLandmarks,
        postOpValgusResults: results,
        setPostOpValgusResults: setResults,
        legSide
    } = useAppContext();
    const [fileName, setFileName] = useState('No file chosen');

    // removed local landmarks and results state
    const [visibleLandmarkSets, setVisibleLandmarkSets] = useState<Set<string>>(new Set());

    const landmarksRef = useRef(landmarks);
    useEffect(() => { landmarksRef.current = landmarks; }, [landmarks]);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const draggingPointRef = useRef<string | null>(null);
    const localResultsRef = useRef(results);
    useEffect(() => { localResultsRef.current = results; }, [results]);
    const prevLegSideRef = useRef(legSide);

    // Restore visibleLandmarkSets from existing landmarks
    useEffect(() => {
        const newSets = new Set<string>();
        if (landmarks.medialJointSpace || landmarks.lateralJointSpace) newSets.add('jointLine');
        if (landmarks.femurAxisPoint) newSets.add('femurAnatomicAxis');
        if (landmarks.tibiaAxisPoint) newSets.add('tibiaAnatomicAxis');
        if (newSets.size > 0) {
            setVisibleLandmarkSets(newSets);
        }
    }, []); // Run only on mount to restore state

    const resetLandmarks = useCallback((canvas: HTMLCanvasElement) => {
        const w = canvas.width; const h = canvas.height;
        const isLeft = legSide === 'left';
        setLandmarks({
            medialJointSpace: { x: isLeft ? w * 0.45 : w * 0.55, y: h * 0.5 },
            lateralJointSpace: { x: isLeft ? w * 0.55 : w * 0.45, y: h * 0.5 },
            femurAxisPoint: { x: w * 0.5, y: h * 0.2 },
            tibiaAxisPoint: { x: w * 0.5, y: h * 0.8 },
        });
    }, [legSide, setLandmarks]);

    // Sync landmarks if legSide changes
    useEffect(() => {
        if (prevLegSideRef.current !== legSide) {
            setLandmarks(prev => {
                if (!prev.medialJointSpace || !prev.lateralJointSpace) return prev;
                return {
                    ...prev,
                    medialJointSpace: prev.lateralJointSpace,
                    lateralJointSpace: prev.medialJointSpace
                };
            });
            prevLegSideRef.current = legSide;
        }
    }, [legSide, setLandmarks]);

    const updateCalculations = useCallback(() => {
        const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = landmarks;
        let newResults: Partial<ValgusResults> = { obliquity: null, ldfa: null, mpta: null, femurType: '--', femurTypeByObliquity: '--', cpak: '--', cut: '--' };

        let jointCenter: Point | null = null;
        if (medialJointSpace && lateralJointSpace) {
            jointCenter = { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 };

            if (visibleLandmarkSets.has('jointLine')) {
                const dy = medialJointSpace.y - lateralJointSpace.y;
                const dx = medialJointSpace.x - lateralJointSpace.x;
                let angleDeg = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
                if (angleDeg > 180) angleDeg = 360 - angleDeg;
                if (angleDeg > 90) angleDeg = 180 - angleDeg;
                newResults.obliquity = angleDeg;
            }
        }

        if (visibleLandmarkSets.has('femurAnatomicAxis') && femurAxisPoint && jointCenter && lateralJointSpace && medialJointSpace) {
            const isLeftKnee = legSide === 'left';
            const sortedPoints = [medialJointSpace, lateralJointSpace].sort((a, b) => a.x - b.x);
            const leftPoint = sortedPoints[0];
            const rightPoint = sortedPoints[1];

            // Left Leg: Medial is Right (Inner). Right Leg: Medial is Left (Inner).
            const trueMedial = isLeftKnee ? rightPoint : leftPoint;
            const trueLateral = isLeftKnee ? leftPoint : rightPoint;

            newResults.ldfa = calculateLineAngle(femurAxisPoint, jointCenter, trueMedial, trueLateral);
        }
        if (visibleLandmarkSets.has('tibiaAnatomicAxis') && tibiaAxisPoint && jointCenter && medialJointSpace && lateralJointSpace) {
            const isLeftKnee = legSide === 'left';
            const sortedPoints = [medialJointSpace, lateralJointSpace].sort((a, b) => a.x - b.x);
            const leftPoint = sortedPoints[0];
            const rightPoint = sortedPoints[1];

            const trueMedial = isLeftKnee ? rightPoint : leftPoint;
            const trueLateral = isLeftKnee ? leftPoint : rightPoint;

            newResults.mpta = calculateLineAngle(tibiaAxisPoint, jointCenter, trueLateral, trueMedial);
        }

        if (newResults.ldfa !== null && newResults.mpta !== null) {
            newResults.cpak = getLongLegCpakType(newResults.mpta - newResults.ldfa, newResults.mpta + newResults.ldfa);

            // LDFA-based classification
            const femurClass = getFemurClassification(newResults.ldfa);
            newResults.femurType = femurClass.type;
            newResults.cut = femurClass.cut;

            // Obliquity-based classification
            if (newResults.obliquity !== null) {
                if (newResults.obliquity >= 3) {
                    newResults.femurTypeByObliquity = 'Valgoid';
                } else if (newResults.obliquity >= 1) {
                    newResults.femurTypeByObliquity = 'Median';
                } else {
                    newResults.femurTypeByObliquity = 'Varoid';
                }
            }
        }
        setResults(newResults);
        return newResults;
    }, [landmarks, visibleLandmarkSets, legSide, setResults]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || Object.keys(landmarks).length === 0) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentResults = updateCalculations();

        const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = landmarks;

        const drawTextWithBackground = (text: string, x: number, y: number, color: string = '#fdd835') => {
            ctx.font = 'bold 20px Inter, sans-serif';
            ctx.fillStyle = 'rgba(29, 29, 31, 0.8)';
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            ctx.fillRect(x - textWidth / 2 - 8, y - 20, textWidth + 16, 30);
            ctx.fillStyle = color;
            ctx.fillText(text, x - textWidth / 2, y);
        };

        const jointCenter = (medialJointSpace && lateralJointSpace) ? { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 } : null;

        if (visibleLandmarkSets.has('jointLine') && medialJointSpace && lateralJointSpace && jointCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.jointLine; ctx.fillStyle = LANDMARK_COLORS.jointLine; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(medialJointSpace.x, medialJointSpace.y); ctx.lineTo(lateralJointSpace.x, lateralJointSpace.y); ctx.stroke();
            [medialJointSpace, lateralJointSpace].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); });

            // Draw M and L labels
            const mOffset = medialJointSpace.x < lateralJointSpace.x ? -25 : 25;
            const lOffset = lateralJointSpace.x < medialJointSpace.x ? -25 : 25;

            ctx.fillStyle = "#e3e3e3";
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.fillText('M', medialJointSpace.x + mOffset, medialJointSpace.y + 5);
            ctx.fillText('L', lateralJointSpace.x + lOffset, lateralJointSpace.y + 5);

            if (currentResults.obliquity !== null) {
                drawTextWithBackground(`Obliquity: ${currentResults.obliquity.toFixed(1)}°`, jointCenter.x, jointCenter.y - 20);
            }
            if (currentResults.ldfa !== null) {
                drawTextWithBackground(`LDFA: ${currentResults.ldfa.toFixed(1)}°`, jointCenter.x, jointCenter.y - 55);
            }
            if (currentResults.mpta !== null) {
                drawTextWithBackground(`MPTA: ${currentResults.mpta.toFixed(1)}°`, jointCenter.x, jointCenter.y + 55);
            }
        }

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

    // Reverted resize logic to onLoad, removed DPR
    useEffect(() => {
        const imgElement = imageRef.current;
        const canvasElement = canvasRef.current;

        const handleImageLoad = () => {
            if (!imgElement || !canvasElement) return;

            const viewer = canvasElement.parentElement?.parentElement; // container
            if (!viewer) return;

            const imgNaturalWidth = imgElement.naturalWidth;
            const imgNaturalHeight = imgElement.naturalHeight;

            if (imgNaturalWidth === 0 || imgNaturalHeight === 0) return;

            const availWidth = viewer.clientWidth;
            const availHeight = viewer.clientHeight;

            const aspectRatio = imgNaturalWidth / imgNaturalHeight;

            let displayWidth = availWidth;
            let displayHeight = displayWidth / aspectRatio;

            if (displayHeight > availHeight) {
                displayHeight = availHeight;
                displayWidth = displayHeight * aspectRatio;
            }

            // Set canvas and image display sizes
            imgElement.style.width = `${displayWidth}px`;
            imgElement.style.height = `${displayHeight}px`;
            canvasElement.style.width = `${displayWidth}px`;
            canvasElement.style.height = `${displayHeight}px`;

            // Set canvas internal resolution to match display size (no DPR scaling)
            canvasElement.width = displayWidth;
            canvasElement.height = displayHeight;

            // Reset landmarks ONLY if they are empty (prevent overwriting saved data)
            if (Object.keys(landmarksRef.current).length === 0) {
                resetLandmarks(canvasElement);
            }
            draw(); // Redraw after resize and potential landmark reset
        };

        if (imgElement) {
            imgElement.addEventListener('load', handleImageLoad);
            // If image is already loaded (e.g., from cache or initial render), trigger resize
            if (imgElement.complete && imgElement.naturalWidth > 0) {
                handleImageLoad();
            }
        }

        return () => {
            if (imgElement) {
                imgElement.removeEventListener('load', handleImageLoad);
            }
        };
    }, [draw, postOpValgusImage, resetLandmarks]);


    // Update getCanvasPos to account for DPR and Scale
    const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        // rect is Visual Size
        // canvas.width is Visual Size * DPR
        // Internal coordinate system (for drawing) is scaled by DPR via ctx.scale
        // BUT, our LANDMARKS are stored in "Display Space" (e.g. 0-400).
        // If we draw at x=100 with ctx.scale(2,2), it draws at internal pixel 200. Correct.
        // This means landmarks should be stored in CSS Pixel Space.

        // clientX - rect.left gives the coordinate in CSS Pixel Space relative to the canvas.
        // This is the desired coordinate system for storing landmarks.
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
        // Larger hit radius
        const hitRadiusSq = (HANDLE_RADIUS + 50) ** 2;
        let minDistSq = hitRadiusSq;
        let closestKey: string | null = null;
        for (const key in landmarks) {
            const point = landmarks[key];
            if (point) {
                const distSq = (point.x - pos.x) ** 2 + (point.y - pos.y) ** 2;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestKey = key;
                }
            }
        }
        if (closestKey) {
            draggingPointRef.current = closestKey;
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
        const hitRadiusSq = (HANDLE_RADIUS + 60) ** 2;
        let minDistSq = hitRadiusSq;
        let closestKey: string | null = null;

        for (const key in landmarks) {
            const point = landmarks[key];
            if (point) {
                const distSq = (point.x - pos.x) ** 2 + (point.y - pos.y) ** 2;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestKey = key;
                }
            }
        }
        if (closestKey) {
            draggingPointRef.current = closestKey;
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
        <div className="relative flex flex-col h-full bg-gradient-to-br from-[#1E1E1E] to-[#121212] rounded-lg p-2">
            <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4 flex-grow min-h-0">
                {/* Viewer (Left 70%) - Swapped to match LongLeg Page Layout */}
                <div className="lg:col-span-1 relative w-full h-full bg-black rounded-lg flex items-center justify-center overflow-hidden min-h-[400px]">
                    {postOpValgusImage ? (<>
                        <img
                            ref={imageRef}
                            src={postOpValgusImage}
                            className="block max-w-full max-h-full object-contain"
                            alt=""
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute cursor-crosshair touch-none"
                            style={{ touchAction: 'none' }}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                        />
                    </>) : <p className="text-gray-500 text-center p-2 text-sm">Upload post-op X-ray.</p>}
                </div>

                {/* Controls (Right 30%) */}
                <div className="lg:col-span-1 flex flex-col space-y-3 overflow-y-auto">
                    <div>
                        <h4 className="text-md font-semibold text-[#E0E0E0] mb-1">Upload Post-Op</h4>
                        <label htmlFor="postop-xray-upload" className="cursor-pointer text-center p-2 rounded-sm font-semibold text-sm bg-[#6D282C] border border-[#893338] hover:bg-[#893338] text-white tracking-wider block transition">
                            CHOOSE FILE
                        </label>
                        <input type="file" id="postop-xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <span className="text-xs text-gray-500 truncate mt-1 inline-block">{fileName}</span>
                        <p className="text-gray-500 text-xs mt-1">Leg Side: <span className="text-[#E0E0E0] font-bold uppercase">{legSide}</span></p>
                    </div>

                    <div>
                        <h4 className="text-md font-semibold text-[#E0E0E0] mb-1">Mark Landmarks</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {Object.keys(landmarkInstructions).map((key) => (
                                <button key={key} onClick={() => toggleLandmarkSet(key as any)} className={`w-full text-left py-2 px-3 rounded-sm font-semibold text-sm border ${visibleLandmarkSets.has(key) ? 'bg-[#6D282C] border-[#893338] text-white' : 'bg-[#252525] border-[#333333] text-gray-300 hover:bg-[#333333]'}`}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Results */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#6D282C]/50">
                    <p className="text-xs text-[#ff8fa3] font-bold uppercase">Obliquity</p>
                    <p className="font-bold text-xl text-[#ff8fa3]">{results.obliquity?.toFixed(1) ?? '--'}°</p>
                </div>
                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#6D282C]/50">
                    <p className="text-xs text-[#ff8fa3] font-bold uppercase">Femur (LDFA)</p>
                    <p className="font-bold text-sm text-[#ff8fa3]">{results.femurType ?? '--'}</p>
                </div>
                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#6D282C]/50">
                    <p className="text-xs text-[#ff8fa3] font-bold uppercase">Femur (Obliq)</p>
                    <p className="font-bold text-xl text-[#ff8fa3]">{results.femurTypeByObliquity ?? '--'}</p>
                </div>
                <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#6D282C]/50">
                    <p className="text-xs text-[#ff8fa3] font-bold uppercase">CPAK Type</p>
                    <p className="font-bold text-xl text-[#ff8fa3]">{results.cpak ?? '--'}</p>
                </div>
            </div>
        </div>
    );
};

const ResultItem: React.FC<{ label: string; value: string | number | null; large?: boolean }> = ({ label, value, large = false }) => (
    <div className="bg-[#252525] p-3 rounded-lg border border-[#6D282C]/50">
        <p className="text-sm text-[#ff8fa3] font-bold uppercase">{label}</p>
        <p className={`font-bold text-[#ff8fa3] ${large ? 'text-4xl' : 'text-2xl'}`}>{value ?? '--'}</p>
    </div>
);

const PastCaseValgusResultPage: React.FC = () => {
    const { setPage, valgusCanvasDataUrl, valgusResults } = useAppContext();

    return (
        <div className="relative flex flex-col h-full overflow-y-auto bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex justify-between items-center mb-4 no-print p-4 relative z-10">
                <h2 className="text-4xl font-bold text-[#E0E0E0]">Valgus Stress Result Verification</h2>
                <button
                    onClick={() => setPage('case-management')}
                    className="group relative py-2 px-4 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_15px_rgba(109,40,44,0.3)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_20px_rgba(109,40,44,0.5)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-wider">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        BACK TO CASES
                    </span>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow px-4 relative z-10">
                {/* Column 1: Pre-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-4 rounded-lg flex flex-col h-full">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-2xl font-bold text-center mb-4 text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-2 rounded relative z-10">Pre-Op Analysis</h3>
                    <div className="w-full flex-grow bg-black rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-[#333333] relative z-10">
                        {valgusCanvasDataUrl ?
                            <img src={valgusCanvasDataUrl} alt="Pre-op Analysis" className="max-w-full max-h-full object-contain" /> :
                            <p className="text-gray-500 italic">No pre-op image available.</p>
                        }
                    </div>
                    <div className="mt-auto grid grid-cols-4 gap-2 text-center relative z-10">
                        <ResultItem label="Obliquity" value={valgusResults.obliquity?.toFixed(1) + '°'} />
                        <ResultItem label="Femur (LDFA)" value={valgusResults.femurType} />
                        <ResultItem label="Femur (Obliq)" value={valgusResults.femurTypeByObliquity} />
                        <ResultItem label="CPAK Type" value={valgusResults.cpak} />
                    </div>
                </div>

                {/* Column 2: Post-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-4 rounded-lg flex flex-col h-full">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-2xl font-bold text-center mb-4 text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-2 rounded relative z-10">Post-Op Verification</h3>
                    <div className="flex-grow">
                        <PostOpValgusPlanner />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PastCaseValgusResultPage;
