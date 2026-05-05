
import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config(); // Load environment variables from .env

const connectDB = async () => {
  try {
    // Force set DNS servers to Google's to resolve Atlas SRV records correctly
    // This fixed the ECONNREFUSED querySrv error on certain networks
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
      console.log("🌐 DNS servers set to Google (8.8.8.8) for database resolution");
    } catch (dnsErr) {
      console.warn("⚠️ Could not set custom DNS servers, using system defaults:", dnsErr.message);
    }

    let conn;
    try {
      console.log("⏳ Attempting to connect to MongoDB Atlas...");
      conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s if Atlas is down
      });
    } catch (atlasErr) {
      console.warn("⚠️ Atlas Connection Failed. Falling back to Localhost...");
      const localUri = "mongodb://localhost:27017/krushikavach";
      conn = await mongoose.connect(localUri);
    }

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ All MongoDB Connection Attempts Failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
