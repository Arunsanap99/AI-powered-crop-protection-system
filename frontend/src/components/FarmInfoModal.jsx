import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, Ruler, Droplets, Leaf, ChevronRight, CheckCircle2, AlertCircle, TrendingUp, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { geminiAPI, mediaAPI } from '../services/api';

const FarmInfoModal = () => {
    const { user, updateUser } = useAuth();
    const { t, lang } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        totalArea: { value: '', unit: 'acres' },
        soilType: '',
        irrigationType: '',
        primaryCrops: [],
        experienceYears: '',
        farmingStage: 'starting',
        targetYield: '',
        yieldImages: []
    });

    const [aiAdvice, setAiAdvice] = useState(null);
    const [fetchingAdvice, setFetchingAdvice] = useState(false);
    const [seedImages, setSeedImages] = useState({});

    useEffect(() => {
        if (user && user.role === 'farmer') {
            const hasInfo = user.farmInfo && user.farmInfo.totalArea && user.farmInfo.totalArea.value;
            if (!hasInfo) {
                // Short delay to avoid popping up too fast
                const timer = setTimeout(() => setIsOpen(true), 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [user]);

    const handleCropToggle = (crop) => {
        setFormData(prev => ({
            ...prev,
            primaryCrops: prev.primaryCrops.includes(crop)
                ? prev.primaryCrops.filter(c => c !== crop)
                : [...prev.primaryCrops, crop]
        }));
    };

    const fetchSeedAdvice = async () => {
        if (formData.primaryCrops.length === 0) {
            alert(t('Please select at least one crop'));
            return;
        }
        setFetchingAdvice(true);
        try {
            const response = await geminiAPI.getSeedAdvice(formData, lang);
            const advice = response.data.advice;
            setAiAdvice(advice);

            // Fetch images for seeds
            if (advice.seedRecommendations) {
                const imgPromises = advice.seedRecommendations.map(async (seed) => {
                    const query = seed.searchQuery || `${seed.name} ${formData.primaryCrops[0]} seeds India`;
                    const url = await mediaAPI.searchImages(query);
                    return { name: seed.name, url };
                });
                const results = await Promise.all(imgPromises);
                const imgMap = {};
                results.forEach(res => imgMap[res.name] = res.url);
                setSeedImages(imgMap);
            }

            setStep(3);
        } catch (error) {
            console.error('Failed to fetch advice', error);
            setStep(3); // Continue anyway but without AI advice
        } finally {
            setFetchingAdvice(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.totalArea.value || !formData.soilType || !formData.irrigationType) {
            alert(t('Please fill in all basic information'));
            return;
        }
        setLoading(true);
        try {
            const response = await userAPI.updateFarmInfo({ farmInfo: formData });
            updateUser(response.data.user);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to update farm info', error);
            alert(t('Something went wrong. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const commonCrops = ['Wheat', 'Rice', 'Sugarcane', 'Cotton', 'Soybean', 'Maize', 'Tomato', 'Onion', 'Potato'];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-white dark:bg-[#111827] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-emerald-100 dark:border-white/10"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                                <Sprout size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">{t('Complete Your Profile')}</h2>
                                <p className="text-emerald-50/80 text-sm mt-1">{t('Tell us about your farm for smarter AI recommendations')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8">
                        {step === 1 ? (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Total Area */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Ruler size={16} className="text-emerald-500" /> {t('Total Farm Area')}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={formData.totalArea.value}
                                                onChange={(e) => setFormData({ ...formData, totalArea: { ...formData.totalArea, value: e.target.value } })}
                                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold dark:text-white"
                                                placeholder="e.g. 5"
                                            />
                                            <select
                                                value={formData.totalArea.unit}
                                                onChange={(e) => setFormData({ ...formData, totalArea: { ...formData.totalArea, unit: e.target.value } })}
                                                className="px-3 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none font-bold dark:text-white"
                                            >
                                                <option value="acres">Acres</option>
                                                <option value="hectares">Hectares</option>
                                                <option value="guntha">Guntha</option>
                                                <option value="bigha">Bigha</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Soil Type */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Leaf size={16} className="text-emerald-500" /> {t('Soil Type')}
                                        </label>
                                        <select
                                            value={formData.soilType}
                                            onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold dark:text-white"
                                        >
                                            <option value="">{t('Select Soil Type')}</option>
                                            <option value="Black Soil">{t('Black Soil')}</option>
                                            <option value="Alluvial Soil">{t('Alluvial Soil')}</option>
                                            <option value="Red Soil">{t('Red Soil')}</option>
                                            <option value="Laterite Soil">{t('Laterite Soil')}</option>
                                            <option value="Sandy Soil">{t('Sandy Soil')}</option>
                                            <option value="Clayey Soil">{t('Clayey Soil')}</option>
                                        </select>
                                    </div>

                                    {/* Irrigation Type */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Droplets size={16} className="text-emerald-500" /> {t('Irrigation Type')}
                                        </label>
                                        <select
                                            value={formData.irrigationType}
                                            onChange={(e) => setFormData({ ...formData, irrigationType: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold dark:text-white"
                                        >
                                            <option value="">{t('Select Irrigation')}</option>
                                            <option value="Drip Irrigation">{t('Drip Irrigation')}</option>
                                            <option value="Sprinkler">{t('Sprinkler')}</option>
                                            <option value="Borewell">{t('Borewell')}</option>
                                            <option value="Canal">{t('Canal')}</option>
                                            <option value="Rain-fed">{t('Rain-fed')}</option>
                                        </select>
                                    </div>

                                    {/* Years of Experience */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <TrendingUp size={16} className="text-emerald-500" /> {t('Farming Experience (Years)')}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.experienceYears}
                                            onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold dark:text-white"
                                            placeholder="e.g. 10"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group mt-4"
                                >
                                    {t('Next Step')} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        ) : step === 2 ? (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Leaf size={16} className="text-emerald-500" /> {t('What do you grow primarily?')}
                                    </label>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {commonCrops.map(crop => (
                                            <button
                                                key={crop}
                                                onClick={() => handleCropToggle(crop)}
                                                className={`px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm ${formData.primaryCrops.includes(crop)
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                    : 'bg-gray-50 border-gray-100 text-gray-600 dark:bg-white/5 dark:border-white/5 dark:text-gray-400'
                                                    }`}
                                            >
                                                {t(crop)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-5 bg-emerald-50 dark:bg-white/5 rounded-2xl border border-emerald-100 dark:border-white/10">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                                        <TrendingUp size={16} className="text-emerald-500" /> {t('Current Farming Stage')}
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {['starting', 'growing', 'harvested'].map(stage => (
                                            <button
                                                key={stage}
                                                onClick={() => setFormData({ ...formData, farmingStage: stage })}
                                                className={`px-3 py-2 rounded-lg border-2 text-xs font-black uppercase tracking-wider transition-all ${formData.farmingStage === stage
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : 'bg-white border-gray-100 text-gray-400 dark:bg-transparent dark:border-white/10'
                                                    }`}
                                            >
                                                {t(stage)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-all dark:bg-white/5 dark:text-white"
                                    >
                                        {t('Back')}
                                    </button>
                                    <button
                                        onClick={fetchSeedAdvice}
                                        disabled={fetchingAdvice || formData.primaryCrops.length === 0}
                                        className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {fetchingAdvice ? (
                                            <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                {t('Get Recommendations')} <ChevronRight size={20} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                {aiAdvice && (
                                    <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {/* Seed Suggestions */}
                                        <div className="space-y-3">
                                            <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2">
                                                <Sprout className="text-emerald-500" size={18} /> {t('Recommended Seeds')}
                                            </h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                {aiAdvice.seedRecommendations?.map((seed, i) => (
                                                    <div key={i} className="p-4 bg-emerald-50/50 dark:bg-white/5 rounded-2xl border border-emerald-100 dark:border-white/10 flex gap-4 overflow-hidden group">
                                                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-emerald-200 dark:bg-emerald-800 shrink-0 border-2 border-white dark:border-white/10 shadow-sm relative">
                                                            {seedImages[seed.name] ? (
                                                                <img
                                                                    src={seedImages[seed.name]}
                                                                    alt={seed.name}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                />
                                                            ) : (
                                                                <Leaf className="text-emerald-600 dark:text-emerald-300 absolute inset-0 m-auto" size={32} />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-black text-emerald-800 dark:text-emerald-400 truncate tracking-tight">{seed.name}</div>
                                                            <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{seed.features}</div>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                <span className="text-[9px] font-black px-2 py-0.5 bg-white/80 dark:bg-white/10 rounded-full border border-emerald-100 dark:border-white/5 text-emerald-600 dark:text-emerald-400 uppercase">
                                                                    {seed.duration}
                                                                </span>
                                                                <span className="text-[9px] font-black px-2 py-0.5 bg-white/80 dark:bg-white/10 rounded-full border border-emerald-100 dark:border-white/5 text-emerald-600 dark:text-emerald-400 uppercase">
                                                                    {seed.yieldPotential}
                                                                </span>
                                                            </div>

                                                            <div className="mt-3 pt-2 border-t border-emerald-100 dark:border-white/5 flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5">
                                                                    <MapPin size={10} className="text-emerald-500" />
                                                                    <span className="text-[10px] font-bold text-gray-500">{seed.storeType || 'Local Agro-Agency'}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => window.open(`https://www.google.com/maps/search/agricultural+seed+stores+near+${formData.address?.taluka || formData.address?.district || 'me'}`, '_blank')}
                                                                    className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                                                                >
                                                                    {t('Find Stores')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Yield Analysis */}
                                        <div className="p-5 bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl text-white shadow-xl">
                                            <div className="flex items-center gap-3 mb-4">
                                                <TrendingUp size={24} />
                                                <h3 className="font-black text-lg">{t('Yield Insights')}</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">{t('Benchmark Expectation')}</div>
                                                    <div className="text-2xl font-black">{aiAdvice.yieldAnalysis?.estimatedYield}</div>
                                                    <div className="text-xs opacity-80 mt-1">{aiAdvice.yieldAnalysis?.benchmarks}</div>
                                                </div>

                                                <div className="pt-4 border-t border-white/10">
                                                    <div className="text-xs font-bold opacity-70 uppercase tracking-widest mb-2">
                                                        {formData.farmingStage === 'starting' ? t('Target Yield Desire') : t('Report Actual Yield')}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={formData.targetYield}
                                                        onChange={(e) => setFormData({ ...formData, targetYield: e.target.value })}
                                                        placeholder={t('Enter quantity (e.g. 50 quintals)')}
                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:bg-white/20 transition-all placeholder:text-white/40 font-bold"
                                                    />
                                                </div>

                                                {formData.farmingStage !== 'starting' && (
                                                    <div className="pt-4 border-t border-white/10">
                                                        <div className="text-xs font-bold opacity-70 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Camera size={12} /> {t('Upload Crop/Yield Photos for Analysis')}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button className="bg-white/10 border border-dashed border-white/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1 hover:bg-white/20 transition-all">
                                                                <Camera size={20} className="text-emerald-300" />
                                                                <span className="text-[10px] font-bold">{t('Take Photo')}</span>
                                                            </button>
                                                            <div className="text-[10px] opacity-60 flex items-center px-2">
                                                                {t('Sharing photos helps our AI give more precise seasonal recommendations.')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-all dark:bg-white/5 dark:text-white"
                                    >
                                        {t('Back')}
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-[2] bg-gradient-to-r from-emerald-600 to-green-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 size={20} /> {t('Save My Information')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FarmInfoModal;
