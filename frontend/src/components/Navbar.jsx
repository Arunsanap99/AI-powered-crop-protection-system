
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronRight,
  Settings,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import Sidebar from './Sidebar';
import ChatDrawer from './ChatDrawer';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Helper to get Page Title from Path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return t('Home');
    if (path.includes('/farmer/crops')) return t('My Crops');
    if (path.includes('/farmer/disease-reports')) return t('Disease Reports');
    if (path.includes('/farmer/weather')) return t('Weather Updates');
    if (path.includes('/farmer/market')) return t('Market Trends');
    if (path.includes('/farmer/profile')) return t('My Profile');
    if (path.includes('/farmer')) return t('Dashboard');

    if (path.includes('/admin/farmers')) return t('Farmers Management');
    if (path.includes('/admin/agronomists')) return t('Agronomist Verification');
    if (path.includes('/admin/profile')) return t('Admin Profile');
    if (path.includes('/admin')) return t('Admin Panel');

    if (path.includes('/agronomist/profile')) return t('Expert Profile');
    if (path.includes('/agronomist')) return t('Expert Panel');

    if (path === '/login') return t('Welcome Back');
    if (path === '/register') return t('Join Krishi Kavach');

    return 'Krishi Kavach';
  };

  const roleConfig = {
    farmer: { ring: 'ring-emerald-400', bg: 'bg-emerald-500', label: 'Farmer' },
    admin: { ring: 'ring-indigo-400', bg: 'bg-indigo-500', label: 'Admin' },
    agronomist: { ring: 'ring-teal-400', bg: 'bg-teal-500', label: 'Expert' },
  };

  const rc = user ? (roleConfig[user.role] || roleConfig.farmer) : roleConfig.farmer;

  return (
    <>
      <nav
        className={`sticky top-0 z-[50] transition-all duration-300 border-b ${scrolled
          ? 'bg-page/80 backdrop-blur-xl border-white/10 shadow-lg py-2'
          : 'bg-transparent border-transparent py-4'
          }`}
        style={{
          backgroundColor: scrolled ? 'var(--bg-page)' : 'transparent',
          borderColor: scrolled ? 'var(--border-card)' : 'transparent'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">

            {/* Left: Menu + Active Page Name */}
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 shadow-sm ${isDark
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <Menu size={20} />
              </button>

              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-4 w-[1px] bg-white/20 hidden sm:block mx-1" />
                <h1 className="font-bold text-lg sm:text-xl tracking-tight text-primary truncate max-w-[150px] sm:max-w-[300px]">
                  {getPageTitle()}
                </h1>
              </div>
            </div>

            {/* Middle: Logo (centered on desktop, hidden on mobile to save space) */}
            <Link to="/" className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                <ShieldCheck size={20} />
              </div>
              <span className="font-black text-lg tracking-tighter text-primary">{t('KRISHI KAVACH')}</span>
            </Link>

            {/* Right side: theme toggle + chat + profile */}
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
              {/* Chat Button */}
              {user && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 active:scale-90 relative ${isDark
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                  title="Collaboration & Chat"
                >
                  <MessageSquare size={20} />
                  {/* Notification Dot (Simplified for now) */}
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900" />
                </button>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 active:scale-90 ${isDark
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                title={isDark ? 'Switch to Light' : 'Switch to Dark'}
              >
                {isDark ? <Sun size={20} className="transition-transform duration-500 rotate-0" /> : <Moon size={20} className="transition-transform duration-500" />}
              </button>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`relative p-[1.5px] rounded-full transition-all hover:scale-105 active:scale-95 group shadow-lg ${isProfileOpen ? 'scale-105' : ''}`}
                  >
                    {/* Premium Gradient Ring */}
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${isDark ? 'from-emerald-400 via-teal-400 to-indigo-400 opacity-80' : 'from-emerald-600 via-teal-500 to-indigo-600'} transition-opacity group-hover:opacity-100 ${isProfileOpen ? 'opacity-100' : 'opacity-60'}`} />

                    <div className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-full p-[2px] ${isDark ? 'bg-gray-900' : 'bg-white'} overflow-hidden`}>
                      {user.profilePhoto?.url ? (
                        <img
                          src={user.profilePhoto.url}
                          alt={user.fullName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className={`${rc.bg} w-full h-full rounded-full flex items-center justify-center text-white font-black text-sm uppercase shadow-inner`}>
                          {user.fullName?.charAt(0)}
                        </div>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsProfileOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-64 kk-card-solid shadow-2xl p-2 z-20 overflow-hidden"
                        >
                          <div className="p-4 border-b border-border-card mb-2">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-sm font-black text-primary truncate max-w-[150px]">{user.fullName}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${rc.bg} text-white font-bold tracking-widest uppercase`}>
                                {t(rc.label)}
                              </span>
                            </div>
                            {/* As requested: Do not show email */}
                            {user.mobileNumber && (
                              <p className="text-xs text-secondary font-medium">{user.mobileNumber}</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Link
                              to={user.role === 'admin' ? '/admin/profile' : user.role === 'agronomist' ? '/agronomist/profile' : '/farmer/profile'}
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card-hover text-secondary hover:text-primary transition-all text-sm font-semibold group"
                            >
                              <User size={18} className="group-hover:text-indigo-400" />
                              <span>{t('My Profile')}</span>
                              <ChevronRight size={14} className="ml-auto opacity-30" />
                            </Link>

                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400 transition-all text-sm font-semibold group mt-1"
                            >
                              <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                              <span>{t('Sign Out')}</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" className="kk-btn-primary py-2 px-6 flex items-center gap-2">
                  <User size={16} />
                  <span>{t('Login')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <ChatDrawer 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </>
  );
};

export default Navbar;
