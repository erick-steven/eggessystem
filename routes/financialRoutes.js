
// financialRoutes.js


const express = require('express');
const mongoose = require('mongoose'); // Ensure mongoose is imp
const router = express.Router();
const Financial = require('../models/Financial');
const Batch = require('../models/Batch');
const EggProduction = require('../models/EggProduction');

// Middleware to parse JSON request bodies
router.use(express.json());
router.get('/financials', async (req, res) => {
    try {
        // Fetch all financial records and populate the batch field
        const financialRecords = await Financial.find({}).populate('batch', 'batchNo');

        // Fetch all batches with tray data
        const allBatches = await Batch.find({});
        const batchesWithTrays = await Promise.all(
            allBatches.map(async (batch) => {
                const trayData = await getTrayData(batch._id);
                return {
                    ...batch.toObject(),
                    ...trayData,
                };
            })
        );

        // Fetch top 5 batches (example logic)
        const topBatches = batchesWithTrays.slice(0, 5);

        // Render the financials page with the fetched data
        res.render('financials', {
            allBatches: batchesWithTrays,
            topBatches,
            financialRecords, // Pass financialRecords to the template
        });
    } catch (err) {
        console.error('Error in /financials route:', err);
        res.status(500).send('Server Error');
    }
});

// Helper function to get tray data for a batch
async function getTrayData(batchId) {
    const eggProduction = await EggProduction.findOne({ batch: batchId }).sort({ date: -1 });
    const totalTraysSold = await Financial.aggregate([
        { $match: { batch: batchId } },
        { $group: { _id: null, totalTraysSold: { $sum: "$traysSold" } } },
    ]);

    const traysProduced = eggProduction ? eggProduction.traysProduced : 0;
    const traysSold = totalTraysSold.length > 0 ? totalTraysSold[0].totalTraysSold : 0;
    const traysRemaining = traysProduced - traysSold;

    return { traysProduced, traysSold, traysRemaining };
}
router.get('/api/batch/:batchId/trays', async (req, res) => {
    try {
        const batchId = req.params.batchId;

        // Validate batchId
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).json({ error: 'Invalid batch ID' });
        }

        // Fetch the latest EggProduction record for the batch
        const eggProduction = await EggProduction.findOne({ batch: new mongoose.Types.ObjectId(batchId) }).sort({ date: -1 });

        // Calculate total trays sold for the batch
        const totalTraysSold = await Financial.aggregate([
            { $match: { batch: new mongoose.Types.ObjectId(batchId) } },
            { $group: { _id: null, totalTraysSold: { $sum: "$traysSold" } } },
        ]);

        const traysProduced = eggProduction ? eggProduction.traysProduced : 0;
        const traysSold = totalTraysSold.length > 0 ? totalTraysSold[0].totalTraysSold : 0;
        const traysRemaining = traysProduced - traysSold;

        // Return the tray data
        res.json({ traysProduced, traysSold, traysRemaining });
    } catch (err) {
        console.error('Error in /api/batch/:batchId/trays route:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});
router.post('/financials', async (req, res) => {
    try {
        console.log('Request Body:', req.body);

        // Destructure all fields with null defaults
        const {
            batch,
            date,
            // Egg sales
            eggQty = 0,
            eggPrice = 0,
            eggPaymentMethod = null,
            eggCustomer = null,
            eggAccountType = null,
            // Culled sales
            culledQty = 0,
            culledPrice = 0,
            culledPaymentMethod = null,
            culledCustomer = null,
            culledAccountType = null,
            // Expenses
            feedCost = 0,
            feedPaymentMethod = null,
            feedSupplier = null,
            feedAccountType = null,
            chickCost = 0,
            chickPaymentMethod = null,
            chickSupplier = null,
            chickAccountType = null,
            medicationCost = 0,
            medicationPaymentMethod = null,
            medicationSupplier = null,
            medicationAccountType = null,
            laborCost = 0,
            laborPaymentMethod = null,
            laborStaff = null,
            laborAccountType = null,
            transportCost = 0,
            transportPaymentMethod = null,
            transportSupplier = null,
            transportAccountType = null
        } = req.body;

        // Validate required fields
        if (!batch || !date) {
            return res.status(400).send('Batch and date are required');
        }

        // Get current stock (trays remaining)
        const latestFinancial = await Financial.findOne({ batch }).sort({ date: -1 });
        const currentStock = latestFinancial ? latestFinancial.traysRemaining : 0;
        const sanitizedEggQty = Math.max(0, parseFloat(eggQty) || 0);

        // Validate stock availability
        if (sanitizedEggQty > currentStock) {
            return res.status(400).send(`Not enough stock available. Current stock: ${currentStock} trays`);
        }

        // Calculate new remaining stock
        const newStock = currentStock - sanitizedEggQty;

        // Prepare transactions array
        const transactions = [];

        // Add egg sale transaction if exists
        if (sanitizedEggQty > 0) {
            transactions.push({
                type: 'income',
                category: 'egg',
                amount: sanitizedEggQty * (parseFloat(eggPrice) || 0),
                payment: {
                    method: eggPaymentMethod || 'cash',
                    accountType: eggAccountType || (eggPaymentMethod === 'credit' ? 'receivable' : 'cash'),
                    counterparty: eggCustomer,
                    status: eggPaymentMethod === 'credit' ? 'pending' : 'paid',
                    payments: []
                },
                details: {
                    qty: sanitizedEggQty,
                    unitPrice: parseFloat(eggPrice) || 0
                },
                date: new Date()
            });
        }

        // Add culled sale transaction if exists
        if (parseFloat(culledQty) > 0) {
            transactions.push({
                type: 'income',
                category: 'culled',
                amount: (parseFloat(culledQty) || 0) * (parseFloat(culledPrice) || 0),
                payment: {
                    method: culledPaymentMethod || 'cash',
                    accountType: culledAccountType || (culledPaymentMethod === 'credit' ? 'receivable' : 'cash'),
                    counterparty: culledCustomer,
                    status: culledPaymentMethod === 'credit' ? 'pending' : 'paid',
                    payments: []
                },
                details: {
                    qty: parseFloat(culledQty) || 0,
                    unitPrice: parseFloat(culledPrice) || 0
                },
                date: new Date()
            });
        }

        // Add expense transactions
        const addExpenseTransaction = (category, cost, paymentMethod, accountType, supplier, details = {}) => {
            if (parseFloat(cost) > 0) {
                transactions.push({
                    type: 'expense',
                    category,
                    amount: parseFloat(cost) || 0,
                    payment: {
                        method: paymentMethod || 'cash',
                        accountType: accountType || (paymentMethod === 'credit' ? 'payable' : 'cash'),
                        counterparty: supplier,
                        status: paymentMethod === 'credit' ? 'pending' : 'paid',
                        payments: []
                    },
                    details: {
                        ...details,
                        supplier
                    },
                    date: new Date()
                });
            }
        };

        addExpenseTransaction('feed', feedCost, feedPaymentMethod, feedAccountType, feedSupplier);
        addExpenseTransaction('chick', chickCost, chickPaymentMethod, chickAccountType, chickSupplier);
        addExpenseTransaction('medication', medicationCost, medicationPaymentMethod, medicationAccountType, medicationSupplier);
        addExpenseTransaction('labor', laborCost, laborPaymentMethod, laborAccountType, laborStaff);
        addExpenseTransaction('transport', transportCost, transportPaymentMethod, transportAccountType, transportSupplier);

        // Calculate totals
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const profit = totalIncome - totalExpenses;

        // Get total trays produced (for display purposes)
        const eggProduction = await EggProduction.findOne({ batch }).sort({ date: -1 });
        const totalTraysProduced = eggProduction ? eggProduction.traysProduced : 0;

        // Calculate total trays sold (previous sales + current sale)
        const totalTraysSold = latestFinancial ? 
            (latestFinancial.traysSold + sanitizedEggQty) : 
            sanitizedEggQty;

        // Create complete record
        const financialRecord = {
            batch,
            date: new Date(date),
            transactions,
            totalIncome,
            totalExpenses,
            profit,
            traysProduced: totalTraysProduced,
            traysSold: totalTraysSold,
            traysRemaining: newStock,
            traysProducedDisplay: totalTraysProduced,
            traysSoldDisplay: totalTraysSold,
            traysRemainingDisplay: newStock,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Save to database
        await Financial.create(financialRecord);

        console.log('Financial record saved successfully:', {
            batch,
            date,
            income: totalIncome,
            expenses: totalExpenses,
            profit,
            trays: {
                produced: totalTraysProduced,
                sold: totalTraysSold,
                remaining: newStock
            },
            transactionCount: transactions.length
        });

        res.redirect('/financials');
    } catch (err) {
        console.error('Error saving financial record:', err);
        res.status(500).send('Error saving financial record');
    }
});
// GET route to show edit form
router.get('/financials/edit/:id', async (req, res) => {
    try {
        const record = await Financial.findById(req.params.id).populate('batch');
        const batches = await Batch.find();
        
        if (!record) {
            return res.status(404).send('Financial record not found');
        }
        
        res.render('edit-financial', {
            record,
            batches,
            currentDate: new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error fetching financial record:', error);
        res.status(500).send('Server Error');
    }
});

// DELETE route for financial records
router.delete('/financials/:id', async (req, res) => {
    try {
        await Financial.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting financial record:', error);
        res.status(500).json({ success: false });
    }
});


// Handle financial record update
router.post('/financials/update/:id', async (req, res) => {
    try {
        const { 
            batch, 
            date, 
            totalIncome, 
            totalExpenses,
            eggQty,
            eggPrice,
            eggIncome,
            culledQty,
            culledPrice,
            feedCost,
            chickCost,
            medicationCost,
            laborCost,
            transportCost,
            traysSold
        } = req.body;

        // Calculate remaining values
        const updatedRecord = await Financial.findByIdAndUpdate(
            req.params.id,
            {
                batch,
                date,
                totalIncome,
                totalExpenses,
                eggQty,
                eggPrice,
                eggIncome,
                culledQty,
                culledPrice,
                feedCost,
                chickCost,
                medicationCost,
                laborCost,
                transportCost,
                traysSold,
                profit: totalIncome - totalExpenses
            },
            { new: true }
        );

        res.redirect('/financials');
    } catch (error) {
        console.error('Error updating financial record:', error);
        res.status(500).send('Server Error');
    }
});

 



// Trial Balance with Batch Selection
router.get('/trial-balance', async (req, res) => {
    try {
        const batches = await Batch.find().sort({ batchNo: 1 });
        
        res.render('trial-balance', {
            title: 'Trial Balance',
            batches,
            isBatchSelection: true,
            message: batches.length ? '' : 'No batches available',
            helpers: {
                formatCurrency: (value) => (value || 0).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }),
                formatDate: (date) => date === 'Ongoing' ? date : new Date(date).toLocaleDateString()
            }
        });
    } catch (error) {
        console.error('Error loading batches:', error);
        res.status(500).render('error', {
            message: 'Failed to load batches',
            error: { status: 500 }
        });
    }
});
 
 
 

router.get('/supplier-payments', async (req, res) => {
    const batches = await Batch.find().sort({ batchNo: 1 });
    const templateData = {
        title: 'Supplier Payments - All Batches',
        batches,
        currentBatch: null,
        accountsPayable: [],
        accountsReceivable: [],
        currentDate: new Date().toISOString().split('T')[0],
        errorMessage: null
    };

    try {
        const batchId = req.query.batchId;
        
        if (batchId) {
            if (!mongoose.isValidObjectId(batchId)) {
                templateData.errorMessage = 'Invalid batch ID format';
                return res.render('supplier-payments', templateData);
            }

            templateData.currentBatch = await Batch.findById(batchId);
            
            if (templateData.currentBatch) {
                const batchObjectId = new mongoose.Types.ObjectId(batchId);
                
                // Updated Payable Aggregation
                templateData.accountsPayable = await Financial.aggregate([
                    { $match: { batch: batchObjectId } },
                    { $unwind: '$transactions' },
                    { $match: { 
                        'transactions.type': 'expense',
                        'transactions.payment.accountType': 'payable',
                        'transactions.payment.status': { $ne: 'paid' }
                    }},
                    { $project: {
                        _id: 1,
                        date: 1,
                        transaction: '$transactions',
                        amountDue: {
                            $max: [
                                0,
                                {
                                    $subtract: [
                                        '$transactions.amount',
                                        { $ifNull: [{ $sum: '$transactions.payment.payments.amount' }, 0] }
                                    ]
                                }
                            ]
                        }
                    }}
                ]);
                
                // Updated Receivable Aggregation
                templateData.accountsReceivable = await Financial.aggregate([
                    { $match: { batch: batchObjectId } },
                    { $unwind: '$transactions' },
                    { $match: { 
                        'transactions.type': 'income',
                        'transactions.payment.accountType': 'receivable',
                        'transactions.payment.status': { $ne: 'paid' }
                    }},
                    { $project: {
                        _id: 1,
                        date: 1,
                        transaction: '$transactions',
                        amountDue: {
                            $max: [
                                0,
                                {
                                    $subtract: [
                                        '$transactions.amount',
                                        { $ifNull: [{ $sum: '$transactions.payment.payments.amount' }, 0] }
                                    ]
                                }
                            ]
                        }
                    }}
                ]);

                templateData.title = `Supplier Payments - ${templateData.currentBatch.batchNo}`;
            } else {
                templateData.errorMessage = 'Batch not found';
            }
        }

        res.render('supplier-payments', templateData);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).render('supplier-payments', {
            ...templateData,
            errorMessage: 'Server error loading payments'
        });
    }
});router.post('/record-payment', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        
        const { financialId, transactionId, amount, method, batchId, reference } = req.body;
        
        // Enhanced validation
        if (!financialId || !transactionId || !amount || !method) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields',
                details: {
                    missing: {
                        financialId: !financialId,
                        transactionId: !transactionId,
                        amount: !amount,
                        method: !method
                    }
                }
            });
        }

        // Process payment for both payables and receivables
        const updateResult = await Financial.findOneAndUpdate(
            { _id: financialId, 'transactions._id': transactionId },
            { 
                $push: { 
                    'transactions.$[t].payment.payments': {
                        date: new Date(),
                        amount: parseFloat(amount),
                        method,
                        reference: reference || `PYMT-${Date.now()}`
                    }
                } 
            },
            { 
                arrayFilters: [{ 't._id': transactionId }], 
                new: true 
            }
        );

        if (!updateResult) {
            return res.status(404).json({ 
                success: false,
                error: 'Transaction not found' 
            });
        }

        // Get the specific transaction
        const transaction = updateResult.transactions.id(transactionId);
        
        // Calculate new status (works for both payables and receivables)
        const totalPaid = transaction.payment.payments.reduce((sum, p) => sum + p.amount, 0);
        const amountDue = transaction.amount - totalPaid;
        const newStatus = amountDue <= 0 ? 'paid' : 'partial';

        // Update status if changed
        if (transaction.payment.status !== newStatus) {
            await Financial.updateOne(
                { _id: financialId, 'transactions._id': transactionId },
                { $set: { 'transactions.$.payment.status': newStatus } }
            );
        }

        // Unified response for both types
        res.json({
            success: true,
            transactionType: transaction.type, // 'payable' or 'receivable'
            cleared: amountDue <= 0,
            balance: amountDue,
            status: newStatus,
            message: amountDue > 0 
                ? `Payment recorded. $${amountDue.toFixed(2)} remaining`
                : 'Payment completed!'
        });

    } catch (err) {
        console.error('Payment processing error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Payment processing failed',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


module.exports = router;
