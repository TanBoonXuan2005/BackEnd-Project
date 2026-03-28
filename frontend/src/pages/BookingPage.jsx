import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../components/AuthProvider";
import { supabase } from "../../supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, ChevronLeft, Zap, Wind, Navigation2, Star, Info, Droplets,
  Users, Loader2, CheckCircle2, Lock, X, CalendarDays, Clock, BadgeCheck,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeRangeToSlots(start, end) {
  const slots = new Set();
  let [h, m] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  while (h * 60 + m < endH * 60 + endM) {
    slots.add(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return slots;
}

function generateDates(count = 8) {
  const dates = [];
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      key: d.toISOString().split("T")[0],
      day: dayNames[d.getDay()],
      date: d.getDate(),
      month: monthNames[d.getMonth()],
      isToday: i === 0,
    });
  }
  return dates;
}

function generateTimeSlots(open = "08:00", close = "22:00") {
  const slots = [];
  let [h, m] = open.split(":").map(Number);
  const [endH] = close.split(":").map(Number);
  while (!(h === endH && m === 0) && h < endH) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h += 1; m = 0; }
  }
  return slots;
}

function formatTime(slot) {
  const [h, m] = slot.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function getEndTime(slot) {
  const [h, m] = slot.split(":").map(Number);
  const totalMin = h * 60 + m + 30;
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

// ── Success Receipt Overlay ───────────────────────────────────────────────────

function SuccessOverlay({ booking, court, onViewBookings, onBookAnother }) {
  const sortedSlots = [...booking.slots].sort();
  const firstSlot = sortedSlots[0];
  const lastSlot  = sortedSlots[sortedSlots.length - 1];
  const timeRange = `${formatTime(firstSlot)} – ${formatTime(getEndTime(lastSlot))}`;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Receipt card */}
      <motion.div
        className="relative bg-white dark:bg-[#1e293b] rounded-[2rem] w-full max-w-[380px] overflow-hidden shadow-2xl"
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.05 }}
      >
        {/* Green header */}
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 px-6 pt-10 pb-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 2px 2px,white 1px,transparent 0)", backgroundSize: "20px 20px" }}
          />
          <motion.div
            className="mx-auto mb-3 w-16 h-16 bg-white dark:bg-[#1e293b] rounded-full flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.2 }}
          >
            <CheckCircle2 size={34} className="text-emerald-500" strokeWidth={2.5} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h2 className="text-white text-[22px] font-black tracking-tight">Booking Confirmed!</h2>
            <p className="text-emerald-100 text-[13px] font-medium mt-1">Your court has been reserved</p>
          </motion.div>
        </div>

        {/* Ticket notch */}
        <div className="relative -mt-5 flex justify-between px-4">
          <div className="w-10 h-10 rounded-full bg-[#fafafb] dark:bg-[#0f172a]" />
          <div className="flex-1 border-t-2 border-dashed border-gray-200 dark:border-slate-700 mt-5 mx-1" />
          <div className="w-10 h-10 rounded-full bg-[#fafafb] dark:bg-[#0f172a]" />
        </div>

        {/* Details */}
        <motion.div
          className="px-6 pt-1 pb-6 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {/* Booking ID */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Booking ID</span>
            <span className="text-[13px] font-black text-gray-900 dark:text-white font-mono">#{String(booking.id).slice(0, 8).toUpperCase()}</span>
          </div>

          <div className="h-px bg-gray-100 dark:bg-[#1e293b]" />

          {/* Court */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
              <MapPin size={15} className="text-emerald-500 shrink-0" />
              <span className="text-[12px] font-bold">Venue</span>
            </div>
            <span className="text-[13px] font-black text-gray-900 dark:text-white text-right">{court.name}</span>
          </div>

          {/* Date */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
              <CalendarDays size={15} className="text-emerald-500 shrink-0" />
              <span className="text-[12px] font-bold">Date</span>
            </div>
            <span className="text-[13px] font-black text-gray-900 dark:text-white">{booking.date}</span>
          </div>

          {/* Time */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
              <Clock size={15} className="text-emerald-500 shrink-0" />
              <span className="text-[12px] font-bold">Time</span>
            </div>
            <span className="text-[13px] font-black text-gray-900 dark:text-white">{timeRange}</span>
          </div>

          {/* Duration */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
              <Zap size={15} className="text-emerald-500 shrink-0" />
              <span className="text-[12px] font-bold">Duration</span>
            </div>
            <span className="text-[13px] font-black text-gray-900 dark:text-white">{booking.hours} hr{booking.hours !== 1 ? 's' : ''}</span>
          </div>

          <div className="h-px bg-gray-100 dark:bg-[#1e293b]" />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-black text-gray-900 dark:text-white">Total Paid</span>
            <span className="text-[22px] font-black text-emerald-500">RM {booking.total.toFixed(2)}</span>
          </div>

          {/* Status badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-black border border-emerald-200">
              <BadgeCheck size={14} strokeWidth={2.5} /> CONFIRMED
            </span>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="px-6 pb-6 flex flex-col gap-2.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={onViewBookings}
            className="w-full py-3.5 rounded-[1rem] bg-[#1a1f2e] dark:bg-emerald-600 text-white font-black text-[14px] hover:bg-black dark:hover:bg-emerald-700 transition-colors cursor-pointer border-0 shadow-[0_8px_20px_rgba(26,31,46,0.25)]"
          >
            View My Bookings
          </button>
          <button
            onClick={onBookAnother}
            className="w-full py-3.5 rounded-[1rem] border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-[14px] hover:bg-gray-50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 transition-colors cursor-pointer bg-transparent"
          >
            Book Another Slot
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Auth Modal ────────────────────────────────────────────────────────────────

function AuthModal({ onClose, onLogin, onRegister }) {
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-white dark:bg-[#1e293b] rounded-[1.5rem] w-full max-w-[340px] overflow-hidden shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:bg-[#1e293b] dark:hover:bg-slate-700 dark:bg-[#1e293b] dark:hover:bg-slate-700 dark:bg-[#1e293b] dark:hover:bg-slate-700 transition-colors cursor-pointer bg-transparent border-0"
        >
          <X size={18} />
        </button>
        <div className="p-8 pb-6 text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
            <Lock size={22} className="text-emerald-500" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Login Required</h3>
          <p className="text-[13px] font-medium text-gray-500 dark:text-slate-400 leading-relaxed max-w-[240px] mx-auto">
            Sign in to your account to complete this booking.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 px-6 pb-6">
          <button
            onClick={onLogin}
            className="w-full py-3.5 rounded-full text-[14px] font-black text-white bg-[#1a1f2e] dark:bg-emerald-600 hover:bg-black dark:hover:bg-emerald-700 transition-colors cursor-pointer border-0 shadow-[0_8px_20px_rgba(26,31,46,0.3)]"
          >
            Login
          </button>
          <button
            onClick={onRegister}
            className="w-full py-3.5 rounded-full text-[14px] font-bold border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 transition-colors cursor-pointer bg-transparent"
          >
            Create Account
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  // Court data
  const [court, setCourt] = useState(null);
  const [loadingCourt, setLoadingCourt] = useState(true);

  // Slot state
  const [bookedSlots, setBookedSlots] = useState(new Set());
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Selection state
  const dates = useMemo(() => generateDates(), []);
  const [selectedDate, setSelectedDate] = useState(dates[0].key);
  const [selectedCourt, setSelectedCourt] = useState(1);
  const [selectedSlots, setSelectedSlots] = useState(new Set());

  // Booking submission state
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Modal / success state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const timeSlots = useMemo(
    () => generateTimeSlots(court?.opening_hours ?? "08:00", court?.close_hours ?? "22:00"),
    [court?.opening_hours, court?.close_hours]
  );

  const totalHours  = selectedSlots.size * 0.5;
  const totalPrice  = court ? totalHours * (court.price_per_hour ?? 0) : 0;

  // ── Fetch court ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const { data, error } = await supabase.from('courts').select('*').eq('id', id).single();
        if (error) throw error;
        setCourt(data);
      } catch (err) {
        console.error("Failed to fetch court:", err.message);
      } finally {
        setLoadingCourt(false);
      }
    };
    fetchCourt();
  }, [id]);

  // ── Fetch booked slots whenever date or court changes ────────────────────────
  useEffect(() => {
    if (!id || !selectedDate) return;
    const fetch = async () => {
      setSlotsLoading(true);
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('court_id', id)
          .eq('booking_date', selectedDate)
          .neq('status', 'cancelled');
        if (error) throw error;
        const allSlots = new Set();
        (data || []).forEach(b => timeRangeToSlots(b.start_time, b.end_time).forEach(s => allSlots.add(s)));
        setBookedSlots(allSlots);
      } catch (err) {
        console.error("Failed to fetch booked slots:", err.message);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetch();
  }, [id, selectedDate, selectedCourt]);

  // ── Slot toggle ──────────────────────────────────────────────────────────────
  const toggleSlot = (slot) => {
    if (bookedSlots.has(slot)) return;
    setSelectedSlots(prev => {
      const next = new Set(prev);
      next.has(slot) ? next.delete(slot) : next.add(slot);
      return next;
    });
  };

  // ── Booking submit ───────────────────────────────────────────────────────────
  const handleBookingSubmit = async () => {
    if (!currentUser) { setShowAuthModal(true); return; }
    if (selectedSlots.size === 0) return;

    setBookingLoading(true);
    setBookingError('');

    try {
      const slotsArr   = Array.from(selectedSlots).sort();
      const start_time = slotsArr[0] + ":00";
      const last       = slotsArr[slotsArr.length - 1];
      const [h, m]     = last.split(":").map(Number);
      const endMin     = m + 30;
      const end_time   = `${String(endMin >= 60 ? h + 1 : h).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}:00`;

      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          user_id:      currentUser.id,
          court_id:     parseInt(id),
          booking_date: selectedDate,
          start_time,
          end_time,
          total_price:  totalPrice,
          status:       'confirmed',
        }])
        .select()
        .single();

      if (error) throw error;

      setConfirmedBooking({
        id:    data.id,
        date:  selectedDate,
        slots: selectedSlots,
        hours: totalHours,
        total: totalPrice,
      });
      setShowSuccess(true);
    } catch (err) {
      setBookingError(err.message || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Loading / not found guards ───────────────────────────────────────────────
  if (loadingCourt) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafafb] dark:bg-[#0f172a]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-emerald-100 border-t-[#1fc6a1] rounded-full animate-spin" />
          <p className="mt-4 text-sm font-bold tracking-widest text-gray-400 dark:text-slate-500 uppercase">Loading Court...</p>
        </div>
      </div>
    );
  }

  if (!court) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafafb] dark:bg-[#0f172a]">
        <p className="text-gray-500 dark:text-slate-400 font-bold">Court not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafb] dark:bg-[#0f172a] pb-24 font-sans selection:bg-emerald-200">

      {/* ── Overlays ── */}
      <AnimatePresence>
        {showSuccess && confirmedBooking && (
          <SuccessOverlay
            booking={confirmedBooking}
            court={court}
            onViewBookings={() => navigate('/my-bookings')}
            onBookAnother={() => {
              setShowSuccess(false);
              setSelectedSlots(new Set());
              setConfirmedBooking(null);
            }}
          />
        )}
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onLogin={() => navigate('/login')}
            onRegister={() => navigate('/register')}
          />
        )}
      </AnimatePresence>

      {/* ═══════ HERO ═══════ */}
      <div className="w-full bg-gradient-to-tr from-[#1a1f2e] via-[#2a3042] to-[#121622] pt-24 pb-28 px-4 sm:px-6 lg:px-8 rounded-b-[2rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#1fc6a1]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-gray-400 dark:text-slate-500 hover:text-white mb-6 transition-colors text-sm font-bold">
            <ChevronLeft size={16} /> Back to explore
          </Link>
          <div className="flex gap-3 items-center mb-5">
            <div className="bg-white dark:bg-[#1e293b]/10 backdrop-blur-md border border-white/20 text-orange-400 font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm shadow-sm">
              <Star size={14} className="fill-orange-400" /> {court.rating}
            </div>
            <span className="text-gray-300 dark:text-slate-600 text-sm font-medium tracking-wide">({court.reviews} Reviews)</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-md">{court.name}</h1>
          <p className="flex items-center gap-2 text-[#1fc6a1] font-bold">
            <MapPin size={18} />
            <span className="text-gray-200 font-medium text-[15px]">{court.location}</span>
          </p>
        </div>
      </div>

      {/* ═══════ CONTENT GRID ═══════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#1e293b] rounded-[1.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-slate-800">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-900 dark:text-white tracking-tight">
                <Info size={22} className="text-[#1fc6a1]" /> About the Court
              </h2>
              <p className="text-gray-600 dark:text-slate-300 text-[15px] leading-relaxed mb-8">{court.description}</p>
              <h3 className="font-bold text-gray-900 dark:text-white mb-6 text-lg">Amenities</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div className="flex items-center gap-3"><Zap size={18} className="text-[#1fc6a1]" /><span className="text-gray-700 dark:text-slate-300 font-bold text-[14px]">Indoor</span></div>
                <div className="flex items-center gap-3"><Wind size={18} className="text-[#1fc6a1]" /><span className="text-gray-700 dark:text-slate-300 font-bold text-[14px]">AC</span></div>
                <div className="flex items-center gap-3"><Zap size={18} className="text-[#1fc6a1]" /><span className="text-gray-700 dark:text-slate-300 font-bold text-[14px]">BWF Standard</span></div>
                <div className="flex items-center gap-3"><Users size={18} className="text-[#1fc6a1]" /><span className="text-gray-700 dark:text-slate-300 font-bold text-[14px]">Coaching</span></div>
                <div className="flex items-center gap-3"><Wind size={18} className="text-[#1fc6a1]" /><span className="text-gray-700 dark:text-slate-300 font-bold text-[14px]">Restrooms</span></div>
                <div className="flex items-center gap-3"><Droplets size={18} className="text-[#1fc6a1]" /><span className="text-gray-700 dark:text-slate-300 font-bold text-[14px]">Water Dispenser</span></div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-[1.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Location</h2>
                <a href="#" className="flex items-center gap-1.5 text-[#1fc6a1] font-bold text-sm hover:text-teal-600 transition-colors">
                  <Navigation2 size={16} /> Get Directions
                </a>
              </div>
              <div className="w-full h-[200px] sm:h-[240px] bg-gray-100 dark:bg-[#1e293b] rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden group cursor-pointer border border-gray-200 dark:border-slate-700">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                <div className="absolute inset-0 bg-white dark:bg-[#1e293b]/40" />
                <div className="w-14 h-14 bg-[#1fc6a1] rounded-full flex items-center justify-center text-white shadow-xl z-10 group-hover:scale-110 transition-transform">
                  <MapPin size={24} fill="currentColor" stroke="white" strokeWidth={1} />
                </div>
              </div>
              <div>
                <h3 className="text-gray-900 dark:text-white font-extrabold text-[16px] mb-1">{court.location}</h3>
                <p className="text-gray-400 dark:text-slate-500 text-sm font-bold">{court.distance} from your current location</p>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (Booking Widget) ── */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="bg-white dark:bg-[#1e293b] rounded-[1.5rem] p-6 sm:p-8 shadow-[0_20px_50px_rgb(0,0,0,0.08)] dark:shadow-none border border-gray-100 dark:border-slate-800 sticky top-24">

              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Book this court</h2>
              <p className="text-gray-500 dark:text-slate-400 text-[14px] leading-relaxed font-bold mb-7">
                Select your preferred time slot and complete your booking.
              </p>

              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-gray-400 dark:text-slate-500 text-[11px] font-black tracking-widest uppercase mr-1">Starting at</span>
                <span className="text-4xl font-black text-gray-900 dark:text-white">RM {court.price_per_hour}</span>
                <span className="text-sm font-bold text-gray-400 dark:text-slate-500">/hr</span>
              </div>

              <div className="space-y-6 pt-6 pb-2 border-t border-gray-100 dark:border-slate-800">

                {/* Date selection */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">Date</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {dates.map((d) => {
                      const active = selectedDate === d.key;
                      return (
                        <button
                          key={d.key}
                          onClick={() => { setSelectedDate(d.key); setSelectedSlots(new Set()); }}
                          className={`flex flex-col items-center justify-center min-w-[64px] rounded-[14px] px-2 py-2.5 transition-all outline-none border-2 shrink-0
                            ${active ? "border-[#1fc6a1] bg-[#eefbfa] dark:bg-emerald-900/30 text-[#1fc6a1] dark:text-emerald-400" : "border-gray-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] text-gray-500 dark:text-slate-400 hover:border-gray-200 dark:border-slate-700"}
                          `}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider">{d.isToday ? "Today" : d.day}</span>
                          <span className={`text-[20px] font-black leading-tight my-0.5 ${active ? "text-[#1fc6a1]" : "text-gray-900 dark:text-white"}`}>{d.date}</span>
                          <span className="text-[10px] font-bold">{d.month}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Court selection */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">Court</h3>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: court.total_courts ?? 1 }, (_, i) => i + 1).map((num) => {
                      const active = selectedCourt === num;
                      return (
                        <button
                          key={num}
                          onClick={() => { setSelectedCourt(num); setSelectedSlots(new Set()); }}
                          className={`flex-1 min-w-[70px] rounded-[12px] py-2.5 font-bold text-[13px] transition-all border-2
                            ${active ? "border-[#1fc6a1] bg-[#1fc6a1] text-white" : "border-gray-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] text-gray-600 dark:text-slate-300 hover:border-gray-200 dark:border-slate-700"}
                          `}
                        >
                          Court {num}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slot grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Time</h3>
                    <div className="text-[11px] font-bold text-gray-400 dark:text-slate-500">
                      {slotsLoading
                        ? <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Checking availability…</span>
                        : selectedSlots.size > 0 ? `${totalHours} hrs selected` : ''
                      }
                    </div>
                  </div>

                  <div className="relative">
                    <div className={`grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1 transition-opacity ${slotsLoading ? 'opacity-40 pointer-events-none' : ''}`}>
                      {timeSlots.map((slot) => {
                        const isBooked   = bookedSlots.has(slot);
                        const isSelected = selectedSlots.has(slot);
                        return (
                          <button
                            key={slot}
                            disabled={isBooked || slotsLoading}
                            onClick={() => toggleSlot(slot)}
                            className={`rounded-[10px] py-2 text-[12px] font-bold text-center transition-all border-2
                              ${isBooked
                                ? "bg-red-50 text-red-300 border-red-50 cursor-not-allowed"
                                : isSelected
                                  ? "bg-[#1fc6a1] text-white border-[#1fc6a1] shadow-md shadow-[#1fc6a1]/30"
                                  : "bg-white dark:bg-[#1e293b] text-gray-600 dark:text-slate-300 border-gray-100 dark:border-slate-800 hover:border-[#1fc6a1] hover:text-[#1fc6a1]"
                              }
                            `}
                          >
                            {isBooked ? "Taken" : slot}
                          </button>
                        );
                      })}
                    </div>
                    {slotsLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={20} className="text-[#1fc6a1] animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Price */}
              <AnimatePresence>
                {selectedSlots.size > 0 && (
                  <motion.div
                    className="flex items-center justify-between mt-6 mb-4 px-1 py-4 border-t border-gray-100 dark:border-slate-800"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    <div>
                      <p className="text-gray-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-wider mb-0.5">Total Price</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">{totalHours} hr{totalHours !== 1 ? 's' : ''} × RM {court.price_per_hour}</p>
                    </div>
                    <span className="text-2xl font-black text-[#1fc6a1]">RM {totalPrice.toFixed(2)}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {bookingError && (
                <motion.p
                  className="text-[12px] text-red-500 font-bold mb-3 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  ⚠ {bookingError}
                </motion.p>
              )}

              {/* Book Button */}
              <button
                onClick={handleBookingSubmit}
                disabled={selectedSlots.size === 0 || bookingLoading}
                className={`w-full font-bold py-4 rounded-[1.2rem] text-[16px] transition-all duration-300 flex items-center justify-center gap-2 mb-5 mt-2 ${
                  selectedSlots.size > 0 && !bookingLoading
                    ? "bg-[#1a1f2e] dark:bg-emerald-600 text-white hover:bg-black dark:hover:bg-emerald-700 shadow-[0_8px_20px_rgb(26,31,46,0.3)] hover:-translate-y-0.5 cursor-pointer"
                    : "bg-gray-100 dark:bg-[#1e293b] text-gray-400 dark:text-slate-500 cursor-not-allowed"
                }`}
              >
                {bookingLoading
                  ? <><Loader2 size={18} className="animate-spin" /> Processing…</>
                  : "Confirm Booking"
                }
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[12px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-slate-500">
                <Zap size={14} className="text-orange-400 fill-orange-400" /> Instant confirmation
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
