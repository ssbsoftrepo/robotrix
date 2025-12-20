
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, LegSide, Point } from '../types';

const landmarkInstructions = {
    hkaLine: ["Mark hip center.", "Mark knee center.", "Mark ankle center."],
    femurAnatomicAxis: ["Mark the anatomical mid femoral axis."],
    femoralJointLine: ["Mark the most distal part of medial (M) femoral condyle.", "Mark the most distal part of lateral (L) femoral condyle."],
    tibialJointLine: ["Mark the highest point of medial (M) tibial condyle.", "Mark the highest point of lateral (L) tibial condyle."],
};

const HANDLE_RADIUS = 6; // Reduced size

const LANDMARK_COLORS = {
    hkaLine: '#89CFF0',           // Baby Blue
    femurAnatomicAxis: '#F08080',   // Light Coral
    femoralJointLine: '#98FB98',      // Pale Green
    tibialJointLine: '#FFD700',       // Gold
};


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

// --- Camera Modal Component ---
const CameraModal: React.FC<{ isOpen: boolean; onClose: () => void; onCapture: (dataUrl: string) => void; }> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
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
                <h3 className="text-xl font-semibold mb-4">Live Capture with Alignment Grid</h3>
                <div className="relative inline-block border-2 border-gray-600">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded"></video>
                    <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full"></canvas>
                </div>
                <div className="mt-4 flex justify-center space-x-4">
                    <button onClick={handleCapture} className="gemini-dark-button font-bold py-3 px-8 rounded-lg">Capture</button>
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg">Cancel</button>
                </div>
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


    // Auto-adjust hip center for a 4-degree VCA when femur anatomic axis is marked (in corrected mode)
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

        // Convention: For a left leg, medial is left of screen, lateral is right.
        // For a right leg, medial is right of screen, lateral is left.
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

            const ldfa = angleBetweenVectors(femoralAxisVec, femoralJointLineVec);
            newResults.ldfa = ldfa;
        }

        if (visibleLandmarkSets.has('hkaLine') && visibleLandmarkSets.has('tibialJointLine') && tibialMedial && tibialLateral) {
            const isLeftKnee = legSide === 'left';
            const medialTibialCondyle = (isLeftKnee ? tibialMedial.x < tibialLateral.x : tibialMedial.x > tibialLateral.x) ? tibialMedial : tibialLateral;
            const lateralTibialCondyle = (isLeftKnee ? tibialMedial.x > tibialLateral.x : tibialMedial.x < tibialLateral.x) ? tibialMedial : tibialLateral;

            const tibialAxisVec = { x: ankleCenter.x - kneeCenter.x, y: ankleCenter.y - kneeCenter.y };
            const tibialJointLineVec = { x: medialTibialCondyle.x - lateralTibialCondyle.x, y: medialTibialCondyle.y - lateralTibialCondyle.y };

            const mpta = angleBetweenVectors(tibialAxisVec, tibialJointLineVec);
            newResults.mpta = mpta;
        }

        if (newResults.ldfa !== null && newResults.mpta !== null) {
            const ahka = newResults.mpta - newResults.ldfa;
            const jlo = newResults.mpta + newResults.ldfa;
            let jloType = '--';
            if (jlo < 177) { jloType = 'APEX DISTAL'; }
            else if (jlo > 183) { jloType = 'APEX PROXIMAL'; }
            else { jloType = 'APEX NEUTRAL'; }

            newResults = {
                ...newResults,
                ahka, jlo, jloType,
                cpak: getLongLegCpakType(ahka, jlo),
                cut: getLongLegValgusCut(newResults.ldfa),
                recommendedVarusCut: getRecommendedVarusCut(newResults.mpta),
            };
        }

        if (JSON.stringify(newResults) !== JSON.stringify(localResultsRef.current)) {
            localResultsRef.current = newResults;
            setLongLegResults(newResults);
        }

    }, [longLegLandmarks, visibleLandmarkSets, legSide, setLongLegResults, ldfaMode]);

    // Separate effect for calculations
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
            ctx.fillStyle = 'rgba(29, 29, 31, 0.8)'; // Dark semi-transparent background
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const boxPadding = 8;
            ctx.fillRect(x - textWidth / 2 - boxPadding, y - 20, textWidth + boxPadding * 2, 30);
            ctx.fillStyle = 'white';
            ctx.fillText(text, x - textWidth / 2, y);
        };

        // Handle Resize (Moved here to be after draw definition)

        if (visibleLandmarkSets.has('hkaLine')) {
            ctx.strokeStyle = LANDMARK_COLORS.hkaLine;
            ctx.fillStyle = LANDMARK_COLORS.hkaLine;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(hipCenter.x, hipCenter.y); ctx.lineTo(kneeCenter.x, kneeCenter.y);
            ctx.moveTo(kneeCenter.x, kneeCenter.y); ctx.lineTo(ankleCenter.x, ankleCenter.y); ctx.stroke();
            [hipCenter, kneeCenter, ankleCenter].forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
            });
            if (localResultsRef.current.mhka !== null) {
                drawTextWithBackground(`mHKA: ${localResultsRef.current.mhka.toFixed(1)}°`, kneeCenter.x, kneeCenter.y - 50);
            }
        }
        if (ldfaMode === 'corrected' && visibleLandmarkSets.has('femurAnatomicAxis')) {
            ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis;
            ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y);
            ctx.lineTo(kneeCenter.x, kneeCenter.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(femurAnatomicAxisPoint.x, femurAnatomicAxisPoint.y, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }
        if (visibleLandmarkSets.has('femoralJointLine')) {
            ctx.strokeStyle = LANDMARK_COLORS.femoralJointLine;
            ctx.fillStyle = LANDMARK_COLORS.femoralJointLine;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(femoralMedial.x, femoralMedial.y); ctx.lineTo(femoralLateral.x, femoralLateral.y); ctx.stroke();
            [femoralMedial, femoralLateral].forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
            });

            const isLeftKnee = legSide === 'left';
            const mLabel = (isLeftKnee ? femoralMedial.x < femoralLateral.x : femoralMedial.x > femoralLateral.x) ? femoralMedial : femoralLateral;
            const lLabel = (isLeftKnee ? femoralMedial.x > femoralLateral.x : femoralMedial.x < femoralLateral.x) ? femoralMedial : femoralLateral;

            const m_x_offset = mLabel.x > lLabel.x ? 20 : -30;
            const l_x_offset = lLabel.x > mLabel.x ? 20 : -30;
            ctx.fillStyle = "#e3e3e3";
            ctx.fillText('M', mLabel.x + m_x_offset, mLabel.y + 5);
            ctx.fillText('L', lLabel.x + l_x_offset, lLabel.y + 5);

            if (visibleLandmarkSets.has('hkaLine') && localResultsRef.current.ldfa !== null) {
                drawTextWithBackground(`LDFA: ${localResultsRef.current.ldfa.toFixed(1)}°`, kneeCenter.x, kneeCenter.y - 85);
            }
        }
        if (visibleLandmarkSets.has('tibialJointLine')) {
            ctx.strokeStyle = LANDMARK_COLORS.tibialJointLine;
            ctx.fillStyle = LANDMARK_COLORS.tibialJointLine;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(tibialMedial.x, tibialMedial.y); ctx.lineTo(tibialLateral.x, tibialLateral.y); ctx.stroke();
            [tibialMedial, tibialLateral].forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
            });

            const isLeftKnee = legSide === 'left';
            const mLabel = (isLeftKnee ? tibialMedial.x < tibialLateral.x : tibialMedial.x > tibialLateral.x) ? tibialMedial : tibialLateral;
            const lLabel = (isLeftKnee ? tibialMedial.x > tibialLateral.x : tibialMedial.x < tibialLateral.x) ? tibialMedial : tibialLateral;

            const m_x_offset = mLabel.x > lLabel.x ? 20 : -30;
            const l_x_offset = lLabel.x > mLabel.x ? 20 : -30;
            ctx.fillStyle = "#e3e3e3";
            ctx.fillText('M', mLabel.x + m_x_offset, mLabel.y + 5);
            ctx.fillText('L', lLabel.x + l_x_offset, lLabel.y + 5);

            if (visibleLandmarkSets.has('hkaLine') && localResultsRef.current.mpta !== null) {
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
            const img = imageRef.current;
            const canvas = canvasRef.current;
            if (img && canvas && img.width > 0 && canvas.width > 0) {
                if (Math.abs(img.width - canvas.width) > 1 || Math.abs(img.height - canvas.height) > 1) {
                    const scaleX = img.width / canvas.width;
                    const scaleY = img.height / canvas.height;

                    canvas.width = img.width;
                    canvas.height = img.height;

                    setLongLegLandmarks(prev => {
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
        setLongLegResults({ ldfa: null, mpta: null, ahka: null, mhka: null, jlo: null, jloType: '--', cpak: '--', cut: '--', recommendedVarusCut: '--', vca: null });
        setFemurBoundary(null);
        setTibiaBoundary(null);
        setLongLegCanvasDataUrl(null);
    };

    // --- Drag and Drop Logic ---
    const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const updatePip = useCallback(() => {
        const key = draggingPointRef.current;
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const pipCanvas = pipCanvasRef.current;
        if (!key || !longLegLandmarks[key] || !image || !canvas || !pipCanvas) return;

        const pos = longLegLandmarks[key];
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
        const hitRadiusSq = (HANDLE_RADIUS + 5) ** 2;
        for (const key in longLegLandmarks) {
            if (!longLegLandmarks[key]) continue;
            const distSq = (longLegLandmarks[key].x - pos.x) ** 2 + (longLegLandmarks[key].y - pos.y) ** 2;
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
            ...longLegLandmarks,
            [draggingPointRef.current!]: pos
        };
        setLongLegLandmarks(newLandmarks);
        updatePip();
    }, [longLegLandmarks, setLongLegLandmarks, updatePip]);

    const handleMouseUp = useCallback(() => {
        draggingPointRef.current = null;
        captureCanvasState();
    }, [captureCanvasState]);

    // Unified handler for both mouse and touch
    const handlePipStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
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
        e.preventDefault(); // Prevent scrolling while dragging
        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
        // Removed hitRadiusSq declaration, using hardcoded larger size

        for (const key in longLegLandmarks) {
            if (!longLegLandmarks[key]) continue;
            const distSq = (longLegLandmarks[key].x - pos.x) ** 2 + (longLegLandmarks[key].y - pos.y) ** 2;
            if (distSq < (HANDLE_RADIUS + 30) ** 2) {
                draggingPointRef.current = key;
                break;
            }
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
        const newLandmarks = {
            ...longLegLandmarks,
            [draggingPointRef.current!]: pos
        };
        setLongLegLandmarks(newLandmarks);
        updatePip();
    }, [longLegLandmarks, setLongLegLandmarks, updatePip]);

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
        <div className="flex flex-col h-full">
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(dataUrl) => handleImageLoad(dataUrl, 'Live Photo.png', 'camera')} />
            <h2 className="text-5xl font-bold mb-8 text-center">Robotrix+ Long Leg Functional Alignment Planner</h2>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-grow">
                {/* Controls Panel */}
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
                            {landmarkButtons.map((btn) => {
                                if ((btn.mode as string) && btn.mode !== ldfaMode) return null;
                                const isSelected = visibleLandmarkSets.has(btn.key);
                                return (
                                    <button
                                        key={btn.key}
                                        onClick={() => toggleLandmarkSet(btn.key as any)}
                                        style={{ '--landmark-color': LANDMARK_COLORS[btn.key as keyof typeof LANDMARK_COLORS] } as React.CSSProperties}
                                        className={`w-full text-left py-3 px-4 rounded-lg font-semibold text-lg border-2 transition-all duration-200
                                            ${isSelected
                                                ? 'bg-[#6D282C] border-transparent text-white hover:bg-[#893338]'
                                                : 'bg-transparent border-[var(--landmark-color)] text-gray-200 hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        {btn.text}
                                    </button>
                                )
                            })}
                        </div>
                        <button onClick={handleResetAll} className="w-full mt-6 text-center py-3 px-4 rounded-lg font-semibold text-lg border bg-gray-600 hover:bg-gray-700 border-gray-500 text-white transition">Reset All Markings</button>
                    </div>
                </div>

                {/* Viewer Panel */}
                <div className="lg:col-span-2 gemini-dark-card p-2 rounded-lg relative min-h-[600px] flex items-center justify-center overflow-hidden">
                    {!longLegImageSrc ? (
                        <div className="text-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5a4 4 0 01-4-4H7z" /></svg>
                            <p className="mt-4 text-xl">Upload an X-ray to begin</p>
                        </div>
                    ) : (
                        <div className="w-full h-full relative flex items-center justify-center">
                            <div className="relative">
                                <img ref={imageRef} src={longLegImageSrc} alt="X-ray" className="block max-w-full max-h-full"
                                    onLoad={(e) => {
                                        const canvas = canvasRef.current;
                                        const image = imageRef.current;
                                        if (canvas && image) {
                                            const ar = image.naturalWidth / image.naturalHeight;
                                            const viewer = canvas.parentElement?.parentElement;
                                            if (viewer) {
                                                let newWidth = viewer.clientWidth;
                                                let newHeight = newWidth / ar;
                                                if (newHeight > viewer.clientHeight) {
                                                    newHeight = viewer.clientHeight;
                                                    newWidth = newHeight * ar;
                                                }
                                                canvas.width = newWidth;
                                                canvas.height = newHeight;
                                                image.style.width = `${newWidth}px`;
                                                image.style.height = `${newHeight}px`;
                                                if (Object.keys(longLegLandmarks).length === 0) {
                                                    resetLandmarks(canvas);
                                                }
                                            }
                                        }
                                    }}
                                />
                                <canvas ref={canvasRef} onTouchStart={handleTouchStart} onMouseDown={handleMouseDown} className="absolute top-0 left-0 cursor-crosshair" />
                            </div>
                            {longLegImageSrc && <div ref={pipViewerRef} onMouseDown={handlePipStart} onMouseLeave={handlePipEnd}
                                onTouchStart={handlePipStart} className="absolute w-40 h-40 border-2 border-dark-maroon bg-black rounded-full cursor-grab active:cursor-grabbing shadow-lg" style={{ top: `${pipPosition.y}px`, left: `${pipPosition.x}px` }}>
                                <canvas ref={pipCanvasRef} width="160" height="160" className="rounded-full"></canvas>
                            </div>}
                        </div>
                    )}
                </div>
                {/* Instructions Panel */}
                <div className="lg:col-span-1 gemini-dark-card p-6 rounded-lg flex flex-col items-center justify-center">
                    <h3 className="text-3xl font-bold text-gray-300 mb-4">Instructions</h3>
                    <div className="text-xl text-yellow-300 min-h-[200px] w-full p-4 bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-700">
                        {activeInstruction ? (
                            <div className="w-full">
                                <ul className="list-disc list-inside space-y-3 text-left w-full">
                                    {activeInstruction.map((inst, index) => (
                                        <li key={index}>{inst}</li>
                                    ))}
                                </ul>
                                {activeInstruction === landmarkInstructions.tibialJointLine && (
                                    <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300 text-base">
                                        <strong>Warning:</strong> Be careful of bone loss.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-center">Select a landmark group to begin.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="gemini-dark-card p-6 rounded-lg mt-8">
                <h3 className="text-center font-bold text-3xl text-gray-200 mb-4">Detailed Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <MetricItem label="LDFA Mode" value={ldfaMode === 'native' ? 'Uncorrected' : 'Corrected'} />
                    <MetricItem label="LDFA" value={`${longLegResults.ldfa?.toFixed(1) ?? '--'}°`} />
                    <MetricItem label="MPTA" value={`${longLegResults.mpta?.toFixed(1) ?? '--'}°`} />
                    <MetricItem label="aHKA" value={`${longLegResults.ahka?.toFixed(1) ?? '--'}°`} />
                    <MetricItem label="mHKA" value={`${longLegResults.mhka?.toFixed(1) ?? '--'}°`} />
                    <MetricItem label="JLO" value={`${longLegResults.jlo?.toFixed(1) ?? '--'}°`} />
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button onClick={() => setPage('results-analysis')} className="gemini-dark-button font-bold text-xl py-3 px-8 rounded-lg transition" disabled={!longLegResults.cpak || longLegResults.cpak === '--'}>Go to analysis & Results</button>
            </div>
        </div>
    );
};

export default LongLegPlannerPage;
