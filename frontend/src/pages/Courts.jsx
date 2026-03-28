import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, ShieldCheck, Lock, X, Search, Navigation } from "lucide-react";
import { supabase } from "../../supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issues just in case, though we use custom icons
delete L.Icon.Default.prototype._getIconUrl;

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" },
    }),
};

// Custom interactive emerald marker using raw HTML/CSS strings
const createCustomIcon = (isActive) => {
    return L.divIcon({
        className: 'bg-transparent border-0',
        html: `<div style="position: relative; width: 32px; height: 40px; transform: ${isActive ? 'scale(1.3)' : 'scale(1)'}; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: ${isActive ? 1000 : 1};">
                 <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: #1fc6a1; box-shadow: 0 4px 15px rgba(31,198,161,0.5); display: flex; align-items: center; justify-content: center; border: 2.5px solid white;">
                     <div style="width: 10px; height: 10px; border-radius: 50%; background-color: white;"></div>
                 </div>
                 <div style="position: absolute; bottom: 0px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #1fc6a1;"></div>
               </div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -42]
    });
};

// Default fallback: centre of Klang Valley
const KL_CENTER = { lat: 3.0738, lng: 101.5183 };

// Fast-path coordinate cache — instant fly for common areas, no network round-trip
const CITY_COORDS = {
    'Petaling Jaya': [3.107,    101.606],
    'Subang Jaya':   [3.049,    101.585],
    'Kuala Lumpur':  [3.139,    101.686],
    'Shah Alam':     [3.085,    101.532],
    'Klang':         [3.044,    101.446],
    'Puchong':       [3.028,    101.621],
    'Cheras':        [3.088,    101.740],
    'Ampang':        [3.148,    101.762],
    'Clayton':       [-37.915,  145.130],
};

/**
 * Synchronously derives the best starting center from localStorage so MapContainer
 * receives it as the initial `center` prop — eliminating the jump on page load.
 * Priority: stored exact coords → CITY_COORDS cache → KL_CENTER fallback.
 */
function getInitialCenter() {
    try {
        const stored = localStorage.getItem('bpro_location_coords');
        if (stored) {
            const { lat, lng } = JSON.parse(stored);
            if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
        }
    } catch { /* malformed — fall through */ }

    const name = localStorage.getItem('bpro_location');
    if (name && CITY_COORDS[name]) return CITY_COORDS[name];

    return [KL_CENTER.lat, KL_CENTER.lng];
}

/**
 * Unified map controller — three-priority fly system:
 *   1. GPS          → fly to user's real location on first load
 *   2. Fit bounds   → flyToBounds whenever filtered courts change (Airbnb-style)
 *   3. Location     → fast-path cache, then dynamic Nominatim geocoding as fallback
 * Guards against calling any fly on a CSS-hidden map (offsetWidth/Height === 0 → NaN crash).
 */
function MapController({ userLocation, selectedLocation, courts }) {
    const map          = useMap();
    const gpsFired     = useRef(false);
    const prevSelected = useRef(null);
    const isFirstRender = useRef(true); // true until first user-triggered change

    const isVisible = () => {
        const c = map.getContainer();
        return c.offsetWidth > 0 && c.offsetHeight > 0;
    };

    // Priority 1 — GPS: setView (no animation) on first paint; flyTo on subsequent updates
    useEffect(() => {
        if (!userLocation || gpsFired.current || !isVisible()) return;
        gpsFired.current = true;
        if (isFirstRender.current) {
            // Map already starts at the right place via `center` prop — just sync silently
            map.setView([userLocation.lat, userLocation.lng], 14, { animate: false });
            isFirstRender.current = false;
        } else {
            map.flyTo([userLocation.lat, userLocation.lng], 14, { animate: true, duration: 1.5 });
        }
    }, [userLocation, map]);

    // Priority 2 — Fit bounds: reframe whenever the filtered court list changes
    useEffect(() => {
        if (courts.length === 0 || !isVisible()) return;
        const bounds = L.latLngBounds(courts.map(c => [c.lat, c.lng]));
        if (bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5, maxZoom: 14 });
        }
    }, [courts, map]);

    // Priority 3 — Selected location: exact stored coords → cache → Nominatim
    useEffect(() => {
        if (!selectedLocation || selectedLocation === prevSelected.current || !isVisible()) return;
        prevSelected.current = selectedLocation;

        const fly = (coords, zoom = 13) => {
            if (isFirstRender.current) {
                // First load: map's `center` prop already placed us here — silent sync only
                map.setView(coords, zoom, { animate: false });
                isFirstRender.current = false;
            } else {
                map.flyTo(coords, zoom, { animate: true, duration: 1.5 });
            }
        };

        // Best path: exact coords stored when user picked from autocomplete suggestions
        try {
            const stored = localStorage.getItem('bpro_location_coords');
            if (stored) {
                const { lat, lng } = JSON.parse(stored);
                if (!isNaN(lat) && !isNaN(lng)) { fly([lat, lng]); return; }
            }
        } catch { /* malformed JSON — fall through */ }

        // Fast path: known city in local cache — instant, no network
        if (CITY_COORDS[selectedLocation]) {
            fly(CITY_COORDS[selectedLocation]);
            return;
        }

        // Dynamic path: geocode via Nominatim for any unlisted city/country
        (async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(selectedLocation)}&limit=1`,
                    { headers: { 'Accept-Language': 'en', 'User-Agent': 'BadmintonPro/1.0' } }
                );
                const data = await res.json();
                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    if (!isNaN(lat) && !isNaN(lon) && isVisible()) {
                        fly([lat, lon]);
                    }
                } else {
                    console.warn(`[MapController] Location not found: "${selectedLocation}"`);
                }
            } catch (err) {
                console.warn(`[MapController] Geocoding failed for "${selectedLocation}":`, err.message);
            }
        })();
    }, [selectedLocation, map]);

    return null;
}

