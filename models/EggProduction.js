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
    // Decimal tray tracking (e.g. 1.15 for 45 eggs)
    traysDecimal: {
        type: Number,
        default: 0
    },
    // Whole trays produced (legacy field)
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
        required: true,
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
        required: true,
        min: 0 
    },
    productionPercent: { 
        type: Number,
        min: 0,
        max: 100 
    }
});

// Pre-save hook for accurate decimal tray calculation
eggProductionSchema.pre('save', async function(next) {
    const eggsPerTray = this.eggsPerTray || 30;
    
    // Calculate decimal trays (e.g. 45 eggs → 1.5 trays)
    this.traysDecimal = this.totalEggs / eggsPerTray;
    
    // Calculate whole and partial trays
    const fullTrays = Math.floor(this.traysDecimal);
    this.remainingEggs = this.totalEggs % eggsPerTray;

    // Find the latest record for cumulative count
    const lastRecord = await this.constructor.findOne({ batch: this.batch })
        .sort({ date: -1 });

    // Maintain legacy traysProduced (whole numbers only)
    if (lastRecord) {
        this.traysProduced = lastRecord.traysProduced + fullTrays;
    } else {
        this.traysProduced = fullTrays;
    }

    next();
});

// Virtual for X.YY display format (e.g. "1.15")
eggProductionSchema.virtual('traysDisplay').get(function() {
    return this.remainingEggs === 0 ? 
        this.traysProduced.toString() : 
        `${this.traysProduced}.${this.remainingEggs.toString().padStart(2, '0')}`;
});

module.exports = mongoose.model('EggProduction', eggProductionSchema);