// Batch.js

const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    batchNo: { type: String, required: true, unique: true },
    grade: { type: String, required: true },
    totalNumber: { type: Number, required: true },
    currentCount: { type: Number, required: true },
    initialAgeWeeks: { type: Number, required: true },
    date: { type: Date, default: Date.now }, // Add this line
    creationDate: { type: Date, default: Date.now },
    lastAgeUpdate: { type: Date, default: Date.now },
    currentAgeWeeks: { type: Number, required: true },
    status: { type: String, default: 'Active' },
    
    deathRecords: [
        {
            date: { type: Date, default: Date.now },
            count: { type: Number, required: true },
            reason: { type: String },
            otherReason: { type: String },
            notes: { type: String }
        }
    ]
});

// Add the method to the schema methods
batchSchema.methods.updateAge = function() {
    const now = new Date();
    const diffInMs = now - this.creationDate;
    const diffInWeeks = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));
    this.currentAgeWeeks = this.initialAgeWeeks + diffInWeeks;
    this.lastAgeUpdate = now;
    return this;
};

// Update age before saving
batchSchema.pre('save', function(next) {
    this.updateAge();
    next();
});

// For find operations, we need a different approach
batchSchema.pre(/^find/, function(next) {
    // This refers to the query, not the document
    // We'll update age after documents are retrieved
    next();
});

// Add a post-find hook to update ages on returned documents
batchSchema.post(/^find/, function(docs, next) {
    if (Array.isArray(docs)) {
        docs.forEach(doc => doc.updateAge());
    } else if (docs) {
        docs.updateAge();
    }
    next();
});

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;