import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../components/AuthProvider";
import { supabase } from "../../supabase";
import { 
    Heart, CreditCard, Bell, ShieldCheck, Settings, LogOut, 
    ChevronRight, Edit2, Trophy, Star, X, CheckCircle2, AlertTriangle, Camera
} from "lucide-react";

export default function ProfilePage() {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    // State
    const [name, setName] = useState(currentUser?.user_metadata?.full_name || "User");
    const [email, setEmail] = useState(currentUser?.email || "");

    const [imageFile, setImageFile] = useState(null);
    const [backgroundFile, setBackgroundFile] = useState(null);

    const [profileImage, setProfileImage] = useState(currentUser?.user_metadata?.photoURL || currentUser?.user_metadata?.avatar_url || '');
    const [imageError, setImageError] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState(
        localStorage.getItem(`bg_${currentUser?.id}`) || ''
    );
    const [showProfileImageModal, setShowProfileImageModal] = useState(false);
    const [showBackgroundImageModal, setShowBackgroundImageModal] = useState(false);

    const [message, setMessage] = useState({ text: "", type: "" });
    const [showMessageModal, setShowMessageModal] = useState(false);
    
    // Stats (Mocked or fetched, simplified for the design)
    const [bookingStats, setBookingStats] = useState({ total: 42, rating: 4.8 });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            navigate("/login");
            return;
        }

        const fetchStats = async () => {
            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('user_id', currentUser.id);

                if (error) throw error;
                
                const total = data?.length || 42; 
                setBookingStats({ total: total, rating: 4.8 });
            } catch (err) {
                console.error("Error: ", err.message);
                setBookingStats({ total: 42, rating: 4.8 });
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, [currentUser, navigate]);

    const showNotification = (text, type) => {
        setMessage({ text, type });
        setShowMessageModal(true);
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleProfileImageChange = async() => {
        if (!imageFile) return;
        try {
            const { data, error } = await supabase.storage
                .from('profile_images')
                .upload(`${currentUser.id}-${Date.now()}`, imageFile, { upsert: true });
            
            if (error) throw error;
            
            const { data: publicData } = supabase.storage
                .from('profile_images')
                .getPublicUrl(data.path);
            
            const newPhotoUrl = publicData.publicUrl;
            
            const { error: updateError } = await supabase.auth.updateUser({
                data: { photoURL: newPhotoUrl }
            });
            if (updateError) throw updateError;

            setProfileImage(newPhotoUrl);
            setShowProfileImageModal(false);
            setImageFile(null);
            showNotification("Profile picture updated!", "success");
        } catch (err) {
            showNotification("Something went wrong!", "error");
        }
    };

    const handleBackgroundChange = async() => {
        if (!backgroundFile) return;
        try {
            const { data, error } = await supabase.storage
                .from('background_images')
                .upload(`${currentUser.id}-${Date.now()}`, backgroundFile, { upsert: true });
            
            if (error) throw error;

            const { data: publicData } = supabase.storage
                .from('background_images')
                .getPublicUrl(data.path);
            
            const newBackgroundUrl = publicData.publicUrl;
            
            localStorage.setItem(`bg_${currentUser.id}`, newBackgroundUrl);
            setBackgroundImage(newBackgroundUrl);
            setShowBackgroundImageModal(false);
            showNotification("Background picture updated!", "success");
        } catch (err) {
            showNotification("Something went wrong!", "error");
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/');
        } catch (err) {
            console.error("Error logging out: ", err.message);
        }
    };

    if (loadingStats) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#fafafb] dark:bg-[#0f172a]">
                <div className="w-10 h-10 border-4 border-emerald-100 dark:border-slate-700 border-t-[#1fc6a1] rounded-full animate-spin" />
                <p className="mt-4 text-sm font-bold tracking-widest text-gray-400 dark:text-slate-500 uppercase">Loading Profile...</p>
            </div>
        );
    }

    // Render logic for menu items to keep code clean
    const renderMenuItem = (icon, label, colorClass, bgClass) => (
        <button className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer border-b border-gray-100 dark:border-slate-800 last:border-0 group">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bgClass} ${colorClass}`}>
                    {icon}
                </div>
                <span className="font-bold text-[15px] text-[#1a1f2e] dark:text-white group-hover:text-[#1fc6a1] transition-colors">{label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-300 dark:text-slate-600 group-hover:text-[#1fc6a1] transition-colors" />
        </button>
    );

    return (
        <div className="min-h-screen bg-[#fafafb] dark:bg-[#0f172a] py-8 pb-24 font-sans selection:bg-emerald-200 transition-colors duration-300">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                
                {/* Heading */}
                <h1 className="text-[28px] font-black text-[#1a1f2e] dark:text-white mb-6 tracking-tight">
                    Profile
                </h1>

                {/* Profile Card */}
                <div className="w-full bg-white dark:bg-[#1e293b] rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-[0_4px_25px_rgba(0,0,0,0.02)] dark:shadow-none overflow-hidden flex flex-col items-start relative mb-6 relative">
                    
                    {/* Background Header */}
                    <div 
                        className="h-32 w-full bg-[#eefbfa] dark:bg-[#1e293b] relative group"
                        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                    >
                        <button 
                            onClick={() => setShowBackgroundImageModal(true)}
                            className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm text-gray-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white tooltip-trigger"
                            title="Edit Background"
                        >
                            <Camera size={16} />
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="w-full px-6 pb-6 pt-16 relative">
                        {/* Avatar (Overlapping) */}
                        <div className="absolute -top-14 left-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-3xl bg-gray-200 dark:bg-slate-700 border-4 border-white dark:border-[#1e293b] shadow-sm overflow-hidden flex items-center justify-center">
                                    {!imageError && profileImage ? (
                                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" onError={() => setImageError(true)} />
                                    ) : (
                                        <span className="text-3xl font-black text-gray-400">{name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setShowProfileImageModal(true)}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#1fc6a1] border-2 border-white rounded-full flex items-center justify-center text-white hover:bg-[#1ab895] transition-colors shadow-sm cursor-pointer"
                                >
                                    <Edit2 size={12} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* Name and Details */}
                        <div className="ml-32 -mt-12 flex flex-col justify-center min-h-[48px]">
                            <h2 className="text-[22px] font-black text-[#1a1f2e] dark:text-white leading-tight flex items-center gap-2">
                                {name} <ShieldCheck size={18} className="text-[#1fc6a1] fill-[#eefbfa]" />
                            </h2>
                            <p className="text-[13px] font-medium text-gray-500 dark:text-slate-400">{email}</p>
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-3 mt-8">
                            <div className="flex items-center gap-1.5 bg-[#eefbfa] px-3 py-1.5 rounded-lg border border-[#1fc6a1]/10">
                                <Trophy size={14} className="text-[#1fc6a1]" strokeWidth={2.5}/>
                                <span className="text-[12px] font-bold text-[#1fc6a1]">{bookingStats.total} games</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                                <Star size={14} className="text-orange-500" strokeWidth={2.5} fill="currentColor"/>
                                <span className="text-[12px] font-bold text-orange-600">{bookingStats.rating}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#1e293b] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
                                <span className="text-[12px] font-bold text-gray-500 dark:text-slate-400">Since Oct 2023</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Options List */}
                <div className="w-full bg-white dark:bg-[#1e293b] rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-[0_4px_25px_rgba(0,0,0,0.02)] dark:shadow-none overflow-hidden mb-6">
                    <div className="flex flex-col">
                        {renderMenuItem(<Heart size={20} />, "Favorite Courts", "text-red-500", "bg-red-50")}
                        {renderMenuItem(<CreditCard size={20} />, "Payment Methods", "text-blue-500", "bg-blue-50")}
                        {renderMenuItem(<Bell size={20} />, "Notifications", "text-orange-500", "bg-orange-50")}
                        {renderMenuItem(<ShieldCheck size={20} />, "Privacy & Security", "text-[#1fc6a1]", "bg-[#eefbfa]")}
                        {renderMenuItem(<Settings size={20} />, "App Settings", "text-gray-500", "bg-gray-100")}
                    </div>
                </div>

                {/* Logout Button */}
                <button 
                    onClick={handleLogout}
                    className="w-full bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_4px_25px_rgba(0,0,0,0.02)] dark:shadow-none p-4 flex items-center justify-center gap-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-bold text-[15px] cursor-pointer"
                >
                    <LogOut size={18} strokeWidth={2.5} /> Log Out
                </button>

            </div>

            {/* ══════ MODALS ══════ */}

            {/* Edit Avatar Modal */}
            {showProfileImageModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowProfileImageModal(false)} />
                    <div className="relative bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl dark:shadow-none w-full max-w-sm mx-4 overflow-hidden border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-[#0f172a]">
                            <h3 className="font-bold text-gray-900 dark:text-white">Update Photo</h3>
                            <button onClick={() => setShowProfileImageModal(false)} className="text-gray-400 hover:text-gray-900 bg-white rounded-full p-1 border border-gray-200 shadow-sm"><X size={16}/></button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Choose Image File</label>
                            <input 
                                type="file" 
                                accept="image/png, image/jpeg, image/jpg" 
                                onChange={handleFileChange}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#eefbfa] file:text-[#1fc6a1] hover:file:bg-[#1fc6a1] hover:file:text-white transition-all cursor-pointer border border-gray-200 rounded-2xl p-2"
                            />
                            <p className="text-xs text-gray-400 mt-2">Supported formats: JPG, PNG. Max 5MB.</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-[#0f172a] border-t border-gray-100 dark:border-slate-800 flex gap-3">
                            <button onClick={() => setShowProfileImageModal(false)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleProfileImageChange} disabled={!imageFile} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-[#1fc6a1] hover:bg-[#1ab895] disabled:opacity-50 transition-colors shadow-sm">Upload & Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Background Modal */}
            {showBackgroundImageModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBackgroundImageModal(false)} />
                    <div className="relative bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl dark:shadow-none w-full max-w-sm mx-4 overflow-hidden border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-[#0f172a]">
                            <h3 className="font-bold text-gray-900 dark:text-white">Update Cover</h3>
                            <button onClick={() => setShowBackgroundImageModal(false)} className="text-gray-400 hover:text-gray-900 bg-white rounded-full p-1 border border-gray-200 shadow-sm"><X size={16}/></button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Choose Cover Image</label>
                            <input 
                                type="file" 
                                accept="image/png, image/jpeg, image/jpg" 
                                onChange={(e) => setBackgroundFile(e.target.files[0])}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#eefbfa] file:text-[#1fc6a1] hover:file:bg-[#1fc6a1] hover:file:text-white transition-all cursor-pointer border border-gray-200 rounded-2xl p-2"
                            />
                            <p className="text-xs text-gray-400 mt-2">Recommended aspect ratio 3:1 (e.g., 900x300px).</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-[#0f172a] border-t border-gray-100 dark:border-slate-800 flex gap-3">
                            <button onClick={() => setShowBackgroundImageModal(false)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleBackgroundChange} disabled={!backgroundFile} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-[#1fc6a1] hover:bg-[#1ab895] disabled:opacity-50 transition-colors shadow-sm">Upload Cover</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMessageModal(false)} />
                    <div className="relative bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl dark:shadow-none w-full max-w-xs mx-4 p-8 text-center animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center border border-gray-100 dark:border-slate-800">
                        {message.type === 'success' ? (
                            <div className="w-16 h-16 bg-[#eefbfa] rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} className="text-[#1fc6a1]" />
                            </div>
                        ) : (
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                        )}
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
                            {message.type === 'success' ? 'Success' : 'Oops!'}
                        </h3>
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-6">{message.text}</p>
                        <button onClick={() => setShowMessageModal(false)} className={`w-full py-3 rounded-full font-bold text-white shadow-sm transition-colors ${message.type === 'success' ? 'bg-[#1fc6a1] hover:bg-[#1ab895]' : 'bg-gray-900 hover:bg-black'}`}>
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}