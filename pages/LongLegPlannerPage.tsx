
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

const LANDMARK_COLORS = {
    hkaLine: '#89CFF0',
    femurAnatomicAxis: '#F08080',
    femoralJointLine: '#98FB98',
    tibialJointLine: '#FFD700',
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
    let ahkaClass: 'varus' | 'neutral' | 'valgus';
    if (ahka < -2) ahkaClass = 'varus';
    else if (ahka > 2) ahkaClass = 'valgus';
    else ahkaClass = 'neutral';

    let jloClass: 'distal' | 'neutral' | 'proximal';
    if (jlo > 3) jloClass = 'proximal';
    else if (jlo < 1) jloClass = 'distal';
    else jloClass = 'neutral';

    if (jloClass === 'distal') {
        if (ahkaClass === 'varus') return 'I';
        if (ahkaClass === 'neutral') return 'II';
        return 'III';
    }
    if (jloClass === 'neutral') {
        if (ahkaClass === 'varus') return 'IV';
        if (ahkaClass === 'neutral') return 'V';
        return 'VI';
    }
    if (ahkaClass === 'varus') return 'VII';
    if (ahkaClass === 'neutral') return 'VIII';
    return 'IX';
};


const getLongLegValgusCut = (ldfa: number | null): string => {
    if (ldfa === null) return '--';
    if (ldfa >= 92) return '2° valgus cut';
    if (ldfa >= 91) return '3° valgus cut';
    if (ldfa >= 88) return '4° valgus cut';
    if (ldfa >= 87) return '5° valgus cut';
    return '6° valgus cut';
};


const getRecommendedVarusCut = (mpta: number | null) => {
    if (mpta === null) return '--';
    if (mpta >= 89) return '0° (neutral cut)';
    if (mpta >= 88 && mpta < 89) return '1° varus cut';
    if (mpta >= 87 && mpta < 88) return '2° varus cut';
    if (mpta >= 85 && mpta < 87) return '3° varus cut';
    if (mpta < 85) return '4° varus cut';
    return '--';
};