// Pulsing blue "You Are Here" dot
const createUserIcon = () => L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div style="position:relative;width:24px;height:24px;">
               <div class="you-are-here-pulse" style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.25);"></div>
               <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:13px;height:13px;border-radius:50%;background:#3b82f6;border:2.5px solid white;box-shadow:0 2px 10px rgba(59,130,246,0.7);"></div>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
});

export default function Courts() {
    const [courts, setCourts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [hoveredCourtId, setHoveredCourtId] = useState(null);
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [showLoginModal, setShowLoginModal] = useState(false);

    // Real GPS location for map centering + "You Are Here" marker
    const [userLocation, setUserLocation] = useState(null);

    // Selected location from header picker — string label, passed to MapController for geocoding
    const [selectedLocation, setSelectedLocation] = useState(
        () => localStorage.getItem('bpro_location') || ''
    );

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => { /* permission denied or unavailable — map stays at KL_CENTER */ },
            { timeout: 8000, maximumAge: 300_000 }
        );

        // Keep in sync when user changes location from header while on this page
        const handleLocationChange = () => {
            const newLoc = localStorage.getItem('bpro_location');
            if (newLoc) setSelectedLocation(newLoc);
        };

        // 同时监听跨标签页变化 和 我们自己的同页面自定义事件
        window.addEventListener('storage', handleLocationChange);
        window.addEventListener('bpro_location_changed', handleLocationChange);
        
        return () => {
            window.removeEventListener('storage', handleLocationChange);
            window.removeEventListener('bpro_location_changed', handleLocationChange);
        };
    }, []);

    useEffect(() => {
        const fetchCourts = async () => {
            try {
                const { data, error } = await supabase.from('courts').select('*');
                if (error) throw error;
                
                const sanitized = data.map((court, i) => {
                    const hasCoord = court.lat && court.lng;
                    
                    let lat = court.lat;
                    let lng = court.lng;
                    
                    if (!hasCoord) {
                        if (i === 0) { lat = 3.067; lng = 101.603; }
                        else if (i === 1) { lat = 3.075; lng = 101.588; }
                        else if (i === 2) { lat = 3.157; lng = 101.711; }
                        else {
                            lat = 3.0738 + (Math.random() * 0.05 - 0.025);
                            lng = 101.5183 + (Math.random() * 0.05 - 0.025);
                        }
                    }
                    
                    return {
                        ...court,
                        lat: parseFloat(lat),
                        lng: parseFloat(lng),
                        hasRealCoord: hasCoord,
                        image_url: court.cover_image || court.image_url
                    };
                });
                setCourts(sanitized);
            } catch (err) {
                console.error("Error: ", err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCourts();
    }, []);

    const handleBook = (courtId) => {
        if (!currentUser) {
            setShowLoginModal(true);
        } else {
            navigate(`/bookings/${courtId}`);
        }
    };

    const filteredCourts = useMemo(() => {
        if (!searchQuery.trim()) return courts;
        const q = searchQuery.toLowerCase();
        return courts.filter((c) =>
            [c.name, c.location]
                .filter(Boolean)
                .some((field) => field.toLowerCase().includes(q))
        );
    }, [courts, searchQuery]);

    // Calculated once before any MapContainer renders — eliminates the jump on page load
    const initialCenter = useMemo(() => getInitialCenter(), []);

    // Dark Matter CartoDB tiles
    const tileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-76px)] bg-[#fafafb] dark:bg-[#0f172a]">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-emerald-100 border-t-[#1fc6a1] rounded-full animate-spin" />
                    <p className="mt-4 text-sm font-bold tracking-widest text-gray-400 dark:text-slate-500 uppercase">Loading Map...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-76px)] bg-[#fafafb] dark:bg-[#0f172a] overflow-hidden w-full relative">
            
            {/* ═══════ MOBILE MAP (Top, Sticky) ═══════ */}
            <div className="lg:hidden h-[40vh] w-full flex-shrink-0 relative z-0">
                <MapContainer center={initialCenter} zoom={11} className="w-full h-full" zoomControl={false}>
                    <TileLayer url={tileUrl} attribution={tileAttribution} />
                    <MapController courts={filteredCourts} userLocation={userLocation} selectedLocation={selectedLocation} />
                    {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="p-2 text-center text-[13px] font-bold text-blue-600">You are here</div>
                            </Popup>
                        </Marker>
                    )}
                    {filteredCourts.map(court => (
                        <Marker
                            key={`mobile-marker-${court.id}`}
                            position={[court.lat, court.lng]} 
                            icon={createCustomIcon(hoveredCourtId === court.id)}
                            eventHandlers={{
                                click: () => setHoveredCourtId(court.id)
                            }}
                        >
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="p-2 min-w-[200px]">
                                    <div className="font-extrabold text-[15px] text-gray-900 dark:text-white mb-1">{court.name}</div>
                                    <div className="text-[13px] font-bold text-[#1fc6a1] mb-3">RM {court.price_per_hour}/hr</div>
                                    
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => handleBook(court.id)} className="w-full bg-gray-900 text-white text-[12px] font-bold py-2 rounded-xl uppercase tracking-wider hover:bg-black dark:hover:bg-emerald-700 transition-colors">
                                            Book Court
                                        </button>
                                        <a 
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${court.lat},${court.lng}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[12px] font-bold py-2 rounded-xl transition-colors cursor-pointer"
                                        >
                                            <MapPin size={14} /> Maps
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
                {/* Gradient overlay to soften transition to list on mobile */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#fafafb] dark:from-slate-900 dark:from-slate-900 dark:from-slate-900 to-transparent z-[400] pointer-events-none" />
            </div>

            {/* ═══════ LEFT/BOTTOM SCROLLABLE LIST ═══════ */}
            <div className="flex-1 w-full lg:max-w-[55%] xl:max-w-[45%] h-full overflow-y-auto overflow-x-hidden scroll-smooth z-10 bg-[#fafafb] dark:bg-[#0f172a] rounded-t-3xl lg:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-none -mt-5 lg:mt-0 relative pb-24 lg:pb-8 pt-8 px-4 sm:px-6 lg:px-8 custom-scrollbar flex flex-col">
                
                {/* Search Header Sticky */}
                <div className="sticky top-0 z-20 bg-[#fafafb] dark:bg-[#0f172a]/95 backdrop-blur-md pb-6 mb-2 -mx-2 px-2">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Available Courts</h1>
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400 dark:text-slate-500" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or area..."
                            className="w-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-[1.2rem] pl-11 pr-4 py-3.5 text-[15px] text-gray-900 dark:text-white shadow-sm focus-visible:outline-none focus-visible:border-[#1fc6a1] focus-visible:ring-2 focus-visible:ring-[#1fc6a1]/20 transition-all font-medium placeholder:font-normal placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-500 dark:placeholder:text-slate-500 dark:text-slate-500"
                        />
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-[13px] font-bold text-gray-400 dark:text-slate-500 tracking-wide">
                            SHOWING {filteredCourts.length} RESULTS
                        </p>
                        {selectedLocation && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-bold border border-emerald-100">
                                <Navigation size={11} strokeWidth={2.5} />
                                {selectedLocation}
                            </span>
                        )}
                    </div>
                </div>

                {filteredCourts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1e293b] rounded-[2rem] border border-dashed border-gray-200 dark:border-slate-700 mt-4">
                        <MapPin size={40} className="text-gray-300 dark:text-slate-600 mb-4" />
                        <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1">No courts found</h4>
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 text-center max-w-[250px]">Try adjusting your search to find courts in other areas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-5 mt-2 auto-rows-max flex-1">
                        <AnimatePresence>
                            {filteredCourts.map((court, i) => (
                                <motion.div
                                    key={court.id}
                                    variants={fadeUp}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    custom={i}
                                    className="group rounded-[1.5rem] bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:border-[#1fc6a1]/30 transition-all duration-300 flex flex-col cursor-pointer"
                                    onMouseEnter={() => setHoveredCourtId(court.id)}
                                    onMouseLeave={() => setHoveredCourtId(null)}
                                    onClick={() => handleBook(court.id)}
                                >
                                    {/* Card Image */}
                                    <div className="relative h-44 overflow-hidden bg-gray-100 dark:bg-[#1e293b] shrink-0">
                                        <img
                                            src={court.image_url}
                                            alt={court.name}
                                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent pointer-events-none" />
                                        <div className="absolute bottom-3 left-3">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-[#1e293b]/95 backdrop-blur-md px-2.5 py-1 text-[10px] uppercase font-black tracking-widest text-[#1fc6a1] shadow-sm">
                                                <ShieldCheck size={12} strokeWidth={2.5} />
                                                Verified
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5 flex flex-col flex-1">
                                        <h3 className="text-[16px] font-black text-gray-900 dark:text-white mb-1 leading-tight line-clamp-1">
                                            {court.name}
                                        </h3>
                                        <p className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 dark:text-slate-400 mb-4 line-clamp-1">
                                            <MapPin size={14} className="text-[#1fc6a1] shrink-0" strokeWidth={2.5}/>
                                            {court.location || "Location not specified"}
                                        </p>
                                        
                                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                            <div>
                                                <p className="text-[18px] font-black text-[#1fc6a1] m-0 leading-none">
                                                    RM {court.price_per_hour}
                                                    <span className="text-[12px] font-bold text-gray-400 dark:text-slate-500"> /hr</span>
                                                </p>
                                            </div>
                                            <button
                                                className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center text-gray-400 dark:text-slate-500 group-hover:bg-[#1fc6a1] group-hover:text-white transition-colors"
                                            >
                                                <ArrowRight size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-auto pt-8 pb-2 text-center">
                    <p className="text-[12px] font-medium text-gray-400 dark:text-slate-600">
                        &copy; {new Date().getFullYear()} BadmintonPro. All rights reserved.
                    </p>
                </div>
            </div>

            {/* ═══════ DESKTOP MAP (Right, Sticky) ═══════ */}
            <div className="hidden lg:block flex-1 h-full w-full relative z-0 border-l border-gray-200 dark:border-slate-700">
                <MapContainer center={initialCenter} zoom={11} className="w-full h-full" zoomControl={true}>
                    <TileLayer url={tileUrl} attribution={tileAttribution} />
                    <MapController courts={filteredCourts} userLocation={userLocation} selectedLocation={selectedLocation} />
                    {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="p-3 text-center text-[13px] font-bold text-blue-600">You are here</div>
                            </Popup>
                        </Marker>
                    )}
                    {filteredCourts.map(court => (
                        <Marker
                            key={`desktop-marker-${court.id}`}
                            position={[court.lat, court.lng]} 
                            icon={createCustomIcon(hoveredCourtId === court.id)}
                            eventHandlers={{
                                click: () => navigate(`/bookings/${court.id}`),
                                mouseover: () => setHoveredCourtId(court.id),
                                mouseout: () => setHoveredCourtId(null)
                            }}
                        >
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="p-3 min-w-[220px]">
                                    {/* Court Image */}
                                    <div className="w-full h-28 rounded-xl bg-gray-100 dark:bg-[#1e293b] mb-3 overflow-hidden cursor-pointer" onClick={() => handleBook(court.id)}>
                                        <img src={court.image_url} alt={court.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    
                                    <div className="font-black text-[16px] text-gray-900 dark:text-white mb-1 leading-tight">{court.name}</div>
                                    <div className="text-[13px] font-bold text-gray-500 dark:text-slate-400 mb-4 flex items-center gap-1">
                                        <MapPin size={12} className="text-[#1fc6a1]"/> {court.location || "Location not specified"}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-[15px] font-black text-[#1fc6a1]">RM {court.price_per_hour}<span className="text-[11px] text-gray-400 dark:text-slate-500">/hr</span></div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button onClick={() => handleBook(court.id)} className="col-span-1 flex items-center justify-center gap-1 bg-gray-900 hover:bg-black dark:hover:bg-emerald-700 text-white text-[12px] font-bold py-2.5 rounded-xl transition-colors">
                                            Book <ArrowRight size={12}/>
                                        </button>
                                        <a 
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${court.lat},${court.lng}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="col-span-1 flex items-center justify-center gap-1.5 bg-[#eefbfa] dark:bg-emerald-900/30 text-[#1fc6a1] dark:text-emerald-400 hover:bg-[#1fc6a1] hover:text-white text-[12px] font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                                        >
                                            <MapPin size={14} /> Maps
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* ═══════ LOGIN MODAL (Reused) ═══════ */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowLoginModal(false)}
                    />
                    <motion.div
                        className="relative bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-[340px] mx-4 overflow-hidden border border-gray-100 dark:border-slate-800"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:bg-[#1e293b] dark:hover:bg-slate-700 dark:bg-[#1e293b] dark:hover:bg-slate-700 dark:bg-[#1e293b] dark:hover:bg-slate-700 transition-colors cursor-pointer bg-transparent border-0"
                        >
                            <X size={18} />
                        </button>
                        <div className="p-8 pb-6 text-center">
                            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-[#eefbfa] flex items-center justify-center shadow-inner">
                                <Lock size={22} className="text-[#1fc6a1]" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-heading text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                                Authentication Required
                            </h3>
                            <p className="text-[13px] font-medium text-gray-500 dark:text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                                Please sign in or create a new account to reserve this court.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5 px-6 pb-6">
                            <button
                                onClick={() => { setShowLoginModal(false); navigate("/login"); }}
                                className="w-full py-3.5 rounded-full text-[14px] font-bold text-white bg-[#1a1f2e] dark:bg-emerald-600 hover:bg-black dark:hover:bg-emerald-700 transition-colors cursor-pointer border-0 shadow-[0_8px_20px_rgba(26,31,46,0.3)]"
                            >
                                Login Configuration
                            </button>
                            <button
                                onClick={() => { setShowLoginModal(false); navigate("/register"); }}
                                className="w-full py-3.5 rounded-full text-[14px] font-bold border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 transition-colors cursor-pointer bg-transparent"
                            >
                                Create Account
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            
            {/* Minimal inline CSS for leaflet popups inside the grid system */}
            <style dangerouslySetInnerHTML={{__html: `
                .leaflet-popup-content-wrapper { border-radius: 1.25rem !important; overflow: hidden; padding: 0 !important; box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important; }
                .leaflet-popup-content { margin: 0 !important; }
                .leaflet-popup-tip { box-shadow: none !important; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
                @keyframes you-are-here { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.8); opacity: 0; } }
                .you-are-here-pulse { animation: you-are-here 2s ease-out infinite; }
            `}} />
        </div>
    );
}
