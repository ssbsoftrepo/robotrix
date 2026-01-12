
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, Point, ValgusResults, LegSide } from '../types';

// --- Helper Functions ---
const HANDLE_RADIUS = 6; // Matching Planner sensitivity6
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
        cut: '6° valgus cut (Native LDFA out of boundary)'
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

    // PIP State & Refs
    const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });
    const pipCanvasRef = useRef<HTMLCanvasElement>(null);
    const pipViewerRef = useRef<HTMLDivElement>(null);
    const isDraggingPipRef = useRef(false);
    const pipDragOffset = useRef({ x: 0, y: 0 });

    const updatePip = useCallback(() => {
        const key = draggingPointRef.current;
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const pipCanvas = pipCanvasRef.current;
        if (!key || !landmarks[key] || !image || !canvas || !pipCanvas) return;

        const pos = landmarks[key];
        const pipCtx = pipCanvas.getContext('2d');
        if (!pipCtx) return;

        const zoomLevel = 4;
        const sourceSize = pipCanvas.width / zoomLevel;
        pipCtx.fillStyle = 'black';
        pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);
        const imgScaleX = image.naturalWidth / canvas.width;
        const imgScaleY = image.naturalHeight / canvas.height;

        pipCtx.drawImage(image, (pos.x * imgScaleX) - (sourceSize / 2), (pos.y * imgScaleY) - (sourceSize / 2), sourceSize, sourceSize, 0, 0, pipCanvas.width, pipCanvas.height);
        pipCtx.strokeStyle = '#fdd835'; pipCtx.lineWidth = 1; pipCtx.beginPath();
        pipCtx.moveTo(pipCanvas.width / 2, 0); pipCtx.lineTo(pipCanvas.width / 2, pipCanvas.height);
        pipCtx.moveTo(0, pipCanvas.height / 2); pipCtx.lineTo(pipCanvas.width, pipCanvas.height / 2);
        pipCtx.stroke();
    }, [landmarks]);

    // PIP Interaction
    const handlePipStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDraggingPipRef.current = true;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        pipDragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handlePipMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDraggingPipRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const viewer = pipViewerRef.current?.parentElement;
        if (!viewer) return;
        const viewerRect = viewer.getBoundingClientRect();
        const pipSize = 128;
        let newX = clientX - viewerRect.left - pipDragOffset.current.x;
        let newY = clientY - viewerRect.top - pipDragOffset.current.y;
        newX = Math.max(10, Math.min(newX, viewerRect.width - pipSize - 10));
        newY = Math.max(10, Math.min(newY, viewerRect.height - pipSize - 10));
        setPipPosition({ x: newX, y: newY });
    }, []);

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
            // Calculate aHKA and JLO
            newResults.ahka = newResults.mpta - newResults.ldfa;
            newResults.jlo = newResults.mpta + newResults.ldfa;

            newResults.cpak = getLongLegCpakType(newResults.ahka, newResults.jlo);

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
            ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(femurAxisPoint.x, femurAxisPoint.y); ctx.lineTo(jointCenter.x, jointCenter.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(femurAxisPoint.x, femurAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
        }
        if (visibleLandmarkSets.has('tibiaAnatomicAxis') && tibiaAxisPoint && jointCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.tibiaAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.tibiaAnatomicAxis; ctx.lineWidth = 3;
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

    // Handle Reset
    const handleResetAll = () => {
        if (canvasRef.current) resetLandmarks(canvasRef.current);
        setVisibleLandmarkSets(new Set());
        setResults({ obliquity: null, ldfa: null, mpta: null, femurType: '--', femurTypeByObliquity: '--', cpak: '--', cut: '--' }); // Reset results
    };


    // Update getCanvasPos to account for DPR and Scale
    const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
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
        updatePip();
    }, [updatePip]);

    const handleMouseUp = useCallback(() => { draggingPointRef.current = null; }, []);

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
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
        updatePip();
    }, [updatePip]);

    const handleTouchEnd = useCallback(() => {
        draggingPointRef.current = null;
    }, []);

    useEffect(() => {
        // Mouse
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handlePipMove);
        window.addEventListener('mouseup', () => { isDraggingPipRef.current = false; });

        // Touch
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
        window.addEventListener('touchmove', handlePipMove, { passive: false });
        window.addEventListener('touchend', () => { isDraggingPipRef.current = false; });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handlePipMove);

            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
            window.removeEventListener('touchmove', handlePipMove);
        };
    }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd, handlePipMove]);

    const toggleLandmarkSet = (setName: keyof typeof landmarkInstructions) => {
        const newSets = new Set(visibleLandmarkSets);
        newSets.has(setName) ? newSets.delete(setName) : newSets.add(setName);
        setVisibleLandmarkSets(newSets);
    };

    return (
        <div className="relative flex flex-col h-full rounded-lg">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-grow h-full min-h-0">
                {/* Viewer - Left side (75%) */}
                <div className="lg:col-span-3 relative w-full h-full bg-black border border-[#333333] rounded-lg flex items-center justify-center overflow-hidden order-1 lg:order-none">
                    {postOpValgusImage ? (<>
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                ref={imageRef}
                                src={postOpValgusImage}
                                className="block max-w-full max-h-full object-contain"
                                alt=""
                            />
                            <canvas
                                ref={canvasRef}
                                className="absolute cursor-crosshair touch-none inset-0 m-auto"
                                style={{ touchAction: 'none' }}
                                onMouseDown={handleMouseDown}
                                onTouchStart={handleTouchStart}
                            />
                        </div>
                        <div ref={pipViewerRef} onMouseDown={handlePipStart}
                            onTouchStart={handlePipStart} className="absolute w-24 h-24 border-2 border-dark-maroon bg-black rounded-full cursor-grab active:cursor-grabbing shadow-lg top-2 right-2 z-10" style={{ top: `${pipPosition.y}px`, left: `${pipPosition.x}px` }}>
                            <canvas ref={pipCanvasRef} width="128" height="128" className="rounded-full w-full h-full"></canvas>
                        </div>
                    </>) : <div className="flex flex-col items-center justify-center text-gray-500 opacity-60">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Upload Post-Op X-Ray</p>
                    </div>}
                </div>

                {/* Controls - Right side (25%) */}
                <div className="lg:col-span-1 flex flex-col space-y-2 h-full overflow-y-auto pr-1 order-2 lg:order-none">
                    <div className="shrink-0">
                        <h4 className="text-sm font-semibold text-[#E0E0E0] mb-1">Post-Op Image</h4>
                        <label htmlFor="postop-xray-upload" className="cursor-pointer text-center p-1.5 rounded-sm font-bold text-xs bg-[#6D282C] border border-[#893338] hover:bg-[#893338] text-white tracking-wider block transition shadow-sm">
                            UPLOAD X-RAY
                        </label>
                        <input type="file" id="postop-xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <span className="text-[10px] text-gray-500 truncate mt-0.5 inline-block w-full">{fileName}</span>
                        <p className="text-gray-500 text-[10px]">Side: <span className="text-[#E0E0E0] font-bold uppercase">{legSide}</span></p>
                    </div>

                    <div className="flex-grow flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-semibold text-[#E0E0E0]">Markings</h4>
                            <button onClick={handleResetAll} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold tracking-wider">Reset</button>
                        </div>
                        <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {Object.keys(landmarkInstructions).map((key) => (
                                <button key={key} onClick={() => toggleLandmarkSet(key as any)} className={`w-full text-left py-1.5 px-2 rounded-sm font-semibold text-xs border ${visibleLandmarkSets.has(key) ? 'bg-[#6D282C] border-[#893338] text-white shadow-sm' : 'bg-[#252525] border-[#333333] text-gray-400 hover:bg-[#333333]'}`}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="shrink-0 grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-[#333333]">
                        <ResultItem label="Obliquity" value={results.obliquity != null ? results.obliquity.toFixed(1) + '°' : '--'} />
                        <ResultItem label="LDFA" value={results.ldfa != null ? results.ldfa.toFixed(1) + '°' : '--'} />
                        <ResultItem label="MPTA" value={results.mpta != null ? results.mpta.toFixed(1) + '°' : '--'} />
                        <ResultItem label="aHKA" value={results.ahka != null ? results.ahka.toFixed(1) + '°' : '--'} />
                        <ResultItem label="JLO" value={results.jlo != null ? results.jlo.toFixed(1) + '°' : '--'} />
                        <ResultItem label="CPAK" value={results.cpak ?? '--'} />
                        <div className="col-span-2 space-y-1">
                            <ResultItem label="Femur (LDFA)" value={results.femurType ?? '--'} />
                            <ResultItem label="Femur (Obliquity)" value={results.femurTypeByObliquity ?? '--'} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResultItem: React.FC<{ label: string; value: string | number | null; large?: boolean }> = ({ label, value, large = false }) => {
    const displayValue = String(value ?? '--');
    const isLong = displayValue.length > 10;
    const isVeryLong = displayValue.length > 20;

    return (
        <div className="bg-[#252525] p-2 rounded-lg border border-[#6D282C]/50">
            <p className="text-[10px] text-[#ff8fa3] font-bold uppercase whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
            <p className={`font-bold text-[#ff8fa3] ${large ? 'text-2xl' : (isVeryLong ? 'text-[10px] leading-tight' : (isLong ? 'text-xs' : 'text-lg'))} truncate`} title={displayValue}>
                {displayValue}
            </p>
        </div>
    );
};

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

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-[30fr_70fr] gap-4 min-h-0 px-4 pb-4 relative z-10">
                {/* Column 1: Pre-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg flex flex-col min-h-0 overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-xl font-bold text-center mb-2 text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-1 rounded relative z-10">Pre-Op Analysis</h3>
                    <div className="w-full flex-grow bg-black rounded-lg mb-2 flex items-center justify-center overflow-hidden border border-[#333333] relative z-10">
                        {valgusCanvasDataUrl ?
                            <img src={valgusCanvasDataUrl} alt="Pre-op Analysis" className="max-w-full max-h-full object-contain" /> :
                            <p className="text-sm text-gray-500 italic">No pre-op image available.</p>
                        }
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2 text-center relative z-10 shrink-0">
                        <ResultItem label="Obliquity" value={valgusResults.obliquity != null ? valgusResults.obliquity.toFixed(1) + '°' : '--'} />
                        <ResultItem label="CPAK" value={valgusResults.cpak} />
                        <ResultItem label="Femur (LDFA)" value={valgusResults.femurType} />
                        <ResultItem label="Femur (Obliquity)" value={valgusResults.femurTypeByObliquity} />
                    </div>
                </div>

                {/* Column 2: Post-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg flex flex-col min-h-0 overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-xl font-bold text-center mb-2 text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-1 rounded relative z-10">Post-Op Verification</h3>
                    <div className="flex-grow min-h-0 relative">
                        <PostOpValgusPlanner />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PastCaseValgusResultPage;
