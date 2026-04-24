import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home,
    Sprout,
    ClipboardList,
    CloudSun,
    BarChart3,
    Users,
    Microscope,
    UserCircle,
    X,
    LogOut,
    Truck,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const { t } = useLanguage();
    const { isDark } = useTheme();

    const getNavLinks = () => {
        if (!user) return [];
        if (user.role === 'farmer') return [
            { path: '/farmer', label: 'Dashboard', icon: Home },
            { path: '/farmer/crops', label: 'My Crops', icon: Sprout },
            { path: '/farmer/disease-reports', label: 'Disease Reports', icon: ClipboardList },
            { path: '/farmer/weather', label: 'Weather Updates', icon: CloudSun },
            { path: '/farmer/market', label: 'Market Trends', icon: BarChart3 },
            { path: '/farmer/schemes', label: 'Govt Schemes', icon: ClipboardList },
            { path: '/farmer/supply-chain', label: 'Supply Chain', icon: Truck },
        ];
        if (user.role === 'admin') return [
            { path: '/admin', label: 'Dashboard', icon: Home },
            { path: '/admin/farmers', label: 'Farmers', icon: Users },
            { path: '/admin/agronomists', label: 'Agronomists', icon: Microscope },
        ];
        if (user.role === 'agronomist') return [
            { path: '/agronomist', label: 'Dashboard', icon: Home },
            { path: '/agronomist/profile', label: 'Profile Settings', icon: UserCircle },
        ];
        return [];
    };

    const navLinks = getNavLinks();

    const isActive = (path) =>
        location.pathname === path ||
        (path !== '/' && path !== '/farmer' && path !== '/admin' && path !== '/agronomist' && location.pathname.startsWith(path));

    const variants = {
        open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
        closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } }
    };

    const overlayVariants = {
        open: { opacity: 1 },
        closed: { opacity: 0 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={overlayVariants}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={variants}
                        className={`fixed top-0 left-0 h-full w-72 z-[70] shadow-2xl overflow-y-auto border-r bg-[var(--bg-page)] border-[var(--border-card)] text-[var(--text-primary)]`}
                    >
                        <div className="p-6 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all bg-[var(--bg-card)] border-[var(--border-accent)]">
                                        <Sprout className="text-emerald-500 w-6 h-6" />
                                    </div>
                                    <span className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]">{t('Krishi Kavach')}</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full transition-colors hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-2 flex-1">
                                {navLinks.map((link) => {
                                    const active = isActive(link.path);
                                    const Icon = link.icon;
                                    return (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            onClick={onClose}
                                            className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 text-sm font-bold ${active
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-emerald-600'
                                                }`}
                                        >
                                            <Icon size={20} className={`${active ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-emerald-600'} transition-colors`} />
                                            <span>{t(link.label)}</span>
                                            {active && (
                                                <motion.div
                                                    layoutId="activePill"
                                                    className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>

                            <div className="pt-6 mt-6 border-t border-[var(--border-card)] space-y-4">
                                {user && (
                                    <div className="px-4 py-3 rounded-2xl border transition-colors bg-[var(--bg-card)] border-[var(--border-card)]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-inner">
                                                {user.fullName?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-black truncate text-[var(--text-primary)]">{user.fullName}</p>
                                                <p className="text-xs font-medium capitalize truncate text-[var(--text-secondary)]">{t(user.role)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {user?.role === 'farmer' && (
                                    <>
                                        <div className="mt-4 p-4 rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-500/20 group relative overflow-hidden">
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200 mb-1">{t('New Opportunity')}</p>
                                                <h4 className="text-sm font-bold leading-tight mb-3">{t('Govt Agriculture Schemes')}</h4>
                                                <Link
                                                    to="/farmer/schemes"
                                                    onClick={onClose}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 text-[10px] font-black rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
                                                >
                                                    {t('View Matches')} <ChevronRight size={14} />
                                                </Link>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                                <ClipboardList size={80} />
                                            </div>
                                        </div>

                                        {/* Real-time Recommended Scheme Preview */}
                                        <RecommendedSchemeSidebar onClose={onClose} />
                                    </>
                                )}

                                <button
                                    onClick={async () => {
                                        onClose();
                                        await logout();
                                    }}
                                    className="flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl transition-all font-bold active:scale-95 text-red-600 hover:bg-red-500/10"
                                >
                                    <LogOut size={22} />
                                    <span>{t('Logout')}</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};


const RecommendedSchemeSidebar = ({ onClose }) => {
    const { lang, t } = useLanguage();
    const [scheme, setScheme] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const { schemeAPI } = await import('../services/api');
                const res = await schemeAPI.getRecommendations(lang);
                if (res.data.recommendations?.length > 0) {
                    setScheme(res.data.recommendations[0]);
                }
            } catch (err) {
                console.error("Sidebar scheme preview failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPreview();
    }, [lang]);

    if (loading || !scheme) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] border-l-4 border-l-amber-500 overflow-hidden relative"
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded uppercase tracking-widest border border-amber-200/50">{t('MATCHED SCHEME')}</span>
                <span className="text-[9px] font-bold text-[var(--text-muted)]">{scheme.lastDate}</span>
            </div>
            <h5 className="text-xs font-black text-[var(--text-primary)] mb-1 leading-tight line-clamp-1">{scheme.title}</h5>
            <p className="text-[10px] text-[var(--text-secondary)] mb-3 line-clamp-2 leading-relaxed italic">"{scheme.shortDescription}"</p>
            <Link
                to={`/farmer/schemes/${scheme.id}`}
                onClick={onClose}
                className="text-[9px] font-black text-emerald-600 flex items-center gap-1 hover:gap-2 transition-all"
            >
                {t('View Details')} <ChevronRight size={12} />
            </Link>
        </motion.div>
    );
};

export default Sidebar;
