import { useState, useEffect } from 'react';
import { agronomistAPI, cropAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const CROP_EMOJI = {
  wheat: '🌾', rice: '🍚', sugarcane: '🎋', cotton: '🌿', maize: '🌽',
  soybean: '🫘', tomato: '🍅', onion: '🧅', potato: '🥔', banana: '🍌',
  chilli: '🌶️', turmeric: '🟡', groundnut: '🥜', mustard: '🌻',
};
const getCropEmoji = (name = '') => {
  const lower = name.toLowerCase();
  return Object.entries(CROP_EMOJI).find(([k]) => lower.includes(k))?.[1] || '🌾';
};

const AgronomistDashboard = () => {
  const { isDark } = useTheme();
  const [localFarmers, setLocalFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(true);
  const [farmerError, setFarmerError] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [viewingCrops, setViewingCrops] = useState(null);
  const [viewingFarmerName, setViewingFarmerName] = useState('');
  const [crops, setCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(false);

  useEffect(() => { fetchLocalFarmers(); }, []);

  const fetchLocalFarmers = async () => {
    try {
      setLoadingFarmers(true);
      const response = await agronomistAPI.findLocalFarmers();
      setLocalFarmers(response.data);
    } catch (err) {
      setFarmerError(err.response?.data?.message || 'Failed to fetch farmers');
    } finally {
      setLoadingFarmers(false);
    }
  };

  const handleViewCrops = async (farmer) => {
    try {
      setLoadingCrops(true);
      setViewingCrops(farmer.id);
      setViewingFarmerName(farmer.fullName);
      const response = await cropAPI.getCropsByFarmer(farmer.id);
      setCrops(response.data);
    } catch (err) {
      setFarmerError(err.response?.data?.message || 'Failed to fetch crops');
      setViewingCrops(null);
    } finally {
      setLoadingCrops(false);
    }
  };

  const closeCropsModal = () => { setViewingCrops(null); setCrops([]); };

  return (
    <div className={`min-h-screen ${isDark
      ? 'bg-gradient-to-br from-[#0a0f1e] via-[#071519] to-[#0a0f1e]'
      : 'bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50'
      }`}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .card-lift { transition: all 0.25s cubic-bezier(.4,0,.2,1); }
        .card-lift:hover { transform: translateY(-4px); }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Welcome Banner ──────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-cyan-700 to-teal-700 rounded-3xl shadow-2xl p-8 fade-up">
          <div className="absolute top-0 right-0 text-[160px] leading-none opacity-10 select-none -mt-4 -mr-4">🔬</div>
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl shadow-inner flex-shrink-0">
              🔬
            </div>
            <div>
              <p className="text-teal-200 text-xs font-semibold uppercase tracking-wide mb-1">Agricultural Expert</p>
              <h1 className="text-3xl font-extrabold text-white mb-1">Agronomist Dashboard</h1>
              <p className="text-teal-100 text-sm">
                Help farmers in your district by viewing their crops and providing professional agricultural guidance.
              </p>
            </div>
            <div className="sm:ml-auto flex items-center gap-2 bg-white/20 border border-white/20 text-white px-4 py-2 rounded-2xl text-sm font-bold flex-shrink-0">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Active
            </div>
          </div>
        </div>

        {/* ── Feature Tip ─────────────────────────────────────────────── */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-5 flex items-start gap-4 fade-up">
          <div className="text-3xl flex-shrink-0">💡</div>
          <div>
            <p className="font-extrabold text-cyan-800 text-sm uppercase tracking-wide mb-1">Agronomist Tip</p>
            <p className="text-cyan-900 text-sm leading-relaxed">
              Click <strong>"View Crops"</strong> on any farmer card below to see what crops they are growing — so you can provide more relevant and targeted agricultural advice.
            </p>
          </div>
        </div>

        {/* ── Farmers Section ──────────────────────────────────────────── */}
        <div className={`rounded-3xl shadow-xl overflow-hidden fade-up ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white'
          }`}>
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">👨‍🌾</div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Farmers in Your District</h2>
              <p className="text-teal-100 text-xs mt-0.5">Connect with farmers and view their crops to offer guidance</p>
            </div>
            <div className="ml-auto bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-xl">
              {loadingFarmers ? '…' : localFarmers.length} farmers
            </div>
          </div>

          <div className="p-6">
            {farmerError && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                ⚠️ {farmerError}
              </div>
            )}

            {loadingFarmers ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-44 rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
                ))}
              </div>
            ) : localFarmers.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">👨‍🌾</div>
                <p className="text-gray-600 font-semibold text-lg">No farmers in your district yet.</p>
                <p className="text-gray-400 text-sm mt-1">Check back later as more farmers register.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {localFarmers.map((farmer) => (
                  <div key={farmer.id}
                    className={`card-lift border rounded-2xl p-5 hover:shadow-lg ${isDark ? 'bg-gradient-to-br from-teal-900/40 to-slate-800/60 border-teal-700/30' : 'bg-gradient-to-br from-teal-50 to-white border-teal-100'
                      }`}>
                    <div className="flex items-center gap-4 mb-4">
                      {farmer.profilePhotoUrl ? (
                        <img src={farmer.profilePhotoUrl} alt={farmer.fullName}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-teal-300 shadow cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setViewingPhoto(farmer.profilePhotoUrl)} />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-extrabold text-xl shadow">
                          {farmer.fullName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-extrabold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{farmer.fullName}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">📞 {farmer.mobileNumber}</p>
                        {farmer.district && (
                          <p className="text-xs text-teal-600 mt-0.5 flex items-center gap-1">📍 {farmer.district}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleViewCrops(farmer)}
                      className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow hover:shadow-lg transition-all flex items-center justify-center gap-2">
                      🌾 View Crops
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Photo Modal ──────────────────────────────────────────────────── */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingPhoto(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="font-extrabold text-gray-900">Profile Photo</h3>
              <button onClick={() => setViewingPhoto(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl">×</button>
            </div>
            <div className="p-4">
              <img src={viewingPhoto} alt="Farmer" className="w-full rounded-2xl object-cover shadow" />
            </div>
          </div>
        </div>
      )}

      {/* ── Crops Modal ──────────────────────────────────────────────────── */}
      {viewingCrops && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeCropsModal}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h3 className="text-xl font-extrabold flex items-center gap-2">🌾 Crops</h3>
                <p className="text-teal-200 text-xs mt-0.5">{viewingFarmerName}'s farm</p>
              </div>
              <button onClick={closeCropsModal} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-teal-800 text-2xl text-white transition-colors">×</button>
            </div>
            <div className="p-6">
              {loadingCrops ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-4 text-gray-500">Loading crops…</span>
                </div>
              ) : crops.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-3">🌿</div>
                  <p className="text-gray-500 font-semibold">No crops found for this farmer.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {crops.map((crop) => (
                    <div key={crop._id} className="bg-gradient-to-br from-teal-50 to-white border border-teal-200 rounded-2xl p-5 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center text-2xl shadow">
                          {getCropEmoji(crop.cropName)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-900">{crop.cropName}</h4>
                          <span className="text-xs bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">Active</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        {crop.cropVariety && <p className="text-gray-500">Variety: <strong className="text-gray-800">{crop.cropVariety}</strong></p>}
                        <p className="text-gray-500">Planted: <strong className="text-gray-800">{new Date(crop.plantingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>
                        <p className="text-gray-500">Area: <strong className="text-gray-800">{crop.area?.value} {crop.area?.unit}</strong></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgronomistDashboard;
