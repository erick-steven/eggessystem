const Batch = require('../models/Batch');
const EggProduction = require('../models/EggProduction');
const Financial = require('../models/Financial');

// ======================
// CORE HELPER FUNCTIONS
// ======================

const getDateRange = (dateRange, startDate, endDate) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    switch(dateRange) {
        case 'today':
            return {
                start: now,
                end: new Date(now.getTime() + 86400000) // +1 day
            };
        case 'week':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            return { start: startOfWeek, end: endOfWeek };
        case 'month':
            return {
                start: new Date(now.getFullYear(), now.getMonth(), 1),
                end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
            };
        case 'year':
            return {
                start: new Date(now.getFullYear(), 0, 1),
                end: new Date(now.getFullYear() + 1, 0, 1)
            };
        case 'custom':
            return {
                start: startDate ? new Date(startDate) : null,
                end: endDate ? new Date(endDate) : null
            };
        default:
            return { start: null, end: null };
    }
};

// ======================
// FINANCIAL HELPERS
// ======================

const generateFinancialRecommendations = (profitMargin, totalExpenses, feedCost, laborCost) => {
    let recommendations = [];
    if (profitMargin < 15) {
        recommendations.push("Profit margin is below target (15%). Consider:");
        if (feedCost/totalExpenses > 0.6) {
            recommendations.push("- Reduce feed costs through bulk purchasing");
        }
        if (laborCost/totalExpenses > 0.25) {
            recommendations.push("- Improve labor efficiency");
        }
        recommendations.push("- Explore premium markets");
    } else if (profitMargin > 25) {
        recommendations.push("Excellent profitability! Consider:");
        recommendations.push("- Equipment upgrades");
        recommendations.push("- Expanding production");
    } else {
        recommendations.push("Healthy financial performance");
    }
    return recommendations;
};

const generateFinancialSummary = (financialData) => {
    const processedData = financialData.map(entry => ({
        totalIncome: entry.totalIncome || 0,
        totalExpenses: entry.totalExpenses || 0,
        profit: entry.profit || 0,
        eggIncome: entry.eggIncome || 0,
        culledIncome: entry.culledIncome || 0,
        feedCost: entry.feedCost || 0,
        laborCost: entry.laborCost || 0,
        medicationCost: entry.medicationCost || 0
    }));

    const totalIncome = processedData.reduce((sum, e) => sum + e.totalIncome, 0);
    const totalExpenses = processedData.reduce((sum, e) => sum + e.totalExpenses, 0);
    const profit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
    
    return {
        totalIncome,
        totalExpenses,
        profit,
        profitMargin,
        feedCost: processedData.reduce((sum, e) => sum + e.feedCost, 0),
        laborCost: processedData.reduce((sum, e) => sum + e.laborCost, 0),
        medicationCost: processedData.reduce((sum, e) => sum + e.medicationCost, 0),
        recommendations: generateFinancialRecommendations(
            profitMargin, 
            totalExpenses,
            processedData.reduce((sum, e) => sum + e.feedCost, 0),
            processedData.reduce((sum, e) => sum + e.laborCost, 0)
        )
    };
};

// ======================
// EGG PRODUCTION HELPERS
// ======================

const calculateWcLayerPercentage = (currentDate, batchDate) => {
    const layerAge = Math.floor((new Date(currentDate) - new Date(batchDate)) / (1000 * 60 * 60 * 24 * 7));
    if (layerAge <= 20) return 50;
    if (layerAge <= 30) return 85;
    if (layerAge <= 60) return 80;
    if (layerAge <= 80) return 60;
    return 30;
};

const generateEggProductionAnalysis = (entry, batch) => {
    const layerAge = Math.floor((new Date(entry.date) - new Date(batch.date)) / (1000 * 60 * 60 * 24 * 7));
    const eggProductionPercentage = ((entry.totalEggs / batch.totalNumber) * 100).toFixed(2);
    
    let lifeStage = "", expectedRange = "", feedback = "";
    
    if (layerAge <= 6) {
        lifeStage = "Chick (Brooding)";
        expectedRange = "No eggs expected";
        feedback = "Focus on growth and health";
    } else if (layerAge <= 16) {
        lifeStage = "Grower Stage";
        expectedRange = "No eggs expected";
        feedback = "Monitor growth rates";
    } else if (layerAge <= 20) {
        lifeStage = "Pre-laying Stage";
        expectedRange = "First eggs begin";
        feedback = eggProductionPercentage > 0 ? "Good start" : "Monitor for first eggs";
    } else if (layerAge <= 30) {
        lifeStage = "Peak Production";
        expectedRange = "85-95%";
        feedback = eggProductionPercentage >= 85 ? "Excellent production" : "Check feed and health";
    } else if (layerAge <= 72) {
        lifeStage = "Laying Period";
        expectedRange = "80-90%";
        feedback = eggProductionPercentage >= 80 ? "Good production" : "Review management";
    } else {
        lifeStage = "Late Laying Stage";
        expectedRange = "60-75%";
        feedback = eggProductionPercentage >= 60 ? "Normal for age" : "Consider replacement";
    }
    
    return `${lifeStage}. Expected: ${expectedRange}. Current: ${eggProductionPercentage}%. ${feedback}.`;
};

