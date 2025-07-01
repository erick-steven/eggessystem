 
// Financial.js


const mongoose = require('mongoose');
const EggProduction = require('./EggProduction'); // Correct relative path
const financialSchema = new mongoose.Schema({
    // Core financial data
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    date: { type: Date, required: true },
    
    // Financial summary
    totalIncome: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    
    // Tray information
    traysProduced: { type: Number, default: 0 },
    traysSold: { type: Number, default: 0 },
    traysRemaining: { type: Number, default: 0 },
    traysProducedDisplay: { type: Number, default: 0 },
    traysSoldDisplay: { type: Number, default: 0 },
    traysRemainingDisplay: { type: Number, default: 0 },
    
    // Transactions array for all financial activities
    transactions: [{
        // Common fields
        type: { 
            type: String, 
            required: true,
            enum: ['income', 'expense']
        },
        category: {
            type: String,
            required: true,
            enum: ['egg', 'culled', 'feed', 'chick', 'medication', 'labor', 'transport']
        },
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        description: String,
        
        // Payment information
        payment: {
            method: { 
                type: String, 
                enum: ['cash', 'credit', 'bank', 'mobile'],
                required: true
            },
            accountType: { 
                type: String,
                enum: ['receivable', 'payable', 'cash', 'bank'],
                required: true
            },
            counterparty: { type: String }, // Customer or supplier name
            status: {
                type: String,
                enum: ['pending', 'partial', 'paid'],
                default: 'pending'
            },
            payments: [{ // Track partial payments
                date: Date,
                amount: Number,
                reference: String
            }]
        },
        
        // Category-specific fields
        details: {
            // For sales (egg, culled)
            qty: Number,
            unitPrice: Number,
            
            // For purchases (feed, chicks, etc)
            supplier: String,
            unitCost: Number
        }
    }],
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
// Add index for better query performance
financialSchema.index({ batch: 1, date: 1 });
financialSchema.pre('save', async function (next) {
    try {
        // Get the latest egg production data for reference
        const eggProduction = await EggProduction.findOne({ batch: this.batch }).sort({ date: -1 });
        
        // Set traysProduced from EggProduction (for reference)
        this.traysProduced = eggProduction ? eggProduction.traysProduced : 0;
        
        // If this is a new record (not update)
        if (this.isNew) {
            // Get the previous financial record
            const previousRecord = await Financial.findOne({ batch: this.batch })
                .sort({ date: -1 });
                
            // Calculate trays sold and remaining
            const previousSold = previousRecord ? previousRecord.traysSold : 0;
            const previousRemaining = previousRecord ? previousRecord.traysRemaining : this.traysProduced;
            
            // For new records, traysSold should include previous sold + current sale
            // (current sale is calculated from transactions in the route)
            // traysRemaining is calculated in the route before saving
            
            // These are just fallbacks in case route didn't set them
            this.traysSold = this.traysSold || previousSold;
            this.traysRemaining = this.traysRemaining || (previousRemaining - (this.traysSold - previousSold));
        }
        
        next();
    } catch (err) {
        next(err);
    }
});
financialSchema.statics.getTotalTraysSold = async function (batchId) {
    const result = await this.aggregate([
        { $match: { batch: mongoose.Types.ObjectId(batchId) } },
        { $group: { _id: null, totalTraysSold: { $sum: "$traysSold" } } }
    ]);

    return result.length > 0 ? result[0].totalTraysSold : 0;
};

const Financial = mongoose.model('Financial', financialSchema);
module.exports = Financial;


// Export the Financial model
module.exports = mongoose.model('Financial', financialSchema);

 