import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, Point } from '../types';

const landmarkInstructions = {
  jointLine: ["Mark the center of the medial M joint space.", "Mark the center of the lateral L joint space."],
  femurAnatomicAxis: ["Mark mid femur axis."],
  tibiaAnatomicAxis: ["Mark mid tibia axis."],
};

const LANDMARK_COLORS = {
  jointLine: '#007AFF',
  femurAnatomicAxis: '#34C759',
  tibiaAnatomicAxis: '#FFD60A',
};

const BASE_HANDLE_RADIUS = 6;
const BASE_LINE_WIDTH = 4;

const landmarkToSetMap: Record<string, string> = {
  medialJointSpace: 'jointLine',
  lateralJointSpace: 'jointLine',
  femurAxisPoint: 'femurAnatomicAxis',
  tibiaAxisPoint: 'tibiaAnatomicAxis',
};
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
  axisPt: Point,
  sidePt: Point
) => {
  const thetaAxis = Math.atan2(axisPt.y - centerPt.y, axisPt.x - centerPt.x);

  const thetaSide = Math.atan2(sidePt.y - centerPt.y, sidePt.x - centerPt.x);

  let diff = thetaAxis - thetaSide;

  let deg = diff * (180 / Math.PI);

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
    cut: '6° valgus cut (Native LDFA out of boundary)'
  };
};

