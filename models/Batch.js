const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    batchNo: { type: String, required: true, unique: true },
    grade: { type: String, required: true },
    totalNumber: { type: Number, required: true },
    currentCount: { type: Number, required: true },
    initialAgeWeeks: { type: Number, required: true },
    date: { type: Date, default: Date.now },
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
    ],
    schedule: [
        {
            week: { type: Number, required: true },
            feed: { type: String },
            feedAmountPerBird: { type: Number },
            vaccine: { type: String },
            vitamins: { type: String },
            notes: { type: String },
            notified: { type: Boolean, default: false }
        }
    ]
});

// Update age
batchSchema.methods.updateAge = function() {
    const now = new Date();
    const diffInMs = now - this.creationDate;
    const diffInWeeks = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));
    this.currentAgeWeeks = this.initialAgeWeeks + diffInWeeks;
    this.lastAgeUpdate = now;
    return this;
};

// Generate schedule for 104 weeks (2 years)
batchSchema.methods.generateSchedule = function() {
    const schedule = [];
    for (let week = 1; week <= 104; week++) {
        let feed = '', feedAmount = 0, vaccine = '', vitamins = '';

        if (week <= 8) {
            feed = 'Starter'; feedAmount = 50; vaccine = (week===1)?'NDV':''; vitamins='Vit A,D,E,B';
        } else if (week <= 18) {
            feed = 'Grower'; feedAmount = 90; vaccine = (week===12)?'NDV booster':''; vitamins='Vit A,D,E';
        } else {
            feed = 'Layer Mash'; feedAmount = 120; vaccine = (week % 8===0)?'NDV/IB booster':''; vitamins='Calcium + Vit D3';
        }

        schedule.push({ week, feed, feedAmountPerBird: feedAmount, vaccine, vitamins, notes:'', notified:false });
    }
    this.schedule = schedule;
    return this;
};

// Get tasks for current week
batchSchema.methods.getWeeklyTasks = function() {
    this.updateAge();
    return this.schedule.filter(s => s.week === this.currentAgeWeeks && !s.notified);
};

// Pre-save update age
batchSchema.pre('save', function(next) {
    this.updateAge();
    next();
});

batchSchema.pre(/^find/, function(next) { next(); });
batchSchema.post(/^find/, function(docs, next) {
    if (Array.isArray(docs)) docs.forEach(doc => doc.updateAge());
    else if (docs) docs.updateAge();
    next();
});

const Batch = mongoose.model('Batch', batchSchema);
module.exports = Batch;
