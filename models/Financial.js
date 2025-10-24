const mongoose = require('mongoose');
const EggProduction = require('./EggProduction');

const financialSchema = new mongoose.Schema({
    // Core financial data
    batch: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Batch', 
        required: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    
    // Financial summary
    totalIncome: { 
        type: Number, 
        default: 0 
    },
    totalExpenses: { 
        type: Number, 
        default: 0 
    },
    profit: { 
        type: Number, 
        default: 0 
    },
    
    // Tray information
    traysProduced: { 
        type: Number, 
        default: 0 
    },
    traysSold: { 
        type: Number, 
        default: 0 
    },
    traysRemaining: { 
        type: Number, 
        default: 0 
    },
    traysProducedDisplay: { 
        type: Number, 
        default: 0 
    },
    traysSoldDisplay: { 
        type: Number, 
        default: 0 
    },
    traysRemainingDisplay: { 
        type: Number, 
        default: 0 
    },
    
    // Transactions array
    transactions: [{
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
        date: { 
            type: Date, 
            default: Date.now 
        },
        amount: { 
            type: Number, 
            required: true 
        },
        description: String,
        
        payment: {
            method: { 
                type: String, 
                enum: ['cash', 'credit', 'bank', 'mmobile_money'],
                required: true
            },
            accountType: { 
                type: String,
                enum: ['receivable', 'payable', 'cash', 'bank'],
                required: true
            },
            counterparty: { 
                type: String 
            },
            status: {
                type: String,
                enum: ['pending', 'partial', 'paid'],
                default: 'pending'
            },
            payments: [{
                date: Date,
                amount: Number,
                reference: String
            }]
        },
        
        details: {
            qty: Number,
            unitPrice: Number,
            supplier: String,
            unitCost: Number
        }
    }]
}, {
    timestamps: true
});

// Indexes
financialSchema.index({ batch: 1, date: 1 });

// In Financial model pre-save hook, fix the aggregation:
financialSchema.pre('save', async function(next) {
    try {
        // Calculate totals from transactions
        this.calculateFinancials();
        
        // FIXED: Use proper field name and handle empty results
        const productionSummary = await EggProduction.aggregate([
            { $match: { batch: this.batch } },
            { $group: { 
                _id: null, 
                totalProduced: { $sum: "$traysDecimal" } 
            } }
        ]);
        
        this.traysProduced = productionSummary.length > 0 ? 
            productionSummary[0].totalProduced : 0;
        
        // Calculate remaining trays
        this.traysRemaining = this.traysProduced - this.traysSold;
        
        // Update display fields
        this.traysProducedDisplay = this.traysProduced.toFixed(2);
        this.traysSoldDisplay = this.traysSold.toFixed(2);
        this.traysRemainingDisplay = this.traysRemaining.toFixed(2);
        
        next();
    } catch (err) {
        next(err);
    }
});

// Method to calculate financial totals from transactions
financialSchema.methods.calculateFinancials = function() {
    this.totalIncome = this.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
    this.totalExpenses = this.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
    this.profit = this.totalIncome - this.totalExpenses;
    
    // Calculate trays sold from egg transactions
    this.traysSold = this.transactions
        .filter(t => t.type === 'income' && t.category === 'egg')
        .reduce((sum, t) => sum + (t.details.qty || 0), 0);
};

// Static method to get current stock
financialSchema.statics.getCurrentStock = async function(batchId) {
    const [production, sales] = await Promise.all([
        EggProduction.aggregate([
            { $match: { batch: mongoose.Types.ObjectId(batchId) } },
            { $group: { _id: null, total: { $sum: "$traysDecimal" } } }
        ]),
        this.aggregate([
            { $match: { batch: mongoose.Types.ObjectId(batchId) } },
            { $group: { _id: null, total: { $sum: "$traysSold" } } }
        ])
    ]);
    
    return (production[0]?.total || 0) - (sales[0]?.total || 0);
};

// Static method to get financial summary for a batch
financialSchema.statics.getBatchSummary = async function(batchId) {
    return this.aggregate([
        { $match: { batch: mongoose.Types.ObjectId(batchId) } },
        { $group: {
            _id: null,
            totalIncome: { $sum: "$totalIncome" },
            totalExpenses: { $sum: "$totalExpenses" },
            totalProfit: { $sum: "$profit" },
            totalTraysSold: { $sum: "$traysSold" }
        }}
    ]);
};

// Method to add transaction
financialSchema.methods.addTransaction = function(transaction) {
    this.transactions.push(transaction);
    this.calculateFinancials();
};

// Method to update stock after production changes
financialSchema.statics.updateStockFromProduction = async function(batchId) {
    const productionSummary = await EggProduction.aggregate([
        { $match: { batch: mongoose.Types.ObjectId(batchId) } },
        { $group: { _id: null, total: { $sum: "$traysDecimal" } } }
    ]);
    
    const totalProduced = productionSummary[0]?.total || 0;
    
    await this.updateOne(
        { batch: batchId },
        { 
            $set: { 
                traysProduced: totalProduced,
                traysProducedDisplay: totalProduced.toFixed(2)
            }
        },
        { sort: { date: -1 } }
    );
};

const Financial = mongoose.model('Financial', financialSchema);
module.exports = Financial;