const getTibiaClassification = (mpta: number) => {
  if (mpta > 90) return { type: 'Valgoid tibia', cut: '0° (neutral cut)' };
  if (mpta > 88) return { type: 'Neutral tibia', cut: '1° varus cut' };
  if (mpta > 87) return { type: 'Mild varoid tibia', cut: '2° varus cut' };
  if (mpta > 85) return { type: 'Moderate varoid tibia', cut: '3° varus cut' }; // 85 < MPTA ≤ 87°
  if (mpta > 84) return { type: 'Significant varoid tibia', cut: '4° varus cut' }; // 84 < MPTA ≤ 85°
  return {
    type: 'Significant varoid tibia',
    cut: '4° varus cut (Native MPTA out of boundary)'
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
            <div
              className="relative inline-block border-2 border-[#893338] overflow-hidden select-none touch-none"
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

const ValgusStressPlannerPage: React.FC = () => {
  const {
    legSide, setLegSide,
    valgusImageSrc, setValgusImageSrc,
    valgusResults, setValgusResults,
    setValgusCanvasDataUrl, setPage,
    valgusLandmarks, setValgusLandmarks
  } = useAppContext();

  const prevLegSideRef = useRef(legSide);

  const [fileName, setFileName] = useState('No file chosen');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'camera' | null>(null);
  const [visibleLandmarkSets, setVisibleLandmarkSets] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (valgusLandmarks.medialJointSpace || valgusLandmarks.lateralJointSpace) initial.add('jointLine');
    if (valgusLandmarks.femurAxisPoint) initial.add('femurAnatomicAxis');
    if (valgusLandmarks.tibiaAxisPoint) initial.add('tibiaAnatomicAxis');
    return initial;
  });
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
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;
  const lastResizeTimeRef = useRef(0);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialInitialPinchZoomRef = useRef<number>(1);
  const initialPanOffsetRef = useRef({ x: 0, y: 0 });

  const zoomIn = () => setZoom(z => Math.min(z + 0.2, MAX_ZOOM));
  const zoomOut = () => setZoom(z => Math.max(z - 0.2, MIN_ZOOM));
  const resetZoom = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

  const viewerRef = useRef<HTMLDivElement>(null);
  const activeLandmarkRef = useRef<string | null>(null);
  const imageDimensionsRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    localResultsRef.current = valgusResults;
  }, [valgusResults]);



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

  const resetLandmarks = useCallback((width: number, height: number) => {
    // Use natural dimensions if available
    const w = imageRef.current?.naturalWidth || width;
    const h = imageRef.current?.naturalHeight || height;

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

  const getCpakClassification = (obliquity: number, ldfa: number | null, mpta: number | null): string => {
    if (typeof obliquity !== 'number' || isNaN(obliquity)) return '--';

    if (obliquity >= 3) {
      return '2';
    } else if (obliquity >= 1) {
      return '1';
    } else {
      if (ldfa !== null && mpta !== null && Math.round(ldfa) === 90 && Math.round(mpta) === 90) {
        return '5';
      }
      return '4';
    }
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

      if (visibleLandmarkSets.has('jointLine')) {
        const dy = medialPoint.y - lateralPoint.y;
        const dx = medialPoint.x - lateralPoint.x;
        let angleDeg = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
        if (angleDeg > 180) angleDeg = 360 - angleDeg;
        if (angleDeg > 90) angleDeg = 180 - angleDeg;
        newResults.obliquity = angleDeg;
      }
    }

    if (
      visibleLandmarkSets.has('femurAnatomicAxis') &&
      femurAxisPoint &&
      jointCenter &&
      lateralPoint
    ) {
      newResults.ldfa = calculateClinicalAngle(jointCenter, femurAxisPoint, lateralPoint);
    }

    if (
      visibleLandmarkSets.has('tibiaAnatomicAxis') &&
      tibiaAxisPoint &&
      jointCenter &&
      medialPoint
    ) {
      newResults.mpta = calculateClinicalAngle(jointCenter, tibiaAxisPoint, medialPoint);
    }
    if (
      newResults.ldfa !== null &&
      newResults.mpta !== null &&
      newResults.obliquity !== null
    ) {
      const calculatedAhka = newResults.mpta - newResults.ldfa;
      newResults.ahka = calculatedAhka;

      const calculatedJlo = newResults.mpta + newResults.ldfa;
      newResults.jlo = calculatedJlo;

      const femurClass = getFemurClassification(newResults.ldfa);
      newResults.femurType = femurClass.type;
      newResults.cut = femurClass.cut;

      if (newResults.obliquity >= 3) {
        newResults.femurTypeByObliquity = 'Valgoid';
      } else if (newResults.obliquity >= 1) {
        newResults.femurTypeByObliquity = 'Median';
      } else {
        newResults.femurTypeByObliquity = 'Varoid';
      }

      const tibiaClass = getTibiaClassification(newResults.mpta);
      newResults.tibiaType = tibiaClass.type;
      newResults.tibialCut = tibiaClass.cut;

      const cpakType = getCpakClassification(newResults.obliquity ?? 0, newResults.ldfa, newResults.mpta);
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
    const image = imageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas is now screen-space (viewer size). clear it all.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (Object.keys(valgusLandmarks).length === 0) return;

    // Prepare Transform Matrix
    ctx.save();

    // 1. Center
    const dpr = window.devicePixelRatio || 1;
    ctx.translate(canvas.width / (2 * dpr), canvas.height / (2 * dpr));
    // 2. Apply Pan
    ctx.translate(panOffset.x, panOffset.y);
    // 3. Apply Zoom
    ctx.scale(zoom, zoom);
    // 4. Move back by half of IMAGE size (to make 0,0 top-left of image)
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

    ctx.font = `bold ${scaledFontSize}px Inter, sans-serif`;

    const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = valgusLandmarks;

    const drawTextWithBackground = (text: string, x: number, y: number, color: string = '#fdd835') => {
      // Logic inside transform requires scaling back if we want constant size?
      // Actually standard ctx.fillText will scale with the matrix. 
      // If we want constant screen size text, we should inverse scale or use the scaledFontSize we calculated.
      // scaledFontSize is 16/zoom. So it will appear 16px on screen.
      ctx.fillStyle = 'rgba(29, 29, 31, 0.8)';
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      ctx.fillRect(x - textWidth / 2 - 8, y - 20 / (zoom * scaleX), textWidth + 16, 30 / (zoom * scaleX));
      ctx.fillStyle = color;
      ctx.fillText(text, x - textWidth / 2, y);
    };

    const jointCenter = (medialJointSpace && lateralJointSpace)
      ? { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 }
      : null;

    if (visibleLandmarkSets.has('jointLine') && medialJointSpace && lateralJointSpace && jointCenter) {
      ctx.strokeStyle = LANDMARK_COLORS.jointLine;
      ctx.fillStyle = LANDMARK_COLORS.jointLine;
      ctx.lineWidth = scaledLineWidth;
      ctx.beginPath();
      ctx.moveTo(medialJointSpace.x, medialJointSpace.y);
      ctx.lineTo(lateralJointSpace.x, lateralJointSpace.y);
      ctx.stroke();
      [medialJointSpace, lateralJointSpace].forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, scaledRadius, 0, Math.PI * 2); ctx.fill();
      });

      const baseOffset = 20;
      const scaledOffset = baseOffset / (zoom * scaleX);
      const mOffset = medialJointSpace.x < lateralJointSpace.x ? -scaledOffset * 1.5 : scaledOffset;
      const lOffset = lateralJointSpace.x < medialJointSpace.x ? -scaledOffset * 1.5 : scaledOffset;
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
      ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis;
      ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis;
      ctx.lineWidth = scaledLineWidth;
      ctx.beginPath();
      ctx.moveTo(femurAxisPoint.x, femurAxisPoint.y);
      ctx.lineTo(jointCenter.x, jointCenter.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(femurAxisPoint.x, femurAxisPoint.y, scaledRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (visibleLandmarkSets.has('tibiaAnatomicAxis') && tibiaAxisPoint && jointCenter) {
      ctx.strokeStyle = LANDMARK_COLORS.tibiaAnatomicAxis;
      ctx.fillStyle = LANDMARK_COLORS.tibiaAnatomicAxis;
      ctx.lineWidth = scaledLineWidth;
      ctx.beginPath();
      ctx.moveTo(tibiaAxisPoint.x, tibiaAxisPoint.y);
      ctx.lineTo(jointCenter.x, jointCenter.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tibiaAxisPoint.x, tibiaAxisPoint.y, scaledRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

  }, [valgusLandmarks, visibleLandmarkSets, legSide, zoom, panOffset]);

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
      if (now - lastResizeTimeRef.current < 50) return;
      lastResizeTimeRef.current = now;

      const viewer = viewerRef.current;
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!viewer || !canvas || !image) return;

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

      // Store for reset
      imageDimensionsRef.current = { width: displayWidth, height: displayHeight };

      // NO LANDMARK SCALING HERE - Landmarks are now in Natural Coordinates!

      requestAnimationFrame(draw);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [draw]);

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

      // Auto-zoom to joint area when joint line is selected
      if (setName === 'jointLine') {
        const canvas = canvasRef.current;
        if (canvas) {
          setZoom(2.2);
          // Center the joint - joint is roughly at the middle
          setPanOffset({ x: 0, y: -canvas.height * 0.1 });
        }
      }
    }
    setVisibleLandmarkSets(newSets);
  };

  const handleResetAll = () => {
    // Use natural
    if (imageRef.current) {
      resetLandmarks(imageRef.current.naturalWidth, imageRef.current.naturalHeight);
    } else if (imageDimensionsRef.current.width > 0) {
      resetLandmarks(imageDimensionsRef.current.width, imageDimensionsRef.current.height);
    } else if (canvasRef.current) {
      // Fallback (unlikely)
      resetLandmarks(canvasRef.current.width / (window.devicePixelRatio || 1), canvasRef.current.height / (window.devicePixelRatio || 1));
    }
    setVisibleLandmarkSets(new Set()); setActiveInstruction(null);
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

    const imageX = unzoomedX + imgW / 2;
    const imageY = unzoomedY + imgH / 2;

    const scaleX = image.naturalWidth ? imgW / image.naturalWidth : 1;
    const scaleY = image.naturalHeight ? imgH / image.naturalHeight : 1;

    const naturalX = imageX / scaleX;
    const naturalY = imageY / scaleY;

    return { x: naturalX, y: naturalY };
  }, []);

  const handleViewerTap = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    if (!viewerRef.current || !activeLandmarkRef.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getStableCoordinates(clientX, clientY);
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
    const zoomLevel = 2.5;
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
    const pos = getStableCoordinates(e.clientX, e.clientY);

    // Calculate hit radius in Natural Coordinates
    const image = imageRef.current;
    const imgW = parseFloat(image?.style.width || "0");
    const scaleX = (image?.naturalWidth && imgW) ? imgW / image.naturalWidth : 1;

    const scaledHitRadius = (BASE_HANDLE_RADIUS + 24) / (zoom * scaleX);
    const hitRadiusSq = scaledHitRadius ** 2;

    let minDistSq = hitRadiusSq;
    let closestKey: string | null = null;

    for (const key in valgusLandmarks) {
      if (!valgusLandmarks[key]) continue;
      const parentSet = landmarkToSetMap[key];
      if (!parentSet || !visibleLandmarkSets.has(parentSet)) continue;
      const distSq = (valgusLandmarks[key].x - pos.x) ** 2 + (valgusLandmarks[key].y - pos.y) ** 2;
      if (distSq < minDistSq) { minDistSq = distSq; closestKey = key; }
    }

    if (closestKey) {
      draggingPointRef.current = closestKey;
    } else {
      if (zoom > 1) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      }
    }
  };

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
    setValgusLandmarks(prev => ({
      ...prev,
      [draggingPointRef.current!]: pos
    }));
    updatePip(pos);
  }, [setValgusLandmarks, updatePip, getStableCoordinates]);

  const handleMouseUp = useCallback(() => {
    draggingPointRef.current = null;
    isPanningRef.current = false; // Ensure panning stops on mouse up
    // removed captureCanvasState
  }, []);

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
    for (const key in valgusLandmarks) {
      if (!valgusLandmarks[key]) continue;
      const parentSet = landmarkToSetMap[key];
      if (!parentSet || !visibleLandmarkSets.has(parentSet)) continue;
      const distSq = (valgusLandmarks[key].x - pos.x) ** 2 + (valgusLandmarks[key].y - pos.y) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestKey = key;
      }
    }
    if (closestKey) {
      draggingPointRef.current = closestKey;
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
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      if (isPanningRef.current) {
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
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    if (draggingPointRef.current) {
      const pos = getStableCoordinates(touch.clientX, touch.clientY);
      setValgusLandmarks(prev => ({
        ...prev,
        [draggingPointRef.current!]: pos
      }));
      updatePip(pos);
    } else if (isPanningRef.current && zoom > 1) {
      setPanOffset({
        x: touch.clientX - panStartRef.current.x,
        y: touch.clientY - panStartRef.current.y
      });
    }
  }, [setValgusLandmarks, updatePip, getStableCoordinates]);

  const handleTouchEnd = useCallback(() => {
    draggingPointRef.current = null;
    isPanningRef.current = false; // Ensure panning stops on touch end
    initialPinchDistanceRef.current = null; // Reset pinch state
    // removed captureCanvasState
  }, []);

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

  const captureFullResSnapshot = useCallback(() => {
    const image = imageRef.current;
    if (!image) return;

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Image
    ctx.drawImage(image, 0, 0);

    // 2. Draw Landmarks (Natural Coordinates)
    const refScale = Math.max(1, canvas.width / 1000);
    const lineWidth = BASE_LINE_WIDTH * refScale;
    const radius = BASE_HANDLE_RADIUS * refScale;
    const fontSize = Math.max(24, 16 * refScale);

    ctx.font = `bold ${fontSize}px Inter, sans-serif`;

    const { medialJointSpace, lateralJointSpace, femurAxisPoint, tibiaAxisPoint } = valgusLandmarks;

    const jointCenter = (medialJointSpace && lateralJointSpace)
      ? { x: (medialJointSpace.x + lateralJointSpace.x) / 2, y: (medialJointSpace.y + lateralJointSpace.y) / 2 }
      : null;

    if (visibleLandmarkSets.has('jointLine') && medialJointSpace && lateralJointSpace && jointCenter) {
      ctx.strokeStyle = LANDMARK_COLORS.jointLine;
      ctx.fillStyle = LANDMARK_COLORS.jointLine;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(medialJointSpace.x, medialJointSpace.y);
      ctx.lineTo(lateralJointSpace.x, lateralJointSpace.y);
      ctx.stroke();
      [medialJointSpace, lateralJointSpace].forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
      });

      const baseOffset = 20 * refScale;
      // logic for offsets needs to be adapted for scale
      const mOffset = medialJointSpace.x < lateralJointSpace.x ? -baseOffset * 1.5 : baseOffset;
      const lOffset = lateralJointSpace.x < medialJointSpace.x ? -baseOffset * 1.5 : baseOffset;
      const boxWidth = 20 * refScale;
      const boxHeight = 22 * refScale;

      ctx.fillStyle = 'rgba(29, 29, 31, 0.85)';
      ctx.fillRect(medialJointSpace.x + mOffset - (4 * refScale), medialJointSpace.y - (10 * refScale), boxWidth, boxHeight);
      ctx.fillRect(lateralJointSpace.x + lOffset - (4 * refScale), lateralJointSpace.y - (10 * refScale), boxWidth, boxHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.fillText('M', medialJointSpace.x + mOffset, medialJointSpace.y + (6 * refScale));
      ctx.fillText('L', lateralJointSpace.x + lOffset, lateralJointSpace.y + (6 * refScale));
    }

    if (visibleLandmarkSets.has('femurAnatomicAxis') && femurAxisPoint && jointCenter) {
      ctx.strokeStyle = LANDMARK_COLORS.femurAnatomicAxis;
      ctx.fillStyle = LANDMARK_COLORS.femurAnatomicAxis;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(femurAxisPoint.x, femurAxisPoint.y);
      ctx.lineTo(jointCenter.x, jointCenter.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(femurAxisPoint.x, femurAxisPoint.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (visibleLandmarkSets.has('tibiaAnatomicAxis') && tibiaAxisPoint && jointCenter) {
      ctx.strokeStyle = LANDMARK_COLORS.tibiaAnatomicAxis;
      ctx.fillStyle = LANDMARK_COLORS.tibiaAnatomicAxis;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(tibiaAxisPoint.x, tibiaAxisPoint.y);
      ctx.lineTo(jointCenter.x, jointCenter.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tibiaAxisPoint.x, tibiaAxisPoint.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    setValgusCanvasDataUrl(canvas.toDataURL('image/png'));
  }, [valgusLandmarks, visibleLandmarkSets, legSide, setValgusCanvasDataUrl]);

  return (
    <div className="relative flex flex-col h-full gap-4 overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-black px-4 py-1 rounded-full font-bold shadow-lg">
              Drag to pan • Zoom: {(zoom * 100).toFixed(0)}%
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
              {valgusResults.obliquity !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <div className="bg-[#1a1a1a]/90 border border-[#333] px-3 py-1.5 rounded text-white font-bold text-sm">
                    Obliquity: {valgusResults.obliquity.toFixed(1)}°
                  </div>
                </div>
              )}
              <div ref={viewerRef} className="relative w-full h-full overflow-hidden touch-none flex items-center justify-center bg-black">
                <div
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isPanningRef.current || draggingPointRef.current ? 'none' : 'transform 0.1s ease-out'
                  }}
                  className="relative flex items-center justify-center"
                >
                  <img
                    ref={imageRef}
                    src={valgusImageSrc}
                    alt="X-ray"
                    className="block mix-blend-screen max-w-none"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                    onLoad={() => {
                      const image = imageRef.current;
                      if (!image) return;

                      // 1. Calculate how to fit image in viewer (screen space)
                      const viewer = viewerRef.current;
                      if (!viewer) return;

                      const availableWidth = viewer.clientWidth - 32; // - padding
                      const availableHeight = viewer.clientHeight - 32;

                      const aspect = image.naturalWidth / image.naturalHeight;
                      let displayWidth = availableHeight * aspect;
                      let displayHeight = availableHeight;

                      if (displayWidth > availableWidth) {
                        displayWidth = availableWidth;
                        displayHeight = displayWidth / aspect;
                      }

                      image.style.width = `${displayWidth}px`;
                      image.style.height = `${displayHeight}px`;

                      // 2. Initialize / Scale landmarks if needed
                      // Store dimensions
                      imageDimensionsRef.current = { width: displayWidth, height: displayHeight };

                      // Simple initialization if empty
                      if (Object.keys(valgusLandmarks).length === 0) {
                        const isLeft = legSide === 'left';
                        resetLandmarks(displayWidth, displayHeight);
                      }

                      // Trigger draw
                      requestAnimationFrame(draw);
                    }}
                  />
                </div>
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                  style={{ pointerEvents: 'auto' }}
                />

                {/* PIP Viewer */}
                <div ref={pipViewerRef}
                  onMouseDown={handlePipStart}
                  onTouchStart={handlePipStart}
                  className="absolute w-44 h-44 rounded-full border-4 border-cyan-400 bg-black shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-grab touch-none z-50"
                  style={{ top: pipPosition.y, left: pipPosition.x, willChange: 'top, left', transition: 'none' }}>
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
              <MetricItem label="Distal Obliquity Type" value={valgusResults.femurTypeByObliquity ?? '--'} highlight />
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
                const btnColor = LANDMARK_COLORS[key as keyof typeof LANDMARK_COLORS];
                return (
                  <button
                    key={key}
                    onClick={() => toggleLandmarkSet(key as any)}
                    className={`group relative w-full py-3 px-4 text-sm font-semibold rounded-lg border transition-all text-left flex items-center gap-3
                      ${isSelected
                        ? 'bg-[#1a1a1a] border-[#333] text-white shadow-lg'
                        : 'bg-[#252525] border-[#333333] hover:bg-[#333333] hover:border-[#6D282C]/50 text-gray-300'}`}
                  >
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
              <h4 className="text-base font-semibold text-cyan-400 uppercase tracking-wider">Instructions</h4>
            </div>
            {activeInstruction ? (
              <ul className="list-disc list-inside space-y-1 text-base text-gray-300">
                {activeInstruction.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-gray-500">Select a workflow step to begin</p>
            )}
          </section>

        </div>
      </div>

      {/* Footer Action */}
      <div className="flex justify-end px-2 pb-2 relative z-10">
        <button
          onClick={() => {
            captureFullResSnapshot();
            setPage('planner-valgus-stress-results');
          }}
          disabled={!valgusResults.cpak || valgusResults.cpak === '--'}
          className={`group relative py-3 px-8 rounded-sm transition-all duration-300 ease-out flex items-center gap-2
            ${(!valgusResults.cpak || valgusResults.cpak === '--')
              ? 'bg-[#252525] border border-[#333333] text-gray-500 cursor-not-allowed'
              : 'bg-[#6D282C] border border-[#893338] shadow-[0_4px_20px_rgba(109,40,44,0.4)] hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)] active:scale-[0.98]'}`}>
          <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
          <span className={`relative text-sm font-bold tracking-wider ${(!valgusResults.cpak || valgusResults.cpak === '--') ? 'text-gray-500' : 'text-white'}`}>
            GO TO ANALYSIS
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