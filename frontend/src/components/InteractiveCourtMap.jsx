import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, MapPin, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

// ── Small court SVG for 3D grid ────────────────────────────
function CourtSVGMini({ fill = "#22c55e" }) {
    return (
        <svg viewBox="0 0 200 440" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x="0" y="0" width="200" height="440" rx="4" fill={fill} />
            <rect x="6" y="6" width="188" height="428" rx="2" fill="none" stroke="white" strokeWidth="2.5" />
            <line x1="26" y1="6" x2="26" y2="434" stroke="white" strokeWidth="1.5" />
            <line x1="174" y1="6" x2="174" y2="434" stroke="white" strokeWidth="1.5" />
            <line x1="6" y1="220" x2="194" y2="220" stroke="white" strokeWidth="3" />
            <line x1="6" y1="130" x2="194" y2="130" stroke="white" strokeWidth="1.5" />
            <line x1="6" y1="310" x2="194" y2="310" stroke="white" strokeWidth="1.5" />
            <line x1="100" y1="130" x2="100" y2="310" stroke="white" strokeWidth="1.5" />
            <circle cx="2" cy="220" r="4" fill="white" opacity="0.8" />
            <circle cx="198" cy="220" r="4" fill="white" opacity="0.8" />
        </svg>
    );
}

// ── Large 2D court SVG for detail view ─────────────────────
function CourtSVGLarge({ fill = "#22c55e", accentFill = "#16a34a" }) {
    return (
        <svg viewBox="0 0 440 680" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <rect x="8" y="8" width="424" height="664" rx="8" fill="rgba(0,0,0,0.08)" />
            <rect x="0" y="0" width="440" height="680" rx="8" fill={fill} />
            <rect x="0" y="0" width="440" height="680" rx="8" fill="url(#courtGrad)" />
            <defs>
                <linearGradient id="courtGrad" x1="0" y1="0" x2="440" y2="680">
                    <stop offset="0%" stopColor="white" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="black" stopOpacity="0.06" />
                </linearGradient>
            </defs>
            <rect x="12" y="12" width="416" height="656" rx="4" fill="none" stroke="white" strokeWidth="3" />
            <line x1="52" y1="12" x2="52" y2="668" stroke="white" strokeWidth="2" opacity="0.8" />
            <line x1="388" y1="12" x2="388" y2="668" stroke="white" strokeWidth="2" opacity="0.8" />
            <rect x="4" y="336" width="432" height="8" rx="2" fill={accentFill} opacity="0.6" />
            <line x1="12" y1="340" x2="428" y2="340" stroke="white" strokeWidth="3" />
            <circle cx="6" cy="340" r="6" fill="white" opacity="0.9" />
            <circle cx="434" cy="340" r="6" fill="white" opacity="0.9" />
            <line x1="12" y1="200" x2="428" y2="200" stroke="white" strokeWidth="2" />
            <line x1="12" y1="480" x2="428" y2="480" stroke="white" strokeWidth="2" />
            <line x1="220" y1="200" x2="220" y2="480" stroke="white" strokeWidth="2" />
            <line x1="12" y1="60" x2="428" y2="60" stroke="white" strokeWidth="1.5" opacity="0.5" />
            <line x1="12" y1="620" x2="428" y2="620" stroke="white" strokeWidth="1.5" opacity="0.5" />
        </svg>
    );
}

