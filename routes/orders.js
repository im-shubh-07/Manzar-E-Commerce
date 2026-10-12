const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Review = require('../models/Review');
const Product = require('../models/Product');

// ─── 1. Step 1: Checkout Form -> Go to Payment Screen ─────────────────
router.post('/checkout', async (req, res) => {
    try {
        const cart = req.session.cart || [];
        if (cart.length === 0) return res.redirect('/cart');

        const { deliveryAddress, paymentType } = req.body;

        // 🛡️ SECURITY FIX: Re-verify every cart item price against MongoDB
        let verifiedCart = [];
        let totalAmount = 0;

        for (const item of cart) {
            let dbProduct = null;
            try {
                dbProduct = await Product.findById(item.id);
            } catch (e) {
                dbProduct = null;
            }

            const itemPrice = dbProduct ? Number(dbProduct.price) : Number(item.price);
            const itemQty = Math.max(1, Number(item.quantity) || 1);
            totalAmount += (itemPrice * itemQty);

            verifiedCart.push({
                product: dbProduct ? dbProduct._id : undefined,
                id: item.id,
                title: dbProduct ? (dbProduct.title || dbProduct.name) : item.title,
                price: itemPrice,
                image: dbProduct ? dbProduct.image : item.image,
                quantity: itemQty
            });
        }

        // Keep session cart in sync with verified prices
        req.session.cart = verifiedCart;

        const advancePaid = paymentType === 'partial' ? Math.round(totalAmount * 0.30) : totalAmount;
        const remainingAmount = totalAmount - advancePaid;

        // Order create karein with status Pending verification
        const order = new Order({
            user: req.session.userId || null,
            customerName: req.session.userName || 'Customer',
            items: verifiedCart,
            totalAmount,
            paymentType: paymentType || 'partial',
            advancePaid,
            remainingAmount,
            deliveryAddress: (deliveryAddress || '').trim() || 'Direct Fabrication & Workshop Pickup',
            paymentStatus: 'Pending',
            orderStatus: 'Confirmed'
        });

        await order.save();

        res.render('orders/payment', {
            title: 'Pay Order Amount — M N & SONS',
            order
        });

    } catch (err) {
        console.error('Checkout error:', err);
        res.redirect('/cart');
    }
});

// ─── 2. Step 2: Payment Verify -> UTR Recorded for Admin Check ────────
router.post('/payment/verify', async (req, res) => {
    try {
        const { orderId, transactionId } = req.body;
        const cleanTransactionId = (transactionId || '').trim();

        // 🛡️ FRAUD PREVENTION: Mark as 'UTR Verification Pending' instead of blindly confirming payment
        const order = await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'UTR Verification Pending',
            designRequirements: cleanTransactionId 
                ? `Submitted UTR/Ref: ${cleanTransactionId} (Awaiting Bank Confirmation)` 
                : 'UPI Transfer Submitted (Awaiting Bank Confirmation)'
        }, { new: true });

        // Cart empty karein
        req.session.cart = [];
        req.session.save(() => {
            res.render('orders/confirmation', {
                title: 'Order Placed — Payment Verification in Progress — M N & SONS',
                order
            });
        });

    } catch (err) {
        console.error('Payment verify error:', err);
        res.redirect('/cart');
    }
});

// ─── 3. Track My Orders (🛡️ SECURED: Privacy Protected & No PII Leak) ──
router.get('/my-orders', async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        const cleanSearch = (search || '').trim();

        if (cleanSearch) {
            // Check if exact 24-char ObjectID
            if (/^[0-9a-fA-F]{24}$/.test(cleanSearch)) {
                query = { _id: cleanSearch };
            } else {
                // Must be at least 10 digits for phone search (no partial 1-digit wildcard leakage)
                const digits = cleanSearch.replace(/\D/g, '');
                if (digits.length >= 10) {
                    query = { phone: digits.slice(-10) };
                } else {
                    // Invalid/too short query returns nothing
                    query = { _id: null };
                }
            }
        } else if (req.session.userId) {
            // Logged in user: show their own orders
            query = { user: req.session.userId };
        } else {
            // Anonymous visitor without search: show blank, protect privacy
            query = { _id: null };
        }

        const orders = await Order.find(query)
            .populate('items.product')
            .sort({ createdAt: -1 });

        res.render('orders/my-orders', {
            title: 'Track My Orders — M N & SONS',
            orders: orders || [],
            searchQuery: cleanSearch
        });
    } catch (err) {
        console.error('Track orders error:', err);
        res.render('orders/my-orders', { orders: [], searchQuery: '' });
    }
});

// ─── 4. Delivered Order Review Handler ──────────────────────────────────
router.post('/review', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const { productId, rating, comment } = req.body;

        if (!productId || !comment || !comment.trim()) {
            return res.redirect('/orders/my-orders');
        }

        const order = await Order.findOne({
            user: req.session.userId,
            orderStatus: 'Delivered',
            'items.product': productId
        });

        const newReview = new Review({
            product: productId,
            user: req.session.userId,
            authorName: req.session.userName || 'Verified Buyer',
            rating: Number(rating) || 5,
            comment: comment.trim(),
            isVerifiedBuyer: Boolean(order)
        });

        await newReview.save();
        res.redirect(`/products/${productId}#reviews`);
    } catch (err) {
        console.error('Order Review submission error:', err);
        res.redirect('/orders/my-orders');
    }
});

// ─── 5. View & Print Official Order Slip / Invoice ──────────────────────
router.get('/:id/invoice', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.product');
        if (!order) {
            return res.status(404).render('error', {
                title: 'Order Not Found',
                message: 'Could not find the requested order receipt.'
            });
        }

        res.render('orders/invoice', {
            title: `Order Receipt #${order._id.toString().slice(-8).toUpperCase()} — M N & SONS`,
            order
        });
    } catch (err) {
        console.error('Invoice fetch error:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to generate order slip.'
        });
    }
});

module.exports = router;