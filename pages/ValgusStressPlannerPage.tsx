import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, Point } from '../types';

const landmarkInstructions = {
  jointLine: ["Mark the center of the medial M joint space.", "Mark the center of the lateral L joint space."],
  femurAnatomicAxis: ["Mark mid femur axis."],
  tibiaAnatomicAxis: ["Mark mid tibia axis."],
};

const LANDMARK_COLORS = {
  jointLine: '#6D282C',
  femurAnatomicAxis: '#6D282C',
  tibiaAnatomicAxis: '#6D282C',
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

const calculateClinicalAngle = (
  centerPt: Point,
  axisPt: Point,    // 
  sidePt: Point     // The Joint Line Point (Medial or Lateral)
) => {
  // 1. Calculate the angle of the Bone Axis relative to horizontal
  const thetaAxis = Math.atan2(axisPt.y - centerPt.y, axisPt.x - centerPt.x);

  // 2. Calculate the angle of the Joint Line relative to horizontal
  const thetaSide = Math.atan2(sidePt.y - centerPt.y, sidePt.x - centerPt.x);

  // 3. Subtract to find the difference
  let diff = thetaAxis - thetaSide;

  // 4. Convert to degrees
  let deg = diff * (180 / Math.PI);

  // 5. Normalize to ensure we get the positive inner angle (0 to 180)
  deg = Math.abs(deg);
  if (deg > 180) {
    deg = 360 - deg;
  }

  return deg;
};

const getFemurClassification = (ldfa: number) => {
  if (ldfa > 92) return { type: 'Significant varoid femur', cut: '2° valgus cut' };
  if (ldfa > 91) return { type: 'Mild varoid femur', cut: '3° valgus cut' };
  if (ldfa > 88) return { type: 'Median (neutral) femur', cut: '4° valgus cut' };
  if (ldfa > 87) return { type: 'Mild valgoid femur', cut: '5° valgus cut' };
  if (ldfa > 86) return { type: 'Significant valgoid femur', cut: '6° valgus cut' };
  return {
    type: 'Significant valgoid femur',
    cut: '6° valgus cut (Warning: Native LDFA out of boundary)'
  };
};

const getTibiaClassification = (mpta: number) => {
  if (mpta > 89) return { type: 'Valgoid tibia', cut: '0° (neutral cut)' };
  if (mpta > 88) return { type: 'Neutral tibia', cut: '1° varus cut' };
  if (mpta > 87) return { type: 'Mild varoid tibia', cut: '2° varus cut' };
  if (mpta > 85) return { type: 'Moderate varoid tibia', cut: '3° varus cut' };
  if (mpta > 84) return { type: 'Significant varoid tibia', cut: '4° varus cut' };
  return {
    type: 'Significant varoid tibia',
    cut: '4° varus cut (Warning: Native MPTA out of boundary)'
  };
};

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
      if (capturedImage && capturedImage.startsWith('blob:')) {
        URL.revokeObjectURL(capturedImage);
      }
      stopCamera();
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
        if (video.paused) await video.play();
        let attempts = 0;
        while ((video.readyState < 2 || video.currentTime === 0) && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }
        await new Promise(resolve => setTimeout(resolve, 200));

        const canvas = document.createElement('canvas');
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
              if (capturedImage && capturedImage.startsWith('blob:')) URL.revokeObjectURL(capturedImage);
              const url = URL.createObjectURL(blob);
              setCapturedImage(url);
              stopCamera();
            }
          }, 'image/jpeg', 0.85);
        }
      } catch (err) {
        console.error("Capture failed:", err);
      }
    }
  };

  const handleCropSave = () => {
    if (capturedImage) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
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
          ctx.drawImage(img, cropRect.x * scaleX, cropRect.y * scaleY, cropW, cropH, 0, 0, cropW, cropH);
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
        if (activeInteraction.includes('l')) {
          next.x = Math.min(prev.x + prev.width - 10, Math.max(0, prev.x + dx));
          next.width = prev.width + (prev.x - next.x);
        }
        if (activeInteraction.includes('r')) next.width = Math.max(10, Math.min(100 - prev.x, prev.width + dx));
        if (activeInteraction.includes('t')) {
          next.y = Math.min(prev.y + prev.height - 10, Math.max(0, prev.y + dy));
          next.height = prev.height + (prev.y - next.y);
        }
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


// --- MAIN PAGE COMPONENT ---

const ValgusStressPlannerPage: React.FC = () => {
  const {
    legSide, setLegSide,
    valgusImageSrc, setValgusImageSrc,
    valgusResults, setValgusResults,
    setValgusCanvasDataUrl, setPage,
    valgusLandmarks, setValgusLandmarks
  } = useAppContext();

  // Track previous leg side to trigger swap
  const prevLegSideRef = useRef(legSide);

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

  useEffect(() => {
    if (valgusResults.obliquity !== null) {
      setVisibleLandmarkSets(new Set(['jointLine', 'femurAnatomicAxis', 'tibiaAnatomicAxis']));
    }
  }, []);

  useEffect(() => {
    if (prevLegSideRef.current !== legSide) {
      setValgusLandmarks(prev => {
        if (!prev.medialJointSpace || !prev.lateralJointSpace) return prev;
        return {
          ...prev,
          medialJointSpace: prev.lateralJointSpace,
          lateralJointSpace: prev.medialJointSpace
        };
      });
      prevLegSideRef.current = legSide;
    }
  }, [legSide, setValgusLandmarks]);

  const resetLandmarks = useCallback((canvas: HTMLCanvasElement) => {
    const w = canvas.width; const h = canvas.height;
    const isLeft = legSide === 'left';

    setValgusLandmarks({
      medialJointSpace: { x: isLeft ? w * 0.45 : w * 0.55, y: h * 0.5 },
      lateralJointSpace: { x: isLeft ? w * 0.55 : w * 0.45, y: h * 0.5 },
      femurAxisPoint: { x: w * 0.5, y: h * 0.2 },
      tibiaAxisPoint: { x: w * 0.5, y: h * 0.8 },
    });
  }, [setValgusLandmarks, legSide]);

  const handleImageLoad = (src: string, name: string, method: 'file' | 'camera') => {
    setValgusImageSrc(src);
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


  const getCpakClassification = (ahka: number, jlo: number, obliquity?: number): string => {

    // 1. Alignment Logic (This was correct in your code)
    // Varus < -2, Valgus > 2, Neutral is between inclusive
    let alignment = 'neutral';
    if (ahka < -2) alignment = 'varus';
    else if (ahka > 2) alignment = 'valgus';
    else alignment = 'neutral';

    // 2. JLO Logic (FIXED)
    // Distal < 177, Proximal > 183 (Strictly greater)
    let jointLine = 'neutral';
    if (jlo < 177) jointLine = 'distal';
    else if (jlo > 183) jointLine = 'proximal'; // Fixed: Changed >= to >
    else jointLine = 'neutral';

    // 3. Return Format (FIXED: Roman -> "Cpak N")
    if (jointLine === 'distal') {
      if (alignment === 'varus') return '1';
      if (alignment === 'neutral') return '2';
      return '3';
    }
    if (jointLine === 'neutral') {
      if (alignment === 'varus') return '4';
      if (alignment === 'neutral') return '5';
      return '6';
    }
    // Proximal
    if (alignment === 'varus') return '7';
    if (alignment === 'neutral') return '8';
    return '9';
  };

  const updateCalculations = useCallback(() => {
    const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = valgusLandmarks;

    let newResults = {
      obliquity: null as number | null,
      ldfa: null as number | null,
      mpta: null as number | null,
      femurType: '--',
      femurTypeByObliquity: '--',
      tibiaType: '--',
      cpak: '--',
      ahka: null as number | null,
      jlo: null as number | null,
      cut: '--',
      tibialCut: '--'
    };

    let jointCenter: Point | null = null;
    const medialPoint = medialJointSpace;
    const lateralPoint = lateralJointSpace;

    if (medialPoint && lateralPoint) {
      jointCenter = {
        x: (medialPoint.x + lateralPoint.x) / 2,
        y: (medialPoint.y + lateralPoint.y) / 2
      };

      // 1. Obliquity Calculation (Visual tilt)
      if (visibleLandmarkSets.has('jointLine')) {
        const dy = medialPoint.y - lateralPoint.y;
        const dx = medialPoint.x - lateralPoint.x;
        let angleDeg = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
        if (angleDeg > 180) angleDeg = 360 - angleDeg;
        if (angleDeg > 90) angleDeg = 180 - angleDeg;
        newResults.obliquity = angleDeg;
      }
    }

    // 2. LDFA Calculation (Lateral Distal Femoral Angle)
    // if (
    //   visibleLandmarkSets.has('femurAnatomicAxis') &&
    //   femurAxisPoint &&
    //   jointCenter &&
    //   lateralPoint
    // ) {
    //   newResults.ldfa = calculateDirectionalAngle(jointCenter, femurAxisPoint, lateralPoint, true);
    // }

    // 3. MPTA Calculation (Medial Proximal Tibial Angle)
    // if (
    //   visibleLandmarkSets.has('tibiaAnatomicAxis') &&
    //   tibiaAxisPoint &&
    //   jointCenter &&
    //   medialPoint
    // ) {
    //   newResults.mpta = calculateDirectionalAngle(jointCenter, tibiaAxisPoint, medialPoint, false);
    // }
    // if (newResults.mpta !== null && newResults.mpta > 90) {
    //   newResults.mpta = 180 - newResults.mpta;
    // }

    if (
      visibleLandmarkSets.has('femurAnatomicAxis') &&
      femurAxisPoint &&
      jointCenter &&
      lateralPoint // We MUST use the Lateral point 
    ) {
      // Calculate angle between Femur Axis and the Lateral edge of the joint line
      newResults.ldfa = calculateClinicalAngle(jointCenter, femurAxisPoint, lateralPoint);
    }

    // 3. MPTA Calculation (Medial Proximal Tibial Angle)
    if (
      visibleLandmarkSets.has('tibiaAnatomicAxis') &&
      tibiaAxisPoint &&
      jointCenter &&
      medialPoint // We MUST use the Medial point here
    ) {
      // Calculate angle between Tibia Axis and the Medial edge of the joint line
      newResults.mpta = calculateClinicalAngle(jointCenter, tibiaAxisPoint, medialPoint);
    }
    // 4. Derived Classifications
    if (
      newResults.ldfa !== null &&
      newResults.mpta !== null &&
      newResults.obliquity !== null
    ) {
      // Standard formulas (Difference for aHKA)
      const calculatedAhka = newResults.mpta - newResults.ldfa;
      newResults.ahka = calculatedAhka;

      const calculatedJlo = newResults.mpta + newResults.ldfa;
      newResults.jlo = calculatedJlo;

      // Femur Classification (LDFA-based)
      const femurClass = getFemurClassification(newResults.ldfa);
      newResults.femurType = femurClass.type;
      newResults.cut = femurClass.cut;

      // Femur Classification (Obliquity-based)
      if (newResults.obliquity >= 3) {
        newResults.femurTypeByObliquity = 'Valgoid';
      } else if (newResults.obliquity >= 1) {
        newResults.femurTypeByObliquity = 'Median';
      } else {
        newResults.femurTypeByObliquity = 'Varoid';
      }

      // Tibia Classification
      const tibiaClass = getTibiaClassification(newResults.mpta);
      newResults.tibiaType = tibiaClass.type;
      newResults.tibialCut = tibiaClass.cut;

      const cpakType = getCpakClassification(newResults.ahka, newResults.jlo, newResults.obliquity ?? 0);
      newResults.cpak = cpakType;

      const validation = validateMeasurements(newResults.ldfa, newResults.mpta);
      if (validation.status !== 'success') {
        if (validation.status === 'error') {
          newResults.femurType = 'ERROR';
          newResults.tibiaType = 'Physiological Limit';
          newResults.cpak = 'N/A';
        }
      }
    }

    if (JSON.stringify(newResults) !== JSON.stringify(localResultsRef.current)) {
      localResultsRef.current = newResults;
      setValgusResults(newResults);
    }
  }, [valgusLandmarks, visibleLandmarkSets, legSide, setValgusResults]);

  useEffect(() => {
    updateCalculations();
  }, [valgusLandmarks, visibleLandmarkSets, legSide, updateCalculations]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || Object.keys(valgusLandmarks).length === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = valgusLandmarks;

    const drawTextWithBackground = (text: string, x: number, y: number, color: string = '#fdd835') => {
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillStyle = 'rgba(29, 29, 31, 0.8)';
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      ctx.fillRect(x - textWidth / 2 - 8, y - 20, textWidth + 16, 30);
      ctx.fillStyle = color;
      ctx.fillText(text, x - textWidth / 2, y);
    };

    const jointCenter = (medialJointSpace && lateralJointSpace)
      ? { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 }
      : null;

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

      // Draw M and L labels explicitly
      // Calculate offset based on relative position to avoid overlap
      const mOffset = medialJointSpace.x < lateralJointSpace.x ? -25 : 25;
      const lOffset = lateralJointSpace.x < medialJointSpace.x ? -25 : 25;

      ctx.fillStyle = "#e3e3e3";
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText('M', medialJointSpace.x + mOffset, medialJointSpace.y + 5);
      ctx.fillText('L', lateralJointSpace.x + lOffset, lateralJointSpace.y + 5);

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

    // Validation Overlay removed from canvas


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
      const oldW = parseFloat(img.style.width) || img.width;
      const aspect = img.naturalWidth / img.naturalHeight;
      let newW = availHeight * aspect;
      let newH = availHeight;
      if (newW > availWidth) {
        newW = availWidth;
        newH = newW / aspect;
      }
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
      tibiaType: '--', // Reset
      cpak: '--',
      cut: '--',
      tibialCut: '--' // Reset
    });
    setValgusCanvasDataUrl(null);
  };

  const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
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
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
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
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e.currentTarget, e.clientX, e.clientY);
    const hitRadiusSq = (HANDLE_RADIUS + 50) ** 2;
    let minDistSq = hitRadiusSq;
    let closestKey: string | null = null;
    for (const key in valgusLandmarks) {
      if (!valgusLandmarks[key]) continue;
      const distSq = (valgusLandmarks[key].x - pos.x) ** 2 + (valgusLandmarks[key].y - pos.y) ** 2;
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

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
    const hitRadiusSq = (HANDLE_RADIUS + 60) ** 2;
    let minDistSq = hitRadiusSq;
    let closestKey: string | null = null;
    for (const key in valgusLandmarks) {
      if (!valgusLandmarks[key]) continue;
      const distSq = (valgusLandmarks[key].x - pos.x) ** 2 + (valgusLandmarks[key].y - pos.y) ** 2;
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
    e.preventDefault();
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
    <div className="relative flex flex-col h-full gap-4 overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
      {/* Cinematic Lighting */}
      <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

      {isCameraOpen && (
        <CameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(dataUrl) => handleImageLoad(dataUrl, 'Live Photo.png', 'camera')}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 relative z-10">
        <h2 className="text-3xl font-bold text-[#E0E0E0] tracking-tight">Valgus Stress Film CPAK Planner</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-[#6D282C] animate-pulse" />
          <span>Active Workspace</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[75fr_25fr] gap-4 flex-grow min-h-0 px-4 relative z-10">

        {/* LEFT: X-Ray Canvas (75%) */}
        <div className="relative bg-[#0a0a0a] border border-[#333333] rounded-lg overflow-hidden h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
          {zoom > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-black px-4 py-1 rounded-full font-bold shadow-lg animate-pulse">
              Reset zoom to mark the markings
            </div>
          )}

          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
            <button onClick={zoomIn} className="bg-[#252525] border border-[#333333] hover:bg-[#333333] px-3 py-1 rounded text-gray-300"> ＋ </button>
            <button onClick={zoomOut} className="bg-[#252525] border border-[#333333] hover:bg-[#333333] px-3 py-1 rounded text-gray-300"> － </button>
            <button onClick={resetZoom} className="bg-[#252525] border border-[#333333] hover:bg-[#333333] px-2 py-1 rounded text-xs text-gray-300">
              Reset
            </button>
          </div>

          {!valgusImageSrc ? (
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
                    className="block mix-blend-screen"
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
                  className="absolute w-44 h-44 rounded-full border-4 border-cyan-400 bg-black shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-grab touch-none"
                  style={{ top: pipPosition.y, left: pipPosition.x }}
                >
                  <canvas
                    ref={pipCanvasRef}
                    width={176}
                    height={176}
                    className="rounded-full"
                  />
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
              <input type="file" id="xray-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
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
                <button
                  onClick={() => setLegSide('left')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${legSide === 'left' ? 'bg-[#6D282C] text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  LEFT
                </button>
                <button
                  onClick={() => setLegSide('right')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${legSide === 'right' ? 'bg-[#6D282C] text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  RIGHT
                </button>
              </div>
            </div>
          </section>

          {/* Metrics Grid */}
          <section className="relative z-10">
            <h4 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Calculated Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              <MetricItem label="Obliquity" value={`${valgusResults.obliquity?.toFixed(1) ?? '--'}°`} />
              <MetricItem label="LDFA" value={`${valgusResults.ldfa?.toFixed(1) ?? '--'}°`} />
              <MetricItem label="MPTA" value={`${valgusResults.mpta?.toFixed(1) ?? '--'}°`} />
              <MetricItem label="aHKA" value={`${valgusResults.ahka?.toFixed(1) ?? '--'}°`} highlight />
              <MetricItem label="JLO" value={`${valgusResults.jlo?.toFixed(1) ?? '--'}°`} />
              <MetricItem label="CPAK" value={valgusResults.cpak} highlight />
            </div>
          </section>

          {/* Landmark Stepper Cards */}
          <section className="relative z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Workflow Steps</h3>
            </div>
            <div className="flex flex-col gap-2 mb-3">
              {Object.entries(landmarkInstructions).map(([key, value], idx) => {
                const isSelected = visibleLandmarkSets.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleLandmarkSet(key as any)}
                    className={`group relative w-full py-3 px-4 text-sm font-semibold rounded-lg border transition-all text-left flex items-center gap-3
                      ${isSelected
                        ? 'bg-gradient-to-r from-[#6D282C] to-[#893338] border-[#a04046] text-white shadow-[0_0_20px_rgba(109,40,44,0.3)]'
                        : 'bg-[#252525] border-[#333333] hover:bg-[#333333] hover:border-[#6D282C]/50 text-gray-300'}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                      ${isSelected ? 'bg-white text-[#6D282C] border-white' : 'bg-transparent border-gray-500 text-gray-500'}`}>
                      {isSelected ? '✓' : idx + 1}
                    </span>
                    <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleResetAll}
              className="w-full py-2.5 text-sm font-bold rounded-lg bg-[#252525] border border-[#333333] hover:bg-[#333333] text-gray-400 hover:text-white transition-all"
            >
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
                {activeInstruction.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Select a workflow step to begin</p>
            )}
          </section>

          {/* VALIDATION MESSAGE */}
          {(() => {
            const { ldfa, mpta } = valgusResults;
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
          onClick={() => setPage('planner-valgus-stress-results')}
          disabled={!valgusResults.cpak || valgusResults.cpak === '--'}
          className={`group relative py-3 px-8 rounded-sm transition-all duration-300 ease-out flex items-center gap-2
            ${(!valgusResults.cpak || valgusResults.cpak === '--')
              ? 'bg-[#252525] border border-[#333333] text-gray-500 cursor-not-allowed'
              : 'bg-[#6D282C] border border-[#893338] shadow-[0_4px_20px_rgba(109,40,44,0.4)] hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] active:scale-[0.98]'}`}>
          <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
          <span className={`relative text-lg font-bold tracking-wider ${(!valgusResults.cpak || valgusResults.cpak === '--') ? 'text-gray-500' : 'text-white'}`}>
            GO TO ANALYSIS & RESULTS
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="relative h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          {(!valgusResults.cpak || valgusResults.cpak === '--') ? null : (
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

export default ValgusStressPlannerPage;