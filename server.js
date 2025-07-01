require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const ejs = require('ejs');  // Add this line to require EJS
const authRoutes = require('./routes/authRoutes');
const batchRoutes = require('./routes/batchRoutes');
const eggProductionRoutes = require('./routes/eggProductionRoutes');
const financialRoutes = require('./routes/financialRoutes');
const reportRoutes = require('./routes/report');
const visualizationRoutes = require('./routes/visualization'); // path may vary
const balanceSheetRouter = require('./routes/balanceSheet');
const trialBalanceRoutes = require('./routes/trialbalanceRoutes');
const eggReplacementRoutes = require('./routes/eggReplacements');


require('./config/passport')(passport);

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'secretkey', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.engine('ejs', async (path, data, cb) => {
  try {
    const html = await ejs.renderFile(path, data, { async: true });
    cb(null, html);
  } catch (err) {
    cb(err);
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Routes
app.use('/', authRoutes);
app.use('/', batchRoutes);
app.use('/', eggProductionRoutes);
app.use(financialRoutes);
app.use('/', reportRoutes);
app.use('/', visualizationRoutes);
app.use('/financials', financialRoutes); // Note the base path
app.use('/balance-sheet', balanceSheetRouter);  // Note the hyphen
app.use('/trial-balance', trialBalanceRoutes);
app.use('/api/egg-replacements', eggReplacementRoutes);
app.use('/api/financials', financialRoutes); // This is the critical line





// Server
app.listen(process.env.PORT || 3000, () =>
    console.log(`Server running on port ${process.env.PORT || 3000}`)
);
