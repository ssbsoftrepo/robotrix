
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, Point, ValgusResults, LegSide } from '../types';

// --- Helper Functions ---
const BASE_HANDLE_RADIUS = 6;
const BASE_LINE_WIDTH = 4;
const LANDMARK_COLORS = {
    jointLine: '#007AFF',       // Bright Blue
    femurAnatomicAxis: '#34C759', // Bright Green
    tibiaAnatomicAxis: '#FFD60A', // Bright Yellow
};
const landmarkInstructions = {
    jointLine: ["Mark the center of the medial M joint space.", "Mark the center of the lateral L joint space."],
    femurAnatomicAxis: ["Mark mid femur axis."],
    tibiaAnatomicAxis: ["Mark mid tibia axis."],
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
                        <h3 className="text-xl font-semibold mb-4">Live Capture with Alignment Grid</h3>
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
                        <h3 className="text-xl font-semibold mb-4">Crop Captured Image</h3>
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
const angleBetweenVectors = (v1: Point, v2: Point) => {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    if (mag1 === 0 || mag2 === 0) return 0;
    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosTheta) * (180 / Math.PI);
};
const getValgusCpakType = (obliquity: number, ldfa: number | null, mpta: number | null): string => {
    if (obliquity >= 3) {
        // Significant obliquity - Valgoid - CPAK 2
        return '2';
    } else if (obliquity >= 1) {
        // Mild obliquity - Median - CPAK 1
        return '1';
    } else {
        // Neutral obliquity - Varoid - CPAK 4 or CPAK 5
        // CPAK 5 only if LDFA = MPTA = 90 degrees
        if (ldfa !== null && mpta !== null && Math.round(ldfa) === 90 && Math.round(mpta) === 90) {
            return '5';
        }
        return '4';
    }
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

    // Landmark visibility is now forced to TRUE for all available landmarks.
    // Removed visibleLandmarkSets state and effects.

    // removed local landmarks and results state
    const [visibleLandmarkSets, setVisibleLandmarkSets] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (landmarks.medialJointSpace || landmarks.lateralJointSpace) initial.add('jointLine');
        if (landmarks.femurAxisPoint) initial.add('femurAnatomicAxis');
        if (landmarks.tibiaAxisPoint) initial.add('tibiaAnatomicAxis');
        return initial;
    });
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const landmarksRef = useRef(landmarks);
    useEffect(() => { landmarksRef.current = landmarks; }, [landmarks]);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const draggingPointRef = useRef<string | null>(null);
    const localResultsRef = useRef(results);
    useEffect(() => { localResultsRef.current = results; }, [results]);
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
    const lastResizeTimeRef = useRef(0);

    const zoomIn = () => setZoom(z => Math.min(z + 0.2, MAX_ZOOM));
    const zoomOut = () => setZoom(z => Math.max(z - 0.2, MIN_ZOOM));
    const resetZoom = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

    // visibleLandmarkSets is initialized via lazy initializer in useState above.
    // No syncing useEffect needed — this prevents auto-enable on first visit.

    const resetLandmarks = useCallback((canvas: HTMLCanvasElement) => {
        // Use natural dimensions if available
        const w = imageRef.current?.naturalWidth || canvas.width;
        const h = imageRef.current?.naturalHeight || canvas.height;

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

        const zoomLevel = 2.5;
        const sourceSize = pipCanvas.width / zoomLevel;
        pipCtx.fillStyle = 'black';
        pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);
        const imgScaleX = image.naturalWidth / canvas.width;
        const imgScaleY = image.naturalHeight / canvas.height;

        // Correct logic for natural coordinates:
        pipCtx.drawImage(image, pos.x - (sourceSize / 2), pos.y - (sourceSize / 2), sourceSize, sourceSize, 0, 0, pipCanvas.width, pipCanvas.height);
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

        if (newResults.ldfa !== null && newResults.mpta !== null && newResults.obliquity !== null) {
            // Calculate aHKA and JLO
            newResults.ahka = newResults.mpta - newResults.ldfa;
            newResults.jlo = newResults.mpta + newResults.ldfa;

            newResults.cpak = getValgusCpakType(newResults.obliquity, newResults.ldfa, newResults.mpta);

            // LDFA-based classification
            const femurClass = getFemurClassification(newResults.ldfa);
            newResults.femurType = femurClass.type;
            newResults.cut = femurClass.cut;

            // Obliquity-based classification
            if (newResults.obliquity >= 3) {
                newResults.femurTypeByObliquity = 'Valgoid';
            } else if (newResults.obliquity >= 1) {
                newResults.femurTypeByObliquity = 'Median';
            } else {
                newResults.femurTypeByObliquity = 'Varoid';
            }
        }
        setResults(newResults);
    }, [landmarks, visibleLandmarkSets, legSide, setResults]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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
        const imgW = parseFloat(image.style.width) || 0;
        const imgH = parseFloat(image.style.height) || 0;
        ctx.translate(-imgW / 2, -imgH / 2);

        // V2: Apply Scale from Natural to Display
        const scaleX = image.naturalWidth ? imgW / image.naturalWidth : 1;
        const scaleY = image.naturalHeight ? imgH / image.naturalHeight : 1;
        ctx.scale(scaleX, scaleY);

        const currentResults = updateCalculations();

        const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = landmarks;

        const jointCenter = (medialJointSpace && lateralJointSpace) ? { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 } : null;

        if (visibleLandmarkSets.has('jointLine') && medialJointSpace && lateralJointSpace && jointCenter) {
            const scaledRadius = BASE_HANDLE_RADIUS / (zoom * scaleX);
            const scaledLineWidth = BASE_LINE_WIDTH / (zoom * scaleX);
            const scaledFontSize = 16 / (zoom * scaleX);
            ctx.strokeStyle = LANDMARK_COLORS.jointLine; ctx.fillStyle = LANDMARK_COLORS.jointLine; ctx.lineWidth = scaledLineWidth;
            ctx.beginPath(); ctx.moveTo(medialJointSpace.x, medialJointSpace.y); ctx.lineTo(lateralJointSpace.x, lateralJointSpace.y); ctx.stroke();
            [medialJointSpace, lateralJointSpace].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, scaledRadius, 0, Math.PI * 2); ctx.fill(); });

            // Draw M/L labels with background boxes
            const baseOffset = 15;
            const scaledOffset = baseOffset / (zoom * scaleX);
            const mOffset = medialJointSpace.x < lateralJointSpace.x ? -scaledOffset * 2 : scaledOffset;
            const lOffset = lateralJointSpace.x < medialJointSpace.x ? -scaledOffset * 2 : scaledOffset;
            const boxWidth = 20 / (zoom * scaleX);
            const boxHeight = 22 / (zoom * scaleX);
            ctx.fillStyle = 'rgba(29, 29, 31, 0.85)';
            ctx.fillRect(medialJointSpace.x + mOffset - 4 / (zoom * scaleX), medialJointSpace.y - 10 / (zoom * scaleX), boxWidth, boxHeight);
            ctx.fillRect(lateralJointSpace.x + lOffset - 4 / (zoom * scaleX), lateralJointSpace.y - 10 / (zoom * scaleX), boxWidth, boxHeight);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${scaledFontSize}px Inter, sans-serif`;
            ctx.fillText('M', medialJointSpace.x + mOffset, medialJointSpace.y + 6 / (zoom * scaleX));
            ctx.fillText('L', lateralJointSpace.x + lOffset, lateralJointSpace.y + 6 / (zoom * scaleX));
        }

        if (visibleLandmarkSets.has('femurAnatomicAxis') && femurAxisPoint && jointCenter) {
            const scaledRadius = BASE_HANDLE_RADIUS / (zoom * scaleX);
            const scaledLineWidth = BASE_LINE_WIDTH / (zoom * scaleX);
            ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.lineWidth = scaledLineWidth;
            ctx.beginPath(); ctx.moveTo(femurAxisPoint.x, femurAxisPoint.y); ctx.lineTo(jointCenter.x, jointCenter.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(femurAxisPoint.x, femurAxisPoint.y, scaledRadius, 0, Math.PI * 2); ctx.fill();
        }
        if (visibleLandmarkSets.has('tibiaAnatomicAxis') && tibiaAxisPoint && jointCenter) {
            const scaledRadius = BASE_HANDLE_RADIUS / (zoom * scaleX);
            const scaledLineWidth = BASE_LINE_WIDTH / (zoom * scaleX);
            ctx.strokeStyle = LANDMARK_COLORS.tibiaAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.tibiaAnatomicAxis; ctx.lineWidth = scaledLineWidth;
            ctx.beginPath(); ctx.moveTo(tibiaAxisPoint.x, tibiaAxisPoint.y); ctx.lineTo(jointCenter.x, jointCenter.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(tibiaAxisPoint.x, tibiaAxisPoint.y, scaledRadius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }, [landmarks, visibleLandmarkSets, legSide, updateCalculations, zoom, panOffset]);

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

            // Set canvas size to match viewer (screen space)
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);

            // Fit image
            const availableWidth = viewer.clientWidth;
            const availableHeight = viewer.clientHeight;
            const aspect = image.naturalWidth / image.naturalHeight;

            let displayWidth = availableWidth;
            let displayHeight = displayWidth / aspect;

            if (displayHeight > availableHeight) {
                displayHeight = availableHeight;
                displayWidth = displayHeight * aspect;
            }

            const oldW = parseFloat(image.style.width) || image.width;

            image.style.width = `${displayWidth}px`;
            image.style.height = `${displayHeight}px`;

            if (oldW && Math.abs(displayWidth - oldW) > 1) {
                // NO LANDMARK SCALING - Landmarks in Natural Coordinates
            }

            if (Object.keys(landmarksRef.current).length === 0) {
                resetLandmarks(canvas);
            }

            requestAnimationFrame(draw);
        };

        const imgElement = imageRef.current;
        if (imgElement) {
            imgElement.addEventListener('load', handleResize);
            if (imgElement.complete && imgElement.naturalWidth > 0) {
                handleResize();
            }
        }
        window.addEventListener('resize', handleResize);

        return () => {
            if (imgElement) imgElement.removeEventListener('load', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, [draw, postOpValgusImage, resetLandmarks, setLandmarks]);

    // Handle Reset
    const handleResetAll = () => {
        if (canvasRef.current) resetLandmarks(canvasRef.current);
        setVisibleLandmarkSets(new Set());
        setResults({ obliquity: null, ldfa: null, mpta: null, femurType: '--', femurTypeByObliquity: '--', cpak: '--', cut: '--' }); // Reset results
    };


    // Update getCanvasPos to account for DPR and Scale
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

        const unzoomedX = (dx - currentPan.x) / currentZoom;
        const unzoomedY = (dy - currentPan.y) / currentZoom;

        const imgW = parseFloat(image.style.width) || 0;
        const imgH = parseFloat(image.style.height) || 0;

        const scaleX = image.naturalWidth ? imgW / image.naturalWidth : 1;
        const scaleY = image.naturalHeight ? imgH / image.naturalHeight : 1;

        const naturalX = (unzoomedX + imgW / 2) / scaleX;
        const naturalY = (unzoomedY + imgH / 2) / scaleY;

        return { x: naturalX, y: naturalY };
    }, []);

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
        e.preventDefault(); // Critical: stops scrolling
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
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(dataUrl) => { setPostOpValgusImage(dataUrl); setFileName('Camera Capture'); }} />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-grow h-full min-h-0 max-h-full overflow-hidden">
                {/* Viewer - Left side (75%) */}
                <div className="lg:col-span-3 relative w-full h-full max-h-full bg-black border border-[#333333] rounded-lg flex items-center justify-center overflow-hidden order-1 lg:order-none">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
                    {zoom > 1 && (<div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-yellow-500/90 text-black px-4 py-1 rounded-full font-bold shadow-lg">Drag to pan • Zoom: {(zoom * 100).toFixed(0)}%</div>)}
                    {postOpValgusImage && <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                        <button onClick={zoomIn} className="bg-black/70 px-3 py-1 rounded"> ＋ </button>
                        <button onClick={zoomOut} className="bg-black/70 px-3 py-1 rounded"> － </button>
                        <button onClick={resetZoom} className="bg-black/70 px-2 py-1 rounded text-xs">Reset</button>
                    </div>}
                    {postOpValgusImage ? (<>
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
                            {(results.obliquity != null || results.ldfa != null || results.mpta != null) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-none">
                                    {results.obliquity != null && (
                                        <div className="bg-[#1a1a1a]/90 border border-[#333] px-3 py-1.5 rounded text-white font-bold text-sm">
                                            Obliquity: {results.obliquity.toFixed(1)}°
                                        </div>
                                    )}
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
                                </div>
                            )}
                            <div className="relative flex items-center justify-center" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: 'center center', willChange: 'transform' }}>
                                <img
                                    ref={imageRef}
                                    src={postOpValgusImage}
                                    className="block max-w-none"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                    alt=""
                                    onLoad={() => {
                                        // Reset throttle so the resize call is not skipped
                                        lastResizeTimeRef.current = 0;
                                        window.dispatchEvent(new Event('resize'));
                                        if (Object.keys(landmarks).length === 0 && canvasRef.current) resetLandmarks(canvasRef.current);
                                    }}
                                />
                            </div>
                            <canvas
                                ref={canvasRef}
                                className="absolute cursor-crosshair touch-none inset-0 w-full h-full"
                                style={{ pointerEvents: 'auto' }}
                                onMouseDown={handleMouseDown}
                                onTouchStart={handleTouchStart}
                            />
                        </div>
                        <div ref={pipViewerRef} onMouseDown={handlePipStart}
                            onTouchStart={handlePipStart} className="absolute w-24 h-24 border-2 border-dark-maroon bg-black rounded-full cursor-grab active:cursor-grabbing shadow-lg top-2 right-2 z-10" style={{ top: `${pipPosition.y}px`, left: `${pipPosition.x}px` }}>
                            <canvas ref={pipCanvasRef} width="128" height="128" className="rounded-full w-full h-full"></canvas>
                        </div>
                    </>) : <div className="text-center text-gray-400 cursor-pointer p-10 border-2 border-dashed border-gray-600 rounded-lg hover:bg-white/5 transition" onClick={() => document.getElementById('xray-upload')?.click()}>
                        <p className="text-xl font-bold">Upload an X-ray to begin</p>
                        <p className="text-sm mt-2 opacity-70">Tap here or use the controls on the right</p>
                    </div>}
                </div>

                {/* Controls - Right side (25%) */}
                <div className="lg:col-span-1 flex flex-col space-y-1.5 h-full overflow-y-auto pr-1 order-2 lg:order-none">
                    <div className="shrink-0">
                        {/* <h4 className="text-sm font-semibold text-[#E0E0E0] mb-1">Post-Op Image</h4>
                        <div className="flex gap-1 mb-1">
                            <label htmlFor="postop-valgus-xray-upload" className="cursor-pointer text-center py-2 px-2 rounded-sm font-bold text-xs bg-[#6D282C] border border-[#893338] hover:bg-[#893338] text-white tracking-wider flex-1 transition shadow-sm">
                                UPLOAD X-Ray
                            </label>
                            <button onClick={() => setIsCameraOpen(true)} className="py-2 px-2 rounded-sm font-bold text-xs bg-[#6D282C] border border-[#893338] hover:bg-[#893338] text-white tracking-wider flex-1 transition shadow-sm">
                                LIVE CAPTURE
                            </button>
                        </div>
                        <input type="file" id="postop-valgus-xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <span className="text-[10px] text-gray-500 truncate inline-block w-full">{fileName}</span> */}
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

                    <div className="shrink-0 flex flex-col mt-2">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-semibold text-[#E0E0E0]">Markings</h4>
                            <button onClick={handleResetAll} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold tracking-wider">Reset</button>
                        </div>
                        <div className="space-y-1">
                            {Object.keys(landmarkInstructions).map((key, idx) => {
                                const isSelected = visibleLandmarkSets.has(key);
                                const btnColor = LANDMARK_COLORS[key as keyof typeof LANDMARK_COLORS];
                                return (
                                    <button
                                        key={key}
                                        onClick={() => toggleLandmarkSet(key as any)}
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
                                        <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
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

                    <div className="shrink-0 grid grid-cols-2 gap-0.5 pt-2 border-t border-[#333333] mt-auto">
                        <div className="col-span-2">
                            <ResultItem label="Obliquity" value={results.obliquity != null ? results.obliquity.toFixed(1) + '°' : '--'} />
                        </div>
                        <ResultItem label="LDFA" value={results.ldfa != null ? results.ldfa.toFixed(1) + '°' : '--'} />
                        <ResultItem label="MPTA" value={results.mpta != null ? results.mpta.toFixed(1) + '°' : '--'} />
                        <div className="col-span-2">
                            <ResultItem label="CPAK" value={results.cpak ? `CPAK ${results.cpak}` : '--'} large={true} />
                        </div>
                        <div className="col-span-2">
                            <ResultItem label="Femur (Obliquity)" value={results.femurTypeByObliquity ?? '--'} large={true} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
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

const PastCaseValgusResultPage: React.FC = () => {
    const { setPage, valgusCanvasDataUrl, valgusResults } = useAppContext();

    return (
        <div className="relative flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex justify-between items-center mb-0 no-print px-2 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0]">Valgus Stress Result Verification</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[30fr_70fr] gap-0.5 flex-grow min-h-0 px-0.5 pb-0 relative z-10 overflow-hidden">
                {/* Column 1: Pre-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-0.5 rounded-lg flex flex-col min-h-0 max-h-full overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-sm font-bold text-center text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-0.5 rounded relative z-10 shrink-0">Pre-Op Analysis</h3>
                    <div className="w-full flex-grow min-h-0 max-h-full bg-black rounded-lg border border-[#333333] relative z-10 my-0.5 overflow-hidden">
                        {valgusCanvasDataUrl ?
                            <img src={valgusCanvasDataUrl} alt="Pre-op Analysis" className="absolute inset-0 m-auto max-w-full max-h-full object-contain" /> :
                            <p className="text-sm text-gray-500 italic">No pre-op image available.</p>
                        }
                    </div>
                    <div className="mt-auto grid grid-cols-1 gap-0.5 text-center relative z-10 shrink-0">
                        <ResultItem label="Pre-Op CPAK" value={valgusResults.cpak ? `CPAK ${valgusResults.cpak}` : '--'} large={true} />
                        <ResultItem label="Femur Type" value={valgusResults.femurTypeByObliquity ?? '--'} large={true} />
                    </div>
                </div>

                {/* Column 2: Post-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-0.5 rounded-lg flex flex-col min-h-0 max-h-full overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-sm font-bold text-center text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-0.5 rounded relative z-10 shrink-0">Post-Op Verification</h3>
                    <div className="flex-grow min-h-0 max-h-full relative mt-0.5 mb-2 overflow-hidden">
                        <PostOpValgusPlanner />
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

export default PastCaseValgusResultPage;
