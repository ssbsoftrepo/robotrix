
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

const BASE_HANDLE_RADIUS = 6;
const BASE_LINE_WIDTH = 4;
const LANDMARK_COLORS = {
    hkaLine: '#FF3B30',      // Bright Red
    femurAnatomicAxis: '#34C759', // Bright Green
    femoralJointLine: '#007AFF',  // Bright Blue
    tibialJointLine: '#FFD60A',   // Bright Yellow
};
const landmarkInstructions = {
    hkaLine: ["Mark hip center.", "Mark knee center.", "Mark ankle center."],
    femurAnatomicAxis: ["Mark a point along the mid-diapheal canal.", "Along the mid shaft of femur."],
    femoralJointLine: ["Mark the most distal part of medial (M) condyle.", "Mark the most distal part of lateral (L) condyle."],
    tibialJointLine: ["Mark the lowest center point of medial (M) condyle.", "Mark the lowest center point of lateral (L) condyle."],
};

import ReactDOM from 'react-dom';

// ... (existing imports)

// --- CAMERA MODAL ---
const CameraModal: React.FC<{
    isOpen: boolean; onClose: () => void; onCapture: (dataUrl: string) => void;
}> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cropRect, setCropRect] = useState({ x: 10, y: 10, width: 80, height: 80 });
    const cropBoxRef = useRef<HTMLDivElement>(null);
    const [activeInteraction, setActiveInteraction] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.load();
        }
    }, []);

    useEffect(() => {
        return () => {
            if (capturedImage && capturedImage.startsWith('blob:')) URL.revokeObjectURL(capturedImage);
            stopCamera();
        };
    }, [capturedImage, stopCamera]);

    const handleClose = useCallback(() => {
        if (capturedImage && capturedImage.startsWith('blob:')) URL.revokeObjectURL(capturedImage);
        setCapturedImage(null);
        stopCamera();
        onClose();
    }, [capturedImage, onClose, stopCamera]);

    useEffect(() => {
        if (isOpen && !capturedImage) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
                        videoRef.current.onloadedmetadata = () => {
                            if (overlayRef.current && videoRef.current) {
                                overlayRef.current.width = videoRef.current.videoWidth;
                                overlayRef.current.height = videoRef.current.videoHeight;
                                const ctx = overlayRef.current.getContext('2d');
                                if (ctx) {
                                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                                    ctx.lineWidth = 1;
                                    ctx.beginPath();
                                    ctx.moveTo(ctx.canvas.width / 2, 0); ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
                                    ctx.moveTo(0, ctx.canvas.height / 2); ctx.lineTo(ctx.canvas.width, ctx.canvas.height / 2);
                                    ctx.stroke();
                                }
                            }
                        };
                    }
                })
                .catch(err => { console.error("Error accessing camera: ", err); onClose(); });
        }
    }, [isOpen, capturedImage, onClose]);

    const handleCapture = async () => {
        const video = videoRef.current;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            try {
                if (video.paused) await video.play();
                let attempts = 0;
                while ((video.readyState < 2 || video.currentTime === 0) && attempts < 10) { await new Promise(resolve => setTimeout(resolve, 50)); attempts++; }
                await new Promise(resolve => setTimeout(resolve, 200));
                const canvas = document.createElement('canvas');
                const MAX_DIM = 1024;
                let w = video.videoWidth; let h = video.videoHeight;
                if (w > MAX_DIM || h > MAX_DIM) { const scale = MAX_DIM / Math.max(w, h); w *= scale; h *= scale; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, w, h);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            if (capturedImage && capturedImage.startsWith('blob:')) URL.revokeObjectURL(capturedImage);
                            setCapturedImage(URL.createObjectURL(blob));
                            stopCamera();
                        }
                    }, 'image/jpeg', 0.85);
                }
            } catch (err) { console.error("Capture failed:", err); }
        }
    };

    const handleCropSave = () => {
        if (capturedImage) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const fullW = img.naturalWidth; const fullH = img.naturalHeight;
                const scaleX = fullW / 100; const scaleY = fullH / 100;
                const cropW = cropRect.width * scaleX; const cropH = cropRect.height * scaleY;
                canvas.width = cropW; canvas.height = cropH;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, cropRect.x * scaleX, cropRect.y * scaleY, cropW, cropH, 0, 0, cropW, cropH);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const reader = new FileReader();
                            reader.onloadend = () => { onCapture(reader.result as string); handleClose(); };
                            reader.readAsDataURL(blob);
                        }
                    }, 'image/jpeg', 0.9);
                }
            };
            img.src = capturedImage;
        }
    };

    const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent, interaction: string) => {
        e.stopPropagation(); setActiveInteraction(interaction);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX, y: clientY });
    };

    const handleCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!activeInteraction) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const container = cropBoxRef.current?.parentElement;
        if (!container) return;
        const dx = ((clientX - dragStart.x) / container.clientWidth) * 100;
        const dy = ((clientY - dragStart.y) / container.clientHeight) * 100;
        setCropRect(prev => {
            let next = { ...prev };
            if (activeInteraction === 'move') {
                next.x = Math.max(0, Math.min(100 - prev.width, prev.x + dx));
                next.y = Math.max(0, Math.min(100 - prev.height, prev.y + dy));
            } else {
                if (activeInteraction.includes('l')) { next.x = Math.min(prev.x + prev.width - 10, Math.max(0, prev.x + dx)); next.width = prev.width + (prev.x - next.x); }
                if (activeInteraction.includes('r')) next.width = Math.max(10, Math.min(100 - prev.x, prev.width + dx));
                if (activeInteraction.includes('t')) { next.y = Math.min(prev.y + prev.height - 10, Math.max(0, prev.y + dy)); next.height = prev.height + (prev.y - next.y); }
                if (activeInteraction.includes('b')) next.height = Math.max(10, Math.min(100 - prev.y, prev.height + dy));
            }
            return next;
        });
        setDragStart({ x: clientX, y: clientY });
    };

    const handleTouch = (action: () => void) => (e: React.TouchEvent) => {
        e.preventDefault();
        action();
    };

    if (!isOpen || !mounted) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#1e1f20] border border-[#6D282C] p-4 rounded-lg relative w-full max-w-3xl text-center shadow-2xl">
                {!capturedImage ? (
                    <>
                        <h3 className="text-xl font-semibold mb-4 uppercase">Live Capture with Alignment Grid</h3>
                        <div className="relative inline-block border-2 border-[#6D282C]">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto rounded"></video>
                            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full"></canvas>
                        </div>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button onClick={handleCapture} onTouchEnd={handleTouch(handleCapture)} className="relative px-8 py-3 bg-[#6D282C] border border-[#893338] rounded-sm shadow-[0_4px_20px_rgba(109,40,44,0.4)] transition-all duration-300 ease-out hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] active:scale-[0.98] text-white font-bold tracking-wide">Capture</button>
                            <button onClick={handleClose} onTouchEnd={handleTouch(handleClose)} className="relative px-8 py-3 bg-[#2a2b2c] border border-[#5f6368] rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:bg-[#3a3b3c] hover:border-[#777] active:scale-[0.98] text-white font-bold tracking-wide">Cancel</button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-semibold mb-4 uppercase">Crop Captured Image</h3>
                        <div className="relative inline-block border-2 border-[#893338] overflow-hidden select-none touch-none" onMouseMove={handleCropMouseMove} onTouchMove={handleCropMouseMove} onMouseUp={() => setActiveInteraction(null)} onTouchEnd={() => setActiveInteraction(null)}>
                            <img src={capturedImage} alt="Captured" className="w-full h-auto pointer-events-none" />
                            <div ref={cropBoxRef} onMouseDown={(e) => handleCropMouseDown(e, 'move')} onTouchStart={(e) => handleCropMouseDown(e, 'move')} className="absolute border-2 border-dashed border-white bg-white/20 cursor-move" style={{ left: `${cropRect.x}%`, top: `${cropRect.y}%`, width: `${cropRect.width}%`, height: `${cropRect.height}%` }}>
                                <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#893338] border-2 border-white rounded-full cursor-nw-resize z-50 shadow-md" onMouseDown={(e) => handleCropMouseDown(e, 'tl')} onTouchStart={(e) => handleCropMouseDown(e, 'tl')} />
                                <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#893338] border-2 border-white rounded-full cursor-ne-resize z-50 shadow-md" onMouseDown={(e) => handleCropMouseDown(e, 'tr')} onTouchStart={(e) => handleCropMouseDown(e, 'tr')} />
                                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#893338] border-2 border-white rounded-full cursor-sw-resize z-50 shadow-md" onMouseDown={(e) => handleCropMouseDown(e, 'bl')} onTouchStart={(e) => handleCropMouseDown(e, 'bl')} />
                                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#893338] border-2 border-white rounded-full cursor-se-resize z-50 shadow-md" onMouseDown={(e) => handleCropMouseDown(e, 'br')} onTouchStart={(e) => handleCropMouseDown(e, 'br')} />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button onClick={handleCropSave} onTouchEnd={handleTouch(handleCropSave)} className="relative px-8 py-3 bg-[#6D282C] border border-[#893338] rounded-sm shadow-[0_4px_20px_rgba(109,40,44,0.4)] transition-all duration-300 ease-out hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] active:scale-[0.98] text-white font-bold tracking-wide">Finalize Crop</button>
                            <button onClick={() => { if (capturedImage?.startsWith('blob:')) URL.revokeObjectURL(capturedImage); setCapturedImage(null); }} onTouchEnd={handleTouch(() => { if (capturedImage?.startsWith('blob:')) URL.revokeObjectURL(capturedImage); setCapturedImage(null); })} className="relative px-8 py-3 bg-[#2a2b2c] border border-[#5f6368] rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:bg-[#3a3b3c] hover:border-[#777] active:scale-[0.98] text-white font-bold tracking-wide">Retake</button>
                            <button onClick={handleClose} onTouchEnd={handleTouch(handleClose)} className="relative px-8 py-3 bg-[#2a2b2c] border border-[#5f6368] rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:bg-[#3a3b3c] hover:border-[#777] active:scale-[0.98] text-white font-bold tracking-wide">Cancel</button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};


const resolveMedialLateral = (
    p1: Point,
    p2: Point,
    kneeCenter: Point,
    legSide: string
) => {
    const isP1Medial =
        legSide === 'right'
            ? p1.x > kneeCenter.x
            : p1.x < kneeCenter.x;

    return {
        medial: isP1Medial ? p1 : p2,
        lateral: isP1Medial ? p2 : p1,
    };
};

const calculateLineAngle = (p1: Point, p2: Point, p3: Point, p4: Point, isLdfa: boolean, legSide: string) => {
    // p1->p2 is the mechanical axis
    const axisVec = { x: p2.x - p1.x, y: p2.y - p1.y };
    // p3->p4 is the joint line (Medial to Lateral)
    const jointVec = { x: p4.x - p3.x, y: p4.y - p3.y };

    const axisAway = { x: -axisVec.x, y: -axisVec.y };
    const sideVec = isLdfa ? jointVec : { x: -jointVec.x, y: -jointVec.y };

    const dot = axisAway.x * sideVec.x + axisAway.y * sideVec.y;
    const mag1 = Math.sqrt(axisAway.x * axisAway.x + axisAway.y * axisAway.y);
    const mag2 = Math.sqrt(sideVec.x * sideVec.x + sideVec.y * sideVec.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    let angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
    return angle;
};

const ResultItem: React.FC<{ label: string; value: string | number | null; large?: boolean }> = ({ label, value, large = false }) => {
    const displayValue = String(value ?? '--');

    return (
        <div className={`bg-[#252525] rounded-lg border border-[#6D282C]/50 ${large ? 'p-1.5' : 'p-1'}`}>
            <p className="text-[9px] text-[#ff8fa3] font-bold uppercase whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
            <p className={`font-bold text-[#ff8fa3] ${large ? 'text-xl' : 'text-xs'} truncate`} title={displayValue}>
                {displayValue}
            </p>
        </div>
    );
};

const PostOpPlanner: React.FC = () => {
    const {
        ldfaMode,
        legSide, // Use global legSide
        postOpLongLegImage,
        setPostOpLongLegImage,
        postOpLongLegLandmarks: landmarks,
        setPostOpLongLegLandmarks: setLandmarks,
        postOpLongLegResults: results,
        setPostOpLongLegResults: setResults
    } = useAppContext();

    const [fileName, setFileName] = useState('No file chosen');

    // Removed local state definitions for landmarks and results as they are now mapped to context
    const [visibleLandmarkSets, setVisibleLandmarkSets] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (landmarks.hipCenter || landmarks.kneeCenter || landmarks.ankleCenter) initial.add('hkaLine');
        if (landmarks.femurAnatomicAxisPoint) initial.add('femurAnatomicAxis');
        if (landmarks.femoralMedial || landmarks.femoralLateral) initial.add('femoralJointLine');
        if (landmarks.tibialMedial || landmarks.tibialLateral) initial.add('tibialJointLine');
        return initial;
    });
    const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pipCanvasRef = useRef<HTMLCanvasElement>(null);
    const pipViewerRef = useRef<HTMLDivElement>(null);

    const draggingPointRef = useRef<string | null>(null);
    const isDraggingPipRef = useRef(false);
    const pipDragOffset = useRef({ x: 0, y: 0 });
    const localResultsRef = useRef(results);
    const justAdjustedHipRef = useRef(false);
    const prevLegSideRef = useRef(legSide);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Zoom and Pan State
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const panOffsetRef = useRef({ x: 0, y: 0 });
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 3;

    // Pinch-to-Zoom Refs
    const initialPinchDistanceRef = useRef<number | null>(null);
    const initialInitialPinchZoomRef = useRef<number>(1);
    const initialPanOffsetRef = useRef({ x: 0, y: 0 });
    const lastResizeTimeRef = useRef(0); // Added for resize throttling

    const zoomIn = () => setZoom(z => Math.min(z + 0.2, MAX_ZOOM));
    const zoomOut = () => setZoom(z => Math.max(z - 0.2, MIN_ZOOM));
    const resetZoom = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

    useEffect(() => { localResultsRef.current = results; }, [results]);

    // visibleLandmarkSets is initialized via lazy initializer in useState above.
    // No syncing useEffect needed — this prevents auto-enable on first visit.

    // Sync landmarks if legSide changes
    useEffect(() => {
        if (prevLegSideRef.current !== legSide) {
            prevLegSideRef.current = legSide;
        }
    }, [legSide]);



    const resetLandmarks = useCallback((canvas: HTMLCanvasElement) => {
        // Use natural dimensions if available
        const w = imageRef.current?.naturalWidth || canvas.width;
        const h = imageRef.current?.naturalHeight || canvas.height;

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
    }, [legSide, setLandmarks]);

    const updateCalculations = useCallback(() => {
        const { hipCenter, kneeCenter, ankleCenter, femurAnatomicAxisPoint, femoralMedial, femoralLateral, tibialMedial, tibialLateral } = landmarks;
        if (!hipCenter || !kneeCenter || !ankleCenter) return;

        let newResults: Partial<LongLegResults> = { ...localResultsRef.current };

        if (visibleLandmarkSets.has('hkaLine')) {
            const femurVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const tibiaVec = { x: ankleCenter.x - kneeCenter.x, y: ankleCenter.y - kneeCenter.y };
            newResults.mhka = 180 - angleBetweenVectors(femurVec, tibiaVec);
        }
        if (visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femurAnatomicAxis') && femurAnatomicAxisPoint) {
            const mechAxisVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const anatomicAxisVec = { x: femurAnatomicAxisPoint.x - kneeCenter.x, y: femurAnatomicAxisPoint.y - kneeCenter.y };
            newResults.ama = angleBetweenVectors(mechAxisVec, anatomicAxisVec);
        } else {
            newResults.ama = null;
        }
        if (visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femoralJointLine') && femoralMedial && femoralLateral) {
            const { medial: trueMedial, lateral: trueLateral } = resolveMedialLateral(femoralMedial, femoralLateral, kneeCenter, legSide);

            // For LDFA
            newResults.ldfa = calculateLineAngle(hipCenter, kneeCenter, trueMedial, trueLateral, true, legSide);
        }
        if (visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('tibialJointLine') && tibialMedial && tibialLateral) {
            const { medial: trueMedial, lateral: trueLateral } = resolveMedialLateral(tibialMedial, tibialLateral, kneeCenter, legSide);

            // For MPTA
            newResults.mpta = calculateLineAngle(ankleCenter, kneeCenter, trueMedial, trueLateral, false, legSide);
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
            newResults.ahka = ahka;
            newResults.cpak = getLongLegCpakType(ahka, jlo);
        }
        setResults(newResults);
    }, [landmarks, visibleLandmarkSets, legSide, ldfaMode]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Canvas is now screen-space (viewer size).
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (Object.keys(landmarks).length === 0) return;

        // Prepare Transform Matrix
        ctx.save();

        // 1. Center
        const dpr = window.devicePixelRatio || 1;
        ctx.translate(canvas.width / (2 * dpr), canvas.height / (2 * dpr));
        // 2. Pan
        ctx.translate(panOffset.x, panOffset.y);
        // 3. Zoom
        ctx.scale(zoom, zoom);
        // 4. Center Image
        // 4. Center Image
        const imgW = parseFloat(image.style.width) || 0;
        const imgH = parseFloat(image.style.height) || 0;
        ctx.translate(-imgW / 2, -imgH / 2);

        // V2: Apply Scale from Natural to Display
        const scaleX = image.naturalWidth ? imgW / image.naturalWidth : 1;
        const scaleY = image.naturalHeight ? imgH / image.naturalHeight : 1;
        ctx.scale(scaleX, scaleY);

        const scaledRadius = BASE_HANDLE_RADIUS / (zoom * scaleX);
        const scaledLineWidth = BASE_LINE_WIDTH / (zoom * scaleX);
        const scaledFontSize = 16 / (zoom * scaleX);

        ctx.font = `bold ${scaledFontSize}px Roboto, sans-serif`;

        const { hipCenter, kneeCenter, ankleCenter, femurAnatomicAxisPoint, femoralMedial, femoralLateral, tibialMedial, tibialLateral } = landmarks;

        if (visibleLandmarkSets.has('hkaLine') && hipCenter && kneeCenter && ankleCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.hkaLine; ctx.fillStyle = LANDMARK_COLORS.hkaLine; ctx.lineWidth = scaledLineWidth;
            ctx.beginPath(); ctx.moveTo(hipCenter.x, hipCenter.y); ctx.lineTo(kneeCenter.x, kneeCenter.y); ctx.lineTo(ankleCenter.x, ankleCenter.y); ctx.stroke();
            [hipCenter, kneeCenter, ankleCenter].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, scaledRadius, 0, Math.PI * 2); ctx.fill(); });
        }
        if (visibleLandmarkSets.has('femurAnatomicAxis') && femurAnatomicAxisPoint && kneeCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.lineWidth = scaledLineWidth;
            ctx.beginPath(); ctx.moveTo(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y); ctx.lineTo(kneeCenter.x, kneeCenter.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y, scaledRadius, 0, Math.PI * 2); ctx.fill();
        }
        if (visibleLandmarkSets.has('femoralJointLine') && femoralMedial && femoralLateral) {
            ctx.strokeStyle = LANDMARK_COLORS.femoralJointLine; ctx.fillStyle = LANDMARK_COLORS.femoralJointLine; ctx.lineWidth = scaledLineWidth;
            ctx.beginPath(); ctx.moveTo(femoralMedial.x, femoralMedial.y); ctx.lineTo(femoralLateral.x, femoralLateral.y); ctx.stroke();
            [femoralMedial, femoralLateral].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, scaledRadius, 0, Math.PI * 2); ctx.fill(); });

            // Draw M/L labels with background boxes
            const baseOffset = 15;
            const scaledOffset = baseOffset / (zoom * scaleX);
            const mOffsetX = (femoralMedial.x < (femoralMedial.x + femoralLateral.x) / 2 ? -scaledOffset * 2 : scaledOffset);
            const lOffsetX = (femoralLateral.x < (femoralMedial.x + femoralLateral.x) / 2 ? -scaledOffset * 2 : scaledOffset);
            const boxWidth = 20 / (zoom * scaleX);
            const boxHeight = 22 / (zoom * scaleX);

            ctx.fillStyle = 'rgba(29, 29, 31, 0.85)';
            ctx.fillRect(femoralMedial.x + mOffsetX - 4 / (zoom * scaleX), femoralMedial.y - 10 / (zoom * scaleX), boxWidth, boxHeight);
            ctx.fillRect(femoralLateral.x + lOffsetX - 4 / (zoom * scaleX), femoralLateral.y - 10 / (zoom * scaleX), boxWidth, boxHeight);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${scaledFontSize}px Inter, sans-serif`;
            ctx.fillText('M', femoralMedial.x + mOffsetX, femoralMedial.y + 6 / (zoom * scaleX));
            ctx.fillText('L', femoralLateral.x + lOffsetX, femoralLateral.y + 6 / (zoom * scaleX));
        }
        if (visibleLandmarkSets.has('tibialJointLine') && tibialMedial && tibialLateral) {
            ctx.strokeStyle = LANDMARK_COLORS.tibialJointLine; ctx.fillStyle = LANDMARK_COLORS.tibialJointLine; ctx.lineWidth = scaledLineWidth;
            ctx.beginPath(); ctx.moveTo(tibialMedial.x, tibialMedial.y); ctx.lineTo(tibialLateral.x, tibialLateral.y); ctx.stroke();
            [tibialMedial, tibialLateral].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, scaledRadius, 0, Math.PI * 2); ctx.fill(); });

            // Draw M/L labels with background boxes
            const baseOffset = 15;
            const scaledOffset = baseOffset / (zoom * scaleX);
            const tmOffsetX = (tibialMedial.x < (tibialMedial.x + tibialLateral.x) / 2 ? -scaledOffset * 2 : scaledOffset);
            const tlOffsetX = (tibialLateral.x < (tibialMedial.x + tibialLateral.x) / 2 ? -scaledOffset * 2 : scaledOffset);
            const boxWidth = 20 / (zoom * scaleX);
            const boxHeight = 22 / (zoom * scaleX);

            ctx.fillStyle = 'rgba(29, 29, 31, 0.85)';
            ctx.fillRect(tibialMedial.x + tmOffsetX - 4 / (zoom * scaleX), tibialMedial.y + 10 / (zoom * scaleX), boxWidth, boxHeight);
            ctx.fillRect(tibialLateral.x + tlOffsetX - 4 / (zoom * scaleX), tibialLateral.y + 10 / (zoom * scaleX), boxWidth, boxHeight);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${scaledFontSize}px Inter, sans-serif`;
            ctx.fillText('M', tibialMedial.x + tmOffsetX, tibialMedial.y + 26 / (zoom * scaleX));
            ctx.fillText('L', tibialLateral.x + tlOffsetX, tibialLateral.y + 26 / (zoom * scaleX));
        }
        ctx.restore();
        updateCalculations();
    }, [landmarks, visibleLandmarkSets, ldfaMode, legSide, updateCalculations, zoom, panOffset]);

    useEffect(() => { draw(); }, [draw]);

    useEffect(() => {
        const handleResize = () => {
            const now = Date.now();
            if (now - lastResizeTimeRef.current < 50) return;
            lastResizeTimeRef.current = now;

            const viewer = viewerRef.current;
            const canvas = canvasRef.current;
            const image = imageRef.current;
            if (!viewer || !canvas || !image) return;

            // Guard: skip if image hasn't decoded yet (naturalWidth/Height would be 0)
            if (!image.complete || !image.naturalWidth) return;

            const dpr = window.devicePixelRatio || 1;
            const rect = viewer.getBoundingClientRect();

            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);

            const availableWidth = viewer.clientWidth - 32;
            const availableHeight = viewer.clientHeight - 32;
            const aspect = image.naturalWidth / image.naturalHeight;

            let displayWidth = availableHeight * aspect;
            let displayHeight = availableHeight;
            if (displayWidth > availableWidth) {
                displayWidth = availableWidth;
                displayHeight = displayWidth / aspect;
            }

            const oldW = parseFloat(image.style.width) || image.width;

            image.style.width = `${displayWidth}px`;
            image.style.height = `${displayHeight}px`;

            if (oldW && Math.abs(displayWidth - oldW) > 1) {
                // NO LANDMARK SCALING - Landmarks in Natural Coordinates
            }

            requestAnimationFrame(draw);
        };

        // Listen on image load event directly to handle cached/data-URL images reliably
        const imgElement = imageRef.current;
        if (imgElement) {
            imgElement.addEventListener('load', handleResize);
            // If image is already loaded (cached), trigger resize immediately
            if (imgElement.complete && imgElement.naturalWidth > 0) {
                handleResize();
            }
        }
        window.addEventListener('resize', handleResize);
        return () => {
            if (imgElement) imgElement.removeEventListener('load', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, [draw, setLandmarks]);

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

    const getStableCoordinates = useCallback((clientX: number, clientY: number) => {
        const viewer = viewerRef.current;
        const image = imageRef.current;
        if (!viewer || !image) return { x: 0, y: 0 };

        const currentZoom = zoomRef.current;
        const currentPan = panOffsetRef.current;

        const viewerRect = viewer.getBoundingClientRect();
        const viewerCenterX = viewerRect.left + viewerRect.width / 2;
        const viewerCenterY = viewerRect.top + viewerRect.height / 2;

        const dx = clientX - viewerCenterX;
        const dy = clientY - viewerCenterY;

        // Remove Pan & Zoom
        const unzoomedX = (dx - currentPan.x) / currentZoom;
        const unzoomedY = (dy - currentPan.y) / currentZoom;

        // Map to Image CS
        const imgW = parseFloat(image.style.width) || 0;
        const imgH = parseFloat(image.style.height) || 0;

        const imageDisplayNameX = unzoomedX + imgW / 2;
        const imageDisplayNameY = unzoomedY + imgH / 2;

        const scaleX = image.naturalWidth ? imgW / image.naturalWidth : 1;
        const scaleY = image.naturalHeight ? imgH / image.naturalHeight : 1;

        const naturalX = imageDisplayNameX / scaleX;
        const naturalY = imageDisplayNameY / scaleY;

        return { x: naturalX, y: naturalY };
    }, []);

    const updatePip = useCallback(() => {
        const key = draggingPointRef.current;
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const pipCanvas = pipCanvasRef.current;
        if (!key || !landmarks[key] || !image || !canvas || !pipCanvas) return;

        const pos = landmarks[key];
        const pipCtx = pipCanvas.getContext('2d');
        if (!pipCtx) return;

        const zoomLevel = 2.5;
        const sourceSize = pipCanvas.width / zoomLevel;
        pipCtx.fillStyle = 'black';
        pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);
        const imgScaleX = image.naturalWidth / canvas.width;
        const imgScaleY = image.naturalHeight / canvas.height;

        // pos is natural, no need to scale by imgScaleX (which was natural/display). 
        // Wait, current logic: drawImage(image, (pos.x * imgScaleX))
        // If pos is natural, we just use pos.x directly on the image which is natural.
        // So we don't need imgScaleX if we use natural coordinates on the natural image.

        // Correct logic for natural coordinates:
        pipCtx.drawImage(image, pos.x - (sourceSize / 2), pos.y - (sourceSize / 2), sourceSize, sourceSize, 0, 0, pipCanvas.width, pipCanvas.height);
        pipCtx.strokeStyle = '#fdd835'; pipCtx.lineWidth = 1; pipCtx.beginPath();
        pipCtx.moveTo(pipCanvas.width / 2, 0); pipCtx.lineTo(pipCanvas.width / 2, pipCanvas.height);
        pipCtx.moveTo(0, pipCanvas.height / 2); pipCtx.lineTo(pipCanvas.width, pipCanvas.height / 2);
        pipCtx.stroke();
    }, [landmarks]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getStableCoordinates(e.clientX, e.clientY);

        // Calculate hit radius in Natural Coordinates
        const image = imageRef.current;
        const imgW = parseFloat(image?.style.width || "0");
        const scaleX = (image?.naturalWidth && imgW) ? imgW / image.naturalWidth : 1;

        const scaledHitRadius = (BASE_HANDLE_RADIUS + 24) / (zoom * scaleX);
        const hitRadiusSq = scaledHitRadius ** 2;

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
        } else {
            if (zoom > 1) {
                isPanningRef.current = true;
                panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
            }
        }
    }, [landmarks, getStableCoordinates]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isPanningRef.current) {
            setPanOffset({
                x: e.clientX - panStartRef.current.x,
                y: e.clientY - panStartRef.current.y
            });
            return;
        }

        if (!draggingPointRef.current) return;
        const pos = getStableCoordinates(e.clientX, e.clientY);
        setLandmarks(prev => ({ ...prev, [draggingPointRef.current!]: pos }));
        updatePip();
    }, [updatePip, getStableCoordinates]);

    const handleMouseUp = useCallback(() => {
        draggingPointRef.current = null;
        isPanningRef.current = false;
    }, []);

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
        const pipWidth = pipViewerRef.current?.offsetWidth || 176;
        const pipHeight = pipViewerRef.current?.offsetHeight || 176;
        newX = Math.max(0, Math.min(newX, viewerRect.width - pipWidth));
        newY = Math.max(0, Math.min(newY, viewerRect.height - pipHeight));
        setPipPosition({ x: newX, y: newY });
    }, []);
    const handlePipMouseUp = useCallback(() => { isDraggingPipRef.current = false; }, []);

    // TOUCH SUPPORT — LANDMARK DRAGGING
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialPinchDistanceRef.current = dist;
            initialInitialPinchZoomRef.current = zoom;
            initialPanOffsetRef.current = { ...panOffset };
            isPanningRef.current = true;
            panStartRef.current = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - panOffset.x,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - panOffset.y
            };
            return;
        }

        const touch = e.touches[0];
        if (!touch) return;
        const pos = getStableCoordinates(touch.clientX, touch.clientY);

        // Calculate hit radius in Natural Coordinates
        const image = imageRef.current;
        const imgW = parseFloat(image?.style.width || "0");
        const scaleX = (image?.naturalWidth && imgW) ? imgW / image.naturalWidth : 1;

        const scaledHitRadius = (BASE_HANDLE_RADIUS + 24) / (zoom * scaleX);
        const hitRadiusSq = scaledHitRadius ** 2;

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
            isPanningRef.current = false;
        } else {
            if (zoom > 1) {
                isPanningRef.current = true;
                panStartRef.current = { x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y };
            }
        }
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const scale = dist / initialPinchDistanceRef.current;
            const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, initialInitialPinchZoomRef.current * scale));
            setZoom(newZoom);

            // Two-finger pan
            if (isPanningRef.current) {
                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                setPanOffset({
                    x: midX - panStartRef.current.x,
                    y: midY - panStartRef.current.y
                });
            }
            return;
        }

        if (isPanningRef.current) {
            e.preventDefault();
            const touch = e.touches[0];
            setPanOffset({
                x: touch.clientX - panStartRef.current.x,
                y: touch.clientY - panStartRef.current.y
            });
            return;
        }

        if (!draggingPointRef.current) return;
        e.preventDefault(); // Critical: stops scroll

        const touch = e.touches[0];
        if (!touch) return;
        const pos = getStableCoordinates(touch.clientX, touch.clientY);
        setLandmarks(prev => ({ ...prev, [draggingPointRef.current!]: pos }));
        updatePip();
    }, [updatePip, getStableCoordinates, setLandmarks]);

    const handleTouchEnd = useCallback(() => {
        draggingPointRef.current = null;
        initialPinchDistanceRef.current = null;
        isPanningRef.current = false;
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
        if (newSets.has(setName)) {
            newSets.delete(setName);
        } else {
            newSets.add(setName);

            // Auto-zoom to knee joint when selecting femoral or tibial joint lines
            if (setName === 'femoralJointLine' || setName === 'tibialJointLine') {
                const canvas = canvasRef.current;
                if (canvas) {
                    setZoom(2.2);
                    setPanOffset({ x: 0, y: -canvas.height * 0.1 });
                }
            }
        }
        setVisibleLandmarkSets(newSets);
    };

    const landmarkButtons = [
        { key: 'hkaLine', text: 'HKA Line' },
        { key: 'femurAnatomicAxis', text: 'Femur Anatomic Axis' },
        { key: 'femoralJointLine', text: 'Femoral Articulating Line' },
        { key: 'tibialJointLine', text: 'Tibial Articulating Line' },
    ];

    const handleResetAll = () => {
        if (canvasRef.current) resetLandmarks(canvasRef.current);
        setVisibleLandmarkSets(new Set());
        setResults({ ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', ama: null });
    };

    return (
        <div className="relative flex flex-col h-full rounded-lg">
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(dataUrl) => { setPostOpLongLegImage(dataUrl); setFileName('Camera Capture'); }} />
            <div className="grid grid-cols-1 lg:grid-cols-[70fr_30fr] gap-4 flex-grow h-full min-h-0 lg:max-h-full overflow-visible lg:overflow-hidden pb-4">
                {/* Viewer - Left side (70%) */}
                <div className="relative w-full h-full min-h-[450px] lg:min-h-0 lg:max-h-full bg-black border border-[#333333] rounded-lg flex items-center justify-center overflow-hidden order-1 lg:order-none">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
                    {zoom > 1 && (<div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-yellow-500/90 text-black px-4 py-1 rounded-full font-bold shadow-lg">Drag to pan • Zoom: {(zoom * 100).toFixed(0)}%</div>)}
                    {postOpLongLegImage && <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                        <button onClick={zoomIn} className="bg-black/70 px-3 py-1 rounded"> ＋ </button>
                        <button onClick={zoomOut} className="bg-black/70 px-3 py-1 rounded"> － </button>
                        <button onClick={resetZoom} className="bg-black/70 px-2 py-1 rounded text-xs">Reset</button>
                    </div>}
                    {postOpLongLegImage ? (
                        <>
                            <div ref={viewerRef} className="relative w-full h-full max-h-full flex items-center justify-center overflow-hidden"
                                onMouseDown={(e) => {
                                    if (zoom > 1 && !draggingPointRef.current) {
                                        e.preventDefault();
                                        isPanningRef.current = true;
                                        panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
                                    }
                                }}
                                onMouseUp={() => { isPanningRef.current = false; }}
                                onMouseLeave={() => { isPanningRef.current = false; }}
                                style={{ cursor: zoom > 1 ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default' }}>
                                {/* Angle Values - Always displayed on Right Side */}
                                {(results.ldfa != null || results.mpta != null || results.mhka != null) && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-none">
                                        {results.ldfa != null && (
                                            <div className="bg-[#1a1a1a]/90 border border-[#333] px-3 py-1.5 rounded text-white font-bold text-sm">
                                                LDFA: {results.ldfa.toFixed(1)}°
                                            </div>
                                        )}
                                        {results.mpta != null && (
                                            <div className="bg-[#1a1a1a]/90 border border-[#333] px-3 py-1.5 rounded text-white font-bold text-sm">
                                                MPTA: {results.mpta.toFixed(1)}°
                                            </div>
                                        )}
                                        {results.mhka != null && (
                                            <div className="bg-[#1a1a1a]/90 border border-[#333] px-3 py-1.5 rounded text-white font-bold text-sm">
                                                mHKA: {results.mhka.toFixed(1)}°
                                            </div>
                                        )}
                                        {results.ahka != null && (
                                            <div className="bg-[#1a1a1a]/90 border border-[#333] px-3 py-1.5 rounded text-white font-bold text-sm">
                                                aHKA: {results.ahka.toFixed(1)}°
                                            </div>
                                        )}
                                        {results.ama != null && (
                                            <div className="bg-[#1a1a1a]/90 border border-[#333] px-3 py-1.5 rounded text-white font-bold text-sm">
                                                AMA: {results.ama.toFixed(1)}°
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="relative flex items-center justify-center" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: 'center center', willChange: 'transform' }}>
                                    <img ref={imageRef} src={postOpLongLegImage} alt="Post-op X-ray" className="block max-w-none"
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                                        onLoad={() => {
                                            // Reset throttle so the resize call is not skipped
                                            lastResizeTimeRef.current = 0;
                                            window.dispatchEvent(new Event('resize'));
                                            if (Object.keys(landmarks).length === 0 && canvasRef.current) resetLandmarks(canvasRef.current);
                                        }}
                                    />
                                </div>
                                <canvas ref={canvasRef} onTouchStart={handleTouchStart} className="absolute inset-0 w-full h-full cursor-crosshair touch-none" style={{ pointerEvents: 'auto' }} onMouseDown={handleMouseDown} />
                            </div>
                            <div ref={pipViewerRef} onMouseDown={handlePipStart}
                                onTouchStart={handlePipStart} className="absolute w-44 h-44 rounded-full border-4 border-cyan-400 bg-black shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-grab touch-none z-50" style={{ top: pipPosition.y, left: pipPosition.x, willChange: 'top, left', transition: 'none' }}>
                                <canvas ref={pipCanvasRef} width={176} height={176} className="rounded-full"></canvas>
                                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 pointer-events-none" />
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-400 cursor-pointer p-10 border-2 border-dashed border-gray-600 rounded-lg hover:bg-white/5 transition" onClick={() => document.getElementById('xray-upload')?.click()}>
                            <p className="text-xl font-bold">Upload an X-ray to begin</p>
                            <p className="text-sm mt-2 opacity-70">Tap here or use the controls on the right</p>
                        </div>
                    )}
                </div>

                {/* Controls - Right side (30%) */}
                <div className="flex flex-col space-y-1.5 h-full overflow-y-auto pr-1 order-2 lg:order-none">
                    <div className="shrink-0">
                        <section className="relative z-10">
                            <h3 className="text-sm font-semibold mb-2 text-gray-400 uppercase tracking-wider">Upload X-ray</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <label htmlFor="xray-upload" className="cursor-pointer text-center py-3 rounded-lg bg-[#252525] border border-[#333333] hover:bg-[#333333] hover:border-[#6D282C] transition-all text-sm font-medium text-gray-300">
                                    <span>📁 File</span>
                                </label>
                                <input id="xray-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                <button onClick={() => setIsCameraOpen(true)} className="py-3 rounded-lg bg-[#252525] border border-[#333333] hover:bg-[#333333] hover:border-[#6D282C] transition-all text-sm font-medium text-gray-300">
                                    📷 Camera
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 truncate">{fileName}</p>
                            <p className="text-gray-500 text-[10px]">Side: <span className="text-[#E0E0E0] font-bold uppercase">{legSide}</span></p>
                        </section>

                    </div>

                    <div className="flex-grow flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-semibold text-[#E0E0E0] uppercase">Markings</h4>
                            <button onClick={handleResetAll} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold tracking-wider">Reset</button>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {landmarkButtons.map((btn, idx) => {

                                const isSelected = visibleLandmarkSets.has(btn.key);
                                const btnColor = LANDMARK_COLORS[btn.key as keyof typeof LANDMARK_COLORS];
                                return (
                                    <button
                                        key={btn.key}
                                        onClick={() => toggleLandmarkSet(btn.key as any)}
                                        className={`group relative w-full py-3 px-4 text-sm font-semibold rounded-lg border transition-all text-left flex items-center gap-3
                                            ${isSelected
                                                ? 'bg-[#1a1a1a] border-[#333] text-white shadow-lg'
                                                : 'bg-[#252525] border-[#333333] hover:bg-[#333333] hover:border-[#6D282C]/50 text-gray-300'}`}>
                                        <span
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all`}
                                            style={{
                                                backgroundColor: isSelected ? btnColor : 'transparent',
                                                borderColor: btnColor,
                                                color: isSelected ? '#fff' : btnColor
                                            }}
                                        >
                                            {isSelected ? '✓' : idx + 1}
                                        </span>
                                        <span>{btn.text}</span>
                                        {isSelected && (
                                            <div
                                                className="absolute right-3 w-2 h-2 rounded-full animate-pulse"
                                                style={{ backgroundColor: btnColor }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="shrink-0 grid grid-cols-2 gap-0.5 pt-0.5 border-t border-[#333333]">
                        <ResultItem label="mHKA" value={results.mhka != null ? results.mhka.toFixed(1) + '°' : '--'} />
                        <ResultItem label="LDFA" value={results.ldfa != null ? results.ldfa.toFixed(1) + '°' : '--'} />
                        <ResultItem label="MPTA" value={results.mpta != null ? results.mpta.toFixed(1) + '°' : '--'} />
                        <ResultItem label="aHKA" value={results.ahka != null ? results.ahka.toFixed(1) + '°' : '--'} />
                        <div className="col-span-2">
                            <ResultItem label="JLO" value={results.jlo != null ? results.jlo.toFixed(1) + '°' : '--'} />
                        </div>
                        <div className="col-span-2">
                            <ResultItem label="CPAK Type" value={results.cpak ? `CPAK ${results.cpak}` : '--'} large={true} />
                        </div>
                        <div className="col-span-2">
                            <ResultItem label="JLO Type" value={results.jloType ?? '--'} large={true} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const PastCaseResultPage: React.FC = () => {
    const { setPage, longLegCanvasDataUrl, longLegResults } = useAppContext();

    return (
        <div className="relative flex flex-col h-full overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex justify-between items-center mb-1 no-print px-2 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0] uppercase">Long Leg Result Verification</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[30fr_70fr] gap-4 flex-grow min-h-0 px-0.5 pb-0 relative z-10 overflow-visible lg:overflow-hidden">
                {/* Column 1: Pre-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg flex flex-col min-h-[400px] lg:min-h-0 lg:max-h-full overflow-visible lg:overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-sm font-bold text-center text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-0.5 rounded relative z-10 shrink-0">Pre-Op Analysis</h3>
                    <div className="w-full flex-grow min-h-0 max-h-full bg-black rounded-lg border border-[#333333] relative z-10 my-0.5 overflow-hidden">
                        {longLegCanvasDataUrl ?
                            <img src={longLegCanvasDataUrl} alt="Pre-op Analysis" className="absolute inset-0 m-auto max-w-full max-h-full object-contain" /> :
                            <p className="text-sm text-gray-500 italic">No pre-op image available.</p>
                        }
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-0.5 text-center relative z-10 shrink-0">
                        <div className="bg-[#252525] p-1 rounded-lg border border-[#6D282C]/50">
                            <p className="text-[8px] text-[#ff8fa3] font-bold uppercase">Pre-Op CPAK</p>
                            <p className="font-bold text-base text-[#ff8fa3]">CPAK {longLegResults.cpak}</p>
                        </div>
                        <div className="bg-[#252525] p-1 rounded-lg border border-[#6D282C]/50">
                            <p className="text-[8px] text-[#ff8fa3] font-bold uppercase">Pre-Op JLO</p>
                            <p className="font-bold text-base text-[#ff8fa3]">{longLegResults.jloType}</p>
                        </div>
                    </div>
                </div>

                {/* Column 2: Post-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg flex flex-col min-h-[700px] lg:min-h-0 lg:max-h-full overflow-visible lg:overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-sm font-bold text-center text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-0.5 rounded relative z-10 shrink-0">Post-Op Verification</h3>
                    <div className="flex-grow min-h-0 max-h-full relative mt-0.5 overflow-visible lg:overflow-hidden">
                        <PostOpPlanner />
                    </div>
                </div>
            </div>

            <div className="pt-2 px-2 pb-2 relative z-10 shrink-0">
                <div className="flex justify-start w-full">
                    <button
                        onClick={() => setPage('case-management')}
                        className="group relative py-2 px-4 bg-[#252525] border border-[#444444] rounded-sm 
                                   shadow-[0_4px_15px_rgba(0,0,0,0.3)] 
                                   transition-all duration-300 ease-out
                                   hover:bg-[#333333] hover:border-[#555555] hover:shadow-[0_0_20px_rgba(109,40,44,0.2)]
                                   active:scale-[0.98] flex items-center"
                    >
                        <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                        <span className="relative flex items-center gap-2 text-sm font-bold text-gray-200 tracking-wider group-hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            BACK TO CASES
                        </span>
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PastCaseResultPage;
