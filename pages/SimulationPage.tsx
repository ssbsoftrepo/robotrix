
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Landmarks, Point } from '../types';

// --- Helper Functions ---
const angleBetweenVectors = (v1: Point, v2: Point) => {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    if (mag1 === 0 || mag2 === 0) return 0;
    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosTheta) * (180 / Math.PI);
};

// Component to display the original X-ray with only HKA line
const HKAView: React.FC = () => {
    const { longLegImageSrc, longLegLandmarks, longLegCanvasDataUrl } = useAppContext();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!longLegImageSrc || !canvasRef.current || !longLegCanvasDataUrl) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const xrayImg = new Image();
        xrayImg.crossOrigin = "anonymous";
        xrayImg.src = longLegImageSrc;

        xrayImg.onload = () => {
            const refImg = new Image();
            refImg.src = longLegCanvasDataUrl;
            refImg.onload = () => {
                const parent = canvas.parentElement;
                if (!parent) return;

                const width = parent.clientWidth;
                const height = parent.clientHeight;
                const aspect = xrayImg.naturalWidth / xrayImg.naturalHeight;

                let drawWidth = width;
                let drawHeight = width / aspect;

                if (drawHeight > height) {
                    drawHeight = height;
                    drawWidth = height * aspect;
                }

                canvas.width = drawWidth;
                canvas.height = drawHeight;

                ctx.drawImage(xrayImg, 0, 0, drawWidth, drawHeight);

                const scale = drawWidth / refImg.width;

                const { hipCenter, kneeCenter, ankleCenter } = longLegLandmarks;
                if (hipCenter && kneeCenter && ankleCenter) {
                    ctx.strokeStyle = '#ff8fa3';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(hipCenter.x * scale, hipCenter.y * scale);
                    ctx.lineTo(kneeCenter.x * scale, kneeCenter.y * scale);
                    ctx.lineTo(ankleCenter.x * scale, ankleCenter.y * scale);
                    ctx.stroke();

                    [hipCenter, kneeCenter, ankleCenter].forEach(p => {
                        ctx.beginPath();
                        ctx.arc(p.x * scale, p.y * scale, 4, 0, Math.PI * 2);
                        ctx.fillStyle = '#ff8fa3';
                        ctx.fill();
                    });
                }
            };
        };
    }, [longLegImageSrc, longLegLandmarks, longLegCanvasDataUrl]);

    if (!longLegImageSrc) return null;

    return (
        <div className="relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg flex flex-col items-center h-full min-h-0 overflow-hidden">
            <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
            <h3 className="text-gray-400 font-semibold mb-1 text-base relative z-10 shrink-0">Pre-Op Alignment</h3>
            <div className="w-full flex-grow flex items-center justify-center bg-black rounded overflow-hidden relative z-10 min-h-0">
                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
            </div>
        </div>
    );
};

