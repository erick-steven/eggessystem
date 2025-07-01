const mongoose = require('mongoose');

const EggReplacementSchema = new mongoose.Schema({
  batchNo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch', 
    required: true 
  },
  replacementDate: { 
    type: Date, 
    default: Date.now 
  },
  badEggsCount: { 
    type: Number, 
    required: true,
    min: 0
  },
  replacementEggsCount: { 
    type: Number, 
    required: true,
    min: 0 
  },
  totalEggs: {  // Snapshot of total eggs at time of replacement
    type: Number,
    required: true
  },
  recordedBy: { 
    type: String 
  },
  notes: { 
    type: String 
  }
}, { timestamps: true });

// Virtual fields for calculations
EggReplacementSchema.virtual('goodEggsCount').get(function() {
  return this.totalEggs - this.badEggsCount;
});

EggReplacementSchema.virtual('totalTrays').get(function() {
  return Math.floor(this.goodEggsCount / 30);
});

EggReplacementSchema.virtual('remainingEggs').get(function() {
  return this.goodEggsCount % 30;
});

// Indexes for performance
EggReplacementSchema.index({ batchNo: 1 });
EggReplacementSchema.index({ replacementDate: -1 });

// Middleware to update batch stats when replacements are saved
EggReplacementSchema.post('save', async function(doc) {
  const batchId = doc.batchNo;
  const replacements = await this.model('EggReplacement').find({ batchNo: batchId });
  
  const totalBadEggs = replacements.reduce((sum, rep) => sum + rep.badEggsCount, 0);
  const totalReplacements = replacements.reduce((sum, rep) => sum + rep.replacementEggsCount, 0);
  
  await this.model('Batch').findByIdAndUpdate(batchId, {
    totalBadEggs,
    totalReplacements
  });
});

module.exports = mongoose.model('EggReplacement', EggReplacementSchema);