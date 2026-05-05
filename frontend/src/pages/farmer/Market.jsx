import { useState, useEffect, useRef } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    MoveRight,
    MapPin as MapPinIcon,
    Activity,
    CloudSun,
    Lightbulb,
    User,
    BarChart3,
    Sprout,
    Search,
    X,
    ChevronRight,
    Info,
    RotateCcw,
    AlertTriangle,
    Brain,
    Timer
} from 'lucide-react';
import { cropAPI, geminiAPI, userAPI, marketAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import AIKeyModal from '../../components/AIKeyModal';
import { useAuth } from '../../context/AuthContext';

// ── Crop emoji map ─────────────────────────────────────────────────────────
const CROP_EMOJI = {
    wheat: '🌾', rice: '🍚', paddy: '🍚', sugarcane: '🎋', cotton: '🌿',
    maize: '🌽', corn: '🌽', soybean: '🫘', soy: '🫘', tomato: '🍅',
    onion: '🧅', potato: '🥔', banana: '🍌', chilli: '🌶️', turmeric: '🟡',
    ginger: '🫚', garlic: '🧄', cauliflower: '🥦', groundnut: '🥜', mustard: '🌻',
    lentil: '🫘', chickpea: '🫘', gram: '🫘', mango: '🥭', grapes: '🍇',
    pomegranate: '🍎', radish: '🌱', coconut: '🥥', arhar: '🫘', tur: '🫘',
    moong: '🫘', urad: '🫘', barley: '🌾', jowar: '🌾', bajra: '🌾',
};
const getCropEmoji = (name) => {
    const lower = (name || '').toLowerCase();
    return Object.entries(CROP_EMOJI).find(([k]) => lower.includes(k))?.[1] || '🌾';
};

const CROP_GRAD = [
    ['#6366f1', '#8b5cf6'], ['#10b981', '#06b6d4'], ['#f59e0b', '#ef4444'],
    ['#ec4899', '#f43f5e'], ['#0ea5e9', '#2563eb'], ['#a855f7', '#7c3aed'],
];

const QUICK_COMMODITIES = [
    'Soybean', 'Wheat', 'Onion', 'Cotton', 'Tomato', 'Potato',
    'Rice', 'Mustard', 'Gram', 'Maize', 'Turmeric', 'Groundnut',
    'Arhar (Tur)', 'Sugarcane', 'Chilli', 'Garlic', 'Ginger', 'Banana',
];

const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const fmtShort = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

// ── Trend helpers ──────────────────────────────────────────────────────────
const TREND = {
    rising: { icon: TrendingUp, label: 'Rising', bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', dot: '#ef4444' },
    falling: { icon: TrendingDown, label: 'Falling', bg: '#f0fdf4', text: '#16a34a', border: '#86efac', dot: '#22c55e' },
    stable: { icon: MoveRight, label: 'Stable', bg: '#f8fafc', text: '#475569', border: '#cbd5e1', dot: '#94a3b8' },
};
const TrendBadge = ({ trend, pct, dark }) => {
    const cfg = TREND[trend] || TREND.stable;
    if (dark) return (
        <span style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <cfg.icon size={12} /> {cfg.label}{pct ? ` ${Math.abs(pct)}%` : ''}
        </span>
    );
    return (
        <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <cfg.icon size={12} /> {cfg.label}{pct ? ` ${Math.abs(pct)}%` : ''}
        </span>
    );
};

// ── Custom rich area tooltip ───────────────────────────────────────────────
const AreaTooltip = ({ active, payload, label }) => {
    const { isDark } = useTheme();
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 16, padding: '10px 16px', boxShadow: 'var(--shadow-lg)' }}>
            <p style={{ color: isDark ? '#a5b4fc' : '#4f46e5', fontSize: 11, marginBottom: 2 }}>{label}</p>
            <p style={{ color: isDark ? '#fff' : '#1e293b', fontWeight: 800, fontSize: 15 }}>
                ₹{payload[0]?.value?.toLocaleString('en-IN')}<span style={{ fontSize: 10, color: isDark ? '#c4b5fd' : '#64748b', fontWeight: 500 }}>/qtl</span>
            </p>
        </div>
    );
};

