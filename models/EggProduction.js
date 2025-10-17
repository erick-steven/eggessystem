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

// Pre-save hook - calculate individual record trays AND round percentages
eggProductionSchema.pre('save', function(next) {
    // Calculate trays for this specific entry only
    const eggsPerTray = this.eggsPerTray || 30;
    const fullTrays = Math.floor(this.totalEggs / eggsPerTray);
    const remainingEggs = this.totalEggs % eggsPerTray;
    
    // Format as X.YY for this entry only
    this.traysProduced = remainingEggs === 0 ? 
        fullTrays.toString() : 
        `${fullTrays}.${remainingEggs.toString().padStart(2, '0')}`;
    
    this.remainingEggs = remainingEggs;
    
    // FIX: Round all percentages to 2 decimal places
    if (this.goodEggsPercent) {
        this.goodEggsPercent = Math.round(this.goodEggsPercent * 100) / 100;
    }
    if (this.badEggsPercent) {
        this.badEggsPercent = Math.round(this.badEggsPercent * 100) / 100;
    }
    if (this.productionPercent) {
        this.productionPercent = Math.round(this.productionPercent * 100) / 100;
    }
    
    next();
});

// Post-save hook - recalculate ALL records for this batch with cumulative logic
eggProductionSchema.post('save', async function(doc) {
    try {
        await recalculateBatchTrays(doc.batch);
        
        // FIX: Also ensure percentages are rounded for all batch records
        const EggProduction = mongoose.model('EggProduction');
        await EggProduction.updateMany(
            { batch: doc.batch },
            [
                {
                    $set: {
                        goodEggsPercent: { 
                            $cond: {
                                if: { $ne: ["$goodEggsPercent", null] },
                                then: { $round: ["$goodEggsPercent", 2] },
                                else: "$goodEggsPercent"
                            }
                        },
                        badEggsPercent: { 
                            $cond: {
                                if: { $ne: ["$badEggsPercent", null] },
                                then: { $round: ["$badEggsPercent", 2] },
                                else: "$badEggsPercent"
                            }
                        },
                        productionPercent: { 
                            $cond: {
                                if: { $ne: ["$productionPercent", null] },
                                then: { $round: ["$productionPercent", 2] },
                                else: "$productionPercent"
                            }
                        }
                    }
                }
            ]
        );
    } catch (error) {
        console.error('Error updating trays and percentages:', error);
    }
});

// Function to recalculate entire batch with proper cumulative tray calculation
async function recalculateBatchTrays(batchId) {
    const EggProduction = mongoose.model('EggProduction');
    const Financial = mongoose.model('Financial');
    
    // Get ALL production records for this batch, sorted by date
    const allRecords = await EggProduction.find({ 
        batch: batchId 
    }).sort({ date: 1 });
    
    let cumulativeFullTrays = 0;
    let cumulativeRemainingEggs = 0;
    let totalTraysFromBatch = 0;
    
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
        totalTraysFromBatch = cumulativeFullTrays;
        
        // Format for display: cumulativeFullTrays.cumulativeRemainingEggs
        const traysProducedStr = cumulativeRemainingEggs === 0 ? 
            cumulativeFullTrays.toString() : 
            `${cumulativeFullTrays}.${cumulativeRemainingEggs.toString().padStart(2, '0')}`;
        
        updates.push({
            updateOne: {
                filter: { _id: record._id },
                update: { 
                    $set: { 
                        traysProduced: traysProducedStr,
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
    
    // Update Financial model
    await Financial.findOneAndUpdate(
        { batch: batchId },
        { 
            $set: { 
                traysProduced: totalTraysFromBatch,
                extraEggs: cumulativeRemainingEggs,
                traysProducedDisplay: `${totalTraysFromBatch} trays + ${cumulativeRemainingEggs} eggs`
            } 
        },
        { upsert: true }
    );
    
    console.log(`Recalculated batch ${batchId}: ${totalTraysFromBatch} trays + ${cumulativeRemainingEggs} eggs`);
}

module.exports = mongoose.model('EggProduction', eggProductionSchema);