const SimulationPage: React.FC = () => {
    const {
        longLegImageSrc,
        longLegLandmarks,
        longLegCanvasDataUrl,
        setSimAfterImage,
        legSide,
        setPage,
        longLegResults,
        femurBoundary,
        tibiaBoundary,
        femoralCutSim, setFemoralCutSim,
        tibialCutSim, setTibialCutSim,
        appliedFemoralCutSim, setAppliedFemoralCutSim,
        appliedTibialCutSim, setAppliedTibialCutSim
    } = useAppContext();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const originalScaledLandmarksRef = useRef<Landmarks>({});

    const [isLoaded, setIsLoaded] = useState(false);

    const [isSplitView, setIsSplitView] = useState(true);
    const [centerlineX, setCenterlineX] = useState(300);
    const [isDraggingCenterline, setIsDraggingCenterline] = useState(false);

    const getBoundaryAdjustedValues = useCallback(() => {
        let displayFemoralCutStr = longLegResults.cut;
        if (femurBoundary === 'basic') {
            if (longLegResults.cut === '2° valgus cut') displayFemoralCutStr = '3° valgus cut';
            else if (longLegResults.cut === '6° valgus cut') displayFemoralCutStr = '5° valgus cut';
        }

        const mpta = longLegResults.mpta;
        let tibialVarusCut = 0;
        if (mpta !== null) {
            if (mpta <= 85) tibialVarusCut = 4;
            else if (mpta <= 87) tibialVarusCut = 3;
            else if (mpta <= 88) tibialVarusCut = 2;
            else if (mpta <= 90) tibialVarusCut = 1;
            // > 90 implies 0 (neutral) which is default initialized
        }
        if (tibiaBoundary === 'basic' && tibialVarusCut > 2) {
            tibialVarusCut = 2;
        }

        const initialFemoral = displayFemoralCutStr ? parseFloat(displayFemoralCutStr) : 3;
        const initialTibial = tibialVarusCut;
        return { initialFemoral, initialTibial };
    }, [longLegResults, femurBoundary, tibiaBoundary]);

    useEffect(() => {
        const { initialFemoral, initialTibial } = getBoundaryAdjustedValues();

        if (femoralCutSim === null) setFemoralCutSim(initialFemoral);
        if (tibialCutSim === null) setTibialCutSim(initialTibial);
        if (appliedFemoralCutSim === null) setAppliedFemoralCutSim(0);
        if (appliedTibialCutSim === null) setAppliedTibialCutSim(0);

    }, [longLegResults, femurBoundary, tibiaBoundary, femoralCutSim, tibialCutSim, appliedFemoralCutSim, appliedTibialCutSim, setFemoralCutSim, setTibialCutSim, setAppliedFemoralCutSim, setAppliedTibialCutSim, getBoundaryAdjustedValues]);


    const resetSimulation = useCallback(() => {
        const { initialFemoral, initialTibial } = getBoundaryAdjustedValues();
        setFemoralCutSim(initialFemoral);
        setTibialCutSim(initialTibial);
        setAppliedFemoralCutSim(0);
        setAppliedTibialCutSim(0);
        if (canvasRef.current) {
            setCenterlineX(canvasRef.current.width / 2);
        }
    }, [getBoundaryAdjustedValues, setFemoralCutSim, setTibialCutSim, setAppliedFemoralCutSim, setAppliedTibialCutSim]);

    const postOpMHKA = useMemo(() => {
        if (!isLoaded || Object.keys(originalScaledLandmarksRef.current).length === 0) return null;

        const originalLandmarks = originalScaledLandmarksRef.current;
        const { hipCenter: originalHip, kneeCenter: originalKnee, ankleCenter: originalAnkle } = originalLandmarks;
        if (!originalHip || !originalKnee || !originalAnkle) return null;

        const lateralDirection = legSide === 'left' ? 1 : -1;
        const femoralRad = (appliedFemoralCutSim ?? 0) * (Math.PI / 180);
        const dxFemoral = Math.abs(originalKnee.y - originalHip.y) * Math.tan(femoralRad);
        const tibialRad = (appliedTibialCutSim ?? 0) * (Math.PI / 180);
        const dxTibial = Math.abs(originalAnkle.y - originalKnee.y) * Math.tan(tibialRad);
        const totalDx = (-dxFemoral - dxTibial) * lateralDirection;
        const newKnee = { x: originalKnee.x + totalDx, y: originalKnee.y };

        const femurVec = { x: originalHip.x - newKnee.x, y: originalHip.y - newKnee.y };
        const tibiaVec = { x: originalAnkle.x - newKnee.x, y: originalAnkle.y - newKnee.y };
        return 180 - angleBetweenVectors(femurVec, tibiaVec);

    }, [isLoaded, appliedFemoralCutSim, appliedTibialCutSim, legSide]);


    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const offscreenCanvas = offscreenCanvasRef.current;
        if (!canvas || !offscreenCanvas || !isLoaded || Object.keys(originalScaledLandmarksRef.current).length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const originalLandmarks = originalScaledLandmarksRef.current;
        const { hipCenter: originalHip, kneeCenter: originalKnee, ankleCenter: originalAnkle } = originalLandmarks;
        const lateralDirection = legSide === 'left' ? 1 : -1;
        const femoralRad = (appliedFemoralCutSim ?? 0) * (Math.PI / 180);
        const dxFemoral = Math.abs(originalKnee.y - originalHip.y) * Math.tan(femoralRad);
        const tibialRad = (appliedTibialCutSim ?? 0) * (Math.PI / 180);
        const dxTibial = Math.abs(originalAnkle.y - originalKnee.y) * Math.tan(tibialRad);
        const totalDx = (-dxFemoral - dxTibial) * lateralDirection;
        const newKnee = { x: originalKnee.x + totalDx, y: originalKnee.y };

        const warpedCanvas = document.createElement('canvas');
        warpedCanvas.width = canvas.width;
        warpedCanvas.height = canvas.height;
        const warpedCtx = warpedCanvas.getContext('2d');
        if (!warpedCtx) return;

        const allX = Object.values(originalLandmarks).map((p: Point) => p.x);
        const padding = 75;
        const legMinX = Math.max(0, Math.min(...allX) - padding);
        const legMaxX = Math.min(canvas.width, Math.max(...allX) + padding);
        const legWidth = legMaxX - legMinX;

        warpedCtx.drawImage(offscreenCanvas, 0, 0, legMinX, canvas.height, 0, 0, legMinX, canvas.height);
        warpedCtx.drawImage(offscreenCanvas, legMaxX, 0, canvas.width - legMaxX, canvas.height, legMaxX, 0, canvas.width - legMaxX, canvas.height);
        warpedCtx.drawImage(offscreenCanvas, legMinX, 0, legWidth, originalHip.y, legMinX, 0, legWidth, originalHip.y);
        warpedCtx.drawImage(offscreenCanvas, legMinX, originalAnkle.y, legWidth, canvas.height - originalAnkle.y, legMinX, originalAnkle.y, legWidth, canvas.height - originalAnkle.y);

        for (let y = Math.floor(originalHip.y); y < Math.floor(originalKnee.y); y++) {
            const t = (y - originalHip.y) / (originalKnee.y - originalHip.y);
            const shiftX = (newKnee.x - originalKnee.x) * t;
            warpedCtx.drawImage(offscreenCanvas, legMinX, y, legWidth, 1, legMinX + shiftX, y, legWidth, 1);
        }
        for (let y = Math.floor(originalKnee.y); y < Math.floor(originalAnkle.y); y++) {
            const t = 1 - ((y - originalKnee.y) / (originalAnkle.y - originalKnee.y));
            const shiftX = (newKnee.x - originalKnee.x) * t;
            warpedCtx.drawImage(offscreenCanvas, legMinX, y, legWidth, 1, legMinX + shiftX, y, legWidth, 1);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const operatedSide: 'left' | 'right' = legSide === 'left' ? 'right' : 'left';

        if (isSplitView) {
            if (operatedSide === 'right') {
                ctx.drawImage(offscreenCanvas, 0, 0, centerlineX, canvas.height, 0, 0, centerlineX, canvas.height);
                ctx.drawImage(warpedCanvas, centerlineX, 0, canvas.width - centerlineX, canvas.height, centerlineX, 0, canvas.width - centerlineX, canvas.height);
            } else {
                ctx.drawImage(warpedCanvas, 0, 0, centerlineX, canvas.height, 0, 0, centerlineX, canvas.height);
                ctx.drawImage(offscreenCanvas, centerlineX, 0, canvas.width - centerlineX, canvas.height, centerlineX, 0, canvas.width - centerlineX, canvas.height);
            }
        } else {
            ctx.drawImage(warpedCanvas, 0, 0);
        }

        const drawOverlay = (context: CanvasRenderingContext2D) => {
            context.strokeStyle = 'rgba(255, 143, 163, 0.9)';
            context.fillStyle = 'rgba(255, 143, 163, 0.9)';
            context.lineWidth = 3;
            context.beginPath();
            context.moveTo(originalHip.x, originalHip.y);
            context.lineTo(newKnee.x, newKnee.y);
            context.lineTo(originalAnkle.x, originalAnkle.y);
            context.stroke();
            [originalHip, newKnee, originalAnkle].forEach(p => {
                context.beginPath(); context.arc(p.x, p.y, 6, 0, Math.PI * 2); context.fill();
            });

            context.font = 'bold 24px Roboto, sans-serif';
        };

        if (isSplitView) {
            ctx.save();
            if (operatedSide === 'right') ctx.rect(centerlineX, 0, canvas.width - centerlineX, canvas.height);
            else ctx.rect(0, 0, centerlineX, canvas.height);
            ctx.clip();
            drawOverlay(ctx);
            ctx.restore();
        } else {
            drawOverlay(ctx);
        }

        if (isSplitView) {
            ctx.strokeStyle = 'rgba(109, 40, 44, 0.9)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(centerlineX, 0);
            ctx.lineTo(centerlineX, canvas.height);
            ctx.stroke();
        }

        setSimAfterImage(canvas.toDataURL('image/png'));

    }, [appliedFemoralCutSim, appliedTibialCutSim, legSide, isLoaded, centerlineX, isSplitView, setSimAfterImage, postOpMHKA]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !longLegImageSrc) { setIsLoaded(false); return; }

        const mainImage = new Image();
        mainImage.crossOrigin = "anonymous";
        mainImage.src = longLegImageSrc;
        setIsLoaded(false);

        mainImage.onload = () => {
            const container = canvas.parentElement;
            if (!container) return;
            const ar = mainImage.naturalWidth / mainImage.naturalHeight;
            let newWidth = container.clientWidth;
            let newHeight = newWidth / ar;

            const maxHeight = container.clientHeight;
            if (newHeight > maxHeight) {
                newHeight = maxHeight; newWidth = newHeight * ar;
            }
            canvas.width = newWidth;
            canvas.height = newHeight;
            setCenterlineX(newWidth / 2);

            const offscreen = document.createElement('canvas');
            offscreen.width = newWidth;
            offscreen.height = newHeight;
            offscreen.getContext('2d')?.drawImage(mainImage, 0, 0, newWidth, newHeight);
            offscreenCanvasRef.current = offscreen;

            const getScaledLandmarks = (plannerCanvas: HTMLImageElement) => {
                const plannerCanvasWidth = plannerCanvas.width;
                const scale = newWidth / plannerCanvasWidth;
                const scaledLandmarks: Landmarks = {};
                for (const key in longLegLandmarks) {
                    scaledLandmarks[key] = {
                        x: longLegLandmarks[key].x * scale,
                        y: longLegLandmarks[key].y * scale,
                    };
                }
                return scaledLandmarks;
            };

            if (longLegCanvasDataUrl && Object.keys(longLegLandmarks).length > 0) {
                const plannerCanvasImage = new Image();
                plannerCanvasImage.src = longLegCanvasDataUrl;
                plannerCanvasImage.onload = () => {
                    originalScaledLandmarksRef.current = getScaledLandmarks(plannerCanvasImage);
                    setIsLoaded(true);
                };
            } else {
                originalScaledLandmarksRef.current = { ...longLegLandmarks };
                setIsLoaded(true);
            }
        };
    }, [longLegImageSrc, longLegCanvasDataUrl, longLegLandmarks]);

    useEffect(() => {
        if (isLoaded) {
            draw();
        }
    }, [isLoaded, draw]);

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (isSplitView && Math.abs(x - centerlineX) < 10) {
            setIsDraggingCenterline(true);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDraggingCenterline) {
            e.currentTarget.style.cursor = 'ew-resize';
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (isSplitView && Math.abs(x - centerlineX) < 10) {
            e.currentTarget.style.cursor = 'ew-resize';
        } else {
            e.currentTarget.style.cursor = 'default';
        }
    };

    const handleWindowMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingCenterline) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const newX = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
            setCenterlineX(newX);
        }
    }, [isDraggingCenterline]);

    const handleWindowMouseUp = useCallback(() => {
        if (isDraggingCenterline) {
            setIsDraggingCenterline(false);
        }
    }, [isDraggingCenterline]);


    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;

        if (isSplitView && Math.abs(x - centerlineX) < 20) {
            setIsDraggingCenterline(true);
        }
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDraggingCenterline) return;
        e.preventDefault();

        const touch = e.touches[0];
        if (!touch) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const newX = Math.max(20, Math.min(e.touches[0].clientX - rect.left, canvas.width - 20));
        setCenterlineX(newX);
    }, [isDraggingCenterline]);

    const handleTouchEnd = useCallback(() => {
        setIsDraggingCenterline(false);
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);

            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleWindowMouseMove, handleWindowMouseUp, handleTouchMove, handleTouchEnd]);

    const { initialFemoral, initialTibial } = getBoundaryAdjustedValues();

    return (
        <div className="relative flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212]">
            {/* Cinematic Lighting */}
            <div className="fixed top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex justify-between items-center no-print px-2 py-1 relative z-10">
                <h2 className="text-3xl font-bold text-[#E0E0E0]">PRE – OP Resection Simulation</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-grow min-h-0 px-2 mb-2 relative z-10 overflow-hidden">
                {/* Column 1: Pre-Op HKA View - 25% */}
                <div className="lg:col-span-1 hidden lg:flex flex-col min-h-0 max-h-full overflow-hidden">
                    <HKAView />
                </div>

                {/* Column 2: Controls - 25% */}
                <div className="lg:col-span-1 relative bg-[#1a1a1a] border border-[#333333] p-2 rounded-lg space-y-2 flex flex-col min-h-0 max-h-full overflow-y-auto">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    <div className="flex items-center justify-between relative z-10">
                        <label htmlFor="split-view-toggle" className="text-sm font-semibold text-gray-400">Split View</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="split-view-toggle" className="sr-only peer" checked={isSplitView} onChange={() => setIsSplitView(!isSplitView)} />
                            <div className="w-10 h-5 bg-[#333333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D282C]"></div>
                        </label>
                    </div>
                    <div className="bg-black/40 p-2 rounded-md text-center border border-[#333333] relative z-10">
                        <p className="text-xs text-gray-400">Pre-Op mHKA</p>
                        <p className="font-bold text-xl text-gray-100">{longLegResults.mhka?.toFixed(1) ?? '--'}°</p>
                    </div>
                    <div className="relative z-10">
                        <label className="block text-xs font-semibold mb-1 text-gray-400">Femoral Valgus Cut</label>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => setFemoralCutSim((femoralCutSim ?? initialFemoral) - 0.5)} className="bg-[#252525] hover:bg-[#333333] border border-[#444444] text-white font-bold w-10 h-10 text-xl rounded-md transition">-</button>
                            <input type="number" step="0.5" value={femoralCutSim ?? ''} onChange={e => setFemoralCutSim(parseFloat(e.target.value))} className="w-full p-1 rounded-md text-center text-lg font-bold bg-[#2A2B2C] border border-[#333333] text-gray-200 focus:outline-none focus:border-[#6D282C]" />
                            <button onClick={() => setFemoralCutSim((femoralCutSim ?? initialFemoral) + 0.5)} className="bg-[#252525] hover:bg-[#333333] border border-[#444444] text-white font-bold w-10 h-10 text-xl rounded-md transition">+</button>
                        </div>
                        <button onClick={() => setAppliedFemoralCutSim(femoralCutSim)} className="bg-[#6D282C] hover:bg-[#893338] text-white font-bold py-1.5 px-3 rounded-lg w-full text-sm mt-1.5 transition">Apply Femoral Cut</button>
                    </div>
                    <div className="relative z-10">
                        <label className="block text-xs font-semibold mb-1 text-gray-400">Tibial Varus Cut</label>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => setTibialCutSim((tibialCutSim ?? initialTibial) - 0.5)} className="bg-[#252525] hover:bg-[#333333] border border-[#444444] text-white font-bold w-10 h-10 text-xl rounded-md transition">-</button>
                            <input type="number" step="0.5" value={tibialCutSim ?? ''} onChange={e => setTibialCutSim(parseFloat(e.target.value))} className="w-full p-1 rounded-md text-center text-lg font-bold bg-[#2A2B2C] border border-[#333333] text-gray-200 focus:outline-none focus:border-[#6D282C]" />
                            <button onClick={() => setTibialCutSim((tibialCutSim ?? initialTibial) + 0.5)} className="bg-[#252525] hover:bg-[#333333] border border-[#444444] text-white font-bold w-10 h-10 text-xl rounded-md transition">+</button>
                        </div>
                        <button onClick={() => setAppliedTibialCutSim(tibialCutSim)} className="bg-[#6D282C] hover:bg-[#893338] text-white font-bold py-1.5 px-3 rounded-lg w-full text-sm mt-1.5 transition">Apply Tibial Cut</button>
                    </div>
                    <div className="bg-[#6D282C]/20 border-2 border-[#6D282C] p-2 rounded-md text-center relative z-10">
                        <p className="text-sm text-[#ff8fa3]">Post-Simulation mHKA</p>
                        <p className="font-bold text-2xl text-[#ff8fa3]">{postOpMHKA?.toFixed(1) ?? '--'}°</p>
                    </div>
                    <div className="flex-grow"></div>
                    <div className="relative z-10">
                        <button onClick={resetSimulation} className="w-full bg-[#333333] hover:bg-[#444444] text-gray-200 font-bold py-1.5 px-3 rounded-lg transition text-sm">Reset Simulation</button>
                    </div>
                </div>

                {/* Simulation View - 50% */}
                <div className="lg:col-span-2 relative bg-[#1a1a1a] border border-[#333333] p-1 rounded-lg flex items-center justify-center bg-black min-h-0 max-h-full overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />
                    {!isLoaded && !longLegImageSrc && <p className="text-gray-500 p-4 text-center relative z-10">Load a Long Leg X-ray in the planner to begin simulation.</p>}
                    {!isLoaded && longLegImageSrc && <p className="text-gray-400 relative z-10">Loading Simulation...</p>}
                    <canvas
                        ref={canvasRef}
                        className={`transition-opacity duration-300 relative z-10 ${!isLoaded ? 'opacity-0' : 'opacity-100'}`}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseLeave={() => canvasRef.current ? canvasRef.current.style.cursor = 'default' : null}
                        onTouchStart={handleTouchStart}
                        onTouchMove={(e) => e.preventDefault()}
                        style={{ touchAction: 'none' }}
                    />
                </div>
            </div>
            <div className="mt-1 flex justify-between px-2 pb-2 relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => setPage('results-analysis')}
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
                        BACK
                    </span>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-gray-600 transition-colors group-hover:border-[#6D282C]/50" />
                </button>

                {/* View Report Button */}
                <button
                    onClick={() => setPage('pre-op-report')}
                    className="group relative py-2 px-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                               active:scale-[0.98] flex items-center"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative flex items-center gap-2 text-sm font-bold text-white tracking-widest">
                        VIEW PRE-OP REPORT
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>
            </div>
        </div>
    );
};

export default SimulationPage;