// ── Bar tooltip ────────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
    const { isDark } = useTheme();
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: isDark ? '#0f172a' : 'white', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', borderRadius: 12, padding: '8px 14px', boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.1)' }}>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10, marginBottom: 2 }}>{label}</p>
            <p style={{ color: isDark ? '#fff' : '#1e293b', fontWeight: 700 }}>₹{payload[0]?.value?.toLocaleString('en-IN')}</p>
        </div>
    );
};

// ── Skeleton ───────────────────────────────────────────────────────────────
const Sk = ({ h = 48 }) => (
    <div style={{ height: h, borderRadius: 16, background: 'linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
);

// ── Animated price number ──────────────────────────────────────────────────
const AnimPrice = ({ value }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (!value) return;
        const target = Number(value);
        const dur = 900;
        let start = null;
        const raf = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(ease * target));
            if (p < 1) requestAnimationFrame(raf);
            else setDisplay(target);
        };
        requestAnimationFrame(raf);
    }, [value]);
    return <span>₹{display.toLocaleString('en-IN')}</span>;
};

// ── Market Ticker ──────────────────────────────────────────────────────────
const MarketTicker = ({ items }) => {
    if (!items?.length) return null;
    return (
        <div style={{ background: '#0f172a', color: '#fff', padding: '10px 0', overflow: 'hidden', whiteSpace: 'nowrap', borderBottom: '1px solid #1e293b' }}>
            <div className="ticker-scroll" style={{ display: 'inline-block', animation: 'ticker 60s linear infinite' }}>
                {items.concat(items).map((item, i) => (
                    <span key={i} style={{ margin: '0 30px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#a5b4fc' }}>{item.commodity}</span>
                        <span style={{ color: '#fff' }}>₹{item.pricePerQuintal}</span>
                        <span style={{ color: '#34d399', fontSize: 11 }}>▲ 2.1%</span>
                        <span style={{ color: '#475569', fontWeight: 500 }}>({item.district})</span>
                    </span>
                ))}
            </div>
            <style>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// PRICE INTEL PANEL  — dark glassmorphism
// ══════════════════════════════════════════════════════════════════════════════
const PriceIntelPanel = ({ commodity, district, state, onClose }) => {
    const { isDark } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('nearby'); // nearby | major | chart
    const [showKeyModal, setShowKeyModal] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        // Check for User's API Key
        const userStored = JSON.parse(localStorage.getItem('user'));
        if (!userStored?.groqApiKey) {
            setShowKeyModal(true);
            setLoading(false);
            return;
        }

        setLoading(true); setError(null); setData(null);
        geminiAPI.getMarketPrices(commodity, district, state)
            .then(res => { if (!cancelled) setData(res.data?.data || res.data); })
            .catch(err => { if (!cancelled) setError(err?.response?.data?.message || err.message || 'Failed to load'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [commodity, district, state]);

    useEffect(() => {
        setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }, []);

    // Compute max modal price for bar scaling
    const maxModal = data ? Math.max(...(data.localMarkets || []).map(m => m.modalPrice || 0), 1) : 1;
    const maxMajor = data ? Math.max(...(data.majorMarkets || []).map(m => m.modalPrice || 0), 1) : 1;

    const tabs = [
        { id: 'nearby', label: 'Nearby Mandis', icon: MapPinIcon },
        { id: 'major', label: 'Major Markets', icon: Activity },
        ...(data?.priceHistory?.length > 1 ? [{ id: 'chart', label: '30-Day Trend', icon: TrendingUp }] : []),
    ];

    return (
        <div ref={panelRef}
            style={{
                background: isDark
                    ? 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)'
                    : 'white',
                borderRadius: 28,
                border: isDark ? '1.5px solid rgba(99,102,241,0.35)' : '1.5px solid #e2e8f0',
                boxShadow: isDark ? '0 25px 60px rgba(99,102,241,0.25)' : '0 20px 50px rgba(0,0,0,0.08)',
                overflow: 'hidden'
            }}
            className="fade-up">

            {/* ── Panel Header ─────────────────────────────────────────── */}
            <div style={{ background: isDark ? 'linear-gradient(135deg,#4338ca,#7c3aed)' : 'linear-gradient(135deg,#10b981,#059669)', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative orbs */}
                <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -80, right: -40, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -50, left: 20, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            {getCropEmoji(commodity)}
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>{commodity}</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#c4b5fd', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <MapPinIcon size={10} /> {district}, {state}
                                </span>
                                <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#c4b5fd', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                                    ₹/quintal
                                </span>
                                {data?.isEstimated === false ? (
                                    <span style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid #34d399', color: '#6ee7b7', borderRadius: 999, padding: '2px 10px', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} /> Live Data
                                    </span>
                                ) : (
                                    <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', borderRadius: 999, padding: '2px 10px', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Activity size={10} /> Forecast
                                    </span>
                                )}
                                {data && <TrendBadge trend={data.trend} pct={data.trendPercent} dark />}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose}
                        style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}><X size={20} /></button>
                </div>

                {/* Summary bar below header */}
                {data && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Local Modal', value: data.localMarkets?.[0]?.modalPrice, darkColor: '#a5b4fc', lightColor: '#fbbf24' },
                            { label: 'Local Min', value: data.localMarkets?.[0]?.minPrice, darkColor: '#86efac', lightColor: '#34d399' },
                            { label: 'Local Max', value: data.localMarkets?.[0]?.maxPrice, darkColor: '#fca5a5', lightColor: '#ef4444' },
                        ].map(s => s.value ? (
                            <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '8px 16px', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', minWidth: 110, flex: '1 1 auto', maxWidth: 160 }}>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                                <p style={{ color: isDark ? s.darkColor : 'white', fontSize: 18, fontWeight: 800, margin: 0 }}><AnimPrice value={s.value} /></p>
                            </div>
                        ) : null)}
                    </div>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', padding: '24px 0' }}>
                        <RotateCcw className="spin-slow" style={{ color: '#6366f1' }} size={24} />
                        <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Fetching live market data via AI…</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[56, 40, 56].map((h, i) => <Sk key={i} h={h} />)}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                        <AlertTriangle size={48} className="text-red-400" />
                    </div>
                    <p style={{ color: '#f87171', fontWeight: 700 }}>{error}</p>
                    <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Check your API key or try again.</p>
                </div>
            )}

            {/* Data view */}
            {data && !loading && (
                <div style={{ padding: '0 0 24px' }}>
                    {/* Summary */}
                    {data.summary && (
                        <div style={{ margin: '20px 24px 0', background: isDark ? 'rgba(99,102,241,0.1)' : '#f8fafc', border: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid #e2e8f0', borderRadius: 16, padding: '12px 16px' }}>
                            <p style={{ color: isDark ? '#a5b4fc' : '#4f46e5', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Market Summary</p>
                            <p style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{data.summary}</p>
                        </div>
                    )}

                    {/* Insights row */}
                    {(data.seasonalInsight || data.bestTimeToSell) && (
                        <div style={{ display: 'flex', gap: 12, margin: '12px 24px 0', flexWrap: 'wrap' }}>
                            {data.seasonalInsight && (
                                <div style={{ flex: 1, minWidth: 200, background: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb', border: isDark ? '1px solid rgba(245,158,11,0.25)' : '1px solid #fde68a', borderRadius: 14, padding: '12px 14px' }}>
                                    <p style={{ color: isDark ? '#fbbf24' : '#b45309', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <CloudSun size={12} /> Seasonal Insight
                                    </p>
                                    <p style={{ color: isDark ? '#fde68a' : '#92400e', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{data.seasonalInsight}</p>
                                </div>
                            )}
                            {data.bestTimeToSell && (
                                <div style={{ flex: 1, minWidth: 200, background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4', border: isDark ? '1px solid rgba(16,185,129,0.25)' : '1px solid #bbf7d0', borderRadius: 14, padding: '12px 14px' }}>
                                    <p style={{ color: isDark ? '#34d399' : '#166534', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Lightbulb size={12} /> Best Time to Sell
                                    </p>
                                    <p style={{ color: isDark ? '#a7f3d0' : '#15803d', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{data.bestTimeToSell}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tabs ───────────────────────────────────────────── */}
                    <div style={{ display: 'flex', gap: 8, margin: '20px 24px 0', borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', paddingBottom: 0 }}>
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '9px 18px', borderRadius: '12px 12px 0 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                                    background: activeTab === tab.id ? (isDark ? 'rgba(99,102,241,0.2)' : '#f5f3ff') : 'transparent',
                                    color: activeTab === tab.id ? (isDark ? '#a5b4fc' : '#4338ca') : '#64748b',
                                    borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* TAB: Nearby Mandis */}
                    {activeTab === 'nearby' && (
                        <div style={{ padding: '20px 24px 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {(data.localMarkets || []).map((m, i) => {
                                    const barW = Math.round(((m.modalPrice || 0) / maxModal) * 100);
                                    const isNearest = i === 0;
                                    return (
                                        <div key={i}
                                            style={{
                                                background: isNearest
                                                    ? (isDark ? 'rgba(99,102,241,0.12)' : '#f5f3ff')
                                                    : (isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
                                                border: `1px solid ${isNearest
                                                    ? (isDark ? 'rgba(99,102,241,0.35)' : '#c7d2fe')
                                                    : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0')}`,
                                                borderRadius: 18,
                                                padding: '14px 18px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff'}
                                            onMouseOut={e => e.currentTarget.style.background = isNearest
                                                ? (isDark ? 'rgba(99,102,241,0.12)' : '#f5f3ff')
                                                : (isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc')}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                        {isNearest && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 6px #34d399' }} />}
                                                        <span style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 700, fontSize: 14 }}>{m.marketName}</span>
                                                        {isNearest && <span style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>Nearest</span>}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <span style={{ color: '#64748b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><MapPinIcon size={10} /> {m.district}</span>
                                                        <span style={{ color: '#64748b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingDown size={10} /> {m.distance}</span>
                                                        <span style={{ color: '#64748b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={10} /> {m.arrivalQty}</span>
                                                    </div>
                                                    {/* Price bar */}
                                                    <div style={{ marginTop: 10 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                                            <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }}>
                                                                Min {fmt(m.minPrice)} &nbsp;·&nbsp; Modal <span style={{ color: isDark ? '#a5b4fc' : '#4338ca', fontWeight: 800 }}>{fmt(m.modalPrice)}</span> &nbsp;·&nbsp; Max {fmt(m.maxPrice)}
                                                            </span>
                                                        </div>
                                                        <div style={{ height: 6, background: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${barW}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius: 999, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <p style={{ color: isDark ? '#fff' : '#1e1b4b', fontSize: 22, fontWeight: 800, lineHeight: 1, margin: 0 }}><AnimPrice value={m.modalPrice} /></p>
                                                    <p style={{ color: '#64748b', fontSize: 9, margin: '2px 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Modal/quintal</p>
                                                    {m.quality && (
                                                        <span style={{ background: m.quality === 'A' ? 'rgba(52,211,153,0.15)' : m.quality === 'B' ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.15)', color: m.quality === 'A' ? '#34d399' : m.quality === 'B' ? '#fbbf24' : '#94a3b8', border: `1px solid ${m.quality === 'A' ? 'rgba(52,211,153,0.3)' : m.quality === 'B' ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.2)'}`, borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                                            {m.quality === 'A' ? '★ Premium' : m.quality === 'B' ? '◎ Standard' : '◯ Basic'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Bar chart comparison */}
                            {data.localMarkets?.length > 1 && (
                                <div style={{ marginTop: 20, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', borderRadius: 18, padding: '16px' }}>
                                    <p style={{ color: isDark ? '#a5b4fc' : '#4f46e5', fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BarChart3 size={14} /> Mandi Price Comparison (Modal ₹/quintal)
                                    </p>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <BarChart data={data.localMarkets.map(m => ({ name: m.marketName?.split(' ')[0] || m.marketName, price: m.modalPrice }))} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`} width={42} />
                                            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.1)' }} />
                                            <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                                {data.localMarkets.map((_, i) => (
                                                    <Cell key={i} fill={i === 0 ? '#6366f1' : i === 1 ? '#8b5cf6' : i === 2 ? '#a855f7' : '#7c3aed'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: Major Markets */}
                    {activeTab === 'major' && (
                        <div style={{ padding: '20px 24px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                                {(data.majorMarkets || []).map((m, i) => {
                                    const barW = Math.round(((m.modalPrice || 0) / maxMajor) * 100);
                                    const [c1, c2] = CROP_GRAD[i % CROP_GRAD.length];
                                    const trendCfg = TREND[m.trend] || TREND.stable;
                                    return (
                                        <div key={i}
                                            style={{
                                                background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                                                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                                                borderRadius: 20,
                                                padding: '16px',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                transition: 'all 0.25s'
                                            }}
                                            onMouseOver={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'white'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = isDark ? 'none' : '0 10px 30px rgba(0,0,0,0.05)'; }}
                                            onMouseOut={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                                            {/* Gradient accent */}
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})`, borderRadius: '20px 20px 0 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div>
                                                    <p style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 700, fontSize: 13, margin: 0 }}>{m.marketName}</p>
                                                    <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0' }}>{m.city}, {m.state}</p>
                                                </div>
                                                <span style={{ background: `${trendCfg.dot}22`, border: `1px solid ${trendCfg.dot}44`, color: trendCfg.dot, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <trendCfg.icon size={10} /> {trendCfg.label}
                                                </span>
                                            </div>
                                            <p style={{ color: isDark ? '#fff' : '#1e1b4b', fontSize: 26, fontWeight: 800, margin: '8px 0 4px' }}>
                                                <AnimPrice value={m.modalPrice} />
                                            </p>
                                            {/* Bar */}
                                            <div style={{ height: 5, background: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                                                <div style={{ height: '100%', width: `${barW}%`, background: `linear-gradient(90deg,${c1},${c2})`, borderRadius: 999, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
                                            </div>
                                            {m.note && <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.4, margin: 0 }}>{m.note}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* National bar chart comparison */}
                            {(data.majorMarkets || []).length > 2 && (
                                <div style={{ marginTop: 20, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', borderRadius: 18, padding: '16px' }}>
                                    <p style={{ color: isDark ? '#a5b4fc' : '#4f46e5', fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Activity size={14} /> National Price Snapshot
                                    </p>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={data.majorMarkets.map(m => ({ name: m.city || m.marketName?.split(' ')[0], price: m.modalPrice }))} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`} width={42} />
                                            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.1)' }} />
                                            <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={36}>
                                                {data.majorMarkets.map((_, i) => {
                                                    const [c1] = CROP_GRAD[i % CROP_GRAD.length];
                                                    return <Cell key={i} fill={c1} />;
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: 30-Day chart */}
                    {activeTab === 'chart' && data?.priceHistory?.length > 1 && (() => {
                        const avg = Math.round(data.priceHistory.reduce((s, r) => s + r.price, 0) / data.priceHistory.length);
                        const minP = Math.min(...data.priceHistory.map(r => r.price));
                        const maxP = Math.max(...data.priceHistory.map(r => r.price));
                        const latest = data.priceHistory[data.priceHistory.length - 1]?.price || 0;
                        const first = data.priceHistory[0]?.price || 0;
                        const changePct = first ? (((latest - first) / first) * 100).toFixed(1) : 0;
                        const up = latest >= first;
                        return (
                            <div style={{ padding: '20px 24px 0' }}>
                                {/* Quick stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                                    {[
                                        { label: 'Current', val: `₹${latest.toLocaleString('en-IN')}`, color: isDark ? '#a5b4fc' : '#4338ca' },
                                        { label: '30D Avg', val: `₹${avg.toLocaleString('en-IN')}`, color: isDark ? '#fbbf24' : '#b45309' },
                                        { label: '30D Low', val: `₹${minP.toLocaleString('en-IN')}`, color: isDark ? '#34d399' : '#166534' },
                                        { label: '30D High', val: `₹${maxP.toLocaleString('en-IN')}`, color: isDark ? '#f87171' : '#dc2626' },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
                                            <p style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{s.label}</p>
                                            <p style={{ color: s.color, fontSize: 14, fontWeight: 800, margin: 0 }}>{s.val}</p>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <span style={{ color: up ? '#34d399' : '#f87171', fontSize: 13, fontWeight: 700 }}>
                                        {up ? '▲' : '▼'} {Math.abs(changePct)}% over 30 days
                                    </span>
                                    <span style={{ color: '#475569', fontSize: 11 }}>vs start of period</span>
                                </div>
                                {/* Area Chart */}
                                <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', borderRadius: 18, padding: '16px 8px 8px' }}>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <AreaChart data={data.priceHistory} margin={{ top: 8, right: 20, left: 0, bottom: 4 }}>
                                            <defs>
                                                <linearGradient id="gPrice" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} vertical={false} />
                                            <XAxis dataKey="date" tickFormatter={fmtShort}
                                                tick={{ fontSize: 10, fill: '#475569' }} tickLine={false}
                                                axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} interval={4} />
                                            <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false}
                                                tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`} width={50} />
                                            <Tooltip content={<AreaTooltip />} />
                                            <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="5 4"
                                                label={{ value: `Avg ₹${avg.toLocaleString('en-IN')}`, position: 'insideTopRight', fontSize: 10, fill: isDark ? '#fbbf24' : '#b45309', fontWeight: 700 }} />
                                            <Area type="monotone" dataKey="price" stroke="#6366f1"
                                                strokeWidth={2.5} fill="url(#gPrice)"
                                                dot={false} activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <p style={{ color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 10 }}>
                                    Yellow dashed line = 30-day average price
                                </p>
                            </div>
                        );
                    })()}

                    {/* Footer disclaimer */}
                    <p style={{ color: isDark ? '#334155' : '#64748b', fontSize: 11, textAlign: 'center', marginTop: 20, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Brain size={12} /> AI-generated price intelligence · Estimates only · Always verify at your local mandi
                    </p>
                </div>
            )}
            <AIKeyModal isOpen={showKeyModal} onClose={() => { setShowKeyModal(false); onClose(); }} />
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MARKET PAGE
// ══════════════════════════════════════════════════════════════════════════════
const Market = () => {
    const [myCrops, setMyCrops] = useState([]);
    const [loadingCrops, setLoadingCrops] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [activePanel, setActivePanel] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [tickerItems, setTickerItems] = useState([]);
    const { isDark } = useTheme();
    const { t } = useLanguage();

    useEffect(() => {
        Promise.all([loadCrops(), loadProfile(), loadTicker()]);
    }, []);

    const loadTicker = async () => {
        try {
            const res = await marketAPI.searchPrices({ limit: 15 });
            setTickerItems(res.data?.results || []);
        } catch { /* silent */ }
    };

    const loadCrops = async () => {
        try { setLoadingCrops(true); const r = await cropAPI.getCrops(); setMyCrops(r.data || []); }
        catch { setMyCrops([]); } finally { setLoadingCrops(false); }
    };
    const loadProfile = async () => {
        try { const r = await userAPI.getProfile(); setUserProfile(r.data?.user || r.data); }
        catch { /* silent */ }
    };

    const district = userProfile?.address?.district || 'Nashik';
    const state = 'Maharashtra';

    const openPanel = (commodity, source) => {
        setActivePanel(p => (p?.commodity === commodity && p?.source === source) ? null : { commodity, source });
    };
    const handleSearchSubmit = (e) => { e.preventDefault(); if (searchInput.trim()) openPanel(searchInput.trim(), 'search'); };
    const handleQuick = (c) => { setSearchInput(c); openPanel(c, 'search'); };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-page)'
        }}>
            <MarketTicker items={tickerItems} />
            <style>{`
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes spin { to{transform:rotate(360deg)} }
                @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.6} }
                .fade-up { animation: fadeUp 0.45s ease both; }
                .crop-btn:hover { transform:translateY(-4px) scale(1.04) !important; }
            `}</style>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="fade-up" style={{
                    background: 'var(--bg-header)',
                    borderRadius: 28, padding: '24px 28px',
                    border: '1px solid var(--border-accent)',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.1)', top: -120, right: -60, pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                            <div style={{ width: 60, height: 60, borderRadius: 20, background: isDark ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                                <BarChart3 size={32} className={isDark ? 'text-white' : 'text-emerald-600'} />
                            </div>
                            <div>
                                <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0 }}>{t('Market Prices')}</h1>
                                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '4px 0 0' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                                        Live AI Intelligence · <MapPinIcon size={12} /> {district} · <span className="font-bold opacity-90">{new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </span>
                                </p>
                            </div>
                        </div>
                        {userProfile && (
                            <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <User size={16} className="text-violet-400" />
                                <span style={{ color: '#c4b5fd', fontSize: 13, fontWeight: 600 }}>
                                    {userProfile.fullName?.split(' ')[0]} · <strong style={{ color: '#a5b4fc' }}>{district}</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── My Crops ─────────────────────────────────────────────── */}
                <section className="fade-up">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontSize: 17, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sprout size={18} className="text-emerald-400" /> {t('My Crops')} — {t('Tap to See Prices')}
                        </h2>
                        {!loadingCrops && myCrops.length > 0 && (
                            <span style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                                {myCrops.length} crops
                            </span>
                        )}
                    </div>

                    {loadingCrops ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
                            {[1, 2, 3, 4].map(i => <Sk key={i} h={90} />)}
                        </div>
                    ) : myCrops.length === 0 ? (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 24, textAlign: 'center', padding: '48px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                <Sprout size={48} className={isDark ? "text-emerald-500/20" : "text-emerald-500/40"} />
                            </div>
                            <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700, margin: 0 }}>{t('No crops added yet')}</p>
                            <p style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 13, marginTop: 6 }}>{t('Add crops in')} <strong style={{ color: isDark ? '#a5b4fc' : '#4f46e5' }}>{t('Crop Management')}</strong> {t('to see live market prices here.')}</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
                                {myCrops.map((crop, i) => {
                                    const isActive = activePanel?.commodity?.toLowerCase() === crop.cropName?.toLowerCase() && activePanel?.source === 'mycrop';
                                    const [c1, c2] = CROP_GRAD[i % CROP_GRAD.length];
                                    return (
                                        <button key={crop._id} className="crop-btn"
                                            onClick={() => openPanel(crop.cropName, 'mycrop')}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', borderRadius: 20, border: `2px solid ${isActive ? c1 : isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, background: isActive ? `linear-gradient(135deg,${c1}22,${c2}11)` : isDark ? 'rgba(255,255,255,0.04)' : 'white', cursor: 'pointer', transition: 'all 0.25s', textAlign: 'center', boxShadow: isDark ? 'none' : '0 4px 6px rgba(0,0,0,0.02)' }}>
                                            <div style={{ width: 50, height: 50, borderRadius: 16, background: `linear-gradient(135deg,${c1},${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: isActive ? `0 0 16px ${c1}66` : 'none', transition: 'box-shadow 0.3s' }}>
                                                {getCropEmoji(crop.cropName)}
                                            </div>
                                            <span style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{crop.cropName}</span>
                                            {crop.area?.value && <span style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 9 }}>{crop.area.value} {crop.area.unit}</span>}
                                            <span style={{ color: isActive ? c1 : isDark ? '#475569' : '#94a3b8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                                {isActive ? <><TrendingUp size={10} /> {t('Showing')}</> : <><TrendingDown size={10} /> {t('Price')}</>}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {activePanel?.source === 'mycrop' && (
                                <div style={{ marginTop: 16 }}>
                                    <PriceIntelPanel commodity={activePanel.commodity} district={district} state={state} onClose={() => setActivePanel(null)} />
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* ── Divider ───────────────────────────────────────────────── */}
                <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent)' }} />
                    <span style={{ color: '#334155', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>{t('Search Any Commodity')}</span>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent)' }} />
                </div>

                {/* ── Commodity Search ──────────────────────────────────────── */}
                <section className="fade-up">
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 24, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <h2 style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontSize: 17, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Search size={20} className="text-violet-400" /> {t('Find Prices for Any Commodity')}
                        </h2>
                        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                                placeholder="Type commodity name (e.g. Soybean, Onion, Wheat)…"
                                style={{ flex: 1, padding: '12px 18px', borderRadius: 16, border: isDark ? '1.5px solid rgba(99,102,241,0.25)' : '1.5px solid #e2e8f0', background: isDark ? 'rgba(99,102,241,0.08)' : '#f8fafc', color: isDark ? '#f1f5f9' : '#1e293b', fontSize: 14, outline: 'none', transition: 'all 0.2s' }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = isDark ? 'rgba(99,102,241,0.25)' : '#e2e8f0'} />
                            <button type="submit" disabled={!searchInput.trim()}
                                style={{ padding: '12px 24px', borderRadius: 16, fontWeight: 700, fontSize: 14, color: '#fff', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', cursor: searchInput.trim() ? 'pointer' : 'not-allowed', opacity: searchInput.trim() ? 1 : 0.5, boxShadow: '0 4px 16px rgba(99,102,241,0.35)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                                {t('Get Prices')}
                            </button>
                        </form>

                        {/* Quick chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {QUICK_COMMODITIES.map(c => {
                                const isActive = activePanel?.commodity === c && activePanel?.source === 'search';
                                return (
                                    <button key={c} onClick={() => handleQuick(c)}
                                        style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: isActive ? '1px solid #6366f1' : isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', background: isActive ? 'rgba(99,102,241,0.25)' : isDark ? 'rgba(255,255,255,0.04)' : 'white', color: isActive ? (isDark ? '#a5b4fc' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b'), boxShadow: isActive ? 'none' : (isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.02)') }}
                                        onMouseOver={e => { if (!isActive) { e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.12)' : '#f1f5f9'; e.currentTarget.style.color = isDark ? '#a5b4fc' : '#4f46e5'; } }}
                                        onMouseOut={e => { if (!isActive) { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'white'; e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b'; } }}>
                                        {getCropEmoji(c)} {c}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {activePanel?.source === 'search' && (
                        <div style={{ marginTop: 16 }}>
                            <PriceIntelPanel commodity={activePanel.commodity} district={district} state={state} onClose={() => setActivePanel(null)} />
                        </div>
                    )}
                </section>

                {/* ── Footer ────────────────────────────────────────────────── */}
                <p className="fade-up" style={{ color: isDark ? '#1e293b' : '#64748b', fontSize: 12, textAlign: 'center', paddingBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <BarChart3 size={12} /> AI-powered market intelligence · Estimates only · Cross-check with your local mandi before selling
                </p>
            </div>
        </div>
    );
};

export default Market;
