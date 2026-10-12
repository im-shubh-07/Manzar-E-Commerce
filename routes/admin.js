const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Models
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Enquiry = require('../models/Enquiry');
const ShopConfig = require('../models/ShopConfig');
const BusinessEnquiry = require('../models/BusinessEnquiry');
const Admin = require('../models/Admin');

// ─── Multer Storage for Direct Photo Upload ───────────────────
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, 'almirah-' + uniqueSuffix + ext);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB photo
    fileFilter: function (req, file, cb) {
        const allowedExts = /jpeg|jpg|png|webp/;
        const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedExts.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            return cb(new Error('Security Error: Only genuine image files (JPG, PNG, WebP) are allowed!'));
        }
    }
});

// Master Admin Credentials
const MASTER_EMAIL = (process.env.ADMIN_EMAIL || 'admin@mnandsons.com').toLowerCase();
const MASTER_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ─── Middlewares ─────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
};

const requireMasterAdmin = (req, res, next) => {
    if (req.session && req.session.isAdmin && req.session.isMasterAdmin) {
        return next();
    }
    return res.status(403).send(`
        <div style="font-family: system-ui, sans-serif; text-align: center; padding: 60px 20px;">
            <h1 style="color: #dc2626; font-size: 2rem;">🚫 Access Denied</h1>
            <p style="color: #4b5563; font-size: 1.1rem; margin-top: 10px;">Only Master Admin can manage and add Sub-Admins.</p>
            <a href="/admin" style="display: inline-block; margin-top: 20px; padding: 10px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">← Back to Dashboard</a>
        </div>
    `);
};

// Helper: Get or create default stages configuration
async function getStages() {
    let config = await ShopConfig.findOne();
    if (!config) {
        config = await ShopConfig.create({
            stage2Name: 'Under Fabrication',
            stage3Name: 'Powder Coating'
        });
    }
    return config;
}

// ─── 0. Auth Routes ──────────────────────────────────────────
router.get('/login', (req, res) => {
    if (req.session && req.session.isAdmin) return res.redirect('/admin');
    res.render('admin/login', { title: 'Admin Login — M N & SONS', error: null });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const inputEmail = (email || '').trim().toLowerCase();
        const inputPassword = (password || '').trim();

        // 1. Check Master Admin Credentials
        if (inputEmail === MASTER_EMAIL && inputPassword === MASTER_PASSWORD) {
            req.session.isAdmin = true;
            req.session.isMasterAdmin = true;
            req.session.adminUser = 'Owner / Admin';
            req.session.adminName = 'Owner / Admin';
            req.session.adminEmail = MASTER_EMAIL;
            return req.session.save(() => res.redirect('/admin'));
        }

        // 2. Check Database for Sub-Admins
        const subAdmin = await Admin.findOne({ email: inputEmail });
        if (subAdmin) {
            let isMatch = false;
            if (typeof subAdmin.comparePassword === 'function') {
                isMatch = await subAdmin.comparePassword(inputPassword);
            } else if (subAdmin.password) {
                isMatch = await bcrypt.compare(inputPassword, subAdmin.password);
            }

            if (isMatch) {
                req.session.isAdmin = true;
                req.session.isMasterAdmin = false;
                req.session.adminUser = subAdmin.name;
                req.session.adminName = subAdmin.name;
                req.session.adminEmail = subAdmin.email;
                return req.session.save(() => res.redirect('/admin'));
            }
        }

        res.render('admin/login', {
            title: 'Admin Login — M N & SONS',
            error: 'Invalid Email or Password!'
        });
    } catch (err) {
        console.error('Login error:', err);
        res.render('admin/login', {
            title: 'Admin Login — M N & SONS',
            error: 'An error occurred during login. Please try again.'
        });
    }
});

router.get('/logout', (req, res) => {
    req.session.isAdmin = false;
    req.session.isMasterAdmin = false;
    req.session.adminUser = null;
    req.session.adminName = null;
    req.session.adminEmail = null;
    req.session.save(() => res.redirect('/admin/login'));
});

