import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/user.model.js';
import AgronomistProfile from '../src/models/agronomistProfile.model.js';
import Media from '../src/models/media.model.js';

dotenv.config();

async function cleanAndSeed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Delete all agronomists and their profiles
        const agronomists = await User.find({ role: 'agronomist' });
        const agroIds = agronomists.map(u => u._id);
        
        await AgronomistProfile.deleteMany({ user: { $in: agroIds } });
        await User.deleteMany({ role: 'agronomist' });
        
        // Also delete orphan profiles
        await AgronomistProfile.deleteMany({});
        
        console.log('Cleaned up existing agronomists and profiles.');

        // 2. Now run the seeder script (we'll just import it and run its logic)
        // Actually, easier to just run the command
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cleanAndSeed();
