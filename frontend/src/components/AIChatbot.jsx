import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Sprout,
    Microscope,
    Sun,
    CloudSun,
    Pill,
    Wind,
    Activity,
    User,
    Bug,
    ShieldCheck,
    AlertTriangle,
    IndianRupee,
    Globe,
    RotateCcw,
    Trash2,
    ChevronUp,
    ChevronDown,
    X,
    Send,
    MessageSquare,
    Sparkles,
    MapPin as MapPinIcon,
    Lightbulb,
    LineChart,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Languages,
    Square
} from 'lucide-react';
import { geminiAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useChatbot } from '../context/ChatbotContext';
import AIKeyModal from './AIKeyModal';

// ── Page context map ─────────────────────────────────────────────────────────
const PAGE_CONTEXTS = {
    '/': 'Home page — shows what Krishi Kavach does, role selection (Farmer / Agronomist / Admin), and key features overview.',
    '/login': 'Login page — user can sign in with their mobile number and password.',
    '/register': 'Registration page — new users can create a Farmer, Agronomist, or Admin account.',
    '/farmer': 'Farmer Dashboard — My Crops, Disease Detection & Reports, Weather Forecast, Advisories, and local agronomists in district.',
    '/farmer/crops': 'My Crops page — farmer can add, view, and delete crops they are growing.',
    '/farmer/disease-reports': 'Crop Disease Detection & Reports page — select a crop (Banana, Chilli, Radish, Groundnut, Cauliflower), upload a photo, AI detects diseases. AI then shows symptoms, causes, why the disease occurs, treatment, prevention, and natural remedies.',
    '/farmer/weather': 'Weather Forecast page — current weather and 7-day forecast for the farm. Powered by OpenWeatherMap. Helps plan irrigation, spraying, harvesting.',
    '/farmer/advisories': 'Farming Advisories — curated seasonal tips, pest alerts, and best practices for Indian farmers.',
    '/farmer/profile': 'Farmer Profile — edit name, mobile, photo, change password, update farm location, switch language.',
    '/agronomist': 'Agronomist Dashboard — verified experts see local farmers, crop info, and manage their profile.',
    '/agronomist/profile': 'Agronomist Profile — manage professional details, qualifications, location.',
    '/admin': 'Admin Dashboard — platform overview and management controls.',
    '/admin/farmers': 'Farmers Management — view and manage all registered farmers.',
    '/admin/agronomists': 'Agronomists Management — view, verify, or reject agronomist accounts.',
    '/admin/profile': 'Admin Profile page.',
    '/profile': 'User Profile — edit name, mobile, photo, password, location, and app language.',
    '/unauthorized': 'Unauthorized — user tried to access a page without permission.',
};

const getPageContext = (pathname) => {
    if (PAGE_CONTEXTS[pathname]) return PAGE_CONTEXTS[pathname];
    const prefix = Object.keys(PAGE_CONTEXTS)
        .filter((k) => k !== '/' && pathname.startsWith(k))
        .sort((a, b) => b.length - a.length)[0];
    return PAGE_CONTEXTS[prefix] || 'Krishi Kavach agricultural platform.';
};

// ── Quick questions per language ─────────────────────────────────────────────
const QUICK_QUESTIONS = {
    en: [
        'What can I do on this page?',
        'How does disease detection work?',
        'How to use weather for farming?',
        'How to treat crop diseases?',
        'Any organic remedies?',
        'How to find local agronomists?',
    ],
    hi: [
        'इस पेज पर क्या कर सकते हैं?',
        'रोग पहचान कैसे काम करती है?',
        'मौसम का उपयोग खेती में कैसे करें?',
        'फसल रोगों का उपचार कैसे करें?',
        'कोई जैविक उपचार है?',
        'स्थानीय कृषि विशेषज्ञ कैसे खोजें?',
    ],
    mr: [
        'या पेजवर काय करता येते?',
        'रोग शोध कसा काम करतो?',
        'हवामान शेतीसाठी कसे वापरावे?',
        'पिकांच्या रोगांवर उपचार कसे करावे?',
        'काही सेंद्रिय उपाय आहे का?',
        'स्थानीय तज्ञ कसे शोधावे?',
    ],
};

