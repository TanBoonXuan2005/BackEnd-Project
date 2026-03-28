import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { AuthContext } from "../components/AuthProvider";
import {
  Map as MapIcon,
  MapPin,
  Mic,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Star,
  SlidersHorizontal,
  Heart,
  Loader2,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

// ── Fallback image for courts missing a photo ──
const FALLBACK_IMG = "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=70&auto=format&fit=crop";

// ── Generate 30-min time slots between open/close ──
function generatePanelSlots(open = "08:00", close = "22:00") {
  const slots = [];
  let [h, m] = open.split(":").map(Number);
  const [endH, endM] = close.split(":").map(Number);
  while (h * 60 + m < endH * 60 + endM) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return slots;
}

const FILTERS = ['All', 'Indoor', 'AC', 'Wooden Floor', 'Coaching'];
const CAROUSEL_SIZE = 3;

export default function Home() {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  // ── Data ──
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Browse / Search ──
  const [showManualBrowse, setShowManualBrowse] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // ── Filters & Carousel ──
  const [activeFilter, setActiveFilter] = useState('All');
  const [carouselStart, setCarouselStart] = useState(0);
  const [favorites, setFavorites] = useState(new Set());

  // ── Booking Panel ──
  const [isBookingPanelOpen, setIsBookingPanelOpen] = useState(false);
  const [selectedPanelCourt, setSelectedPanelCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingDone, setBookingDone] = useState(false);

  // ── Dynamic dates for booking panel ──
  const panelDates = useMemo(() => {
    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return {
        key: d.toISOString().split("T")[0],
        d: String(d.getDate()),
        month: d.toLocaleString('default', { month: 'short' }),
        day: i === 0 ? 'Today' : dayNames[d.getDay()],
      };
    });
  }, []);

  // ── Time slots for selected court ──
  const panelSlots = useMemo(() => {
    if (!selectedPanelCourt) return [];
    return generatePanelSlots(
      selectedPanelCourt.opening_hours ?? "08:00",
      selectedPanelCourt.close_hours   ?? "22:00"
    );
  }, [selectedPanelCourt]);

  // ── Fetch courts ──
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const { data, error } = await supabase.from('courts').select('*');
        if (error) throw error;
        const mapped = data.map(c => ({
          ...c,
          price: c.price_per_hour,
          image: c.cover_image || c.image_url || FALLBACK_IMG,
        }));
        setCourts(mapped);
      } catch (err) {
        console.error("Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCourts();
  }, []);

  // ── Derived display data ──
  const displayCourts = searchResults ?? courts;

  const filteredDisplayCourts = useMemo(() => {
    if (activeFilter === 'All') return displayCourts;
    return displayCourts.filter(c => {
      const blob = JSON.stringify(c).toLowerCase();
      return blob.includes(activeFilter.toLowerCase());
    });
  }, [displayCourts, activeFilter]);

  const canPrev = carouselStart > 0;
  const canNext = carouselStart + CAROUSEL_SIZE < courts.length;
  const visibleFeatured = courts.slice(carouselStart, carouselStart + CAROUSEL_SIZE);

  // ── Search handler (accepts optional direct query) ──
  const handleSearchClick = async (queryOverride) => {
    const query = queryOverride ?? searchInput;
    if (!query.trim() && !showManualBrowse) return;

    setIsSearching(true);
    try {
      await new Promise(r => setTimeout(r, 600));

      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .or(`name.ilike.%${query}%,location.ilike.%${query}%`);

      if (error) throw error;

      const mapped = (data || []).map(c => ({
        ...c,
        price: c.price_per_hour,
        image: c.cover_image || c.image_url || FALLBACK_IMG,
      }));
      setSearchResults(mapped.length > 0 ? mapped : null);
      setShowManualBrowse(true);
      setSearchInput("");
      setActiveFilter('All');
    } catch (err) {
      console.error("Search failed:", err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Smart prompt filters (client-side) ──
  const handlePromptClick = (prompt) => {
    setShowManualBrowse(true);
    setActiveFilter('All');
    let filtered;
    if (prompt === "Cheapest under RM20") {
      filtered = courts.filter(c => (c.price_per_hour ?? c.price ?? 99) < 20);
    } else if (prompt === "Highly rated nearby") {
      filtered = [...courts].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (prompt === "Indoor with AC") {
      filtered = courts.filter(c =>
        JSON.stringify(c).toLowerCase().match(/indoor|ac|air.?con/)
      );
    } else {
      // "Nearest available now" — show all
      filtered = courts;
    }
    setSearchResults(filtered.length > 0 ? filtered : courts);
  };

  // ── Booking panel ──
  const openBookingPanel = (court) => {
    setSelectedPanelCourt(court);
    setSelectedSlots(new Set());
    setBookingError('');
    setBookingDone(false);
    setIsBookingPanelOpen(true);
  };

  const closeBookingPanel = () => {
    setIsBookingPanelOpen(false);
    setSelectedPanelCourt(null);
    setSelectedSlots(new Set());
    setBookingError('');
    setBookingDone(false);
  };

  const toggleSlot = (slot) => {
    setSelectedSlots(prev => {
      const next = new Set(prev);
      next.has(slot) ? next.delete(slot) : next.add(slot);
      return next;
    });
  };

  const toggleFavorite = (e, courtId) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(courtId) ? next.delete(courtId) : next.add(courtId);
      return next;
    });
  };

  const handleBookingSubmit = async () => {
    if (!currentUser) {
      closeBookingPanel();
      navigate('/login');
      return;
    }
    if (selectedSlots.size === 0) return;

    setBookingLoading(true);
    setBookingError('');
    try {
      const slotsArr = Array.from(selectedSlots).sort();
      const start_time = slotsArr[0] + ":00";
      const lastSlot = slotsArr[slotsArr.length - 1];
      const [h, m] = lastSlot.split(":").map(Number);
      const endM = m + 30;
      const end_time = `${String(endM >= 60 ? h + 1 : h).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}:00`;

      const { error } = await supabase.from('bookings').insert([{
        user_id: currentUser.id,
        court_id: selectedPanelCourt.id,
        booking_date: selectedDate,
        start_time,
        end_time,
        total_price: selectedSlots.size * 0.5 * (selectedPanelCourt.price_per_hour || selectedPanelCourt.price),
        status: 'confirmed',
      }]);

      if (error) throw error;

      setBookingDone(true);
      setTimeout(() => closeBookingPanel(), 2200);
    } catch (err) {
      setBookingError(err.message || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const totalPrice = selectedSlots.size * 0.5 * (selectedPanelCourt?.price_per_hour || selectedPanelCourt?.price || 0);

  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fafafb] dark:bg-[#0f172a] font-sans text-gray-900 dark:text-white selection:bg-emerald-200 flex flex-col transition-colors duration-300">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center relative pb-20">

        {/* ══ Hero / Search ══ */}
        <section className={`w-full flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          showManualBrowse ? 'pt-12 sm:pt-16 pb-6' : 'flex-1 justify-center pt-8 pb-32 mb-10'
        }`}>
          <div className={`w-full max-w-[800px] relative group px-2 sm:px-0 transition-transform duration-700 ease-out origin-top ${
            showManualBrowse ? 'scale-100' : 'scale-[1.03] sm:scale-[1.08]'
          }`}>
            <div className="absolute -inset-2 bg-gradient-to-br from-emerald-100/40 to-teal-50/40 rounded-[3rem] blur-2xl opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="relative w-full bg-white dark:bg-[#1e293b] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-7 flex flex-col shadow-[0_8px_40px_rgb(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-900/5">
              <textarea
                className="w-full bg-transparent border-none outline-none resize-none text-[20px] sm:text-[22px] font-semibold text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 placeholder:font-medium leading-relaxed h-[80px] sm:h-[100px]"
                placeholder='Ask AI: "Book an indoor court near KLCC tonight..."'
                autoFocus
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchClick(); } }}
              />
              <div className="flex items-center justify-between mt-2">
                <button className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#1e293b] flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 transition-all border border-gray-100 dark:border-slate-700">
                  <Mic size={22} fill="currentColor" className="text-gray-300" />
                </button>
                <button
                  onClick={() => handleSearchClick()}
                  disabled={isSearching}
                  className="flex items-center gap-2 bg-[#71eaba] hover:bg-[#5edad5] disabled:bg-[#a6ecce] text-white px-7 sm:px-8 py-3 rounded-full font-bold text-[16px] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg shadow-emerald-400/30"
                >
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="fill-white" />}
                  <span>{isSearching ? 'Processing...' : 'Search'}</span>
                </button>
              </div>
            </div>
          </div>

          {!showManualBrowse && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000 delay-150 fill-mode-both w-full">
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 mt-12 sm:mt-16 w-full px-4">
                {["Nearest available now", "Cheapest under RM20", "Indoor with AC", "Highly rated nearby"].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handlePromptClick(prompt)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 shadow-sm text-[13px] font-bold text-gray-500 dark:text-slate-400 transition-all duration-300 hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 w-full sm:w-auto hover:-translate-y-0.5"
                  >
                    <Sparkles size={14} className="text-[#71eaba] shrink-0 fill-current" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
              <div className="mt-20">
                <button
                  onClick={() => setShowManualBrowse(true)}
                  className="flex items-center gap-1.5 text-gray-400 font-bold text-[15px] hover:text-gray-700 transition-colors"
                >
                  Prefer browsing manually? <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ══ Manual Browse Content ══ */}
        {showManualBrowse && (
          <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]">

            {/* ── Featured Courts ── */}
            <section className="mb-14">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <span className="text-2xl">🔥</span> Featured Courts
                  {loading && <Loader2 size={16} className="animate-spin text-gray-300 ml-1" />}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCarouselStart(s => Math.max(0, s - 1))}
                    disabled={!canPrev}
                    className="w-9 h-9 rounded-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCarouselStart(s => s + 1)}
                    disabled={!canNext}
                    className="w-9 h-9 rounded-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-full aspect-video rounded-3xl bg-gray-100 dark:bg-[#1e293b] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {visibleFeatured.map(court => (
                    <div
                      key={court.id}
                      onClick={() => openBookingPanel(court)}
                      className="group relative w-full aspect-[16/10] sm:aspect-video rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gray-200"
                    >
                      <img
                        src={court.image}
                        alt={court.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-4 right-4 bg-white px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                        <Star size={12} className="text-orange-400 fill-orange-400" />
                        <span className="text-[13px] font-bold text-gray-900">{court.rating ?? "New"}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-white font-bold text-[17px] leading-tight">{court.name}</h3>
                          <p className="text-white/80 text-[13px] font-medium">{court.location}</p>
                        </div>
                        <div className="bg-[#1fc6a1] text-white px-2.5 py-1 rounded-md text-[13px] font-bold shadow-sm whitespace-nowrap">
                          RM {court.price}/hr
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Carousel dots */}
              {courts.length > CAROUSEL_SIZE && (
                <div className="flex justify-center gap-1.5 mt-4">
                  {Array.from({ length: Math.ceil(courts.length / CAROUSEL_SIZE) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselStart(i * CAROUSEL_SIZE)}
                      className={`h-1.5 rounded-full transition-all ${
                        Math.floor(carouselStart / CAROUSEL_SIZE) === i
                          ? 'w-6 bg-[#1fc6a1]'
                          : 'w-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Browse All Courts ── */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Browse All Courts</h2>
                <button
                  onClick={() => navigate('/courts')}
                  className="flex items-center gap-1.5 text-[#1fc6a1] bg-[#eefbfa] px-3 py-1.5 rounded-[10px] font-bold text-[13px] transition-colors hover:bg-[#dff6f2]"
                >
                  <MapIcon size={16} strokeWidth={2.5} /> Map View
                </button>
              </div>

              {/* Filter chips */}
              <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-6">
                <button className="flex items-center gap-2 border border-gray-200 dark:border-slate-700 px-4 py-2 rounded-full text-sm font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex-shrink-0 transition-colors">
                  <SlidersHorizontal size={16} /> Filters
                </button>
                {FILTERS.map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-5 py-2 rounded-full text-sm font-bold flex-shrink-0 transition-all ${
                      activeFilter === filter
                        ? 'bg-gray-900 dark:bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-white dark:bg-[#1e293b] rounded-[1.5rem] overflow-hidden shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
                      <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-[#1e293b] animate-pulse" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredDisplayCourts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1e293b] rounded-[2rem] border border-dashed border-gray-200 dark:border-slate-700">
                  <MapPin size={40} className="text-gray-300 dark:text-slate-600 mb-4" />
                  <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1">No courts found</h4>
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-4">Try a different filter or clear your search.</p>
                  <button
                    onClick={() => { setActiveFilter('All'); setSearchResults(null); }}
                    className="px-5 py-2 bg-[#1fc6a1] text-white text-sm font-bold rounded-full hover:bg-[#19b090] transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDisplayCourts.map(court => (
                    <div
                      key={court.id}
                      onClick={() => openBookingPanel(court)}
                      className="group bg-white dark:bg-[#1e293b] rounded-[1.5rem] border border-gray-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-none hover:border-gray-200 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden pb-4 shadow-sm dark:shadow-none flex flex-col"
                    >
                      <div className="relative w-full aspect-[4/3] bg-gray-100 mb-4 overflow-hidden rounded-t-[1.5rem]">
                        <img
                          src={court.image}
                          alt={court.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
                        />
                        <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Star size={12} className="text-orange-400 fill-orange-400" />
                          <span className="text-[12px] font-bold text-gray-900">
                            {court.rating ?? "New"}
                            {court.reviews != null && <span className="text-gray-400 font-medium"> ({court.reviews})</span>}
                          </span>
                        </div>
                        <button
                          onClick={(e) => toggleFavorite(e, court.id)}
                          className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow-sm transition-colors"
                        >
                          <Heart
                            size={16}
                            className={favorites.has(court.id) ? "text-red-500 fill-red-500" : "text-gray-300"}
                          />
                        </button>
                        {court.price_per_hour != null && (
                          <div className="absolute bottom-3 left-3 bg-[#1a1f2e] text-white text-[10px] font-bold px-2 py-1 rounded-[6px] tracking-wider">
                            RM {court.price_per_hour}/hr
                          </div>
                        )}
                      </div>
                      <div className="px-4">
                        <h3 className="font-bold text-gray-900 dark:text-white text-[16px] mb-1 line-clamp-1 group-hover:text-[#1fc6a1] transition-colors">{court.name}</h3>
                        <p className="text-gray-500 dark:text-slate-400 text-[13px] font-medium flex items-center gap-1">
                          <MapPin size={14} className="text-gray-400 dark:text-slate-500 shrink-0" /> {court.location || "Location not specified"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* ══ Booking Panel (Slide-over) ══ */}
      {isBookingPanelOpen && selectedPanelCourt && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0 cursor-pointer" onClick={closeBookingPanel} />
          <div className="relative w-full sm:w-[480px] h-[92vh] sm:h-full mt-auto sm:mt-0 bg-white dark:bg-[#1e293b] rounded-t-[2.5rem] sm:rounded-none sm:rounded-l-[2.5rem] shadow-2xl dark:shadow-none flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">

            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#1e293b] z-10 shrink-0">
              <div>
                <h3 className="font-black text-xl text-gray-900 dark:text-white leading-tight">{selectedPanelCourt.name}</h3>
                <p className="text-[13px] font-bold text-gray-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin size={12} /> {selectedPanelCourt.location || "Location not specified"}
                </p>
              </div>
              <button onClick={closeBookingPanel} className="w-9 h-9 bg-gray-50 dark:bg-[#1e293b] rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* ── Success Screen ── */}
            {bookingDone ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-[#eefbfa] rounded-full flex items-center justify-center mb-5">
                  <CheckCircle2 size={42} className="text-[#1fc6a1]" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Booking Confirmed!</h3>
                <p className="text-gray-500 dark:text-slate-400 font-medium text-[15px] mb-1">{selectedPanelCourt.name}</p>
                <p className="text-gray-400 dark:text-slate-500 text-[13px]">{selectedDate} · {Array.from(selectedSlots).sort().join(", ")}</p>
                <div className="mt-6 px-6 py-3 bg-[#eefbfa] rounded-2xl">
                  <p className="text-[#1fc6a1] font-black text-2xl">RM {totalPrice.toFixed(0)}</p>
                  <p className="text-[#1fc6a1]/70 text-[12px] font-bold">Total paid</p>
                </div>
                <p className="text-gray-400 text-[12px] mt-6">Closing automatically…</p>
              </div>
            ) : (
              <>
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#fafafb] dark:bg-[#0f172a] space-y-6">

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-gray-400 dark:text-slate-500 text-[11px] font-black tracking-widest uppercase">Starting at</span>
                    <span className="text-4xl font-black text-gray-900 dark:text-white ml-1">RM {selectedPanelCourt.price ?? selectedPanelCourt.price_per_hour}</span>
                    <span className="text-sm font-bold text-gray-400 dark:text-slate-500">/hr</span>
                  </div>

                  {/* Date */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">Date</h3>
                    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                      {panelDates.map(dt => {
                        const active = selectedDate === dt.key;
                        return (
                          <button
                            key={dt.key}
                            onClick={() => { setSelectedDate(dt.key); setSelectedSlots(new Set()); }}
                            className={`flex flex-col items-center justify-center min-w-[68px] rounded-[14px] px-2 py-2.5 transition-all outline-none border-2 shrink-0 ${
                              active ? "border-[#1fc6a1] bg-[#eefbfa] dark:bg-emerald-900/30" : "border-gray-100 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-gray-500 dark:text-slate-400 hover:border-gray-200 dark:hover:border-slate-600"
                            }`}
                          >
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-[#1fc6a1]" : ""}`}>{dt.day}</span>
                            <span className={`text-[20px] font-black leading-tight my-0.5 ${active ? "text-[#1fc6a1]" : "text-gray-900"}`}>{dt.d}</span>
                            <span className={`text-[10px] font-semibold ${active ? "text-[#1fc6a1]" : "text-gray-400"}`}>{dt.month}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Time</h3>
                      {selectedSlots.size > 0 && (
                        <span className="text-[11px] font-bold text-[#1fc6a1]">{selectedSlots.size * 0.5} hrs selected</span>
                      )}
                    </div>
                    {panelSlots.length === 0 ? (
                      <p className="text-sm text-gray-400 font-medium">No slots available.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {panelSlots.map(slot => {
                          const isSelected = selectedSlots.has(slot);
                          return (
                            <button
                              key={slot}
                              onClick={() => toggleSlot(slot)}
                              className={`rounded-[10px] py-2.5 text-[13px] font-bold text-center transition-all border-2 ${
                                isSelected
                                  ? "bg-[#1fc6a1] text-white border-[#1fc6a1] shadow-md shadow-[#1fc6a1]/30"
                                  : "bg-white dark:bg-[#1e293b] text-gray-600 dark:text-slate-400 border-gray-100 dark:border-slate-700 hover:border-[#1fc6a1] hover:text-[#1fc6a1] dark:hover:border-[#1fc6a1] dark:hover:text-[#1fc6a1]"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {bookingError && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium px-4 py-3 rounded-xl">
                      <AlertCircle size={16} className="shrink-0 mt-px" />
                      <span>{bookingError}</span>
                    </div>
                  )}
                </div>

                {/* Sticky Footer */}
                <div className="p-6 bg-white dark:bg-[#1e293b] border-t border-gray-100 dark:border-slate-800 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-none shrink-0">
                  {selectedSlots.size > 0 && (
                    <div className="flex items-center justify-between mb-4 animate-in slide-in-from-bottom-2">
                      <div>
                        <p className="text-gray-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total</p>
                        <p className="text-2xl font-black text-[#1fc6a1]">RM {totalPrice.toFixed(0)}</p>
                      </div>
                      <p className="text-gray-400 text-[12px] font-medium text-right">
                        {selectedSlots.size} slot{selectedSlots.size > 1 ? 's' : ''}<br />
                        {selectedSlots.size * 0.5} hr{selectedSlots.size * 0.5 > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleBookingSubmit}
                    disabled={selectedSlots.size === 0 || bookingLoading}
                    className={`w-full font-bold py-4 rounded-[1.2rem] text-[16px] transition-all duration-300 flex items-center justify-center gap-2 ${
                      selectedSlots.size > 0
                        ? "bg-[#1a1f2e] text-white hover:bg-black shadow-[0_8px_20px_rgb(26,31,46,0.3)] cursor-pointer"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {bookingLoading ? <Loader2 size={20} className="animate-spin" /> : "Confirm Booking"}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider font-extrabold text-gray-400 mt-4">
                    <Zap size={14} className="text-orange-400 fill-orange-400" /> Instant confirmation
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <FloatingActionButtons onAIClick={() => { setShowManualBrowse(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    </div>
  );
}

const FloatingActionButtons = ({ onAIClick }) => (
  <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 flex flex-col items-center gap-3 z-50">
    <button
      onClick={onAIClick}
      title="AI Search"
      className="w-14 h-14 bg-[#1a1f2e] rounded-[16px] flex items-center justify-center shadow-xl transition-all hover:scale-105 hover:bg-black border border-gray-800 group"
    >
      <Sparkles size={24} className="text-[#1fc6a1] fill-[#1fc6a1]" />
    </button>
    <Link to="/my-bookings">
      <button
        title="My Bookings"
        className="w-8 h-8 bg-[#1a1f2e] rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 border border-gray-800"
      >
        <Calendar size={14} className="text-white" />
      </button>
    </Link>
  </div>
);
