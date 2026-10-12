const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ─── Register Page ─────────────────────────────────────────────────────
router.get('/register', (req, res) => {
    res.render('auth/register', { title: 'Register — M N & SONS', error: null });
});

// ─── Register Handle (🛡️ SECURED: Input Validation) ───────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        const cleanName = (typeof name === 'string') ? name.trim() : '';
        const cleanEmail = (typeof email === 'string') ? email.toLowerCase().trim() : '';
        const cleanPhone = (typeof phone === 'string') ? phone.trim() : '';
        const cleanPassword = (typeof password === 'string') ? password : '';

        if (!cleanName || !cleanEmail || !cleanPhone || !cleanPassword) {
            return res.render('auth/register', {
                title: 'Register — M N & SONS',
                error: 'All fields are required.'
            });
        }

        if (cleanPassword.length < 6) {
            return res.render('auth/register', {
                title: 'Register — M N & SONS',
                error: 'Password must be at least 6 characters long.'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.render('auth/register', {
                title: 'Register — M N & SONS',
                error: 'An account with this email already exists.'
            });
        }

        const user = new User({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password: cleanPassword
        });
        await user.save();

        // Auto-login session set karein
        req.session.userId = user._id;
        req.session.userName = user.name;

        res.redirect('/');
    } catch (err) {
        res.render('auth/register', {
            title: 'Register — M N & SONS',
            error: err.message || 'Something went wrong during registration.'
        });
    }
});

// ─── Login Page ────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
    res.render('auth/login', { title: 'Login — M N & SONS', error: null });
});

// ─── Login Handle (🛡️ SECURED: NoSQL Type Confusion Prevention) ────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const cleanEmail = (typeof email === 'string') ? email.toLowerCase().trim() : '';
        const cleanPassword = (typeof password === 'string') ? password : '';

        if (!cleanEmail || !cleanPassword) {
            return res.render('auth/login', {
                title: 'Login — M N & SONS',
                error: 'Please enter both email and password.'
            });
        }

        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.render('auth/login', {
                title: 'Login — M N & SONS',
                error: 'Invalid email or password.'
            });
        }

        const isMatch = await user.comparePassword(cleanPassword);
        if (!isMatch) {
            return res.render('auth/login', {
                title: 'Login — M N & SONS',
                error: 'Invalid email or password.'
            });
        }

        // Set session
        req.session.userId = user._id;
        req.session.userName = user.name;

        res.redirect('/');
    } catch (err) {
        console.error('❌ LOGIN ERROR:', err);
        res.render('auth/login', {
            title: 'Login — M N & SONS',
            error: 'Login failed. Please try again.'
        });
    }
});

// ─── Logout Handle (Cart Safe Rahega) ───────────────────────────────────
router.get('/logout', (req, res) => {
    delete req.session.userId;
    delete req.session.userName;

    req.session.save((err) => {
        if (err) console.error('Logout save error:', err);
        res.redirect('/');
    });
});

module.exports = router;