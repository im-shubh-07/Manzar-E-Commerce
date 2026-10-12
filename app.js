const express = require('express');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;
const path = require('path');

const app = express();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mn_and_sons';

// ─── 1. Database Connection ─────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected to mn_and_sons'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── 2. View Engine Setup ───────────────────────────────────────────────
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── 3. Middleware ──────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Disable X-Powered-By header for fingerprinting protection
app.disable('x-powered-by');

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ─── 4. Session Configuration (💾 Persistent MongoStore) ───────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'mn_and_sons_secret_fab_2026',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    touchAfter: 24 * 3600 // Only update session if data modified or once per 24 hours
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days tak logged-in rahega
    httpOnly: true
  }
}));

// ─── 5. Global Variables for Views (Templates) ──────────────────────────
app.use((req, res, next) => {
  // 🛡️ Admin Session Setup (Shows in Navbar & Admin Dashboard)
  if (req.session && req.session.isAdmin) {
    const isMaster = (req.session.isMasterAdmin === true) ||
      (req.session.adminEmail === 'admin@mnandsons.com');
    res.locals.currentAdmin = {
      name: req.session.adminName || req.session.adminUser || 'Admin',
      email: req.session.adminEmail || 'admin@mnandsons.com',
      isMaster: isMaster,
      roleTitle: isMaster ? 'Master Admin' : 'Sub-Admin (Operations)'
    };
  } else {
    res.locals.currentAdmin = null;
  }

  // 👤 Regular Customer/User Session
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, name: req.session.userName }
    : null;

  // 🔒 Cart count only if customer is logged in
  const cart = (req.session.userId && req.session.cart) ? req.session.cart : [];
  res.locals.cartCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  next();
});

// ─── 6. Models & Categories Middleware ─────────────────────────────────
const Category = require('./models/Category');

// Dynamic categories available across all views & navbar
app.use(async (req, res, next) => {
  try {
    res.locals.categories = await Category.find().sort({ createdAt: 1 });
  } catch (e) {
    res.locals.categories = [];
  }
  next();
});

// ─── 7. Routes ─────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const enquiryRoutes = require('./routes/enquiries');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const businessRoutes = require('./routes/business');

app.use('/business', businessRoutes);  // /business/enquiry (B2B Bulk & Franchise)
app.use('/', authRoutes);              // /register, /login, /logout
app.use('/', productRoutes);           // /, /products, /products/:id
app.use('/cart', cartRoutes);          // /cart, /cart/add, /cart/remove
app.use('/enquiries', enquiryRoutes);  // /enquiries/custom
app.use('/orders', orderRoutes);        // /orders/checkout
app.use('/admin', adminRoutes);        // /admin, /admin/orders, /admin/admins, etc.

// ─── 8. 404 Handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: '404 — The page you are looking for does not exist.'
  });
});

// ─── 9. Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  const { status = 500, message = 'Something went wrong on the server' } = err;
  console.error('Server Error:', err);
  res.status(status).render('error', {
    title: 'Error',
    message
  });
});

// ─── 10. Start Server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 M N & SONS running at http://localhost:${PORT}`);
});