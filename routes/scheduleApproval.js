const express = require('express');
const Schedule = require('../models/Schedule');
const Batch = require('../models/Batch'); // Make sure you have this model
const router = express.Router();

// POST route to approve a schedule task
router.post('/approve/:taskId/:batchId', async (req, res) => {
  try {
    const { taskId, batchId } = req.params;
    
    // Find the task
    const task = await Schedule.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if already approved
    if (task.approved) {
      return res.status(400).json({ message: 'Task already approved' });
    }
    
    // Find the batch to get current week
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // Update approval status
    task.approved = true;
    task.approvalDate = new Date();
    
    // Check if overdue (task week is less than current batch week)
    const currentWeek = batch.currentAgeWeeks;
    if (task.week < currentWeek) {
      task.overdue = true;
    }
    
    await task.save();
    
    res.json({
      success: true,
      message: 'Task approved successfully',
      task: task,
      overdue: task.overdue
    });
    
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ message: 'Error approving task' });
  }
});

// GET route to check task status (optional)
router.get('/task/:taskId', async (req, res) => {
  try {
    const task = await Schedule.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task' });
  }
});

module.exports = router;