import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import User from '../models/user.model.js';
import AgronomistProfile from '../models/agronomistProfile.model.js';
import Media from '../models/media.model.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

const seedAgronomists = async () => {
    try {
        await connectDB();

        console.log('🧹 Cleaning existing dummy agronomists...');
        // We only remove ones with specific mobile patterns to avoid nuking real data
        await User.deleteMany({ mobileNumber: { $regex: /^99999/ } });

        const profilePhotos = [
            'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=400',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400',
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=400',
            'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=400',
            'https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?q=80&w=400',
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400',
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400',
            'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400',
            'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400',
            'https://images.unsplash.com/photo-1567532939604-b6c5b0ad2e01?q=80&w=400'
        ];

        const agronomists = [
            {
                fullName: 'Dr. Ramesh Patil',
                mobileNumber: '9999900001',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Nashik', taluka: 'Niphad' },
                location: { type: 'Point', coordinates: [74.11, 20.08] },
                bio: 'Expert in grape cultivation and soil health with 15 years of field experience.',
                qualification: 'PhD in Agriculture',
                experience: 15,
                photoIndex: 0
            },
            {
                fullName: 'Sneha Kulkarni',
                mobileNumber: '9999900002',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Kolhapur', taluka: 'Karveer' },
                location: { type: 'Point', coordinates: [74.24, 16.70] },
                bio: 'Specialized in organic farming and sugarcane yield optimization.',
                qualification: 'MSc Agronomy',
                experience: 8,
                photoIndex: 1
            },
            {
                fullName: 'Amit Deshmukh',
                mobileNumber: '9999900003',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Pune', taluka: 'Haveli' },
                location: { type: 'Point', coordinates: [73.85, 18.52] },
                bio: 'Focus on hydroponics and modern greenhouse management.',
                qualification: 'BSc Agriculture',
                experience: 5,
                photoIndex: 2
            },
            {
                fullName: 'Dr. Suresh More',
                mobileNumber: '9999900004',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Vijayapura', taluka: 'Bijapur' },
                location: { type: 'Point', coordinates: [75.71, 16.83] },
                bio: 'Specialist in dryland farming and pomegranate cultivation in northern Karnataka/Southern Maharashtra regions.',
                qualification: 'PhD Horticulture',
                experience: 12,
                photoIndex: 3
            },
            {
                fullName: 'Priya Shinde',
                mobileNumber: '9999900005',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Sangli', taluka: 'Miraj' },
                location: { type: 'Point', coordinates: [74.64, 16.85] },
                bio: 'Expert in turmeric and grape farming with a focus on pest management.',
                qualification: 'MSc Entomology',
                experience: 10,
                photoIndex: 5
            },
            {
                fullName: 'Vikram Pawar',
                mobileNumber: '9999900006',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Satara', taluka: 'Karad' },
                location: { type: 'Point', coordinates: [74.18, 17.28] },
                bio: 'Consultant for onion and potato farming, helping farmers achieve high yields.',
                qualification: 'BSc Agriculture',
                experience: 7,
                photoIndex: 6
            },
            {
                fullName: 'Anjali Thorat',
                mobileNumber: '9999900007',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Nagpur', taluka: 'Katol' },
                location: { type: 'Point', coordinates: [79.08, 21.14] },
                bio: 'Expert in orange orchard management and citrus fruit quality control.',
                qualification: 'MSc Pomology',
                experience: 9,
                photoIndex: 7
            },
            {
                fullName: 'Dr. Rahul Gadgil',
                mobileNumber: '9999900008',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Aurangabad', taluka: 'Paithan' },
                location: { type: 'Point', coordinates: [75.33, 19.88] },
                bio: 'Specialized in cotton and maize crops with focus on sustainable practices.',
                qualification: 'PhD Agronomy',
                experience: 14,
                photoIndex: 8
            },
            {
                fullName: 'Meera Kadam',
                mobileNumber: '9999900009',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Solapur', taluka: 'Pandharpur' },
                location: { type: 'Point', coordinates: [75.91, 17.67] },
                bio: 'Expert in pomegranate and grape farming in semi-arid regions.',
                qualification: 'MSc Plant Pathology',
                experience: 11,
                photoIndex: 9
            },
            {
                fullName: 'Sanjay Bhoir',
                mobileNumber: '9999900010',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Jalgaon', taluka: 'Raver' },
                location: { type: 'Point', coordinates: [75.56, 21.01] },
                bio: 'Banana cultivation specialist with extensive knowledge of fertigation.',
                qualification: 'BSc Agriculture',
                experience: 6,
                photoIndex: 10
            },
            {
                fullName: 'Deepali Vaze',
                mobileNumber: '9999900011',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Pune', taluka: 'Baramati' },
                location: { type: 'Point', coordinates: [74.58, 18.15] },
                bio: 'Specialist in dairy farming integration and fodder crop management.',
                qualification: 'MSc Animal Husbandry',
                experience: 9,
                photoIndex: 11
            },
            {
                fullName: 'Dr. Nitin Ghadge',
                mobileNumber: '9999900012',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Kolhapur', taluka: 'Hatkanangale' },
                location: { type: 'Point', coordinates: [74.43, 16.75] },
                bio: 'Expert in sugarcane and soybean crop rotation for soil fertility.',
                qualification: 'PhD Soil Science',
                experience: 18,
                photoIndex: 12
            },
            {
                fullName: 'Savita Patil',
                mobileNumber: '9999900013',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Nashik', taluka: 'Malegaon' },
                location: { type: 'Point', coordinates: [74.53, 20.55] },
                bio: 'Onion storage specialist and expert in post-harvest technology.',
                qualification: 'MSc Post Harvest Tech',
                experience: 7,
                photoIndex: 13
            },
            {
                fullName: 'Vijay Rathod',
                mobileNumber: '9999900014',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Latur', taluka: 'Nilanga' },
                location: { type: 'Point', coordinates: [76.58, 18.40] },
                bio: 'Oilseed crop expert with focus on soybean and sunflower varieties.',
                qualification: 'BSc Agriculture',
                experience: 5,
                photoIndex: 14
            },
            {
                fullName: 'Manisha Joshi',
                mobileNumber: '9999900015',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Ahmednagar', taluka: 'Rahuri' },
                location: { type: 'Point', coordinates: [74.65, 19.39] },
                bio: 'Floriculture expert with experience in high-tech polyhouse management.',
                qualification: 'MSc Horticulture',
                experience: 12,
                photoIndex: 15
            },
            {
                fullName: 'Rajesh Shinde',
                mobileNumber: '9999900016',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Nashik', taluka: 'Sinnar' },
                location: { type: 'Point', coordinates: [73.99, 19.85] },
                bio: 'Expert in vegetable farming and greenhouse irrigation systems.',
                qualification: 'BSc Agriculture',
                experience: 8,
                photoIndex: 4
            },
            {
                fullName: 'Vidya Deshpande',
                mobileNumber: '9999900017',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Nashik', taluka: 'Chandwad' },
                location: { type: 'Point', coordinates: [74.25, 20.33] },
                bio: 'Soil scientist with focus on reclaiming saline lands for cultivation.',
                qualification: 'MSc Soil Science',
                experience: 11,
                photoIndex: 1
            },
            {
                fullName: 'Manoj Gaikwad',
                mobileNumber: '9999900018',
                passwordHash: 'password123',
                role: 'agronomist',
                address: { district: 'Nashik', taluka: 'Satana' },
                location: { type: 'Point', coordinates: [74.21, 20.59] },
                bio: 'Specialist in pomegranate diseases and integrated pest management.',
                qualification: 'BSc Agriculture',
                experience: 6,
                photoIndex: 9
            }
        ];

        for (const data of agronomists) {
            const photoUrl = profilePhotos[data.photoIndex % profilePhotos.length];
            const media = await Media.create({
                url: photoUrl,
                contentType: 'image/jpeg',
                uploadedBy: new mongoose.Types.ObjectId(),
                size: 1024
            });

            const user = await User.create({
                fullName: data.fullName,
                mobileNumber: data.mobileNumber,
                passwordHash: data.passwordHash,
                role: data.role,
                address: data.address,
                location: data.location,
                profilePhoto: media._id
            });

            await AgronomistProfile.create({
                user: user._id,
                qualification: data.qualification,
                experience: data.experience,
                idProof: media._id,
                status: 'verified',
                availability: 'available',
                bio: data.bio
            });

            media.uploadedBy = user._id;
            await media.save();

            console.log(`✅ Seeded: ${data.fullName}`);
        }

        console.log('✨ All dummy agronomists seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedAgronomists();
