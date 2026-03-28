import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { AuthContext } from "../components/AuthProvider";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────
// SVG Assets
// ─────────────────────────────────────────────

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M47.532 24.552c0-1.636-.132-3.2-.388-4.692H24.48v9.116h13.004c-.572 2.98-2.244 5.504-4.764 7.196v5.984h7.708c4.512-4.148 7.104-10.26 7.104-17.604z" fill="#4285F4"/>
        <path d="M24.48 48c6.52 0 11.988-2.156 15.984-5.844l-7.708-5.984c-2.156 1.44-4.908 2.292-8.276 2.292-6.356 0-11.74-4.292-13.672-10.064H2.84v6.18C6.82 42.836 15.1 48 24.48 48z" fill="#34A853"/>
        <path d="M10.808 28.4A14.49 14.49 0 0 1 10 24c0-1.54.268-3.04.808-4.4v-6.18H2.84A23.96 23.96 0 0 0 .48 24c0 3.888.932 7.564 2.36 10.58l7.968-6.18z" fill="#FBBC05"/>
        <path d="M24.48 9.536c3.58 0 6.792 1.232 9.316 3.652l6.972-6.972C36.46 2.38 30.996 0 24.48 0 15.1 0 6.82 5.164 2.84 13.42l7.968 6.18c1.932-5.772 7.316-10.064 13.672-10.064z" fill="#EA4335"/>
    </svg>
);

const AppleIcon = () => (
    <svg width="16" height="18" viewBox="0 0 814 1000" fill="white" aria-hidden="true">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-149.3-92.5S27 747.3 27 651.5c0-17.7 1.3-35.4 4-52.8 26.7-149.7 141.6-228.9 238.2-230.3 70.2-1.3 136.5 47.5 181.3 47.5 44.2 0 127.5-56 216.8-54.9z"/>
        <path d="M530.5 29.7C548.7 8.2 563.3 0 563.3 0s-44.2 26.1-88.4 50.7c-7.7 4.3-16.5 9.6-22.2 14-54.3 41.4-73.8 107.8-74.5 111.5-.6 3.2-3.5 9.6-3.5 9.6s1.9 0 3.5-.6c5.8-1.9 32.5-12.8 58.6-37.3 23.3-21.7 56.6-74.3 93.7-118.2z"/>
    </svg>
);

