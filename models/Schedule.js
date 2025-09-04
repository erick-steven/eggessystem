const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  vaccine: String,
  vitamins: String,
  feed: String,
  notes: String,
  date: Date, // ✅ needed for comparisons
  approved: { type: Boolean, default: false },
  approvalDate: Date,
  overdue: { type: Boolean, default: false },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" } // ✅ link to batch
});

module.exports = mongoose.model("Schedule", scheduleSchema);