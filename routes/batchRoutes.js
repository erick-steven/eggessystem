const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const crypto = require('crypto');

// Show batch entry form with auto-generated batchNo and available batches
router.get('/batch', async (req, res) => {
    try {
        let batchNo;
        let isUnique = false;

        // Generate unique batch number
        while (!isUnique) {
            batchNo = 'BN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
            const existingBatch = await Batch.findOne({ batchNo });
            if (!existingBatch) {
                isUnique = true;
            }
        }

        // Fetch available batches sorted by the latest created batch
        const batches = await Batch.find().sort({ creationDate: -1 });

        // Render the batch form with the auto-generated batchNo and available batches
        res.render('batch-form', { batchNo, batches });

    } catch (error) {
        console.error('Error loading batch form:', error);
        res.status(500).render('batch-form', { 
            message: 'Error loading batch form',
            error: error.message // Display the error message to the user
        });
    }
});

// Change the route path to /viewflock
router.get('/viewflock', async (req, res) => {
    try {
        let batchNo;
        let isUnique = false;

        while (!isUnique) {
            batchNo = 'BN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
            const existingBatch = await Batch.findOne({ batchNo });
            if (!existingBatch) isUnique = true;
        }

        const batches = await Batch.find().sort({ creationDate: -1 });

        // Render viewflock.ejs
        res.render('viewflock', { batchNo, batches });

    } catch (error) {
        console.error('Error loading batch form:', error);
        res.status(500).render('viewflock', { 
            message: 'Error loading batch form',
            error: error.message 
        });
    }
});


// Handle POST form submission for batch entry
// POST /batch - Create a new batch (without flash)
router.post('/batch', async (req, res) => {
    try {
      const { batchNo, grade, totalNumber, age, date } = req.body;
  
      // Validate input
      if (!batchNo || !grade || !totalNumber || !age) {
        return res.redirect('/batch?error=Missing+required+fields');
      }
  
      const numTotal = parseInt(totalNumber);
      const numAge = parseInt(age);
  
      if (isNaN(numTotal) || isNaN(numAge)) {
        return res.redirect('/batch?error=Invalid+numeric+values');
      }
  
      // Create new batch
      const newBatch = new Batch({
        batchNo,
        grade,
        totalNumber: numTotal,
        currentCount: numTotal,
        initialAgeWeeks: numAge,
        creationDate: date ? new Date(date) : new Date(),
        currentAgeWeeks: numAge,
        status: 'Active'
      });
  
      await newBatch.save();
      res.redirect('/batch?success=Batch+created+successfully');
    } catch (error) {
      console.error('Error saving batch:', error);
  
      if (error.code === 11000) {
        res.redirect('/batch?error=Batch+number+already+exists');
      } else {
        res.redirect('/batch?error=Internal+server+error');
      }
    }
  });

// GET route to show edit form
router.get('/batch/edit/:id', async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).render('error', { 
                message: 'Batch not found'
            });
        }
        res.render('edit-batch-form', { batch });
    } catch (error) {
        console.error('Error fetching batch:', error);
        res.status(500).render('error', { 
            message: 'Server Error',
            error: error
        });
    }
});

// POST route to handle batch update
router.post('/batch/update/:id', async (req, res) => {
    try {
        const { grade, totalNumber, age, date } = req.body;
        await Batch.findByIdAndUpdate(req.params.id, {
            grade,
            totalNumber,
            age,
            date
        });
        res.redirect('/batch');
    } catch (error) {
        console.error('Error updating batch:', error);
        res.status(500).render('error', { 
            message: 'Server Error',
            error: error
        });
    }
});

// DELETE route
router.delete('/batch/:id', async (req, res) => {
    try {
        await Batch.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting batch:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error deleting batch'
        });
    }
});
        
// Handle POST form submission for recording death
router.post('/record-death', async (req, res) => {
    try {
        const { batchNo, count, reason, otherReason, notes } = req.body;

        if (!batchNo || !count || !reason) {
            return res.status(400).render('error', { 
                message: 'Missing required fields' 
            });
        }

        const deathCount = parseInt(count);

        if (isNaN(deathCount) || deathCount <= 0) {
            return res.status(400).render('error', { 
                message: 'Invalid death count' 
            });
        }

        const batch = await Batch.findOne({ batchNo });

        if (!batch) {
            return res.status(404).render('error', { 
                message: 'Batch not found' 
            });
        }

        if (batch.currentCount < deathCount) {
            return res.status(400).render('error', { 
                message: `Cannot record ${deathCount} deaths. Only ${batch.currentCount} birds available.` 
            });
        }

        // Deduct deaths
        batch.currentCount -= deathCount;

        // Push a death record into the batch
        batch.deathRecords.push({
            count: deathCount,
            reason,
            otherReason,
            notes
        });

        await batch.save();

        res.redirect('/batch');
    } catch (error) {
        console.error('Error recording death:', error);
        res.status(500).render('error', { 
            message: 'Internal server error',
            error: error 
        });
    }
});


// Show batch entry form with auto-generated batchNo and available batches
router.get('/record-death', async (req, res) => {
    try {
        let batchNo;
        let isUnique = false;

        // Generate unique batch number
        while (!isUnique) {
            batchNo = 'BN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
            const existingBatch = await Batch.findOne({ batchNo });
            if (!existingBatch) {
                isUnique = true;
            }
        }

        const batches = await Batch.find().sort({ date: -1 });
        res.render('record_death', { batchNo, batches });
    } catch (error) {
        console.error('Error loading batch form:', error);
        res.status(500).render('error', { 
            message: 'Error loading batch form',
            error: error
        });
    }
});
module.exports = router;