// ─── 1. Dashboard ────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
    try {
        const productsCount = await Product.countDocuments();
        const categoriesCount = await Category.countDocuments();
        const activeOrdersCount = await Order.countDocuments({ orderStatus: { $ne: 'Delivered' } });
        const deliveredOrdersCount = await Order.countDocuments({ orderStatus: 'Delivered' });

        let leadsCount = 0;
        try { leadsCount = await BusinessEnquiry.countDocuments({ status: 'Pending' }); } catch (e) { leadsCount = 0; }

        let subAdminsCount = 0;
        try { subAdminsCount = await Admin.countDocuments(); } catch (e) { subAdminsCount = 0; }

        res.render('admin/index', {
            title: 'Admin Dashboard — M N & SONS',
            productsCount,
            categoriesCount,
            activeOrdersCount,
            deliveredOrdersCount,
            leadsCount,
            subAdminsCount,
            isMasterAdmin: req.session.isMasterAdmin
        });
    } catch (err) {
        console.error('Admin index error:', err);
        res.status(500).send('Server Error');
    }
});

// ─── 2. Multi-Admin Management (Master Admin Only) ───────────
router.get('/admins', requireAdmin, requireMasterAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().sort({ createdAt: -1 });
        res.render('admin/admins', {
            title: 'Manage Sub-Admins — M N & SONS',
            admins,
            masterEmail: MASTER_EMAIL,
            error: null,
            success: null
        });
    } catch (err) {
        console.error('Fetch admins error:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/admins/add', requireAdmin, requireMasterAdmin, async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();

        if (cleanEmail === MASTER_EMAIL) {
            const admins = await Admin.find().sort({ createdAt: -1 });
            return res.render('admin/admins', {
                title: 'Manage Sub-Admins — M N & SONS',
                admins,
                masterEmail: MASTER_EMAIL,
                error: 'This email is already the Master Admin email.',
                success: null
            });
        }

        const existingAdmin = await Admin.findOne({ email: cleanEmail });
        if (existingAdmin) {
            const admins = await Admin.find().sort({ createdAt: -1 });
            return res.render('admin/admins', {
                title: 'Manage Sub-Admins — M N & SONS',
                admins,
                masterEmail: MASTER_EMAIL,
                error: 'An admin with this email already exists.',
                success: null
            });
        }

        await Admin.create({
            name: name.trim(),
            email: cleanEmail,
            password: password.trim(),
            phone: phone ? phone.trim() : ''
        });

        res.redirect('/admin/admins');
    } catch (err) {
        console.error('Add admin error:', err);
        res.redirect('/admin/admins');
    }
});

router.post('/admins/:id/delete', requireAdmin, requireMasterAdmin, async (req, res) => {
    try {
        await Admin.findByIdAndDelete(req.params.id);
        res.redirect('/admin/admins');
    } catch (err) {
        console.error('Delete admin error:', err);
        res.redirect('/admin/admins');
    }
});

