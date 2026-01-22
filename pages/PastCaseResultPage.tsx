
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

const BASE_HANDLE_RADIUS = 4;
const BASE_LINE_WIDTH = 3;
const LANDMARK_COLORS = {
    hkaLine: '#6D282C',
    femurAnatomicAxis: '#6D282C',
    femoralJointLine: '#6D282C',
    tibialJointLine: '#6D282C',
};
const landmarkInstructions = {
    hkaLine: ["Mark hip center.", "Mark knee center.", "Mark ankle center."],
    femurAnatomicAxis: ["Mark a point along the mid-diapheal canal.", "Along the mid shaft of femur."],
    femoralJointLine: ["Mark the most distal part of medial (M) condyle.", "Mark the most distal part of lateral (L) condyle."],
    tibialJointLine: ["Mark the lowest center point of medial (M) condyle.", "Mark the lowest center point of lateral (L) condyle."],
};

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

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1e1f20] border border-[#6D282C] p-4 rounded-lg relative w-full max-w-3xl text-center">
                {!capturedImage ? (
                    <>
                        <h3 className="text-xl font-semibold mb-4">Live Capture with Alignment Grid</h3>
                        <div className="relative inline-block border-2 border-[#6D282C]">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto rounded"></video>
                            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full"></canvas>
                        </div>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button onClick={handleCapture} className="relative px-8 py-3 bg-[#6D282C] border border-[#893338] rounded-sm shadow-[0_4px_20px_rgba(109,40,44,0.4)] transition-all duration-300 ease-out hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] active:scale-[0.98] text-white font-bold tracking-wide">Capture</button>
                            <button onClick={handleClose} className="relative px-8 py-3 bg-[#2a2b2c] border border-[#5f6368] rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:bg-[#3a3b3c] hover:border-[#777] active:scale-[0.98] text-white font-bold tracking-wide">Cancel</button>
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
                            <button onClick={handleCropSave} className="relative px-8 py-3 bg-[#6D282C] border border-[#893338] rounded-sm shadow-[0_4px_20px_rgba(109,40,44,0.4)] transition-all duration-300 ease-out hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] active:scale-[0.98] text-white font-bold tracking-wide">Finalize Crop</button>
                            <button onClick={() => { if (capturedImage?.startsWith('blob:')) URL.revokeObjectURL(capturedImage); setCapturedImage(null); }} className="relative px-8 py-3 bg-[#2a2b2c] border border-[#5f6368] rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:bg-[#3a3b3c] hover:border-[#777] active:scale-[0.98] text-white font-bold tracking-wide">Retake</button>
                            <button onClick={handleClose} className="relative px-8 py-3 bg-[#2a2b2c] border border-[#5f6368] rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:bg-[#3a3b3c] hover:border-[#777] active:scale-[0.98] text-white font-bold tracking-wide">Cancel</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


const calculateLineAngle = (p1: Point, p2: Point, p3: Point, p4: Point) => {
    const vec1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const vec2 = { x: p4.x - p3.x, y: p4.y - p3.y };

    const angle = angleBetweenVectors(vec1, vec2);
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
    const [visibleLandmarkSets, setVisibleLandmarkSets] = useState<Set<string>>(new Set());
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

    // Sync landmarks if legSide changes
    useEffect(() => {
        if (prevLegSideRef.current !== legSide) {
            prevLegSideRef.current = legSide;
        }
    }, [legSide]);

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
        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femurAnatomicAxis') && femurAnatomicAxisPoint) {
            const mechAxisVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const anatomicAxisVec = { x: femurAnatomicAxisPoint.x - kneeCenter.x, y: femurAnatomicAxisPoint.y - kneeCenter.y };
            newResults.vca = angleBetweenVectors(mechAxisVec, anatomicAxisVec);
        }
        if (visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femoralJointLine') && femoralMedial && femoralLateral) {
            const isLeftKnee = legSide === 'left';
            const sortedFemoral = [femoralMedial, femoralLateral].sort((a, b) => a.x - b.x);
            const leftFemoral = sortedFemoral[0];
            const rightFemoral = sortedFemoral[1];

            // Left Leg: Medial is Right (Inner). Right Leg: Medial is Left (Inner).
            const medialFemoralCondyle = isLeftKnee ? rightFemoral : leftFemoral;
            const lateralFemoralCondyle = isLeftKnee ? leftFemoral : rightFemoral;

            // For LDFA
            newResults.ldfa = calculateLineAngle(hipCenter, kneeCenter, medialFemoralCondyle, lateralFemoralCondyle);
        }
        if (visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('tibialJointLine') && tibialMedial && tibialLateral) {
            const isLeftKnee = legSide === 'left';
            const sortedTibial = [tibialMedial, tibialLateral].sort((a, b) => a.x - b.x);
            const leftTibial = sortedTibial[0];
            const rightTibial = sortedTibial[1];

            // Left Leg: Medial is Right (Inner). Right Leg: Medial is Left (Inner).
            const medialTibialCondyle = isLeftKnee ? rightTibial : leftTibial;
            const lateralTibialCondyle = isLeftKnee ? leftTibial : rightTibial;

            // For MPTA
            newResults.mpta = calculateLineAngle(ankleCenter, kneeCenter, lateralTibialCondyle, medialTibialCondyle);
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
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || Object.keys(landmarks).length === 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 12px Roboto, sans-serif';
        const { hipCenter, kneeCenter, ankleCenter, femurAnatomicAxisPoint, femoralMedial, femoralLateral, tibialMedial, tibialLateral } = landmarks;

        if (visibleLandmarkSets.has('hkaLine') && hipCenter && kneeCenter && ankleCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.hkaLine; ctx.fillStyle = LANDMARK_COLORS.hkaLine; ctx.lineWidth = BASE_LINE_WIDTH;
            ctx.beginPath(); ctx.moveTo(hipCenter.x, hipCenter.y); ctx.lineTo(kneeCenter.x, kneeCenter.y); ctx.lineTo(ankleCenter.x, ankleCenter.y); ctx.stroke();
            [hipCenter, kneeCenter, ankleCenter].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, BASE_HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); });
        }
        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('femurAnatomicAxis') && femurAnatomicAxisPoint && kneeCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis; ctx.lineWidth = BASE_LINE_WIDTH;
            ctx.beginPath(); ctx.moveTo(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y); ctx.lineTo(kneeCenter.x, kneeCenter.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y, BASE_HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
        }
        if (visibleLandmarkSets.has('femoralJointLine') && femoralMedial && femoralLateral) {
            ctx.strokeStyle = LANDMARK_COLORS.femoralJointLine; ctx.fillStyle = LANDMARK_COLORS.femoralJointLine; ctx.lineWidth = BASE_LINE_WIDTH;
            ctx.beginPath(); ctx.moveTo(femoralMedial.x, femoralMedial.y); ctx.lineTo(femoralLateral.x, femoralLateral.y); ctx.stroke();
            [femoralMedial, femoralLateral].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, BASE_HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); });

            // Draw M/L labels with background boxes
            const mOffsetX = (femoralMedial.x < (femoralMedial.x + femoralLateral.x) / 2 ? -30 : 15);
            const lOffsetX = (femoralLateral.x < (femoralMedial.x + femoralLateral.x) / 2 ? -30 : 15);

            ctx.fillStyle = 'rgba(29, 29, 31, 0.85)';
            ctx.fillRect(femoralMedial.x + mOffsetX - 4, femoralMedial.y - 10, 20, 22);
            ctx.fillRect(femoralLateral.x + lOffsetX - 4, femoralLateral.y - 10, 20, 22);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.fillText('M', femoralMedial.x + mOffsetX, femoralMedial.y + 6);
            ctx.fillText('L', femoralLateral.x + lOffsetX, femoralLateral.y + 6);
        }
        if (visibleLandmarkSets.has('tibialJointLine') && tibialMedial && tibialLateral) {
            ctx.strokeStyle = LANDMARK_COLORS.tibialJointLine; ctx.fillStyle = LANDMARK_COLORS.tibialJointLine; ctx.lineWidth = BASE_LINE_WIDTH;
            ctx.beginPath(); ctx.moveTo(tibialMedial.x, tibialMedial.y); ctx.lineTo(tibialLateral.x, tibialLateral.y); ctx.stroke();
            [tibialMedial, tibialLateral].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, BASE_HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); });

            // Draw M/L labels with background boxes
            const tmOffsetX = (tibialMedial.x < (tibialMedial.x + tibialLateral.x) / 2 ? -30 : 15);
            const tlOffsetX = (tibialLateral.x < (tibialMedial.x + tibialLateral.x) / 2 ? -30 : 15);

            ctx.fillStyle = 'rgba(29, 29, 31, 0.85)';
            ctx.fillRect(tibialMedial.x + tmOffsetX - 4, tibialMedial.y + 10, 20, 22);
            ctx.fillRect(tibialLateral.x + tlOffsetX - 4, tibialLateral.y + 10, 20, 22);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.fillText('M', tibialMedial.x + tmOffsetX, tibialMedial.y + 26);
            ctx.fillText('L', tibialLateral.x + tlOffsetX, tibialLateral.y + 26);
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
        const hitRadiusSq = (BASE_HANDLE_RADIUS + 50) ** 2; // Increased sensitivity
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
        const hitRadiusSq = (BASE_HANDLE_RADIUS + 50) ** 2; // Increased sensitivity for touch
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

    const handleResetAll = () => {
        if (canvasRef.current) resetLandmarks(canvasRef.current);
        setVisibleLandmarkSets(new Set());
        setResults({ ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', vca: null });
    };

    return (
        <div className="relative flex flex-col h-full rounded-lg">
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(dataUrl) => { setPostOpLongLegImage(dataUrl); setFileName('Camera Capture'); }} />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-grow h-full min-h-0 max-h-full overflow-hidden">
                {/* Viewer - Left side (75%) */}
                <div className="lg:col-span-3 relative w-full h-full max-h-full bg-black border border-[#333333] rounded-lg flex items-center justify-center overflow-hidden order-1 lg:order-none">
                    {postOpLongLegImage ? (
                        <>
                            <div className="relative w-full h-full max-h-full flex items-center justify-center overflow-hidden">
                                {/* Angle Values - Left Side (for Right Knee) */}
                                {legSide === 'right' && (results.ldfa != null || results.mpta != null || results.mhka != null) && (
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-none">
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
                                    </div>
                                )}
                                {/* Angle Values - Right Side (for Left Knee) */}
                                {legSide === 'left' && (results.ldfa != null || results.mpta != null || results.mhka != null) && (
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
                                    </div>
                                )}
                                <img ref={imageRef} src={postOpLongLegImage} alt="Post-op X-ray" className="block max-w-full max-h-full object-contain"
                                    onLoad={(e) => {
                                        const canvas = canvasRef.current;
                                        const image = imageRef.current;
                                        if (canvas && image) {
                                            const viewer = canvas.parentElement;
                                            if (viewer) {
                                                const viewerWidth = viewer.clientWidth;
                                                const viewerHeight = viewer.clientHeight;
                                                const imgRatio = image.naturalWidth / image.naturalHeight;
                                                const viewerRatio = viewerWidth / viewerHeight;

                                                let renderWidth, renderHeight;
                                                if (imgRatio > viewerRatio) {
                                                    renderWidth = viewerWidth;
                                                    renderHeight = viewerWidth / imgRatio;
                                                } else {
                                                    renderHeight = viewerHeight;
                                                    renderWidth = viewerHeight * imgRatio;
                                                }

                                                canvas.width = renderWidth;
                                                canvas.height = renderHeight;
                                                image.style.width = `${renderWidth}px`;
                                                image.style.height = `${renderHeight}px`;

                                                if (Object.keys(landmarks).length === 0) resetLandmarks(canvas);
                                            }
                                        }
                                    }}
                                />
                                <canvas ref={canvasRef} onTouchStart={handleTouchStart} className="absolute cursor-crosshair inset-0 m-auto touch-none" style={{ touchAction: 'none' }} onMouseDown={handleMouseDown} />
                            </div>
                            <div ref={pipViewerRef} onMouseDown={handlePipStart}
                                onTouchStart={handlePipStart} className="absolute w-24 h-24 border-2 border-dark-maroon bg-black rounded-full cursor-grab active:cursor-grabbing shadow-lg top-2 right-2 z-10" style={{ top: `${pipPosition.y}px`, left: `${pipPosition.x}px` }}>
                                <canvas ref={pipCanvasRef} width="128" height="128" className="rounded-full w-full h-full"></canvas>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-500 opacity-60">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">Upload Post-Op X-Ray</p>
                        </div>
                    )}
                </div>

                {/* Controls - Right side (25%) */}
                <div className="lg:col-span-1 flex flex-col space-y-1.5 h-full overflow-y-auto pr-1 order-2 lg:order-none">
                    <div className="shrink-0">
                        <h4 className="text-sm font-semibold text-[#E0E0E0] mb-1">Post-Op Image</h4>
                        <div className="flex gap-1 mb-1">
                            <label htmlFor="postop-xray-upload" className="cursor-pointer text-center py-2 px-2 rounded-sm font-bold text-xs bg-[#6D282C] border border-[#893338] hover:bg-[#893338] text-white tracking-wider flex-1 transition shadow-sm">
                                UPLOAD
                            </label>
                            <button onClick={() => setIsCameraOpen(true)} className="py-2 px-2 rounded-sm font-bold text-xs bg-[#6D282C] border border-[#893338] hover:bg-[#893338] text-white tracking-wider flex-1 transition shadow-sm">
                                LIVE CAPTURE
                            </button>
                        </div>
                        <input type="file" id="postop-xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <span className="text-[10px] text-gray-500 truncate inline-block w-full">{fileName}</span>
                        <p className="text-gray-500 text-[10px]">Side: <span className="text-[#E0E0E0] font-bold uppercase">{legSide}</span></p>
                    </div>

                    <div className="flex-grow flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-semibold text-[#E0E0E0]">Markings</h4>
                            <button onClick={handleResetAll} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold tracking-wider">Reset</button>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {landmarkButtons.map((btn) => {
                                if ((btn.mode as string) && btn.mode !== ldfaMode) return null;
                                const isSelected = visibleLandmarkSets.has(btn.key);
                                return <button key={btn.key} onClick={() => toggleLandmarkSet(btn.key as any)} className={`w-full py-3 px-3 rounded-sm font-semibold text-sm transition text-left border ${isSelected ? 'bg-[#6D282C] border-[#893338] text-white shadow-sm' : 'bg-[#252525] border-[#333333] hover:bg-[#333333] text-gray-400'}`}>{btn.text}</button>
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
        <div className="relative flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex justify-between items-center mb-1 no-print px-2 relative z-10">
                <h2 className="text-2xl font-bold text-[#E0E0E0]">Long Leg Result Verification</h2>
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

            <div className="grid grid-cols-1 lg:grid-cols-[30fr_70fr] gap-0.5 h-[calc(100vh-160px)] px-0.5 pb-0 relative z-10 overflow-hidden">
                {/* Column 1: Pre-op */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-0.5 rounded-lg flex flex-col min-h-0 max-h-full overflow-hidden">
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
                <div className="relative bg-[#1a1a1a] border border-[#333333] p-0.5 rounded-lg flex flex-col min-h-0 max-h-full overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <h3 className="text-sm font-bold text-center text-[#E0E0E0] uppercase tracking-wider bg-[#252525] py-0.5 rounded relative z-10 shrink-0">Post-Op Verification</h3>
                    <div className="flex-grow min-h-0 max-h-full relative mt-0.5 overflow-hidden">
                        <PostOpPlanner />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PastCaseResultPage;