// ======================
// FORMATTING HELPERS
// ======================

const formatDate = (date) => date?.toLocaleDateString() || 'N/A';
const formatNumber = (num) => num?.toLocaleString() || '0';
const formatPercentage = (num) => num?.toFixed(2) + '%' || '0%';

// ======================
// CONTROLLER METHODS
// ======================

exports.generateReport = async (req, res) => {
    try {
        const { batch: batchId, search, dateRange, startDate, endDate } = req.query;
        
        // Get date range filter
        const { start, end } = getDateRange(dateRange, startDate, endDate);
        
        // Get batches
        const batchQuery = search ? {
            $or: [
                { batchNo: new RegExp(search, 'i') },
                { grade: new RegExp(search, 'i') }
            ]
        } : {};
        
        const [allBatches, selectedBatch] = await Promise.all([
            Batch.find(batchQuery).sort({ batchNo: 1 }),
            batchId ? Batch.findById(batchId) : Promise.resolve(null)
        ]);

        if (batchId && !selectedBatch) {
            return res.status(404).render('error', { message: 'Batch not found' });
        }
        
        // Get data with date filtering
        const dateFilter = start && end ? { date: { $gte: start, $lte: end } } : {};
        const dataPromises = selectedBatch ? [
            EggProduction.find({ batch: selectedBatch._id, ...dateFilter }).sort({ date: 1 }),
            Financial.find({ batch: selectedBatch._id, ...dateFilter }).sort({ date: 1 })
        ] : [Promise.resolve([]), Promise.resolve([])];
        
        const [eggData, rawFinancialData] = await Promise.all(dataPromises);
        
        // Process financial data with defaults
        const financialData = rawFinancialData.map(entry => ({
            ...entry.toObject(),
            totalIncome: entry.totalIncome || 0,
            totalExpenses: entry.totalExpenses || 0,
            profit: entry.profit || 0,
            eggIncome: entry.eggIncome || 0,
            culledIncome: entry.culledIncome || 0,
            feedCost: entry.feedCost || 0,
            laborCost: entry.laborCost || 0
        }));
        
        // Generate financial summary
        const financialSummary = financialData.length > 0 
            ? generateFinancialSummary(financialData) 
            : null;

        // Render report with all data and helpers
        res.render('report', {
            allBatches,
            selectedBatch,
            selectedBatchId: batchId,
            eggData,
            financialData,
            financialSummary,
            searchQuery: search,
            dateRange,
            startDate: start,
            endDate: end,
            helpers: {
                calculateWcLayerPercentage,
                generateEggProductionAnalysis,
                formatDate,
                formatNumber,
                formatPercentage
            }
        });
        
    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).render('error', { 
            message: 'Error generating report',
            error: err.message 
        });
    }
};

exports.exportReport = async (req, res) => {
    try {
        const { batch: batchId, dateRange, startDate, endDate } = req.query;
        
        if (!batchId) return res.status(400).json({ error: 'Batch ID required' });
        
        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        
        const { start, end } = getDateRange(dateRange, startDate, endDate);
        const dateFilter = start && end ? { date: { $gte: start, $lte: end } } : {};
        
        const [eggData, financialData] = await Promise.all([
            EggProduction.find({ batch: batchId, ...dateFilter }).sort({ date: 1 }),
            Financial.find({ batch: batchId, ...dateFilter }).sort({ date: 1 })
        ]);
        
        // Generate CSV
        let csv = `Batch Report: ${batch.batchNo}\n\n`;
        csv += 'Egg Production Data\nDate,Total Eggs,Good %,Bad %,Weight,WC %\n';
        eggData.forEach(e => csv += `${e.date.toISOString().split('T')[0]},${e.totalEggs},${e.goodEggsPercent},${e.badEggsPercent},${e.weight},${calculateWcLayerPercentage(e.date, batch.date)}\n`);
        
        csv += '\nFinancial Data\nDate,Income,Expenses,Profit,Egg Income,Culled Income\n';
        financialData.forEach(f => csv += `${f.date.toISOString().split('T')[0]},${f.totalIncome||0},${f.totalExpenses||0},${f.profit||0},${f.eggIncome||0},${f.culledIncome||0}\n`);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=batch_${batch.batchNo}_report.csv`);
        res.status(200).send(csv);
        
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Export failed', details: err.message });
    }
};