const CameraModal: React.FC<{ isOpen: boolean; onClose: () => void; onCapture: (dataUrl: string) => void; }> = ({ isOpen, onClose, onCapture }) => {
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
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.load();
        }
    }, []);


    useEffect(() => {
        return () => {
            if (capturedImage && capturedImage.startsWith('blob:')) {
                URL.revokeObjectURL(capturedImage);
            }
            stopCamera(); // Defensive cleanup on unmount
        };
    }, [capturedImage, stopCamera]);

    const handleClose = useCallback(() => {

        if (capturedImage && capturedImage.startsWith('blob:')) {
            URL.revokeObjectURL(capturedImage);
        }
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
                                // Draw grid
                                const ctx = overlayRef.current.getContext('2d');
                                if (ctx) {
                                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                                    ctx.lineWidth = 1;
                                    ctx.beginPath();
                                    ctx.moveTo(ctx.canvas.width / 2, 0);
                                    ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
                                    ctx.moveTo(0, ctx.canvas.height / 2);
                                    ctx.lineTo(ctx.canvas.width, ctx.canvas.height / 2);
                                    ctx.stroke();
                                }
                            }
                        };
                    }
                })
                .catch(err => {
                    console.error("Error accessing camera: ", err);
                    onClose();
                });
        }
    }, [isOpen, capturedImage, onClose]);

    const handleCapture = async () => {
        const video = videoRef.current;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            try {
                // Ensure video is playing and has data
                if (video.paused) await video.play();

                // Wait until we have at least some progress in time or readyState is good
                let attempts = 0;
                while ((video.readyState < 2 || video.currentTime === 0) && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    attempts++;
                }

                // Final small buffer for hardware exposure adjustment
                await new Promise(resolve => setTimeout(resolve, 200));

                const canvas = document.createElement('canvas');
                // Cap resolution at 1024px for Capacitor stability
                const MAX_DIM = 1024;
                let w = video.videoWidth;
                let h = video.videoHeight;
                if (w > MAX_DIM || h > MAX_DIM) {
                    const scale = MAX_DIM / Math.max(w, h);
                    w *= scale;
                    h *= scale;
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, w, h);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            if (capturedImage && capturedImage.startsWith('blob:')) {
                                URL.revokeObjectURL(capturedImage);
                            }
                            const url = URL.createObjectURL(blob);
                            setCapturedImage(url);
                            stopCamera();
                        }
                    }, 'image/jpeg', 0.85);
                }
            } catch (err) {
                console.error("Capture failed:", err);
            }
        } else {
            console.error("Video dimensions are not valid yet.");
        }
    };

    const handleCropSave = () => {
        if (capturedImage) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Use natural dimensions for accurate scaling
                const fullW = img.naturalWidth;
                const fullH = img.naturalHeight;
                const scaleX = fullW / 100;
                const scaleY = fullH / 100;

                const cropW = cropRect.width * scaleX;
                const cropH = cropRect.height * scaleY;

                canvas.width = cropW;
                canvas.height = cropH;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(
                        img,
                        cropRect.x * scaleX, cropRect.y * scaleY,
                        cropW, cropH,
                        0, 0, cropW, cropH
                    );

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                onCapture(reader.result as string);
                                handleClose();
                            };
                            reader.readAsDataURL(blob);
                        }
                    }, 'image/jpeg', 0.9);
                }
            };
            img.src = capturedImage;
        }
    };

    const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent, interaction: string) => {
        e.stopPropagation();
        setActiveInteraction(interaction);
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
                if (activeInteraction.includes('l')) { // Left
                    next.x = Math.min(prev.x + prev.width - 10, Math.max(0, prev.x + dx));
                    next.width = prev.width + (prev.x - next.x);
                }
                if (activeInteraction.includes('r')) { // Right
                    next.width = Math.max(10, Math.min(100 - prev.x, prev.width + dx));
                }
                if (activeInteraction.includes('t')) { // Top
                    next.y = Math.min(prev.y + prev.height - 10, Math.max(0, prev.y + dy));
                    next.height = prev.height + (prev.y - next.y);
                }
                if (activeInteraction.includes('b')) { // Bottom
                    next.height = Math.max(10, Math.min(100 - prev.y, prev.height + dy));
                }
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
                        <div
                            className="relative inline-block border-2 border-yellow-500 overflow-hidden select-none touch-none"
                            onMouseMove={handleCropMouseMove}
                            onTouchMove={handleCropMouseMove}
                            onMouseUp={() => setActiveInteraction(null)}
                            onTouchEnd={() => setActiveInteraction(null)}
                        >
                            <img src={capturedImage} alt="Captured" className="w-full h-auto pointer-events-none" />
                            <div
                                ref={cropBoxRef}
                                onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                                onTouchStart={(e) => handleCropMouseDown(e, 'move')}
                                className="absolute border-2 border-dashed border-white bg-white/20 cursor-move"
                                style={{
                                    left: `${cropRect.x}%`,
                                    top: `${cropRect.y}%`,
                                    width: `${cropRect.width}%`,
                                    height: `${cropRect.height}%`
                                }}
                            >
                                {/* Corner Handles */}
                                <div
                                    className="absolute -top-3 -left-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-nw-resize z-50 shadow-md"
                                    onMouseDown={(e) => handleCropMouseDown(e, 'tl')}
                                    onTouchStart={(e) => handleCropMouseDown(e, 'tl')}
                                />
                                <div
                                    className="absolute -top-3 -right-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-ne-resize z-50 shadow-md"
                                    onMouseDown={(e) => handleCropMouseDown(e, 'tr')}
                                    onTouchStart={(e) => handleCropMouseDown(e, 'tr')}
                                />
                                <div
                                    className="absolute -bottom-3 -left-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-sw-resize z-50 shadow-md"
                                    onMouseDown={(e) => handleCropMouseDown(e, 'bl')}
                                    onTouchStart={(e) => handleCropMouseDown(e, 'bl')}
                                />
                                <div
                                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md"
                                    onMouseDown={(e) => handleCropMouseDown(e, 'br')}
                                    onTouchStart={(e) => handleCropMouseDown(e, 'br')}
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button onClick={handleCropSave} className="gemini-dark-button font-bold py-3 px-8 rounded-lg">Finalize Crop</button>
                            <button onClick={() => { if (capturedImage?.startsWith('blob:')) URL.revokeObjectURL(capturedImage); setCapturedImage(null); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg">Retake</button>
                            <button onClick={handleClose} className="bg-red-900 hover:bg-red-800 text-white font-bold py-3 px-8 rounded-lg">Cancel</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const MetricItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex flex-col justify-center items-center bg-gray-800/80 p-3 rounded-lg text-center h-full">
        <p className="text-lg text-gray-400">{label}</p>
        <p className="font-extrabold text-3xl text-gray-100 mt-1">{value}</p>
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
        // When returning to the page, restore the state of visible landmark sets
        if (longLegResults && Object.values(longLegResults).some(v => v !== null && v !== '--')) {
            const newSets = new Set<string>();
            if (longLegResults.mhka !== null) newSets.add('hkaLine');
            if (longLegResults.ldfa !== null) newSets.add('femoralJointLine');
            if (longLegResults.mpta !== null) newSets.add('tibialJointLine');
            if (longLegResults.vca !== null) newSets.add('femurAnatomicAxis');
            setVisibleLandmarkSets(newSets);
        }
    }, []);



    useEffect(() => {
        if (ldfaMode !== 'corrected') return;

        if (justAdjustedHipRef.current) {
            justAdjustedHipRef.current = false;
            return;
        }

        const femurAnatomicPoint = longLegLandmarks.femurAnatomicAxisPoint;
        if (femurAnatomicPoint && visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femurAnatomicAxis')) {
            const { kneeCenter, hipCenter } = longLegLandmarks;
            if (!kneeCenter || !hipCenter) return;

            const TARGET_VCA_DEG = 4;
            const TARGET_VCA_RAD = TARGET_VCA_DEG * (Math.PI / 180);

            // Vector from knee to anatomic point (pointing up)
            const V_anatomic = { x: femurAnatomicPoint.x - kneeCenter.x, y: femurAnatomicPoint.y - kneeCenter.y };

            // Angle of anatomic axis relative to the upward vertical axis (negative Y)
            const angle_anatomic = Math.atan2(V_anatomic.x, -V_anatomic.y);

            // To create valgus, the hip must move medially relative to the anatomic axis.
            const rotationDirection = legSide === 'left' ? -1 : 1;

            const angle_mech = angle_anatomic + (rotationDirection * TARGET_VCA_RAD);

            const kneeToHipY = hipCenter.y - kneeCenter.y;

            const newKneeToHipX = -kneeToHipY * Math.tan(angle_mech);
            const newHipX = kneeCenter.x + newKneeToHipX;

            if (Math.abs(newHipX - hipCenter.x) > 0.5) {
                justAdjustedHipRef.current = true;
                setLongLegLandmarks({
                    ...longLegLandmarks,
                    hipCenter: { x: newHipX, y: hipCenter.y }
                });
            }
        }
    }, [longLegLandmarks, visibleLandmarkSets, legSide, setLongLegLandmarks, ldfaMode]);


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
        setLongLegLandmarks(initialLandmarks);
    }, [setLongLegLandmarks, legSide]);

    const handleImageLoad = (src: string, name: string, method: 'file' | 'camera') => {
        setLongLegImageSrc(src);
        setFileName(name);
        setUploadMethod(method);
    };

    const updateCalculations = useCallback(() => {
        const { hipCenter, kneeCenter, ankleCenter, femurAnatomicAxisPoint, femoralMedial, femoralLateral, tibialMedial, tibialLateral } = longLegLandmarks;
        if (!hipCenter || !kneeCenter || !ankleCenter) return;

        let newResults = { ...localResultsRef.current };

        if (visibleLandmarkSets.has('hkaLine')) {
            const femurVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const tibiaVec = { x: ankleCenter.x - kneeCenter.x, y: ankleCenter.y - kneeCenter.y };
            const mhka = 180 - angleBetweenVectors(femurVec, tibiaVec);
            newResults.mhka = mhka;
        }

        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('femurAnatomicAxis') && femurAnatomicAxisPoint) {
            const mechAxisVec = { x: hipCenter.x - kneeCenter.x, y: hipCenter.y - kneeCenter.y };
            const anatomicAxisVec = { x: femurAnatomicAxisPoint.x - kneeCenter.x, y: femurAnatomicAxisPoint.y - kneeCenter.y };
            const vca = angleBetweenVectors(mechAxisVec, anatomicAxisVec);
            newResults.vca = vca;
        }

        if (
            visibleLandmarkSets.has('hkaLine') &&
            visibleLandmarkSets.has('femoralJointLine') &&
            femoralMedial &&
            femoralLateral
        ) {
            const femurMechAxis = {
                x: hipCenter.x - kneeCenter.x,
                y: hipCenter.y - kneeCenter.y
            };

            const femurJointLine =
                legSide === 'left'
                    ? {
                        x: femoralLateral.x - femoralMedial.x,
                        y: femoralLateral.y - femoralMedial.y
                    }
                    : {
                        x: femoralMedial.x - femoralLateral.x,
                        y: femoralMedial.y - femoralLateral.y
                    };

            const rawAngle = angleBetweenVectors(femurMechAxis, femurJointLine);
            const ldfa = Math.min(rawAngle, 180 - rawAngle);


            newResults.ldfa = ldfa;
        }

        if (
            visibleLandmarkSets.has('hkaLine') &&
            visibleLandmarkSets.has('tibialJointLine') &&
            tibialMedial &&
            tibialLateral
        ) {
            const tibiaMechAxis = {
                x: ankleCenter.x - kneeCenter.x,
                y: ankleCenter.y - kneeCenter.y
            };

            const tibiaJointLine = {
                x: tibialMedial.x - tibialLateral.x,
                y: tibialMedial.y - tibialLateral.y
            };

            const rawAngle = angleBetweenVectors(tibiaMechAxis, tibiaJointLine);
            const mpta = Math.min(rawAngle, 180 - rawAngle);

            newResults.mpta = mpta;

        }


        if (newResults.ldfa !== null && newResults.mpta !== null) {
            const ahka = newResults.mpta + newResults.ldfa - 180;
            const jlo = newResults.mpta - newResults.ldfa;

            let jloType: 'APEX DISTAL' | 'APEX PROXIMAL' | 'APEX NEUTRAL';
            if (jlo > 3) jloType = 'APEX PROXIMAL';
            else if (jlo < -3) jloType = 'APEX DISTAL';
            else jloType = 'APEX NEUTRAL';

            newResults = {
                ...newResults,
                ahka,
                jlo: Math.abs(jlo),
                jloType,
                cpak: getLongLegCpakType(ahka, Math.abs(jlo)),
                cut: getLongLegValgusCut(newResults.ldfa),
                recommendedVarusCut: getRecommendedVarusCut(newResults.mpta),
            };
        }

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

            // Draw points individually
            ctx.fillStyle = LANDMARK_COLORS.hkaLine;
            [hipCenter, kneeCenter, ankleCenter].forEach(p => {
                if (p) {
                    ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
                }
            });

            if (kneeCenter && localResultsRef.current.mhka !== null) {
                drawTextWithBackground(`mHKA: ${localResultsRef.current.mhka.toFixed(1)}°`, kneeCenter.x, kneeCenter.y - 50);
            }
        }
        // Femur Anatomic Axis
        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('femurAnatomicAxis')) {
            if (femurAnatomicAxisPoint && kneeCenter) {
                ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y);
                ctx.lineTo(kneeCenter.x, kneeCenter.y);
                ctx.stroke();
            }

            if (femurAnatomicAxisPoint) {
                ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis;
                ctx.beginPath();
                ctx.arc(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Femoral Joint Line
        if (visibleLandmarkSets.has('femoralJointLine')) {
            if (femoralMedial && femoralLateral) {
                ctx.strokeStyle = LANDMARK_COLORS.femoralJointLine;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(femoralMedial.x, femoralMedial.y); ctx.lineTo(femoralLateral.x, femoralLateral.y); ctx.stroke();
            }

            ctx.fillStyle = LANDMARK_COLORS.femoralJointLine;
            [femoralMedial, femoralLateral].forEach(p => {
                if (p) {
                    ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
                }
            });

            if (femoralMedial && femoralLateral) {
                const isLeftKnee = legSide === 'left';
                const mLabel = (isLeftKnee ? femoralMedial.x < femoralLateral.x : femoralMedial.x > femoralLateral.x) ? femoralMedial : femoralLateral;
                const lLabel = (isLeftKnee ? femoralMedial.x > femoralLateral.x : femoralMedial.x < femoralLateral.x) ? femoralMedial : femoralLateral;

                const m_x_offset = mLabel.x > lLabel.x ? 20 : -30;
                const l_x_offset = lLabel.x > mLabel.x ? 20 : -30;
                ctx.fillStyle = "#e3e3e3";
                ctx.fillText('M', mLabel.x + m_x_offset, mLabel.y + 5);
                ctx.fillText('L', lLabel.x + l_x_offset, lLabel.y + 5);
            }

            if (kneeCenter && visibleLandmarkSets.has('hkaLine') && localResultsRef.current.ldfa !== null) {
                drawTextWithBackground(`LDFA: ${localResultsRef.current.ldfa.toFixed(1)}°`, kneeCenter.x, kneeCenter.y - 85);
            }
        }
        // Tibial Joint Line
        if (visibleLandmarkSets.has('tibialJointLine')) {
            if (tibialMedial && tibialLateral) {
                ctx.strokeStyle = LANDMARK_COLORS.tibialJointLine;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(tibialMedial.x, tibialMedial.y); ctx.lineTo(tibialLateral.x, tibialLateral.y); ctx.stroke();
            }

            ctx.fillStyle = LANDMARK_COLORS.tibialJointLine;
            [tibialMedial, tibialLateral].forEach(p => {
                if (p) {
                    ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
                }
            });

            if (tibialMedial && tibialLateral) {
                const isLeftKnee = legSide === 'left';
                const mLabel = (isLeftKnee ? tibialMedial.x < tibialLateral.x : tibialMedial.x > tibialLateral.x) ? tibialMedial : tibialLateral;
                const lLabel = (isLeftKnee ? tibialMedial.x > tibialLateral.x : tibialMedial.x < tibialLateral.x) ? tibialMedial : tibialLateral;

                const m_x_offset = mLabel.x > lLabel.x ? 20 : -30;
                const l_x_offset = lLabel.x > mLabel.x ? 20 : -30;
                ctx.fillStyle = "#e3e3e3";
                ctx.fillText('M', mLabel.x + m_x_offset, mLabel.y + 5);
                ctx.fillText('L', lLabel.x + l_x_offset, lLabel.y + 5);
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
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            setLongLegCanvasDataUrl(tempCanvas.toDataURL('image/png'));
        }
    }, [setLongLegCanvasDataUrl]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Handle Resize - Placed after draw
    useEffect(() => {
        const handleResize = () => {
            const now = Date.now();
            if (now - lastResizeTimeRef.current < 100) return;
            lastResizeTimeRef.current = now;

            const img = imageRef.current;
            const canvas = canvasRef.current;
            if (!img || !canvas || img.naturalWidth === 0) return;

            const viewer = canvas.parentElement?.parentElement;
            if (!viewer) return;

            const availWidth = viewer.clientWidth - 16;
            const availHeight = viewer.clientHeight - 16;

            // Current displayed dimensions (from style or attribute)
            const oldW = parseFloat(img.style.width) || img.width;

            // Calculate new fit dimensions based on new container size
            const aspect = img.naturalWidth / img.naturalHeight;
            let newW = availHeight * aspect;
            let newH = availHeight;

            if (newW > availWidth) {
                newW = availWidth;
                newH = newW / aspect;
            }

            // If dimensions changed significantly, re-scale everything
            if (Math.abs(newW - oldW) > 1) {
                const scale = newW / oldW;

                img.style.width = `${newW}px`;
                img.style.height = `${newH}px`;
                canvas.width = newW;
                canvas.height = newH;

                setLongLegLandmarks(prev => {
                    const next: any = {};
                    for (const key in prev) {
                        if (prev[key]) {
                            next[key] = {
                                x: prev[key].x * scale,
                                y: prev[key].y * scale
                            };
                        }
                    }
                    return next as Landmarks;
                });

                requestAnimationFrame(draw);
            }
        };

        window.addEventListener('resize', handleResize);
        const interval = setInterval(handleResize, 1000);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, [draw, setLongLegLandmarks]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleImageLoad(event.target.result as string, file.name, 'file');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleLandmarkSet = (setName: keyof typeof landmarkInstructions) => {
        const newSets = new Set(visibleLandmarkSets);

        if (newSets.has(setName)) {
            newSets.delete(setName);
            activeLandmarkRef.current = null;
            setActiveInstruction(null);
        } else {
            newSets.add(setName);
            activeLandmarkRef.current =
                setName === 'hkaLine'
                    ? 'hipCenter'
                    : setName === 'femurAnatomicAxis'
                        ? 'femurAnatomicAxisPoint'
                        : null;

            setActiveInstruction(landmarkInstructions[setName]);
        }

        setVisibleLandmarkSets(newSets);
    };


    const handleResetAll = () => {
        if (canvasRef.current) {
            resetLandmarks(canvasRef.current);
        }
        setVisibleLandmarkSets(new Set());
        setActiveInstruction(null);
        setLongLegResults({ ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', vca: null });
        setFemurBoundary(null);
        setTibiaBoundary(null);
        setLongLegCanvasDataUrl(null);
    };

    // --- Drag and Drop Logic ---
    const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        // Since canvas is scaled via CSS transform (zoom), rect is scaled. 
        // We need coordinates relative to the internal canvas resolution.
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const getImageCoordinates = (
        e: React.MouseEvent | React.TouchEvent,
        container: HTMLDivElement
    ) => {
        const rect = container.getBoundingClientRect();

        const clientX =
            'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY =
            'touches' in e ? e.touches[0].clientY : e.clientY;

        const x = (clientX - rect.left) / zoom;
        const y = (clientY - rect.top) / zoom;

        return { x, y };
    };

    const handleViewerTap = (
        e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
    ) => {
        if (!viewerRef.current || !activeLandmarkRef.current) return;

        e.preventDefault();

        const { x, y } = getImageCoordinates(e, viewerRef.current);

        setLongLegLandmarks(prev => ({
            ...prev,
            [activeLandmarkRef.current!]: { x, y }
        }));
    };



    const updatePip = useCallback((overridePos?: Point) => {
        const key = draggingPointRef.current;
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const pipCanvas = pipCanvasRef.current;

        // Use overridePos if provided, otherwise fall back to state
        const pos = overridePos || (key ? longLegLandmarks[key] : null);

        if (!pos || !image || !canvas || !pipCanvas) return;

        const pipCtx = pipCanvas.getContext('2d');
        if (!pipCtx) return;

        const zoomLevel = 4;
        const sourceSize = pipCanvas.width / zoomLevel;

        pipCtx.fillStyle = 'black';
        pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);

        const imgScaleX = image.naturalWidth / canvas.width;
        const imgScaleY = image.naturalHeight / canvas.height;

        pipCtx.drawImage(
            image,
            (pos.x * imgScaleX) - (sourceSize / 2), (pos.y * imgScaleY) - (sourceSize / 2),
            sourceSize, sourceSize,
            0, 0, pipCanvas.width, pipCanvas.height
        );
        pipCtx.strokeStyle = '#fdd835'; pipCtx.lineWidth = 1; pipCtx.beginPath();
        pipCtx.moveTo(pipCanvas.width / 2, 0); pipCtx.lineTo(pipCanvas.width / 2, pipCanvas.height);
        pipCtx.moveTo(0, pipCanvas.height / 2); pipCtx.lineTo(pipCanvas.width, pipCanvas.height / 2);
        pipCtx.stroke();
    }, [longLegLandmarks]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
        // Generous hit radius for easier grabbing (~50px)
        // Note: 50 ** 2 = 2500. canvas coords are unzoomed (usually larger).
        const hitRadiusSq = (HANDLE_RADIUS + 50) ** 2;
        let minDistSq = hitRadiusSq;
        let closestKey: string | null = null;

        for (const key in longLegLandmarks) {
            if (!longLegLandmarks[key]) continue;
            const distSq = (longLegLandmarks[key].x - pos.x) ** 2 + (longLegLandmarks[key].y - pos.y) ** 2;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestKey = key;
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

        setLongLegLandmarks(prev => ({
            ...prev,
            [draggingPointRef.current!]: pos
        }));

        updatePip(pos);
    }, [setLongLegLandmarks, updatePip]);

    const handleMouseUp = useCallback(() => {
        draggingPointRef.current = null;
        captureCanvasState();
    }, [captureCanvasState]);

    // Unified handler for both mouse and touch
    const handlePipStart = (e: React.MouseEvent | React.TouchEvent) => {
        isDraggingPipRef.current = true;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        pipDragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    // Unified move handler (mouse OR touch)
    const handlePipMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDraggingPipRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const viewer = pipViewerRef.current?.parentElement;
        if (!viewer) return;

        const viewerRect = viewer.getBoundingClientRect();
        const pipSize = 160; // w-40 = 160px

        let newX = clientX - viewerRect.left - pipDragOffset.current.x;
        let newY = clientY - viewerRect.top - pipDragOffset.current.y;

        // Keep within bounds
        newX = Math.max(20, Math.min(newX, viewerRect.width - pipSize - 20));
        newY = Math.max(20, Math.min(newY, viewerRect.height - pipSize - 20));
        setPipPosition({ x: newX, y: newY });
    }, []);

    // Unified end handler
    const handlePipEnd = useCallback(() => {
        isDraggingPipRef.current = false;
    }, []);

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);

        // Generous hit radius for touch
        const hitRadiusSq = (HANDLE_RADIUS + 60) ** 2;
        let minDistSq = hitRadiusSq;
        let closestKey: string | null = null;

        for (const key in longLegLandmarks) {
            if (!longLegLandmarks[key]) continue;
            const distSq = (longLegLandmarks[key].x - pos.x) ** 2 + (longLegLandmarks[key].y - pos.y) ** 2;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestKey = key;
            }
        }
        if (closestKey) {
            draggingPointRef.current = closestKey;
        }
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!draggingPointRef.current) return;
        e.preventDefault(); // Critical: prevents scrolling!

        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);

        setLongLegLandmarks(prev => ({
            ...prev,
            [draggingPointRef.current!]: pos
        }));

        updatePip(pos);
    }, [setLongLegLandmarks, updatePip]);

    const handleTouchEnd = useCallback(() => {
        draggingPointRef.current = null;
        captureCanvasState();
    }, [captureCanvasState]);

    useEffect(() => {
        // Landmark dragging (canvas points)
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // PIP dragging - MOUSE
        window.addEventListener('mousemove', handlePipMove);
        window.addEventListener('mouseup', handlePipEnd);

        // PIP dragging - TOUCH
        window.addEventListener('touchmove', handlePipMove, { passive: false });
        window.addEventListener('touchend', handlePipEnd);
        window.addEventListener('touchcancel', handlePipEnd);

        // Landmark dragging - TOUCH
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            window.removeEventListener('mousemove', handlePipMove);
            window.removeEventListener('mouseup', handlePipEnd);

            window.removeEventListener('touchmove', handlePipMove);
            window.removeEventListener('touchend', handlePipEnd);
            window.removeEventListener('touchcancel', handlePipEnd);

            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [
        handleMouseMove, handleMouseUp,
        handlePipMove, handlePipEnd,
        handleTouchMove, handleTouchEnd
    ]);

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
        <div className="flex flex-col h-full gap-4">

            {isCameraOpen && (
                <CameraModal
                    isOpen={isCameraOpen}
                    onClose={() => setIsCameraOpen(false)}
                    onCapture={(dataUrl) => handleImageLoad(dataUrl, 'Live Photo.png', 'camera')}
                />
            )}

            {/* Header */}
            <h2 className="text-4xl font-bold text-start">
                Robotrix+ Long Leg Functional Alignment Planner
            </h2>

            {/* MAIN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4 flex-grow min-h-0">

                {/* ================= LEFT : XRAY VIEWER (70%) ================= */}
                <div className="gemini-dark-card rounded-lg relative overflow-hidden h-[calc(100vh-180px)] flex items-center justify-center">
                    {zoom > 1 && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-yellow-500/90 text-black px-4 py-1 rounded-full font-bold shadow-lg animate-pulse">
                            Reset zoom to mark the markings
                        </div>
                    )}

                    <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                        <button onClick={zoomIn} className="bg-black/70 px-3 py-1 rounded">＋</button>
                        <button onClick={zoomOut} className="bg-black/70 px-3 py-1 rounded">－</button>
                        <button onClick={resetZoom} className="bg-black/70 px-2 py-1 rounded text-xs">
                            Reset
                        </button>
                    </div>

                    {!longLegImageSrc ? (
                        <div
                            className="text-center text-gray-400 cursor-pointer p-10 border-2 border-dashed border-gray-600 rounded-lg hover:bg-white/5 transition"
                            onClick={() => document.getElementById('xray-upload')?.click()}
                        >
                            <p className="text-xl font-bold">Upload an X-ray to begin</p>
                            <p className="text-sm mt-2 opacity-70">Tap here or use the controls on the right</p>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <div
                                ref={viewerRef}
                                onClick={handleViewerTap}
                                onTouchEnd={handleViewerTap}
                                onMouseDown={(e) => e.preventDefault()}
                                onTouchStart={(e) => { }}
                                className="relative w-full h-full overflow-hidden touch-none flex items-center justify-center"
                            >
                                <div
                                    className="relative"
                                    style={{
                                        transform: `scale(${zoom})`,
                                        transformOrigin: 'center center'
                                    }}
                                >
                                    <img
                                        ref={imageRef}
                                        src={longLegImageSrc}
                                        alt="X-ray"
                                        className="block"
                                        onLoad={() => {
                                            const image = imageRef.current;
                                            const canvas = canvasRef.current;
                                            if (!image || !canvas) return;

                                            const viewer = canvas.parentElement?.parentElement;
                                            if (!viewer) return;

                                            const availableHeight = viewer.clientHeight - 16;
                                            const availableWidth = viewer.clientWidth - 16;
                                            const aspect = image.naturalWidth / image.naturalHeight;

                                            let h = availableHeight;
                                            let w = h * aspect;

                                            if (w > availableWidth) {
                                                w = availableWidth;
                                                h = w / aspect;
                                            }

                                            canvas.width = w;
                                            canvas.height = h;
                                            image.style.width = `${w}px`;
                                            image.style.height = `${h}px`;

                                            if (Object.keys(longLegLandmarks).length === 0) {
                                                resetLandmarks(canvas);
                                            }

                                            requestAnimationFrame(draw);
                                        }}
                                    />

                                    <canvas
                                        ref={canvasRef}
                                        onMouseDown={handleMouseDown}
                                        onTouchStart={handleTouchStart}
                                        className="absolute top-0 left-0 cursor-crosshair touch-none"
                                    />
                                </div>

                                {/* PIP */}
                                <div
                                    ref={pipViewerRef}
                                    onMouseDown={handlePipStart}
                                    onTouchStart={handlePipStart}
                                    className="absolute w-40 h-40 rounded-full border-2 border-dark-maroon bg-black shadow-lg cursor-grab touch-none"
                                    style={{ top: pipPosition.y, left: pipPosition.x }}
                                >
                                    <canvas
                                        ref={pipCanvasRef}
                                        width={160}
                                        height={160}
                                        className="rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ================= RIGHT : CONTROLS + INSTRUCTIONS + METRICS (30%) ================= */}
                <div className="gemini-dark-card rounded-lg p-4 flex flex-col gap-4 overflow-y-auto h-[calc(100vh-180px)]">

                    {/* STEP 1 */}
                    <section>
                        <h3 className="text-lg font-semibold mb-2">Upload X-ray</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <label
                                htmlFor="xray-upload"
                                className="cursor-pointer text-center py-2 rounded bg-gray-700 hover:bg-[#6D282C]"
                            >
                                File
                            </label>
                            <input
                                id="xray-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => setIsCameraOpen(true)}
                                className="py-2 rounded bg-gray-700 hover:bg-[#6D282C]"
                            >
                                Camera
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate">{fileName}</p>
                    </section>

                    {/* STEP 2 */}
                    <section>
                        <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between mb-4">
                            <span className="text-gray-400 font-medium">Leg Side</span>
                            <div className="flex bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => setLegSide('left')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${legSide === 'left' ? 'bg-[#6D282C] text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    LEFT
                                </button>
                                <button
                                    onClick={() => setLegSide('right')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${legSide === 'right' ? 'bg-[#6D282C] text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    RIGHT
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* STEP 3 */}
                    <section>
                        <h3 className="text-lg font-semibold mb-2">Landmarks</h3>
                        <div className="space-y-2">
                            {landmarkButtons.map(btn => {
                                if (btn.mode && btn.mode !== ldfaMode) return null;
                                const active = visibleLandmarkSets.has(btn.key);
                                return (
                                    <button
                                        key={btn.key}
                                        onClick={() => toggleLandmarkSet(btn.key as any)}
                                        className={`w-full py-2 rounded border ${active
                                            ? 'bg-[#6D282C]'
                                            : 'border-gray-600 hover:bg-gray-700'
                                            }`}
                                    >
                                        {btn.text}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleResetAll}
                            className="mt-3 w-full py-2 rounded bg-gray-600 hover:bg-gray-700"
                        >
                            Reset All
                        </button>
                    </section>

                    {/* INSTRUCTIONS */}
                    <section className="bg-gray-900/50 p-3 rounded border border-gray-700">
                        <h4 className="text-md font-semibold text-yellow-300 mb-1">
                            Instructions
                        </h4>
                        {activeInstruction ? (
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {activeInstruction.map((i, idx) => (
                                    <li key={idx}>{i}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400">
                                Select a landmark to begin
                            </p>
                        )}
                    </section>

                    {/* METRICS */}
                    <section>
                        <h4 className="text-md font-semibold mb-2">Metrics</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <MetricItem label="LDFA" value={`${longLegResults.ldfa?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="MPTA" value={`${longLegResults.mpta?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="aHKA" value={`${longLegResults.ahka?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="mHKA" value={`${longLegResults.mhka?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="JLO" value={`${longLegResults.jlo?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="CPAK" value={longLegResults.cpak} />
                        </div>
                    </section>
                </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="flex justify-end">
                <button
                    onClick={() => setPage('results-analysis')}
                    disabled={!longLegResults.cpak || longLegResults.cpak === '--'}
                    className="gemini-dark-button px-8 py-3 text-lg"
                >
                    Go to Analysis & Results
                </button>
            </div>
        </div>
    );

};

export default LongLegPlannerPage;