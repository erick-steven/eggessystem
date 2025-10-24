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
    traysProduced: { 
        type: String,  // X.YY format
        default: "0.00" 
    },
    traysDecimal: {    // ADD THIS NEW FIELD for calculations
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

// Pre-save hook - calculate individual record trays
eggProductionSchema.pre('save', function(next) {
    // Calculate trays for this specific entry only
    const eggsPerTray = this.eggsPerTray || 30;
    const fullTrays = Math.floor(this.totalEggs / eggsPerTray);
    const remainingEggs = this.totalEggs % eggsPerTray;
    
    // Format as X.YY for this entry only
    this.traysProduced = remainingEggs === 0 ? 
        fullTrays.toString() : 
        `${fullTrays}.${remainingEggs.toString().padStart(2, '0')}`;
    
    // Store decimal value for calculations
    this.traysDecimal = fullTrays + (remainingEggs / 100);
    
    this.remainingEggs = remainingEggs;
    
    next();
});

// Post-save hook - recalculate ALL records for this batch with cumulative logic
eggProductionSchema.post('save', async function(doc) {
    try {
        await recalculateBatchTrays(doc.batch);
    } catch (error) {
        console.error('Error updating trays:', error);
    }
});

// Post-remove hook - also recalculate when records are deleted
eggProductionSchema.post('remove', async function(doc) {
    try {
        await recalculateBatchTrays(doc.batch);
    } catch (error) {
        console.error('Error updating trays after deletion:', error);
    }
});

// UPDATED FUNCTION: recalculateBatchTrays with proper tray remaining updates
async function recalculateBatchTrays(batchId) {
    const EggProduction = mongoose.model('EggProduction');
    const Financial = mongoose.model('Financial');
    
    // Get ALL production records for this batch, sorted by date
    const allRecords = await EggProduction.find({ 
        batch: batchId 
    }).sort({ date: 1 });
    
    let cumulativeFullTrays = 0;
    let cumulativeRemainingEggs = 0;
    let totalTraysDecimal = 0;
    
    const updates = [];
    
    // Calculate cumulative totals with proper tray formation
    for (let record of allRecords) {
        const eggsPerTray = record.eggsPerTray || 30;
        
        // Add today's eggs to cumulative remaining eggs
        const totalEggsAvailable = cumulativeRemainingEggs + record.totalEggs;
        
        // Calculate how many full trays we can make now
        const newFullTrays = Math.floor(totalEggsAvailable / eggsPerTray);
        cumulativeRemainingEggs = totalEggsAvailable % eggsPerTray;
        
        // Update cumulative full trays
        cumulativeFullTrays += newFullTrays;
        
        // Calculate decimal value for this specific record
        const recordTraysDecimal = cumulativeFullTrays + (cumulativeRemainingEggs / 100);
        totalTraysDecimal = recordTraysDecimal;
        
        // Format for display
        const traysProducedStr = cumulativeRemainingEggs === 0 ? 
            cumulativeFullTrays.toString() : 
            `${cumulativeFullTrays}.${cumulativeRemainingEggs.toString().padStart(2, '0')}`;
        
        updates.push({
            updateOne: {
                filter: { _id: record._id },
                update: { 
                    $set: { 
                        traysProduced: traysProducedStr,
                        traysDecimal: recordTraysDecimal, // ADD THIS
                        remainingEggs: cumulativeRemainingEggs
                    } 
                }
            }
        });
    }
    
    // Bulk update all records
    if (updates.length > 0) {
        await EggProduction.bulkWrite(updates);
    }
    
    // CRITICAL: Update Financial model with new production total
    const financialRecord = await Financial.findOne({ batch: batchId });
    if (financialRecord) {
        const traysSold = financialRecord.traysSold || 0;
        const traysRemaining = totalTraysDecimal - traysSold;
        
        await Financial.findOneAndUpdate(
            { batch: batchId },
            { 
                $set: { 
                    traysProduced: totalTraysDecimal,
                    traysRemaining: traysRemaining,
                    traysProducedDisplay: totalTraysDecimal.toFixed(2),
                    traysRemainingDisplay: traysRemaining.toFixed(2),
                    extraEggs: cumulativeRemainingEggs,
                    traysProducedDisplayText: `${cumulativeFullTrays} trays + ${cumulativeRemainingEggs} eggs`
                } 
            }
        );
    }
    
    console.log(`Recalculated batch ${batchId}: ${totalTraysDecimal} total trays`);
}

module.exports = mongoose.model('EggProduction', eggProductionSchema);