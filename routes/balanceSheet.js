const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Financial = require('../models/Financial');
const Batch = require('../models/Batch');

// Batch selection page with dropdown
router.get('/', async (req, res) => {
    try {
        const batches = await Batch.find().sort({ startDate: -1 });
        
        res.render('balance-sheet', {
            title: 'Select Batch',
            batches,
            message: batches.length ? '' : 'No batches available',
            accountingEquationValid: false, // Default value for selection page
            isBatchSelection: true, // Flag for batch selection view
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

// Balance sheet report for specific batch
router.get('/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        
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

        const financialRecords = await Financial.find({ batch: batchId })
            .sort({ date: 1 })
            .populate('batch');

        if (!financialRecords?.length) {
            return res.status(404).render('error', {
                message: 'No financial records found',
                error: { status: 404 }
            });
        }

        const balanceSheet = buildBalanceSheet(batch, financialRecords);
        renderBalanceSheet(res, batch, balanceSheet);

    } catch (error) {
        console.error('Error generating balance sheet:', error);
        res.status(500).render('error', { 
            message: 'Failed to generate balance sheet',
            error: { status: 500, message: error.message }
        });
    }
});

// Helper functions
function buildBalanceSheet(batch, financialRecords) {
    const balanceSheet = {
        batchInfo: {
            batchId: batch._id,
            batchName: batch.name,
            startDate: batch.startDate,
            endDate: batch.endDate || 'Ongoing',
            batchType: batch.type || 'Standard'
        },
        assets: {
            currentAssets: {
                cash: 0,
                bank: 0,
                accountsReceivable: 0,
                eggInventory: 0,
                otherInventory: 0
            },
            fixedAssets: {
                equipment: 0,
                vehicles: 0
            },
            totalAssets: 0
        },
        liabilities: {
            currentLiabilities: {
                accountsPayable: 0,
                shortTermLoans: 0
            },
            longTermLiabilities: {
                loans: 0
            },
            totalLiabilities: 0
        },
        equity: {
            capital: 0,
            retainedEarnings: 0,
            currentYearProfit: 0,
            totalEquity: 0
        },
        incomeStatement: {
            revenues: {
                eggSales: 0,
                otherSales: 0,
                totalRevenue: 0
            },
            expenses: {
                feed: 0,
                labor: 0,
                medication: 0,
                transportation: 0,
                otherExpenses: 0,
                totalExpenses: 0
            },
            netProfit: 0
        },
        transactionSummary: {
            totalEggTraysProduced: 0,
            totalEggTraysSold: 0,
            totalEggTraysRemaining: 0
        }
    };

    // Process records
    financialRecords.forEach(record => {
        balanceSheet.transactionSummary.totalEggTraysProduced += record.traysProduced || 0;
        balanceSheet.transactionSummary.totalEggTraysSold += record.traysSold || 0;
        balanceSheet.transactionSummary.totalEggTraysRemaining = record.traysRemaining || 0;

        record.transactions?.forEach(transaction => {
            processTransaction(transaction, balanceSheet);
        });
    });

    // Calculate totals
    calculateTotals(balanceSheet);
    return balanceSheet;
}

function processTransaction(transaction, balanceSheet) {
    // Process payment
    if (transaction.payment) {
        const amount = transaction.amount || 0;
        const isIncome = transaction.type === 'income';
        
        if (transaction.payment.method === 'cash') {
            balanceSheet.assets.currentAssets.cash += isIncome ? amount : -amount;
        } else if (transaction.payment.method === 'bank') {
            balanceSheet.assets.currentAssets.bank += isIncome ? amount : -amount;
        }

        if (transaction.payment.status !== 'paid') {
            if (isIncome) {
                balanceSheet.assets.currentAssets.accountsReceivable += amount;
            } else {
                balanceSheet.liabilities.currentLiabilities.accountsPayable += amount;
            }
        }
    }

    // Categorize transaction
    if (transaction.type === 'income') {
        if (transaction.category === 'egg') {
            balanceSheet.incomeStatement.revenues.eggSales += transaction.amount || 0;
        } else {
            balanceSheet.incomeStatement.revenues.otherSales += transaction.amount || 0;
        }
    } else if (transaction.type === 'expense') {
        switch(transaction.category) {
            case 'feed': balanceSheet.incomeStatement.expenses.feed += transaction.amount || 0; break;
            case 'labor': balanceSheet.incomeStatement.expenses.labor += transaction.amount || 0; break;
            case 'medication': balanceSheet.incomeStatement.expenses.medication += transaction.amount || 0; break;
            case 'transport': balanceSheet.incomeStatement.expenses.transportation += transaction.amount || 0; break;
            default: balanceSheet.incomeStatement.expenses.otherExpenses += transaction.amount || 0;
        }
    }

    // Calculate inventory
    if (transaction.category === 'egg' && transaction.type === 'income') {
        const unitPrice = transaction.details?.unitPrice || 0;
        balanceSheet.assets.currentAssets.eggInventory = 
            (balanceSheet.transactionSummary.totalEggTraysRemaining || 0) * unitPrice;
    }
}

function calculateTotals(balanceSheet) {
    // Income Statement
    balanceSheet.incomeStatement.totalRevenue = 
        balanceSheet.incomeStatement.revenues.eggSales + 
        balanceSheet.incomeStatement.revenues.otherSales;
    
    balanceSheet.incomeStatement.totalExpenses = 
        balanceSheet.incomeStatement.expenses.feed +
        balanceSheet.incomeStatement.expenses.labor +
        balanceSheet.incomeStatement.expenses.medication +
        balanceSheet.incomeStatement.expenses.transportation +
        balanceSheet.incomeStatement.expenses.otherExpenses;
    
    balanceSheet.incomeStatement.netProfit = 
        balanceSheet.incomeStatement.totalRevenue - 
        balanceSheet.incomeStatement.totalExpenses;

    // Equity
    balanceSheet.equity.currentYearProfit = balanceSheet.incomeStatement.netProfit;
    balanceSheet.equity.retainedEarnings += balanceSheet.incomeStatement.netProfit;
    balanceSheet.equity.totalEquity = 
        balanceSheet.equity.capital + 
        balanceSheet.equity.retainedEarnings;

    // Assets
    balanceSheet.assets.totalAssets = 
        balanceSheet.assets.currentAssets.cash +
        balanceSheet.assets.currentAssets.bank +
        balanceSheet.assets.currentAssets.accountsReceivable +
        balanceSheet.assets.currentAssets.eggInventory +
        balanceSheet.assets.currentAssets.otherInventory +
        balanceSheet.assets.fixedAssets.equipment +
        balanceSheet.assets.fixedAssets.vehicles;

    // Liabilities
    balanceSheet.liabilities.totalLiabilities = 
        balanceSheet.liabilities.currentLiabilities.accountsPayable +
        balanceSheet.liabilities.currentLiabilities.shortTermLoans +
        balanceSheet.liabilities.longTermLiabilities.loans;
}

function renderBalanceSheet(res, batch, balanceSheet) {
    const accountingEquationValid = Math.abs(
        balanceSheet.assets.totalAssets - 
        (balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity)
    ) < 0.01;

    res.render('balance-sheet', {
        title: `Balance Sheet - ${batch.name}`,
        balanceSheet,
        accountingEquationValid,
        generatedAt: new Date(),
        isBatchSelection: false, // Flag for balance sheet view
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
}

module.exports = router;