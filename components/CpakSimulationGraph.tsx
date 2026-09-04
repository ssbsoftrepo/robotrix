import React from 'react';

interface CpakSimulationGraphProps {
    mpta: number | null;
    ldfa: number | null;
    ama: number | null;
    femoralCut: number;
    tibialCut: number;
    className?: string;
}

export const CpakSimulationGraph: React.FC<CpakSimulationGraphProps> = ({
    mpta,
    ldfa,
    ama,
    femoralCut,
    tibialCut,
    className = ''
}) => {
    // Coordinate definitions:
    // Native point:
    // X = MPTA - LDFA
    // Y = 180 - (MPTA + LDFA)
    const hasNative = mpta !== null && ldfa !== null;
    const rawNativeX = hasNative ? (mpta! - ldfa!) : null;
    const rawNativeY = hasNative ? (180 - (mpta! + ldfa!)) : null;

    // Native off-scale check (graph displays ±9°)
    const isNativeOffScale = rawNativeX !== null && rawNativeY !== null && (
        Math.abs(rawNativeX) > 9 || Math.abs(rawNativeY) > 9
    );
    const nativeX = rawNativeX !== null ? Math.max(-8.5, Math.min(8.5, rawNativeX)) : null;
    const nativeY = rawNativeY !== null ? Math.max(-8.5, Math.min(8.5, rawNativeY)) : null;

    // Predicted point:
    // X = femur cut - tibia cut - AMA
    // Y = femur cut + tibia cut - AMA
    const amaVal = ama ?? 0;
    const rawPredX = femoralCut - tibialCut - amaVal;
    const rawPredY = femoralCut + tibialCut - amaVal;

    const isPredOffScale = Math.abs(rawPredX) > 9 || Math.abs(rawPredY) > 9;
    const predX = Math.max(-8.5, Math.min(8.5, rawPredX));
    const predY = Math.max(-8.5, Math.min(8.5, rawPredY));

    // SVG Layout: 400 x 404 (Ultra-compact, maximum space utilization)
    // Grid: width = 320, height = 320 (takes 80% of SVG!)
    // X from 52 to 372
    // Y from 56 to 376
    // Origin (0,0) is at (212, 216)
    const originX = 212;
    const originY = 216;
    const scale = 320 / 18; // 17.7778 px per degree

    const toSvgX = (val: number) => originX + val * scale;
    const toSvgY = (val: number) => originY - val * scale; // Y inverted in SVG

    const nativeSvg = nativeX !== null && nativeY !== null ? { x: toSvgX(nativeX), y: toSvgY(nativeY) } : null;
    const predSvg = { x: toSvgX(predX), y: toSvgY(predY) };

    // Maroon Zone (Safe Zone / Target Window: X from -4 to 4, Y from -5 to 5)
    const maroonX = toSvgX(-4);
    const maroonY = toSvgY(5);
    const maroonWidth = 8 * scale;
    const maroonHeight = 10 * scale;

    // Prominent grid line coordinates:
    // X at -2° and +2°
    const darkXNeg2 = toSvgX(-2);
    const darkXPos2 = toSvgX(2);
    // Y at -3° and +3°
    const darkYPos3 = toSvgY(3);
    const darkYNeg3 = toSvgY(-3);

    // Major ticks at every 3°
    const majorTicks = [-9, -6, -3, 0, 3, 6, 9];

    // Minor 1° step lines (-9 to 9)
    const minorLines = Array.from({ length: 19 }, (_, i) => i - 9);

    return (
        <div className={`relative bg-black rounded-xl p-1 flex items-center justify-center select-none shadow-xl max-w-full max-h-full aspect-[400/404] ${className}`}>
            <svg
                viewBox="0 0 400 404"
                className="w-full h-full drop-shadow-2xl pointer-events-none"
                style={{
                    overflow: 'visible'
                }}
            >
                {/* Background grid container */}
                <rect x="52" y="56" width="320" height="320" fill="#08080a" />

                {/* Title */}
                <text x={originX} y="15" textAnchor="middle" fill="#ffffff" fontSize="13.5" fontWeight="700" letterSpacing="0.3">
                    Limb Alignment (aHKA)
                </text>

                {/* Left Y-Axis Label */}
                <text
                    transform={`rotate(-90 12 ${originY})`}
                    x="12"
                    y={originY}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="12.5"
                    fontWeight="700"
                    letterSpacing="0.3"
                >
                    Joint Line Obliquity
                </text>

                {/* ========================================================================= */}
                {/* TOP 3 ANATOMICAL LEG DIAGRAMS (Varus, Neutral, Valgus)                   */}
                {/* ========================================================================= */}
                {/* 1. Varus (X = -6) */}
                <g transform={`translate(${toSvgX(-6)}, 35)`} id="top-varus-icon">
                    <polygon points="-7,-10 7,-10 4,-5 -4,-5" fill="#d0d0d8" />
                    <polyline points="-4,-5 -10,3 -6,14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <polyline points="4,-5 10,3 6,14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>

                {/* 2. Neutral (X = 0) */}
                <g transform={`translate(${originX}, 35)`} id="top-neutral-icon">
                    <polygon points="-7,-10 7,-10 4,-5 -4,-5" fill="#d0d0d8" />
                    <line x1="-4" y1="-5" x2="-4" y2="14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="4" y1="-5" x2="4" y2="14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                </g>

                {/* 3. Valgus (X = +6) */}
                <g transform={`translate(${toSvgX(6)}, 35)`} id="top-valgus-icon">
                    <polygon points="-7,-10 7,-10 4,-5 -4,-5" fill="#d0d0d8" />
                    <polyline points="-4,-5 -1,3 -6,14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <polyline points="4,-5 1,3 6,14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>

                {/* ========================================================================= */}
                {/* LEFT 3 ANATOMICAL JOINT LINE DIAGRAMS (Apex Distal, Neutral, Proximal)    */}
                {/* ========================================================================= */}
                {/* 4. Apex Distal (Y = +6) */}
                <g transform={`translate(32, ${toSvgY(6)})`} id="left-apex-distal-icon">
                    <polygon points="-7,-10 7,-10 4,-5 -4,-5" fill="#d0d0d8" />
                    <line x1="-4" y1="-5" x2="-4" y2="14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="4" y1="-5" x2="4" y2="14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="-9" y1="1" x2="-1" y2="5" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="9" y1="1" x2="1" y2="5" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                </g>

                {/* 5. Neutral JLO (Y = 0) */}
                <g transform={`translate(32, ${originY})`} id="left-neutral-jlo-icon">
                    <polygon points="-7,-10 7,-10 4,-5 -4,-5" fill="#d0d0d8" />
                    <line x1="-4" y1="-5" x2="-4" y2="14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="4" y1="-5" x2="4" y2="14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="-9" y1="3" x2="-1" y2="3" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="1" y1="3" x2="9" y2="3" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                </g>

                {/* 6. Apex Proximal (Y = -6) */}
                <g transform={`translate(32, ${toSvgY(-6)})`} id="left-apex-proximal-icon">
                    <polygon points="-7,-10 7,-10 4,-5 -4,-5" fill="#d0d0d8" />
                    <line x1="-4" y1="-5" x2="-4" y2="14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="4" y1="-5" x2="4" y2="14" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="-9" y1="6" x2="-1" y2="2" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="9" y1="6" x2="1" y2="2" stroke="#d0d0d8" strokeWidth="2.2" strokeLinecap="round" />
                </g>

                {/* ========================================================================= */}
                {/* 1° MINOR MESH GRID LINES                                                  */}
                {/* ========================================================================= */}
                {minorLines.map(deg => (
                    <React.Fragment key={`minor-${deg}`}>
                        <line
                            x1={toSvgX(deg)}
                            y1="56"
                            x2={toSvgX(deg)}
                            y2="376"
                            stroke="#131318"
                            strokeWidth="0.8"
                        />
                        <line
                            x1="52"
                            y1={toSvgY(deg)}
                            x2="372"
                            y2={toSvgY(deg)}
                            stroke="#131318"
                            strokeWidth="0.8"
                        />
                    </React.Fragment>
                ))}

                {/* ========================================================================= */}
                {/* 3° MAJOR GRID LINES                                                       */}
                {/* ========================================================================= */}
                {majorTicks.map(deg => (
                    <React.Fragment key={`major-${deg}`}>
                        <line
                            x1={toSvgX(deg)}
                            y1="56"
                            x2={toSvgX(deg)}
                            y2="376"
                            stroke={deg === 0 ? '#383842' : '#222228'}
                            strokeWidth={deg === 0 ? 1.4 : 1}
                        />
                        <line
                            x1="52"
                            y1={toSvgY(deg)}
                            x2="372"
                            y2={toSvgY(deg)}
                            stroke={deg === 0 ? '#383842' : '#222228'}
                            strokeWidth={deg === 0 ? 1.4 : 1}
                        />
                    </React.Fragment>
                ))}

                {/* ========================================================================= */}
                {/* MAROON TARGET ZONE (X: -4° to +4°, Y: -5° to +5°)                          */}
                {/* ========================================================================= */}
                <rect
                    x={maroonX}
                    y={maroonY}
                    width={maroonWidth}
                    height={maroonHeight}
                    fill="rgba(140, 42, 60, 0.28)"
                    stroke="rgba(235, 110, 135, 0.65)"
                    strokeWidth="1.4"
                    rx="4"
                />

                {/* ========================================================================= */}
                {/* DARK PROMINENT BOUNDARY LINES:                                           */}
                {/* - X axis at -2° and +2°                                                  */}
                {/* - Y axis at -3° and +3°                                                  */}
                {/* ========================================================================= */}
                <line x1={darkXNeg2} y1="56" x2={darkXNeg2} y2="376" stroke="#484852" strokeWidth="1.5" />
                <line x1={darkXPos2} y1="56" x2={darkXPos2} y2="376" stroke="#484852" strokeWidth="1.5" />
                <line x1="52" y1={darkYPos3} x2="372" y2={darkYPos3} stroke="#484852" strokeWidth="1.5" />
                <line x1="52" y1={darkYNeg3} x2="372" y2={darkYNeg3} stroke="#484852" strokeWidth="1.5" />

                {/* ========================================================================= */}
                {/* CENTER CROSSHAIR '+' at (originX, originY)                               */}
                {/* ========================================================================= */}
                <g stroke="#ffffff" strokeWidth="1.8" opacity="0.85">
                    <line x1={originX - 7} y1={originY} x2={originX + 7} y2={originY} />
                    <line x1={originX} y1={originY - 7} x2={originX} y2={originY + 7} />
                </g>

                {/* ========================================================================= */}
                {/* ROMAN NUMERALS FOR 9 CPAK QUADRANTS                                      */}
                {/* ========================================================================= */}
                <g fontSize="13" fontWeight="700" fill="rgba(255, 255, 255, 0.18)" textAnchor="middle">
                    {/* Row 1: Apex Distal (Y > 3) */}
                    <text x={toSvgX(-6)} y={toSvgY(6) + 4}>I</text>
                    <text x={toSvgX(0)} y={toSvgY(6) + 4}>II</text>
                    <text x={toSvgX(6)} y={toSvgY(6) + 4}>III</text>

                    {/* Row 2: Neutral JLO (-3 <= Y <= 3) */}
                    <text x={toSvgX(-6)} y={toSvgY(0) + 4}>IV</text>
                    <text x={toSvgX(6)} y={toSvgY(0) + 4}>VI</text>

                    {/* Row 3: Apex Proximal (Y < -3) */}
                    <text x={toSvgX(-6)} y={toSvgY(-6) + 4}>VII</text>
                    <text x={toSvgX(0)} y={toSvgY(-6) + 4}>VIII</text>
                    <text x={toSvgX(6)} y={toSvgY(-6) + 4}>IX</text>
                </g>

                {/* ========================================================================= */}
                {/* X-AXIS LABELS (Bottom): 9°, 6°, 3°, 0°, 3°, 6°, 9°                       */}
                {/* ========================================================================= */}
                <g fontSize="10.5" fontWeight="600" fill="#888892" textAnchor="middle">
                    <text x={toSvgX(-9)} y="392">9°</text>
                    <text x={toSvgX(-6)} y="392">6°</text>
                    <text x={toSvgX(-3)} y="392">3°</text>
                    <text x={toSvgX(0)} y="392">0°</text>
                    <text x={toSvgX(3)} y="392">3°</text>
                    <text x={toSvgX(6)} y="392">6°</text>
                    <text x={toSvgX(9)} y="392">9°</text>
                </g>

                {/* ========================================================================= */}
                {/* Y-AXIS LABELS (Right): 9°, 6°, 3°, 0°, 3°, 6°, 9°                        */}
                {/* ========================================================================= */}
                <g fontSize="10.5" fontWeight="600" fill="#888892" textAnchor="start">
                    <text x="378" y={toSvgY(9) + 4}>9°</text>
                    <text x="378" y={toSvgY(6) + 4}>6°</text>
                    <text x="378" y={toSvgY(3) + 4}>3°</text>
                    <text x="378" y={toSvgY(0) + 4}>0°</text>
                    <text x="378" y={toSvgY(-3) + 4}>3°</text>
                    <text x="378" y={toSvgY(-6) + 4}>6°</text>
                    <text x="378" y={toSvgY(-9) + 4}>9°</text>
                </g>

                {/* ========================================================================= */}
                {/* CONNECTING DASHED LINE BETWEEN NATIVE & PREDICTED                        */}
                {/* ========================================================================= */}
                {nativeSvg && (
                    <line
                        x1={nativeSvg.x}
                        y1={nativeSvg.y}
                        x2={predSvg.x}
                        y2={predSvg.y}
                        stroke="#888890"
                        strokeWidth="1.6"
                        strokeDasharray="4 4"
                        strokeOpacity="0.65"
                    />
                )}

                {/* ========================================================================= */}
                {/* NATIVE POINT (Blue Target with Halo)                                     */}
                {/* ========================================================================= */}
                {nativeSvg && (
                    <g>
                        <circle cx={nativeSvg.x} cy={nativeSvg.y} r="14" fill="rgba(56, 120, 200, 0.25)" />
                        <circle cx={nativeSvg.x} cy={nativeSvg.y} r="8" fill="rgba(70, 150, 240, 0.5)" />
                        <circle cx={nativeSvg.x} cy={nativeSvg.y} r="4.2" fill="#90cdf4" />
                        <circle cx={nativeSvg.x} cy={nativeSvg.y} r="1.6" fill="#ffffff" />
                        <text
                            x={nativeSvg.x}
                            y={nativeSvg.y - 12}
                            textAnchor="middle"
                            fill="#60a5fa"
                            fontSize="12.5"
                            fontWeight="700"
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                        >
                            Native
                        </text>
                        {isNativeOffScale && (
                            <text
                                x={nativeSvg.x}
                                y={nativeSvg.y + 16}
                                textAnchor="middle"
                                fill="#94a3b8"
                                fontSize="9.5"
                                fontWeight="500"
                                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                            >
                                off-scale
                            </text>
                        )}
                    </g>
                )}

                {/* ========================================================================= */}
                {/* PREDICTED POINT (Green Target with Halo)                                 */}
                {/* ========================================================================= */}
                <g>
                    <circle cx={predSvg.x} cy={predSvg.y} r="14" fill="rgba(34, 160, 70, 0.25)" />
                    <circle cx={predSvg.x} cy={predSvg.y} r="8" fill="rgba(40, 180, 90, 0.5)" />
                    <circle cx={predSvg.x} cy={predSvg.y} r="4.2" fill="#86efac" />
                    <circle cx={predSvg.x} cy={predSvg.y} r="1.6" fill="#ffffff" />
                    <text
                        x={predSvg.x}
                        y={predSvg.y - 12}
                        textAnchor="middle"
                        fill="#4ade80"
                        fontSize="12.5"
                        fontWeight="700"
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                    >
                        Predicted
                    </text>
                    {isPredOffScale && (
                        <text
                            x={predSvg.x}
                            y={predSvg.y + 16}
                            textAnchor="middle"
                            fill="#86efac"
                            fontSize="9.5"
                            fontWeight="500"
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                        >
                            off-scale
                        </text>
                    )}
                </g>
            </svg>
        </div>
    );
};
