// routes/eggProductionRoutes.js
const mongoose = require('mongoose'); // Add this line
const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const EggProduction = require('../models/EggProduction');
const Financial = require('../models/Financial'); // Add this line


router.get('/egg-production', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        // Fetch all batches for the dropdown
        const batches = await Batch.find().sort({ batchNo: 1 });

        // Get selected batch ID from query, if provided
        let selectedBatchId = req.query.batchId || null;

        let query = {}; // Default: Fetch all records

        if (selectedBatchId) {
            // Validate batch ID
            if (!mongoose.Types.ObjectId.isValid(selectedBatchId)) {
                return res.status(400).render('egg-production', {
                    error: 'Invalid batch ID',
                    batches,
                    records: [],
                    selectedBatchId: null
                });
            }
            query.batch = selectedBatchId; // Filter by selected batch
        }

        // Fetch egg production records (without limit)
        const records = await EggProduction.find(query)
            .populate('batch')
            .sort({ date: -1 });

        // Render the view with user data
        res.render('egg-production', { 
            batches, 
            records, 
            selectedBatchId,
            user: req.user // Pass user data if needed
        });

    } catch (err) {
        console.error('Error fetching egg production data:', err);
        res.status(500).render('egg-production', {
            error: 'Server error',
            batches: [],
            records: [],
            selectedBatchId: null
        });
    }
});



router.get('/eggview', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        // Fetch all batches for the dropdown
        const batches = await Batch.find().sort({ batchNo: 1 });

        // Get selected batch ID from query, if provided
        let selectedBatchId = req.query.batchId || null;

        let query = {}; // Default: Fetch all records

        if (selectedBatchId) {
            // Validate batch ID
            if (!mongoose.Types.ObjectId.isValid(selectedBatchId)) {
                return res.status(400).render('egg-production', {
                    error: 'Invalid batch ID',
                    batches,
                    records: [],
                    selectedBatchId: null
                });
            }
            query.batch = selectedBatchId; // Filter by selected batch
        }

        // Fetch egg production records (without limit)
        const records = await EggProduction.find(query)
            .populate('batch')
            .sort({ date: -1 });

        // Render the view with user data
        res.render('eggview', { 
            batches, 
            records, 
            selectedBatchId,
            user: req.user // Pass user data if needed
        });

    } catch (err) {
        console.error('Error fetching egg production data:', err);
        res.status(500).render('egg-production', {
            error: 'Server error',
            batches: [],
            records: [],
            selectedBatchId: null
        });
    }
});

router.get('/api/batch/:batchId/trays', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const batchId = req.params.batchId;

        // Validate batchId
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ error: 'Invalid batch ID' });
        }

        // Fetch the latest EggProduction record for the batch
        const eggProduction = await EggProduction.findOne({ 
            batch: new mongoose.Types.ObjectId(batchId) 
        }).sort({ date: -1 });

        // Fetch the total trays sold and remaining from Financial records
        const totalTraysSold = await Financial.aggregate([
            { $match: { batch: new mongoose.Types.ObjectId(batchId) } },
            { $group: { _id: null, totalTraysSold: { $sum: "$traysSold" } } },
        ]);

        const traysProduced = eggProduction ? eggProduction.traysProduced : 0;
        const traysSold = totalTraysSold.length > 0 ? totalTraysSold[0].totalTraysSold : 0;
        const traysRemaining = traysProduced - traysSold;

        // Return the tray data
        res.json({ 
            success: true,
            traysProduced, 
            traysSold, 
            traysRemaining 
        });
        
    } catch (err) {
        console.error('Error in /api/batch/:batchId/trays route:', err);
        res.status(500).json({ 
            success: false,
            error: 'Server Error' 
        });
    }
});
// GET single record (for viewing)
router.get('/egg-production/:id', async (req, res) => {
    try {
        const record = await EggProduction.findById(req.params.id).populate('batch');
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json(record);
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).json({ error: 'Server Error' });
    }
});// routes/eggProductionRoutes.js

// GET edit page
// GET route to show edit form
router.get('/egg-production/edit/:id', async (req, res) => {
    try {
        const record = await EggProduction.findById(req.params.id).populate('batch');
        const batches = await Batch.find();
        
        if (!record) {
            return res.status(404).send('Record not found');
        }
        
        res.render('edit-egg-production', {
            record,
            batches,
            currentDate: new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).send('Server Error');
    }
});

// DELETE route
 

// POST update
router.post('/egg-production/update/:id', async (req, res) => {
    try {
        const { batch, date, totalEggs, goodEggsPercent, badEggsPercent, weight, productionPercent } = req.body;
        
        if (parseFloat(goodEggsPercent) + parseFloat(badEggsPercent) > 100) {
            return res.status(400).send('The sum of Good Eggs and Bad Eggs percentages cannot exceed 100%');
        }
        
        await EggProduction.findByIdAndUpdate(
            req.params.id,
            {
                batch,
                date,
                totalEggs,
                goodEggsPercent,
                badEggsPercent,
                weight,
                productionPercent: productionPercent || undefined
            }
        );
        
        res.redirect('/egg-production');
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).send('Server Error');
    }
});

// DELETE record
router.delete('/egg-production/:id', async (req, res) => {
    try {
        await EggProduction.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});
// POST route for form submission
router.post('/egg-production', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const { batch, date, totalEggs, goodEggsPercent, badEggsPercent, weight } = req.body;

        // Validate percentages
        if (parseFloat(goodEggsPercent) + parseFloat(badEggsPercent) > 100) {
            return res.status(400).render('egg-production', {
                error: 'The sum of Good Eggs and Bad Eggs percentages cannot exceed 100%',
                batches: await Batch.find().sort({ batchNo: 1 }),
                records: await EggProduction.find().populate('batch').sort({ date: -1 }),
                selectedBatchId: null
            });
        }

        // Get batch info
        const batchInfo = await Batch.findById(batch);
        if (!batchInfo) {
            throw new Error('Batch not found');
        }

        // Calculate values with partial trays
        const eggsPerTray = 30;
        const traysProduced = Math.floor(totalEggs / eggsPerTray);
        const remainingEggs = totalEggs % eggsPerTray;
        const productionPercent = (totalEggs / batchInfo.totalNumber) * 100;

        // Create new record with additional fields
        const newProduction = new EggProduction({
            batch,
            date,
            totalEggs,
            goodEggsPercent,
            badEggsPercent,
            weight,
            traysProduced,
            remainingEggs, // Store the leftover eggs
            eggsPerTray,   // Store the conversion rate (typically 30)
            productionPercent
        });

        await newProduction.save();
        res.redirect('/egg-production');
        
    } catch (err) {
        console.error('Error saving egg production:', err);
        res.status(500).render('egg-production', {
            error: 'Server error while saving record',
            batches: await Batch.find().sort({ batchNo: 1 }),
            records: await EggProduction.find().populate('batch').sort({ date: -1 }),
            selectedBatchId: null
        });
    }
});

module.exports = router;
