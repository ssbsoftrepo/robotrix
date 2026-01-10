import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, LegSide, Point } from '../types';

const landmarkInstructions = {
    hkaLine: ["Mark hip center.", "Mark knee center.", "Mark ankle center."],
    femurAnatomicAxis: ["Mark the anatomical mid femoral axis."],
    femoralJointLine: ["Mark the most distal part of medial (M) femoral condyle.", "Mark the most distal part of lateral (L) femoral condyle."],
    tibialJointLine: ["Mark the highest point of medial (M) tibial condyle.", "Mark the highest point of lateral (L) tibial condyle."],
};

const HANDLE_RADIUS = 6;

const resolveMedialLateral = (
    p1: Point,
    p2: Point,
    kneeCenter: Point,
    legSide: LegSide
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
const classifyJloType = (jlo: number) => {
    if (jlo < 177) return 'APEX DISTAL';
    if (jlo > 183) return 'APEX PROXIMAL';
    return 'APEX NEUTRAL';
};


const LANDMARK_COLORS = {
    hkaLine: '#6D282C',
    femurAnatomicAxis: '#6D282C',
    femoralJointLine: '#6D282C',
    tibialJointLine: '#6D282C',
};

// --- GEOMETRY HELPERS ---

const angleBetweenVectors = (v1: Point, v2: Point) => {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    if (mag1 === 0 || mag2 === 0) return 0;
    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosTheta) * (180 / Math.PI);
};


const calculateLineAngle = (p1: Point, p2: Point, p3: Point, p4: Point) => {
    const vec1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const vec2 = { x: p4.x - p3.x, y: p4.y - p3.y };

    const angle = angleBetweenVectors(vec1, vec2);
    return angle;
};


const getLongLegCpakType = (ahka: number, jlo: number): string => {
    let ahkaClass: 'varus' | 'neutral' | 'valgus';

    // CORRECTION: Use strictly less/greater than (<, >) instead of inclusive (<=, >=)
    // -2 and 2 must fall into the 'else' (neutral) block.
    if (ahka < -2) ahkaClass = 'varus';
    else if (ahka > 2) ahkaClass = 'valgus';
    else ahkaClass = 'neutral';

    let jloClass: 'distal' | 'neutral' | 'proximal';

    // JLO Logic was already correct per screenshot
    if (jlo < 177) jloClass = 'distal';
    else if (jlo > 183) jloClass = 'proximal';
    else jloClass = 'neutral';

    if (jloClass === 'distal') {
        if (ahkaClass === 'varus') return '1';
        if (ahkaClass === 'neutral') return '2';
        return '3';
    }
    if (jloClass === 'neutral') {
        if (ahkaClass === 'varus') return '4';
        if (ahkaClass === 'neutral') return '5';
        return '6';
    }
    // Proximal
    if (ahkaClass === 'varus') return '7';
    if (ahkaClass === 'neutral') return '8';
    return '9';
};


const getLongLegValgusCut = (ldfa: number | null): string => {
    if (ldfa === null) return '--';
    if (ldfa > 92) return '2° valgus cut';
    if (ldfa > 91) return '3° valgus cut';
    if (ldfa > 88) return '4° valgus cut';
    if (ldfa > 87) return '5° valgus cut';
    if (ldfa > 86) return '6° valgus cut';
    return '6° valgus cut (Warning: Native LDFA out of boundary)';
};

const getRecommendedVarusCut = (mpta: number | null) => {
    if (mpta === null) return '--';
    if (mpta > 89) return '0° (neutral cut)';
    if (mpta > 88) return '1° varus cut';
    if (mpta > 87) return '2° varus cut';
    if (mpta > 85) return '3° varus cut';
    if (mpta > 84) return '4° varus cut';
    return '4° varus cut (Warning: Native MPTA out of boundary)';
};

