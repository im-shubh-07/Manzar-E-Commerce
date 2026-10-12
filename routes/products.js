const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

let Review;
try {
  Review = require('../models/Review');
} catch (e) {
  Review = null;
}

// ─── 1. GET / and /products (Home Page with Products Catalog) ───
router.get(['/', '/products'], async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = { isDeleted: { $ne: true } };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && search.trim() !== '') {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { name: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.render('index', {
      title: 'M N & SONS — Handcrafted Heavy-Gauge Steel Almirahs',
      products,
      currentCategory: category || 'All',
      searchQuery: search || ''
    });
  } catch (err) {
    console.error('Home page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load products. Please refresh.'
    });
  }
});

// ─── 2. GET /products/:id (Product Detail & Reviews) ──────────
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('404', {
        title: 'Product Not Found',
        message: 'The requested steel almirah could not be found.'
      });
    }

    let reviews = [];
    if (Review) {
      reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 });
    }

    res.render('products/show', {
      title: `${product.name} — M N & SONS`,
      product,
      reviews
    });
  } catch (err) {
    console.error('Product show error:', err);
    res.status(404).render('404', {
      title: 'Product Not Found',
      message: 'Invalid product link or product no longer exists.'
    });
  }
});

// ─── 3. POST /products/:id/reviews (Add Realtime Review) ────────
router.post('/products/:id/reviews', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    if (!Review) {
      return res.redirect(`/products/${req.params.id}`);
    }

    const { rating, comment } = req.body;
    const review = new Review({
      product: req.params.id,
      user: req.session.userId,
      authorName: req.session.userName || 'Verified Buyer',
      rating: Number(rating) || 5,
      comment: (comment || '').trim(),
      isVerifiedBuyer: true
    });

    await review.save();
    res.redirect(`/products/${req.params.id}#reviews`);
  } catch (err) {
    console.error('Add review error:', err);
    res.redirect(`/products/${req.params.id}`);
  }
});

module.exports = router;