// ── Disease-specific quick questions ─────────────────────────────────────────
const DISEASE_QUICK_QUESTIONS = {
    en: (cropName, diseaseName) => [
        `Why does ${diseaseName} occur in ${cropName}?`,
        `What is the best treatment for ${diseaseName}?`,
        `How can I prevent ${diseaseName} next season?`,
        `What organic remedies work for ${diseaseName}?`,
        `How fast does ${diseaseName} spread to other plants?`,
        `What is the estimated crop loss from ${diseaseName}?`,
    ],
    hi: (cropName, diseaseName) => [
        `${cropName} में ${diseaseName} क्यों होता है?`,
        `${diseaseName} का सबसे अच्छा उपचार क्या है?`,
        `अगले सीजन में ${diseaseName} को कैसे रोकें?`,
        `${diseaseName} के लिए जैविक उपाय?`,
        `${diseaseName} कितनी तेजी से फैलता है?`,
        `${diseaseName} से फसल को कितना नुकसान?`,
    ],
    mr: (cropName, diseaseName) => [
        `${cropName} मध्ये ${diseaseName} का होतो?`,
        `${diseaseName} वर सर्वोत्तम उपचार काय आहे?`,
        `पुढील हंगामात ${diseaseName} कसे टाळावे?`,
        `${diseaseName} साठी सेंद्रिय उपाय?`,
        `${diseaseName} किती लवकर पसरतो?`,
        `${diseaseName} मुळे किती नुकसान होते?`,
    ],
};

const PLACEHOLDER = {
    en: 'Ask about this page, crops, diseases, weather...',
    hi: 'इस पेज, फसल, रोग, मौसम के बारे में पूछें...',
    mr: 'या पेज, पीक, रोग, हवामान याबद्दल विचारा...',
};