// Clean shuttlecock mark
const ShuttlecockMark = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        {/* Cork */}
        <circle cx="14" cy="21" r="3.5" fill="white" fillOpacity="0.95"/>
        {/* Shaft */}
        <line x1="14" y1="17.5" x2="14" y2="13" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
        {/* Feather lines */}
        <line x1="14" y1="14" x2="8"  y2="5"  stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.85"/>
        <line x1="14" y1="14" x2="10" y2="4"  stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.85"/>
        <line x1="14" y1="14" x2="14" y2="3.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.85"/>
        <line x1="14" y1="14" x2="18" y2="4"  stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.85"/>
        <line x1="14" y1="14" x2="20" y2="5"  stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.85"/>
        {/* Crown arc */}
        <path d="M8 5 Q11 2.5 14 3.5 Q17 2.5 20 5" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeOpacity="0.85"/>
    </svg>
);

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function Auth() {
    const navigate   = useNavigate();
    const { currentUser } = useContext(AuthContext);

    // ── mode ──
    const [isSignUp, setIsSignUp] = useState(false);

    // ── fields ──
    const [fullName,        setFullName]        = useState("");
    const [email,           setEmail]           = useState("");
    const [password,        setPassword]        = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword,    setShowPassword]    = useState(false);

    // ── async states ──
    const [loading,       setLoading]       = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading,  setAppleLoading]  = useState(false);

    // ── feedback ──
    const [error,   setError]   = useState("");
    const [success, setSuccess] = useState("");

    // Redirect if already logged in
    useEffect(() => {
        if (currentUser) navigate("/");
    }, [currentUser, navigate]);

    // ── helpers ──
    const clearFeedback = () => { setError(""); setSuccess(""); };

    const switchMode = (signUp) => {
        setIsSignUp(signUp);
        clearFeedback();
        setFullName(""); setPassword(""); setConfirmPassword("");
    };

    // ── handlers ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        clearFeedback();

        if (isSignUp && password !== confirmPassword) { setError("Passwords do not match."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } },
                });
                if (error) throw error;
                setSuccess("Account created! Check your email to confirm before signing in.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate("/");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        clearFeedback();
        setGoogleLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            setGoogleLoading(false);
        }
    };

    const handleApple = async () => {
        clearFeedback();
        setAppleLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({ provider: "apple" });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            setAppleLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) { setError("Enter your email address above, then click Reset it."); return; }
        clearFeedback();
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            setSuccess("Password reset link sent — check your inbox.");
        } catch (err) {
            setError(err.message);
        }
    };

    // ── shared input style (glass) ──
    const inputCls =
        "w-full bg-white/[0.07] border border-white/[0.14] rounded-2xl pl-11 pr-4 py-4 text-[15px] font-medium text-white placeholder:text-white/35 placeholder:font-normal focus:outline-none focus:border-emerald-400/50 focus:bg-white/[0.12] focus:ring-2 focus:ring-emerald-400/15 transition-all duration-200 autofill:bg-transparent";

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 py-10 font-sans overflow-hidden selection:bg-emerald-400/30">

            {/* ══ Full-screen background ══ */}
            <div className="absolute inset-0 -z-10">
                <img
                    src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1920&q=85&auto=format&fit=crop"
                    alt=""
                    className="w-full h-full object-cover object-center scale-105"
                    style={{ filter: "blur(2px)" }}
                />
                {/* Multi-layer dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#060d18]/85 via-[#07150f]/75 to-[#030c09]/90" />
                {/* Subtle emerald ambient light from top-right */}
                <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24  w-[400px] h-[400px] rounded-full bg-teal-600/8  blur-3xl pointer-events-none" />
            </div>

            {/* ══ Glass card ══ */}
            <div className="w-full max-w-[420px]">

                {/* ── Brand header ── */}
                <div className="flex flex-col items-center mb-8 text-center">
                    {/* Logo mark */}
                    <div
                        className="w-[60px] h-[60px] rounded-[18px] flex items-center justify-center mb-4 shadow-xl"
                        style={{
                            background: "linear-gradient(135deg, #1fc6a1 0%, #0fa882 100%)",
                            boxShadow: "0 8px 32px rgba(31,198,161,0.35), inset 0 1px 0 rgba(255,255,255,0.2)"
                        }}
                    >
                        <ShuttlecockMark />
                    </div>
                    <h1
                        className="text-[26px] font-black text-white tracking-tight leading-none"
                        style={{ letterSpacing: "-0.03em" }}
                    >
                        Badminton<span className="text-[#1fc6a1]">Pro</span>
                    </h1>
                    <p className="text-[13px] font-medium text-white/45 mt-2 tracking-wide">
                        Book your court. Own the game.
                    </p>
                </div>

                {/* ── Main glass card ── */}
                <div
                    className="rounded-3xl border border-white/[0.13] p-8 sm:p-9"
                    style={{
                        background: "rgba(255,255,255,0.055)",
                        backdropFilter: "blur(28px) saturate(180%)",
                        WebkitBackdropFilter: "blur(28px) saturate(180%)",
                        boxShadow: "0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)"
                    }}
                >
                    {/* ── Underline tabs ── */}
                    <div className="flex gap-10 border-b border-white/[0.1] mb-8">
                        {[
                            { label: "Sign In",        active: !isSignUp, action: () => switchMode(false) },
                            { label: "Create Account", active:  isSignUp, action: () => switchMode(true)  },
                        ].map(({ label, active, action }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={action}
                                className={`pb-3 text-[14px] font-bold tracking-tight transition-all duration-200 border-b-2 -mb-px ${
                                    active
                                        ? "text-white border-[#1fc6a1]"
                                        : "text-white/40 border-transparent hover:text-white/65"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* ── Form ── */}
                    <form onSubmit={handleSubmit} className="space-y-3">

                        {/* Full Name — sign-up only */}
                        {isSignUp && (
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    autoComplete="name"
                                    className={inputCls}
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                className={inputCls}
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete={isSignUp ? "new-password" : "current-password"}
                                className={`${inputCls} pr-12`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {/* Confirm Password — sign-up only */}
                        {isSignUp && (
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirm password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className={inputCls}
                                />
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-400/20 text-red-300 text-[13px] font-medium px-4 py-3 rounded-xl leading-relaxed">
                                <span className="shrink-0 mt-px">⚠</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-[13px] font-medium px-4 py-3 rounded-xl leading-relaxed">
                                {success}
                            </div>
                        )}

                        {/* Primary CTA */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-[15px] text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:scale-[1.01] mt-1"
                            style={{
                                background: "linear-gradient(135deg, #1fc6a1 0%, #0ea5d5 100%)",
                                boxShadow: loading ? "none" : "0 8px 28px rgba(31,198,161,0.35), 0 2px 8px rgba(14,165,213,0.2)"
                            }}
                        >
                            {loading
                                ? <Loader2 size={18} className="animate-spin" />
                                : <><span>{isSignUp ? "Create Account" : "Sign In"}</span><ArrowRight size={17} /></>
                            }
                        </button>
                    </form>

                    {/* ── OR divider ── */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-white/[0.1]" />
                        <span className="text-[11px] font-black tracking-widest text-white/30 uppercase">
                            Or continue with
                        </span>
                        <div className="flex-1 h-px bg-white/[0.1]" />
                    </div>

                    {/* ── Social buttons ── */}
                    <div className="grid grid-cols-2 gap-3">

                        {/* Google */}
                        <button
                            type="button"
                            onClick={handleGoogle}
                            disabled={googleLoading}
                            className="flex items-center justify-center gap-2.5 bg-white hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-2xl text-[13px] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {googleLoading
                                ? <Loader2 size={16} className="animate-spin text-gray-400" />
                                : <GoogleIcon />
                            }
                            Google
                        </button>

                        {/* Apple */}
                        <button
                            type="button"
                            onClick={handleApple}
                            disabled={appleLoading}
                            className="flex items-center justify-center gap-2.5 bg-[#0d0d0d] hover:bg-black text-white font-bold py-3.5 rounded-2xl text-[13px] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                        >
                            {appleLoading
                                ? <Loader2 size={16} className="animate-spin text-white/60" />
                                : <AppleIcon />
                            }
                            Apple
                        </button>
                    </div>

                    {/* ── Footer links ── */}
                    <div className="flex items-center justify-center gap-1.5 mt-7 flex-wrap">
                        <span className="text-[12px] text-white/35">
                            {isSignUp ? "Have an account?" : "No account?"}
                        </span>
                        <button
                            type="button"
                            onClick={() => switchMode(!isSignUp)}
                            className="text-[12px] font-bold text-[#1fc6a1] hover:text-emerald-300 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                        >
                            {isSignUp ? "Sign in" : "Create one"}
                        </button>
                        {!isSignUp && (
                            <>
                                <span className="text-white/20 text-[12px] mx-1">·</span>
                                <span className="text-[12px] text-white/35">Forgot password?</span>
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    className="text-[12px] font-bold text-[#1fc6a1] hover:text-emerald-300 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                                >
                                    Reset it
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
