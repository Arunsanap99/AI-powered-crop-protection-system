import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models (assuming they are in the right place)
// We might need to adjust paths
import User from '../src/models/user.model.js';
import AgronomistProfile from '../src/models/agronomistProfile.model.js';
import Media from '../src/models/media.model.js';

dotenv.config();

async function checkData() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        
        const count = await User.countDocuments({ role: 'agronomist' });
        console.log('Total Agronomists:', count);
        
        const users = await User.find({ role: 'agronomist' }).populate('profilePhoto');
        console.log('Duplicate Check:');
        const nameMap = {};
        users.forEach(u => {
            if (!nameMap[u.fullName]) nameMap[u.fullName] = [];
            nameMap[u.fullName].push({ district: u.address?.district, photo: !!u.profilePhoto?.url });
        });
        Object.keys(nameMap).forEach(name => {
            if (nameMap[name].length > 1) {
                console.log(`- ${name}: ${JSON.stringify(nameMap[name])}`);
            }
        });

        const profiles = await AgronomistProfile.find({ status: 'verified' })
            .populate({
                path: 'user',
                populate: { path: 'profilePhoto' }
            });
        
        console.log('\nPopulated Profiles:');
        profiles.forEach(p => {
            console.log(`- ${p.user?.fullName} (${p.user?.address?.district}): ${p.user?.profilePhoto?.url || 'No Photo'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
