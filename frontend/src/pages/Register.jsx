import { useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from "../../supabase";
import { Mail, Lock, User, Phone, Loader2, AlertCircle } from 'lucide-react';

const registerImage = "https://sfycdn.speedsize.com/8140516e-7833-475e-b70f-6e943a98adee/https://badmintonhq.co.uk/cdn/shop/articles/123.jpg?v=1704207657";

export default function Register() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");

    const [formData, setFormData] = useState({
        name: "",
        phone_number: "",
        email: "",
        password: "",
        confirm_password: ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        phone: formData.phone_number
                    }
                }
            });
            if (error) throw error;
            navigate("/login");
        } catch (err) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const InputField = ({ label, name, type = "text", placeholder, icon: Icon }) => (
        <div>
            <label className="block text-[13px] font-bold text-gray-700 dark:text-slate-300 mb-1.5">{label}</label>
            <div className="relative">
                <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                <input
                    type={type}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-[14px] font-medium text-gray-900 dark:text-white bg-white dark:bg-[#1e293b] placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 transition-all"
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex bg-[#fafafb] dark:bg-[#0f172a] transition-colors duration-300">

            {/* ── Left: Hero image panel ── */}
            <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
                <img
                    src={registerImage}
                    alt="Badminton"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-12 left-10 right-10">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-[12px] flex items-center justify-center mb-4 border border-white/20">
                        <span className="text-white font-extrabold text-xl leading-none">B</span>
                    </div>
                    <h1 className="text-4xl font-black text-white leading-tight mb-2">Join the Members.</h1>
                    <p className="text-white/70 text-[17px] font-medium">Book faster. Play better.</p>
                </div>
            </div>

            {/* ── Right: Form panel ── */}
            <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto">
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

                    <h2 className="text-[28px] font-black text-gray-900 dark:text-white tracking-tight mb-1">Create Account</h2>
                    <p className="text-gray-500 dark:text-slate-400 font-medium mb-8">Fill in the details below to get started.</p>

                    {error && (
                        <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[13px] font-medium px-4 py-3 rounded-xl mb-5">
                            <AlertCircle size={15} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <InputField label="Full Name"       name="name"             placeholder="Enter your name"         icon={User}  />
                        <InputField label="Contact Number"  name="phone_number"     placeholder="Enter your phone number" icon={Phone} />
                        <InputField label="Email Address"   name="email"            type="email"    placeholder="Enter your email"    icon={Mail}  />

                        <div className="grid grid-cols-2 gap-3">
                            <InputField label="Password"         name="password"         type="password" placeholder="••••••••"            icon={Lock}  />
                            <InputField label="Confirm Password" name="confirm_password" type="password" placeholder="••••••••"            icon={Lock}  />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-[#1a1f2e] dark:bg-emerald-600 hover:bg-black dark:hover:bg-emerald-700 text-white font-bold text-[15px] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2 cursor-pointer border-0"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                            {loading ? 'Creating account…' : 'Sign Up'}
                        </button>
                    </form>

                    <p className="text-center mt-8 text-[14px] text-gray-500 dark:text-slate-400 font-medium">
                        Already a member?{' '}
                        <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                            Login here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
