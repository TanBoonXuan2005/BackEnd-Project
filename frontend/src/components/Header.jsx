import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { supabase } from '../../supabase';
import {
    Map as MapIcon,
    Calendar,
    User,
    Bell,
    MapPin,
    Home as HomeIcon,
    ChevronDown,
    Menu,
    X,
    Navigation,
    Loader2,
    Search,
    CheckCircle2,
    Sun,
    Moon,
} from 'lucide-react';

const QUICK_PICKS = [
    "Petaling Jaya", "Kuala Lumpur", "Shah Alam",
    "Subang Jaya", "Klang", "Puchong", "Cheras", "Ampang",
];

export default function Header() {
    const navigate   = useNavigate();
    const location   = useLocation();
    const { currentUser } = useContext(AuthContext);
    const { isDark, toggleTheme } = useTheme();
    const userProfileImage = currentUser?.user_metadata?.photoURL || currentUser?.user_metadata?.avatar_url;
    const [userBackgroundImage, setUserBackgroundImage] = useState(null);
    const [imageError, setImageError] = useState(false);

    // ── UI state ──
    const [mobileOpen,   setMobileOpen]   = useState(false);
    const [profileOpen,  setProfileOpen]  = useState(false);
    const profileRef  = useRef(null);

    // ── Location state ──
    const [locationName,    setLocationName]    = useState(() => localStorage.getItem('bpro_location') || 'Petaling Jaya');
    const [locDropdownOpen, setLocDropdownOpen] = useState(false);
    const [locLoading,      setLocLoading]      = useState(false);
    const [locError,        setLocError]        = useState('');
    const [locInput,        setLocInput]        = useState('');
    const [locConfirmed,    setLocConfirmed]    = useState(false);
    const [locSuggestions,  setLocSuggestions]  = useState([]);
    const [locSugLoading,   setLocSugLoading]   = useState(false);
    const locRef        = useRef(null);
    const locInputRef   = useRef(null);
    const suggestTimer  = useRef(null);

    // ── Close menus on route change ──
    useEffect(() => {
        setMobileOpen(false);
        setProfileOpen(false);
        setLocDropdownOpen(false);
    }, [location.pathname]);

    // ── Outside-click: profile dropdown ──
    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target))
                setProfileOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Outside-click: location dropdown ──
    useEffect(() => {
        const handler = (e) => {
            if (locRef.current && !locRef.current.contains(e.target))
                setLocDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Focus input when dropdown opens ──
    useEffect(() => {
        if (locDropdownOpen) {
            setLocInput('');
            setLocError('');
            setTimeout(() => locInputRef.current?.focus(), 80);
        }
    }, [locDropdownOpen]);

    // ── Try silent GPS on first load ──
    useEffect(() => {
        if (!localStorage.getItem('bpro_location')) {
            navigator.permissions?.query({ name: 'geolocation' }).then(result => {
                if (result.state === 'granted') detectGPS(true);
            });
        }
    }, []);

    // ── Background image ──
    useEffect(() => {
        if (currentUser) {
            const { data } = supabase.storage
                .from('background_images')
                .getPublicUrl(`${currentUser.id}`);
            if (data?.publicUrl) setUserBackgroundImage(data.publicUrl);
        } else {
            setUserBackgroundImage(null);
        }
    }, [currentUser]);

    // ── Reverse geocode coords → suburb name ──
    const reverseGeocode = async (lat, lon) => {
        const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        return (
            data.address?.suburb   ||
            data.address?.village  ||
            data.address?.town     ||
            data.address?.city     ||
            data.address?.county   ||
            data.address?.state    ||
            'Unknown Location'
        );
    };

    // ── Detect GPS location ──
    const detectGPS = (silent = false) => {
        if (!navigator.geolocation) {
            if (!silent) setLocError("Geolocation is not supported by your browser.");
            return;
        }
        setLocLoading(true);
        setLocError('');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                    localStorage.setItem('bpro_location_coords', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
                    saveLocation(name);
                } catch {
                    if (!silent) setLocError("Could not determine your location name.");
                } finally {
                    setLocLoading(false);
                }
            },
            (err) => {
                setLocLoading(false);
                if (!silent) {
                    if (err.code === 1) setLocError("Location access denied. Please allow it in your browser settings.");
                    else setLocError("Could not get your location. Try manual entry.");
                }
            },
            { timeout: 8000, maximumAge: 300_000 }
        );
    };

    // ── Save location helper ──
    const saveLocation = (name, keepCoords = false) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (!keepCoords) localStorage.removeItem('bpro_location_coords');
        localStorage.setItem('bpro_location', trimmed);
        window.dispatchEvent(new Event('bpro_location_changed'));
        setLocationName(trimmed);
        setLocConfirmed(true);
        setTimeout(() => {
            setLocConfirmed(false);
            setLocDropdownOpen(false);
        }, 900);
    };

    const handleLocInput = (e) => {
        const val = e.target.value;
        setLocInput(val);
        setLocSuggestions([]);
        clearTimeout(suggestTimer.current);
        if (val.trim().length < 2) return;
        suggestTimer.current = setTimeout(async () => {
            setLocSugLoading(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`,
                    { headers: { 'Accept-Language': 'en', 'User-Agent': 'BadmintonPro/1.0' } }
                );
                const data = await res.json();
                setLocSuggestions(data);
            } catch { /* silent */ }
            setLocSugLoading(false);
        }, 350);
    };

    const pickSuggestion = (s) => {
        const name = s.display_name.split(',')[0].trim();
        localStorage.setItem('bpro_location_coords', JSON.stringify({
            lat: parseFloat(s.lat),
            lng: parseFloat(s.lon),
        }));
        setLocSuggestions([]);
        setLocInput('');
        saveLocation(name, true);
    };

    const handleManualSubmit = (e) => {
        e?.preventDefault();
        if (locInput.trim()) {
            setLocSuggestions([]);
            saveLocation(locInput);
        }
    };

    const isActive = (path) => location.pathname === path;

    const Avatar = ({ size = 36, border = true }) => {
        if (!imageError && userProfileImage) {
            return (
                <img
                    src={userProfileImage}
                    alt="Profile"
                    className={`rounded-full object-cover ${border ? 'ring-2 ring-emerald-500' : ''}`}
                    style={{ width: size, height: size }}
                    onError={() => setImageError(true)}
                />
            );
        }
        return (
            <div
                className={`rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold ${border ? 'ring-2 ring-emerald-500/30' : ''}`}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {currentUser?.user_metadata?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
        );
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-[76px]">

                        {/* ── Left ── */}
                        <div className="flex items-center gap-6 sm:gap-10">
                            <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-[1.02]">
                                <div className="w-10 h-10 bg-[#1a1f2e] dark:bg-[#0f172a] rounded-[12px] flex items-center justify-center shadow-sm">
                                    <span className="text-white font-extrabold text-xl leading-none">B</span>
                                </div>
                                <span className="text-[20px] font-black tracking-tight text-gray-900 dark:text-white hidden sm:block">
                                    Badminton<span className="text-emerald-500">Pro</span>
                                </span>
                            </Link>

                            {/* ── Location button + dropdown ── */}
                            <div className="hidden md:block relative" ref={locRef}>
                                <button
                                    onClick={() => setLocDropdownOpen(v => !v)}
                                    className="flex items-center gap-3 group cursor-pointer bg-transparent border-0 p-0"
                                >
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors ${locDropdownOpen ? 'bg-emerald-600' : 'bg-emerald-500 group-hover:bg-emerald-600'}`}>
                                        {locLoading
                                            ? <Loader2 size={15} className="text-white animate-spin" />
                                            : <MapPin size={15} strokeWidth={2.5} className="text-white" />
                                        }
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider flex items-center gap-0.5 leading-none mb-1">
                                            Location
                                            <ChevronDown size={10} className={`text-gray-300 dark:text-slate-600 ml-0.5 transition-transform ${locDropdownOpen ? 'rotate-180' : ''}`} />
                                        </span>
                                        <span className="text-[13px] font-bold text-gray-900 dark:text-slate-100 leading-none max-w-[130px] truncate">
                                            {locationName}
                                        </span>
                                    </div>
                                </button>

                                {/* ── Location Dropdown ── */}
                                {locDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-3 w-[300px] bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-[200]">

                                        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                                            <p className="text-[13px] font-black text-gray-900 dark:text-white mb-0.5">Set your location</p>
                                            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500">Auto-detect or type manually</p>
                                        </div>

                                        <div className="p-3 space-y-2">
                                            {/* GPS Button */}
                                            <button
                                                onClick={() => detectGPS(false)}
                                                disabled={locLoading}
                                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-[13px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed border-0 cursor-pointer text-left"
                                            >
                                                {locLoading
                                                    ? <Loader2 size={16} className="animate-spin shrink-0" />
                                                    : <Navigation size={16} className="shrink-0" />
                                                }
                                                {locLoading ? "Detecting location…" : "Use my current location"}
                                            </button>

                                            {locError && (
                                                <p className="text-[12px] text-red-500 font-medium px-1">{locError}</p>
                                            )}

                                            {/* Manual Input */}
                                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                                <div className="relative flex-1">
                                                    {locSugLoading
                                                        ? <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-spin pointer-events-none" />
                                                        : <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                                                    }
                                                    <input
                                                        ref={locInputRef}
                                                        type="text"
                                                        value={locInput}
                                                        onChange={handleLocInput}
                                                        placeholder="Type area, city or country…"
                                                        autoComplete="off"
                                                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-medium text-gray-900 dark:text-white bg-white dark:bg-[#0f172a] placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 transition-all"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={!locInput.trim()}
                                                    className="px-3 py-2.5 bg-[#1a1f2e] dark:bg-emerald-600 text-white text-[12px] font-bold rounded-xl hover:bg-black dark:hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer border-0"
                                                >
                                                    Set
                                                </button>
                                            </form>

                                            {/* Suggestion list */}
                                            {locSuggestions.length > 0 && (
                                                <div className="rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                                    {locSuggestions.map((s) => (
                                                        <button
                                                            key={s.place_id}
                                                            type="button"
                                                            onClick={() => pickSuggestion(s)}
                                                            className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors border-0 bg-white dark:bg-[#1e293b] border-b border-gray-50 dark:border-slate-800 last:border-0 cursor-pointer"
                                                        >
                                                            <MapPin size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight truncate">
                                                                    {s.display_name.split(',')[0].trim()}
                                                                </p>
                                                                <p className="text-[11px] text-gray-400 dark:text-slate-500 leading-tight truncate">
                                                                    {s.display_name.split(',').slice(1).join(',').trim()}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Success flash */}
                                            {locConfirmed && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-[12px] font-bold animate-in fade-in duration-200">
                                                    <CheckCircle2 size={14} /> Location updated!
                                                </div>
                                            )}

                                            {/* Divider */}
                                            <div className="flex items-center gap-2 py-1">
                                                <div className="flex-1 h-px bg-gray-100 dark:bg-[#1e293b]" />
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Quick picks</span>
                                                <div className="flex-1 h-px bg-gray-100 dark:bg-[#1e293b]" />
                                            </div>

                                            {/* Quick picks */}
                                            <div className="flex flex-wrap gap-1.5">
                                                {QUICK_PICKS.map(place => (
                                                    <button
                                                        key={place}
                                                        onClick={() => saveLocation(place)}
                                                        className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all border cursor-pointer ${
                                                            locationName === place
                                                                ? 'bg-[#1a1f2e] dark:bg-emerald-600 text-white border-[#1a1f2e] dark:border-emerald-600'
                                                                : 'bg-white dark:bg-[#0f172a] text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                        }`}
                                                    >
                                                        {place}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Right ── */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <nav className="hidden lg:flex items-center gap-1 mr-2">
                                <Link to="/" className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-[13px] transition-colors ${isActive('/') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                                    <HomeIcon size={16} strokeWidth={isActive('/') ? 2.5 : 2} />
                                    <span>Explore</span>
                                </Link>
                                <Link to="/courts" className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-[13px] transition-colors ${isActive('/courts') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                                    <MapIcon size={16} strokeWidth={isActive('/courts') ? 2.5 : 2} />
                                    <span>Map</span>
                                </Link>
                                {currentUser && (
                                    <Link to="/my-bookings" className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-[13px] transition-colors ${isActive('/my-bookings') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                                        <Calendar size={16} strokeWidth={isActive('/my-bookings') ? 2.5 : 2} />
                                        <span>Bookings</span>
                                    </Link>
                                )}
                                <Link to={currentUser ? "/profile" : "/login"} className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-[13px] transition-colors ${isActive('/profile') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                                    <User size={16} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                                    <span>Profile</span>
                                </Link>
                                {!currentUser && (
                                    <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold text-[13px] transition-colors ml-1 border border-gray-200 dark:border-slate-700">
                                        <User size={16} strokeWidth={2} />
                                        <span>Login</span>
                                    </Link>
                                )}
                            </nav>

                            {/* Theme toggle */}
                            <button
                                onClick={toggleTheme}
                                aria-label="Toggle dark mode"
                                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors hidden lg:flex cursor-pointer border-0 bg-transparent"
                            >
                                {isDark ? <Sun size={19} /> : <Moon size={19} />}
                            </button>

                            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ml-1 hidden lg:flex border-0 bg-transparent cursor-pointer">
                                <Bell size={20} />
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 box-content border-2 border-white dark:border-[#1e293b]" />
                            </button>

                            {/* Mobile menu button */}
                            <button
                                className="lg:hidden p-2 rounded-full text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer bg-transparent border-0 ml-2"
                                onClick={() => setMobileOpen(!mobileOpen)}
                            >
                                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Mobile Drawer ── */}
                {mobileOpen && (
                    <div className="lg:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-xl absolute w-full left-0 animate-in fade-in slide-in-from-top-2 z-50">
                        <div className="px-4 py-4 space-y-1">

                            {/* Mobile location picker */}
                            <div className="mb-3 p-3 bg-gray-50 dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-slate-800">
                                <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Location</p>
                                <div className="flex gap-2">
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); if (locInput.trim()) { saveLocation(locInput); setMobileOpen(false); } }}
                                        className="flex-1 flex gap-2"
                                    >
                                        <div className="relative flex-1">
                                            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={locInput}
                                                onChange={e => setLocInput(e.target.value)}
                                                placeholder={locationName}
                                                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-medium text-gray-900 dark:text-white bg-white dark:bg-[#1e293b] placeholder:text-gray-500 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 transition-all"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!locInput.trim()}
                                            className="px-3 py-2 bg-[#1a1f2e] dark:bg-emerald-600 text-white text-[12px] font-bold rounded-xl disabled:opacity-40 border-0 cursor-pointer shrink-0"
                                        >
                                            Set
                                        </button>
                                    </form>
                                    <button
                                        onClick={() => { detectGPS(false); }}
                                        disabled={locLoading}
                                        className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 border-0 cursor-pointer disabled:opacity-60"
                                        title="Detect location"
                                    >
                                        {locLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                                    </button>
                                </div>
                                {locError && <p className="text-[11px] text-red-500 font-medium mt-1.5">{locError}</p>}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {QUICK_PICKS.slice(0, 4).map(place => (
                                        <button
                                            key={place}
                                            onClick={() => { saveLocation(place); setMobileOpen(false); }}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-colors ${
                                                locationName === place
                                                    ? 'bg-[#1a1f2e] dark:bg-emerald-600 text-white border-[#1a1f2e] dark:border-emerald-600'
                                                    : 'bg-white dark:bg-[#1e293b] text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                                            }`}
                                        >
                                            {place}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile theme toggle */}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-transparent border-0 w-full text-left"
                            >
                                {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
                                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            </button>

                            <Link to="/" className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors ${isActive('/') ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400'}`}>
                                <HomeIcon size={18} /> Explore
                            </Link>
                            <Link to="/courts" className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors ${isActive('/courts') ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400'}`}>
                                <MapIcon size={18} /> Map
                            </Link>
                            {currentUser && (
                                <Link to="/my-bookings" className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors ${isActive('/my-bookings') ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400'}`}>
                                    <Calendar size={18} /> Bookings
                                </Link>
                            )}
                            <Link to={currentUser ? "/profile" : "/login"} className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors ${isActive('/profile') ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400'}`}>
                                <User size={18} /> Profile
                            </Link>

                            <div className="pt-4 mt-3 border-t border-gray-100 dark:border-slate-800">
                                {currentUser ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 px-3 py-2 border border-gray-100 dark:border-slate-800 rounded-xl mb-3 bg-gray-50 dark:bg-[#0f172a]">
                                            <Avatar size={40} border={false} />
                                            <div className="min-w-0">
                                                <p className="text-[14px] font-bold text-gray-900 dark:text-white truncate m-0">
                                                    {currentUser?.user_metadata?.full_name || 'User'}
                                                </p>
                                                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate m-0 font-medium tracking-wide border-0">
                                                    {currentUser.email}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border border-gray-100 dark:border-slate-700"
                                        >
                                            <User size={18} /> Manage Profile
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <Link to="/login" className="flex-1 text-center py-3 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                            Login
                                        </Link>
                                        <Link to="/register" className="flex-1 text-center py-3 rounded-xl text-sm font-bold text-white bg-[#1a1f2e] dark:bg-emerald-600 hover:bg-black dark:hover:bg-emerald-700 transition-colors">
                                            Sign Up
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Page Content */}
            <div className="min-h-screen">
                <Outlet />
            </div>
        </>
    );
}
