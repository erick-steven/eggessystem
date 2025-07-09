const mongoose = require('mongoose');

const eggProductionSchema = new mongoose.Schema({
    batch: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Batch', 
        required: true 
    },
    date: { 
        type: Date, 
        required: true,
        default: Date.now 
    },
    totalEggs: { 
        type: Number, 
        required: true,
        min: 0 
    },
    traysDecimal: {
        type: Number,
        default: 0
    },
    traysProduced: { 
        type: Number, 
        default: 0 
    },
    remainingEggs: { 
        type: Number, 
        default: 0 
    },
    eggsPerTray: { 
        type: Number, 
        default: 30,
        min: 1 
    },
    goodEggsPercent: { 
        type: Number, 
        required: false,
        min: 0,
        max: 100 
    },
    badEggsPercent: { 
        type: Number,
        min: 0,
        max: 100 
    },
    weight: { 
        type: Number, 
        required: false,
        min: 0 
    },
    productionPercent: { 
        type: Number,
        min: 0,
        max: 100 
    }
});

// Calculate trays when saving production record
eggProductionSchema.pre('save', function(next) {
    const eggsPerTray = this.eggsPerTray || 30;
    
    // Calculate decimal trays (e.g., 45 eggs → 1.5 trays)
    this.traysDecimal = this.totalEggs / eggsPerTray;
    
    // Calculate whole trays and remaining eggs
    const fullTrays = Math.floor(this.traysDecimal);
    this.remainingEggs = this.totalEggs % eggsPerTray;
    
    // For new records, find previous production to calculate cumulative trays
    if (this.isNew) {
        this.constructor.findOne({ batch: this.batch })
            .sort({ date: -1 })
            .then(lastRecord => {
                this.traysProduced = (lastRecord?.traysProduced || 0) + fullTrays;
                next();
            })
            .catch(err => next(err));
    } else {
        next();
    }
});

// After saving production, update Financial records
eggProductionSchema.post('save', async function(doc) {
    const Financial = mongoose.model('Financial');
    
    // Calculate total produced trays across all production records
    const productionSummary = await this.constructor.aggregate([
        { $match: { batch: doc.batch } },
        { $group: { _id: null, totalProduced: { $sum: "$traysDecimal" } } }
    ]);
    
    const totalProduced = productionSummary[0]?.totalProduced || 0;
    
    // Update the most recent financial record
    await Financial.findOneAndUpdate(
        { batch: doc.batch },
        { 
            $set: { 
                traysProduced: totalProduced,
                traysProducedDisplay: totalProduced.toFixed(2)
            } 
        },
        { sort: { date: -1 }, upsert: true }
    );
});

module.exports = mongoose.model('EggProduction', eggProductionSchema);