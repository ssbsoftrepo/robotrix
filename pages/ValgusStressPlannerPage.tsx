
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
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    streamRef.current = stream;
                    if (videoRef.current) videoRef.current.srcObject = stream;
                })
                .catch(err => {
                    console.error("Error accessing camera: ", err);
                    onClose();
                });
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, onClose, stopCamera]);

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            onCapture(canvas.toDataURL('image/png'));
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-4 rounded-lg relative w-full max-w-3xl text-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded"></video>
                <div className="mt-4 flex justify-center space-x-4">
                    <button onClick={handleCapture} className="gemini-dark-button font-bold py-3 px-8 rounded-lg">Capture</button>
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg">Cancel</button>
                </div>
            </div>
        </div>
    );
};


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
        ctx.font = 'bold 16px Roboto, sans-serif';

        const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = valgusLandmarks;

        const drawTextWithBackground = (text: string, x: number, y: number, color: string = 'white') => {
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
            const img = imageRef.current;
            const canvas = canvasRef.current;
            if (img && canvas && img.width > 0 && canvas.width > 0) {
                if (Math.abs(img.width - canvas.width) > 1 || Math.abs(img.height - canvas.height) > 1) {
                    const scaleX = img.width / canvas.width;
                    const scaleY = img.height / canvas.height;

                    canvas.width = img.width;
                    canvas.height = img.height;

                    setValgusLandmarks(prev => {
                        const next: any = {};
                        for (const key in prev) {
                            if (prev[key]) {
                                next[key] = {
                                    x: prev[key].x * scaleX,
                                    y: prev[key].y * scaleY
                                };
                            }
                        }
                        return next as Landmarks;
                    });

                    requestAnimationFrame(draw);
                }
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

    const updatePip = useCallback(() => {
        const key = draggingPointRef.current;
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const pipCanvas = pipCanvasRef.current;
        if (!key || !valgusLandmarks[key] || !image || !canvas || !pipCanvas) return;

        const pos = valgusLandmarks[key];
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
    }, [valgusLandmarks]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
        const hitRadiusSq = (HANDLE_RADIUS + 5) ** 2;
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
        const newLandmarks = {
            ...valgusLandmarks,
            [draggingPointRef.current!]: pos
        };
        setValgusLandmarks(newLandmarks);
        updatePip();
    }, [valgusLandmarks, setValgusLandmarks, updatePip]);

    const handleMouseUp = useCallback(() => {
        draggingPointRef.current = null;
        captureCanvasState();
    }, [captureCanvasState]);

    const handlePipStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDraggingPipRef.current = true;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const pipRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        pipDragOffset.current = {
            x: clientX - pipRect.left,
            y: clientY - pipRect.top,
        };
    };

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
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
        // Removed hitRadiusSq declaration

        for (const key in valgusLandmarks) {
            if (!valgusLandmarks[key]) continue;
            const distSq = (valgusLandmarks[key].x - pos.x) ** 2 + (valgusLandmarks[key].y - pos.y) ** 2;
            if (distSq < (HANDLE_RADIUS + 30) ** 2) {
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
        const newLandmarks = {
            ...valgusLandmarks,
            [draggingPointRef.current!]: pos
        };
        setValgusLandmarks(newLandmarks);
        updatePip();
    }, [valgusLandmarks, setValgusLandmarks, updatePip]);

    const handleTouchEnd = useCallback(() => {
        draggingPointRef.current = null;
        captureCanvasState();
    }, [captureCanvasState]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handlePipMove);
        window.addEventListener('mouseup', handlePipMouseUp);
        window.addEventListener('touchmove', handlePipMove, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handlePipMove);
            window.removeEventListener('mouseup', handlePipMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handlePipMove, handlePipMouseUp, handleTouchMove, handleTouchEnd]);

    return (
        <div className="flex flex-col h-full">
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(dataUrl) => handleImageLoad(dataUrl, 'Live Photo.png', 'camera')} />
            <h2 className="text-5xl font-bold mb-8">Valgus Stress Film CPAK Planner</h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-grow">
                <div className="lg:col-span-1 gemini-dark-card p-6 rounded-lg space-y-6 flex flex-col">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-300 mb-3">Step 1: Upload X-ray</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <label htmlFor="xray-upload" className={`cursor-pointer text-center p-3 rounded-lg font-semibold text-lg border transition ${uploadMethod === 'file' ? 'bg-[#6D282C] text-white border-[#893338]' : 'bg-[#2a2b2c] border-[#5f6368] hover:bg-[#6D282C]'}`}>Choose File</label>
                            <input type="file" id="xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            <button onClick={() => setIsCameraOpen(true)} className={`text-center p-3 rounded-lg font-semibold text-lg border transition ${uploadMethod === 'camera' ? 'bg-[#6D282C] text-white border-[#893338]' : 'bg-[#2a2b2c] border-[#5f6368] hover:bg-[#6D282C]'}`}>Live Photo</button>
                        </div>
                        <span className="text-sm text-gray-400 truncate mt-2 inline-block">{fileName}</span>
                    </div>
                    <hr className="border-gray-600" />
                    <div>
                        <h3 className="text-xl font-semibold text-gray-300 mb-3">Step 2: Choose Leg Side</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setLegSide('left')} className={`py-3 px-4 rounded-lg font-semibold text-lg border ${legSide === 'left' ? 'bg-[#6D282C] text-white border-[#893338]' : 'bg-[#2a2b2c] border-[#5f6368]'}`}>Left</button>
                            <button onClick={() => setLegSide('right')} className={`py-3 px-4 rounded-lg font-semibold text-lg border ${legSide === 'right' ? 'bg-[#6D282C] text-white border-[#893338]' : 'bg-[#2a2b2c] border-[#5f6368]'}`}>Right</button>
                        </div>
                    </div>
                    <hr className="border-gray-600" />
                    <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-gray-300 mb-3">Step 3: Mark Landmarks</h3>
                        <div className="space-y-3">
                            {Object.entries(landmarkInstructions).map(([key, value]) => {
                                const isSelected = visibleLandmarkSets.has(key);
                                return (
                                    <button
                                        key={key}
                                        onClick={() => toggleLandmarkSet(key as any)}
                                        style={{ '--landmark-color': LANDMARK_COLORS[key as keyof typeof LANDMARK_COLORS] } as React.CSSProperties}
                                        className={`w-full text-left py-3 px-4 rounded-lg font-semibold text-lg border-2 transition-all duration-200 
                                            ${isSelected
                                                ? 'bg-[#6D282C] border-transparent text-white hover:bg-[#893338]'
                                                : 'bg-transparent border-[var(--landmark-color)] text-gray-200 hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </button>
                                )
                            })}
                        </div>
                        <button onClick={handleResetAll} className="w-full mt-6 text-center py-3 px-4 rounded-lg font-semibold text-lg border bg-gray-600 hover:bg-gray-700 border-gray-500 text-white transition">Reset All Markings</button>
                    </div>
                </div>

                <div className="lg:col-span-2 gemini-dark-card p-2 rounded-lg relative min-h-[600px] flex items-center justify-center overflow-hidden">
                    {!valgusImageSrc ? (
                        <div className="text-center text-gray-400"><p className="mt-4 text-xl">Upload an X-ray to begin</p></div>
                    ) : (
                        <div className="w-full h-full relative flex items-center justify-center">
                            <div className="relative">
                                <img
                                    ref={imageRef}
                                    src={valgusImageSrc}
                                    alt="Valgus Stress X-ray"
                                    className="block max-w-full max-h-full"
                                    onLoad={(e) => {
                                        const image = imageRef.current;
                                        const canvas = canvasRef.current;
                                        if (!image || !canvas) return;

                                        const viewer = canvas.parentElement?.parentElement;
                                        if (!viewer) return;

                                        // Calculate available space inside the gemini-dark-card (p-2 ≈ 16px padding total)
                                        const availableHeight = viewer.clientHeight - 32;
                                        const availableWidth = viewer.clientWidth - 32;

                                        const aspectRatio = image.naturalWidth / image.naturalHeight;

                                        // Prioritize height for tall X-rays
                                        let displayHeight = availableHeight;
                                        let displayWidth = displayHeight * aspectRatio;

                                        if (displayWidth > availableWidth) {
                                            displayWidth = availableWidth;
                                            displayHeight = displayWidth / aspectRatio;
                                        }

                                        // Set exact pixel sizes
                                        canvas.width = displayWidth;
                                        canvas.height = displayHeight;

                                        image.style.width = `${displayWidth}px`;
                                        image.style.height = `${displayHeight}px`;
                                        image.style.maxHeight = 'none';
                                        image.style.maxWidth = 'none';

                                        // Initialize landmarks only on first load
                                        if (Object.keys(valgusLandmarks).length === 0) {
                                            if (canvasRef.current) resetLandmarks(canvasRef.current);
                                        }

                                        requestAnimationFrame(draw);
                                    }}
                                />
                                <canvas
                                    ref={canvasRef}
                                    onTouchStart={handleTouchStart}
                                    onMouseDown={handleMouseDown}
                                    className="absolute top-0 left-0 cursor-crosshair touch-none"
                                    style={{ touchAction: 'none' }}
                                />
                            </div>

                            {/* PIP Viewer */}
                            {valgusImageSrc && (
                                <div
                                    ref={pipViewerRef}
                                    onMouseDown={handlePipStart}
                                    onTouchStart={handlePipStart}
                                    onMouseLeave={handlePipMouseUp}
                                    className="absolute w-40 h-40 border-2 border-[#800000] bg-black rounded-full cursor-grab active:cursor-grabbing shadow-lg touch-none"
                                    style={{ top: `${pipPosition.y}px`, left: `${pipPosition.x}px`, touchAction: 'none' }}
                                >
                                    <canvas ref={pipCanvasRef} width="160" height="160" className="rounded-full" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 gemini-dark-card p-6 rounded-lg flex flex-col items-center justify-center">
                    <h3 className="text-3xl font-bold text-gray-300 mb-4 text-center">Instructions</h3>
                    <div className="text-2xl text-yellow-300 min-h-[150px] w-full p-4 bg-gray-900/50 rounded-lg border border-gray-700 flex items-center justify-center">
                        {activeInstruction ? (
                            <div className="text-center space-y-4">
                                {activeInstruction.map((inst, i) => <p key={i}>{inst}</p>)}
                            </div>
                        ) : (
                            <p className="text-center">Select a landmark group.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <div className="gemini-dark-card p-6 rounded-lg space-y-4">
                    <h3 className="text-center font-bold text-2xl text-gray-200 mb-4">Detailed Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-800/80 p-4 rounded-lg text-center">
                            <p className="text-xl text-gray-400">Obliquity</p>
                            <p className="font-bold text-3xl text-gray-100">{valgusResults.obliquity?.toFixed(1) ?? '--'}°</p>
                            <p className="text-md text-gray-300 mt-1">{getObliquityDescription(valgusResults.obliquity)}</p>
                        </div>
                        <div className="bg-gray-800/80 p-4 rounded-lg text-center">
                            <p className="text-xl text-gray-400">LDFA</p>
                            <p className="font-bold text-3xl text-gray-100">{valgusResults.ldfa?.toFixed(1) ?? '--'}°</p>
                        </div>
                        <div className="bg-gray-800/80 p-4 rounded-lg text-center">
                            <p className="text-xl text-gray-400">MPTA</p>
                            <p className="font-bold text-3xl text-gray-100">{valgusResults.mpta?.toFixed(1) ?? '--'}°</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button onClick={() => setPage('planner-valgus-stress-results')} className="gemini-dark-button font-bold text-xl py-3 px-8 rounded-lg transition" disabled={!valgusResults.cpak || valgusResults.cpak === '--'}>Go to analysis & Results</button>
            </div>
        </div>
    );
};

export default ValgusStressPlannerPage;
