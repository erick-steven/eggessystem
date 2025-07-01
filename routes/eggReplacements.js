const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EggReplacement = require('../models/EggReplacement');
const Batch = require('../models/Batch');
const EggProduction = require('../models/EggProduction');

// VIEW ROUTE - Render the egg replacement form
router.get('/egg-replacement', async (req, res) => {
  try {
    const batches = await Batch.find().populate('production');
    res.render('egg-replacement', {
      title: 'Egg Replacement System',
      batches: batches.map(batch => ({
        _id: batch._id,
        batchNo: batch.batchNo,
        totalEggs: batch.production?.totalEggs || 0,
        badEggsPercent: batch.production?.badEggsPercent || 0
      }))
    });
  } catch (error) {
    console.error('Error loading egg replacement page:', error);
    res.status(500).render('error', { 
      message: 'Failed to load egg replacement system' 
    });
  }
});

// API ROUTES

// Create new replacement
router.post('/api/replacements', async (req, res) => {
  try {
    const { batchNo, badEggsCount, replacementEggsCount, notes } = req.body;

    const batch = await Batch.findOne({ _id: batchNo });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const production = await EggProduction.findOne({ batch: batch._id });
    if (!production) {
      return res.status(404).json({ error: 'Production record not found' });
    }

    if (badEggsCount > production.totalEggs) {
      return res.status(400).json({ error: 'Bad eggs count exceeds total eggs' });
    }

    const replacement = new EggReplacement({
      batchNo: batch._id,
      badEggsCount,
      replacementEggsCount,
      notes,
      totalEggs: production.totalEggs
    });

    await replacement.save();
    await updateBatchStatistics(batch._id);

    const response = {
      ...replacement.toObject(),
      goodEggsCount: production.totalEggs - badEggsCount,
      totalTrays: Math.floor((production.totalEggs - badEggsCount) / 30),
      remainingEggs: (production.totalEggs - badEggsCount) % 30,
      batchDetails: {
        batchNo: batch.batchNo,
        totalEggs: production.totalEggs,
        badEggsPercent: production.badEggsPercent
      }
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get replacements for specific batch
router.get('/api/replacements/batch/:batchNo', async (req, res) => {
  try {
    const { batchNo } = req.params;
    const { startDate, endDate } = req.query;

    const batch = await Batch.findOne({ batchNo });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const query = { batchNo: batch._id };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const replacements = await EggReplacement.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const production = await EggProduction.findOne({ batch: batch._id }).lean() || {};
    const totalEggs = production.totalEggs || 0;

    const summary = replacements.reduce((acc, rep) => ({
      totalBadEggs: acc.totalBadEggs + rep.badEggsCount,
      totalReplacementEggs: acc.totalReplacementEggs + rep.replacementEggsCount
    }), { totalBadEggs: 0, totalReplacementEggs: 0 });

    const goodEggs = totalEggs - summary.totalBadEggs;

    res.json({
      metadata: {
        batch: batch.batchNo,
        productionDate: production.productionDate,
        recordCount: replacements.length
      },
      statistics: {
        totalEggs,
        ...summary,
        goodEggs,
        totalTrays: Math.floor(goodEggs / 30),
        remainingEggs: goodEggs % 30,
        efficiencyPercentage: totalEggs > 0 ? ((goodEggs / totalEggs) * 100).toFixed(2) : 0
      },
      replacements
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get all replacements with pagination
router.get('/api/replacements', async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const [replacements, total] = await Promise.all([
      EggReplacement.find()
        .populate('batchNo', 'batchNo')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      EggReplacement.countDocuments()
    ]);

    res.json({
      metadata: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      },
      results: replacements
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get single replacement
router.get('/api/replacements/:id', async (req, res) => {
  try {
    const replacement = await EggReplacement.findById(req.params.id)
      .populate({
        path: 'batchNo',
        populate: { path: 'production' }
      })
      .lean();

    if (!replacement) return res.status(404).json({ error: 'Replacement not found' });

    const goodEggs = replacement.totalEggs - replacement.badEggsCount;
    
    res.json({
      ...replacement,
      calculations: {
        goodEggsCount: goodEggs,
        totalTrays: Math.floor(goodEggs / 30),
        remainingEggs: goodEggs % 30,
        efficiencyPercentage: (goodEggs / replacement.totalEggs * 100).toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update replacement
router.put('/api/replacements/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const replacement = await EggReplacement.findById(req.params.id).session(session);
    if (!replacement) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Replacement not found' });
    }

    const { badEggsCount, replacementEggsCount, notes } = req.body;
    
    if (badEggsCount > replacement.totalEggs) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Bad eggs count exceeds total eggs' });
    }

    const originalValues = {
      badEggsCount: replacement.badEggsCount,
      replacementEggsCount: replacement.replacementEggsCount
    };

    replacement.badEggsCount = badEggsCount;
    replacement.replacementEggsCount = replacementEggsCount;
    replacement.notes = notes;
    replacement.lastUpdated = new Date();

    await replacement.save({ session });
    await updateBatchStatistics(replacement.batchNo, session);
    await session.commitTransaction();

    const goodEggs = replacement.totalEggs - replacement.badEggsCount;
    
    res.json({
      ...replacement.toObject(),
      calculations: {
        goodEggsCount: goodEggs,
        totalTrays: Math.floor(goodEggs / 30),
        remainingEggs: goodEggs % 30
      },
      audit: {
        changedFields: {
          badEggsCount: originalValues.badEggsCount !== badEggsCount,
          replacementEggsCount: originalValues.replacementEggsCount !== replacementEggsCount
        },
        originalValues
      }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: 'Server error', details: error.message });
  } finally {
    session.endSession();
  }
});

// Delete replacement
router.delete('/api/replacements/:id', async (req, res) => {
  try {
    const replacement = await EggReplacement.findByIdAndDelete(req.params.id);
    if (!replacement) return res.status(404).json({ error: 'Replacement not found' });

    await updateBatchStatistics(replacement.batchNo);
    res.json({ message: 'Replacement deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Helper function to update batch statistics
async function updateBatchStatistics(batchId, session = null) {
  const aggregation = await EggReplacement.aggregate([
    { $match: { batchNo: mongoose.Types.ObjectId(batchId) } },
    { $group: {
      _id: '$batchNo',
      totalBadEggs: { $sum: '$badEggsCount' },
      totalReplacements: { $sum: '$replacementEggsCount' },
      lastReplacementDate: { $max: '$createdAt' }
    }}
  ]);

  const updateData = aggregation.length > 0 ? {
    totalBadEggs: aggregation[0].totalBadEggs,
    totalReplacements: aggregation[0].totalReplacements,
    lastReplacementDate: aggregation[0].lastReplacementDate,
    hasReplacements: true
  } : {
    totalBadEggs: 0,
    totalReplacements: 0,
    hasReplacements: false
  };

  await Batch.findByIdAndUpdate(
    batchId, 
    updateData, 
    session ? { session } : {}
  );
}

module.exports = router;