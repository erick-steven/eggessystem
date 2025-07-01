const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const EggProduction = require('../models/EggProduction');
const Financial = require('../models/Financial');
const Batch = require('../models/Batch');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require("bcryptjs");

const moment = require('moment');



// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'enricnakon@gmail.com', // Your Gmail email
        pass: 'frrl tfdu jfee edon', // Your Gmail app password
    },
    tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
    },
});

// Login Page
router.get('/', (req, res) => {
    res.render('login', {
        error: req.query.error,
        verified: req.query.verified,
        registered: req.query.registered  // ✅ Add this line
    });
});

// Reg
// Register Handler
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const verificationToken = crypto.randomBytes(20).toString('hex');

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            verificationToken,
        });

        await newUser.save();

        const verificationUrl = `http://${req.headers.host}/verify-email?token=${verificationToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            html: `<p>Click the link to verify your email:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
        };

        await transporter.sendMail(mailOptions);
        console.log('Verification email sent to:', email);

        res.redirect('/?registered=true');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Email Verification
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ verificationToken: token });
        if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.redirect('/?verified=true');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Login Handler
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/?error=Invalid credentials');
        }
        if (!user.isVerified) {
            return res.redirect('/?error=Please verify your email');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/dashboard');
        });
    })(req, res, next);
});
 

router.get('/dashboard', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    const timeFilter = req.query.timeFilter || 'allTime';
    const selectedBatch = req.query.batchId || null;
    const currentDate = new Date();

    const today = moment().endOf('day');
    const sevenDaysAgo = moment().subtract(6, 'days').startOf('day');

    try {
        // Get all batches and select the default one
        const batches = await Batch.find().sort({ date: -1 });
        const defaultBatch = selectedBatch || (batches.length > 0 ? batches[0]._id.toString() : null);

        // Time-filtered query for egg production
        let eggProductionQuery = {};
        if (timeFilter === 'currentMonth') {
            eggProductionQuery.date = {
                $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
            };
        } else if (timeFilter === 'today') {
            eggProductionQuery.date = {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999)
            };
        } else if (timeFilter === 'customRange' && req.query.startDate && req.query.endDate) {
            eggProductionQuery.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        // Total flock count
        const totalFlock = await Batch.countDocuments();

        // Total eggs
        const totalEggs = await EggProduction.aggregate([
            { $match: eggProductionQuery },
            { $group: { _id: null, totalEggs: { $sum: "$totalEggs" } } }
        ]);
        const totalEggsCount = totalEggs.length ? totalEggs[0].totalEggs : 0;

        // Financial summary
        let financialQuery = {};
        if (timeFilter === 'currentMonth') {
            financialQuery.date = {
                $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
            };
        } else if (timeFilter === 'today') {
            financialQuery.date = {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999)
            };
        } else if (timeFilter === 'customRange' && req.query.startDate && req.query.endDate) {
            financialQuery.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        const financials = await Financial.aggregate([
            { $match: financialQuery },
            {
                $group: {
                    _id: null,
                    income: { $sum: "$income" },
                    expenses: { $sum: "$expenses" },
                    profit: { $sum: "$profit" }
                }
            }
        ]);
        const financialData = financials.length ? financials[0] : { income: 0, expenses: 0, profit: 0 };

        // Peak egg production
        const peakProduction = await EggProduction.aggregate([
            { $sort: { totalEggs: -1 } },
            { $limit: 1 }
        ]);
        const peakEggs = peakProduction.length ? peakProduction[0].totalEggs : 0;

        // Last 7 days egg data (for graph)
        const eggData = await EggProduction.find({
            batch: defaultBatch,
            date: { $gte: sevenDaysAgo.toDate(), $lte: today.toDate() }
        }).sort({ date: 1 });

        // Last 7 days financial data (for graph)
        const financialGraphData = await Financial.find({
            batch: defaultBatch,
            date: { $gte: sevenDaysAgo.toDate(), $lte: today.toDate() }
        }).sort({ date: 1 });

        // Format 7-day labels
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(moment().subtract(6 - i, 'days').format('YYYY-MM-DD'));
        }

        const eggGraph = days.map(date => {
            const match = eggData.find(e => moment(e.date).format('YYYY-MM-DD') === date);
            return { date, totalEggs: match ? match.totalEggs : 0 };
        });

        const financialGraph = days.map(date => {
            const match = financialGraphData.find(f => moment(f.date).format('YYYY-MM-DD') === date);
            return { date, profit: match ? match.profit : 0 };
        });

        res.render('dashboard', {
            user: req.user,
            timeFilter,
            totalFlock,
            totalEggs: totalEggsCount,
            income: financialData.income,
            expenses: financialData.expenses,
            profit: financialData.profit,
            peakEggs,
            batches,
            selectedBatch: defaultBatch,
            eggGraph,
            financialGraph
        });
    } catch (err) {
        console.error('Dashboard fetch error:', err);
        res.status(500).send('Server error');
    }
});

// Forgot Password Handler
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.redirect('/forgot-password?error=User with this email does not exist');
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `http://${req.headers.host}/reset-password?token=${resetToken}`;
const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Password Reset Request - Enricnakon',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="text-align: center; color: #333;">Enricnakon Password Reset</h2>
            <p style="font-size: 16px; color: #555;">Hello,</p>
            <p style="font-size: 16px; color: #555;">We received a request to reset your password. Click the button below to proceed.</p>
            <div style="text-align: center; margin: 20px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #007bff; color: #fff; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-size: 16px; display: inline-block;">
                   Reset Password
                </a>
            </div>
            <p style="font-size: 14px; color: #888;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd;">
            <p style="text-align: center; font-size: 12px; color: #888;">&copy; ${new Date().getFullYear()} Enricnakon. All rights reserved.</p>
        </div>
    `
};

        await transporter.sendMail(mailOptions);
        res.redirect('/forgot-password?success=true');
    } catch (error) {
        console.error(error);
        res.redirect('/forgot-password?error=Server error');
    }
});
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { error: req.query.error, success: req.query.success });
});

// Reset Password Page
router.get('/reset-password', async (req, res) => {
    const { token } = req.query;
    
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('reset-password', {
                error: 'Password reset token is invalid or has expired',
                valid: false
            });
        }

        res.render('reset-password', { 
            token,
            valid: true,
            error: req.query.error 
        });
    } catch (error) {
        console.error(error);
        res.render('reset-password', { error: 'Server error', valid: false });
    }
});

// Reset Password Handler
router.post('/reset-password', async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    
    try {
        if (password !== confirmPassword) {
            return res.redirect(`/reset-password?token=${token}&error=Passwords do not match`);
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.redirect('/reset-password?error=Password reset token is invalid or has expired');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Changed',
            html: '<p>Your password has been successfully changed</p>'
        };

        await transporter.sendMail(mailOptions);
        res.redirect('/?success=Password updated successfully');
    } catch (error) {
        console.error(error);
        res.redirect(`/reset-password?token=${token}&error=Server error`);
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});


module.exports = router;