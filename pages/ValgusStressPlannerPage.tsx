
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, Point } from '../types';

// --- Helper Functions ---
const landmarkInstructions = {
    jointLine: ["Mark the center of the medial M joint space.", "Mark the center of the lateral L joint space."],
    femurAnatomicAxis: ["Mark mid femur axis."],
    tibiaAnatomicAxis: ["Mark mid tibia axis."],
};


const LANDMARK_COLORS = {
    jointLine: '#800000',       // Maroon
    femurAnatomicAxis: '#9400D3', // Dark Violet
    tibiaAnatomicAxis: '#008080', // Teal Green
};

const HANDLE_RADIUS = 6;

const angleBetweenVectors = (v1: Point, v2: Point) => {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    if (mag1 === 0 || mag2 === 0) return 0;
    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosTheta) * (180 / Math.PI);
};

const getObliquityDescription = (obliquity: number | null): string => {
    if (obliquity === null) return '--';
    if (obliquity >= 3) return 'Significant obliquity';
    if (obliquity >= 1) return 'Mild obliquity';
    return 'Neutral obliquity';
};

const getLongLegCpakType = (ahka: number, jlo: number): string => {
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

const getValgusStressFemurCut = (obliquity: number): string => {
    if (obliquity >= 3) return '5° valgus cut';
    if (obliquity >= 1) return '4° valgus cut';
    return '3° valgus cut';
};

const getValgusStressCPAK = (
    obliquity: number,
    ldfa: number,
    mpta: number
): string => {
    if (obliquity >= 3) return 'CPAK 2';
    if (obliquity >= 1) return 'CPAK 1';

    // Neutral obliquity
    if (Math.abs(ldfa - 90) < 1 && Math.abs(mpta - 90) < 1) {
        return 'CPAK 5';
    }
    return 'CPAK 4';
};


// --- Camera Modal Component ---
const CameraModal: React.FC<{ isOpen: boolean; onClose: () => void; onCapture: (dataUrl: string) => void; }> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    // Crop state
    const [cropRect, setCropRect] = useState({ x: 10, y: 10, width: 80, height: 80 }); // Percentages
    const cropBoxRef = useRef<HTMLDivElement>(null);
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isOpen && !capturedImage) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
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
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, onClose, stopCamera, capturedImage]);

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            setCapturedImage(canvas.toDataURL('image/png'));
            stopCamera();
        }
    };

    const handleCropSave = () => {
        if (capturedImage) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scaleX = img.width / 100;
                const scaleY = img.height / 100;

                canvas.width = (cropRect.width * scaleX);
                canvas.height = (cropRect.height * scaleY);

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(
                        img,
                        cropRect.x * scaleX, cropRect.y * scaleY,
                        cropRect.width * scaleX, cropRect.height * scaleY,
                        0, 0, canvas.width, canvas.height
                    );
                    onCapture(canvas.toDataURL('image/png'));
                    onClose();
                }
            };
            img.src = capturedImage;
        }
    };

    const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDraggingCrop(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX, y: clientY });
    };

    const handleCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingCrop) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const dx = ((clientX - dragStart.x) / (cropBoxRef.current?.parentElement?.clientWidth || 1)) * 100;
        const dy = ((clientY - dragStart.y) / (cropBoxRef.current?.parentElement?.clientHeight || 1)) * 100;

        setCropRect(prev => ({
            ...prev,
            x: Math.max(0, Math.min(100 - prev.width, prev.x + dx)),
            y: Math.max(0, Math.min(100 - prev.height, prev.y + dy))
        }));
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
                            <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded"></video>
                            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full"></canvas>
                        </div>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button onClick={handleCapture} className="gemini-dark-button font-bold py-3 px-8 rounded-lg">Capture</button>
                            <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg">Cancel</button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-semibold mb-4">Crop Captured Image</h3>
                        <div
                            className="relative inline-block border-2 border-yellow-500 overflow-hidden select-none touch-none"
                            onMouseMove={handleCropMouseMove}
                            onTouchMove={handleCropMouseMove}
                            onMouseUp={() => setIsDraggingCrop(false)}
                            onTouchEnd={() => setIsDraggingCrop(false)}
                        >
                            <img src={capturedImage} alt="Captured" className="w-full h-auto pointer-events-none" />
                            <div
                                ref={cropBoxRef}
                                onMouseDown={handleCropMouseDown}
                                onTouchStart={handleCropMouseDown}
                                className="absolute border-2 border-dashed border-white bg-white/20 cursor-move"
                                style={{
                                    left: `${cropRect.x}%`,
                                    top: `${cropRect.y}%`,
                                    width: `${cropRect.width}%`,
                                    height: `${cropRect.height}%`
                                }}
                            >
                                <div className="absolute top-0 left-0 bg-white p-1 text-[10px] text-black font-bold">Crop Area (Drag to move)</div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-center space-x-4">
                            <button onClick={handleCropSave} className="gemini-dark-button font-bold py-3 px-8 rounded-lg">Finalize Crop</button>
                            <button onClick={() => setCapturedImage(null)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg">Retake</button>
                            <button onClick={onClose} className="bg-red-900 hover:bg-red-800 text-white font-bold py-3 px-8 rounded-lg">Cancel</button>
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


// --- Main Page Component ---
const ValgusStressPlannerPage: React.FC = () => {
    const {
        legSide, setLegSide,
        valgusImageSrc, setValgusImageSrc,
        valgusResults, setValgusResults,
        setValgusCanvasDataUrl, setPage,
        valgusLandmarks, setValgusLandmarks
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
    const localResultsRef = useRef(valgusResults);
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
        localResultsRef.current = valgusResults;
    }, [valgusResults]);

    // Initialize visible sets if results exist
    useEffect(() => {
        if (valgusResults.obliquity !== null) {
            setVisibleLandmarkSets(new Set(['jointLine', 'femurAnatomicAxis', 'tibiaAnatomicAxis']));
        }
    }, []);


    const resetLandmarks = useCallback((canvas: HTMLCanvasElement) => {
        const w = canvas.width; const h = canvas.height;
        setValgusLandmarks({
            medialJointSpace: { x: w * 0.45, y: h * 0.5 },
            lateralJointSpace: { x: w * 0.55, y: h * 0.5 },
            femurAxisPoint: { x: w * 0.5, y: h * 0.2 },
            tibiaAxisPoint: { x: w * 0.5, y: h * 0.8 },
        });
    }, [setValgusLandmarks]);

    const handleImageLoad = (src: string, name: string, method: 'file' | 'camera') => {
        setValgusImageSrc(src);
        setFileName(name);
        setUploadMethod(method);
    };

    const updateCalculations = useCallback(() => {
        const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = valgusLandmarks;
        let newResults = {
            obliquity: null as number | null,
            ldfa: null as number | null,
            mpta: null as number | null,
            femurType: '--',
            cpak: '--',
            ahka: null,
            jlo: null,
            cut: '--',
        };

        // Common calculation base: Joint Center
        let jointCenter: Point | null = null;
        if (medialJointSpace && lateralJointSpace) {
            jointCenter = {
                x: (medialJointSpace.x + lateralJointSpace.x) / 2,
                y: (medialJointSpace.y + lateralJointSpace.y) / 2
            };
        }

        // 1. Obliquity Calculation
        if (visibleLandmarkSets.has('jointLine') && medialJointSpace && lateralJointSpace) {
            const dy = medialJointSpace.y - lateralJointSpace.y;
            const dx = medialJointSpace.x - lateralJointSpace.x;
            let angleRad = Math.atan2(dy, dx);
            let angleDeg = Math.abs(angleRad * (180 / Math.PI));
            if (angleDeg > 90) angleDeg = 180 - angleDeg;
            newResults.obliquity = angleDeg;
        }

        // Common points for angles
        const onScreenLeftPoint = (medialJointSpace && lateralJointSpace) ? (medialJointSpace.x < lateralJointSpace.x ? medialJointSpace : lateralJointSpace) : null;
        const onScreenRightPoint = (medialJointSpace && lateralJointSpace) ? (medialJointSpace.x > lateralJointSpace.x ? medialJointSpace : lateralJointSpace) : null;
        const medialPoint = legSide === 'left' ? onScreenLeftPoint : onScreenRightPoint;
        const lateralPoint = legSide === 'left' ? onScreenRightPoint : onScreenLeftPoint;

        // 2. LDFA Calculation
        if (
            visibleLandmarkSets.has('femurAnatomicAxis') &&
            femurAxisPoint &&
            jointCenter &&
            medialPoint &&
            lateralPoint
        ) {
            const femurAxisVec = {
                x: jointCenter.x - femurAxisPoint.x,
                y: jointCenter.y - femurAxisPoint.y
            };

            const femoralJointLineVec =
                legSide === 'left'
                    ? { x: lateralPoint.x - medialPoint.x, y: lateralPoint.y - medialPoint.y }
                    : { x: medialPoint.x - lateralPoint.x, y: medialPoint.y - lateralPoint.y };

            const rawAngle = angleBetweenVectors(femurAxisVec, femoralJointLineVec);
            newResults.ldfa = rawAngle > 90 ? rawAngle : 180 - rawAngle;
        }

        // 3. MPTA Calculation
        if (
            visibleLandmarkSets.has('tibiaAnatomicAxis') &&
            tibiaAxisPoint &&
            jointCenter &&
            medialPoint &&
            lateralPoint
        ) {
            const tibiaAxisVec = {
                x: tibiaAxisPoint.x - jointCenter.x,
                y: tibiaAxisPoint.y - jointCenter.y
            };
            const tibialJointLineVec = {
                x: medialPoint.x - lateralPoint.x,
                y: medialPoint.y - lateralPoint.y
            };

            const rawMpta = angleBetweenVectors(tibiaAxisVec, tibialJointLineVec);
            newResults.mpta = rawMpta > 90 ? rawMpta : 180 - rawMpta;
        }

        if (
            newResults.ldfa !== null &&
            newResults.mpta !== null &&
            newResults.obliquity !== null
        ) {
            newResults.ahka = newResults.mpta + newResults.ldfa - 180;
            newResults.jlo = Math.abs(newResults.mpta - newResults.ldfa);

            if (newResults.ldfa < 87) {
                newResults.femurType = 'Valgoid';
            } else if (newResults.ldfa > 90) {
                newResults.femurType = 'Varoid';
            } else {
                newResults.femurType = 'Median';
            }

            if (newResults.obliquity >= 3) {
                newResults.cpak = 'CPAK 2';

            } else if (newResults.obliquity >= 1) {
                newResults.cpak = 'CPAK 1';

            } else {

                const diff = Math.abs(newResults.ldfa - newResults.mpta);
                newResults.cpak = diff <= 1.5 ? 'CPAK 5' : 'CPAK 4';
            }

            newResults.cut = getValgusStressFemurCut(newResults.obliquity);
        }



        if (JSON.stringify(newResults) !== JSON.stringify(localResultsRef.current)) {
            localResultsRef.current = newResults;
            setValgusResults(newResults);
        }

    }, [valgusLandmarks, visibleLandmarkSets, legSide, setValgusResults]);

    // Effect to trigger calculations only when inputs change
    useEffect(() => {
        updateCalculations();
    }, [valgusLandmarks, visibleLandmarkSets, legSide, updateCalculations]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || Object.keys(valgusLandmarks).length === 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (Object.keys(valgusLandmarks).length === 0) return;

        const {
            medialJointSpace, lateralJointSpace,
            femurAxisPoint, tibiaAxisPoint
        } = valgusLandmarks;

        const drawTextWithBackground = (text: string, x: number, y: number, color: string = '#fdd835') => {
            ctx.font = 'bold 20px Inter, sans-serif';
            ctx.fillStyle = 'rgba(29, 29, 31, 0.8)';
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            ctx.fillRect(x - textWidth / 2 - 8, y - 20, textWidth + 16, 30);
            ctx.fillStyle = color;
            ctx.fillText(text, x - textWidth / 2, y);
        };

        // Calculate shared joint center safely for drawing
        const jointCenter = (medialJointSpace && lateralJointSpace)
            ? { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 }
            : null;

        // Draw Joint Line
        if (visibleLandmarkSets.has('jointLine') && medialJointSpace && lateralJointSpace && jointCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.jointLine;
            ctx.fillStyle = LANDMARK_COLORS.jointLine;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(medialJointSpace.x, medialJointSpace.y);
            ctx.lineTo(lateralJointSpace.x, lateralJointSpace.y);
            ctx.stroke();
            [medialJointSpace, lateralJointSpace].forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
            });

            const isLeftKnee = legSide === 'left';
            const onScreenLeft = medialJointSpace.x < lateralJointSpace.x ? medialJointSpace : lateralJointSpace;
            const onScreenRight = medialJointSpace.x > lateralJointSpace.x ? medialJointSpace : lateralJointSpace;
            const medialPoint = isLeftKnee ? onScreenLeft : onScreenRight;
            const lateralPoint = isLeftKnee ? onScreenRight : onScreenLeft;

            const m_x_offset = medialPoint.x > lateralPoint.x ? 20 : -30;
            const l_x_offset = lateralPoint.x > medialPoint.x ? 20 : -30;
            ctx.fillStyle = "#e3e3e3";
            ctx.fillText('M', medialPoint.x + m_x_offset, medialPoint.y + 5);
            ctx.fillText('L', lateralPoint.x + l_x_offset, lateralPoint.y + 5);

            if (localResultsRef.current.obliquity !== null) {
                drawTextWithBackground(`Obliquity: ${localResultsRef.current.obliquity.toFixed(1)}°`, jointCenter.x, jointCenter.y - 20);
            }
            if (localResultsRef.current.ldfa !== null) {
                drawTextWithBackground(`LDFA: ${localResultsRef.current.ldfa.toFixed(1)}°`, jointCenter.x, jointCenter.y - 55);
            }
            if (localResultsRef.current.mpta !== null) {
                drawTextWithBackground(`MPTA: ${localResultsRef.current.mpta.toFixed(1)}°`, jointCenter.x, jointCenter.y + 55);
            }
        }

        // Draw Femur Axis
        if (visibleLandmarkSets.has('femurAnatomicAxis') && femurAxisPoint && jointCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis;
            ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(femurAxisPoint.x, femurAxisPoint.y);
            ctx.lineTo(jointCenter.x, jointCenter.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(femurAxisPoint.x, femurAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Tibia Axis
        if (visibleLandmarkSets.has('tibiaAnatomicAxis') && tibiaAxisPoint && jointCenter) {
            ctx.strokeStyle = LANDMARK_COLORS.tibiaAnatomicAxis;
            ctx.fillStyle = LANDMARK_COLORS.tibiaAnatomicAxis;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(tibiaAxisPoint.x, tibiaAxisPoint.y);
            ctx.lineTo(jointCenter.x, jointCenter.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(tibiaAxisPoint.x, tibiaAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        // NOTE: updateCalculations() REMOVED from draw() loop to prevent infinite recursion/crash

    }, [valgusLandmarks, visibleLandmarkSets, legSide]);

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
            setValgusCanvasDataUrl(tempCanvas.toDataURL('image/png'));
        }
    }, [setValgusCanvasDataUrl]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Handle Resize (Moved here)
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

                setValgusLandmarks(prev => {
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
    }, [draw, setValgusLandmarks]);


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
            setActiveInstruction(null);
        } else {
            newSets.add(setName);
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
        setValgusResults({
            obliquity: null,
            ldfa: null,
            mpta: null,
            ahka: null,
            jlo: null,
            femurType: '--',
            cpak: '--',
            cut: '--'
        });
        setValgusCanvasDataUrl(null);
    };

    const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
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

        setValgusLandmarks(prev => ({
            ...prev,
            [activeLandmarkRef.current!]: { x, y }
        }));
    };

    const updatePip = useCallback((overridePos?: Point) => {
        const key = draggingPointRef.current;
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const pipCanvas = pipCanvasRef.current;

        // Use overridePos if provided, otherwise fall back to state (stale is okay for non-dragging)
        const pos = overridePos || (key ? valgusLandmarks[key] : null);

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
    }, []); // Removed valgusLandmarks dependency to keep handlers stable

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
        const hitRadiusSq = (HANDLE_RADIUS + 30) ** 2; // Increased hit radius
        for (const key in valgusLandmarks) {
            if (!valgusLandmarks[key]) continue;
            const distSq = (valgusLandmarks[key].x - pos.x) ** 2 + (valgusLandmarks[key].y - pos.y) ** 2;
            if (distSq < hitRadiusSq) {
                draggingPointRef.current = key;
                break;
            }
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingPointRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, e.clientX, e.clientY);

        setValgusLandmarks(prev => ({
            ...prev,
            [draggingPointRef.current!]: pos
        }));

        updatePip(pos);
    }, [setValgusLandmarks, updatePip]);

    const handleMouseUp = useCallback(() => {
        draggingPointRef.current = null;
        captureCanvasState();
    }, [captureCanvasState]);

    const handlePipStart = (e: React.MouseEvent | React.TouchEvent) => {
        isDraggingPipRef.current = true;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const pipRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        pipDragOffset.current = {
            x: clientX - pipRect.left,
            y: clientY - pipRect.top,
        };
    };

    const handlePipEnd = useCallback(() => {
        isDraggingPipRef.current = false;
    }, []);

    // Use same handler for both mouse and touch move
    const handlePipMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDraggingPipRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const viewer = pipViewerRef.current?.parentElement;
        if (!viewer) return;
        const viewerRect = viewer.getBoundingClientRect();

        let newX = clientX - viewerRect.left - pipDragOffset.current.x;
        let newY = clientY - viewerRect.top - pipDragOffset.current.y;

        const pipSize = 160;
        newX = Math.max(0, Math.min(newX, viewerRect.width - pipSize));
        newY = Math.max(0, Math.min(newY, viewerRect.height - pipSize));

        setPipPosition({ x: newX, y: newY });
    }, []);

    const handlePipMouseUp = useCallback(() => {
        isDraggingPipRef.current = false;
    }, []);

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
        // Removed hitRadiusSq declaration

        for (const key in valgusLandmarks) {
            if (!valgusLandmarks[key]) continue;
            const distSq = (valgusLandmarks[key].x - pos.x) ** 2 + (valgusLandmarks[key].y - pos.y) ** 2;
            if (distSq < (HANDLE_RADIUS + 30) ** 2) { // Increased hit radius
                draggingPointRef.current = key;
                break;
            }
        }
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!draggingPointRef.current) return;
        e.preventDefault(); // Critical: stops page scroll

        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);

        setValgusLandmarks(prev => ({
            ...prev,
            [draggingPointRef.current!]: pos
        }));

        updatePip(pos);
    }, [setValgusLandmarks, updatePip]);

    const handleTouchEnd = useCallback(() => {
        draggingPointRef.current = null;
        captureCanvasState();
    }, [captureCanvasState]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handlePipMove);
        window.addEventListener('mouseup', handlePipEnd);
        window.addEventListener('touchmove', handlePipMove, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handlePipEnd);
        window.addEventListener('touchcancel', handlePipEnd);
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handlePipMove);
            window.removeEventListener('mouseup', handlePipEnd);
            window.removeEventListener('touchmove', handlePipMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handlePipEnd);
            window.removeEventListener('touchcancel', handlePipEnd);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handlePipMove, handlePipEnd, handleTouchMove, handleTouchEnd]);

    return (
        <div className="flex flex-col h-full gap-4">
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(dataUrl) => handleImageLoad(dataUrl, 'Live Photo.png', 'camera')} />

            <h2 className="text-4xl font-bold text-start">Valgus Stress Film CPAK Planner</h2>

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

                    {!valgusImageSrc ? (
                        <div className="text-center text-gray-400">
                            <p className="text-xl">Upload an X-ray to begin</p>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <div
                                ref={viewerRef}
                                onClick={handleViewerTap}
                                onTouchEnd={handleViewerTap}
                                onMouseDown={(e) => e.preventDefault()}
                                onTouchStart={(e) => { }}
                                className="relative w-full h-full overflow-hidden touch-none flex items-center justify-center nav-ignore"
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
                                        src={valgusImageSrc}
                                        alt="Valgus Stress X-ray"
                                        className="block"
                                        onLoad={() => {
                                            const image = imageRef.current;
                                            const canvas = canvasRef.current;
                                            if (!image || !canvas) return;

                                            const viewer = canvas.parentElement?.parentElement;
                                            if (!viewer) return;

                                            const availableHeight = viewer.clientHeight - 16;
                                            const availableWidth = viewer.clientWidth - 16;

                                            const aspectRatio = image.naturalWidth / image.naturalHeight;

                                            let displayHeight = availableHeight;
                                            let displayWidth = displayHeight * aspectRatio;

                                            if (displayWidth > availableWidth) {
                                                displayWidth = availableWidth;
                                                displayHeight = displayWidth / aspectRatio;
                                            }

                                            canvas.width = displayWidth;
                                            canvas.height = displayHeight;

                                            image.style.width = `${displayWidth}px`;
                                            image.style.height = `${displayHeight}px`;

                                            if (Object.keys(valgusLandmarks).length === 0) {
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

                    {/* STEP 1: Upload */}
                    <section>
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Upload X-ray</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <label htmlFor="xray-upload" className="cursor-pointer text-center py-2 rounded bg-gray-700 hover:bg-[#6D282C]">
                                File
                            </label>
                            <input type="file" id="xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            <button onClick={() => setIsCameraOpen(true)} className="py-2 rounded bg-gray-700 hover:bg-[#6D282C]">
                                Camera
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate">{fileName}</p>
                    </section>

                    <hr className="border-gray-700" />

                    {/* STEP 2: Leg Side */}
                    <section>
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Leg Side</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setLegSide('left')} className={`py-2 rounded ${legSide === 'left' ? 'bg-[#6D282C]' : 'bg-gray-700'}`}>Left</button>
                            <button onClick={() => setLegSide('right')} className={`py-2 rounded ${legSide === 'right' ? 'bg-[#6D282C]' : 'bg-gray-700'}`}>Right</button>
                        </div>
                    </section>

                    <hr className="border-gray-700" />

                    {/* STEP 3: Landmarks */}
                    <section>
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Landmarks</h3>
                        <div className="space-y-2">
                            {Object.entries(landmarkInstructions).map(([key, value]) => {
                                const isSelected = visibleLandmarkSets.has(key);
                                return (
                                    <button
                                        key={key}
                                        onClick={() => toggleLandmarkSet(key as any)}
                                        className={`w-full py-2 rounded border ${isSelected ? 'bg-[#6D282C]' : 'border-gray-600 hover:bg-gray-700'}`}
                                    >
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </button>
                                )
                            })}
                        </div>
                        <button onClick={handleResetAll} className="mt-3 w-full py-2 rounded bg-gray-600 hover:bg-gray-700">
                            Reset All
                        </button>
                    </section>

                    {/* INSTRUCTIONS */}
                    <section className="bg-gray-900/50 p-3 rounded border border-gray-700">
                        <h4 className="text-md font-semibold text-yellow-300 mb-1">Instructions</h4>
                        {activeInstruction ? (
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {activeInstruction.map((i, idx) => (
                                    <li key={idx}>{i}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400">Select a landmark to begin</p>
                        )}
                    </section>

                    {/* METRICS */}
                    <section>
                        <h4 className="text-md font-semibold mb-2">Metrics</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <MetricItem label="Obliquity" value={`${valgusResults.obliquity?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="LDFA" value={`${valgusResults.ldfa?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="MPTA" value={`${valgusResults.mpta?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="aHKA" value={`${valgusResults.ahka?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="JLO" value={`${valgusResults.jlo?.toFixed(1) ?? '--'}°`} />
                            <MetricItem label="CPAK" value={valgusResults.cpak} />
                        </div>
                    </section>
                </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="flex justify-end">
                <button
                    onClick={() => setPage('planner-valgus-stress-results')}
                    disabled={!valgusResults.cpak || valgusResults.cpak === '--'}
                    className="gemini-dark-button px-8 py-3 text-lg"
                >
                    Go to Analysis & Results
                </button>
            </div>
        </div>
    );
};

export default ValgusStressPlannerPage;
