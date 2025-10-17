const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  vaccine: String,
  vitamins: String,
  feed: String,
  notes: String,
  date: Date,
  approved: { type: Boolean, default: false }, // Starts as false
  approvalDate: Date, // Will be set when approved
  overdue: { type: Boolean, default: false },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" }
});

module.exports = mongoose.model("Schedule", scheduleSchema);