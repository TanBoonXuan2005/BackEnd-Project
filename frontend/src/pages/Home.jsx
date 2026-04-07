import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { AuthContext } from "../components/AuthProvider";
import {
  MapPin,
  Sparkles,
  ChevronRight,
  Star,
  SlidersHorizontal,
  Heart,
  Loader2,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  Share2,
  Mail,
  Check,
} from 'lucide-react';

const FALLBACK_IMG = "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=70&auto=format&fit=crop";

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

const LISTING_FILTERS = ['Top Rated', 'Near Me', 'Indoor', 'Air Conditioned', 'Wooden Floor'];

export default function Home() {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showListing, setShowListing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [favorites, setFavorites] = useState(new Set());

  // Booking panel
  const [isBookingPanelOpen, setIsBookingPanelOpen] = useState(false);
  const [selectedPanelCourt, setSelectedPanelCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingDone, setBookingDone] = useState(false);

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

  const panelSlots = useMemo(() => {
    if (!selectedPanelCourt) return [];
    return generatePanelSlots(
      selectedPanelCourt.opening_hours ?? "08:00",
      selectedPanelCourt.close_hours ?? "22:00"
    );
  }, [selectedPanelCourt]);

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const { data, error } = await supabase.from('courts').select('*');
        if (error) throw error;
        setCourts(data.map(c => ({
          ...c,
          price: c.price_per_hour,
          image: c.cover_image || c.image_url || FALLBACK_IMG,
        })));
      } catch (err) {
        console.error("Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCourts();
  }, []);

  const displayCourts = searchResults ?? courts;
  const filteredDisplayCourts = useMemo(() => {
    if (activeFilter === 'All') return displayCourts;
    return displayCourts.filter(c => {
      const blob = JSON.stringify(c).toLowerCase();
      return blob.includes(activeFilter.toLowerCase());
    });
  }, [displayCourts, activeFilter]);

  const featuredCourts = courts.slice(0, 3);

  const handleSearchClick = async (queryOverride) => {
    const query = queryOverride ?? searchInput;
    if (!query.trim() && !showListing) return;

    setIsSearching(true);
    try {
      await new Promise(r => setTimeout(r, 500));
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
      setShowListing(true);
      setSearchInput("");
      setActiveFilter('All');
    } catch (err) {
      console.error("Search failed:", err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePromptClick = (prompt) => {
    setShowListing(true);
    setActiveFilter('All');
    let filtered;
    if (prompt === "Cheapest") {
      filtered = [...courts].sort((a, b) => (a.price_per_hour ?? 99) - (b.price_per_hour ?? 99));
    } else if (prompt === "Indoor with AC") {
      filtered = courts.filter(c => JSON.stringify(c).toLowerCase().match(/indoor|ac|air.?con/));
    } else if (prompt === "Nearest available") {
      filtered = courts;
    } else {
      filtered = courts;
    }
    setSearchResults(filtered.length > 0 ? filtered : courts);
  };

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
    if (!currentUser) { closeBookingPanel(); navigate('/login'); return; }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (!showListing) {
    // ── INITIAL DISCOVER PAGE ──
    return (
      <div className="min-h-screen bg-[#fafafb] dark:bg-[#0f172a] flex flex-col">

        {/* ── Hero ── */}
        <section className="w-full bg-gradient-to-b from-[#0d1117] to-[#141c2b] pt-28 pb-20 sm:pt-36 sm:pb-28 text-center relative overflow-hidden">
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#1fc6a1] text-[12px] font-bold uppercase tracking-widest mb-8">
              <Zap size={12} className="fill-current" /> BadmintonPro AI
            </span>

            <h1 className="text-[40px] sm:text-[56px] lg:text-[64px] font-black text-white leading-[1.05] tracking-tight mb-6">
              Elevate your{' '}
              <span className="font-heading italic text-[#1fc6a1]">game</span>
              <br />through intelligence.
            </h1>

            <p className="text-gray-400 text-[16px] sm:text-[18px] font-medium max-w-lg mx-auto mb-10 leading-relaxed">
              The world's first AI-concierge for professional badminton court bookings. Precise, agile, and always available.
            </p>

            {/* Search Bar */}
            <div className="max-w-[640px] mx-auto">
              <div className="relative flex items-center bg-white dark:bg-[#1e293b] rounded-full p-1.5 pl-5 shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-white/10">
                <Sparkles size={18} className="text-[#1fc6a1] shrink-0 mr-3" />
                <input
                  type="text"
                  placeholder="Ask AI to find a court..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchClick(); } }}
                  className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-slate-100 text-[15px] font-medium placeholder:text-gray-400 dark:placeholder:text-slate-500 py-2"
                />
                <button
                  onClick={() => handleSearchClick()}
                  disabled={isSearching}
                  className="flex items-center gap-2 bg-[#1fc6a1] hover:bg-[#1ab895] disabled:bg-[#a6ecce] text-white px-6 py-2.5 rounded-full font-bold text-[14px] transition-all shrink-0"
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Search
                </button>
              </div>
            </div>

            {/* Quick filter chips */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
              {["Nearest available", "Cheapest", "Indoor with AC", "Olympic Grade"].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white/80 text-[13px] font-semibold hover:bg-white/20 hover:text-white transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Sanctuaries ── */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-[#1fc6a1] mb-1">Curated Selection</p>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Featured Sanctuaries</h2>
            </div>
            <button
              onClick={() => setShowListing(true)}
              className="flex items-center gap-1 text-[#1fc6a1] text-[14px] font-bold hover:underline"
            >
              Explore all courts <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
              <div className="h-[400px] rounded-3xl bg-gray-100 dark:bg-[#1e293b] animate-pulse" />
              <div className="space-y-6">
                <div className="h-[188px] rounded-2xl bg-gray-100 dark:bg-[#1e293b] animate-pulse" />
                <div className="h-[188px] rounded-2xl bg-gray-100 dark:bg-[#1e293b] animate-pulse" />
              </div>
            </div>
          ) : featuredCourts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
              {/* Large feature card */}
              <div
                onClick={() => openBookingPanel(featuredCourts[0])}
                className="group relative h-[400px] rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <img
                  src={featuredCourts[0].image}
                  alt={featuredCourts[0].name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute top-5 left-5">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-[11px] font-bold uppercase tracking-wider">
                    Premium Venue
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-white font-black text-[24px] leading-tight mb-1">{featuredCourts[0].name}</h3>
                  <p className="text-white/70 text-[14px] font-medium mb-3">{featuredCourts[0].description || `Professional facility at ${featuredCourts[0].location}`}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {featuredCourts[0].rating && (
                        <span className="flex items-center gap-1 text-white/90 text-[13px] font-bold">
                          <Star size={14} className="text-orange-400 fill-orange-400" />
                          {featuredCourts[0].rating}
                        </span>
                      )}
                      <span className="text-white/60 text-[13px] font-medium flex items-center gap-1">
                        <MapPin size={12} /> {featuredCourts[0].location}
                      </span>
                    </div>
                    <span className="text-white font-black text-[18px]">
                      RM {featuredCourts[0].price}<span className="text-white/50 text-[13px] font-bold">/hr</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side smaller cards */}
              <div className="flex flex-col gap-6">
                {featuredCourts.slice(1, 3).map(court => (
                  <div
                    key={court.id}
                    onClick={() => openBookingPanel(court)}
                    className="group flex gap-5 bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#0f172a] flex items-center justify-center shrink-0">
                      <MapPin size={24} className="text-[#1fc6a1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-[16px] mb-1 truncate">{court.name}</h4>
                      <p className="text-gray-500 dark:text-slate-400 text-[13px] font-medium mb-3 line-clamp-2">{court.description || `${court.location} · Premium facilities`}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-gray-900 dark:text-white text-[15px]">
                          RM {court.price}<span className="text-gray-400 dark:text-slate-500 text-[12px] font-bold">/hr</span>
                        </span>
                        {court.rating && (
                          <span className="flex items-center gap-1 text-[12px] font-bold text-gray-500 dark:text-slate-400">
                            <Star size={12} className="text-orange-400 fill-orange-400" />
                            {court.rating}
                            {court.reviews != null && <span className="text-gray-400 dark:text-slate-500">({court.reviews})</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1e293b] rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
              <MapPin size={40} className="text-gray-300 dark:text-slate-600 mb-4" />
              <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1">No courts yet</h4>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Courts will appear here once added.</p>
            </div>
          )}
        </section>

        {/* ── Your Invisible Concierge ── */}
        <section className="w-full bg-white dark:bg-[#1e293b]/50 border-y border-gray-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-4">
                  Your Invisible{' '}
                  <span className="font-heading italic text-[#1fc6a1]">Concierge.</span>
                </h2>
                <p className="text-gray-500 dark:text-slate-400 text-[16px] leading-relaxed mb-8 max-w-md">
                  Stop scrolling through calendars. Simply tell BadmintonPro AI when you want to play and what you care about. We'll handle the rest.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    "Natural language booking engine",
                    "Instant cancellation management",
                    "Waitlist priority via AI prediction",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1fc6a1] flex items-center justify-center shrink-0">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                      <span className="text-[14px] font-semibold text-gray-700 dark:text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowListing(true)}
                  className="inline-flex items-center gap-2 bg-[#0d1117] dark:bg-[#1fc6a1] text-white px-6 py-3 rounded-full font-bold text-[14px] hover:bg-black dark:hover:bg-[#1ab895] transition-all shadow-lg"
                >
                  <Sparkles size={16} className="fill-current" /> Ask AI to Book
                </button>
              </div>

              {/* Chat mockup */}
              <div className="bg-[#0d1117] rounded-3xl p-6 shadow-2xl max-w-md mx-auto lg:mx-0 w-full">
                <div className="flex items-center gap-1.5 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-4">
                  <div className="bg-[#1e293b] rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                    <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                      "Find me a court near downtown for 7 PM tonight with AC, under $40."
                    </p>
                  </div>
                  <div className="bg-[#1e293b] rounded-2xl rounded-tl-md px-4 py-3 max-w-[90%] border border-emerald-500/20">
                    <p className="text-[11px] font-bold text-[#1fc6a1] uppercase tracking-wider mb-1.5">Assistant</p>
                    <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                      I found 3 options. The <span className="text-white font-bold">Emerald City Courts</span> fits perfectly (RM 32) and has a slot from 7 PM to 9 PM. Shall I reserve court 4 for you?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="w-full bg-[#fafafb] dark:bg-[#0f172a] border-t border-gray-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-[16px] mb-2">BadmintonPro</h3>
                <p className="text-[13px] text-gray-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs">
                  Transforming sport accessibility through artificial intelligence and premium spatial design.
                </p>
                <p className="text-[12px] text-gray-400 dark:text-slate-600 mt-4">&copy; {new Date().getFullYear()} BadmintonPro. All rights reserved.</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-[13px] uppercase tracking-wider mb-3">Company</h4>
                <div className="space-y-2">
                  {["Privacy Policy", "Terms of Service", "Help Center", "Contact Support"].map(link => (
                    <p key={link} className="text-[13px] text-gray-500 dark:text-slate-400 font-medium hover:text-[#1fc6a1] cursor-pointer transition-colors">{link}</p>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-[13px] uppercase tracking-wider mb-3">Connect</h4>
                <div className="flex items-center gap-3">
                  {[Share2, Mail].map((Icon, i) => (
                    <div key={i} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1e293b] flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-[#1fc6a1] hover:text-white transition-colors cursor-pointer">
                      <Icon size={16} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COURT LISTING PAGE (after search or "select manually")
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#fafafb] dark:bg-[#0f172a] flex flex-col">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] sm:text-[42px] font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-2">
            Find your <span className="font-heading italic text-[#1fc6a1]">Perfect Game</span>
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-500 dark:text-slate-400 text-[15px] font-medium">
              AI is analyzing {courts.length} nearby venues to match your playing style.
            </p>
            <div className="hidden sm:flex items-center gap-3">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700 text-[13px] font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <SlidersHorizontal size={14} /> Filters
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700 text-[13px] font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <Calendar size={14} /> Date & Time
              </button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center bg-white dark:bg-[#1e293b] rounded-full p-1.5 pl-5 shadow-sm border border-gray-200 dark:border-slate-700 mb-6 max-w-3xl">
          <Sparkles size={18} className="text-[#1fc6a1] shrink-0 mr-3" />
          <input
            type="text"
            placeholder="e.g., 'A professional court near me with cooling facilities for tomorrow 6pm'"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchClick(); } }}
            className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-slate-100 text-[14px] font-medium placeholder:text-gray-400 dark:placeholder:text-slate-500 py-2"
          />
          <button
            onClick={() => handleSearchClick()}
            disabled={isSearching}
            className="flex items-center gap-2 bg-[#1fc6a1] hover:bg-[#1ab895] disabled:bg-[#a6ecce] text-white px-5 py-2.5 rounded-full font-bold text-[13px] transition-all shrink-0"
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            Find Match
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-8 hide-scrollbar">
          {LISTING_FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(activeFilter === filter ? 'All' : filter)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold shrink-0 transition-all border ${
                activeFilter === filter
                  ? 'bg-[#1fc6a1] text-white border-[#1fc6a1] shadow-sm'
                  : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-[#1fc6a1] hover:text-[#1fc6a1]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Court grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white dark:bg-[#1e293b] rounded-[1.5rem] overflow-hidden shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
                <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-[#0f172a] animate-pulse" />
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
                className="group bg-white dark:bg-[#1e293b] rounded-[1.5rem] border border-gray-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-none hover:border-gray-200 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden shadow-sm dark:shadow-none flex flex-col"
              >
                <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-[#0f172a] overflow-hidden">
                  <img
                    src={court.image}
                    alt={court.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
                  />
                  <div className="absolute top-3 left-3 bg-white dark:bg-[#1e293b] px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Star size={12} className="text-orange-400 fill-orange-400" />
                    <span className="text-[12px] font-bold text-gray-900 dark:text-white">
                      {court.rating ?? "New"}
                      {court.reviews != null && <span className="text-gray-400 dark:text-slate-500 font-medium"> ({court.reviews})</span>}
                    </span>
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(e, court.id)}
                    className="absolute top-3 right-3 bg-white dark:bg-[#1e293b] p-1.5 rounded-full shadow-sm transition-colors"
                  >
                    <Heart
                      size={16}
                      className={favorites.has(court.id) ? "text-red-500 fill-red-500" : "text-gray-300 dark:text-slate-500"}
                    />
                  </button>
                  {court.price_per_hour != null && (
                    <div className="absolute bottom-3 left-3 bg-[#0d1117] text-white text-[10px] font-bold px-2 py-1 rounded-[6px] tracking-wider">
                      RM {court.price_per_hour}/hr
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-[16px] mb-1 line-clamp-1 group-hover:text-[#1fc6a1] transition-colors">{court.name}</h3>
                  <p className="text-gray-500 dark:text-slate-400 text-[13px] font-medium flex items-center gap-1">
                    <MapPin size={14} className="text-gray-400 dark:text-slate-500 shrink-0" /> {court.location || "Location not specified"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#fafafb] dark:bg-[#0f172a] border-t border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="font-black text-gray-900 dark:text-white text-[16px] mb-2">BadmintonPro</h3>
              <p className="text-[13px] text-gray-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs">
                Elevating your game through intelligent booking and athletic analysis. The future of badminton starts here.
              </p>
              <p className="text-[12px] text-gray-400 dark:text-slate-600 mt-4">&copy; {new Date().getFullYear()} BadmintonPro. All rights reserved.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-[13px] uppercase tracking-wider mb-3">Platform</h4>
              <div className="space-y-2">
                {["Privacy Policy", "Terms of Service"].map(link => (
                  <p key={link} className="text-[13px] text-gray-500 dark:text-slate-400 font-medium hover:text-[#1fc6a1] cursor-pointer transition-colors">{link}</p>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-[13px] uppercase tracking-wider mb-3">Support</h4>
              <div className="space-y-2">
                {["Help Center", "Contact Support"].map(link => (
                  <p key={link} className="text-[13px] text-gray-500 dark:text-slate-400 font-medium hover:text-[#1fc6a1] cursor-pointer transition-colors">{link}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>

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
              <button onClick={closeBookingPanel} className="w-9 h-9 bg-gray-50 dark:bg-[#0f172a] rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Success */}
            {bookingDone ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-[#eefbfa] dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-5">
                  <CheckCircle2 size={42} className="text-[#1fc6a1]" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Booking Confirmed!</h3>
                <p className="text-gray-500 dark:text-slate-400 font-medium text-[15px] mb-1">{selectedPanelCourt.name}</p>
                <p className="text-gray-400 dark:text-slate-500 text-[13px]">{selectedDate} · {Array.from(selectedSlots).sort().join(", ")}</p>
                <div className="mt-6 px-6 py-3 bg-[#eefbfa] dark:bg-emerald-900/20 rounded-2xl">
                  <p className="text-[#1fc6a1] font-black text-2xl">RM {totalPrice.toFixed(0)}</p>
                  <p className="text-[#1fc6a1]/70 text-[12px] font-bold">Total paid</p>
                </div>
                <p className="text-gray-400 dark:text-slate-600 text-[12px] mt-6">Closing automatically…</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 bg-[#fafafb] dark:bg-[#0f172a] space-y-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-gray-400 dark:text-slate-500 text-[11px] font-black tracking-widest uppercase">Starting at</span>
                    <span className="text-4xl font-black text-gray-900 dark:text-white ml-1">RM {selectedPanelCourt.price ?? selectedPanelCourt.price_per_hour}</span>
                    <span className="text-sm font-bold text-gray-400 dark:text-slate-500">/hr</span>
                  </div>

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
                            <span className={`text-[20px] font-black leading-tight my-0.5 ${active ? "text-[#1fc6a1]" : "text-gray-900 dark:text-white"}`}>{dt.d}</span>
                            <span className={`text-[10px] font-semibold ${active ? "text-[#1fc6a1]" : "text-gray-400 dark:text-slate-500"}`}>{dt.month}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Time</h3>
                      {selectedSlots.size > 0 && (
                        <span className="text-[11px] font-bold text-[#1fc6a1]">{selectedSlots.size * 0.5} hrs selected</span>
                      )}
                    </div>
                    {panelSlots.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-slate-500 font-medium">No slots available.</p>
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
                                  : "bg-white dark:bg-[#1e293b] text-gray-600 dark:text-slate-400 border-gray-100 dark:border-slate-700 hover:border-[#1fc6a1] hover:text-[#1fc6a1]"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {bookingError && (
                    <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[13px] font-medium px-4 py-3 rounded-xl">
                      <AlertCircle size={16} className="shrink-0 mt-px" />
                      <span>{bookingError}</span>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white dark:bg-[#1e293b] border-t border-gray-100 dark:border-slate-800 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-none shrink-0">
                  {selectedSlots.size > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-gray-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total</p>
                        <p className="text-2xl font-black text-[#1fc6a1]">RM {totalPrice.toFixed(0)}</p>
                      </div>
                      <p className="text-gray-400 dark:text-slate-500 text-[12px] font-medium text-right">
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
                        ? "bg-[#0d1117] dark:bg-[#1fc6a1] text-white hover:bg-black dark:hover:bg-[#1ab895] shadow-[0_8px_20px_rgb(26,31,46,0.3)] cursor-pointer"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {bookingLoading ? <Loader2 size={20} className="animate-spin" /> : "Confirm Booking"}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-slate-500 mt-4">
                    <Zap size={14} className="text-orange-400 fill-orange-400" /> Instant confirmation
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
