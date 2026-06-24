/**
 * AI service — uses Groq API (OpenAI-compatible).
 * GROK_API_KEY in .env must be your Groq API key (gsk_...).
 */
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";


const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi (हिंदी)",
  mr: "Marathi (मराठी)",
  hinglish: "Hinglish (Hindi written in English script with a mix of English words)",
};

// ── CACHE CONFIGURATION ──────────────────────────────────────────────────────
const aiCache = new Map();
export const CACHE_TTL = {
  market: 4 * 60 * 60 * 1000,    // 4 hours
  weather: 1 * 60 * 60 * 1000,   // 1 hour
  seeds: 24 * 60 * 60 * 1000,    // 24 hours
  chat: 0,                       // No cache for chat
  disease: 24 * 60 * 60 * 1000,  // 24 hours
  schemes: 24 * 60 * 60 * 1000,  // 24 hours
};

export const getFromCache = (key) => {
  const item = aiCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    aiCache.delete(key);
    return null;
  }
  return item.data;
};

export const setToCache = (key, data, ttl) => {
  if (!ttl || ttl <= 0) return;
  aiCache.set(key, {
    data,
    expiry: Date.now() + ttl
  });
};

// Periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of aiCache.entries()) {
    if (now > value.expiry) aiCache.delete(key);
  }
}, 30 * 60 * 1000); // Every 30 mins

const createClient = (userApiKey = null) => {
  const apiKey = userApiKey || process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("No Groq API key found. Please configure it in your profile.");
  return new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
};

const createGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};


const stripFences = (text) =>
  text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

/**
 * Robustly parse a JSON string coming from an LLM.
 * Handles:
 *  1. Markdown code fences (```json ... ```)
 *  2. Devanagari / Gujarati / Bengali / etc. digits that break JSON.parse
 *     e.g. १ २ ३ ४ -> 1 2 3 4
 *  3. Fallback: extract the outermost { ... } block if surrounding prose slips in.
 */
const DEVANAGARI_DIGIT_MAP = {
  // Devanagari  \u0966-\u096f
  '\u0966': '0', '\u0967': '1', '\u0968': '2', '\u0969': '3', '\u096a': '4',
  '\u096b': '5', '\u096c': '6', '\u096d': '7', '\u096e': '8', '\u096f': '9',
  // Gujarati     \u0ae6-\u0aef
  '\u0ae6': '0', '\u0ae7': '1', '\u0ae8': '2', '\u0ae9': '3', '\u0aea': '4',
  '\u0aeb': '5', '\u0aec': '6', '\u0aed': '7', '\u0aee': '8', '\u0aef': '9',
  // Bengali      \u09e6-\u09ef
  '\u09e6': '0', '\u09e7': '1', '\u09e8': '2', '\u09e9': '3', '\u09ea': '4',
  '\u09eb': '5', '\u09ec': '6', '\u09ed': '7', '\u09ee': '8', '\u09ef': '9',
  // Arabic-Indic \u0660-\u0669
  '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
  '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9',
};

const normalizeAndParseJSON = (raw) => {
  // 1. Strip markdown fences
  let text = stripFences(raw);

  // 2. Replace regional digits with ASCII equivalents
  text = text.replace(/[\u0966-\u096f\u0ae6-\u0aef\u09e6-\u09ef\u0660-\u0669]/g,
    (ch) => DEVANAGARI_DIGIT_MAP[ch] || ch);

  // 3. Try direct parse
  try {
    return JSON.parse(text);
  } catch (_) {
    // 4. Fallback: extract the outermost { ... } block
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        let snippet = text.slice(start, end + 1);
        // Attempt to fix common JSON errors like trailing commas or commas in numbers
        snippet = snippet.replace(/:\s*"(\d+),(\d+)"/g, ': $1$2'); // "4,500" -> 4500
        return JSON.parse(snippet);
      } catch (innerErr) {
        throw new Error(`Unable to parse JSON from LLM response (fallback failed): ${text.slice(0, 200)}`);
      }
    }
    throw new Error(`Unable to parse JSON from LLM response: ${text.slice(0, 200)}`);
  }
};