// ─── 3. Orders & Commercial Leads Management ──────────────────
router.get('/orders', requireAdmin, async (req, res) => {
    try {
        let enquiries = [];
        try { enquiries = await Enquiry.find().sort({ createdAt: -1 }); } catch (e) { enquiries = []; }

        let businessLeads = [];
        try { businessLeads = await BusinessEnquiry.find().sort({ createdAt: -1 }); } catch (e) { businessLeads = []; }

        const activeOrders = await Order.find({ orderStatus: { $ne: 'Delivered' } })
            .populate('items.product')
            .sort({ createdAt: -1 });

        const deliveredOrders = await Order.find({ orderStatus: 'Delivered' })
            .populate('items.product')
            .sort({ createdAt: -1 });

        const config = await getStages();

        res.render('admin/orders', {
            title: 'Orders & Production Status — M N & SONS Admin',
            enquiries,
            businessLeads,
            orders: activeOrders,
            deliveredOrders,
            stage2Name: config.stage2Name,
            stage3Name: config.stage3Name
        });
    } catch (err) {
        console.error('Admin orders error:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/business-leads/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await BusinessEnquiry.findByIdAndUpdate(req.params.id, { status });
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Update lead status error:', err);
        res.redirect('/admin/orders');
    }
});

router.post('/orders/update-stage-names', requireAdmin, async (req, res) => {
    try {
        const { stage2Name, stage3Name } = req.body;
        let config = await ShopConfig.findOne();
        if (!config) config = new ShopConfig();
        if (stage2Name) config.stage2Name = stage2Name.trim();
        if (stage3Name) config.stage3Name = stage3Name.trim();
        await config.save();
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Update stages error:', err);
        res.redirect('/admin/orders');
    }
});

router.post('/confirm-order', requireAdmin, async (req, res) => {
    try {
        const {
            enquiryId,
            customerName,
            phone,
            color,
            size,
            designRequirements,
            totalAmount,
            advancePaid,
            deliveryAddress
        } = req.body;

        const total = parseFloat(totalAmount) || 0;
        const advance = parseFloat(advancePaid) || 0;
        const remainingDue = Math.max(0, total - advance);
        const orderNum = 'MNS-' + Math.floor(100000 + Math.random() * 900000);

        await Order.create({
            orderNumber: orderNum,
            customerName,
            phone,
            deliveryAddress: deliveryAddress || 'Local Pickup / Direct Delivery',
            items: [{
                title: `Custom Fabrication Order (${size || 'Standard'}, ${color || 'Custom Color'})`,
                price: total,
                quantity: 1
            }],
            totalAmount: total,
            advancePaid: advance,
            remainingDue: remainingDue,
            orderStatus: 'Design Confirmed',
            notes: designRequirements || ''
        });

        if (enquiryId) {
            await Enquiry.findByIdAndDelete(enquiryId);
        }
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Confirm order error:', err);
        res.redirect('/admin/orders');
    }
});

router.post('/update-status/:id', requireAdmin, async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const order = await Order.findById(req.params.id);
        if (order) {
            order.orderStatus = orderStatus;
            await order.save();
        }
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Update order status error:', err);
        res.redirect('/admin/orders');
    }
});

// 🛡️ Admin Verification: Confirm received payment after checking bank statement/UPI
router.post('/orders/:id/update-payment', requireAdmin, async (req, res) => {
    try {
        const { paymentStatus } = req.body;
        const order = await Order.findById(req.params.id);
        if (order) {
            order.paymentStatus = paymentStatus || 'Advance Paid';
            await order.save();
        }
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Update payment status error:', err);
        res.redirect('/admin/orders');
    }
});

// ─── 4. Categories Management ────────────────────────────────
router.get('/categories', requireAdmin, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        const products = await Product.find().select('title category price image');

        const categoriesWithProducts = categories.map(cat => {
            const catObj = cat.toObject();
            catObj.products = products.filter(p => p.category === cat.name || p.category === cat.slug);
            return catObj;
        });

        res.render('admin/categories', {
            title: 'Category Management — M N & SONS Admin',
            categories: categoriesWithProducts
        });
    } catch (err) {
        console.error('Admin categories error:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/categories/add', requireAdmin, async (req, res) => {
    try {
        const { name, icon, description } = req.body;
        if (name && name.trim()) {
            await Category.create({
                name: name.trim(),
                icon: (icon && icon.trim()) || '🗄️',
                description: (description && description.trim()) || ''
            });
        }
        res.redirect('/admin/categories');
    } catch (err) {
        console.error('Add category error:', err);
        res.redirect('/admin/categories');
    }
});

router.post('/categories/edit/:id', requireAdmin, async (req, res) => {
    try {
        const { name, icon, description } = req.body;
        const category = await Category.findById(req.params.id);
        if (category) {
            const oldName = category.name;
            category.name = name.trim();
            if (icon) category.icon = icon.trim();
            if (description !== undefined) category.description = description.trim();
            await category.save();

            if (oldName !== category.name) {
                await Product.updateMany({ category: oldName }, { category: category.name });
            }
        }
        res.redirect('/admin/categories');
    } catch (err) {
        console.error('Edit category error:', err);
        res.redirect('/admin/categories');
    }
});

router.post('/categories/delete/:id', requireAdmin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (category) {
            await Product.updateMany({ category: category.name }, { category: 'General' });
            await Category.findByIdAndDelete(req.params.id);
        }
        res.redirect('/admin/categories');
    } catch (err) {
        console.error('Delete category error:', err);
        res.redirect('/admin/categories');
    }
});

