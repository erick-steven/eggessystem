const express = require('express');
const Vaccination = require('../models/Vaccination');
const router = express.Router();

// GET all vaccinations
router.get('/', async (req, res) => {
  try {
    const vaccinations = await Vaccination.find().sort({ dateAdministered: -1 });
    res.json(vaccinations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET vaccinations by batch
router.get('/batch/:batchNo', async (req, res) => {
  try {
    const vaccinations = await Vaccination.find({ batchNo: req.params.batchNo }).sort({ dateAdministered: -1 });
    res.json(vaccinations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET upcoming vaccinations
router.get('/upcoming/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    const vaccinations = await Vaccination.find({
      nextDueDate: { $lte: endDate, $gte: startDate },
      completed: false
    }).sort({ nextDueDate: 1 });
    
    res.json(vaccinations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET overdue vaccinations
router.get('/overdue', async (req, res) => {
  try {
    const today = new Date();
    const vaccinations = await Vaccination.find({
      nextDueDate: { $lt: today },
      completed: false
    }).sort({ nextDueDate: 1 });
    
    res.json(vaccinations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET a specific vaccination
router.get('/:id', async (req, res) => {
  try {
    const vaccination = await Vaccination.findById(req.params.id);
    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination not found' });
    }
    res.json(vaccination);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE a new vaccination
router.post('/', async (req, res) => {
  const vaccination = new Vaccination({
    batchNo: req.body.batchNo,
    vaccine: req.body.vaccine,
    dateAdministered: req.body.dateAdministered,
    nextDueDate: req.body.nextDueDate,
    administrationMethod: req.body.administrationMethod,
    notes: req.body.notes,
    completed: req.body.completed || false,
    completedDate: req.body.completedDate
  });

  try {
    const newVaccination = await vaccination.save();
    res.status(201).json(newVaccination);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE a vaccination
router.patch('/:id', async (req, res) => {
  try {
    const vaccination = await Vaccination.findById(req.params.id);
    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination not found' });
    }

    if (req.body.batchNo != null) vaccination.batchNo = req.body.batchNo;
    if (req.body.vaccine != null) vaccination.vaccine = req.body.vaccine;
    if (req.body.dateAdministered != null) vaccination.dateAdministered = req.body.dateAdministered;
    if (req.body.nextDueDate != null) vaccination.nextDueDate = req.body.nextDueDate;
    if (req.body.administrationMethod != null) vaccination.administrationMethod = req.body.administrationMethod;
    if (req.body.notes != null) vaccination.notes = req.body.notes;
    if (req.body.completed != null) vaccination.completed = req.body.completed;
    if (req.body.completedDate != null) vaccination.completedDate = req.body.completedDate;

    const updatedVaccination = await vaccination.save();
    res.json(updatedVaccination);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a vaccination
router.delete('/:id', async (req, res) => {
  try {
    const vaccination = await Vaccination.findById(req.params.id);
    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination not found' });
    }

    await Vaccination.deleteOne({ _id: req.params.id });
    res.json({ message: 'Vaccination deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;