// ── ChatMessage ───────────────────────────────────────────────────────────────
const ChatMessage = ({ msg, isLatest, onSpeak, isSpeaking }) => {
    const isUser = msg.role === 'user';
    return (
        <div
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            style={isLatest ? { animation: 'kkMsgIn 0.3s ease both' } : {}}
        >
            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md
        ${isUser ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-violet-600 to-indigo-700'}`}>
                {isUser ? <User size={18} /> : <Sprout size={18} />}
            </div>
            <div className={`relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
        ${isUser
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-sm'
                    : 'bg-white border border-violet-100 text-gray-800 rounded-tl-sm'}`}>

                {msg.role === 'assistant' && (
                    <button
                        onClick={() => onSpeak(msg.content, msg.id)}
                        className={`absolute -right-8 top-1 p-1.5 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-red-50 text-red-500 scale-110' : 'text-gray-400 hover:text-violet-500'}`}
                        title={isSpeaking ? "Stop reading" : "Read aloud"}
                    >
                        {isSpeaking ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                    </button>
                )}

                {msg.role === 'assistant' ? (
                    <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                            __html: msg.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/^#{1,3}\s(.+)$/gm, '<p class="font-bold text-gray-900 mt-2 mb-1">$1</p>')
                                .replace(/^[-•]\s(.+)$/gm, '<li class="ml-3 list-disc text-gray-700">$1</li>')
                                .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="space-y-1 my-1.5">${m}</ul>`)
                                .replace(/\n/g, '<br/>'),
                        }}
                    />
                ) : (
                    <span>{msg.content}</span>
                )}
                <p className={`text-[10px] mt-1 ${isUser ? 'text-green-100' : 'text-gray-400'}`}>
                    {msg.time}
                </p>
            </div>
        </div>
    );
};

const TypingIndicator = () => (
    <div className="flex gap-3" style={{ animation: 'kkMsgIn 0.25s ease both' }}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Sprout size={18} />
        </div>
        <div className="bg-white border border-violet-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map((d) => (
                    <span key={d} className="w-2 h-2 bg-violet-400 rounded-full"
                        style={{ animation: `kkDot 1.2s ${d}ms infinite ease-in-out` }} />
                ))}
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AIChatbot = () => {
    const location = useLocation();
    const { lang } = useLanguage();
    const { isAuthenticated } = useAuth();
    const { diseaseContext, isOpen, setIsOpen, triggerRef } = useChatbot();

    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [preferredVoice, setPreferredVoice] = useState(localStorage.getItem('krishi_pref_voice') || '');
    const [showSettings, setShowSettings] = useState(false);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [showQuickQ, setShowQuickQ] = useState(true);
    const [chatLang, setChatLang] = useState(lang === 'hi' || lang === 'mr' ? lang : 'en');
    const [isSTTActive, setIsSTTActive] = useState(false);
    const [speakingId, setSpeakingId] = useState(null);
    const [showKeyModal, setShowKeyModal] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const textareaRef = useRef(null);
    const recognitionRef = useRef(null);
    const prevPathRef = useRef(location.pathname);

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) setAvailableVoices(voices);
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // Sync chat language with global application language initially
    const hasInitialSync = useRef(false);
    useEffect(() => {
        if (!hasInitialSync.current && lang) {
            if (lang === 'mr' || lang === 'hi') {
                setChatLang(lang);
            } else {
                setChatLang('en');
            }
            hasInitialSync.current = true;
        }
    }, [lang]);

    const saveVoicePreference = (voiceName) => {
        setPreferredVoice(voiceName);
        localStorage.setItem('krishi_pref_voice', voiceName);
        setShowSettings(false);
    };

    const pageContext = getPageContext(location.pathname);
    const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Parse disease context into crop/disease if available
    const parsedDisease = (() => {
        if (!diseaseContext) return { cropName: '', diseaseName: '' };
        const cropMatch = diseaseContext.match(/Crop:\s*([^,]+)/i);
        const diseaseMatch = diseaseContext.match(/(?:disease:|Detected:|Detected disease:)\s*([^,|]+)/i);
        return {
            cropName: cropMatch?.[1]?.trim() || '',
            diseaseName: diseaseMatch?.[1]?.trim() || '',
        };
    })();

    const fullContext = [
        pageContext,
        diseaseContext ? `Latest disease detection result: ${diseaseContext}` : '',
        `User authentication status: ${isAuthenticated ? 'Logged in' : 'Not logged in'}`,
    ].filter(Boolean).join(' | ');

    // ── Build welcome message ──────────────────────────────────────────────────
    const buildWelcome = useCallback(() => {
        const pageLabel = location.pathname === '/'
            ? 'Home'
            : location.pathname.split('/').filter(Boolean)
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' → ');

        const diseaseSnippet = diseaseContext
            ? `\n\n I can see you scanned **${parsedDisease.cropName}** — detected: **${parsedDisease.diseaseName}**. Ask me anything about it!`
            : '';

        const noDiseaseHint = !diseaseContext && location.pathname === '/farmer/disease-reports'
            ? `\n\n💡 No crop scanned yet. Select a crop, upload a photo, and click **Detect Disease** to get started!`
            : '';

        const welcomes = {
            en: `👋 Hello! I'm **Krishi Kavach AI**.
You're on the **${pageLabel}** page.${diseaseSnippet}${noDiseaseHint}

Ask me anything about this page, crop diseases, farming advice, or any Krishi Kavach feature!`,
            hi: `👋 नमस्ते! मैं **Krishi Kavach AI** हूं।
आप **${pageLabel}** पेज पर हैं।${diseaseSnippet ? diseaseSnippet.replace('I can see', 'मैं देख सकता हूं').replace('detected:', 'पाया गया:').replace('Ask me', 'पूछें') : ''}

इस पेज, फसल रोग, खेती या Krishi Kavach की किसी भी सुविधा के बारे में पूछें!`,
            mr: `👋 नमस्कार! मी **Krishi Kavach AI** आहे।
तुम्ही **${pageLabel}** पेजवर आहात।${diseaseSnippet ? diseaseSnippet.replace('I can see', 'मला दिसत आहे').replace('detected:', 'आढळले:').replace('Ask me', 'विचारा') : ''}

या पेज, पिकाचे रोग, शेती किंवा Krishi Kavach बद्दल काहीही विचारा!`,
            hinglish: `👋 Hello! Main **Krishi Kavach AI** hoon.
Aap **${pageLabel}** page par hain.${diseaseSnippet ? diseaseSnippet.replace('I can see', 'Mujhe dikh raha hai').replace('detected:', 'mila hai:').replace('Ask me', 'Puchiye') : ''}

Is page, fasal ki bimari, kheti ya Krishi Kavach ke features ke baare mein kuch bhi puchiye!`,
        };
        return { role: 'assistant', content: welcomes[chatLang] || welcomes.en, time: getTime(), id: Date.now() };
    }, [location.pathname, chatLang, diseaseContext, parsedDisease.cropName, parsedDisease.diseaseName]);

    // ── Send a message ─────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (text) => {
        const userText = (text ?? input).trim();
        if (!userText || isLoading) return;

        // Check for User's API Key
        const userStored = JSON.parse(localStorage.getItem('user'));
        if (!userStored?.groqApiKey) {
            setShowKeyModal(true);
            return;
        }

        setInput('');
        setShowQuickQ(false);
        if (textareaRef.current) textareaRef.current.style.height = '42px';

        const userMsg = { role: 'user', content: userText, time: getTime(), id: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

        try {
            const res = await geminiAPI.chat(history, fullContext, chatLang);
            const aiMsg = { role: 'assistant', content: res.data.reply, time: getTime(), id: Date.now() + 1 };
            setMessages((prev) => [...prev, aiMsg]);

            // Auto-read AI response
            if (isOpen) {
                setTimeout(() => speakMessage(aiMsg.content, aiMsg.id), 300);
            }

            if (!isOpen) setUnreadCount((c) => c + 1);
        } catch {
            const errMap = {
                en: "Sorry, I couldn't respond right now. Please try again.",
                hi: "क्षमा करें, अभी जवाब नहीं दे पाया। फिर कोशिश करें।",
                mr: "माफ करा, आत्ता उत्तर देता आले नाही. पुन्हा प्रयत्न करा.",
                hinglish: "Sorry, abhi reply nahi de paya. Please firse try karein.",
            };
            const errContent = errMap[chatLang] || errMap.en;
            const errId = Date.now() + 1;
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: errContent, time: getTime(), id: errId },
            ]);
            if (isOpen) {
                setTimeout(() => speakMessage(errContent, errId), 300);
            }
        } finally {
            setIsLoading(false);
        }
    }, [input, messages, isLoading, fullContext, chatLang, isOpen]);

    // ── Voice Input (STT) ──────────────────────────────────────────────────────
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isSTTActive) {
            recognitionRef.current?.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        // Enhanced Marathi support: set lang and also add hints if possible
        const targetLang = chatLang === 'mr' ? 'mr-IN' : (chatLang === 'hi' || chatLang === 'hinglish') ? 'hi-IN' : 'en-IN';

        try {
            recognition.lang = targetLang;
        } catch (e) {
            console.warn("STT: Fallback to short lang code", chatLang);
            recognition.lang = chatLang;
        }

        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => setIsSTTActive(true);
        recognition.onend = () => setIsSTTActive(false);
        recognition.onerror = () => setIsSTTActive(false);

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Show real-time feedback: Current Final + new Interim
            if (finalTranscript || interimTranscript) {
                setInput(prev => {
                    // Logic: Keep existing text that wasn't part of this STT session, 
                    // then append the new final results and current interim results.
                    // For simplicity in a 'continuous' session, we just manage the delta.
                    const currentWords = finalTranscript + interimTranscript;
                    return currentWords.trim();
                });
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // ── Voice Output (TTS) ─────────────────────────────────────────────────────
    const speakMessage = (text, id) => {
        if (!window.speechSynthesis) return;

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            if (speakingId === id) {
                setSpeakingId(null);
                return;
            }
        }

        // Clean text: remove HTML, markdown symbols (# * _ ~ `), and link URLs
        const cleanText = text
            .replace(/<[^>]*>?/gm, '') // HTML
            .replace(/[#*`_~]/g, '')    // Markdown symbols: remove ** and *
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Markdown links -> pure text
            .replace(/\n\n/g, '. ')      // Double newline to longer pause
            .replace(/\n/g, '. ')       // Newline to pause
            .trim();

        const isMarathi = chatLang === 'mr';
        const isHindi = chatLang === 'hi' || chatLang === 'hinglish';
        const targetLangMatch = isMarathi ? 'mr-IN' : isHindi ? 'hi-IN' : 'en-IN';

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Find best voice match:
        let voice = null;
        if (preferredVoice) {
            voice = availableVoices.find(v => v.name === preferredVoice);
        }

        if (!voice) {
            const priorityKeywords = isMarathi ? ['google', 'marathi'] : isHindi ? ['google', 'hindi'] : ['google', 'english', 'india'];

            voice = availableVoices.find(v => priorityKeywords.every(kw => v.name.toLowerCase().includes(kw))) ||
                availableVoices.find(v => v.lang.replace('_', '-').startsWith(isMarathi ? 'mr' : isHindi ? 'hi' : 'en') && v.name.toLowerCase().includes('google')) ||
                availableVoices.find(v => v.lang.replace('_', '-').startsWith(isMarathi ? 'mr' : isHindi ? 'hi' : 'en')) ||
                availableVoices.find(v => v.name.toLowerCase().includes(isMarathi ? 'marathi' : isHindi ? 'hindi' : 'english')) ||
                availableVoices[0];
        }

        if (voice) {
            utterance.voice = voice;
            utterance.lang = targetLangMatch;
        } else {
            utterance.lang = targetLangMatch;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setSpeakingId(id);
        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            setSpeakingId(null);
        };

        window.speechSynthesis.speak(utterance);
    };

    // ── Open chat: show welcome, then handle trigger message ──────────────────
    useEffect(() => {
        if (isOpen) {
            setIsMinimized(false);
            setUnreadCount(0);

            if (messages.length === 0) {
                const welcome = buildWelcome();
                setMessages([welcome]);
                setShowQuickQ(true);

                // Auto-read welcome
                setTimeout(() => speakMessage(welcome.content, welcome.id), 500);

                // If a trigger message was queued, auto-send it after welcome renders
                if (triggerRef.current) {
                    const trigger = triggerRef.current;
                    triggerRef.current = null;
                    setTimeout(() => sendMessage(trigger), 400);
                }
            } else if (triggerRef.current) {
                // Chat already has messages — just send the trigger
                const trigger = triggerRef.current;
                triggerRef.current = null;
                setTimeout(() => sendMessage(trigger), 100);
            }
        }
    }, [isOpen]);

    // ── Disease context change → inject update message if already open ─────────
    const prevDiseaseRef = useRef(diseaseContext);
    useEffect(() => {
        if (prevDiseaseRef.current !== diseaseContext && diseaseContext && isOpen && messages.length > 0) {
            prevDiseaseRef.current = diseaseContext;
            const updateMsgs = {
                en: `Disease scan updated! I now have the latest result: **${diseaseContext}**. Ask me anything about this detection!`,
                hi: `नई जानकारी मिली! **${diseaseContext}** — इस बारे में कुछ भी पूछें!`,
                mr: `नवीन माहिती मिळाली! **${diseaseContext}** — याबद्दल काहीही विचारा!`,
                hinglish: `Nayi jankari mili! **${diseaseContext}** — is baare mein kuch bhi puchiye!`,
            };
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: updateMsgs[chatLang] || updateMsgs.en, time: getTime(), id: Date.now() },
            ]);
        }
        prevDiseaseRef.current = diseaseContext;
    }, [diseaseContext]);

    // ── Page change notification ───────────────────────────────────────────────
    useEffect(() => {
        if (prevPathRef.current !== location.pathname) {
            prevPathRef.current = location.pathname;
            if (isOpen && messages.length > 0) {
                const pageUpdates = {
                    en: `Navigated to **${location.pathname}**. I'm now aware of this page. Ask me what you can do here!`,
                    hi: `आप **${location.pathname}** पेज पर आए। यहां क्या कर सकते हैं पूछें!`,
                    mr: `तुम्ही **${location.pathname}** पेजवर आलात. येथे काय करता येते ते विचारा!`,
                    hinglish: `Aap **${location.pathname}** page par aaye. Yahan kya kar sakte hain puchiye!`,
                };
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: pageUpdates[chatLang] || pageUpdates.en, time: getTime(), id: Date.now() },
                ]);
            }
        }
    }, [location.pathname]);

    // ── Auto scroll ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && !isMinimized) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [messages, isOpen, isMinimized, isLoading]);

    // ── Focus input ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen, isMinimized]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const handleOpen = () => { setIsOpen(true); setUnreadCount(0); };

    const clearChat = () => {
        setMessages([buildWelcome()]);
        setShowQuickQ(true);
    };

    // Disease-specific chips when disease context is available
    const hasDisease = !!(parsedDisease.cropName && parsedDisease.diseaseName);
    const quickQs = hasDisease
        ? (DISEASE_QUICK_QUESTIONS[chatLang] || DISEASE_QUICK_QUESTIONS.en)(parsedDisease.cropName, parsedDisease.diseaseName)
        : (QUICK_QUESTIONS[chatLang] || QUICK_QUESTIONS.en);

    const placeholder = PLACEHOLDER[chatLang] || PLACEHOLDER.en;
    const hideOn = ['/login', '/register'];
    if (hideOn.includes(location.pathname)) return null;

    return (
        <>
            <style>{`
        @keyframes kkMsgIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes kkDot {
          0%,80%,100% { transform:scale(0.6); opacity:0.4; }
          40%          { transform:scale(1);   opacity:1; }
        }
        @keyframes kkFabPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(124,58,237,0.45); }
          50%      { box-shadow:0 0 0 14px rgba(124,58,237,0); }
        }
        @keyframes kkWindowIn {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .kk-fab    { animation: kkFabPulse 2.4s ease-in-out infinite; }
        .kk-window { animation: kkWindowIn 0.28s ease both; }
        .kk-scrollbar::-webkit-scrollbar { width:4px; }
        .kk-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .kk-scrollbar::-webkit-scrollbar-thumb { background:#ddd6fe; border-radius:9999px; }
      `}</style>

            {/* ── FAB ──────────────────────────────────────────────────────────── */}
            {!isOpen && (
                <button
                    id="kk-chatbot-fab"
                    onClick={handleOpen}
                    title="Krishi Kavach AI Assistant"
                    className="kk-fab fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full
            bg-gradient-to-br from-violet-600 to-indigo-700 text-white
            flex items-center justify-center shadow-2xl
            hover:scale-110 active:scale-95 transition-transform duration-200"
                >
                    <Sprout size={28} />
                    {/* Disease indicator dot */}
                    {hasDisease && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full
              border-2 border-white shadow" title="Disease context loaded" />
                    )}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white
              text-xs font-bold rounded-full flex items-center justify-center px-1 shadow border-2 border-white">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* ── Chat Window ─────────────────────────────────────────────────── */}
            {isOpen && (
                <div
                    className="kk-window fixed bottom-6 right-6 z-50 flex flex-col rounded-3xl shadow-2xl
            overflow-hidden border border-violet-200 w-[390px] max-w-[calc(100vw-2rem)]"
                    style={{
                        height: isMinimized ? 'auto' : '590px',
                        maxHeight: 'calc(100vh - 5rem)',
                        background: 'linear-gradient(160deg,#faf5ff 0%,#eef2ff 100%)',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex-shrink-0 bg-gradient-to-r from-violet-700 to-indigo-700 px-4 py-3
              flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setIsMinimized((m) => !m)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm leading-tight">Krishi Kavach AI</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                                    <p className="text-violet-200 text-xs">Online · Ready to help</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => {
                                    const langs = ['en', 'hi', 'mr'];
                                    const nextIdx = (langs.indexOf(chatLang) + 1) % langs.length;
                                    setChatLang(langs[nextIdx]);
                                }}
                                className="relative text-violet-200 hover:text-white hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                title={`Switch Language (Current: ${chatLang.toUpperCase()})`}
                            >
                                <Languages size={16} />
                                <span className="absolute -top-1 -right-1 text-[8px] bg-amber-400 text-amber-950 font-bold px-1 rounded-sm uppercase border border-violet-700">
                                    {chatLang}
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    if (speakingId) {
                                        window.speechSynthesis.cancel();
                                        setSpeakingId(null);
                                    } else {
                                        setShowSettings(!showSettings);
                                    }
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${speakingId ? 'bg-white text-red-600 animate-pulse' : 'text-violet-200 hover:text-white hover:bg-white/20'}`}
                                title={speakingId ? "Stop speaking" : "Voice settings"}
                            >
                                {speakingId ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <button onClick={clearChat}
                                className="text-violet-200 hover:text-white hover:bg-white/20 w-8 h-8 rounded-full
                  flex items-center justify-center transition-colors text-sm" title="Clear chat">
                                <Trash2 size={16} />
                            </button>
                            <button onClick={() => setIsMinimized((m) => !m)}
                                className="text-violet-200 hover:text-white hover:bg-white/20 w-8 h-8 rounded-full
                  flex items-center justify-center transition-colors font-bold">
                                {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button onClick={() => setIsOpen(false)}
                                className="text-violet-200 hover:text-white hover:bg-red-500/80 w-8 h-8 rounded-full
                  flex items-center justify-center transition-colors text-lg font-bold">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Context pills */}
                            <div className="flex-shrink-0 mx-3 mt-2 flex flex-wrap gap-1.5 relative">
                                {showSettings && (
                                    <div className="absolute top-0 right-0 z-[60] w-64 bg-white rounded-2xl shadow-xl border border-violet-200 p-3 fade-up">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">Select AI Voice</p>
                                            <button onClick={() => setShowSettings(false)}><X size={14} className="text-gray-400" /></button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                            <button
                                                onClick={() => saveVoicePreference('')}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${!preferredVoice ? 'bg-violet-600 text-white' : 'hover:bg-violet-50 text-gray-700'}`}
                                            >
                                                Auto (Smart Selection)
                                            </button>
                                            {availableVoices
                                                .filter(v => {
                                                    const isMR = chatLang === 'mr';
                                                    const isHI = chatLang === 'hi' || chatLang === 'hinglish';
                                                    if (isMR) return v.lang.startsWith('mr');
                                                    if (isHI) return v.lang.startsWith('hi');
                                                    return v.lang.startsWith('en');
                                                })
                                                .sort((a, b) => {
                                                    // Prioritize Google voices for better quality
                                                    const aG = a.name.includes('Google');
                                                    const bG = b.name.includes('Google');
                                                    if (aG && !bG) return -1;
                                                    if (!aG && bG) return 1;
                                                    return 0;
                                                })
                                                .map(v => (
                                                    <button
                                                        key={v.name}
                                                        onClick={() => saveVoicePreference(v.name)}
                                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${preferredVoice === v.name ? 'bg-violet-600 text-white' : 'hover:bg-violet-50 text-gray-700'}`}
                                                    >
                                                        <div className="font-medium truncate">{v.name}</div>
                                                        <div className={`text-[10px] ${preferredVoice === v.name ? 'text-violet-200' : 'text-gray-400'}`}>{v.lang}</div>
                                                    </button>
                                                ))}
                                            {availableVoices.filter(v => {
                                                const isMR = chatLang === 'mr';
                                                const isHI = chatLang === 'hi' || chatLang === 'hinglish';
                                                if (isMR) return v.lang.startsWith('mr');
                                                if (isHI) return v.lang.startsWith('hi');
                                                return v.lang.startsWith('en');
                                            }).length === 0 && (
                                                    <p className="text-[10px] text-gray-400 text-center py-4 italic">No high-quality {chatLang} voices found on this device.</p>
                                                )}
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <p className="text-[10px] text-gray-400 text-center">
                                                Active Language: <span className="font-bold text-violet-600 uppercase">{chatLang}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-violet-50 border border-violet-200 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                                    <MapPinIcon size={12} className="text-violet-500" />
                                    <p className="text-xs text-violet-700 font-medium truncate max-w-[140px]">
                                        {location.pathname === '/' ? 'Home' : location.pathname}
                                    </p>
                                </div>
                                {hasDisease && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                                        <Microscope size={12} className="text-amber-600" />
                                        <p className="text-xs text-amber-800 font-medium truncate max-w-[150px]">
                                            {parsedDisease.cropName} · {parsedDisease.diseaseName}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto kk-scrollbar px-3 py-3 space-y-4">
                                {messages.map((msg, i) => (
                                    <ChatMessage
                                        key={msg.id}
                                        msg={msg}
                                        isLatest={i === messages.length - 1}
                                        onSpeak={speakMessage}
                                        isSpeaking={speakingId === msg.id}
                                    />
                                ))}
                                {isLoading && < TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick questions */}
                            {showQuickQ && !isLoading && messages.length <= 1 && (
                                <div className="flex-shrink-0 px-3 pb-2">
                                    <p className="text-[11px] text-gray-400 font-semibold mb-1.5 px-1 uppercase tracking-wide">
                                        {hasDisease ? <><Microscope size={12} /> Ask about the detected disease</> : <><Lightbulb size={12} /> Quick questions</>}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {quickQs.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(q)}
                                                className="text-[11px] bg-white border border-violet-200 text-violet-700
                          px-2.5 py-1.5 rounded-full hover:bg-violet-50 hover:border-violet-400
                          transition-all font-medium shadow-sm hover:shadow active:scale-95"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input area */}
                            <div className="flex-shrink-0 border-t border-violet-100 bg-white px-3 py-2.5 flex flex-col gap-2">
                                {/* Language and Voice controls */}
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-1.5 p-1 bg-violet-50 rounded-lg">
                                        {[
                                            { id: 'en', label: 'English' },
                                            { id: 'mr', label: 'मराठी' },
                                            { id: 'hi', label: 'हिंदी' },
                                            { id: 'hinglish', label: 'Hinglish' }
                                        ].map((l) => (
                                            <button
                                                key={l.id}
                                                type="button"
                                                onClick={() => setChatLang(l.id)}
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all
                                                    ${chatLang === l.id
                                                        ? 'bg-violet-600 text-white shadow-sm'
                                                        : 'text-violet-600 hover:bg-violet-100'}`}
                                            >
                                                {l.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={startListening}
                                            className={`p-1.5 rounded-full transition-all ${isSTTActive ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-violet-100 hover:text-violet-600'}`}
                                            title={isSTTActive ? "Stop listening" : "Start voice input"}
                                        >
                                            {isSTTActive ? <MicOff size={16} /> : <Mic size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-end gap-2">
                                    <textarea
                                        ref={(el) => { inputRef.current = el; textareaRef.current = el; }}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={placeholder}
                                        rows={1}
                                        className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-2xl
                                        px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
                                        focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                                        transition-all overflow-y-auto"
                                        style={{ minHeight: '42px', maxHeight: '112px' }}
                                        onInput={(e) => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        id="kk-chatbot-send"
                                        onClick={() => sendMessage()}
                                        disabled={!input.trim() || isLoading}
                                        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                                        shadow-lg transition-all duration-200
                                        ${!input.trim() || isLoading
                                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                                : 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white hover:scale-105 active:scale-95'}`}
                                    >
                                        {isLoading ? (
                                            <RotateCcw className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            <AIKeyModal
                isOpen={showKeyModal}
                onClose={() => setShowKeyModal(false)}
            />
        </>
    );
};

export default AIChatbot;
