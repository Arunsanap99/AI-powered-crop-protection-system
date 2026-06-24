import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, LayersControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Search,
    MapPin,
    Filter,
    Plus,
    MessageSquare,
    Truck,
    Navigation,
    Loader2,
    ChevronRight,
    ShieldCheck,
    Factory,
    Target,
    Phone,
    Table as TableIcon,
    X,
    TrendingUp,
    Image as ImageIcon,
    ChevronLeft
} from 'lucide-react'; // Closing bracket added here
import axios from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import AIKeyModal from '../../components/AIKeyModal';
import {
    Info,
    Brain,
    Sparkles,
    CircleDashed
} from 'lucide-react';

// Fix for Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const farmerIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #10b981; color: white; padding: 6px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const millIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #0d9488; color: white; padding: 6px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10"></path><path d="m22 10-10-8L2 10"></path><path d="M6 18h4"></path><path d="M14 18h4"></path></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const ginningIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #8b5cf6; color: white; padding: 6px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const marketIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #f97316; color: white; padding: 6px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="3" y2="21"></line><line x1="15" x2="15" y1="3" y2="21"></line></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const warehouseIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #2563eb; color: white; padding: 6px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13H3Z"></path><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"></path></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const myIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
});

const getFacilityIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('ginning') || t.includes('genning')) return ginningIcon;
    if (t.includes('market') || t.includes('apmc')) return marketIcon;
    if (t.includes('warehouse') || t.includes('storage')) return warehouseIcon;
    return millIcon;
};

