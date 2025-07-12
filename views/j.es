<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced Batch Report</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome for Icons -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <!-- Date Range Picker -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css">
    <!-- Custom CSS -->
    <style>
        :root {
            --primary-color: #3498db;
            --secondary-color: #2c3e50;
            --success-color: #27ae60;
            --warning-color: #f39c12;
            --danger-color: #e74c3c;
            --light-bg: #f8f9fa;
        }
        
        body {
            background-color: #f5f7fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
            margin-top: 30px;
            padding: 30px;
        }
        
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .report-title {
            color: var(--secondary-color);
            font-weight: 700;
            margin: 0;
        }
        
        .report-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn-export {
            background-color: var(--success-color);
            color: white;
        }
        
        .btn-print {
            background-color: var(--primary-color);
            color: white;
        }
        
        .date-range-container {
            background-color: var(--light-bg);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            margin-bottom: 25px;
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card-header {
            background-color: var(--secondary-color);
            color: white;
            border-radius: 10px 10px 0 0 !important;
            font-weight: 600;
        }
        
        .table th {
            background-color: var(--secondary-color);
            color: white;
            font-weight: 500;
        }
        
        .table-hover tbody tr:hover {
            background-color: rgba(52, 152, 219, 0.1);
        }
        
        .badge-success {
            background-color: var(--success-color);
        }
        
        .badge-warning {
            background-color: var(--warning-color);
        }
        
        .badge-danger {
            background-color: var(--danger-color);
        }
        
        .analysis-row {
            background-color: #f8f9fa;
            font-size: 14px;
        }
        
        .progress {
            height: 10px;
            border-radius: 5px;
        }
        
        .progress-bar {
            border-radius: 5px;
        }
        
        .chart-container {
            height: 300px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            text-align: center;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .stat-card i {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }
        
        .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
        }
        
        .stat-card .label {
            font-size: 0.9rem;
            color: #6c757d;
        }
        
        .health-indicator {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .health-indicator .indicator {
            width: 15px;
            height: 15px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .health-indicator.good .indicator {
            background-color: var(--success-color);
        }
        
        .health-indicator.warning .indicator {
            background-color: var(--warning-color);
        }
        
        .health-indicator.danger .indicator {
            background-color: var(--danger-color);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .report-header {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .report-actions {
                margin-top: 15px;
                width: 100%;
                justify-content: flex-end;
            }
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
            background: var(--primary-color);
            border-radius: 10px;
        }
        
        /* Animation */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .animated-section {
            animation: fadeIn 0.6s ease-out forwards;
        }
        
        /* Tooltip */
        .tooltip-inner {
            max-width: 300px;
            padding: 10px;
            background-color: var(--secondary-color);
        }
        
        /* Tabs */
        .nav-tabs .nav-link {
            color: var(--secondary-color);
            border: none;
            padding: 10px 20px;
        }
        
        .nav-tabs .nav-link.active {
            color: var(--primary-color);
            border-bottom: 3px solid var(--primary-color);
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container my-5">
        <div class="report-header">
            <h1 class="report-title"><i class="fas fa-file-alt me-2"></i>Advanced Batch Report</h1>
            <div class="report-actions">
                <button class="btn btn-export btn-sm"><i class="fas fa-file-export me-1"></i> Export</button>
                <button class="btn btn-print btn-sm"><i class="fas fa-print me-1"></i> Print</button>
            </div>
        </div>
        
        <!-- Date Range Picker -->
        <div class="date-range-container animated-section">
            <form action="/report" method="GET">
                <div class="row">
                    <div class="col-md-4">
                        <label for="batchDropdown" class="form-label"><i class="fas fa-layer-group me-2"></i>Select Batch</label>
                        <select name="batch" class="form-control select-dropdown" id="batchDropdown">
                            <option value="">All Batches</option>
                            <% allBatches.forEach(b => { %>
                                <option value="<%= b._id %>" <%= selectedBatchId == b._id ? 'selected' : '' %>>
                                    <%= b.batchNo %>
                                </option>
                            <% }) %>
                        </select>
                    </div>
                    <div class="col-md-5">
                        <label for="dateRange" class="form-label"><i class="far fa-calendar-alt me-2"></i>Date Range</label>
                        <input type="text" class="form-control" id="dateRange" name="dateRange" 
                               value="<%= startDate ? new Date(startDate).toLocaleDateString() + ' - ' + new Date(endDate).toLocaleDateString() : '' %>">
                    </div>
                    <div class="col-md-3 d-flex align-items-end">
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="fas fa-sync-alt me-2"></i> Generate Report
                        </button>
                    </div>
                </div>
            </form>
        </div>
        
        <% if (selectedBatch) { %>
        <!-- Summary Stats -->
        <div class="row animated-section">
            <div class="col-md-3">
                <div class="stat-card bg-light-primary">
                    <i class="fas fa-egg text-primary"></i>
                    <div class="value"><%= eggData.reduce((sum, entry) => sum + entry.totalEggs, 0).toLocaleString() %></div>
                    <div class="label">Total Eggs Produced</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card bg-light-success">
                    <i class="fas fa-dollar-sign text-success"></i>
                    <div class="value"><%= financialData.reduce((sum, entry) => sum + entry.profit, 0).toLocaleString() %></div>
                    <div class="label">Total Profit</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card bg-light-warning">
                    <i class="fas fa-skull-crossbones text-warning"></i>
                    <div class="value"><%= selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0) %></div>
                    <div class="label">Total Deaths</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card bg-light-info">
                    <i class="fas fa-percentage text-info"></i>
                    <div class="value"><%= ((selectedBatch.totalNumber - selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0)) / selectedBatch.totalNumber * 100).toFixed(1) %>%</div>
                    <div class="label">Survival Rate</div>
                </div>
            </div>
        </div>
        
        <!-- Tab Navigation -->
        <ul class="nav nav-tabs mt-4" id="reportTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="overview-tab" data-bs-toggle="tab" data-bs-target="#overview" type="button" role="tab">Overview</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="production-tab" data-bs-toggle="tab" data-bs-target="#production" type="button" role="tab">Egg Production</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="financial-tab" data-bs-toggle="tab" data-bs-target="#financial" type="button" role="tab">Financials</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="mortality-tab" data-bs-toggle="tab" data-bs-target="#mortality" type="button" role="tab">Mortality</button>
            </li>
        </ul>
        
        <!-- Tab Content -->
        <div class="tab-content mt-3" id="reportTabsContent">
            <!-- Overview Tab -->
            <div class="tab-pane fade show active" id="overview" role="tabpanel">
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <i class="fas fa-info-circle me-2"></i>Batch Details
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <tbody>
                                            <tr>
                                                <th>Batch Number</th>
                                                <td><%= selectedBatch.batchNo %></td>
                                            </tr>
                                            <tr>
                                                <th>Breed</th>
                                                <td><%= selectedBatch.grade %></td>
                                            </tr>
                                            <tr>
                                                <th>Age</th>
                                                <td><%= selectedBatch.age %> weeks</td>
                                            </tr>
                                            <tr>
                                                <th>Initial Quantity</th>
                                                <td><%= selectedBatch.totalNumber.toLocaleString() %></td>
                                            </tr>
                                            <tr>
                                                <th>Current Quantity</th>
                                                <td><%= (selectedBatch.totalNumber - selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0)).toLocaleString() %></td>
                                            </tr>
                                            <tr>
                                                <th>Start Date</th>
                                                <td><%= selectedBatch.date.toLocaleDateString() %></td>
                                            </tr>
                                            <tr>
                                                <th>Survival Rate</th>
                                                <td>
                                                    <div class="progress">
                                                        <div class="progress-bar bg-success" role="progressbar" 
                                                             style="width: <%= ((selectedBatch.totalNumber - selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0)) / selectedBatch.totalNumber * 100) %>%" 
                                                             aria-valuenow="<%= ((selectedBatch.totalNumber - selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0)) / selectedBatch.totalNumber * 100) %>" 
                                                             aria-valuemin="0" aria-valuemax="100">
                                                        </div>
                                                    </div>
                                                    <%= ((selectedBatch.totalNumber - selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0)) / selectedBatch.totalNumber * 100).toFixed(1) %>%
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <i class="fas fa-chart-line me-2"></i>Key Performance Indicators
                            </div>
                            <div class="card-body">
                                <div class="health-indicator good">
                                    <div class="indicator"></div>
                                    <div>
                                        <strong>Egg Production Rate:</strong> 
                                        <%= (eggData.reduce((sum, entry) => sum + entry.totalEggs, 0) / selectedBatch.totalNumber / eggData.length * 100).toFixed(1) %>% daily average
                                    </div>
                                </div>
                                <div class="health-indicator <%= selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0) / selectedBatch.totalNumber * 100 > 5 ? 'warning' : 'good' %>">
                                    <div class="indicator"></div>
                                    <div>
                                        <strong>Mortality Rate:</strong> 
                                        <%= (selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0) / selectedBatch.totalNumber * 100).toFixed(1) %>% 
                                        (Industry standard: <5%)
                                    </div>
                                </div>
                                <div class="health-indicator <%= (financialData.reduce((sum, entry) => sum + entry.profit, 0) / (financialData.reduce((sum, entry) => sum + entry.totalIncome, 0) || 1) * 100) < 15 ? 'warning' : 'good' %>">
                                    <div class="indicator"></div>
                                    <div>
                                        <strong>Profit Margin:</strong> 
                                        <%= (financialData.reduce((sum, entry) => sum + entry.profit, 0) / (financialData.reduce((sum, entry) => sum + entry.totalIncome, 0) || 1 * 100).toFixed(1) %>% 
                                        (Target: >15%)
                                    </div>
                                </div>
                                <div class="health-indicator <%= (eggData.reduce((sum, entry) => sum + entry.badEggsPercent, 0) / eggData.length) > 5 ? 'warning' : 'good' %>">
                                    <div class="indicator"></div>
                                    <div>
                                        <strong>Egg Quality:</strong> 
                                        <%= (eggData.reduce((sum, entry) => sum + entry.badEggsPercent, 0) / eggData.length).toFixed(1) %>% bad eggs 
                                        (Target: <5%)
                                    </div>
                                </div>
                                
                                <hr>
                                <h6><i class="fas fa-lightbulb me-2"></i>Recommendations</h6>
                                <ul class="list-group list-group-flush">
                                    <% if (selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0) / selectedBatch.totalNumber * 100 > 5) { %>
                                        <li class="list-group-item">
                                            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                                            High mortality rate detected. Review health management practices.
                                        </li>
                                    <% } %>
                                    <% if ((financialData.reduce((sum, entry) => sum + entry.profit, 0) / (financialData.reduce((sum, entry) => sum + entry.totalIncome, 0) || 1) * 100) < 15) { %>
                                        <li class="list-group-item">
                                            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                                            Profit margin below target. Consider cost optimization strategies.
                                        </li>
                                    <% } %>
                                    <% if ((eggData.reduce((sum, entry) => sum + entry.badEggsPercent, 0) / eggData.length) > 5) { %>
                                        <li class="list-group-item">
                                            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                                            Egg quality could be improved. Check handling and storage practices.
                                        </li>
                                    <% } %>
                                    <% if (eggData.length > 0 && (eggData[eggData.length-1].totalEggs / selectedBatch.totalNumber * 100) < 70) { %>
                                        <li class="list-group-item">
                                            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                                            Recent egg production seems low for age. Review feed and environment.
                                        </li>
                                    <% } %>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Charts Section -->
                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <i class="fas fa-chart-bar me-2"></i>Egg Production Trend
                            </div>
                            <div class="card-body">
                                <div class="chart-container" id="eggProductionChart">
                                    <!-- Chart will be rendered here by JavaScript -->
                                    <canvas id="eggChartCanvas"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <i class="fas fa-chart-pie me-2"></i>Mortality Causes
                            </div>
                            <div class="card-body">
                                <div class="chart-container" id="mortalityChart">
                                    <!-- Chart will be rendered here by JavaScript -->
                                    <canvas id="mortalityChartCanvas"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Egg Production Tab -->
            <div class="tab-pane fade" id="production" role="tabpanel">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-egg me-2"></i>Egg Production Details
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Total Eggs</th>
                                        <th>Good Eggs</th>
                                        <th>Bad Eggs</th>
                                        <th>Weight (kg)</th>
                                        <th>Production %</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <% eggData.forEach(entry => { 
                                        const productionPercentage = (entry.totalEggs / selectedBatch.totalNumber * 100).toFixed(1);
                                        let statusClass = '';
                                        if (productionPercentage > 80) statusClass = 'success';
                                        else if (productionPercentage > 60) statusClass = 'warning';
                                        else statusClass = 'danger';
                                    %>
                                    <tr>
                                        <td><%= entry.date.toLocaleDateString() %></td>
                                        <td><%= entry.totalEggs.toLocaleString() %></td>
                                        <td><%= entry.goodEggsPercent %>%</td>
                                        <td><%= entry.badEggsPercent %>%</td>
                                        <td><%= entry.weight %></td>
                                        <td><%= productionPercentage %>%</td>
                                        <td>
                                            <span class="badge bg-<%= statusClass %>">
                                                <% if (statusClass === 'success') { %>
                                                    Excellent
                                                <% } else if (statusClass === 'warning') { %>
                                                    Average
                                                <% } else { %>
                                                    Poor
                                                <% } %>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr class="analysis-row">
                                        <td colspan="7">
                                            <strong>Analysis:</strong> 
                                            <% if (statusClass === 'success') { %>
                                                Production is excellent. Keep up the good management practices.
                                            <% } else if (statusClass === 'warning') { %>
                                                Production is average. Check for potential issues in feed, water, or environment.
                                            <% } else { %>
                                                Production is below expectations. Immediate review of flock health and management practices recommended.
                                            <% } %>
                                            Expected range for this age: <%= getExpectedProductionRange(selectedBatch.age) %>.
                                        </td>
                                    </tr>
                                    <% }) %>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Financials Tab -->
            <div class="tab-pane fade" id="financial" role="tabpanel">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-dollar-sign me-2"></i>Financial Details
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Income</th>
                                        <th>Expenses</th>
                                        <th>Profit</th>
                                        <th>Egg Qty</th>
                                        <th>Egg Income</th>
                                        <th>Culled Income</th>
                                        <th>Feed Cost</th>
                                        <th>Margin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <% financialData.forEach(entry => { 
                                        const margin = (entry.profit / entry.totalIncome * 100).toFixed(1);
                                        let marginClass = '';
                                        if (margin > 20) marginClass = 'success';
                                        else if (margin > 10) marginClass = 'warning';
                                        else marginClass = 'danger';
                                    %>
                                    <tr>
                                        <td><%= entry.date.toLocaleDateString() %></td>
                                        <td><%= entry.totalIncome.toLocaleString() %></td>
                                        <td><%= entry.totalExpenses.toLocaleString() %></td>
                                        <td><%= entry.profit.toLocaleString() %></td>
                                        <td><%= entry.eggQty.toLocaleString() %></td>
                                        <td><%= entry.eggIncome.toLocaleString() %></td>
                                        <td><%= entry.culledIncome.toLocaleString() %></td>
                                        <td><%= entry.feedCost.toLocaleString() %></td>
                                        <td>
                                            <span class="badge bg-<%= marginClass %>">
                                                <%= margin %>%
                                            </span>
                                        </td>
                                    </tr>
                                    <% }) %>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Financial Summary -->
                        <div class="row mt-4">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <i class="fas fa-chart-pie me-2"></i>Expense Breakdown
                                    </div>
                                    <div class="card-body">
                                        <div class="chart-container">
                                            <canvas id="expenseChartCanvas"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <i class="fas fa-lightbulb me-2"></i>Financial Recommendations
                                    </div>
                                    <div class="card-body">
                                        <% 
                                            const totalFeedCost = financialData.reduce((sum, entry) => sum + entry.feedCost, 0);
                                            const totalExpenses = financialData.reduce((sum, entry) => sum + entry.totalExpenses, 0);
                                            const feedPercentage = (totalFeedCost / totalExpenses * 100).toFixed(1);
                                            
                                            const totalLaborCost = financialData.reduce((sum, entry) => sum + entry.laborCost, 0);
                                            const laborPercentage = (totalLaborCost / totalExpenses * 100).toFixed(1);
                                        %>
                                        
                                        <% if (feedPercentage > 60) { %>
                                            <div class="alert alert-warning">
                                                <h6><i class="fas fa-exclamation-triangle me-2"></i>High Feed Costs (<%= feedPercentage %>%)</h6>
                                                <p>Feed accounts for a significant portion of your expenses. Consider:</p>
                                                <ul>
                                                    <li>Bulk purchasing discounts</li>
                                                    <li>Alternative feed suppliers</li>
                                                    <li>Feed efficiency optimization</li>
                                                </ul>
                                            </div>
                                        <% } %>
                                        
                                        <% if (laborPercentage > 25) { %>
                                            <div class="alert alert-warning">
                                                <h6><i class="fas fa-exclamation-triangle me-2"></i>High Labor Costs (<%= laborPercentage %>%)</h6>
                                                <p>Labor costs are higher than industry benchmarks. Consider:</p>
                                                <ul>
                                                    <li>Process automation</li>
                                                    <li>Efficiency improvements</li>
                                                    <li>Cross-training staff</li>
                                                </ul>
                                            </div>
                                        <% } %>
                                        
                                        <div class="alert alert-success">
                                            <h6><i class="fas fa-check-circle me-2"></i>Profit Optimization</h6>
                                            <p>To improve profitability:</p>
                                            <ul>
                                                <li>Explore premium markets for eggs</li>
                                                <li>Consider value-added products</li>
                                                <li>Review pricing strategy</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Mortality Tab -->
            <div class="tab-pane fade" id="mortality" role="tabpanel">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-skull-crossbones me-2"></i>Mortality Records
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Number Dead</th>
                                        <th>Reason</th>
                                        <th>Notes</th>
                                        <th>Action Taken</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <% selectedBatch.deathRecords.forEach(record => { 
                                        let reason = record.reason;
                                        if (reason === 'Other' && record.otherReason) {
                                            reason = record.otherReason;
                                        }
                                    %>
                                    <tr>
                                        <td><%= record.date.toLocaleDateString() %></td>
                                        <td><%= record.count %></td>
                                        <td><%= reason %></td>
                                        <td><%= record.notes || 'N/A' %></td>
                                        <td>
                                            <% if (record.reason === 'Disease') { %>
                                                <span class="badge bg-danger">Vet Consulted</span>
                                            <% } else if (record.reason === 'Heat Stress') { %>
                                                <span class="badge bg-warning">Cooling Improved</span>
                                            <% } else { %>
                                                <span class="badge bg-info">Reviewed</span>
                                            <% } %>
                                        </td>
                                    </tr>
                                    <tr class="analysis-row">
                                        <td colspan="5">
                                            <strong>Recommendations:</strong> 
                                            <% if (record.reason === 'Disease') { %>
                                                Implement biosecurity measures and consider vaccination program.
                                            <% } else if (record.reason === 'Heat Stress') { %>
                                                Improve ventilation and provide cooling systems during hot periods.
                                            <% } else if (record.reason === 'Cold Stress') { %>
                                                Enhance insulation and heating in poultry house during cold weather.
                                            <% } else if (record.reason === 'Predator') { %>
                                                Strengthen security measures and predator-proof the housing.
                                            <% } else { %>
                                                Monitor closely for patterns and consult with poultry health expert.
                                            <% } %>
                                        </td>
                                    </tr>
                                    <% }) %>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Mortality Analysis -->
                        <div class="row mt-4">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <i class="fas fa-chart-line me-2"></i>Mortality Trend
                                    </div>
                                    <div class="card-body">
                                        <div class="chart-container">
                                            <canvas id="mortalityTrendChartCanvas"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <i class="fas fa-lightbulb me-2"></i>Health Recommendations
                                    </div>
                                    <div class="card-body">
                                        <% 
                                            const deathByCause = {};
                                            selectedBatch.deathRecords.forEach(record => {
                                                const reason = record.reason === 'Other' && record.otherReason ? 
                                                    record.otherReason : record.reason;
                                                deathByCause[reason] = (deathByCause[reason] || 0) + record.count;
                                            });
                                            
                                            const totalDeaths = selectedBatch.deathRecords.reduce((sum, record) => sum + record.count, 0);
                                            const mortalityRate = (totalDeaths / selectedBatch.totalNumber * 100).toFixed(1);
                                        %>
                                        
                                        <% if (mortalityRate > 5) { %>
                                            <div class="alert alert-danger">
                                                <h6><i class="fas fa-exclamation-circle me-2"></i>High Mortality Rate (<%= mortalityRate %>%)</h6>
                                                <p>Your mortality rate exceeds the recommended 5% threshold. Key causes:</p>
                                                <ul>
                                                    <% Object.entries(deathByCause).forEach(([cause, count]) => { %>
                                                        <li><%= cause %>: <%= count %> birds (<%= (count / totalDeaths * 100).toFixed(1) %>%)</li>
                                                    <% }) %>
                                                </ul>
                                            </div>
                                        <% } else { %>
                                            <div class="alert alert-success">
                                                <h6><i class="fas fa-check-circle me-2"></i>Good Mortality Rate (<%= mortalityRate %>%)</h6>
                                                <p>Your mortality rate is within acceptable limits. Maintain current practices.</p>
                                            </div>
                                        <% } %>
                                        
                                        <div class="alert alert-info">
                                            <h6><i class="fas fa-clipboard-list me-2"></i>Preventive Measures</h6>
                                            <p>Based on mortality patterns, consider:</p>
                                            <ul>
                                                <% if (deathByCause['Disease']) { %>
                                                    <li>Implement vaccination program</li>
                                                    <li>Improve biosecurity measures</li>
                                                    <li>Regular health monitoring</li>
                                                <% } %>
                                                <% if (deathByCause['Heat Stress'] || deathByCause['Cold Stress']) { %>
                                                    <li>Improve environmental controls</li>
                                                    <li>Monitor temperature fluctuations</li>
                                                <% } %>
                                                <% if (deathByCause['Predator']) { %>
                                                    <li>Enhance physical security</li>
                                                    <li>Install predator deterrents</li>
                                                <% } %>
                                                <li>Regular staff training on bird health</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <% } else { %>
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>Please select a batch and date range to generate a report.
            </div>
        <% } %>
    </div>

    <!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js"></script>
    
    <script>
        // Initialize date range picker
        $(function() {
            $('#dateRange').daterangepicker({
                opens: 'right',
                locale: {
                    format: 'MM/DD/YYYY'
                }
            });
        });
        
        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        // Initialize charts if data exists
        <% if (selectedBatch) { %>
            // Egg Production Chart
            const eggCtx = document.getElementById('eggChartCanvas').getContext('2d');
            const eggChart = new Chart(eggCtx, {
                type: 'line',
                data: {
                    labels: [<%= eggData.map(entry => `"${entry.date.toLocaleDateString()}"`).join(',') %>],
                    datasets: [{
                        label: 'Total Eggs',
                        data: [<%= eggData.map(entry => entry.totalEggs).join(',') %>],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.3,
                        fill: true
                    }, {
                        label: 'Good Eggs %',
                        data: [<%= eggData.map(entry => entry.goodEggsPercent).join(',') %>],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.3,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Egg Production Trend'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // Mortality Causes Chart
            <% 
                const mortalityCauses = {};
                selectedBatch.deathRecords.forEach(record => {
                    const reason = record.reason === 'Other' && record.otherReason ? 
                        record.otherReason : record.reason;
                    mortalityCauses[reason] = (mortalityCauses[reason] || 0) + record.count;
                });
            %>
            const mortalityCtx = document.getElementById('mortalityChartCanvas').getContext('2d');
            const mortalityChart = new Chart(mortalityCtx, {
                type: 'doughnut',
                data: {
                    labels: [<%= Object.keys(mortalityCauses).map(cause => `"${cause}"`).join(',') %>],
                    datasets: [{
                        data: [<%= Object.values(mortalityCauses).join(',') %>],
                        backgroundColor: [
                            '#e74c3c', '#f39c12', '#9b59b6', '#34495e', 
                            '#1abc9c', '#3498db', '#e67e22'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Mortality Causes Breakdown'
                        },
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
            
            // Expense Breakdown Chart
            const expenseCtx = document.getElementById('expenseChartCanvas').getContext('2d');
            const expenseChart = new Chart(expenseCtx, {
                type: 'bar',
                data: {
                    labels: ['Feed', 'Labor', 'Medication', 'Chicks', 'Transport', 'Other'],
                    datasets: [{
                        label: 'Expenses',
                        data: [
                            <%= financialData.reduce((sum, entry) => sum + entry.feedCost, 0) %>,
                            <%= financialData.reduce((sum, entry) => sum + entry.laborCost, 0) %>,
                            <%= financialData.reduce((sum, entry) => sum + entry.medicationCost, 0) %>,
                            <%= financialData.reduce((sum, entry) => sum + entry.chickCost, 0) %>,
                            <%= financialData.reduce((sum, entry) => sum + entry.transportCost, 0) %>,
                            <%= financialData.reduce((sum, entry) => sum + entry.totalExpenses, 0) - 
                               financialData.reduce((sum, entry) => sum + entry.feedCost + entry.laborCost + 
                               entry.medicationCost + entry.chickCost + entry.transportCost, 0) %>
                        ],
                        backgroundColor: [
                            '#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#34495e'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Expense Breakdown'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // Mortality Trend Chart
            <% 
                const deathDates = {};
                selectedBatch.deathRecords.forEach(record => {
                    const dateStr = record.date.toLocaleDateString();
                    deathDates[dateStr] = (deathDates[dateStr] || 0) + record.count;
                });
                
                const sortedDeathDates = Object.keys(deathDates).sort((a, b) => new Date(a) - new Date(b));
                const deathCounts = sortedDeathDates.map(date => deathDates[date]);
            %>
            const mortalityTrendCtx = document.getElementById('mortalityTrendChartCanvas').getContext('2d');
            const mortalityTrendChart = new Chart(mortalityTrendCtx, {
                type: 'line',
                data: {
                    labels: [<%= sortedDeathDates.map(date => `"${date}"`).join(',') %>],
                    datasets: [{
                        label: 'Daily Deaths',
                        data: [<%= deathCounts.join(',') %>],
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Mortality Trend Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        <% } %>
        
        // Tab functionality
        document.addEventListener('DOMContentLoaded', function() {
            const tabs = document.querySelectorAll('.nav-tabs .nav-link');
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    tabs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        });
        
        // Export functionality
        document.querySelector('.btn-export').addEventListener('click', function() {
            // In a real application, this would generate a PDF or Excel file
            alert('Export functionality would generate a PDF/Excel report here');
        });
        
        // Print functionality
        document.querySelector('.btn-print').addEventListener('click', function() {
            window.print();
        });
        
        // Helper function to filter batches
        function filterBatches() {
            const input = document.getElementById('searchInput').value.toLowerCase();
            const options = document.querySelectorAll('#batchDropdown option');
            
            options.forEach(option => {
                const batchNo = option.textContent.toLowerCase();
                if (batchNo.includes(input)) {
                    option.style.display = 'block';
                } else {
                    option.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>