// ─── 5. Products Management (With Direct Photo Upload) ────────
router.get('/products', requireAdmin, async (req, res) => {
    try {
        const { category } = req.query;
        const filter = (category && category !== 'All') 
            ? { category, isDeleted: { $ne: true } } 
            : { isDeleted: { $ne: true } };

        const products = await Product.find(filter).sort({ createdAt: -1 });
        const categories = await Category.find().sort({ name: 1 });

        res.render('admin/products', {
            title: 'Product Catalog — M N & SONS Admin',
            products,
            categories,
            selectedCategory: category || 'All'
        });
    } catch (err) {
        console.error('Admin products error:', err);
        res.status(500).send('Server Error');
    }
});

// 📸 Add Product with Direct Phone/Gallery Upload
router.post('/products/add', requireAdmin, upload.single('productImage'), async (req, res) => {
    try {
        const {
            title,
            category,
            price,
            discountPrice,
            image,
            sheetThickness,
            weightKg,
            lockType,
            description,
            isFeatured
        } = req.body;

        // Image priority: 1. Uploaded File from Gallery/Camera -> 2. Pasted URL -> 3. Fallback
        let finalImage = '';
        if (req.file) {
            finalImage = '/uploads/' + req.file.filename;
        } else if (image && image.trim()) {
            finalImage = image.trim();
        } else {
            finalImage = 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&auto=format&fit=crop&q=80';
        }

        await Product.create({
            title: title.trim(),
            category: category || 'General',
            price: parseFloat(price) || 0,
            discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
            image: finalImage,
            sheetThickness: sheetThickness || '18 Gauge (1.2mm)',
            weightKg: weightKg ? parseFloat(weightKg) : 95,
            lockType: lockType || 'Ultra-Secure Lever Lock',
            description: description || '',
            isFeatured: isFeatured === 'on' || isFeatured === true || isFeatured === 'true'
        });

        res.redirect('/admin/products');
    } catch (err) {
        console.error('Add product error:', err);
        res.redirect('/admin/products');
    }
});

// 📸 Edit Product with Optional New Photo Upload
router.post('/products/edit/:id', requireAdmin, upload.single('productImage'), async (req, res) => {
    try {
        const {
            title,
            category,
            price,
            discountPrice,
            image,
            sheetThickness,
            weightKg,
            lockType,
            description,
            isFeatured
        } = req.body;

        const updateData = {
            title: title.trim(),
            category: category || 'General',
            price: parseFloat(price) || 0,
            discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
            sheetThickness: sheetThickness || '18 Gauge (1.2mm)',
            weightKg: weightKg ? parseFloat(weightKg) : 95,
            lockType: lockType || 'Ultra-Secure Lever Lock',
            description: description || '',
            isFeatured: isFeatured === 'on' || isFeatured === true || isFeatured === 'true'
        };

        // If a new photo was uploaded from gallery
        if (req.file) {
            updateData.image = '/uploads/' + req.file.filename;
        } else if (image && image.trim()) {
            updateData.image = image.trim();
        }

        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Edit product error:', err);
        res.redirect('/admin/products');
    }
});

router.post('/products/delete/:id', requireAdmin, async (req, res) => {
    try {
        // 🛡️ SOFT DELETE: Keep product in DB so historic customer orders are never corrupted
        await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Delete product error:', err);
        res.redirect('/admin/products');
    }
});

module.exports = router;