const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Batch = require('../models/Batch');
const EggProduction = require('../models/EggProduction');
const Financial = require('../models/Financial');

router.get('/report', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const allBatches = await Batch.find();
        const selectedBatchId = req.query.batch;
        
        if (selectedBatchId) {
            if (!mongoose.Types.ObjectId.isValid(selectedBatchId)) {
                return res.status(400).render('report', {
                    error: 'Invalid batch ID',
                    allBatches,
                    selectedBatchId: null
                });
            }

            const selectedBatch = await Batch.findById(selectedBatchId);
            
            if (!selectedBatch) {
                return res.status(404).render('report', {
                    error: 'Batch not found',
                    allBatches,
                    selectedBatchId: null
                });
            }

            const eggData = await EggProduction.find({ batch: selectedBatchId }).sort({ date: -1 });
            const financialData = await Financial.find({ batch: selectedBatchId }).sort({ date: -1 });

            // Format financial data for easier display in the template
            const formattedFinancialData = financialData.map(entry => {
                const formattedEntry = {
                    date: entry.date || new Date(),
                    totalIncome: entry.totalIncome || 0,
                    totalExpenses: entry.totalExpenses || 0,
                    profit: entry.profit || 0,
                    traysProduced: entry.traysProduced || 0,
                    traysSold: entry.traysSold || 0,
                    traysRemaining: entry.traysRemaining || 0,
                    transactions: entry.transactions || []
                };
                
                // Initialize all possible fields with default values
                const categories = {
                    egg: { qty: 0, price: 0, income: 0 },
                    culled: { qty: 0, price: 0, income: 0 },
                    feed: { cost: 0 },
                    chick: { cost: 0 },
                    medication: { cost: 0 },
                    labor: { cost: 0 },
                    transport: { cost: 0 }
                };

                // Process transactions
                if (entry.transactions) {
                    entry.transactions.forEach(transaction => {
                        const category = transaction.category;
                        if (transaction.type === 'income') {
                            if (category === 'egg' || category === 'culled') {
                                categories[category].qty += transaction.details?.qty || 0;
                                categories[category].price = transaction.details?.unitPrice || 0;
                                categories[category].income += transaction.amount || 0;
                            }
                        } else if (transaction.type === 'expense') {
                            if (category === 'feed' || category === 'chick' || 
                                category === 'medication' || category === 'labor' || 
                                category === 'transport') {
                                categories[category].cost += transaction.amount || 0;
                            }
                        }
                    });
                }

                // Add the categorized data to the formatted entry with default values
                formattedEntry.eggQty = categories.egg.qty;
                formattedEntry.eggPrice = categories.egg.price;
                formattedEntry.eggIncome = categories.egg.income;
                formattedEntry.culledQty = categories.culled.qty;
                formattedEntry.culledPrice = categories.culled.price;
                formattedEntry.culledIncome = categories.culled.income;
                formattedEntry.feedCost = categories.feed.cost;
                formattedEntry.chickCost = categories.chick.cost;
                formattedEntry.medicationCost = categories.medication.cost;
                formattedEntry.laborCost = categories.labor.cost;
                formattedEntry.transportCost = categories.transport.cost;

                return formattedEntry;
            });

            res.render('report', {
                selectedBatch,
                eggData,
                financialData: formattedFinancialData,
                allBatches,
                selectedBatchId,
                user: req.user
            });
        } else {
            res.render('report', {
                selectedBatch: null,
                eggData: [],
                financialData: [],
                allBatches,
                selectedBatchId: null,
                user: req.user
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).render('report', {
            error: 'Server Error',
            allBatches: [],
            selectedBatchId: null
        });
    }
});

module.exports = router;