// --- CAMERA MODAL (Unchanged) ---
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
            <div className="bg-gray-800 p-4 rounded-lg relative w-full max-w-3xl text-center">
                {!capturedImage ? (
                    <>
                        <h3 className="text-xl font-semibold mb-4">Live Capture with Alignment Grid</h3>
                        <div className="relative inline-block border-2 border-gray-600">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto rounded"></video>
                            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full"></canvas>
                        </div>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button onClick={handleCapture} className="gemini-dark-button font-bold py-3 px-8 rounded-lg">Capture</button>
                            <button onClick={handleClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg">Cancel</button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-semibold mb-4">Crop Captured Image</h3>
                        <div className="relative inline-block border-2 border-yellow-500 overflow-hidden select-none touch-none" onMouseMove={handleCropMouseMove} onTouchMove={handleCropMouseMove} onMouseUp={() => setActiveInteraction(null)} onTouchEnd={() => setActiveInteraction(null)}>
                            <img src={capturedImage} alt="Captured" className="w-full h-auto pointer-events-none" />
                            <div ref={cropBoxRef} onMouseDown={(e) => handleCropMouseDown(e, 'move')} onTouchStart={(e) => handleCropMouseDown(e, 'move')} className="absolute border-2 border-dashed border-white bg-white/20 cursor-move" style={{ left: `${cropRect.x}%`, top: `${cropRect.y}%`, width: `${cropRect.width}%`, height: `${cropRect.height}%` }}>
                                <div className="absolute -top-3 -left-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-nw-resize z-50 shadow-md" onMouseDown={(e) => handleCropMouseDown(e, 'tl')} onTouchStart={(e) => handleCropMouseDown(e, 'tl')} />
                                <div className="absolute -top-3 -right-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-ne-resize z-50 shadow-md" onMouseDown={(e) => handleCropMouseDown(e, 'tr')} onTouchStart={(e) => handleCropMouseDown(e, 'tr')} />
                                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-sw-resize z-50 shadow-md" onMouseDown={(e) => handleCropMouseDown(e, 'bl')} onTouchStart={(e) => handleCropMouseDown(e, 'bl')} />
                                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md" onMouseDown={(e) => handleCropMouseDown(e, 'br')} onTouchStart={(e) => handleCropMouseDown(e, 'br')} />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button onClick={handleCropSave} className="gemini-dark-button font-bold py-3 px-8 rounded-lg">Finalize Crop</button>
                            <button onClick={() => { if (capturedImage?.startsWith('blob:')) URL.revokeObjectURL(capturedImage); setCapturedImage(null); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg">Retake</button>
                            <button onClick={handleClose} className="bg-[#5D4037] hover:bg-[#3E2723] text-white font-bold py-3 px-8 rounded-lg">Cancel</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const MetricItem: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className={`relative flex flex-col justify-center items-center p-2 rounded-lg text-center h-full overflow-hidden transition-all
        ${highlight
            ? 'bg-[#6D282C]/20 border-2 border-[#6D282C]'
            : 'bg-[#1a1a1a] border border-[#333333]'}`}>
        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium relative z-10">{label}</p>
        <p className={`font-bold text-xl relative z-10 font-mono ${highlight ? 'text-[#ff8fa3]' : 'text-gray-100'}`}>{value}</p>
    </div>
);

const LongLegPlannerPage: React.FC = () => {
    const {
        legSide, setLegSide,
        longLegImageSrc, setLongLegImageSrc,
        setLongLegResults, longLegResults,
        setLongLegCanvasDataUrl, setPage,
        longLegLandmarks, setLongLegLandmarks,
        ldfaMode,
        kneeType,
        setFemurBoundary, setTibiaBoundary
    } = useAppContext();

    const [fileName, setFileName] = useState('No file chosen');
    const [uploadMethod, setUploadMethod] = useState<'file' | 'camera' | null>(null);
    const [visibleLandmarkSets, setVisibleLandmarkSets] = useState<Set<string>>(new Set());
    const [activeInstruction, setActiveInstruction] = useState<string[] | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });

    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pipCanvasRef = useRef<HTMLCanvasElement>(null);
    const pipViewerRef = useRef<HTMLDivElement>(null);

    const draggingPointRef = useRef<string | null>(null);
    const isDraggingPipRef = useRef(false);
    const pipDragOffset = useRef({ x: 0, y: 0 });
    const prevLegSideRef = useRef(legSide);
    const localResultsRef = useRef(longLegResults);
    const justAdjustedHipRef = useRef(false);
    const [zoom, setZoom] = useState(1);
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 3;
    const lastResizeTimeRef = useRef(0);

    const zoomIn = () => setZoom(z => Math.min(z + 0.2, MAX_ZOOM));
    const zoomOut = () => setZoom(z => Math.max(z - 0.2, MIN_ZOOM));
    const resetZoom = () => setZoom(1);

    const viewerRef = useRef<HTMLDivElement>(null);
    const activeLandmarkRef = useRef<string | null>(null);

    useEffect(() => {
        if (longLegResults && Object.values(longLegResults).some(v => v !== null && v !== '--')) {
            const newSets = new Set<string>();
            if (longLegResults.mhka !== null) newSets.add('hkaLine');
            if (longLegResults.ldfa !== null) newSets.add('femoralJointLine');
            if (longLegResults.mpta !== null) newSets.add('tibialJointLine');
            if (longLegResults.vca !== null) newSets.add('femurAnatomicAxis');
            setVisibleLandmarkSets(newSets);
        }
    }, []);

    // Swap medial/lateral landmarks when leg side changes
    useEffect(() => {
        if (prevLegSideRef.current !== legSide) {
            setLongLegLandmarks(prev => {
                if (!prev.femoralMedial || !prev.femoralLateral || !prev.tibialMedial || !prev.tibialLateral) return prev;
                return {
                    ...prev,
                    femoralMedial: prev.femoralLateral,
                    femoralLateral: prev.femoralMedial,
                    tibialMedial: prev.tibialLateral,
                    tibialLateral: prev.tibialMedial
                };
            });
            prevLegSideRef.current = legSide;
        }
    }, [legSide, setLongLegLandmarks]);


    useEffect(() => {
        if (ldfaMode !== 'corrected') return;
        if (justAdjustedHipRef.current) { justAdjustedHipRef.current = false; return; }

        const femurAnatomicPoint = longLegLandmarks.femurAnatomicAxisPoint;
        if (femurAnatomicPoint && visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femurAnatomicAxis')) {
            const { kneeCenter, hipCenter } = longLegLandmarks;
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
                setLongLegLandmarks({ ...longLegLandmarks, hipCenter: { x: newHipX, y: hipCenter.y } });
            }
        }
    }, [longLegLandmarks, visibleLandmarkSets, legSide, setLongLegLandmarks, ldfaMode]);


    const resetLandmarks = useCallback((canvas: HTMLCanvasElement) => {
        const w = canvas.width; const h = canvas.height;
        const isLeft = legSide === 'left';

        setLongLegLandmarks({
            hipCenter: { x: w * 0.5, y: h * 0.1 },
            kneeCenter: { x: w * 0.5, y: h * 0.5 },
            ankleCenter: { x: w * 0.5, y: h * 0.9 },
            femurAnatomicAxisPoint: { x: w * 0.5, y: h * 0.25 },
            femoralMedial: { x: isLeft ? w * 0.55 : w * 0.45, y: h * 0.55 },
            femoralLateral: { x: isLeft ? w * 0.45 : w * 0.55, y: h * 0.55 },
            tibialMedial: { x: isLeft ? w * 0.55 : w * 0.45, y: h * 0.6 },
            tibialLateral: { x: isLeft ? w * 0.45 : w * 0.55, y: h * 0.6 },
        });
    }, [setLongLegLandmarks, legSide]);

    const handleImageLoad = (src: string, name: string, method: 'file' | 'camera') => {
        setLongLegImageSrc(src);
        setFileName(name);
        setUploadMethod(method);
    };

    const validateMeasurements = (ldfa: number, mpta: number) => {
        if (ldfa < 45 || mpta < 45 || ldfa > 160 || mpta > 160) {
            return { status: 'error', msg: 'Error: Values outside physiological limits.' };
        }
        if (ldfa <= 80 || ldfa >= 100 || mpta <= 80 || mpta >= 100) {
            return { status: 'warning', msg: 'Warning: High risk anatomy detected.' };
        }
        return { status: 'success', msg: '' };
    };


    // --- 2. UPDATED CALCULATION LOOP ---
    const updateCalculations = useCallback(() => {
        const { hipCenter, kneeCenter, ankleCenter, femurAnatomicAxisPoint, femoralMedial, femoralLateral, tibialMedial, tibialLateral } = longLegLandmarks;

        // Basic check: need centers to do HKA
        if (!hipCenter || !kneeCenter || !ankleCenter) return;

        let newResults = { ...localResultsRef.current };

        // 1. mHKA (Mechanical Hip-Knee-Ankle Angle)
        if (visibleLandmarkSets.has('hkaLine')) {
            const femurVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const tibiaVec = { x: ankleCenter.x - kneeCenter.x, y: ankleCenter.y - kneeCenter.y };
            const rawAngle = angleBetweenVectors(femurVec, tibiaVec);
            // mHKA is deviation from 180
            // newResults.mhka = rawAngle - 180;
            newResults.mhka = 180 - rawAngle;

        }

        // 2. LDFA (Lateral Distal Femoral Angle)
        if (
            visibleLandmarkSets.has('hkaLine') &&
            visibleLandmarkSets.has('femoralJointLine') &&
            femoralMedial &&
            femoralLateral
        ) {
            newResults.ldfa = calculateLineAngle(hipCenter, kneeCenter, femoralMedial, femoralLateral);
        }

        // 3. MPTA (Medial Proximal Tibial Angle)
        if (
            visibleLandmarkSets.has('hkaLine') &&
            visibleLandmarkSets.has('tibialJointLine') &&
            tibialMedial &&
            tibialLateral
        ) {
            newResults.mpta = calculateLineAngle(ankleCenter, kneeCenter, tibialLateral, tibialMedial);
        }

        if (newResults.ldfa !== null && newResults.mpta !== null) {
            const ahka = newResults.mpta - newResults.ldfa;
            // const jlo = newResults.mpta + newResults.ldfa;
            const jlo = Number((newResults.mpta + newResults.ldfa).toFixed(1));


            let obliquity = 0;
            if (femoralMedial && femoralLateral) {
                const dy = femoralMedial.y - femoralLateral.y;
                const dx = femoralMedial.x - femoralLateral.x;
                let angleDeg = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
                if (angleDeg > 180) angleDeg = 360 - angleDeg;
                if (angleDeg > 90) angleDeg = 180 - angleDeg;
                obliquity = angleDeg;
            }

            let cpakHka = ahka;
            if (newResults.mhka !== null && Math.abs(obliquity) < 3.0) {
                cpakHka = ahka;
            }

            const cpakType = getLongLegCpakType(cpakHka, jlo);
            const jloType = classifyJloType(jlo);


            newResults = {
                ...newResults,
                ahka,
                jlo,
                jloType,
                cpak: cpakType,
                cut: getLongLegValgusCut(newResults.ldfa),
                recommendedVarusCut: getRecommendedVarusCut(newResults.mpta),
            };
        }

        // VCA Calculation (Femur Anatomic)
        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femurAnatomicAxis') && femurAnatomicAxisPoint) {
            const mechAxisVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const anatomicAxisVec = { x: femurAnatomicAxisPoint.x - kneeCenter.x, y: femurAnatomicAxisPoint.y - kneeCenter.y };
            newResults.vca = angleBetweenVectors(mechAxisVec, anatomicAxisVec);
        }

        // Only update state if results actually changed to prevent loops
        if (JSON.stringify(newResults) !== JSON.stringify(localResultsRef.current)) {
            localResultsRef.current = newResults;
            setLongLegResults(newResults);
        }
    }, [longLegLandmarks, visibleLandmarkSets, legSide, setLongLegResults, ldfaMode]);

    useEffect(() => {
        updateCalculations();
    }, [longLegLandmarks, visibleLandmarkSets, legSide, updateCalculations, ldfaMode]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (Object.keys(longLegLandmarks).length === 0) return;

        ctx.font = 'bold 16px Roboto, sans-serif';

        const { hipCenter, kneeCenter, ankleCenter, femurAnatomicAxisPoint, femoralMedial, femoralLateral, tibialMedial, tibialLateral } = longLegLandmarks;
        const getLabelOffsetX = (point: Point, kneeCenter: Point) => {
            return point.x < kneeCenter.x ? -20 : 10;
        };

        const drawTextWithBackground = (text: string, x: number, y: number) => {
            ctx.fillStyle = 'rgba(29, 29, 31, 0.8)';
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const boxPadding = 8;
            ctx.fillRect(x - textWidth / 2 - boxPadding, y - 20, textWidth + boxPadding * 2, 30);
            ctx.fillStyle = 'white';
            ctx.fillText(text, x - textWidth / 2, y);
        };

        if (visibleLandmarkSets.has('hkaLine')) {
            if (hipCenter && kneeCenter) {
                ctx.strokeStyle = LANDMARK_COLORS.hkaLine;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(hipCenter.x, hipCenter.y); ctx.lineTo(kneeCenter.x, kneeCenter.y); ctx.stroke();
            }
            if (kneeCenter && ankleCenter) {
                ctx.strokeStyle = LANDMARK_COLORS.hkaLine;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(kneeCenter.x, kneeCenter.y); ctx.lineTo(ankleCenter.x, ankleCenter.y); ctx.stroke();
            }
            ctx.fillStyle = LANDMARK_COLORS.hkaLine;
            [hipCenter, kneeCenter, ankleCenter].forEach(p => {
                if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); }
            });
            if (kneeCenter && localResultsRef.current.mhka !== null) {
                drawTextWithBackground(`mHKA: ${localResultsRef.current.mhka.toFixed(1)}°`, kneeCenter.x, kneeCenter.y - 50);
            }
        }

        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('femurAnatomicAxis')) {
            if (femurAnatomicAxisPoint && kneeCenter) {
                ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y); ctx.lineTo(kneeCenter.x, kneeCenter.y); ctx.stroke();
            }
            if (femurAnatomicAxisPoint) {
                ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis;
                ctx.beginPath(); ctx.arc(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
            }
        }

        if (visibleLandmarkSets.has('femoralJointLine')) {
            if (femoralMedial && femoralLateral) {
                ctx.strokeStyle = LANDMARK_COLORS.femoralJointLine;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(femoralMedial.x, femoralMedial.y); ctx.lineTo(femoralLateral.x, femoralLateral.y); ctx.stroke();
            }
            ctx.fillStyle = LANDMARK_COLORS.femoralJointLine;
            [femoralMedial, femoralLateral].forEach(p => {
                if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); }
            });
            if (femoralMedial && femoralLateral && kneeCenter) {
                const { medial, lateral } = resolveMedialLateral(
                    femoralMedial,
                    femoralLateral,
                    kneeCenter,
                    legSide
                );

                ctx.fillStyle = "#e3e3e3";
                const mOffsetX = getLabelOffsetX(medial, kneeCenter);
                const lOffsetX = getLabelOffsetX(lateral, kneeCenter);

                ctx.fillText('M', medial.x + mOffsetX, medial.y + 5);
                ctx.fillText('L', lateral.x + lOffsetX, lateral.y + 5);

            }

            if (kneeCenter && visibleLandmarkSets.has('hkaLine') && localResultsRef.current.ldfa !== null) {
                drawTextWithBackground(`LDFA: ${localResultsRef.current.ldfa.toFixed(1)}°`, kneeCenter.x, kneeCenter.y - 85);
            }
        }

        if (visibleLandmarkSets.has('tibialJointLine')) {
            if (tibialMedial && tibialLateral) {
                ctx.strokeStyle = LANDMARK_COLORS.tibialJointLine;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(tibialMedial.x, tibialMedial.y); ctx.lineTo(tibialLateral.x, tibialLateral.y); ctx.stroke();
            }
            ctx.fillStyle = LANDMARK_COLORS.tibialJointLine;
            [tibialMedial, tibialLateral].forEach(p => {
                if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); }
            });
            if (tibialMedial && tibialLateral && kneeCenter) {
                const { medial, lateral } = resolveMedialLateral(
                    tibialMedial,
                    tibialLateral,
                    kneeCenter,
                    legSide
                );

                ctx.fillStyle = "#e3e3e3";
                const mOffsetX = getLabelOffsetX(medial, kneeCenter);
                const lOffsetX = getLabelOffsetX(lateral, kneeCenter);

                ctx.fillText('M', medial.x + mOffsetX, medial.y + 5);
                ctx.fillText('L', lateral.x + lOffsetX, lateral.y + 5);

            }

            if (kneeCenter && visibleLandmarkSets.has('hkaLine') && localResultsRef.current.mpta !== null) {
                drawTextWithBackground(`MPTA: ${localResultsRef.current.mpta.toFixed(1)}°`, kneeCenter.x, kneeCenter.y + 55);
            }
        }
    }, [longLegLandmarks, visibleLandmarkSets, legSide, ldfaMode]);

    const captureCanvasState = useCallback(() => {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        if (!image?.src || !canvas) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            setLongLegCanvasDataUrl(tempCanvas.toDataURL('image/png'));
        }
    }, [setLongLegCanvasDataUrl]);

    useEffect(() => { draw(); }, [draw]);

    useEffect(() => {
        const handleResize = () => {
            const now = Date.now();
            if (now - lastResizeTimeRef.current < 100) return;
            lastResizeTimeRef.current = now;
            const img = imageRef.current; const canvas = canvasRef.current;
            if (!img || !canvas || img.naturalWidth === 0) return;
            const viewer = canvas.parentElement?.parentElement;
            if (!viewer) return;
            const availWidth = viewer.clientWidth - 16; const availHeight = viewer.clientHeight - 16;
            const oldW = parseFloat(img.style.width) || img.width;
            const aspect = img.naturalWidth / img.naturalHeight;
            let newW = availHeight * aspect; let newH = availHeight;
            if (newW > availWidth) { newW = availWidth; newH = newW / aspect; }
            if (Math.abs(newW - oldW) > 1) {
                const scale = newW / oldW;
                img.style.width = `${newW}px`; img.style.height = `${newH}px`;
                canvas.width = newW; canvas.height = newH;
                setLongLegLandmarks(prev => {
                    const next: any = {};
                    for (const key in prev) { if (prev[key]) { next[key] = { x: prev[key].x * scale, y: prev[key].y * scale }; } }
                    return next as Landmarks;
                });
                requestAnimationFrame(draw);
            }
        };
        window.addEventListener('resize', handleResize);
        const interval = setInterval(handleResize, 1000);
        return () => { window.removeEventListener('resize', handleResize); clearInterval(interval); };
    }, [draw, setLongLegLandmarks]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => { if (event.target?.result) { handleImageLoad(event.target.result as string, file.name, 'file'); } };
            reader.readAsDataURL(file);
        }
    };

    const toggleLandmarkSet = (setName: keyof typeof landmarkInstructions) => {
        const newSets = new Set(visibleLandmarkSets);
        if (newSets.has(setName)) { newSets.delete(setName); activeLandmarkRef.current = null; setActiveInstruction(null); }
        else {
            newSets.add(setName);
            activeLandmarkRef.current = setName === 'hkaLine' ? 'hipCenter' : setName === 'femurAnatomicAxis' ? 'femurAnatomicAxisPoint' : null;
            setActiveInstruction(landmarkInstructions[setName]);
        }
        setVisibleLandmarkSets(newSets);
    };

    const handleResetAll = () => {
        if (canvasRef.current) resetLandmarks(canvasRef.current);
        setVisibleLandmarkSets(new Set()); setActiveInstruction(null);
        setLongLegResults({ ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', vca: null });
        setFemurBoundary(null); setTibiaBoundary(null);
        setLongLegCanvasDataUrl(null);
    };

    const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const getImageCoordinates = (e: React.MouseEvent | React.TouchEvent, container: HTMLDivElement) => {
        const rect = container.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) / zoom; const y = (clientY - rect.top) / zoom;
        return { x, y };
    };

    const handleViewerTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!viewerRef.current || !activeLandmarkRef.current) return;
        e.preventDefault();
        const { x, y } = getImageCoordinates(e, viewerRef.current);
        setLongLegLandmarks(prev => ({ ...prev, [activeLandmarkRef.current!]: { x, y } }));
    };

    const updatePip = useCallback((overridePos?: Point) => {
        const key = draggingPointRef.current; const image = imageRef.current; const canvas = canvasRef.current; const pipCanvas = pipCanvasRef.current;
        const pos = overridePos || (key ? longLegLandmarks[key] : null);
        if (!pos || !image || !canvas || !pipCanvas) return;
        const pipCtx = pipCanvas.getContext('2d'); if (!pipCtx) return;
        const zoomLevel = 4; const sourceSize = pipCanvas.width / zoomLevel;
        pipCtx.fillStyle = 'black'; pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);
        const imgScaleX = image.naturalWidth / canvas.width; const imgScaleY = image.naturalHeight / canvas.height;
        pipCtx.drawImage(image, (pos.x * imgScaleX) - (sourceSize / 2), (pos.y * imgScaleY) - (sourceSize / 2), sourceSize, sourceSize, 0, 0, pipCanvas.width, pipCanvas.height);
        pipCtx.strokeStyle = '#fdd835'; pipCtx.lineWidth = 1; pipCtx.beginPath();
        pipCtx.moveTo(pipCanvas.width / 2, 0); pipCtx.lineTo(pipCanvas.width / 2, pipCanvas.height);
        pipCtx.moveTo(0, pipCanvas.height / 2); pipCtx.lineTo(pipCanvas.width, pipCanvas.height / 2);
        pipCtx.stroke();
    }, [longLegLandmarks]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
        const hitRadiusSq = (HANDLE_RADIUS + 50) ** 2; let minDistSq = hitRadiusSq; let closestKey: string | null = null;
        for (const key in longLegLandmarks) {
            if (!longLegLandmarks[key]) continue;
            const distSq = (longLegLandmarks[key].x - pos.x) ** 2 + (longLegLandmarks[key].y - pos.y) ** 2;
            if (distSq < minDistSq) { minDistSq = distSq; closestKey = key; }
        }
        if (closestKey) draggingPointRef.current = closestKey;
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingPointRef.current) return;
        const canvas = canvasRef.current; if (!canvas) return;
        const pos = getCanvasPos(canvas, e.clientX, e.clientY);
        setLongLegLandmarks(prev => ({ ...prev, [draggingPointRef.current!]: pos }));
        updatePip(pos);
    }, [setLongLegLandmarks, updatePip]);

    const handleMouseUp = useCallback(() => { draggingPointRef.current = null; captureCanvasState(); }, [captureCanvasState]);

    const handlePipStart = (e: React.MouseEvent | React.TouchEvent) => {
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
        const viewer = pipViewerRef.current?.parentElement; if (!viewer) return;
        const viewerRect = viewer.getBoundingClientRect();
        const pipSize = 160;
        let newX = clientX - viewerRect.left - pipDragOffset.current.x; let newY = clientY - viewerRect.top - pipDragOffset.current.y;
        newX = Math.max(20, Math.min(newX, viewerRect.width - pipSize - 20)); newY = Math.max(20, Math.min(newY, viewerRect.height - pipSize - 20));
        setPipPosition({ x: newX, y: newY });
    }, []);

    const handlePipEnd = useCallback(() => { isDraggingPipRef.current = false; }, []);

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const touch = e.touches[0]; if (!touch) return;
        const canvas = canvasRef.current; if (!canvas) return;
        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
        const hitRadiusSq = (HANDLE_RADIUS + 60) ** 2; let minDistSq = hitRadiusSq; let closestKey: string | null = null;
        for (const key in longLegLandmarks) {
            if (!longLegLandmarks[key]) continue;
            const distSq = (longLegLandmarks[key].x - pos.x) ** 2 + (longLegLandmarks[key].y - pos.y) ** 2;
            if (distSq < minDistSq) { minDistSq = distSq; closestKey = key; }
        }
        if (closestKey) draggingPointRef.current = closestKey;
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!draggingPointRef.current) return;
        e.preventDefault();
        const touch = e.touches[0]; if (!touch) return;
        const canvas = canvasRef.current; if (!canvas) return;
        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
        setLongLegLandmarks(prev => ({ ...prev, [draggingPointRef.current!]: pos }));
        updatePip(pos);
    }, [setLongLegLandmarks, updatePip]);

    const handleTouchEnd = useCallback(() => { draggingPointRef.current = null; captureCanvasState(); }, [captureCanvasState]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handlePipMove); window.addEventListener('mouseup', handlePipEnd);
        window.addEventListener('touchmove', handlePipMove, { passive: false }); window.addEventListener('touchend', handlePipEnd); window.addEventListener('touchcancel', handlePipEnd);
        window.addEventListener('touchmove', handleTouchMove, { passive: false }); window.addEventListener('touchend', handleTouchEnd); window.addEventListener('touchcancel', handleTouchEnd);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handlePipMove); window.removeEventListener('mouseup', handlePipEnd);
            window.removeEventListener('touchmove', handlePipMove); window.removeEventListener('touchend', handlePipEnd); window.removeEventListener('touchcancel', handlePipEnd);
            window.removeEventListener('touchmove', handleTouchMove); window.removeEventListener('touchend', handleTouchEnd); window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handlePipMove, handlePipEnd, handleTouchMove, handleTouchEnd]);

    const landmarkButtons = [
        { key: 'hkaLine', text: 'HKA Line' },
        { key: 'femurAnatomicAxis', text: 'Femur Anatomic Axis', mode: 'corrected' },
        { key: 'femoralJointLine', text: 'Femoral Articulating Line' },
        { key: 'tibialJointLine', text: 'Tibial Articulating Line' },
    ];

    if (kneeType === 'valgus') {
        return (
            <div className="flex flex-col h-full items-center justify-center">
                <h2 className="text-5xl font-bold mb-8 text-center">Long leg film Planner for VALGUS KNEE</h2>
                <div className="gemini-dark-card p-12 rounded-lg text-center">
                    <p className="text-3xl text-yellow-400">Updates Coming Soon</p>
                    <p className="text-xl text-gray-300 mt-4">This planner is currently under development. Please check back later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full gap-4 overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            {isCameraOpen && (
                <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(dataUrl) => handleImageLoad(dataUrl, 'Live Photo.png', 'camera')} />
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0] tracking-tight">Long Leg Functional Alignment</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-[#6D282C] animate-pulse" />
                    <span>Active Workspace</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[75fr_25fr] gap-4 flex-grow min-h-0 px-4 relative z-10">
                {/* LEFT: X-Ray Canvas (75%) */}
                <div className="relative bg-[#0a0a0a] border border-[#333333] rounded-lg overflow-hidden h-[calc(100vh-200px)] flex items-center justify-center">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
                    {zoom > 1 && (<div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-yellow-500/90 text-black px-4 py-1 rounded-full font-bold shadow-lg animate-pulse">Reset zoom to mark the markings</div>)}
                    <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                        <button onClick={zoomIn} className="bg-black/70 px-3 py-1 rounded"> ＋ </button>
                        <button onClick={zoomOut} className="bg-black/70 px-3 py-1 rounded"> － </button>
                        <button onClick={resetZoom} className="bg-black/70 px-2 py-1 rounded text-xs">Reset</button>
                    </div>
                    {!longLegImageSrc ? (
                        <div className="text-center text-gray-400 cursor-pointer p-10 border-2 border-dashed border-gray-600 rounded-lg hover:bg-white/5 transition" onClick={() => document.getElementById('xray-upload')?.click()}>
                            <p className="text-xl font-bold">Upload an X-ray to begin</p>
                            <p className="text-sm mt-2 opacity-70">Tap here or use the controls on the right</p>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <div ref={viewerRef} onClick={handleViewerTap} onTouchEnd={handleViewerTap} onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => { }} className="relative w-full h-full overflow-hidden touch-none flex items-center justify-center">
                                <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
                                    <img ref={imageRef} src={longLegImageSrc} alt="X-ray" className="block mix-blend-screen" onLoad={() => {
                                        const image = imageRef.current; const canvas = canvasRef.current;
                                        if (!image || !canvas) return;
                                        const viewer = canvas.parentElement?.parentElement; if (!viewer) return;
                                        const availableHeight = viewer.clientHeight - 16; const availableWidth = viewer.clientWidth - 16;
                                        const aspect = image.naturalWidth / image.naturalHeight;
                                        let h = availableHeight; let w = h * aspect;
                                        if (w > availableWidth) { w = availableWidth; h = w / aspect; }
                                        canvas.width = w; canvas.height = h; image.style.width = `${w}px`; image.style.height = `${h}px`;
                                        if (Object.keys(longLegLandmarks).length === 0) resetLandmarks(canvas);
                                        requestAnimationFrame(draw);
                                    }} />
                                    <canvas ref={canvasRef} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} className="absolute top-0 left-0 cursor-crosshair touch-none" />
                                </div>
                                <div ref={pipViewerRef} onMouseDown={handlePipStart} onTouchStart={handlePipStart}
                                    className="absolute w-44 h-44 rounded-full border-4 border-cyan-400 bg-black shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-grab touch-none"
                                    style={{ top: pipPosition.y, left: pipPosition.x }}>
                                    <canvas ref={pipCanvasRef} width={176} height={176} className="rounded-full" />
                                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* RIGHT: Control & Instrument Panel (25%) */}
                <div className="relative bg-[#1a1a1a] border border-[#333333] rounded-lg p-4 flex flex-col gap-4 overflow-y-auto h-[calc(100vh-200px)]">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />

                    {/* Upload Section */}
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
                    </section>

                    {/* Leg Side Toggle */}
                    <section className="relative z-10">
                        <div className="bg-[#252525] p-3 rounded-lg border border-[#333333] flex items-center justify-between">
                            <span className="text-gray-400 font-medium text-xs uppercase tracking-wider">Leg Side</span>
                            <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#333333]">
                                <button onClick={() => setLegSide('left')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${legSide === 'left' ? 'bg-[#6D282C] text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}>LEFT</button>
                                <button onClick={() => setLegSide('right')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${legSide === 'right' ? 'bg-[#6D282C] text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}>RIGHT</button>
                            </div>
                        </div>
                    </section>

                    {/* Metrics Grid */}
                    <section className="relative z-10">
                        <h4 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Calculated Metrics</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <MetricItem label="LDFA" value={`${longLegResults.ldfa?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="MPTA" value={`${longLegResults.mpta?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="aHKA" value={`${longLegResults.ahka?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="mHKA" value={`${longLegResults.mhka?.toFixed(1) ?? '--'}°`} highlight />
                            <MetricItem label="JLO" value={`${longLegResults.jlo?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="CPAK" value={longLegResults.cpak} highlight />
                        </div>
                    </section>

                    {/* Landmark Stepper Cards */}
                    <section className="relative z-10">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Workflow Steps</h3>
                        </div>
                        <div className="flex flex-col gap-2 mb-3">
                            {landmarkButtons.map((btn, idx) => {
                                if (btn.mode && btn.mode !== ldfaMode) return null;
                                const active = visibleLandmarkSets.has(btn.key);
                                return (
                                    <button
                                        key={btn.key}
                                        onClick={() => toggleLandmarkSet(btn.key as any)}
                                        className={`group relative w-full py-3 px-4 text-sm font-semibold rounded-lg border transition-all text-left flex items-center gap-3
                                            ${active
                                                ? 'bg-gradient-to-r from-[#6D282C] to-[#893338] border-[#a04046] text-white shadow-[0_0_20px_rgba(109,40,44,0.3)]'
                                                : 'bg-[#252525] border-[#333333] hover:bg-[#333333] hover:border-[#6D282C]/50 text-gray-300'}`}>
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                                            ${active ? 'bg-white text-[#6D282C] border-white' : 'bg-transparent border-gray-500 text-gray-500'}`}>
                                            {active ? '✓' : idx + 1}
                                        </span>
                                        <span>{btn.text}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={handleResetAll} className="w-full py-2.5 text-sm font-bold rounded-lg bg-[#252525] border border-[#333333] hover:bg-[#333333] text-gray-400 hover:text-white transition-all">
                            Reset All
                        </button>
                    </section>

                    {/* Instructions Panel */}
                    <section className="relative z-10 bg-[#252525]/50 p-3 rounded-lg border border-[#333333]">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1 h-4 bg-cyan-400 rounded-full" />
                            <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Instructions</h4>
                        </div>
                        {activeInstruction ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                {activeInstruction.map((i, idx) => (<li key={idx}>{i}</li>))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500">Select a workflow step to begin</p>
                        )}
                    </section>

                    {/* Warning Banner */}
                    {(() => {
                        const { ldfa, mpta } = longLegResults;
                        const warnings: string[] = [];

                        // Check for out-of-boundary LDFA
                        if (ldfa !== null && ldfa <= 86) {
                            warnings.push('Native LDFA out of boundary – some release anticipated.');
                        }

                        // Check for out-of-boundary MPTA
                        if (mpta !== null && mpta <= 84) {
                            warnings.push('Native MPTA out of boundary – some release anticipated.');
                        }

                        // Check for high-risk anatomy
                        if (ldfa !== null && mpta !== null) {
                            const validation = validateMeasurements(ldfa, mpta);
                            if (validation.status === 'error') {
                                return (
                                    <div className="p-3 rounded border flex items-start gap-3 bg-red-900/40 border-red-500/50 text-red-100">
                                        <span className="text-xl">⛔</span>
                                        <div>
                                            <p className="font-bold uppercase text-sm tracking-wide">Critical Error</p>
                                            <p className="text-sm font-medium opacity-90">{validation.msg}</p>
                                        </div>
                                    </div>
                                );
                            }
                            if (validation.status === 'warning') {
                                warnings.push(validation.msg);
                            }
                        }

                        if (warnings.length > 0) {
                            return (
                                <div className="p-3 rounded border flex items-start gap-3 bg-amber-900/40 border-amber-500/50 text-amber-100">
                                    <span className="text-xl">⚠️</span>
                                    <div className="space-y-1">
                                        <p className="font-bold uppercase text-sm tracking-wide">Warning</p>
                                        {warnings.map((msg, idx) => (
                                            <p key={idx} className="text-sm font-medium opacity-90">{msg}</p>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-end px-4 pb-4 relative z-10">
                <button
                    onClick={() => setPage('results-analysis')}
                    disabled={!longLegResults.cpak || longLegResults.cpak === '--'}
                    className={`group relative py-3 px-8 rounded-sm transition-all duration-300 ease-out flex items-center gap-2
                        ${(!longLegResults.cpak || longLegResults.cpak === '--')
                            ? 'bg-[#252525] border border-[#333333] text-gray-500 cursor-not-allowed'
                            : 'bg-[#6D282C] border border-[#893338] shadow-[0_4px_20px_rgba(109,40,44,0.4)] hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] active:scale-[0.98]'}`}>
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className={`relative text-lg font-bold tracking-wider ${(!longLegResults.cpak || longLegResults.cpak === '--') ? 'text-gray-500' : 'text-white'}`}>
                        GO TO ANALYSIS & RESULTS
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="relative h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {(!longLegResults.cpak || longLegResults.cpak === '--') ? null : (
                        <>
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default LongLegPlannerPage;