const SupplyChainDashboard = () => {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const [listings, setListings] = useState([]);
    const [processingCenters, setProcessingCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useState({
        cropType: '',
        distance: 50, // default to 50km
        city: ''
    });
    const [myLocation, setMyLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState([19.9975, 73.7898]); // Default to Nashik as requested by user
    const [showListingModal, setShowListingModal] = useState(false);
    const [newListing, setNewListing] = useState({
        cropType: '',
        quantity: '',
        unit: 'tons',
        price: '',
        city: '', // Added city
        availabilityDate: new Date().toISOString().split('T')[0],
        description: '',
        yieldAmount: '',
        neededAmount: '',
        destinationName: '',
        destinationLongitude: null,
        destinationLatitude: null,
        listingImage: 'https://images.unsplash.com/photo-1594751439417-df7a6969579a?q=80&w=400&h=300&auto=format&fit=crop', // default image
        preferredTransport: 'Truck',
        contactPhone: ''
    });

    const [selectedFacility, setSelectedFacility] = useState(null);
    const [showMarketModal, setShowMarketModal] = useState(false);
    const [currentImgIndex, setCurrentImgIndex] = useState({}); // Tracking index per facility
    const [popupView, setPopupView] = useState({}); // Tracking 'info' | 'gallery' | 'prices' per facility
    const [routes, setRoutes] = useState({}); // listingId -> { coordinates, distance, duration }
    const [showAIModal, setShowAIModal] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);

    // Auto-fill user info when modal opens
    useEffect(() => {
        if (showListingModal) {
            if (user) {
                setNewListing(prev => ({
                    ...prev,
                    contactPhone: prev.contactPhone || user.mobileNumber || '',
                    city: prev.city || user.address?.district || ''
                }));
            }
            if (myLocation && !newListing.city) {
                reverseGeocode(myLocation[0], myLocation[1]);
            }
        }
    }, [showListingModal, user, myLocation]);

    // Fetch accurate road route from OSRM
    const fetchRoadRoute = async (id, start, end) => {
        try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                setRoutes(prev => ({
                    ...prev,
                    [id]: {
                        coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]), // geojson is [lon, lat], leaflet is [lat, lon]
                        distance: (route.distance / 1000).toFixed(1), // convert to km
                        duration: Math.round(route.duration / 60) // convert to mins
                    }
                }));
            }
        } catch (err) {
            console.error("Routing error:", err);
        }
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.district;
                if (city) {
                    setNewListing(prev => ({ ...prev, city: city }));
                }
            }
        } catch (err) {
            console.error("Geocoding error:", err);
        }
    };

    const handleGenerateAI = async () => {
        const groqKey = user?.groqApiKey || localStorage.getItem('groq_api_key');
        if (!groqKey) {
            setShowAIModal(true);
            return;
        }

        if (!newListing.cropType || !newListing.quantity) {
            alert(t("Please enter at least Crop Type and Quantity for AI to work its magic!"));
            return;
        }

        setGeneratingAI(true);
        try {
            const prompt = `Generate a compelling agricultural listing description for a supply chain collaboration.
            Details:
            - Crop: ${newListing.cropType}
            - Quantity: ${newListing.quantity} ${newListing.unit}
            - Price: ₹${newListing.price || 'Market Rates'}
            - Location: ${newListing.city || 'Local Farm'}
            - Destination: ${newListing.destinationName || 'Negotiable'}
            - Transport: ${newListing.preferredTransport}
            - Available from: ${newListing.availabilityDate}
            
            The description should be professional, highlight quality, and emphasize transport collaboration benefits. Keep it under 80 words.`;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'system', content: 'You are an expert agricultural consultant.' }, { role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 250
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                setNewListing(prev => ({ ...prev, description: data.choices[0].message.content.trim() }));
            } else if (data.error) {
                alert(`AI Error: ${data.error.message}`);
            }
        } catch (error) {
            console.error('AI Generation error:', error);
            alert(t("Failed to generate description. Check your internet connection."));
        } finally {
            setGeneratingAI(false);
        }
    };

    useEffect(() => {
        if (!myLocation && user?.address?.district) {
            const district = user.address.district.toLowerCase();
            if (district.includes('nashik')) setMapCenter([19.9975, 73.7898]);
            else if (district.includes('kolhapur')) setMapCenter([16.7050, 74.2433]);
            else if (district.includes('pune')) setMapCenter([18.5204, 73.8567]);
            else if (district.includes('sangli')) setMapCenter([16.8524, 74.5815]);
        }
    }, [user, myLocation]);

    // Fetch Current Location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = [position.coords.latitude, position.coords.longitude];
                    setMyLocation(loc);
                    setMapCenter(loc);
                },
                (error) => console.error("Location error:", error)
            );
        }
    }, []);

    const fetchListings = useCallback(async () => {
        if (!myLocation) return;
        setLoading(true);
        try {
            const { data } = await axios.get('/supply-chain/listings/nearby', {
                params: {
                    longitude: myLocation[1],
                    latitude: myLocation[0],
                    distance: searchParams.distance,
                    cropType: searchParams.cropType
                }
            });
            const fetchedListings = data.data;
            setListings(fetchedListings);

            // Fetch road routes for all listings with destinations
            fetchedListings.forEach(item => {
                if (item.destinationCoords?.coordinates?.length === 2) {
                    fetchRoadRoute(item._id,
                        [item.location.coordinates[1], item.location.coordinates[0]],
                        [item.destinationCoords.coordinates[1], item.destinationCoords.coordinates[0]]
                    );
                }
            });

            const centerRes = await axios.get('/supply-chain/external/processing-centers', {
                params: {
                    latitude: myLocation[0],
                    longitude: myLocation[1],
                    city: searchParams.city,
                    radius: searchParams.distance
                }
            });
            setProcessingCenters(centerRes.data.data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [myLocation, searchParams]);

    // Handle routing for the "pending" new listing
    useEffect(() => {
        if (myLocation && newListing.destinationLongitude && newListing.destinationLatitude) {
            fetchRoadRoute('temp-listing', myLocation, [newListing.destinationLatitude, newListing.destinationLongitude]);
        } else {
            setRoutes(prev => {
                const next = { ...prev };
                delete next['temp-listing'];
                return next;
            });
        }
    }, [myLocation, newListing.destinationLongitude, newListing.destinationLatitude]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    const handleCreateListing = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/supply-chain/listings', {
                ...newListing,
                longitude: myLocation[1],
                latitude: myLocation[0]
            });
            setShowListingModal(false);
            fetchListings();
        } catch (error) {
            alert(t("Error creating listing"));
        }
    };

    const sendCollabRequest = async (listing) => {
        try {
            await axios.post('/supply-chain/collaboration/request', {
                receiverId: listing.farmerId._id,
                listingId: listing._id,
                message: `Hi ${listing.farmerId.fullName}, I have crops nearby and I'm interested in coordinating transportation with you.`
            });
            alert(t("Request sent successfully!"));
        } catch (error) {
            alert(error.response?.data?.message || t("Error sending request"));
        }
    };

    const handleDeleteListing = async (listingId) => {
        if (!window.confirm(t("Are you sure you want to remove this listing?"))) return;
        try {
            await axios.delete(`/supply-chain/listings/${listingId}`);
            // Remove route from state immediately
            setRoutes(prev => {
                const next = { ...prev };
                delete next[listingId];
                return next;
            });
            fetchListings();
        } catch (error) {
            alert(t("Error removing listing"));
        }
    };

    return (
        <div className="kk-page p-4 sm:p-6 lg:p-8">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'};
                }
                
                /* Leaflet Popup Fixes */
                .leaflet-popup-content-wrapper {
                    background: transparent !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .leaflet-popup-content {
                    margin: 0 !important;
                    width: fit-content !important;
                }
                .leaflet-popup-tip-container {
                    display: none;
                }
                .leaflet-container {
                    font-family: inherit;
                }
            `}</style>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="kk-h1 flex items-center gap-3">
                        <Truck className="text-emerald-500" size={32} />
                        {t('Supply Chain Network')}
                    </h1>
                    <p className="kk-text mt-1">{t('Collaborate with nearby farmers to reduce transport costs and reach better markets.')}</p>
                </div>
                <button
                    onClick={() => setShowListingModal(true)}
                    className="kk-btn-primary flex items-center gap-2 self-start"
                >
                    <Plus size={20} />
                    {t('Post New Listing')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
                {/* Sidebar Filters */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="kk-card p-5 h-full">
                        <h3 className="kk-h3 mb-4 flex items-center gap-2">
                            <Filter size={18} className="text-emerald-500" />
                            {t('Filter Network')}
                        </h3>

                        <div className="space-y-4">
                            <div className="flex-1 flex flex-wrap items-center gap-4">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                                    <input
                                        type="text"
                                        placeholder={t("Search city (e.g. Pune, Sangli)...")}
                                        className="kk-input pl-10 w-full"
                                        value={searchParams.city}
                                        onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 min-w-[200px]">
                                    <label className="text-xs font-bold text-secondary flex justify-between">
                                        {t('Search Radius')}
                                        <span className="text-emerald-500">{searchParams.distance} km</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="5000"
                                        step="5"
                                        className="kk-range"
                                        value={searchParams.distance}
                                        onChange={(e) => setSearchParams({ ...searchParams, distance: e.target.value })}
                                    />
                                </div>
                                <select
                                    className="kk-input min-w-[150px]"
                                    value={searchParams.cropType}
                                    onChange={(e) => setSearchParams({ ...searchParams, cropType: e.target.value })}
                                >
                                    <option value="">{t('All Crop Types')}</option>
                                    <option value="Cotton">{t('Cotton')}</option>
                                    <option value="Grapes">{t('Grapes')}</option>
                                    <option value="SugarCane">{t('Sugar Cane')}</option>
                                    <option value="Soybean">{t('Soybean')}</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-border-card">
                                <h4 className="text-xs font-black text-secondary uppercase tracking-widest mb-4">{t('Nearby Results')} ({listings.length})</h4>
                                <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2">
                                    {loading ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-500" /></div>
                                    ) : listings.filter(item => item.farmerId?._id !== user?._id).map(item => (
                                        <div key={item._id} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all group">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-bold text-primary">{t(item.cropType)}</span>
                                                <span className="text-xs font-black text-emerald-400">₹{item.price}</span>
                                            </div>
                                            <p className="text-[11px] text-secondary truncate mb-2">{t('By')} {item.farmerId.fullName}</p>
                                            <button
                                                onClick={() => sendCollabRequest(item)}
                                                className="w-full py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all"
                                            >
                                                {t('Request Collab')}
                                            </button>
                                        </div>
                                    ))}
                                    {!loading && listings.length === 0 && (
                                        <p className="text-center py-8 text-xs text-muted">{t('No farmers found in this range.')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map View */}
                <div className="lg:col-span-3 kk-card overflow-hidden relative">
                    {!myLocation && (
                        <div className="absolute inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                            <div className="text-center">
                                <Loader2 className="animate-spin mx-auto mb-4" size={40} />
                                <p className="font-bold">{t('Locating you on the map...')}</p>
                            </div>
                        </div>
                    )}

                    <MapContainer
                        center={mapCenter}
                        zoom={12}
                        className="w-full h-full"
                        style={{
                            filter: isDark ? 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' : 'none',
                            zIndex: 10 // Fix z-index overlap
                        }}
                    >
                        <LayersControl position="topright">
                            <LayersControl.BaseLayer checked name="Standard">
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Satellite">
                                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Terrain">
                                <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
                            </LayersControl.BaseLayer>
                        </LayersControl>

                        {myLocation && (
                            <>
                                <Marker position={myLocation} icon={myIcon}>
                                    <Popup>
                                        <div className="p-1 font-bold">{t('You are here')}</div>
                                    </Popup>
                                </Marker>
                                <Circle
                                    center={myLocation}
                                    radius={searchParams.distance * 1000}
                                    pathOptions={{ fillOpacity: 0.1, color: '#10b981' }}
                                />
                            </>
                        )}

                        {listings.filter(item => item.location?.coordinates?.length === 2 && item.location.coordinates.every(c => c !== undefined)).map(item => (
                            <Marker
                                key={item._id}
                                position={[item.location.coordinates[1], item.location.coordinates[0]]}
                                icon={farmerIcon}
                            >
                                <Popup maxHeight={450}>
                                    <div className={`p-4 min-w-[280px] max-h-[450px] overflow-y-auto custom-scrollbar rounded-2xl border shadow-2xl bg-[var(--bg-card)] border-[var(--border-card)]`}>
                                        {item.listingImage && (
                                            <div className="relative mb-3">
                                                <img
                                                    src={item.listingImage}
                                                    alt={item.cropType}
                                                    className="w-full h-32 object-cover rounded-xl shadow-inner border border-white/5"
                                                />
                                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg uppercase">
                                                    ₹{item.price}/{item.unit}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`px-2 py-1 ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} text-[10px] font-black rounded-lg border uppercase tracking-wider`}>
                                                {item.cropType}
                                            </span>
                                            <div className="flex items-center gap-1 text-[10px] text-secondary font-bold italic">
                                                <MapPin size={10} /> {item.city}
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'} leading-none mb-1`}>{item.farmerId.fullName}</h3>
                                            <p className="text-[10px] text-secondary font-medium italic">{t('Active Farmer')}</p>
                                        </div>

                                        <div className={`space-y-2 p-3 rounded-xl mb-4 text-[11px] ${isDark ? 'bg-white/5 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-secondary font-bold uppercase tracking-tighter">{t('Yield')}</span>
                                                <span className={`font-black text-[var(--text-primary)]`}>{item.yieldAmount} {t(item.unit)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1 border-t border-white/10">
                                                <span className="text-secondary font-bold uppercase tracking-tighter">{t('Need Collab')}</span>
                                                <span className="font-black text-emerald-500">{item.neededAmount} {t(item.unit)}</span>
                                            </div>
                                            {item.destinationName && (
                                                <div className="flex justify-between items-start pt-1 border-t border-white/10">
                                                    <span className="text-secondary font-bold uppercase tracking-tighter">Selling At</span>
                                                    <span className={`font-black text-right max-w-[120px] line-clamp-1 italic text-[var(--text-primary)]`}>{item.destinationName}</span>
                                                </div>
                                            )}
                                            {routes[item._id] && (
                                                <div className="flex justify-between items-start pt-1 border-t border-white/10">
                                                    <span className="text-secondary font-bold uppercase tracking-tighter">Road Distance</span>
                                                    <span className="font-black text-blue-500">{routes[item._id].distance} km ({routes[item._id].duration}m)</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => sendCollabRequest(item)}
                                                className="py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-md hover:bg-emerald-700 transition-colors uppercase"
                                            >
                                                {t('Collaborate')}
                                            </button>
                                            <a
                                                href={`tel:${item.contactPhone || item.farmerId.mobileNumber}`}
                                                className="py-2 bg-white border border-emerald-600 text-emerald-600 rounded-lg text-[10px] font-bold shadow-sm hover:bg-emerald-50 transition-colors uppercase text-center flex items-center justify-center gap-2"
                                            >
                                                <Phone size={12} /> {t('Call')}
                                            </a>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Rendering Shared Destinations */}
                        {listings.filter(item => item.destinationCoords?.coordinates?.length === 2 && item.destinationCoords.coordinates.every(c => c !== undefined)).map(item => (
                            <Marker
                                key={`dest-${item._id}`}
                                position={[item.destinationCoords.coordinates[1], item.destinationCoords.coordinates[0]]}
                                icon={L.divIcon({
                                    className: 'custom-div-icon',
                                    html: `<div style="background-color: #ef4444; color: white; padding: 4px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
                                    iconSize: [20, 20],
                                    iconAnchor: [10, 10]
                                })}
                            >
                                <Popup maxHeight={400}>
                                    <div className={`p-3 min-w-[220px] max-h-[400px] overflow-y-auto custom-scrollbar border rounded-2xl shadow-2xl bg-[var(--bg-card)] border-[var(--border-card)] text-[var(--text-primary)]`}>
                                        <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">{t('TARGET DESTINATION')}</div>
                                        <h4 className="font-bold text-sm mb-2">{item.destinationName}</h4>
                                        <div className="space-y-1 mb-4">
                                            <p className="text-[11px] text-secondary">{t('Farmer')}: {item.farmerId.fullName}</p>
                                            <p className="text-[11px] text-secondary">{t('Crop')}: {t(item.cropType)}</p>
                                            {routes[item._id] && (
                                                <div className="flex items-center gap-1.5 mt-2 p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                    <Truck size={12} className="text-blue-500" />
                                                    <span className="text-[10px] font-black text-blue-500">{routes[item._id].distance} KM • {routes[item._id].duration} MINS</span>
                                                </div>
                                            )}
                                        </div>

                                        {item.farmerId._id === user?._id && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <button
                                                    onClick={() => handleDeleteListing(item._id)}
                                                    className="py-2 bg-red-600 text-white rounded-xl text-[10px] font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <X size={14} /> {t('REMOVE')}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteListing(item._id)}
                                                    className="py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                                                >
                                                    <ShieldCheck size={14} /> {t('DONE')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                                {routes[item._id] && (
                                    <Polyline
                                        positions={routes[item._id].coordinates}
                                        pathOptions={{
                                            color: '#ef4444',
                                            weight: 4,
                                            dashArray: '5, 8',
                                            opacity: 0.8
                                        }}
                                    />
                                )}
                            </Marker>
                        ))}

                        {/* Render path to selected destination */}
                        {myLocation && newListing.destinationLongitude && newListing.destinationLatitude && (
                            <>
                                {routes['temp-listing'] && (
                                    <Polyline
                                        positions={routes['temp-listing'].coordinates}
                                        pathOptions={{
                                            color: '#3b82f6',
                                            weight: 5,
                                            opacity: 0.8,
                                            className: 'targeting-polyline'
                                        }}
                                    />
                                )}
                            </>
                        )}

                        {processingCenters.filter(center => center.location?.length === 2 && center.location.every(c => c !== undefined)).map(center => {
                            const isTargeted = newListing.destinationLongitude === center.location[0] &&
                                newListing.destinationLatitude === center.location[1];

                            return (
                                <Marker
                                    key={center.id}
                                    position={[center.location[1], center.location[0]]}
                                    icon={getFacilityIcon(center.type)}
                                >
                                    <Popup maxHeight={480}>
                                        <div className={`p-0 min-w-[300px] max-h-[480px] overflow-y-auto custom-scrollbar rounded-2xl border shadow-2xl bg-[var(--bg-card)] border-[var(--border-card)]`}>
                                            {/* Simple Header */}
                                            <div className={`p-3 border-b ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                                <h3 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{center.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                                                        {t(center.source)} {t('Verified')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        • {center.city}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Toggle Area */}
                                            <div className="p-3">
                                                {!popupView[center._id] || popupView[center._id] === 'info' ? (
                                                    <div className="space-y-3">
                                                        <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('Verified agricultural processing center.')}</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setPopupView({ ...popupView, [center._id]: 'gallery' }); }}
                                                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                                            >
                                                                <ImageIcon size={18} className="text-purple-400" />
                                                                <span className="text-[9px] font-bold text-secondary uppercase">{t('GALLERY')}</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setPopupView({ ...popupView, [center._id]: 'prices' }); }}
                                                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                                            >
                                                                <TrendingUp size={18} className="text-emerald-400" />
                                                                <span className="text-[9px] font-bold text-secondary uppercase">{t('PRICES')}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : popupView[center._id] === 'gallery' ? (
                                                    <div className="space-y-3">
                                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40">
                                                            <img
                                                                src={center.images?.[currentImgIndex[center._id] || 0] || center.image || 'https://images.unsplash.com/photo-1590644365607-1c5a519a9a37?q=80&w=400'}
                                                                className="w-full h-full object-cover"
                                                                alt=""
                                                            />
                                                            {center.images?.length > 1 && (
                                                                <div className="absolute inset-0 flex items-center justify-between px-2">
                                                                    <button onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const idx = currentImgIndex[center._id] || 0;
                                                                        const next = (idx - 1 + center.images.length) % center.images.length;
                                                                        setCurrentImgIndex({ ...currentImgIndex, [center._id]: next });
                                                                    }} className="p-1 bg-black/60 text-white rounded-full"><ChevronLeft size={16} /></button>
                                                                    <button onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const idx = currentImgIndex[center._id] || 0;
                                                                        const next = (idx + 1) % center.images.length;
                                                                        setCurrentImgIndex({ ...currentImgIndex, [center._id]: next });
                                                                    }} className="p-1 bg-black/60 text-white rounded-full"><ChevronRight size={16} /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => setPopupView({ ...popupView, [center._id]: 'info' })} className="w-full text-[9px] font-bold text-gray-500 hover:text-secondary uppercase">← Back</button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <div className={`rounded-xl border border-white/5 overflow-hidden ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                                            <table className="w-full text-left text-[10px]">
                                                                <thead>
                                                                    <tr className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'} border-b`}>
                                                                        <th className="px-3 py-2 font-bold text-secondary">Crop</th>
                                                                        <th className="px-3 py-2 font-bold text-secondary text-right">Price</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-200'}`}>
                                                                    {center.marketPrices?.length > 0 ? (
                                                                        center.marketPrices.map((p, i) => (
                                                                            <tr key={i}>
                                                                                <td className={`px-3 py-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t(p.crop)}</td>
                                                                                <td className="px-3 py-2 text-emerald-500 font-bold text-right">₹{p.price}/{t(p.unit)}</td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr><td colSpan="2" className="px-3 py-4 text-center text-secondary italic">{t('No rates found.')}</td></tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <button onClick={() => setPopupView({ ...popupView, [center._id]: 'info' })} className="w-full text-[9px] font-bold text-gray-500 hover:text-secondary uppercase">← {t('Back')}</button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Box */}
                                            <div className={`p-3 grid grid-cols-2 gap-2 border-t ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                                {isTargeted ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Find the listing that targets this facility
                                                                const myListing = listings.find(l =>
                                                                    l.farmerId._id === user?._id &&
                                                                    l.destinationCoords?.coordinates[0] === center.location[0] &&
                                                                    l.destinationCoords?.coordinates[1] === center.location[1]
                                                                );

                                                                if (myListing) {
                                                                    handleDeleteListing(myListing._id);
                                                                } else {
                                                                    // Temporary target in state
                                                                    setNewListing({
                                                                        ...newListing,
                                                                        destinationName: '',
                                                                        destinationLongitude: null,
                                                                        destinationLatitude: null
                                                                    });
                                                                }
                                                            }}
                                                            className="py-2 bg-red-600 text-white rounded-xl text-[10px] font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <X size={14} /> REMOVE
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const myListing = listings.find(l =>
                                                                    l.farmerId._id === user?._id &&
                                                                    l.destinationCoords?.coordinates[0] === center.location[0] &&
                                                                    l.destinationCoords?.coordinates[1] === center.location[1]
                                                                );

                                                                if (myListing) {
                                                                    handleDeleteListing(myListing._id);
                                                                } else {
                                                                    setNewListing({
                                                                        ...newListing,
                                                                        destinationName: '',
                                                                        destinationLongitude: null,
                                                                        destinationLatitude: null
                                                                    });
                                                                }
                                                            }}
                                                            className="py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                                                        >
                                                            <ShieldCheck size={14} /> DONE
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setNewListing({
                                                                    ...newListing,
                                                                    destinationName: center.name,
                                                                    destinationLongitude: center.location[0],
                                                                    destinationLatitude: center.location[1]
                                                                });
                                                                setSelectedFacility(center);
                                                                setShowListingModal(true);
                                                            }}
                                                            className="py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <Target size={14} /> {t('SELL')}
                                                        </button>
                                                        <a
                                                            href={`tel:${center.contact}`}
                                                            className={`py-2 border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${isDark ? 'border-white/10 text-white hover:bg-white/10' : 'border-gray-200 text-gray-900 hover:bg-gray-100'}`}
                                                        >
                                                            <Phone size={14} className="text-blue-500" /> CALL
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>

            {/* Post Listing Modal */}
            <AnimatePresence>
                {showListingModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowListingModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl kk-card-solid p-8 overflow-y-auto max-h-[90vh]"
                        >
                            <h2 className="kk-h2 mb-6">Post Crop for Supply Chain</h2>
                            <form onSubmit={handleCreateListing} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column - Product Info */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                                            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">{t('Crop Details')}</h3>
                                            {selectedFacility?.marketPrices?.length > 0 && (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                    {t('Prices Available')}
                                                </span>
                                            )}
                                        </div>

                                        {selectedFacility?.marketPrices?.length > 0 && (
                                            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                                <label className="text-[10px] font-black text-secondary uppercase tracking-wider mb-2 block">{t('Quick-Select Price from')} {selectedFacility.name}</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedFacility.marketPrices.map((p, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => setNewListing({
                                                                ...newListing,
                                                                cropType: p.crop,
                                                                price: p.price,
                                                                unit: p.unit || 'kg'
                                                            })}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${newListing.cropType === p.crop
                                                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                                                                : (isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300')
                                                                }`}
                                                        >
                                                            {t(p.crop)}: ₹{p.price}/{t(p.unit)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="kk-muted block mb-1.5">{t('Crop Type')}</label>
                                            <input
                                                required
                                                type="text"
                                                className="kk-input"
                                                placeholder="e.g. Sugar"
                                                value={newListing.cropType}
                                                onChange={(e) => setNewListing({ ...newListing, cropType: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="kk-muted block mb-1.5">{t('Quantity')}</label>
                                                <input
                                                    required
                                                    type="number"
                                                    className="kk-input"
                                                    placeholder="5"
                                                    value={newListing.quantity}
                                                    onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="kk-muted block mb-1.5">{t('Unit')}</label>
                                                <select
                                                    className="kk-input"
                                                    value={newListing.unit}
                                                    onChange={(e) => setNewListing({ ...newListing, unit: e.target.value })}
                                                >
                                                    <option>tons</option>
                                                    <option>kg</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="kk-muted block mb-1.5">{t('Price (per unit)')}</label>
                                                <input
                                                    required
                                                    type="number"
                                                    className="kk-input"
                                                    placeholder="₹ 2000"
                                                    value={newListing.price}
                                                    onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="kk-muted block mb-1.5">{t('Total Yield')}</label>
                                                <input
                                                    type="text"
                                                    className="kk-input"
                                                    placeholder="e.g. 10 tons"
                                                    value={newListing.yieldAmount}
                                                    onChange={(e) => setNewListing({ ...newListing, yieldAmount: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="kk-muted block">{t('Description')}</label>
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateAI}
                                                    disabled={generatingAI}
                                                    className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-all"
                                                >
                                                    {generatingAI ? (
                                                        <CircleDashed size={12} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={12} />
                                                    )}
                                                    {generatingAI ? t('WRITING...') : t('AUTO-GENERATE WITH AI')}
                                                </button>
                                            </div>
                                            <textarea
                                                className="kk-input min-h-[100px]"
                                                placeholder={t("Describe your transport needs...")}
                                                value={newListing.description}
                                                onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column - Logistics & Location */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/10 pb-2">{t('Logistics & Location')}</h3>

                                        <div>
                                            <label className="kk-muted block mb-1.5">{t('City/Base Location')}</label>
                                            <input
                                                required
                                                type="text"
                                                className="kk-input"
                                                placeholder="e.g. Sangli"
                                                value={newListing.city}
                                                onChange={(e) => setNewListing({ ...newListing, city: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="kk-muted block mb-1.5">{t('Target Destination (Auto-filled)')}</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    className="kk-input pr-10 border-blue-500/30 bg-blue-500/5"
                                                    placeholder={t("Select from map...")}
                                                    value={newListing.destinationName}
                                                    onChange={(e) => setNewListing({ ...newListing, destinationName: e.target.value })}
                                                />
                                                <MapPin className="absolute right-3 top-3 text-blue-500" size={18} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="kk-muted block mb-1.5">{t('Quantity for Collab')}</label>
                                                <input
                                                    type="text"
                                                    className="kk-input"
                                                    placeholder="e.g. 5 tons"
                                                    value={newListing.neededAmount}
                                                    onChange={(e) => setNewListing({ ...newListing, neededAmount: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="kk-muted block mb-1.5">{t('Preferred Transport')}</label>
                                                <select
                                                    className="kk-input"
                                                    value={newListing.preferredTransport}
                                                    onChange={(e) => setNewListing({ ...newListing, preferredTransport: e.target.value })}
                                                >
                                                    <option>{t('Tractor')}</option>
                                                    <option>{t('Truck')}</option>
                                                    <option>{t('Trolley')}</option>
                                                    <option>{t('Other')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="kk-muted block mb-1.5">{t('Contact Number')}</label>
                                                <input
                                                    required
                                                    type="tel"
                                                    className="kk-input"
                                                    placeholder="+91..."
                                                    value={newListing.contactPhone}
                                                    onChange={(e) => setNewListing({ ...newListing, contactPhone: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="kk-muted block mb-1.5">{t('Available Date')}</label>
                                                <input
                                                    required
                                                    type="date"
                                                    className="kk-input"
                                                    value={newListing.availabilityDate}
                                                    onChange={(e) => setNewListing({ ...newListing, availabilityDate: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-6 flex gap-3">
                                            <button type="button" onClick={() => setShowListingModal(false)} className="kk-btn-ghost flex-1">{t('Cancel')}</button>
                                            <button type="submit" className="kk-btn-primary flex-1">{t('Post for Collaboration')}</button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Market Price Modal */}
            <AnimatePresence>
                {showMarketModal && selectedFacility && (
                    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMarketModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-xl">
                                        <TableIcon size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">{selectedFacility.name}</h2>
                                        <p className="text-xs text-white/70">{t('Current Market Rates')}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowMarketModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="max-h-[420px] overflow-y-auto custom-scrollbar border border-gray-100 rounded-2xl">
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4 text-left">{t('Crop')}</th>
                                                <th className="px-6 py-4 text-center">{t('Price')}</th>
                                                <th className="px-6 py-4 text-right">{t('Last Updated')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {selectedFacility.marketPrices?.map((item, i) => (
                                                <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{t(item.crop)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-extrabold text-sm">
                                                            ₹{item.price}/{t(item.unit)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-500">
                                                        {new Date(item.date).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!selectedFacility.marketPrices || selectedFacility.marketPrices.length === 0) && (
                                                <tr>
                                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-400 bg-gray-50/50">
                                                        <TableIcon size={32} className="mx-auto mb-3 opacity-20" />
                                                        <p className="text-sm">{t('No price data available for this facility yet.')}</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6 flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <Info className="text-emerald-600" size={20} />
                                    <p className="text-xs text-emerald-700 leading-relaxed">
                                        {t('These prices are updated by the facility management or scraped from official market sources. Contact the facility directly to confirm current rates before transport.')}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AIKeyModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
            />
        </div>
    );
};

export default SupplyChainDashboard;