/**
 * Helper to call AI with multiple fallbacks:
 * 1. Try Google Gemini (Most reliable/free)
 * 2. Try Groq Primary (Llama 3.3 70B)
 * 3. Try Groq Secondary (Llama 3.1 8B)
 */
const callAIWithFallback = async (groqClient, messages, temperature = 0.3, max_tokens = 2000) => {
  const PRIMARY_GROQ = "llama-3.3-70b-versatile";
  const FALLBACK_GROQ = "llama-3.1-8b-instant";

  // --- 1. Try Gemini First (Highly reliable) ---
  const gemini = createGeminiClient();
  if (gemini) {
    try {
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n");
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (geminiErr) {
      console.warn("[AI Fallback] Gemini failed:", geminiErr.message);
    }
  }

  // --- 2. Try Groq Primary ---
  try {
    const response = await groqClient.chat.completions.create({
      model: PRIMARY_GROQ,
      messages,
      temperature,
      max_tokens,
    });
    return response.choices[0].message.content;
  } catch (err) {
    // If it's a billing error or rate limit, try the secondary Groq model
    console.warn(`[AI Fallback] Groq Primary (${PRIMARY_GROQ}) failed:`, err.message);

    try {
      const response = await groqClient.chat.completions.create({
        model: FALLBACK_GROQ,
        messages,
        temperature,
        max_tokens,
      });
      return response.choices[0].message.content;
    } catch (fallbackErr) {
      console.error("[AI Fallback] All AI models failed including fallbacks:", fallbackErr.message);
      throw fallbackErr;
    }
  }
};


// ─────────────────────────────────────────────────────────────────────────────
//  KRISHI KAVACH PROJECT KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────────────────────
const PROJECT_KNOWLEDGE = `
# Krishi Kavach — Complete Project Knowledge Base

## What is Krishi Kavach?
Krishi Kavach (meaning "Crop Shield" in Hindi) is an advanced agricultural platform built for Indian farmers.
It helps farmers detect crop diseases using AI, get weather forecasts, connect with local agronomists, manage their crops, and receive expert advisories — all in one place.
The app supports three languages: English, Hindi (हिंदी), and Marathi (मराठी).

## User Roles
1. **Farmer** — The primary user. Can detect crop diseases, manage crops, view weather, read advisories, and connect with local agronomists.
2. **Agronomist** — A verified agricultural expert. Can view local farmer profiles, provide advice, and manage their professional profile.
3. **Admin** — Platform administrator. Can manage farmers and agronomists, verify accounts, and oversee the system.

## Key Features & Pages

### 🏠 Home Page (/)
- Welcome page explaining what Krishi Kavach does
- Role selection cards: Farmer, Agronomist, Admin
- Feature highlights: Crop Management, Weather Forecast, Expert Advice
- Get Started / Go to Dashboard buttons

### 🔐 Authentication
- **Login (/login)**: Mobile number + password login. Supports JWT-based secure authentication with refresh tokens.
- **Register (/register)**: Full registration with name, mobile, role, location on map, optional ID proof for agronomists.

### 🌾 Farmer Dashboard (/farmer)
- Overview of all farmer features
- Quick cards linking to: My Crops, Disease Detection, Weather, Advisories
- Shows list of verified agronomists available in the farmer's district
- Location-based personalization — farmer sets their location on a map

### 🔬 Crop Disease Detection & Reports (/farmer/disease-reports)
- The flagship feature. Farmer selects a crop (Banana, Chilli, Radish, Groundnut, Cauliflower) and uploads a photo
- AI (YOLO model running on local Python server) detects diseases with a confidence score
- Supported diseases per crop:
  - Banana: Bract Mosaic Virus, Cordana Leaf Spot, Insect Pest Damage, Moko Disease, Panama Wilt, Pestalotiopsis Leaf Spot, Sigatoka, Yellow Sigatoka, Healthy
  - Cauliflower: Black Rot, Bacterial Spot Rot, Downy Mildew, Healthy
  - Chilli: Anthracnose, Leaf Curl, Leaf Spot, Whitefly Infestation, Yellowing, Healthy
  - Groundnut: Early Leaf Spot, Early Rust, Late Leaf Spot, Nutrition Deficiency, Rust, Healthy
  - Radish: Black Leaf Spot, Downy Mildew, Flea Beetle Damage, Mosaic Virus, Healthy
- After detection, Groq AI (Llama 3.3) provides detailed info: symptoms, causes, why disease occurs, treatment, prevention, natural remedies
- Results are saved as disease reports. Past reports can be viewed and deleted.
- An AI confidence < 50% or exactly 100% means the image was unprocessable

### 🌱 My Crops (/farmer/crops)
- Farmer can add, view, and delete their crops
- Keeps track of what crops they are growing

### 🌤️ Weather Page (/farmer/weather)
- Shows current weather conditions for the farmer's farm location
- 7-day weather forecast with temperature, humidity, wind speed, precipitation
- Auto-refreshes; uses OpenWeatherMap API
- Helps farmer plan irrigation, harvesting, spraying schedules

### 📋 Advisories Page (/farmer/advisories)
- Farm advisories and tips curated for Indian farmers
- Seasonal farming advice, pest alerts, best practices

### 👨‍💼 Agronomist Dashboard (/agronomist)
- Verified agricultural experts can see farmers in their area
- View farmer profiles and crop information
- Manage their professional agronomist profile

### 🛡️ Admin Dashboard (/admin)
- Manage all farmers (/admin/farmers)
- Manage all agronomists (/admin/agronomists), verify or reject their accounts
- Platform oversight

### 👤 Profile Page (/profile or /farmer/profile)
- View and edit: full name, mobile number, profile photo
- Change password
- Update farm location on an interactive map
- Language settings: switch between English, Hindi, Marathi

## Technology Used
- **Frontend**: React.js (Vite), TailwindCSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **AI Disease Detection**: YOLO model (Python FastAPI local server)
- **AI Chat & Info**: Groq API (Llama 3.3 70B model)
- **Weather**: OpenWeatherMap API
- **Image Storage**: Cloudinary
- **Maps**: Leaflet.js / OpenStreetMap
- **Authentication**: JWT (access + refresh tokens)

## How to Use Krishi Kavach
1. Register as Farmer (or other role) with your mobile number and location
2. Login with your mobile number and password
3. Select your language (English / Hindi / Marathi)
4. Go to Disease Reports to scan your crop photo for diseases
5. Check Weather for your farm area
6. Read Advisories for seasonal tips
7. Find local Agronomists in your district on the Farmer Dashboard

## Benefits for Indian Farmers
- Early disease detection saves crops before damage spreads
- Free to use, no expensive lab testing needed
- Works in local languages (Hindi, Marathi)
- Connects farmers directly with certified agricultural experts nearby
- Weather forecasting helps in irrigation and spray planning
- Keeps a history of all disease detections for reference
`;

// ─────────────────────────────────────────────────────────────────────────────
//  1. STRUCTURED DISEASE / CARE INFO
// ─────────────────────────────────────────────────────────────────────────────
export const getCropDiseaseInfo = async (cropName, diseaseName, language = "en", userApiKey = null) => {
  const cacheKey = `disease_${cropName}_${diseaseName}_${language}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const client = createClient(userApiKey);
  const langName = LANGUAGE_NAMES[language] || "English";
  const isHealthy = diseaseName?.toLowerCase().includes("healthy");

  const prompt = isHealthy
    ? `Agricultural expert advisor. ${cropName} plant is HEALTHY. Provide care tips in ${langName}. 
Return JSON ONLY:
{
  "title": "Healthy ${cropName}",
  "summary": "Overview in ${langName}",
  "symptoms": [],
  "causes": [],
  "whyCausesDisease": [],
  "treatment": ["tip 1", "tip 2"],
  "prevention": ["prev 1", "prev 2"],
  "severity": "None",
  "naturalRemedies": ["remedy 1"],
  "yieldImpact": "Note in ${langName}",
  "yieldRecoveryTips": ["tip 1"]
}`
    : `Agri plant pathologist. ${diseaseName} in ${cropName}. Provide diagnosis and treatment in ${langName}.
Return JSON ONLY:
{
  "title": "Disease Name in ${langName}",
  "summary": "Overview in ${langName}",
  "symptoms": ["symp 1", "symp 2"],
  "causes": ["cause 1"],
  "whyCausesDisease": ["reason 1"],
  "treatment": ["treat 1", "treat 2"],
  "prevention": ["prev 1"],
  "severity": "Low/Medium/High",
  "naturalRemedies": ["rem 1"],
  "yieldImpact": "Impact in ${langName}",
  "yieldRecoveryTips": ["tip 1"]
}`;

  const content = await callAIWithFallback(client, [{ role: "user", content: prompt }], 0.3, 1500);
  const result = normalizeAndParseJSON(content);
  setToCache(cacheKey, result, CACHE_TTL.disease);
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
//  2. GLOBAL CHATBOT — page-aware, project-scoped
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Array}  messages      [{role, content}]
 * @param {string} pageContext   Current page description passed from frontend
 * @param {string} language      "en" | "hi" | "mr"
 * @returns {string}
 */
export const chatWithAI = async (messages, pageContext = "", language = "en", userApiKey = null) => {
  try {
    const client = createClient(userApiKey);
    const langName = LANGUAGE_NAMES[language] || "English";

    const systemPrompt = `You are **Krishi Kavach AI Assistant** — a smart, friendly, and helpful chatbot embedded inside the Krishi Kavach agricultural platform built for Indian farmers.

${PROJECT_KNOWLEDGE}

## Current User Context
${pageContext ? `The user is currently on: ${pageContext}` : "The user is navigating the Krishi Kavach platform."}

## Your Behavior Rules (STRICTLY FOLLOW THESE)
1. **Language**: Always respond in ${langName}. Use simple, friendly language that a rural Indian farmer can understand.
2. **Scope**: You ONLY answer questions related to:
   - Krishi Kavach app features and how to use them
   - Crop diseases, treatment, prevention, natural remedies
   - Farming advice, crop care, irrigation, fertilizers, pesticides
   - Weather interpretation for farming
   - Agricultural best practices for Indian conditions
   - The current page the user is on and what they can do there
3. **Off-topic guard**: If someone asks something NOT related to farming, agriculture, or Krishi Kavach (e.g., movies, sports, politics, coding, general knowledge), politely respond in ${langName} that you can only help with farming and Krishi Kavach-related topics, and suggest a relevant farming question they could ask instead.
4. **Be helpful**: Give complete, actionable answers. Use bullet points for readability.
5. **Page awareness**: Use the current page context to give specific, relevant guidance. For example, on the Weather page, explain how to interpret weather for farming decisions.
6. **Safety**: When recommending chemicals/pesticides, always mention safety precautions.
7. **Encourage sustainable farming**: Recommend organic/natural options alongside chemical treatments.
8. **Honest**: If you don't know something specific, say so and suggest consulting a local agronomist.
9. **Warm tone**: Be encouraging and respectful. Farmers work hard — be their supportive advisor.`;

    const content = await callAIWithFallback(client, [
      { role: "system", content: systemPrompt },
      ...messages,
    ], 0.4, 1200);

    return content.trim();
  } catch (error) {
    console.error("[!!] Fatal AI Service Error:", error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  3. CROP MANAGEMENT INFO
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string} cropName   - e.g. "Wheat"
 * @param {number} area       - e.g. 2.5
 * @param {string} areaUnit   - "acres" | "hectares" | "guntha"
 * @param {string} language   - "en" | "hi" | "mr"
 * @returns {object}          - Structured crop management guide
 */
export const getCropManagementInfo = async (cropName, area, areaUnit, language = "en", userApiKey = null) => {
  const client = createClient(userApiKey);
  const langName = LANGUAGE_NAMES[language] || "English";

  const prompt = `You are an expert agricultural advisor for Indian farmers.
A farmer wants complete crop management guidance for growing "${cropName}" on ${area} ${areaUnit} of land.

Provide comprehensive, practical, farmer-friendly information in ${langName}.
Return ONLY a valid JSON object (no markdown, no code fences):
{
  "cropName": "${cropName}",
  "overview": "2-3 sentence summary of this crop and its importance in India in ${langName}",
  "bestSeason": "Best sowing season and months for this crop in India in ${langName}",
  "soilRequirements": {
    "type": "Ideal soil type in ${langName}",
    "ph": "Ideal pH range",
    "preparation": ["Soil preparation step 1 in ${langName}", "step 2", "step 3"]
  },
  "seedsRequired": "Estimated seeds/seedlings required for ${area} ${areaUnit} in ${langName} (with quantities)",
  "sowingMethod": "How to sow/plant this crop in ${langName}",
  "spacing": "Row and plant spacing in ${langName}",
  "irrigation": {
    "frequency": "How often to water in ${langName}",
    "method": "Best irrigation method (drip/flood/sprinkler) in ${langName}",
    "criticalStages": ["Critical watering stage 1 in ${langName}", "stage 2"]
  },
  "fertilizers": [
    {"name": "Fertilizer 1 name", "quantity": "Quantity for ${area} ${areaUnit}", "timing": "When to apply in ${langName}", "purpose": "Purpose in ${langName}"},
    {"name": "Fertilizer 2 name", "quantity": "Quantity for ${area} ${areaUnit}", "timing": "When to apply in ${langName}", "purpose": "Purpose in ${langName}"},
    {"name": "Fertilizer 3 name", "quantity": "Quantity for ${area} ${areaUnit}", "timing": "When to apply in ${langName}", "purpose": "Purpose in ${langName}"}
  ],
  "growthStages": [
    {"stage": "Stage name in ${langName}", "duration": "Duration in days", "care": "Care needed at this stage in ${langName}"},
    {"stage": "Stage 2 name", "duration": "Duration", "care": "Care needed"},
    {"stage": "Stage 3 name", "duration": "Duration", "care": "Care needed"},
    {"stage": "Stage 4 name", "duration": "Duration", "care": "Care needed"}
  ],
  "pestControl": [
    {"pest": "Common pest/disease name in ${langName}", "symptoms": "Symptoms in ${langName}", "remedy": "Treatment in ${langName}"}
  ],
  "harvest": {
    "duration": "Days from sowing to harvest in ${langName}",
    "signs": "Signs the crop is ready to harvest in ${langName}",
    "method": "How to harvest in ${langName}",
    "expectedYield": "Expected yield for ${area} ${areaUnit} in ${langName} (in kg/quintal)"
  },
  "estimatedCost": "Rough estimated total cost for ${area} ${areaUnit} in INR in ${langName}",
  "estimatedProfit": "Rough estimated profit/income for ${area} ${areaUnit} in ${langName}",
  "tips": ["Important success tip 1 in ${langName}", "tip 2", "tip 3", "tip 4"],
  "commonMistakes": ["Mistake to avoid 1 in ${langName}", "mistake 2", "mistake 3"],
  "durationDays": 120
}
All text values must be in ${langName}. Be specific with quantities scaled to ${area} ${areaUnit}. Use actual numbers. Keep language simple and farmer-friendly.
CRITICAL: Use only ASCII digits (0-9) in all JSON numeric values and quantity strings. Never use Devanagari (१२३) or any other regional numeral script inside the JSON.`;


  const content = await callAIWithFallback(client, [{ role: "user", content: prompt }], 0.3, 2000);
  return normalizeAndParseJSON(content);
};

// ─────────────────────────────────────────────────────────────────────────────
//  4. WEATHER CROP IMPACT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string} cropName        - e.g. "Wheat"
 * @param {object} currentWeather  - { temperature, humidity, windSpeed, precipitation, weatherCode }
 * @param {Array}  dailyForecast   - [{ date, maxTemp, minTemp, precipitation, precipitationProbability, weatherCode }]
 * @param {string} language        - "en" | "hi" | "mr"
 * @returns {object}               - Structured impact analysis
 */
export const getWeatherCropImpact = async (cropName, currentWeather, dailyForecast, language = "en", userApiKey = null) => {
  const cacheKey = `weather_${cropName}_${currentWeather.temperature}_${language}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const client = createClient(userApiKey);
  const langName = LANGUAGE_NAMES[language] || "English";

  const weatherSummary = `Current: ${currentWeather.temperature}°C, ${currentWeather.humidity}%, ${currentWeather.precipitation}mm.`;
  const forecastSummary = dailyForecast.slice(0, 7).map(d => `${d.date}: ${d.maxTemp}/${d.minTemp}°C`).join("|");

  const prompt = `Agri-Met expert. Analyze ${cropName} impact for weather: ${weatherSummary}. 
7-Day Forecast Data: ${forecastSummary}. 

Provide a detailed analysis. For the "weeklyAdvisory", you MUST provide exactly 7 items, one for each day of the forecast period.

Return JSON ONLY in ${langName}:
{
  "overallStatus": "Good/Caution/Critical",
  "overallMessage": "Summary in ${langName}",
  "overallScore": 80,
  "impacts": [{ "factor": "Temp/Rain/Wind", "status": "good/caution/critical", "impact": "desc in ${langName}", "recommendation": "act in ${langName}" }],
  "weeklyAdvisory": [
    { "day": "Day Name (e.g. Monday or Today)", "advice": "Specific crop advice for this weather in ${langName}", "alertLevel": "info/warning/danger" }
  ],
  "keyRisks": ["risk 1 in ${langName}", "risk 2"],
  "immediateActions": ["act 1 in ${langName}", "act 2"],
  "bestTimeForActivities": { "spraying": "time/advice", "irrigation": "time/advice", "harvesting": "time/advice" }
}
All text must be in ${langName}. Ensure 7 items in weeklyAdvisory.`;

  const content = await callAIWithFallback(client, [{ role: "user", content: prompt }], 0.3, 2000);
  const result = normalizeAndParseJSON(content);
  setToCache(cacheKey, result, CACHE_TTL.weather);
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
//  5. MARKET PRICES — AI-generated realistic price intelligence
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string} commodity   - e.g. "Soybean"
 * @param {string} district    - User's district from profile
 * @param {string} state       - User's state
 * @returns {object}           - { localMarkets, majorMarkets, priceHistory, summary }
 */
export const getMarketPrices = async (commodity, district = "Nashik", state = "Maharashtra", userApiKey = null, realDataContext = "") => {
  const cacheKey = `market_${commodity}_${district}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const client = createClient(userApiKey);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const prompt = `Indian Agri-Market Analyst. Today: ${todayStr}. 
Task: Provide current mandi prices for ${commodity} in ${district}, ${state}. 

REAL MARKET DATA CONTEXT (Use this as your primary truth):
${realDataContext}

Mandatory:
1. List 3-4 REAL nearby mandis in ${district}/nearby.
2. If real market data is provided above, align your "modalPrice" values with it.
3. If no real data is provided, use your internal knowledge of current ${commodity} price ranges (e.g., Wheat ~2300-2800, Soybean ~4000-5000, etc.). 
4. DO NOT use generic or placeholder prices.
5. Provide a specific, helpful summary about ${commodity} trends.

Return JSON ONLY:
{
  "commodity": "${commodity}",
  "unit": "quintal",
  "summary": "Specific market update for ${commodity} in English",
  "trend": "rising/stable/falling",
  "trendPercent": 0.0,
  "localMarkets": [{ "marketName": "Mandi Name", "district": "District", "distance": "X km", "modalPrice": 0, "minPrice": 0, "maxPrice": 0, "arrivalQty": "Qty", "quality": "A" }],
  "majorMarkets": [{ "marketName": "Hub Name", "modalPrice": 0, "trend": "rising" }],
  "priceHistory": [{ "date": "YYYY-MM-DD", "price": 0 }],
  "seasonalInsight": "Insight",
  "bestTimeToSell": "Advice",
  "mspInfo": "Current MSP"
}
CRITICAL: Use only ASCII digits (0-9) in all JSON numeric values. Never use commas inside numbers. Never use regional numeral scripts.`;

  let content;
  try {
    content = await callAIWithFallback(client, [{ role: "user", content: prompt }], 0.4, 3000);
  } catch (aiErr) {
    console.error("[Market AI] Critical Failure:", aiErr.message);
    // Return a safe mocked structure so the UI doesn't crash 500
    return {
      commodity,
      unit: "quintal",
      summary: "Real-time AI analysis is currently unavailable. Showing historical data or estimates.",
      trend: "stable",
      trendPercent: 0,
      localMarkets: [{ marketName: "Loading...", district, modalPrice: 0 }],
      priceHistory: [],
      isError: true
    };
  }

  const data = normalizeAndParseJSON(content);


  if (Array.isArray(data.priceHistory)) {
    const basePrice = data.localMarkets?.[0]?.modalPrice || 0;
    data.priceHistory = data.priceHistory.slice(0, 30).map((row, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      // Use provided price, or basePrice as fallback
      const price = row.price || row.modalPrice || basePrice || 0;
      return { date: d.toISOString().slice(0, 10), price };
    });
  }

  setToCache(cacheKey, data, CACHE_TTL.market);
  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
//  6. SEED & YIELD ADVICE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} farmInfo - { totalArea, soilType, irrigationType, address, farmingStage, targetYield, primaryCrops }
 * @param {string} language - "en" | "hi" | "mr"
 */
export const getSeedAndYieldAdvice = async (farmInfo, language = "en", userApiKey = null) => {
  const cacheKey = `seeds_${farmInfo.primaryCrops?.join("_")}_${farmInfo.address?.district}_${language}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const client = createClient(userApiKey);
  const langName = LANGUAGE_NAMES[language] || "English";

  const prompt = `Professional Agri-Consultant. Suggest seeds/yield for: ${farmInfo.primaryCrops?.join(", ")}, Soil: ${farmInfo.soilType}, Location: ${farmInfo.address?.district}. 
Return JSON ONLY in ${langName}:
{
  "seedRecommendations": [{ "name": "Var", "features": "Why", "duration": "Days", "yieldPotential": "Qty", "storeType": "Store", "searchQuery": "query" }],
  "yieldAnalysis": { "estimatedYield": "Qty", "benchmarks": "Comp", "optimizationTips": ["tip 1"] },
  "marketContext": "Demand"
}
CRITICAL: Use only ASCII digits (0-9). All text must be in ${langName}.`;

  const content = await callAIWithFallback(client, [{ role: "user", content: prompt }], 0.4, 2000);
  const result = normalizeAndParseJSON(content);
  setToCache(cacheKey, result, CACHE_TTL.seeds);
  return result;
};
// ─────────────────────────────────────────────────────────────────────────────
//  7. GOVERNMENT SCHEMES RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} user - User profile data
 * @param {string} language - "en" | "hi" | "mr"
 */
export const getRecommendedSchemes = async (user, language = "en", userApiKey = null) => {
  const cacheKey = `schemes_${user.address?.district}_${language}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const client = createClient(userApiKey);
  const langName = LANGUAGE_NAMES[language] || "English";

  const prompt = `Indian Govt Scheme Advisor. Recommend 5 schemes for farmer in ${user.address?.district} growing ${user.farmInfo?.primaryCrops?.join(", ")}. 
Return JSON ONLY in ${langName}:
{
  "recommendations": [{ "id": "slug", "title": "Name", "shortDescription": "Desc", "benefits": ["B1"], "eligibility": "Who", "documentsRequired": ["D1"], "applicationSteps": ["S1"], "lastDate": "Date", "websiteUrl": "URL", "officialPortal": "URL", "imageKeywords": "tags", "tags": ["tag"], "relevanceReason": "Why" }],
  "summary": "Encouraging summary"
}
CRITICAL: Use only ASCII digits (0-9). All text must be in ${langName}.`;

  const content = await callAIWithFallback(client, [{ role: "user", content: prompt }], 0.5, 2500);
  const result = normalizeAndParseJSON(content);
  setToCache(cacheKey, result, CACHE_TTL.schemes);
  return result;
};
