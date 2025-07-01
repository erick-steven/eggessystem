const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Batch = require('../models/Batch');
const EggProduction = require('../models/EggProduction');
const Financial = require('../models/Financial');
const moment = require('moment');
router.get('/visualization', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const batchId = req.query.batchId;
        const timePeriod = req.query.period || 'week'; // Default to week
        
        // Get all batches for the dropdown
        const batches = await Batch.find({}).sort({ date: -1 });
        
        let selectedBatch = null;
        let eggGraph = [];
        let financialGraph = [];
        
        if (batchId) {
            // Validate batchId
            if (!mongoose.Types.ObjectId.isValid(batchId)) {
                return res.status(400).send('Invalid batch ID');
            }
            
            selectedBatch = await Batch.findById(batchId);
            
            if (!selectedBatch) {
                return res.status(404).send('Batch not found');
            }
            
            // Calculate date range based on time period
            let dateFilter;
            const now = new Date();
            
            switch(timePeriod) {
                case 'month':
                    dateFilter = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case 'week':
                    dateFilter = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'day':
                    dateFilter = new Date(now.setDate(now.getDate() - 1));
                    break;
                default:
                    dateFilter = new Date(now.setDate(now.getDate() - 7));
            }
            
            // Get egg production data
            eggGraph = await EggProduction.aggregate([
                { $match: { 
                    batch: new mongoose.Types.ObjectId(batchId),
                    date: { $gte: dateFilter }
                }},
                { $sort: { date: 1 } },
                { $project: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    totalEggs: 1,
                    traysProduced: 1
                }}
            ]);
            
            // Get financial data with all required fields
            financialGraph = await Financial.aggregate([
                { $match: { 
                    batch: new mongoose.Types.ObjectId(batchId),
                    date: { $gte: dateFilter }
                }},
                { $sort: { date: 1 } },
                { $project: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    profit: 1,
                    totalIncome: 1,
                    totalExpenses: 1,
                    eggIncome: 1,
                    culledIncome: 1,
                    feedCost: 1,
                    laborCost: 1,
                    traysSold: 1
                }}
            ]);
        }
        
        res.render('visualization', {
            batches,
            selectedBatch,
            eggGraph,
            financialGraph,
            timePeriod,
            user: req.user // Pass user to view if needed
        });
        
    } catch (err) {
        console.error('Error in visualization route:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;