// ── Main component ─────────────────────────────────────────
export default function InteractiveCourtMap({
    courts = [],
    onSelectCourt,
    selectedCourtId = null,
}) {
    const [hoveredId, setHoveredId] = useState(null);
    const [detailCourt, setDetailCourt] = useState(null); // null = 3D overview, object = 2D detail

    const bookedCourtIds = new Set(
        courts.length > 1 ? [courts[1]?.id] : []
    );

    const displayCourts = courts.slice(0, 4);

    const handleCourtClick = (court) => {
        if (bookedCourtIds.has(court.id)) return;
        setDetailCourt(court);
        onSelectCourt?.(court);
    };

    const detailIndex = detailCourt ? displayCourts.findIndex(c => c.id === detailCourt.id) : -1;
    const detailIsBooked = detailCourt ? bookedCourtIds.has(detailCourt.id) : false;
    const detailIsSelected = detailCourt ? selectedCourtId === detailCourt.id : false;

    const switchDetail = (dir) => {
        if (!detailCourt) return;
        const idx = displayCourts.findIndex(c => c.id === detailCourt.id);
        const next = (idx + dir + displayCourts.length) % displayCourts.length;
        const nextCourt = displayCourts[next];
        setDetailCourt(nextCourt);
        if (!bookedCourtIds.has(nextCourt.id)) {
            onSelectCourt?.(nextCourt);
        }
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {!detailCourt ? (
                    /* ═══════ 3D ISOMETRIC OVERVIEW ═══════ */
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                        {/* Legend */}
                        <div className="flex flex-wrap items-center justify-center gap-5 mb-8 text-xs font-medium text-gray-500">
                            <span className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 ring-2 ring-emerald-300" />
                                Available
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-sm bg-gray-300" />
                                Booked
                            </span>
                        </div>

                        <p className="text-center text-sm text-gray-400 mb-6">
                            Click on a court to view details and book
                        </p>

                        {/* 3D grid */}
                        <div className="flex justify-center">
                            <div style={{ perspective: "1200px", perspectiveOrigin: "50% 30%" }}>
                                <div
                                    className="grid gap-3 sm:gap-5 p-6 sm:p-10 rounded-2xl"
                                    style={{
                                        gridTemplateColumns: `repeat(${Math.min(displayCourts.length, 4)}, 1fr)`,
                                        transform: "rotateX(55deg) rotateZ(-30deg)",
                                        transformStyle: "preserve-3d",
                                        background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
                                        boxShadow: "0 60px 100px -30px rgba(0,0,0,0.5), 0 30px 60px -20px rgba(0,0,0,0.3)",
                                    }}
                                >
                                    {displayCourts.map((court, i) => {
                                        const isBooked = bookedCourtIds.has(court.id);
                                        const isHovered = hoveredId === court.id;

                                        return (
                                            <motion.div
                                                key={court.id}
                                                className={`relative ${isBooked ? "cursor-not-allowed" : "cursor-pointer"}`}
                                                style={{
                                                    transformStyle: "preserve-3d",
                                                    width: "clamp(70px, 18vw, 140px)",
                                                    height: "clamp(154px, 40vw, 308px)",
                                                }}
                                                initial={{ opacity: 0, z: -50 }}
                                                animate={{ opacity: 1, z: 0 }}
                                                whileHover={!isBooked ? { z: 30, scale: 1.06 } : {}}
                                                transition={{ type: "spring", damping: 18, stiffness: 200, delay: i * 0.1 }}
                                                onMouseEnter={() => !isBooked && setHoveredId(court.id)}
                                                onMouseLeave={() => setHoveredId(null)}
                                                onClick={() => handleCourtClick(court)}
                                            >
                                                <div
                                                    className={`relative w-full h-full rounded-lg overflow-hidden transition-shadow duration-300
                                                        ${isBooked
                                                            ? "grayscale opacity-50"
                                                            : isHovered
                                                                ? "shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                                                                : ""
                                                        }`}
                                                >
                                                    <CourtSVGMini fill={isBooked ? "#94a3b8" : "#22c55e"} />

                                                    {isBooked && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60 rounded-lg">
                                                            <Lock size={20} className="text-white/70 mb-1" />
                                                            <span className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wider">
                                                                Booked
                                                            </span>
                                                        </div>
                                                    )}

                                                    {isHovered && !isBooked && (
                                                        <motion.div
                                                            className="absolute inset-0 rounded-lg border-2 border-emerald-300/60"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: [0, 0.8, 0] }}
                                                            transition={{ duration: 1.2, repeat: Infinity }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Label */}
                                                <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 text-center" style={{ transform: "translateZ(2px)" }}>
                                                    <div className={`rounded-md px-1 py-1 sm:py-1.5 ${isBooked ? "bg-gray-800/70" : "bg-black/50"} backdrop-blur-sm`}>
                                                        <p className={`text-[9px] sm:text-[11px] font-extrabold m-0 leading-tight ${isBooked ? "text-gray-400" : "text-white"}`}>
                                                            Court {i + 1}
                                                        </p>
                                                        {!isBooked && (
                                                            <p className="text-[7px] sm:text-[9px] text-gray-300 m-0 mt-0.5">
                                                                RM {court.price_per_hour}/hr
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    /* ═══════ 2D DETAIL VIEW ═══════ */
                    <motion.div
                        key={`detail-${detailCourt.id}`}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="w-full max-w-3xl mx-auto"
                    >
                        {/* Back button */}
                        <button
                            onClick={() => setDetailCourt(null)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-6 cursor-pointer bg-transparent border-0 p-0 transition-colors"
                        >
                            <RotateCcw size={14} />
                            Back to all courts
                        </button>

                        {/* Court switcher */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <button
                                onClick={() => switchDetail(-1)}
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer bg-white"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex gap-1.5 px-2">
                                {displayCourts.map((court, i) => {
                                    const booked = bookedCourtIds.has(court.id);
                                    const active = court.id === detailCourt.id;
                                    return (
                                        <button
                                            key={court.id}
                                            onClick={() => {
                                                setDetailCourt(court);
                                                if (!bookedCourtIds.has(court.id)) onSelectCourt?.(court);
                                            }}
                                            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border-2
                                                ${active
                                                    ? booked
                                                        ? "border-gray-400 bg-gray-100 text-gray-500"
                                                        : "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                                                    : booked
                                                        ? "border-gray-200 bg-gray-50 text-gray-400"
                                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                                }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {booked && <Lock size={12} />}
                                                Court {i + 1}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => switchDetail(1)}
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer bg-white"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* 2D court + info side by side */}
                        <div className="flex flex-col lg:flex-row gap-6 items-center">
                            {/* Court SVG */}
                            <div className={`relative w-full max-w-[260px] sm:max-w-[300px] shrink-0 ${detailIsBooked ? "grayscale opacity-60" : ""}`}>
                                <CourtSVGLarge
                                    fill={detailIsBooked ? "#94a3b8" : detailIsSelected ? "#059669" : "#22c55e"}
                                    accentFill={detailIsBooked ? "#64748b" : detailIsSelected ? "#047857" : "#16a34a"}
                                />
                                {detailIsBooked && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
                                            <Lock size={28} className="text-white/70 mx-auto mb-2" />
                                            <span className="text-sm font-bold text-white/90 uppercase tracking-wider">Booked</span>
                                        </div>
                                    </div>
                                )}
                                {detailIsSelected && !detailIsBooked && (
                                    <motion.div
                                        className="absolute inset-0 rounded-lg ring-4 ring-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    />
                                )}
                            </div>

                            {/* Info card */}
                            <div className="flex-1 w-full">
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold mb-4 ${detailIsBooked ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-700"}`}>
                                        <span className={`w-2 h-2 rounded-full ${detailIsBooked ? "bg-gray-400" : "bg-emerald-500"}`} />
                                        Court {detailIndex + 1} {detailIsBooked ? "- Unavailable" : "- Available"}
                                    </div>

                                    <h3 className="font-heading text-2xl font-bold text-gray-900 mb-2">
                                        {detailCourt.name}
                                    </h3>

                                    {detailCourt.location && (
                                        <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                                            <MapPin size={14} className="text-red-500 shrink-0" />
                                            {detailCourt.location}
                                        </p>
                                    )}

                                    <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                        {detailCourt.description || "Professional-grade court with premium facilities."}
                                    </p>

                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className="text-3xl font-extrabold text-emerald-600">
                                            RM {detailCourt.price_per_hour}
                                        </span>
                                        <span className="text-sm text-gray-400">/ hour</span>
                                    </div>

                                    {detailIsBooked ? (
                                        <div className="rounded-xl bg-gray-100 border border-gray-200 py-3 text-center text-sm font-semibold text-gray-400">
                                            Currently Unavailable
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onSelectCourt?.(detailCourt)}
                                            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold py-3.5 transition-all cursor-pointer border-0
                                                ${detailIsSelected
                                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                                                    : "bg-gray-900 hover:bg-emerald-600 text-white shadow-md"
                                                }`}
                                        >
                                            {detailIsSelected ? "Confirm & Book Now" : "Select This Court"}
                                            <ArrowRight size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Dot indicators */}
                                <div className="flex items-center justify-center gap-2 mt-5">
                                    {displayCourts.map((c, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setDetailCourt(c);
                                                if (!bookedCourtIds.has(c.id)) onSelectCourt?.(c);
                                            }}
                                            className={`h-2 rounded-full transition-all cursor-pointer border-0
                                                ${c.id === detailCourt.id
                                                    ? "w-8 bg-emerald-500"
                                                    : "w-2 bg-gray-300 hover:bg-gray-400"
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
