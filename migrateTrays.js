const mongoose = require('mongoose');
require('dotenv').config(); // If using dotenv

// Your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name';

// Import your models
const EggProduction = require('./models/EggProduction'); // Adjust path as needed

const migrateTraysDecimal = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        const records = await EggProduction.find({});
        console.log(`Found ${records.length} records to migrate...`);
        
        let updatedCount = 0;
        
        for (let record of records) {
            const eggsPerTray = record.eggsPerTray || 30;
            const fullTrays = Math.floor(record.totalEggs / eggsPerTray);
            const remainingEggs = record.totalEggs % eggsPerTray;
            const traysDecimal = fullTrays + (remainingEggs / 100);
            
            await EggProduction.updateOne(
                { _id: record._id },
                { $set: { traysDecimal: traysDecimal } }
            );
            
            updatedCount++;
            if (updatedCount % 10 === 0) {
                console.log(`Progress: ${updatedCount}/${records.length} records updated`);
            }
        }
        
        console.log(`Migration completed! Updated ${updatedCount} records`);
        
        // Verify the migration
        const sampleRecord = await EggProduction.findOne({});
        if (sampleRecord) {
            console.log('Sample record after migration:');
            console.log(`- totalEggs: ${sampleRecord.totalEggs}`);
            console.log(`- traysProduced: ${sampleRecord.traysProduced}`);
            console.log(`- traysDecimal: ${sampleRecord.traysDecimal}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

// Run the migration
migrateTraysDecimal();