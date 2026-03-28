import { useNavigate, Link } from 'react-router-dom';
import { useContext, useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { AuthContext } from "../components/AuthProvider";
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const loginImage = "https://media.gettyimages.com/id/108860379/photo/lee-chong-wei-of-malaysia-leaps-to-smash.jpg?s=1024x1024&w=gi&k=20&c=EOk-g7jzkBDEHmUKbIPtfN35XaR30vuMdgCWuNsJJ3M=";

export default function Login() {
    const navigate = useNavigate();
    const { currentUser } = useContext(AuthContext);
    const [email,    setEmail]    = useState("");
    const [password, setPassword] = useState("");
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState("");

    useEffect(() => {
        if (currentUser) navigate("/");
    }, [currentUser, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#fafafb] dark:bg-[#0f172a] transition-colors duration-300">

            {/* ── Left: Hero image panel ── */}
            <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
                <img
                    src={loginImage}
                    alt="Badminton"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-12 left-10 right-10">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-[12px] flex items-center justify-center mb-4 border border-white/20">
                        <span className="text-white font-extrabold text-xl leading-none">B</span>
                    </div>
                    <h1 className="text-4xl font-black text-white leading-tight mb-2">BadmintonPro</h1>
                    <p className="text-white/70 text-[17px] font-medium">Ready to smash it? Log in to book your court.</p>
                </div>
            </div>

            {/* ── Right: Form panel ── */}
            <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-[420px]">

                    {/* Mobile brand */}
                    <div className="flex items-center gap-2 mb-8 md:hidden">
                        <div className="w-9 h-9 bg-[#1a1f2e] dark:bg-[#0f172a] rounded-[10px] flex items-center justify-center">
                            <span className="text-white font-extrabold text-lg leading-none">B</span>
                        </div>
                        <span className="text-[18px] font-black text-gray-900 dark:text-white">
                            Badminton<span className="text-emerald-500">Pro</span>
                        </span>
                    </div>

                    <h2 className="text-[28px] font-black text-gray-900 dark:text-white tracking-tight mb-1">Welcome back</h2>
                    <p className="text-gray-500 dark:text-slate-400 font-medium mb-8">Enter your details to sign in.</p>

                    {error && (
                        <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[13px] font-medium px-4 py-3 rounded-xl mb-5">
                            <AlertCircle size={15} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-[13px] font-bold text-gray-700 dark:text-slate-300 mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-[14px] font-medium text-gray-900 dark:text-white bg-white dark:bg-[#1e293b] placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-bold text-gray-700 dark:text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-[14px] font-medium text-gray-900 dark:text-white bg-white dark:bg-[#1e293b] placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-[#1a1f2e] dark:bg-emerald-600 hover:bg-black dark:hover:bg-emerald-700 text-white font-bold text-[15px] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2 cursor-pointer border-0"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                            {loading ? 'Signing in…' : 'Log In'}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                        <span className="text-[12px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-slate-300 font-bold text-[14px] hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            Sign in with Google
                        </button>
                    </div>

                    <p className="text-center mt-8 text-[14px] text-gray-500 dark:text-slate-400 font-medium">
                        Don&apos;t have an account?{' '}
                        <Link to="/register" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
