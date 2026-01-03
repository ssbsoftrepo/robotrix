
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, LongLegResults, Point, LegSide } from '../types';

// --- Helper Functions ---
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

const HANDLE_RADIUS = 3.5; // Reduced for smaller view
const LANDMARK_COLORS = {
    hkaLine: '#89CFF0',
    femurAnatomicAxis: '#F08080',
    femoralJointLine: '#98FB98',
    tibialJointLine: '#FFD700',
};
const landmarkInstructions = {
    hkaLine: ["Mark hip center.", "Mark knee center.", "Mark ankle center."],
    femurAnatomicAxis: ["Mark a point along the mid-diapheal canal.", "Along the mid shaft of femur."],
    femoralJointLine: ["Mark the most distal part of medial (M) condyle.", "Mark the most distal part of lateral (L) condyle."],
    tibialJointLine: ["Mark the lowest center point of medial (M) condyle.", "Mark the lowest center point of lateral (L) condyle."],
};


const PostOpPlanner: React.FC = () => {
    const {
        ldfaMode,
        legSide: preOpLegSide,
        postOpLongLegImage,
        setPostOpLongLegImage,
        postOpLongLegLandmarks: landmarks,
        setPostOpLongLegLandmarks: setLandmarks,
        postOpLongLegResults: results,
        setPostOpLongLegResults: setResults
    } = useAppContext();

    const [fileName, setFileName] = useState('No file chosen');
    const [legSide, setLegSide] = useState<LegSide>(preOpLegSide);

    // Removed local state definitions for landmarks and results as they are now mapped to context
    const [visibleLandmarkSets, setVisibleLandmarkSets] = useState<Set<string>>(new Set());
    const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });

    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pipCanvasRef = useRef<HTMLCanvasElement>(null);
    const pipViewerRef = useRef<HTMLDivElement>(null);

    const draggingPointRef = useRef<string | null>(null);
    const isDraggingPipRef = useRef(false);
    const pipDragOffset = useRef({ x: 0, y: 0 });
    const localResultsRef = useRef(results);
    const justAdjustedHipRef = useRef(false);

    useEffect(() => { localResultsRef.current = results; }, [results]);

    // Restore visibleLandmarkSets from existing landmarks
    useEffect(() => {
        const newSets = new Set<string>();
        if (landmarks.hipCenter || landmarks.kneeCenter || landmarks.ankleCenter) newSets.add('hkaLine');
        if (landmarks.femurAnatomicAxisPoint) newSets.add('femurAnatomicAxis');
        if (landmarks.femoralMedial || landmarks.femoralLateral) newSets.add('femoralJointLine');
        if (landmarks.tibialMedial || landmarks.tibialLateral) newSets.add('tibialJointLine');
        if (newSets.size > 0) {
            setVisibleLandmarkSets(newSets);
        }
    }, []); // Run only on mount to restore state

    useEffect(() => {
        if (ldfaMode !== 'corrected') return;
        if (justAdjustedHipRef.current) { justAdjustedHipRef.current = false; return; }

        const femurAnatomicPoint = landmarks.femurAnatomicAxisPoint;
        if (femurAnatomicPoint && visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femurAnatomicAxis')) {
            const { kneeCenter, hipCenter } = landmarks;
            if (!kneeCenter || !hipCenter) return;
            const TARGET_VCA_DEG = 4;
            const TARGET_VCA_RAD = TARGET_VCA_DEG * (Math.PI / 180);
            const V_anatomic = { x: femurAnatomicPoint.x - kneeCenter.x, y: femurAnatomicPoint.y - kneeCenter.y };
            const angle_anatomic = Math.atan2(V_anatomic.x, -V_anatomic.y);
            const rotationDirection = legSide === 'left' ? -1 : 1;
            const angle_mech = angle_anatomic + (rotationDirection * TARGET_VCA_RAD);
            const kneeToHipY = hipCenter.y - kneeCenter.y;
            const newKneeToHipX = -kneeToHipY * Math.tan(angle_mech);
            const newHipX = kneeCenter.x + newKneeToHipX;
            if (Math.abs(newHipX - hipCenter.x) > 0.5) {
                justAdjustedHipRef.current = true;
                setLandmarks(prev => ({ ...prev, hipCenter: { x: newHipX, y: hipCenter.y } }));
            }
        }
    }, [landmarks, visibleLandmarkSets, legSide, ldfaMode]);

    const resetLandmarks = useCallback((canvas: HTMLCanvasElement) => {
        const w = canvas.width; const h = canvas.height;
        const isLeft = legSide === 'left';
        const initialLandmarks = {
            hipCenter: { x: w * 0.5, y: h * 0.1 },
            kneeCenter: { x: w * 0.5, y: h * 0.5 },
            ankleCenter: { x: w * 0.5, y: h * 0.9 },
            femurAnatomicAxisPoint: { x: w * 0.5, y: h * 0.25 },
            femoralMedial: { x: isLeft ? w * 0.45 : w * 0.55, y: h * 0.55 },
            femoralLateral: { x: isLeft ? w * 0.55 : w * 0.45, y: h * 0.55 },
            tibialMedial: { x: isLeft ? w * 0.45 : w * 0.55, y: h * 0.6 },
            tibialLateral: { x: isLeft ? w * 0.55 : w * 0.45, y: h * 0.6 },
        };
        setLandmarks(initialLandmarks);
    }, [legSide]);

    const updateCalculations = useCallback(() => {
        const { hipCenter, kneeCenter, ankleCenter, femurAnatomicAxisPoint, femoralMedial, femoralLateral, tibialMedial, tibialLateral } = landmarks;
        if (!hipCenter || !kneeCenter || !ankleCenter) return;

        let newResults: Partial<LongLegResults> = { ...localResultsRef.current };

        if (visibleLandmarkSets.has('hkaLine')) {
            const femurVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const tibiaVec = { x: ankleCenter.x - kneeCenter.x, y: ankleCenter.y - kneeCenter.y };
            newResults.mhka = 180 - angleBetweenVectors(femurVec, tibiaVec);
        }
        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femurAnatomicAxis') && femurAnatomicAxisPoint) {
            const mechAxisVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const anatomicAxisVec = { x: femurAnatomicAxisPoint.x - kneeCenter.x, y: femurAnatomicAxisPoint.y - kneeCenter.y };
            newResults.vca = angleBetweenVectors(mechAxisVec, anatomicAxisVec);
        }
        if (visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femoralJointLine') && femoralMedial && femoralLateral) {
            const isLeftKnee = legSide === 'left';
            const medialFemoralCondyle = (isLeftKnee ? femoralMedial.x < femoralLateral.x : femoralMedial.x > femoralLateral.x) ? femoralMedial : femoralLateral;
            const lateralFemoralCondyle = (isLeftKnee ? femoralMedial.x > femoralLateral.x : femoralMedial.x < femoralLateral.x) ? femoralMedial : femoralLateral;
            const femoralAxisVec = { x: kneeCenter.x - hipCenter.x, y: kneeCenter.y - hipCenter.y };
            let femoralJointLineVec;
            if (legSide === 'left') {
                femoralJointLineVec = { x: lateralFemoralCondyle.x - medialFemoralCondyle.x, y: lateralFemoralCondyle.y - medialFemoralCondyle.y };
            } else {
                femoralJointLineVec = { x: medialFemoralCondyle.x - lateralFemoralCondyle.x, y: medialFemoralCondyle.y - lateralFemoralCondyle.y };
            }
            newResults.ldfa = angleBetweenVectors(femoralAxisVec, femoralJointLineVec);
        }
        if (visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('tibialJointLine') && tibialMedial && tibialLateral) {
            const isLeftKnee = legSide === 'left';
            const medialTibialCondyle = (isLeftKnee ? tibialMedial.x < tibialLateral.x : tibialMedial.x > tibialLateral.x) ? tibialMedial : tibialLateral;
            const lateralTibialCondyle = (isLeftKnee ? tibialMedial.x > tibialLateral.x : tibialMedial.x < tibialLateral.x) ? tibialMedial : tibialLateral;
            const tibialAxisVec = { x: ankleCenter.x - kneeCenter.x, y: ankleCenter.y - kneeCenter.y };
            const tibialJointLineVec = { x: medialTibialCondyle.x - lateralTibialCondyle.x, y: medialTibialCondyle.y - lateralTibialCondyle.y };
            newResults.mpta = angleBetweenVectors(tibialAxisVec, tibialJointLineVec);
        }

        if (newResults.ldfa != null && newResults.mpta != null) {
            const ahka = newResults.mpta - newResults.ldfa;
            const jlo = newResults.mpta + newResults.ldfa;
            let jloType = '--';
            if (jlo < 177) { jloType = 'APEX DISTAL'; }
            else if (jlo > 183) { jloType = 'APEX PROXIMAL'; }
            else { jloType = 'APEX NEUTRAL'; }
            newResults.jloType = jloType;
            newResults.jlo = jlo;
            newResults.cpak = getLongLegCpakType(ahka, jlo);
        }
        setResults(newResults);
    }, [landmarks, visibleLandmarkSets, legSide, ldfaMode]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || Object.keys(landmarks).length === 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 12px Roboto, sans-serif'; // Reduced font size
        const { hipCenter, kneeCenter, ankleCenter, femurAnatomicAxisPoint, femoralMedial, femoralLateral, tibialMedial, tibialLateral } = landmarks;

        const drawTextWithBackground = (text: string, x: number, y: number) => {
            ctx.fillStyle = 'rgba(29, 29, 31, 0.8)';
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            ctx.fillRect(x - textWidth / 2 - 4, y - 16, textWidth + 8, 20); // Scaled down box
            ctx.fillStyle = 'white';
            ctx.fillText(text, x - textWidth / 2, y);
        };

        if (visibleLandmarkSets.has('hkaLine') && hipCenter && kneeCenter && ankleCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.hkaLine; ctx.fillStyle = LANDMARK_COLORS.hkaLine; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(hipCenter.x, hipCenter.y); ctx.lineTo(kneeCenter.x, kneeCenter.y); ctx.lineTo(ankleCenter.x, ankleCenter.y); ctx.stroke();
            [hipCenter, kneeCenter, ankleCenter].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); });
            if (localResultsRef.current.mhka != null) drawTextWithBackground(`mHKA: ${localResultsRef.current.mhka.toFixed(1)}°`, kneeCenter.x, kneeCenter.y - 30);
        }
        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('femurAnatomicAxis') && femurAnatomicAxisPoint && kneeCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y); ctx.lineTo(kneeCenter.x, kneeCenter.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
        }
        if (visibleLandmarkSets.has('femoralJointLine') && femoralMedial && femoralLateral) {
            ctx.strokeStyle = LANDMARK_COLORS.femoralJointLine; ctx.fillStyle = LANDMARK_COLORS.femoralJointLine; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(femoralMedial.x, femoralMedial.y); ctx.lineTo(femoralLateral.x, femoralLateral.y); ctx.stroke();
            [femoralMedial, femoralLateral].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); });
            if (visibleLandmarkSets.has('hkaLine') && localResultsRef.current.ldfa != null) drawTextWithBackground(`LDFA: ${localResultsRef.current.ldfa.toFixed(1)}°`, kneeCenter.x, kneeCenter.y - 60);
        }
        if (visibleLandmarkSets.has('tibialJointLine') && tibialMedial && tibialLateral) {
            ctx.strokeStyle = LANDMARK_COLORS.tibialJointLine; ctx.fillStyle = LANDMARK_COLORS.tibialJointLine; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tibialMedial.x, tibialMedial.y); ctx.lineTo(tibialLateral.x, tibialLateral.y); ctx.stroke();
            [tibialMedial, tibialLateral].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); });
            if (visibleLandmarkSets.has('hkaLine') && localResultsRef.current.mpta != null) drawTextWithBackground(`MPTA: ${localResultsRef.current.mpta.toFixed(1)}°`, kneeCenter.x, kneeCenter.y + 40);
        }
        updateCalculations();
    }, [landmarks, visibleLandmarkSets, ldfaMode, legSide, updateCalculations]);

    useEffect(() => { draw(); }, [draw]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setPostOpLongLegImage(event.target.result as string);
                    setFileName(file.name);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

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

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
        const hitRadiusSq = (HANDLE_RADIUS + 5) ** 2;
        let minDistSq = hitRadiusSq;
        let closestKey: string | null = null;
        for (const key in landmarks) {
            const landmarkPoint = landmarks[key];
            if (landmarkPoint) {
                const distSq = (landmarkPoint.x - pos.x) ** 2 + (landmarkPoint.y - pos.y) ** 2;
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
        if (!draggingPointRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const pos = getCanvasPos(canvas, e.clientX, e.clientY);
        setLandmarks(prev => ({ ...prev, [draggingPointRef.current!]: pos }));
        updatePip();
    }, [updatePip]);

    const handleMouseUp = useCallback(() => { draggingPointRef.current = null; }, []);

    const handlePipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDraggingPipRef.current = true;
        const pipRect = e.currentTarget.getBoundingClientRect();
        pipDragOffset.current = { x: e.clientX - pipRect.left, y: e.clientY - pipRect.top };
        e.preventDefault();
    };
    const handlePipMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingPipRef.current) return;
        const viewer = pipViewerRef.current?.parentElement;
        if (!viewer) return;
        const viewerRect = viewer.getBoundingClientRect();
        let newX = e.clientX - viewerRect.left - pipDragOffset.current.x;
        let newY = e.clientY - viewerRect.top - pipDragOffset.current.y;
        const pipWidth = pipViewerRef.current?.offsetWidth || 160;
        const pipHeight = pipViewerRef.current?.offsetHeight || 160;
        newX = Math.max(0, Math.min(newX, viewerRect.width - pipWidth));
        newY = Math.max(0, Math.min(newY, viewerRect.height - pipHeight));
        setPipPosition({ x: newX, y: newY });
    }, []);
    const handlePipMouseUp = useCallback(() => { isDraggingPipRef.current = false; }, []);

    // TOUCH SUPPORT — LANDMARK DRAGGING
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
        const hitRadiusSq = (HANDLE_RADIUS + 12) ** 2; // Larger for fingers
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
        if (!draggingPointRef.current) return;
        e.preventDefault(); // Critical: stops scroll

        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
        setLandmarks(prev => ({ ...prev, [draggingPointRef.current!]: pos }));
        updatePip();
    }, [updatePip]);

    const handleTouchEnd = useCallback(() => {
        draggingPointRef.current = null;
    }, []);

    // TOUCH SUPPORT — PIP DRAGGING (Unified)
    const handlePipStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDraggingPipRef.current = true;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        pipDragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
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
        if (newSets.has(setName)) newSets.delete(setName);
        else newSets.add(setName);
        setVisibleLandmarkSets(newSets);
    };

    const landmarkButtons = [
        { key: 'hkaLine', text: 'HKA Line' },
        { key: 'femurAnatomicAxis', text: 'Femur Anatomic Axis', mode: 'corrected' },
        { key: 'femoralJointLine', text: 'Femoral Joint Line' },
        { key: 'tibialJointLine', text: 'Tibial Joint Line' },
    ];

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg p-2">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-grow h-full">
                {/* Controls - Left side of right column */}
                <div className="lg:col-span-1 flex flex-col space-y-3">
                    <div>
                        <h4 className="text-lg font-semibold text-gray-300 mb-1">Upload Post-Op</h4>
                        <label htmlFor="postop-xray-upload" className="cursor-pointer text-center p-2 rounded-lg font-semibold text-sm bg-[#2a2b2c] border border-[#5f6368] hover:bg-[#6D282C] block">
                            Choose File
                        </label>
                        <input type="file" id="postop-xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <span className="text-xs text-gray-400 truncate mt-1 inline-block">{fileName}</span>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-gray-300 mb-1">Leg Side</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setLegSide('left')} className={`py-2 px-2 rounded-lg font-semibold text-sm border ${legSide === 'left' ? 'bg-[#6D282C] text-white border-[#893338]' : 'bg-[#2a2b2c] border-[#5f6368]'}`}>Left</button>
                            <button onClick={() => setLegSide('right')} className={`py-2 px-2 rounded-lg font-semibold text-sm border ${legSide === 'right' ? 'bg-[#6D282C] text-white border-[#893338]' : 'bg-[#2a2b2c] border-[#5f6368]'}`}>Right</button>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-gray-300 mb-1">Mark Landmarks</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {landmarkButtons.map((btn) => {
                                if ((btn.mode as string) && btn.mode !== ldfaMode) return null;
                                const isSelected = visibleLandmarkSets.has(btn.key);
                                return <button key={btn.key} onClick={() => toggleLandmarkSet(btn.key as any)} className={`py-2 px-3 rounded-lg font-semibold text-sm transition text-left ${isSelected ? 'bg-[#6D282C] text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{btn.text}</button>
                            })}
                        </div>
                    </div>
                </div>

                {/* Viewer - Right side of right column */}
                <div className="lg:col-span-3 relative w-full min-h-[400px] bg-black rounded-lg flex items-center justify-center overflow-hidden">
                    {postOpLongLegImage ? (
                        <>
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img ref={imageRef} src={postOpLongLegImage} alt="Post-op X-ray" className="block max-w-full max-h-full object-contain"
                                    onLoad={(e) => {
                                        const canvas = canvasRef.current;
                                        const image = imageRef.current;
                                        if (canvas && image) {
                                            const ar = image.naturalWidth / image.naturalHeight;
                                            const viewer = canvas.parentElement;
                                            if (viewer) {
                                                let newWidth = viewer.clientWidth;
                                                let newHeight = newWidth / ar;
                                                if (newHeight > viewer.clientHeight) {
                                                    newHeight = viewer.clientHeight;
                                                    newWidth = newHeight * ar;
                                                }
                                                canvas.width = newWidth; canvas.height = newHeight;
                                                image.style.width = `${newWidth}px`; image.style.height = `${newHeight}px`;
                                                if (Object.keys(landmarks).length === 0) resetLandmarks(canvas);
                                            }
                                        }
                                    }}
                                />
                                <canvas ref={canvasRef} onTouchStart={handleTouchStart} className="absolute cursor-crosshair" onMouseDown={handleMouseDown} />
                            </div>
                            <div ref={pipViewerRef} onMouseDown={handlePipStart}
                                onTouchStart={handlePipStart} className="absolute w-32 h-32 border-2 border-dark-maroon bg-black rounded-full cursor-grab active:cursor-grabbing shadow-lg top-2 right-2 z-10" style={{ top: `${pipPosition.y}px`, left: `${pipPosition.x}px` }}>
                                <canvas ref={pipCanvasRef} width="128" height="128" className="rounded-full"></canvas>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500 text-center p-4 text-sm">Upload a post-op X-ray to begin analysis.</p>
                    )}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <p className="text-sm text-yellow-500 font-bold uppercase">Post-Op CPAK</p>
                    <p className="font-bold text-3xl text-yellow-400">CPAK {results.cpak ?? '--'}</p>
                </div>
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <p className="text-sm text-yellow-500 font-bold uppercase">Post-Op JLO</p>
                    <p className="font-bold text-3xl text-yellow-400">{results.jloType ?? '--'}</p>
                </div>
            </div>
        </div>
    )
}

const PastCaseResultPage: React.FC = () => {
    const { setPage, longLegCanvasDataUrl, longLegResults } = useAppContext();

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="text-4xl font-bold">Long Leg Result Verification</h2>
                <button onClick={() => setPage('case-management')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition text-lg">&larr; Back to Cases</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
                {/* Column 1: Pre-op */}
                <div className="gemini-dark-card p-4 rounded-lg flex flex-col h-full border-2 border-gray-700">
                    <h3 className="text-2xl font-bold text-center mb-4 text-gray-200 uppercase tracking-wider bg-gray-800/50 py-2 rounded">Pre-Op Analysis</h3>
                    <div className="w-full flex-grow bg-black rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-gray-800">
                        {longLegCanvasDataUrl ?
                            <img src={longLegCanvasDataUrl} alt="Pre-op Analysis" className="max-w-full max-h-full object-contain" /> :
                            <p className="text-gray-500 italic">No pre-op image available.</p>
                        }
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-4 text-center">
                        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                            <p className="text-sm text-yellow-500 font-bold uppercase">Pre-Op CPAK</p>
                            <p className="font-bold text-3xl text-yellow-400">CPAK {longLegResults.cpak}</p>
                        </div>
                        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                            <p className="text-sm text-yellow-500 font-bold uppercase">Pre-Op JLO</p>
                            <p className="font-bold text-3xl text-yellow-400">{longLegResults.jloType}</p>
                        </div>
                    </div>
                </div>

                {/* Column 2: Post-op */}
                <div className="gemini-dark-card p-4 rounded-lg flex flex-col h-full border-2 border-gray-700 bg-gray-800/30">
                    <h3 className="text-2xl font-bold text-center mb-4 text-gray-200 uppercase tracking-wider bg-gray-800/50 py-2 rounded">Post-Op Verification</h3>
                    <div className="flex-grow">
                        <PostOpPlanner />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PastCaseResultPage;
