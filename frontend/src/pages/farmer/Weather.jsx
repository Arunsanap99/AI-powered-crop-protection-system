import { useState, useEffect, useRef } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  CloudSnow,
  Thermometer,
  Droplets,
  Wind,
  Navigation,
  Calendar,
  Sprout,
  Plus,
  X,
  Check,
  RotateCcw,
  Info,
  AlertTriangle,
  AlertCircle,
  Zap,
  Brain,
  LayoutGrid,
  TrendingUp,
  ChevronRight,
  MapPin,
  Star,
  CheckCircle2,
  ThumbsUp,
  Circle,
  Beaker
} from 'lucide-react';
import { weatherAPI, userAPI, geminiAPI, cropAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import AIKeyModal from '../../components/AIKeyModal';

// ─── Emoji map for popular crop names ─────────────────────────────────────────
const CROP_EMOJI_MAP = {
  wheat: '🌾', rice: '🍚', sugarcane: '🎋', cotton: '🌿', maize: '🌽',
  soybean: '🫘', tomato: '🍅', onion: '🧅', potato: '🥔', banana: '🍌',
  chilli: '🌶️', turmeric: '🟡', groundnut: '🥜', mustard: '🌻', chickpea: '🫘',
  mango: '🥭', grapes: '🍇', coconut: '🥥', lentil: '🫘', ginger: '🫚',
  garlic: '🧄', cauliflower: '🥦', radish: '🌱', pomegranate: '🍎',
  corn: '🌽', jowar: '🌾', bajra: '🌾', ragi: '🌾', sunflower: '🌻',
};
const getCropEmoji = (name) => CROP_EMOJI_MAP[name?.toLowerCase()] || '🌱';

const AREA_UNITS = ['acres', 'hectares', 'guntha', 'bigha'];

// ─── Weather code → description ───────────────────────────────────────────────
const getWeatherDescription = (code) => {
  const m = {
    0: { text: 'Clear Sky', icon: Sun, color: '#fbbf24' },
    1: { text: 'Mainly Clear', icon: CloudSun, color: '#fbbf24' },
    2: { text: 'Partly Cloudy', icon: CloudSun, color: '#94a3b8' },
    3: { text: 'Overcast', icon: Cloud, color: '#94a3b8' },
    45: { text: 'Fog', icon: CloudFog, color: '#64748b' },
    48: { text: 'Rime Fog', icon: CloudFog, color: '#64748b' },
    51: { text: 'Light Drizzle', icon: CloudDrizzle, color: '#60a5fa' },
    53: { text: 'Drizzle', icon: CloudDrizzle, color: '#60a5fa' },
    55: { text: 'Heavy Drizzle', icon: CloudRain, color: '#3b82f6' },
    61: { text: 'Light Rain', icon: CloudRain, color: '#3b82f6' },
    63: { text: 'Rain', icon: CloudRain, color: '#2563eb' },
    65: { text: 'Heavy Rain', icon: CloudRain, color: '#1d4ed8' },
    71: { text: 'Light Snow', icon: CloudSnow, color: '#cbd5e1' },
    80: { text: 'Rain Showers', icon: CloudDrizzle, color: '#60a5fa' },
    81: { text: 'Showers', icon: CloudRain, color: '#3b82f6' },
    82: { text: 'Heavy Showers', icon: CloudLightning, color: '#f87171' },
    95: { text: 'Thunderstorm', icon: CloudLightning, color: '#ef4444' },
    96: { text: 'Hail Storm', icon: CloudLightning, color: '#ef4444' },
    99: { text: 'Severe Hail', icon: CloudLightning, color: '#ef4444' },
  };
  return m[code] || { text: 'Unknown', icon: Thermometer, color: '#94a3b8' };
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ─── Status colour config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Excellent: { dot: '#10b981', badge: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.3)', icon: Star },
  Good: { dot: '#3b82f6', badge: 'linear-gradient(135deg,#3b82f6,#2563eb)', glow: 'rgba(59,130,246,0.3)', icon: CheckCircle2 },
  Moderate: { dot: '#f59e0b', badge: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.3)', icon: CloudSun },
  Caution: { dot: '#f97316', badge: 'linear-gradient(135deg,#f97316,#ea580c)', glow: 'rgba(249,115,22,0.3)', icon: AlertTriangle },
  Critical: { dot: '#ef4444', badge: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.3)', icon: AlertCircle },
};
const FACTOR_STATUS = {
  optimal: { border: '#6ee7b7', bg: 'rgba(16,185,129,0.08)', icon: CheckCircle2, label: 'Optimal', text: '#6ee7b7' },
  good: { border: '#93c5fd', bg: 'rgba(59,130,246,0.08)', icon: ThumbsUp, label: 'Good', text: '#93c5fd' },
  warning: { border: '#fcd34d', bg: 'rgba(245,158,11,0.08)', icon: AlertTriangle, label: 'Caution', text: '#fcd34d' },
  danger: { border: '#fca5a5', bg: 'rgba(239,68,68,0.08)', icon: Circle, label: 'Risk', text: '#fca5a5' },
};
const ALERT_CFG = {
  info: { border: 'rgba(148,163,184,0.25)', icon: Info, dot: '#3b82f6' },
  warning: { border: 'rgba(245,158,11,0.3)', icon: AlertTriangle, dot: '#f59e0b' },
  danger: { border: 'rgba(239,68,68,0.35)', icon: AlertCircle, dot: '#ef4444' },
};

// ─────────────────────────────────────────────────────────────────────────────
const Weather = () => {
  const { isDark } = useTheme();
  const { lang, t } = useLanguage();

  /* ── weather ── */
  const [weather, setWeather] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ── my crops (from crop management DB) ── */
  const [myCrops, setMyCrops] = useState([]);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [selectedCropId, setSelectedCropId] = useState(null); // selected _id or 'new'

  /* ── add-new-crop inline form ── */
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropArea, setNewCropArea] = useState('');
  const [newCropUnit, setNewCropUnit] = useState('acres');
  const [addingCrop, setAddingCrop] = useState(false);
  const [addCropError, setAddCropError] = useState('');
  const [addCropToast, setAddCropToast] = useState('');

  /* ── impact analysis ── */
  const [impactLoading, setImpactLoading] = useState(false);
  const [impact, setImpact] = useState(null);
  const [impactError, setImpactError] = useState('');
  const [analyzedCrop, setAnalyzedCrop] = useState(null); // {name, area}
  const [showKeyModal, setShowKeyModal] = useState(false);

  const impactRef = useRef(null);

  /* ── initial fetch ── */
  useEffect(() => {
    fetchUserLocation();
    fetchWeather();
    fetchMyCrops();
  }, []);

  const fetchUserLocation = async () => {
    try {
      const r = await userAPI.getProfile();
      const p = r.data;
      if (p.location?.coordinates && p.address) {
        setUserLocation({ district: p.address.district || '', taluka: p.address.taluka || '' });
      }
    } catch { /* silent */ }
  };

  const fetchWeather = async () => {
    try {
      setLoading(true); setError('');
      const r = await weatherAPI.getWeather();
      setWeather(r.data);
      setImpact(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCrops = async () => {
    try {
      setCropsLoading(true);
      const r = await cropAPI.getCrops();
      setMyCrops(r.data || []);
    } catch {
      setMyCrops([]);
    } finally {
      setCropsLoading(false);
    }
  };

  /* ── derived weather values ── */
  const currentWeather = weather?.current ? {
    temperature: Math.round(weather.current.temperature_2m),
    feelsLike: Math.round(weather.current.apparent_temperature),
    humidity: Math.round(weather.current.relative_humidity_2m),
    windSpeed: Math.round(weather.current.wind_speed_10m),
    precipitation: weather.current.precipitation || 0,
    weatherCode: weather.current.weather_code,
    time: weather.current.time,
  } : null;

  const dailyForecast = weather?.daily
    ? weather.daily.time.map((date, i) => ({
      date,
      maxTemp: Math.round(weather.daily.temperature_2m_max[i]),
      minTemp: Math.round(weather.daily.temperature_2m_min[i]),
      weatherCode: weather.daily.weather_code[i],
      precipitation: weather.daily.precipitation_sum[i] || 0,
      precipitationProbability: weather.daily.precipitation_probability_max[i] || 0,
    }))
    : [];

  const currentWeatherInfo = currentWeather ? getWeatherDescription(currentWeather.weatherCode) : null;

  /* ── selected crop object ── */
  const selectedCrop = myCrops.find(c => c._id === selectedCropId) || null;

  /* ── add new crop inline ── */
  const handleAddNewCrop = async () => {
    if (!newCropName.trim()) { setAddCropError('Please enter a crop name.'); return; }
    if (!newCropArea || parseFloat(newCropArea) <= 0) { setAddCropError('Please enter a valid area.'); return; }
    setAddingCrop(true);
    setAddCropError('');
    try {
      const res = await cropAPI.addCrop({
        cropName: newCropName.trim(),
        cropVariety: 'Weather Analysis',
        plantingDate: new Date().toISOString().split('T')[0],
        area: { value: parseFloat(newCropArea), unit: newCropUnit },
      });
      // extract _id before refreshing (backend returns { message, crop })
      const newId = res.data?.crop?._id || res.data?._id;
      await fetchMyCrops();
      // auto-select after list is refreshed
      if (newId) setSelectedCropId(newId);
      setAddCropToast(`✅ "${newCropName.trim()}" added to Crop Management!`);
      setTimeout(() => setAddCropToast(''), 4000);
      setShowAddForm(false);
      setNewCropName(''); setNewCropArea(''); setNewCropUnit('acres');
    } catch (err) {
      setAddCropError(err.response?.data?.message || 'Failed to add crop. Try again.');
    } finally {
      setAddingCrop(false);
    }
  };

  /* ── run impact analysis ── */
  const handleAnalyzeImpact = async () => {
    if (!selectedCrop || !currentWeather) return;
    setImpactLoading(true);
    setImpact(null);
    setImpactError('');

    // Check for User's API Key
    const userStored = JSON.parse(localStorage.getItem('user'));
    if (!userStored?.groqApiKey) {
      setShowKeyModal(true);
      setImpactLoading(false);
      return;
    }

    setAnalyzedCrop({
      name: selectedCrop.cropName,
      area: `${selectedCrop.area?.value || selectedCrop.area} ${selectedCrop.area?.unit || 'acres'}`,
    });
    try {
      const res = await geminiAPI.getWeatherCropImpact(
        selectedCrop.cropName,
        currentWeather,
        dailyForecast,
        lang || 'en',
      );
      setImpact(res.data.impact);
      setTimeout(() => impactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (err) {
      setImpactError(err.response?.data?.message || 'Could not analyze weather impact. Please try again.');
    } finally {
      setImpactLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="wr-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .wr-root {
          font-family: 'Inter', -apple-system, sans-serif;
          background: var(--bg-page);
          min-height: 100vh;
          padding: 28px 16px 72px;
          color: var(--text-primary);
        }
        .wr-wrap { max-width: 1080px; margin: 0 auto; }

        /* ── Animations ── */
        @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes shimmer  { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 18px rgba(16,185,129,.25)} 50%{box-shadow:0 0 36px rgba(16,185,129,.55)} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes scoreIn  { from{stroke-dashoffset:283} }

        .fade-up   { animation: fadeUp .48s ease both; }
        .spin-anim { animation: spin 1s linear infinite; }
        .float-anim{ animation: float 3.2s ease-in-out infinite; }
        .glow-btn  { animation: glow 2.2s ease-in-out infinite; }

        .shimmer-box {
          background: linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%);
          background-size:600px 100%; animation:shimmer 1.6s infinite;
        }

        /* ── Glass ── */
        .glass {
          background: var(--bg-card);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border: 1px solid var(--border-card);
          border-radius: 24px;
          box-shadow: var(--shadow-sm);
        }
        .glass-sm {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
        }

        /* ── Crop card ── */
        .crop-card {
          transition: all .18s cubic-bezier(.4,0,.2,1);
          cursor: pointer;
          border: 1.5px solid ${isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0'};
          border-radius: 18px;
          padding: 14px 10px;
          background: ${isDark ? 'rgba(255,255,255,0.04)' : 'white'};
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          position: relative;
          box-shadow: ${isDark ? 'none' : '0 4px 6px rgba(0,0,0,0.02)'};
        }
        .crop-card:hover { transform:translateY(-3px) scale(1.03); background:${isDark ? 'rgba(255,255,255,0.09)' : '#f8fafc'}; border-color:rgba(16,185,129,0.5); }
        .crop-card.selected { background:${isDark ? 'rgba(16,185,129,0.16)' : '#ecfdf5'}; border-color:#10b981 !important; box-shadow:0 0 18px rgba(16,185,129,0.28); }
        .crop-card .check-badge {
          position:absolute; top:-7px; right:-7px;
          width:20px; height:20px; border-radius:50%;
          background:linear-gradient(135deg,#10b981,#059669);
          display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:900; color:white;
          box-shadow:0 2px 8px rgba(16,185,129,.5);
        }

        /* ── Forecast card ── */
        .fc-card { transition:transform .2s,box-shadow .2s; }
        .fc-card:hover { transform:translateY(-4px); box-shadow:0 14px 32px rgba(0,0,0,.45); }

        /* ── Input ── */
        .wr-input {
          width:100%; padding:11px 14px; font-family:Inter,sans-serif;
          background: ${isDark ? 'rgba(255,255,255,0.06)' : 'white'}; 
          border:1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
          border-radius:12px; color: ${isDark ? '#e2e8f0' : '#1e293b'}; font-size:14px; outline:none; box-sizing:border-box;
          transition:border-color .2s;
        }
        .wr-input:focus { border-color:rgba(16,185,129,0.6); }
        .wr-input::placeholder { color:#475569; }
        .wr-select {
          padding:11px 14px; font-family:Inter,sans-serif;
          background: ${isDark ? 'rgba(255,255,255,0.06)' : 'white'}; 
          border:1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
          border-radius:12px; color: ${isDark ? '#e2e8f0' : '#1e293b'}; font-size:14px; outline:none;
          transition:border-color .2s; cursor:pointer;
        }
        .wr-select:focus { border-color:rgba(16,185,129,0.6); }
        .wr-select option { background: ${isDark ? '#1e293b' : 'white'}; color: ${isDark ? 'white' : '#1e293b'}; }

        /* ── Score ring ── */
        .score-ring circle.track    { stroke:rgba(255,255,255,0.08); }
        .score-ring circle.progress {
          stroke-dasharray:283; animation:scoreIn 1.2s ease-out forwards;
          transform:rotate(-90deg); transform-origin:50% 50%;
        }

        /* ── Stat pill ── */
        .stat-pill {
          background: ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)'}; 
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'};
          border-radius:14px; padding:14px 10px; text-align:center; backdrop-filter:blur(8px);
          box-shadow: ${isDark ? 'none' : '0 4px 6px rgba(0,0,0,0.02)'};
        }

        @media(max-width:640px) {
          .wr-root { padding:14px 10px 56px; }
          .temp-big { font-size:4.2rem !important; }
        }
      `}</style>

      <div className="wr-wrap">

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }} className="fade-up">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,rgba(16,185,129,.14),rgba(6,95,70,.3))', border: '1px solid rgba(16,185,129,.28)', padding: '8px 22px', borderRadius: 50, marginBottom: 14 }}>
            <Sprout size={16} className="text-emerald-400" />
            <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{t('Farm Intelligence')}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem,4vw,2.7rem)', fontWeight: 900, color: isDark ? 'white' : '#1e293b', margin: '0 0 8px', lineHeight: 1.1 }}>
            Weather &amp; {t('Crop Impact')}
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            {t('Select a crop from your farm to see real-time weather impact analysis')}
          </p>
          {userLocation?.district && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: isDark ? 'rgba(251,191,36,0.09)' : '#fffbeb', border: isDark ? '1px solid rgba(251,191,36,.22)' : '1px solid #fde68a', padding: '5px 14px', borderRadius: 50 }}>
              <MapPin size={12} className="text-amber-500" />
              <span style={{ color: isDark ? '#fbbf24' : '#d97706', fontWeight: 600, fontSize: 12 }}>{userLocation.district}{userLocation.taluka ? `, ${userLocation.taluka}` : ''}</span>
            </div>
          )}
        </div>

        {/* ── WEATHER LOADING ───────────────────────────────────────────────── */}
        {loading && (
          <div className="glass fade-up" style={{ padding: '64px 20px', textAlign: 'center', marginBottom: 24 }}>
            <div className="float-anim" style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <CloudSun size={64} className="text-emerald-400" />
            </div>
            <p style={{ color: '#64748b', fontSize: 15 }}>{t('Fetching your farm\'s weather data…')}</p>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,.28)', borderRadius: 16, padding: '18px 22px', textAlign: 'center', color: '#fca5a5', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} className="fade-up">
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {currentWeather && currentWeatherInfo && !loading && (
          <>
            {/* ════════════════════════════════════════════════════════════════ */}
            {/* CURRENT WEATHER HERO                                            */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="glass fade-up" style={{ marginBottom: 22, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 210, height: 210, background: 'radial-gradient(circle,rgba(16,185,129,.13) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -40, left: -40, width: 170, height: 170, background: 'radial-gradient(circle,rgba(59,130,246,.10) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

              <div style={{ padding: '30px 26px', position: 'relative' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 26 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className="float-anim">
                      <currentWeatherInfo.icon size={64} style={{ color: currentWeatherInfo.color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 21, fontWeight: 800, color: isDark ? 'white' : '#1e293b', margin: 0 }}>{currentWeatherInfo.text}</p>
                      <p style={{ fontSize: 12, color: isDark ? '#64748b' : '#64748b', margin: '3px 0 0' }}>
                        {t('Updated')}: {new Date(currentWeather.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="temp-big" style={{ fontSize: '5.2rem', fontWeight: 900, color: isDark ? 'white' : '#1e293b', lineHeight: 1, letterSpacing: -4 }}>
                      {currentWeather.temperature}°
                    </div>
                    <p style={{ fontSize: 13, color: isDark ? '#64748b' : '#475569', margin: '4px 0 0' }}>{t('Feels like')} {currentWeather.feelsLike}°C</p>
                    {dailyForecast.length > 0 && (
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#f87171', margin: '4px 0 0' }}>
                        H: {dailyForecast[0].maxTemp}° <span style={{ color: '#60a5fa' }}>L: {dailyForecast[0].minTemp}°</span>
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
                  {[
                    { icon: Droplets, label: t('Humidity'), value: `${currentWeather.humidity}%`, color: '#60a5fa' },
                    { icon: Wind, label: t('Wind'), value: `${currentWeather.windSpeed} km/h`, color: '#94a3b8' },
                    { icon: CloudRain, label: t('Precipitation'), value: `${currentWeather.precipitation.toFixed(1)} mm`, color: '#3b82f6' },
                    { icon: Thermometer, label: t('Feels Like'), value: `${currentWeather.feelsLike}°C`, color: '#f87171' },
                  ].map(s => (
                    <div key={s.label} className="stat-pill">
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                        <s.icon size={20} style={{ color: s.color }} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: isDark ? 'white' : '#1e293b' }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 18, textAlign: 'right' }}>
                  <button onClick={fetchWeather} disabled={loading}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 16px', color: '#64748b', fontSize: 12, cursor: 'pointer', transition: 'all .2s', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#64748b'; }}>
                    <RotateCcw size={12} className={loading ? 'spin-anim' : ''} /> {t('Refresh')}
                  </button>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 7-DAY FORECAST                                                  */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {dailyForecast.length > 0 && (
              <div className="glass fade-up" style={{ padding: '26px', marginBottom: 22 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: isDark ? 'white' : '#1e293b', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={18} className="text-emerald-400" /> {t('7-Day Forecast')}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10 }}>
                  {dailyForecast.map((day, i) => {
                    const di = getWeatherDescription(day.weatherCode);
                    const hr = day.precipitationProbability >= 70;
                    const mr = day.precipitationProbability >= 40;
                    return (
                      <div key={i} className="glass-sm fc-card" style={{ padding: '14px 10px', textAlign: 'center' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: .5 }}>{formatDate(day.date)}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                          <di.icon size={28} style={{ color: di.color }} />
                        </div>
                        <p style={{ fontSize: 10, color: '#475569', margin: '0 0 8px' }}>{di.text}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: isDark ? 'white' : '#1e293b' }}>{day.maxTemp}°</span>
                          <span style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569' }}>/ {day.minTemp}°</span>
                        </div>
                        {day.precipitationProbability > 0 && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: hr ? '#f87171' : mr ? '#fbbf24' : '#34d399', background: hr ? 'rgba(239,68,68,.12)' : mr ? 'rgba(251,191,36,.12)' : 'rgba(52,211,153,.12)', borderRadius: 8, padding: '2px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Droplets size={10} /> {day.precipitationProbability}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* CROP SELECTOR — MY CROPS FROM CROP MANAGEMENT                  */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="glass fade-up" style={{ padding: '28px', marginBottom: 22 }}>

              {/* Header row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
                <div>
                  <h2 style={{ fontSize: 19, fontWeight: 900, color: isDark ? 'white' : '#1e293b', margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sprout size={20} className="text-emerald-400" /> {t('Weather Impact on Your Crop')}
                  </h2>
                  <p style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 13, margin: 0 }}>
                    {t('Choose a crop from your farm to analyse how today\'s weather affects it')}
                  </p>
                </div>

                {/* Add new crop button */}
                <button
                  onClick={() => { setShowAddForm(v => !v); setAddCropError(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: showAddForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#10b981,#059669)',
                    border: 'none', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: 13, transition: 'all .2s',
                    boxShadow: showAddForm ? 'none' : '0 4px 16px rgba(16,185,129,.3)',
                  }}>
                  {showAddForm ? <><X size={14} /> {t('Cancel')}</> : <><Plus size={14} /> {t('Add New Crop')}</>}
                </button>
              </div>

              {/* ── Add new crop inline form ── */}
              {showAddForm && (
                <div className="fade-up" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 18, padding: '20px', marginBottom: 20 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#6ee7b7', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Plus size={18} /> Add Crop for Weather Analysis
                  </p>
                  {addCropError && (
                    <div style={{ background: 'rgba(239,68,68,.09)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 10, padding: '8px 12px', color: '#fca5a5', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={14} /> {addCropError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 6 }}>{t('Crop Name')}</label>
                      <input
                        className={`wr-input ${isDark ? '' : 'bg-white text-gray-900 border-gray-200'}`}
                        type="text"
                        value={newCropName}
                        onChange={e => setNewCropName(e.target.value)}
                        placeholder="e.g. Wheat, Rice, Tomato…"
                        style={isDark ? {} : { background: 'white', color: '#1e293b', borderColor: '#e2e8f0' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 6 }}>{t('Area')}</label>
                      <input
                        className="wr-input"
                        type="number" min="0.1" step="0.1"
                        value={newCropArea}
                        onChange={e => setNewCropArea(e.target.value)}
                        placeholder="2.5"
                        style={{ width: 90 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 6 }}>{t('Unit')}</label>
                      <select className="wr-select" value={newCropUnit} onChange={e => setNewCropUnit(e.target.value)}>
                        {AREA_UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleAddNewCrop}
                    disabled={addingCrop}
                    style={{
                      marginTop: 14, width: '100%', padding: '12px', borderRadius: 13, border: 'none',
                      background: addingCrop ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#10b981,#059669)',
                      color: addingCrop ? '#475569' : 'white', fontWeight: 800, fontSize: 14,
                      cursor: addingCrop ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: addingCrop ? 'none' : '0 6px 20px rgba(16,185,129,.3)', transition: 'all .2s',
                    }}>
                    {addingCrop ? (
                      <><RotateCcw size={16} className="spin-anim" /> Adding…</>
                    ) : (
                      <><Check size={16} /> {t('Add Crop & Save to Crop Management')}</>
                    )}
                  </button>
                  <p style={{ fontSize: 11, color: '#475569', margin: '10px 0 0', textAlign: 'center' }}>
                    {t('This crop will also appear in your')} <strong style={{ color: '#6ee7b7' }}>{t('Crop Management')}</strong> {t('section')}
                  </p>
                </div>
              )}

              {/* ── Add crop toast ── */}
              {addCropToast && (
                <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', borderRadius: 24, textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <Sprout size={48} className={isDark ? "text-emerald-500/20" : "text-emerald-500/40"} />
                  </div>
                  <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700, margin: 0 }}>{t('No crops added yet')}</p>
                  <p style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 13, marginTop: 6 }}>{t('Add crops in')} <strong style={{ color: '#6ee7b7' }}>{t('Crop Management')}</strong> {t('to see live market prices here.')}</p>
                </div>
              )}

              {/* ── My Crops Cards ── */}
              {cropsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
                  {[1, 2, 3, 4].map(i => <div key={i} className="shimmer-box" style={{ height: 100, borderRadius: 16 }} />)}
                </div>
              ) : myCrops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <LayoutGrid size={48} className="text-slate-700" />
                  </div>
                  <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{t('No crops in your farm yet')}</p>
                  <p style={{ color: '#334155', fontSize: 12, margin: '0 0 14px' }}>{t('Add your first crop above to analyse weather impact')}</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, padding: '10px 22px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,.28)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <Plus size={14} /> {t('Add Your First Crop')}
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: '#475569', fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: .5 }}>
                    {t('Your Crops')} ({myCrops.length}) — {t('tap to select for analysis')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
                    {myCrops.map(crop => {
                      const isSelected = selectedCropId === crop._id;
                      const emoji = getCropEmoji(crop.cropName);
                      return (
                        <button
                          key={crop._id}
                          onClick={() => { setSelectedCropId(crop._id); setImpact(null); }}
                          className={`crop-card ${isSelected ? 'selected' : ''}`}>
                          {isSelected && <div className="check-badge"><Check size={10} strokeWidth={4} /></div>}
                          <span style={{ fontSize: 32 }}>{emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#10b981' : (isDark ? '#e2e8f0' : '#1e293b'), textAlign: 'center', lineHeight: 1.2 }}>{crop.cropName}</span>
                          <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#475569', fontWeight: 500 }}>
                            {crop.area?.value || crop.area} {crop.area?.unit || 'acres'}
                          </span>
                          {crop.cropVariety && crop.cropVariety !== 'AI Guide' && crop.cropVariety !== 'Weather Analysis' && (
                            <span style={{ fontSize: 9, color: '#334155', background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 6px' }}>{crop.cropVariety}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Show selected crop summary ── */}
              {selectedCrop && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
                  <span style={{ fontSize: 28 }}>{getCropEmoji(selectedCrop.cropName)}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 800, color: '#6ee7b7', margin: 0, fontSize: 15 }}>{selectedCrop.cropName}</p>
                    <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>
                      {selectedCrop.area?.value || selectedCrop.area} {selectedCrop.area?.unit || 'acres'}
                      {selectedCrop.cropVariety && selectedCrop.cropVariety !== 'AI Guide' && selectedCrop.cropVariety !== 'Weather Analysis' && (
                        <> · Variety: {selectedCrop.cropVariety}</>
                      )}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={12} /> Selected
                  </span>
                </div>
              )}

              {/* ── Analyze button ── */}
              <button
                onClick={handleAnalyzeImpact}
                disabled={!selectedCrop || impactLoading}
                className={selectedCrop && !impactLoading ? 'glow-btn' : ''}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                  fontWeight: 900, fontSize: 16, cursor: !selectedCrop || impactLoading ? 'not-allowed' : 'pointer',
                  background: !selectedCrop || impactLoading
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg,#10b981 0%,#059669 60%,#065f46 100%)',
                  color: !selectedCrop || impactLoading ? '#334155' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: selectedCrop && !impactLoading ? '0 8px 32px rgba(16,185,129,.38)' : 'none',
                  transition: 'all .2s',
                }}>
                {impactLoading ? (
                  <>
                    <RotateCcw size={20} className="spin-anim" />
                    Analysing weather impact on {selectedCrop?.cropName}…
                  </>
                ) : selectedCrop ? (
                  <>
                    <Brain size={20} />
                    {t('Analyse Weather Impact on')} {selectedCrop.cropName}
                    <ChevronRight size={20} />
                  </>
                ) : (
                  <>
                    <Info size={20} />
                    {t('Select a crop above to analyse')}
                  </>
                )}
              </button>

              {impactError && (
                <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,.22)', borderRadius: 12, padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>
                  ⚠️ {impactError}
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* LOADING SKELETONS                                               */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {impactLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-up">
                {[260, 200, 180, 160].map((h, i) => (
                  <div key={i} className="shimmer-box" style={{ height: h, borderRadius: 22 }} />
                ))}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* IMPACT ANALYSIS RESULT                                          */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {impact && !impactLoading && (
              <div ref={impactRef} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="fade-up">

                {/* ── Overall Status ── */}
                {(() => {
                  const sc = STATUS_CONFIG[impact.overallStatus] || STATUS_CONFIG.Moderate;
                  const score = Math.min(100, Math.max(0, impact.overallScore || 0));
                  const offset = 283 - (score / 100) * 283;
                  return (
                    <div style={{ background: `radial-gradient(ellipse at top right,${sc.glow} 0%,transparent 55%)`, border: `1px solid ${sc.dot}30`, borderRadius: 24, padding: '28px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, background: `radial-gradient(circle,${sc.dot}20 0%,transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />

                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 22 }}>
                        {/* Score ring */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <svg className="score-ring" width="108" height="108" viewBox="0 0 108 108">
                            <circle className="track" cx="54" cy="54" r="45" strokeWidth="9" fill="none" />
                            <circle className="progress" cx="54" cy="54" r="45" strokeWidth="9" fill="none" stroke={sc.dot} strokeLinecap="round" strokeDashoffset={offset} />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 24, fontWeight: 900, color: sc.dot }}>{score}</span>
                            <span style={{ fontSize: 9, color: '#475569', fontWeight: 600, textTransform: 'uppercase' }}>/ 100</span>
                          </div>
                        </div>

                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                            <sc.icon size={26} style={{ color: sc.dot }} />
                            <span style={{ background: sc.badge, color: 'white', fontSize: 11, fontWeight: 800, padding: '3px 12px', borderRadius: 50, textTransform: 'uppercase', letterSpacing: .5 }}>
                              {impact.overallStatus}
                            </span>
                          </div>
                          <p style={{ fontSize: 17, fontWeight: 800, color: isDark ? 'white' : '#1e293b', margin: '0 0 6px' }}>
                            {analyzedCrop?.name} Weather Analysis
                          </p>
                          <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.6, margin: 0 }}>{impact.overallMessage}</p>
                          {analyzedCrop?.area && (
                            <p style={{ fontSize: 11, color: '#475569', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <LayoutGrid size={12} /> Area: {analyzedCrop.area}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Factor Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
                  {impact.impacts?.map((item, i) => {
                    const fs = FACTOR_STATUS[item.status] || FACTOR_STATUS.good;
                    return (
                      <div key={i} style={{ background: fs.bg, border: `1px solid ${fs.border}50`, borderRadius: 20, padding: '18px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 800, color: fs.text, background: `${fs.border}20`, border: `1px solid ${fs.border}50`, borderRadius: 50, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <fs.icon size={10} /> {fs.label}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                          {/* We don't have Lucide icons for every weather factor yet, but we can try to map them or use a fallback */}
                          <div style={{ fontSize: 26 }}>{item.icon}</div>
                          <div>
                            <p style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{item.factor}</p>
                            <p style={{ fontSize: 22, fontWeight: 900, color: isDark ? 'white' : '#1e293b', margin: '2px 0 0' }}>{item.currentValue}</p>
                          </div>
                        </div>
                        <div style={{ background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.04)', borderRadius: 12, padding: '9px 11px', marginBottom: 9 }}>
                          <p style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#475569', margin: 0, lineHeight: 1.6 }}>
                            <strong style={{ color: isDark ? '#cbd5e1' : '#1e293b' }}>Impact: </strong>{item.impact}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <Info size={13} className="mt-1 flex-shrink-0" style={{ color: fs.text }} />
                          <p style={{ fontSize: 12, color: fs.text, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{item.recommendation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Immediate Actions ── */}
                {impact.immediateActions?.length > 0 && (
                  <div className="glass" style={{ padding: '22px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? 'white' : '#1e293b', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Zap size={18} className="text-yellow-400" /> {t('Immediate Actions')} — {t('Today')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {impact.immediateActions.map((action, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)', borderRadius: 13, padding: '11px 14px' }}>
                          <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'white', flexShrink: 0 }}>{i + 1}</div>
                          <p style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#475569', margin: 0, lineHeight: 1.6 }}>{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Key Risks ── */}
                {impact.keyRisks?.length > 0 && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 20, padding: '22px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f87171', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={18} /> {t('Key Risks This Week')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {impact.keyRisks.map((risk, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                          <ChevronRight size={14} className="text-red-400 mt-1" />
                          <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, lineHeight: 1.6 }}>{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Weekly Advisory Timeline ── */}
                {impact.weeklyAdvisory?.length > 0 && (
                  <div className="glass" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? 'white' : '#1e293b', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Calendar size={18} className="text-emerald-400" /> {t('7-Day Crop Advisory')}
                    </h3>
                    <div style={{ position: 'relative', paddingLeft: 26 }}>
                      <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom,rgba(16,185,129,.5),rgba(16,185,129,.04))', borderRadius: 2 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {impact.weeklyAdvisory.map((item, i) => {
                          const ac = ALERT_CFG[item.alertLevel] || ALERT_CFG.info;
                          const fDay = dailyForecast[i];
                          const fInfo = fDay ? getWeatherDescription(fDay.weatherCode) : null;
                          return (
                            <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                              <div style={{ position: 'absolute', left: -22, width: 12, height: 12, background: ac.dot, borderRadius: '50%', border: '2px solid #0a0f1e', top: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 6, height: 6, background: 'white', borderRadius: '50%' }} />
                              </div>
                              <div style={{ flex: 1, background: `rgba(255,255,255,0.03)`, border: `1px solid ${ac.border}`, borderRadius: 14, padding: '11px 14px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, flex: 1 }}>
                                  {fInfo && <fInfo.icon size={20} style={{ color: fInfo.color }} />}
                                  <div>
                                    <p style={{ fontSize: 12, fontWeight: 800, color: isDark ? 'white' : '#1e293b', margin: 0 }}>{item.day}</p>
                                    <p style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', margin: '2px 0 0', lineHeight: 1.5 }}>{item.advice || item.alert}</p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 8 }}>
                                  <ac.icon size={12} style={{ color: ac.dot }} />
                                  <span style={{ fontSize: 9, fontWeight: 800, color: ac.dot, textTransform: 'uppercase', letterSpacing: 1 }}>{item.alertLevel}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Best Time for Activities ── */}
                {impact.bestTimeForActivities && (
                  <div className="glass" style={{ padding: '22px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? 'white' : '#1e293b', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <TrendingUp size={18} className="text-emerald-400" /> Best Time for Farm Activities
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                      {[
                        { icon: Beaker, label: 'Spray Pesticides / Fertilizers', value: impact.bestTimeForActivities.spraying, color: '#a78bfa' },
                        { icon: Droplets, label: 'Irrigation Schedule', value: impact.bestTimeForActivities.irrigation, color: '#60a5fa' },
                        { icon: Sprout, label: 'Harvest Window', value: impact.bestTimeForActivities.harvesting, color: '#4ade80' },
                      ].map((a, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                            <a.icon size={18} style={{ color: a.color }} />
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: .5 }}>{a.label}</p>
                          </div>
                          <p style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', margin: 0, lineHeight: 1.6 }}>{a.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer attribution */}
                <div style={{ textAlign: 'center', padding: '10px 0 4px', fontSize: 11, color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Brain size={14} className="text-slate-700" />
                  <span>AI-powered analysis · Based on real-time weather data · Always consult a local agronomist for critical decisions</span>
                </div>

              </div>
            )}
          </>
        )}

        {/* No data fallback */}
        {!weather && !loading && !error && (
          <div className="glass fade-up" style={{ padding: '64px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <MapPin size={64} className="text-slate-700" />
            </div>
            <p style={{ color: '#64748b', fontSize: 15 }}>No weather data. Please ensure your profile has a valid farm location set.</p>
          </div>
        )}

      </div>
      <AIKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
      />
    </div>
  );
};

export default Weather;
