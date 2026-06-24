const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Agronomist = require('./src/models/Agronomist');
const Media = require('./src/models/Media');

async function checkAgro() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const agros = await Agronomist.find().populate('profilePhoto');
        console.log(`Found ${agros.length} agronomists`);

        agros.forEach(a => {
            console.log(`- Name: ${a.name}`);
            console.log(`  Location: ${a.address?.district}, ${a.address?.state}`);
            console.log(`  Photo Ref: ${a.profilePhoto?._id}`);
            console.log(`  Photo URL: ${a.profilePhoto?.url || 'MISSING'}`);
            console.log('---');
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

checkAgro();
