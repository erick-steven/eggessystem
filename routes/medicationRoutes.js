const express = require('express');
const Medication = require('../models/Medication');
const router = express.Router();

// GET all medications
router.get('/', async (req, res) => {
  try {
    const medications = await Medication.find().sort({ dateGiven: -1 });
    res.json(medications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET medications by batch
router.get('/batch/:batchNo', async (req, res) => {
  try {
    const medications = await Medication.find({ batchNo: req.params.batchNo }).sort({ dateGiven: -1 });
    res.json(medications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET a specific medication
router.get('/:id', async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    res.json(medication);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE a new medication
router.post('/', async (req, res) => {
  const medication = new Medication({
    batchNo: req.body.batchNo,
    medicationType: req.body.medicationType,
    supplementType: req.body.supplementType,
    dateGiven: req.body.dateGiven,
    reason: req.body.reason,
    notes: req.body.notes
  });

  try {
    const newMedication = await medication.save();
    res.status(201).json(newMedication);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE a medication
router.patch('/:id', async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    if (req.body.batchNo != null) medication.batchNo = req.body.batchNo;
    if (req.body.medicationType != null) medication.medicationType = req.body.medicationType;
    if (req.body.supplementType != null) medication.supplementType = req.body.supplementType;
    if (req.body.dateGiven != null) medication.dateGiven = req.body.dateGiven;
    if (req.body.reason != null) medication.reason = req.body.reason;
    if (req.body.notes != null) medication.notes = req.body.notes;

    const updatedMedication = await medication.save();
    res.json(updatedMedication);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a medication
router.delete('/:id', async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    await Medication.deleteOne({ _id: req.params.id });
    res.json({ message: 'Medication deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;