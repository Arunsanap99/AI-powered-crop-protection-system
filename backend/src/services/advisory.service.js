import OpenAI from "openai";
import { getWeatherData } from "./weather.service.js";
import Crop from "../models/crop.model.js";
import { getFromCache, setToCache, CACHE_TTL } from "./gemini.service.js";
import dotenv from "dotenv";

dotenv.config();

const createClient = () => {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("No Groq API key found in .env");
  return new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
};

/**
 * Generates AI-powered weather advisories for a user's crops.
 */
export const generateAdvisories = async (user) => {
  const cacheKey = `advisories_${user._id}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const [lon, lat] = user.location.coordinates;
    const userCrops = await Crop.find({ farmer: user._id });

    if (userCrops.length === 0) return [];

    const weatherData = await getWeatherData(lat, lon);
    const cropNames = userCrops.map((c) => c.cropName);
    const weatherForecastString = JSON.stringify(weatherData.daily, null, 2);

    const prompt = `Agri-expert. Analyze 7-day forecast for farmer in Maharashtra. 
Crops: ${cropNames.join(", ")}. 
Forecast: ${weatherForecastString}
Return JSON array of threats/recommendations: [{ "cropName": "name", "threatLevel": "Low/Med/High", "threat": "desc", "recommendation": "act", "impactDay": "YYYY-MM-DD" }]`;

    const client = createClient();
    let response;
    try {
      response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
    } catch (err) {
      if (err.status === 429) {
        console.warn("[Advisory] Rate limit hit on primary model. Falling back to 8b-instant...");
        response = await client.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });
      } else {
        throw err;
      }
    }

    const content = response.choices[0].message.content;
    const data = JSON.parse(content);
    const advisories = Array.isArray(data) ? data : Object.values(data)[0];
    
    setToCache(cacheKey, advisories, CACHE_TTL.weather); // Use weather TTL (1h)
    return advisories;
  } catch (error) {
    console.error("Error generating Groq advisory:", error.message);
    return [
      {
        cropName: "System Alert",
        threatLevel: "Medium",
        threat: "Could not generate AI advisory at this time.",
        recommendation: "Please try again later.",
        impactDay: new Date().toISOString().split("T")[0],
      },
    ];
  }
};
