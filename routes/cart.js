const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');

// ─── View Cart Page ────────────────────────────────────────────────────
router.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const cart = req.session.cart || [];

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const advanceAmount = Math.round(subtotal * 0.30);
    const remainingAmount = subtotal - advanceAmount;

    res.render('cart/index', {
        title: 'Your Cart — M N & SONS',
        cart,
        subtotal,
        advanceAmount,
        remainingAmount
    });
});

// ─── Add Product to Cart (🛡️ SECURED: Server-Side DB Price Check) ──────
router.post('/add', async (req, res) => {
    if (!req.session.userId) {
        if (req.xhr || req.headers.accept?.includes('application/json') || req.is('json') || req.body.ajax) {
            return res.status(401).json({ success: false, requireLogin: true, redirect: '/login' });
        }
        return res.redirect('/login');
    }

    if (!req.session.cart) req.session.cart = [];

    const { productId } = req.body;
    if (!productId) {
        if (req.xhr || req.headers.accept?.includes('application/json') || req.is('json')) {
            return res.status(400).json({ success: false, message: 'Product ID required' });
        }
        return res.redirect('/');
    }

    // 🔒 Fetch directly from MongoDB — never trust client-supplied price
    let realProduct = null;
    try {
        realProduct = await Product.findById(productId);
    } catch (e) {
        realProduct = null;
    }

    if (!realProduct) {
        if (req.xhr || req.headers.accept?.includes('application/json') || req.is('json')) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        return res.redirect('/');
    }

    const verifiedPrice = Number(realProduct.price) || 0;
    const verifiedTitle = realProduct.title || realProduct.name || 'Handcrafted Steel Almirah';
    const verifiedImage = realProduct.image || 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=400&q=80';

    const existingIndex = req.session.cart.findIndex(item => String(item.id) === String(realProduct._id));

    if (existingIndex > -1) {
        req.session.cart[existingIndex].quantity += 1;
        req.session.cart[existingIndex].price = verifiedPrice; // Force verified price
    } else {
        req.session.cart.push({
            id: String(realProduct._id),
            title: verifiedTitle,
            price: verifiedPrice,
            image: verifiedImage,
            quantity: 1
        });
    }

    // 💾 User ke Database me bhi Cart update karein
    try {
        await User.findByIdAndUpdate(req.session.userId, { cart: req.session.cart });
    } catch (err) {
        console.error('Cart DB sync error:', err);
    }

    const totalCount = req.session.cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

    req.session.save((err) => {
        if (req.xhr || req.headers.accept?.includes('application/json') || req.is('json') || req.body.ajax) {
            return res.json({ success: true, cartCount: totalCount });
        }
        res.redirect('/cart');
    });
});

// ─── Remove Item from Cart ─────────────────────────────────────────────
router.post('/remove', async (req, res) => {
    const { productId } = req.body;
    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => String(item.id) !== String(productId));
        if (req.session.userId) {
            await User.findByIdAndUpdate(req.session.userId, { cart: req.session.cart });
        }
    }
    req.session.save(() => {
        res.redirect('/cart');
    });
});

module.exports = router;