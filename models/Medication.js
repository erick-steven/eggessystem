const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  batchNo: {
    type: String,
    required: true
  },
  medicationType: {
    type: String,
    required: true,
    enum: ['Vitamin/Supplement', 'Medication']
  },
  supplementType: {
    type: String,
    required: true,
    enum: ['Electrolytes & Vitamins', 'Oyster Shell (Calcium)', 'Probiotics', 'Antibiotics', 'Other']
  },
  dateGiven: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['Routine Support', 'After Stressful Event', 'Post-Processing', 'Health Issue', 'Preventative Treatment']
  },
  notes: {
    type: String
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Medication', medicationSchema);