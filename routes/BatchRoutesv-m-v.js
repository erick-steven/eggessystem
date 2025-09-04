const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const Schedule = require('../models/Schedule'); // Schedule model

// Full Vaccination & Feed Schedule (0–104 weeks)
const scheduleData = [
  { week: 0, vaccine: "Marek’s disease (at hatchery)", vitamins: "Glucose + Electrolytes", feed: "Starter: 12–15g", notes: "Warm brooder, clean water" },
  { week: 1, vaccine: "NDV (HB1/Lasota eye drop)", vitamins: "Vit A, D, E, B-complex", feed: "Starter: 15–20g", notes: "Good brooding, light 23h/day" },
  { week: 2, vaccine: "IBD (Gumboro) 1st dose", vitamins: "Vit C + electrolytes", feed: "Starter: 20–25g", notes: "Check uniformity" },
  { week: 3, vaccine: "NDV booster", vitamins: "Vit A, D3, E", feed: "Starter: 30–35g", notes: "Begin deworming (if endemic)" },
  { week: 4, vaccine: "IBD booster", vitamins: "Multivitamins", feed: "Starter: 40–45g", notes: "Litter management" },
  { week: 5, vaccine: "-", vitamins: "Vit C during stress", feed: "Starter: 50g", notes: "" },
  { week: 6, vaccine: "NDV + IB combined", vitamins: "Vit A, D3, E", feed: "Starter: 55–60g", notes: "Grading chicks" },
  { week: 7, vaccine: "Fowl Pox vaccine", vitamins: "Vit C", feed: "Grower: 60–70g", notes: "Switch to grower diet" },
  { week: 8, vaccine: "-", vitamins: "Vit C", feed: "Grower: 60–70g", notes: "" },
  { week: 9, vaccine: "NDV booster (Lasota)", vitamins: "Vit A, D3, E", feed: "Grower: 70–85g", notes: "Deworm (if needed)" },
  { week: 13, vaccine: "Cholera / optional Salmonella", vitamins: "Vit B-complex", feed: "Grower: 90–95g", notes: "Uniformity critical" },
  { week: 17, vaccine: "NDV + IB booster", vitamins: "Vit D3 + Calcium", feed: "Pre-layer: 95–100g", notes: "Shift to pre-layer feed" },
  { week: 19, vaccine: "Begin laying", vitamins: "Calcium + Vit D3", feed: "Layer mash: 105–110g", notes: "Light 14h/day" },
  { week: 21, vaccine: "NDV booster", vitamins: "Vit A, D, E", feed: "Layer mash: 110–115g", notes: "Egg production starts" },
  { week: 25, vaccine: "IB booster", vitamins: "Vit C + electrolytes", feed: "Layer mash: 115–120g", notes: "Peak production" },
  { week: 31, vaccine: "NDV booster", vitamins: "Vit A, D3, Ca", feed: "Layer mash: 120–125g", notes: "Peak maintained" },
  { week: 41, vaccine: "Fowl Cholera booster", vitamins: "Vit C", feed: "Layer mash: 125g", notes: "Maintain body weight" },
  { week: 51, vaccine: "NDV booster", vitamins: "Vit A, D, E", feed: "Layer mash: 125–130g", notes: "Eggshell quality focus" },
  { week: 61, vaccine: "IB booster", vitamins: "Vit D3 + Calcium", feed: "Layer mash: 130g", notes: "Start gradual decline" },
  { week: 71, vaccine: "NDV booster", vitamins: "Vit C + electrolytes", feed: "Layer mash: 130–135g", notes: "Deworm if necessary" },
  { week: 81, vaccine: "Cholera booster", vitamins: "Vit A, D3, E", feed: "Layer mash: 135g", notes: "Older hen management" },
  { week: 91, vaccine: "NDV booster", vitamins: "Vit B-complex", feed: "Layer mash: 135–140g", notes: "Production drops" },
  { week: 101, vaccine: "IB booster", vitamins: "Vit C", feed: "Layer mash: 140g", notes: "Culling stage" }
];

// Seed schedule once (avoid duplicates)
(async function seedSchedule() {
  try {
    for (let item of scheduleData) {
      await Schedule.updateOne(
        { week: item.week },
        { $setOnInsert: item },
        { upsert: true }
      );
    }
    console.log("Schedule seeded successfully (no duplicates)");
  } catch (error) {
    console.error("Error seeding schedule:", error);
  }
})();

// Get batch view with tasks
router.get('/v-m-v/:id', async (req, res) => {
  try {
    const batches = await Batch.find();
    const selectedBatch = await Batch.findById(req.params.id);
    if (!selectedBatch) return res.status(404).send('Batch not found');

    const now = new Date();
    const diffWeeks = Math.floor((now - new Date(selectedBatch.creationDate)) / (1000 * 60 * 60 * 24 * 7));
    const currentWeek = selectedBatch.initialAgeWeeks + diffWeeks;
    selectedBatch.currentAgeWeeks = currentWeek;

    // Fetch all schedule entries from DB
    const allTasks = await Schedule.find().sort({ week: 1 });

    // Categorize tasks
    const currentTasks = allTasks.filter(t => t.week === currentWeek);
    const upcomingTasks = allTasks.filter(t => t.week > currentWeek && t.week <= currentWeek + 3);
    const overdueTasks = allTasks.filter(t => t.week < currentWeek);

    // Next schedule
    const nextSchedule = allTasks.find(t => t.week > currentWeek) || null;

    res.render('v-m-v', {
      batches,
      selectedBatch,
      fullSchedule: allTasks,
      currentWeek,
      currentTasks,
      upcomingSchedules: upcomingTasks,
      overdueTasks,
      nextSchedule
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Route to show batch selection page
router.get('/v-m-v', async (req, res) => {
    try {
      const batches = await Batch.find();
      res.render('v-m-v', { 
        batches, 
        selectedBatch: null, 
        fullSchedule: [], 
        currentTasks: [], 
        upcomingSchedules: [], 
        overdueTasks: [], 
        currentWeek: null, 
        nextSchedule: null
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });
  
// Approve task
// Approve task - support both form submission and AJAX
router.post('/v-m-v/approve/:taskId/:batchId', async (req, res) => {
    try {
      const { taskId, batchId } = req.params;
  
      const task = await Schedule.findById(taskId);
      const batch = await Batch.findById(batchId);
  
      if (!task || !batch) {
        return res.status(404).send('Task or Batch not found');
      }
  
      // compute current week
      const now = new Date();
      const diffWeeks = Math.floor(
        (now - new Date(batch.creationDate)) / (1000 * 60 * 60 * 24 * 7)
      );
      const currentWeek = batch.initialAgeWeeks + diffWeeks;
  
      if (task.week <= currentWeek) {
        task.approved = true;
        task.approvalDate = now;
        task.overdue = task.week < currentWeek;
  
        await task.save();
        
        // Check if it's an AJAX request
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.json({ 
            message: 'Task approved successfully', 
            task: task,
            overdue: task.overdue
          });
        } else {
          // Regular form submission
          return res.redirect(`/v-m-v/${batchId}`);
        }
      } else {
        const errorMsg = 'Cannot approve upcoming task yet';
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(400).json({ message: errorMsg });
        } else {
          return res.status(400).send(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error approving task:', error);
      const errorMsg = 'Server Error';
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({ message: errorMsg });
      } else {
        return res.status(500).send(errorMsg);
      }
    }
  });
module.exports = router;