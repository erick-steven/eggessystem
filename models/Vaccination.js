const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema({
  batchNo: {
    type: String,
    required: true
  },
  vaccine: {
    type: String,
    required: true
  },
  dateAdministered: {
    type: Date,
    required: true
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  administrationMethod: {
    type: String,
    required: true,
    enum: ['Drinking Water', 'Wing-web Stab', 'Injection', 'Spray']
  },
  notes: {
    type: String
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedDate: {
    type: Date
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

// Virtual for status
vaccinationSchema.virtual('status').get(function() {
  if (this.completed) return 'completed';
  
  const now = new Date();
  const dueDate = new Date(this.nextDueDate);
  const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'upcoming';
  return 'scheduled';
});

// Ensure virtual fields are serialized
vaccinationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Vaccination', vaccinationSchema);