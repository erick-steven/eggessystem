
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
            return res.status(400).json({ error: 'Batch and date are required' });
        }

        // Validate batch ID format
        if (!mongoose.Types.ObjectId.isValid(batch)) {
            return res.status(400).json({ error: 'Invalid batch ID format' });
        }

        // Convert to ObjectId
        const batchId = new mongoose.Types.ObjectId(batch);

        // Get ACTUAL stock from production and sales
        const [productionSummary, salesSummary] = await Promise.all([
            EggProduction.aggregate([
                { $match: { batch: batchId } },
                { $group: { _id: null, totalProduced: { $sum: "$traysDecimal" } } }
            ]),
            Financial.aggregate([
                { $match: { batch: batchId } },
                { $group: { _id: null, totalSold: { $sum: "$traysSold" } } }
            ])
        ]);

        const totalProduced = productionSummary[0]?.totalProduced || 0;
        const totalSold = salesSummary[0]?.totalSold || 0;
        const currentStock = totalProduced - totalSold;
        const sanitizedEggQty = Math.max(0, parseFloat(eggQty) || 0);

        // Validate stock availability
        if (sanitizedEggQty > currentStock) {
            return res.status(400).json({ 
                error: `Not enough stock available. Current stock: ${currentStock.toFixed(2)} trays`,
                availableStock: currentStock,
                requested: sanitizedEggQty
            });
        }

        // Prepare transactions array
        const transactions = [];

        // Helper function to create payment object
        const createPaymentObject = (method, accountType, counterparty) => ({
            method: method || 'cash',
            accountType: accountType || (method === 'credit' ? 
                                      (method === 'credit' ? 'receivable' : 'payable') : 'cash'),
            counterparty,
            status: method === 'credit' ? 'pending' : 'paid',
            payments: []
        });

        // Add egg sale transaction if exists
        if (sanitizedEggQty > 0) {
            transactions.push({
                type: 'income',
                category: 'egg',
                amount: sanitizedEggQty * (parseFloat(eggPrice) || 0),
                payment: createPaymentObject(eggPaymentMethod, eggAccountType, eggCustomer),
                details: {
                    qty: sanitizedEggQty,
                    unitPrice: parseFloat(eggPrice) || 0
                },
                date: new Date(date)
            });
        }

        // Add culled sale transaction if exists
        if (parseFloat(culledQty) > 0) {
            transactions.push({
                type: 'income',
                category: 'culled',
                amount: (parseFloat(culledQty) || 0) * (parseFloat(culledPrice) || 0),
                payment: createPaymentObject(culledPaymentMethod, culledAccountType, culledCustomer),
                details: {
                    qty: parseFloat(culledQty) || 0,
                    unitPrice: parseFloat(culledPrice) || 0
                },
                date: new Date(date)
            });
        }

        // Expense transaction helper
        const addExpenseTransaction = (category, cost, paymentMethod, accountType, supplier) => {
            const amount = parseFloat(cost) || 0;
            if (amount > 0) {
                transactions.push({
                    type: 'expense',
                    category,
                    amount,
                    payment: createPaymentObject(paymentMethod, accountType, supplier),
                    details: { supplier },
                    date: new Date(date)
                });
            }
        };

        // Add all expense transactions
        addExpenseTransaction('feed', feedCost, feedPaymentMethod, feedAccountType, feedSupplier);
        addExpenseTransaction('chick', chickCost, chickPaymentMethod, chickAccountType, chickSupplier);
        addExpenseTransaction('medication', medicationCost, medicationPaymentMethod, medicationAccountType, medicationSupplier);
        addExpenseTransaction('labor', laborCost, laborPaymentMethod, laborAccountType, laborStaff);
        addExpenseTransaction('transport', transportCost, transportPaymentMethod, transportAccountType, transportSupplier);

        // Create new financial record
        const financialRecord = new Financial({
            batch: batchId,
            date: new Date(date),
            transactions
        });

        // Save the record (pre-save hooks will handle calculations)
        await financialRecord.save();

        // Successful response
        res.status(201).json({
            success: true,
            message: 'Financial record saved successfully',
            recordId: financialRecord._id,
            financialSummary: {
                totalIncome: financialRecord.totalIncome,
                totalExpenses: financialRecord.totalExpenses,
                profit: financialRecord.profit
            },
            inventorySummary: {
                traysProduced: totalProduced,
                traysSold: financialRecord.traysSold,
                traysRemaining: financialRecord.traysRemaining,
                lastProductionDate: financialRecord.date
            },
            transactions: {
                count: financialRecord.transactions.length,
                types: {
                    income: financialRecord.transactions.filter(t => t.type === 'income').length,
                    expense: financialRecord.transactions.filter(t => t.type === 'expense').length
                }
            }
        });

    } catch (err) {
        console.error('Error saving financial record:', err);
        
        // Handle specific error types
        let errorMessage = 'Error saving financial record';
        let statusCode = 500;
        
        if (err.name === 'ValidationError') {
            statusCode = 400;
            errorMessage = Object.values(err.errors).map(val => val.message).join(', ');
        } else if (err.name === 'CastError') {
            statusCode = 400;
            errorMessage = 'Invalid data format';
        }

        res.status(statusCode).json({ 
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
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
