import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/user.model.js';
import Media from '../src/models/media.model.js';

dotenv.config();

const profilePhotos = [
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=400", // Male 1
    "https://images.unsplash.com/photo-1649123245135-516cea4a4a1d?q=80&w=400", // Female 1
    "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=400", // Male 2
    "https://images.unsplash.com/photo-1621333133544-42b88f36219b?q=80&w=400", // Female 2
    "https://images.unsplash.com/photo-1607990281513-2c110a25bb8c?q=80&w=400", // Male 3
    "https://images.unsplash.com/photo-1614289365313-0972691b0e35?q=80&w=400", // Female 3
    "https://images.unsplash.com/photo-1619380061814-58f03707f082?q=80&w=400", // Male 4
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400", // Female 4
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=400", // Male 5
    "https://images.unsplash.com/photo-1624561172888-ac93c696e10c?q=80&w=400", // Female 5
    "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?q=80&w=400", // Male 6
    "https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?q=80&w=400"  // Female 6
];

async function fixAllPhotos() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const usersWithNoField = await User.find({ role: 'agronomist', profilePhoto: { $exists: false } });
        const usersWithNull = await User.find({ role: 'agronomist', profilePhoto: null });
        
        const allUsers = [...usersWithNoField, ...usersWithNull];
        const uniqueUsers = [];
        const seenIds = new Set();

        for (const u of allUsers) {
            if (!seenIds.has(u._id.toString())) {
                seenIds.add(u._id.toString());
                uniqueUsers.push(u);
            }
        }

        console.log(`Total unique agronomists to fix: ${uniqueUsers.length}`);

        for (let i = 0; i < uniqueUsers.length; i++) {
            const user = uniqueUsers[i];
            const photoUrl = profilePhotos[i % profilePhotos.length];

            const media = await Media.create({
                url: photoUrl,
                contentType: 'image/jpeg',
                uploadedBy: user._id,
                size: 1024 * 1024
            });

            user.profilePhoto = media._id;
            await user.save();
            console.log(`Fixed photo for: ${user.fullName}`);
        }

        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixAllPhotos();
