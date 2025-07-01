const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Financial = require('../models/Financial');
const Batch = require('../models/Batch');

// Helper function to get date range based on period
const getDateRange = (period) => {
    const now = new Date();
    switch(period) {
        case 'day':
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            return { start: todayStart, end: todayEnd };
        
        case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            return { start: monthStart, end: monthEnd };
        
        case 'year':
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const yearEnd = new Date(now.getFullYear(), 11, 31);
            yearEnd.setHours(23, 59, 59, 999);
            return { start: yearStart, end: yearEnd };
        
        default:
            return null;
    }
};

// Main trial balance route with batch selection
router.get('/', async (req, res) => {
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

// Trial balance for specific batch with period filtering
router.get('/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const { period } = req.query;
        
        if (!mongoose.Types.ObjectId.isValid(batchId)) {
            return res.status(400).render('error', { 
                message: 'Invalid batch ID',
                error: { status: 400 }
            });
        }

        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).render('error', {
                message: 'Batch not found',
                error: { status: 404 }
            });
        }

        // Apply period filter if specified
        let dateFilter = {};
        if (period && ['day', 'month', 'year'].includes(period)) {
            const { start, end } = getDateRange(period);
            dateFilter = {
                date: { $gte: start, $lte: end }
            };
        }

        const financialRecords = await Financial.find({ 
            batch: batchId,
            ...dateFilter
        }).sort({ date: 1 }).populate('batch');

        if (!financialRecords?.length) {
            return res.status(404).render('error', {
                message: 'No financial records found',
                error: { status: 404 }
            });
        }

        const trialBalance = calculateTrialBalance(financialRecords);
        const transactions = extractTransactions(financialRecords);

        res.render('trial-balance', {
            title: `Trial Balance - ${batch.batchNo}`,
            trialBalance,
            transactions,
            batchInfo: batch,
            period, // Pass period to view
            generatedAt: new Date(),
            isBatchSelection: false,
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
        console.error('Error generating trial balance:', error);
        res.status(500).render('error', { 
            message: 'Failed to generate trial balance',
            error: { status: 500, message: error.message }
        });
    }
});

// Helper function to calculate trial balance
function calculateTrialBalance(financialRecords) {
    const trialBalance = {
        cash: { debit: 0, credit: 0 },
        bank: { debit: 0, credit: 0 },
        accountsReceivable: { debit: 0, credit: 0 },
        accountsPayable: { debit: 0, credit: 0 },
        revenue: { credit: 0 },
        expenses: {
            feed: 0,
            medication: 0,
            labor: 0,
            transport: 0
        }
    };

    financialRecords.forEach(record => {
        record.transactions?.forEach(transaction => {
            if (transaction.type === 'income') {
                if (transaction.category === 'egg') {
                    trialBalance.revenue.credit += transaction.amount || 0;
                }
                
                if (transaction.payment?.method === 'cash') {
                    if (transaction.payment.status === 'paid') {
                        trialBalance.cash.debit += transaction.amount || 0;
                    } else {
                        trialBalance.accountsReceivable.debit += transaction.amount || 0;
                    }
                } else if (transaction.payment?.method === 'bank') {
                    if (transaction.payment.status === 'paid') {
                        trialBalance.bank.debit += transaction.amount || 0;
                    } else {
                        trialBalance.accountsReceivable.debit += transaction.amount || 0;
                    }
                }
            } else if (transaction.type === 'expense') {
                switch(transaction.category) {
                    case 'feed':
                        trialBalance.expenses.feed += transaction.amount || 0;
                        break;
                    case 'medication':
                        trialBalance.expenses.medication += transaction.amount || 0;
                        break;
                    case 'labor':
                        trialBalance.expenses.labor += transaction.amount || 0;
                        break;
                    case 'transport':
                        trialBalance.expenses.transport += transaction.amount || 0;
                        break;
                }
                
                if (transaction.payment?.method === 'cash') {
                    if (transaction.payment.status === 'paid') {
                        trialBalance.cash.credit += transaction.amount || 0;
                    } else {
                        trialBalance.accountsPayable.credit += transaction.amount || 0;
                    }
                } else if (transaction.payment?.method === 'bank') {
                    if (transaction.payment.status === 'paid') {
                        trialBalance.bank.credit += transaction.amount || 0;
                    } else {
                        trialBalance.accountsPayable.credit += transaction.amount || 0;
                    }
                }
            }
        });
    });

    return trialBalance;
}

// Helper function to extract transactions
function extractTransactions(financialRecords) {
    const transactions = [];
    
    financialRecords.forEach(record => {
        record.transactions?.forEach(t => {
            transactions.push({
                date: t.date || record.date,
                batch: { batchNo: record.batch?.batchNo || 'N/A' },
                description: t.description || `${t.type} - ${t.category}`,
                account: `${t.type === 'income' ? 'Revenue' : 'Expense'}: ${t.category}`,
                debit: t.type === 'expense' ? t.amount : 0,
                credit: t.type === 'income' ? t.amount : 0
            });
        });
    });

    return transactions;
}

module.exports = router;