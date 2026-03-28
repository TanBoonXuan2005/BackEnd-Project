import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useContext, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../components/AuthProvider";
import { supabase } from "../../supabase";
import {
    MapPin, Navigation, Ticket, AlertTriangle, X, Loader2,
    CalendarDays, WalletCards, ArrowLeft, Clock,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt12h(t = '') {
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h)) return t;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtDate(str = '') {
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatus(booking) {
    if (booking.status === 'cancelled') return 'cancelled';
    const end = new Date(`${booking.booking_date}T${booking.end_time}`);
    return end < new Date() ? 'past' : 'confirmed';
}

const STATUS_STYLES = {
    confirmed: {
        label: 'Confirmed',
        bg: 'bg-emerald-50 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
    },
    past: {
        label: 'Completed',
        bg: 'bg-slate-100 dark:bg-slate-700/50',
        text: 'text-slate-500 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-900/50',
        dot: 'bg-red-400',
    },
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80';

// ── Cancel Modal ──────────────────────────────────────────────────────────────

function CancelModal({ booking, onConfirm, onClose, loading }) {
    return (
        <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                className="relative bg-white dark:bg-[#1e293b] rounded-[1.5rem] w-full max-w-[360px] overflow-hidden shadow-2xl dark:shadow-none border border-gray-100 dark:border-slate-800"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:bg-[#1e293b] dark:hover:bg-slate-700 transition-colors cursor-pointer bg-transparent border-0"
                >
                    <X size={18} />
                </button>
                <div className="p-8 text-center">
                    <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertTriangle size={24} className="text-red-500 dark:text-red-400" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-[18px] font-black text-gray-900 dark:text-white mb-2">Cancel Booking?</h3>
                    <p className="text-[13px] text-gray-500 dark:text-slate-400 font-medium leading-relaxed mb-1">
                        <span className="font-bold text-gray-800 dark:text-slate-200">{booking.court_name}</span>
                    </p>
                    <p className="text-[13px] text-gray-500 dark:text-slate-400 font-medium mb-6">
                        {fmtDate(booking.booking_date)} · {fmt12h(booking.start_time.slice(0, 5))} – {fmt12h(booking.end_time.slice(0, 5))}
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl px-4 py-3 mb-6 text-left">
                        <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Cancellation Policy</p>
                        <p className="text-[12px] text-amber-600 dark:text-amber-500 font-medium">Cancellations made more than 24 hours in advance receive a full refund. Within 24 hours, no refund is issued.</p>
                    </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-[1rem] border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-bold text-[14px] hover:bg-gray-50 dark:bg-[#0f172a] dark:hover:bg-slate-700/50 transition-colors cursor-pointer bg-transparent"
                    >
                        Keep It
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-3 rounded-[1rem] bg-red-500 hover:bg-red-600 text-white font-bold text-[14px] transition-colors cursor-pointer border-0 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {loading ? 'Cancelling…' : 'Yes, Cancel'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Featured Ticket ───────────────────────────────────────────────────────────

function FeaturedTicket({ booking, onCancel }) {
    const timeRange = `${fmt12h(booking.start_time.slice(0, 5))} – ${fmt12h(booking.end_time.slice(0, 5))}`;
    const pin = String(booking.id).replace(/\D/g, '').slice(0, 4).padStart(4, '8');

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Next Match</h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-black border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> CONFIRMED
                </span>
            </div>

            {/* Ticket card */}
            <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] shadow-[0_12px_45px_rgba(0,0,0,0.06)] dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">

                {/* Court image */}
                <div className="relative h-44 overflow-hidden">
                    <img
                        src={booking.court_image || FALLBACK_IMG}
                        alt={booking.court_name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = FALLBACK_IMG; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-5">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">
                            <MapPin size={10} className="inline mr-1" />{booking.court_location}
                        </p>
                        <h3 className="text-white font-black text-[18px] leading-tight">{booking.court_name}</h3>
                    </div>
                </div>

                {/* Info section */}
                <div className="px-7 pt-6 pb-5">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                <CalendarDays size={10} /> Date
                            </p>
                            <p className="font-extrabold text-[14px] text-gray-900 dark:text-white">{fmtDate(booking.booking_date)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                <Clock size={10} /> Time
                            </p>
                            <p className="font-extrabold text-[14px] text-gray-900 dark:text-white">{timeRange}</p>
                        </div>
                    </div>

                    {/* Ticket notch divider — circles must match the page background to "punch out" of the card */}
                    <div className="flex items-center -mx-7 mb-6">
                        <div className="w-6 h-6 rounded-full bg-[#fafafb] dark:bg-[#0f172a] border border-gray-100 dark:border-slate-800 shrink-0" />
                        <div className="flex-1 border-t-2 border-dashed border-gray-200 dark:border-slate-700" />
                        <div className="w-6 h-6 rounded-full bg-[#fafafb] dark:bg-[#0f172a] border border-gray-100 dark:border-slate-800 shrink-0" />
                    </div>

                    {/* QR + Pin */}
                    <div className="flex items-center justify-between">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-[#1e293b]/60 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center justify-center p-2">
                            <div className="grid grid-cols-2 gap-1 w-full h-full text-gray-600 dark:text-slate-400">
                                <div className="border-[3px] border-current rounded-lg" />
                                <div className="border-[3px] border-current rounded-full" style={{ borderStyle: 'dashed' }} />
                                <div className="flex flex-col gap-1 justify-end items-end p-0.5">
                                    <div className="w-full h-2 bg-current rounded-full" />
                                    <div className="w-2/3 h-2 bg-current rounded-full" />
                                </div>
                                <div className="border-[3px] border-current rounded-lg rotate-90" />
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Entry Pin</p>
                            <p className="text-[32px] font-black text-[#1fc6a1] tracking-[0.2em] leading-none">{pin}</p>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium mt-1.5">RM {Number(booking.total_price).toFixed(2)} paid</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <button className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-[1rem] text-gray-700 dark:text-slate-300 font-bold text-[13px] hover:border-[#1fc6a1] hover:text-[#1fc6a1] dark:hover:border-[#1fc6a1] dark:hover:text-[#1fc6a1] transition-colors cursor-pointer">
                    <Navigation size={15} strokeWidth={2.5} /> Directions
                </button>
                <button
                    onClick={onCancel}
                    className="flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-[1rem] text-red-500 dark:text-red-400 font-bold text-[13px] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                >
                    <X size={15} strokeWidth={2.5} /> Cancel
                </button>
            </div>
        </motion.div>
    );
}

// ── Booking Row Card ──────────────────────────────────────────────────────────

function BookingCard({ booking, onCancel, index }) {
    const status = getStatus(booking);
    const s = STATUS_STYLES[status];
    const timeRange = `${fmt12h(booking.start_time.slice(0, 5))} – ${fmt12h(booking.end_time.slice(0, 5))}`;
    const isUpcoming = status === 'confirmed';

    return (
        <motion.div
            className="bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-slate-800 rounded-[1.2rem] overflow-hidden shadow-sm dark:shadow-none hover:shadow-[0_8px_25px_rgba(0,0,0,0.07)] hover:border-gray-200 dark:border-slate-700 dark:hover:border-slate-700 transition-all duration-300 flex"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
        >
            <div className="w-24 sm:w-28 shrink-0 relative overflow-hidden">
                <img
                    src={booking.court_image || FALLBACK_IMG}
                    alt={booking.court_name}
                    className={`w-full h-full object-cover ${status === 'past' ? 'grayscale opacity-60' : ''}`}
                    onError={e => { e.target.src = FALLBACK_IMG; }}
                />
            </div>

            <div className="flex-1 px-4 py-3.5 flex flex-col justify-between min-w-0">
                <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-extrabold text-gray-900 dark:text-white text-[14px] leading-tight truncate">{booking.court_name}</h4>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${s.bg} ${s.text} ${s.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                        </span>
                    </div>
                    <p className="text-[12px] text-gray-400 dark:text-slate-500 font-medium flex items-center gap-1 mb-2 truncate">
                        <MapPin size={11} className="shrink-0" />{booking.court_location}
                    </p>
                    <p className="text-[12px] text-gray-600 dark:text-slate-400 font-bold">
                        {fmtDate(booking.booking_date)}
                        <span className="text-gray-300 dark:text-slate-600 mx-1.5">·</span>
                        {timeRange}
                    </p>
                </div>

                <div className="flex items-center justify-between mt-2.5">
                    <p className="text-[13px] font-black text-[#1fc6a1]">RM {Number(booking.total_price).toFixed(2)}</p>
                    {isUpcoming && (
                        <button
                            onClick={() => onCancel(booking)}
                            className="text-[11px] font-bold text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors cursor-pointer bg-transparent border-0 p-0"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyBookings() {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!currentUser) { navigate('/login'); return; }

        const fetchBookings = async () => {
            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .select('*, courts(name, location, cover_image)')
                    .eq('user_id', currentUser.id)
                    .order('booking_date', { ascending: false });

                if (error) throw error;

                setBookings((data || []).map(b => ({
                    id:             b.id,
                    booking_date:   b.booking_date,
                    start_time:     b.start_time,
                    end_time:       b.end_time,
                    total_price:    b.total_price,
                    status:         b.status,
                    court_name:     b.courts?.name      || 'Court',
                    court_location: b.courts?.location  || '',
                    court_image:    b.courts?.cover_image || null,
                })));
            } catch (err) {
                console.error('Failed to fetch bookings:', err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [currentUser, navigate]);

    // ── Cancel ─────────────────────────────────────────────────────────────────
    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;
        setCancelLoading(true);
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', cancelTarget.id);
            if (error) throw error;
            setBookings(prev => prev.map(b => b.id === cancelTarget.id ? { ...b, status: 'cancelled' } : b));
            setCancelTarget(null);
        } catch (err) {
            console.error('Cancel failed:', err.message);
        } finally {
            setCancelLoading(false);
        }
    };

    // ── Derived lists ──────────────────────────────────────────────────────────
    const now = new Date();

    const upcoming = useMemo(() =>
        bookings
            .filter(b => b.status !== 'cancelled' && new Date(`${b.booking_date}T${b.end_time}`) >= now)
            .sort((a, b) => new Date(`${a.booking_date}T${a.start_time}`) - new Date(`${b.booking_date}T${b.start_time}`)),
        [bookings]
    );

    const history = useMemo(() =>
        bookings.filter(b => b.status === 'cancelled' || new Date(`${b.booking_date}T${b.end_time}`) < now),
        [bookings]
    );

    const totalSpent = useMemo(() =>
        bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + Number(b.total_price), 0),
        [bookings]
    );

    const featuredBooking = upcoming[0] || null;
    const laterBookings   = upcoming.slice(1);

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafb] dark:bg-[#0f172a] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-100 dark:border-slate-700 border-t-[#1fc6a1] rounded-full animate-spin" />
                <p className="mt-5 text-sm font-bold tracking-widest text-gray-400 dark:text-slate-500 uppercase">Loading Bookings</p>
            </div>
        );
    }

    return (
        /* Single uniform background — no child divs may override this */
        <div className="min-h-screen bg-[#fafafb] dark:bg-[#0f172a] pt-24 pb-12">

            {/* Cancel Modal */}
            <AnimatePresence>
                {cancelTarget && (
                    <CancelModal
                        booking={cancelTarget}
                        loading={cancelLoading}
                        onConfirm={handleCancelConfirm}
                        onClose={() => setCancelTarget(null)}
                    />
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* ── Back link ── */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg mb-8 transition-colors text-[13px] font-bold"
                >
                    <ArrowLeft size={15} /> Back to Explore
                </Link>

                {/* ── Page title ── */}
                <h1 className="text-[36px] sm:text-[44px] font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">
                    My Bookings
                </h1>
                <p className="text-gray-500 dark:text-slate-400 font-medium text-[15px] mb-8">
                    {currentUser?.user_metadata?.full_name
                        ? `${currentUser.user_metadata.full_name}'s court schedule`
                        : 'Your court schedule'}
                </p>

                {/* ── Stats cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    {[
                        { icon: <Ticket size={20} />, label: 'Total Bookings', value: bookings.length },
                        { icon: <CalendarDays size={20} />, label: 'Upcoming', value: upcoming.length },
                        { icon: <WalletCards size={20} />, label: 'Total Spent', value: `RM ${totalSpent.toFixed(2)}` },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none">
                            <span className="text-[#1fc6a1] mb-3 block">{stat.icon}</span>
                            <p className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className="text-[24px] font-black text-gray-900 dark:text-white leading-none">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Content ── */}
                {bookings.length === 0 ? (
                    <motion.div
                        className="bg-white dark:bg-[#1e293b] rounded-3xl p-12 text-center border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none mt-8 max-w-3xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Ticket size={28} className="text-[#1fc6a1]" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">No bookings yet</h2>
                        <p className="text-[15px] font-medium text-gray-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                            Head to the Explore page to find a premium court and make your first booking.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1fc6a1] hover:bg-[#1ab895] text-white text-[15px] font-bold px-8 py-3.5 shadow-[0_8px_20px_rgb(31,198,161,0.3)] transition-all hover:-translate-y-0.5"
                        >
                            Explore Courts
                        </Link>
                    </motion.div>
                ) : (
                    <div className="space-y-10">

                        {/* ── Featured next match + later upcoming ── */}
                        {upcoming.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
                                <FeaturedTicket
                                    booking={featuredBooking}
                                    onCancel={() => setCancelTarget(featuredBooking)}
                                />

                                {laterBookings.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="pt-2 lg:pt-14"
                                    >
                                        <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-1">
                                            Upcoming · {laterBookings.length} more
                                        </h3>
                                        <div className="space-y-3">
                                            {laterBookings.map((b, i) => (
                                                <BookingCard key={b.id} booking={b} index={i} onCancel={setCancelTarget} />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* ── History ── */}
                        {history.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-1">
                                    History · {history.length} booking{history.length !== 1 ? 's' : ''}
                                </h3>
                                <div className="space-y-3">
                                    {history.map((b, i) => (
                                        <BookingCard key={b.id} booking={b} index={i} onCancel={setCancelTarget} />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}
