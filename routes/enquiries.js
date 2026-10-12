const express = require('express');
const router = express.Router();
const Enquiry = require('../models/Enquiry');

// ─── 1. GET /enquiries/custom (Custom Design Form Page) ────────────────
router.get('/custom', (req, res) => {
  res.render('enquiries/custom', {
    title: 'Custom Steel Almirah Fabrication — M N & SONS'
  });
});

// ─── 2. POST /enquiries/custom (Form Submit Handler) ───────────────────
router.post('/custom', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      color,
      size,
      doorType,
      designRequirements,
      message,
      productName,
      productImage
    } = req.body;

    // 🛡️ VALIDATION: Require valid 10-digit mobile number
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).render('error', {
        title: 'Valid Contact Number Required',
        message: 'Please provide a valid 10-digit mobile number so our fabrication team can coordinate your design.'
      });
    }

    const formattedPhone = cleanPhone.slice(-10);

    // Fallback Product Name if not provided
    const resolvedName = productName
      || (doorType ? `${doorType} Almirah` : (color ? `${color} Steel Almirah` : 'Custom Fabricated Steel Almirah'));

    // Fallback Image
    const resolvedImage = productImage
      || 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=300&q=80';

    const enquiry = new Enquiry({
      customerName: (customerName || '').trim() || (req.session.userName || 'Valued Customer'),
      phone: formattedPhone,
      productName: resolvedName,
      productImage: resolvedImage,
      color: color || 'Standard',
      size: size || 'Standard',
      designRequirements: `${doorType ? '[' + doorType + '] ' : ''}${designRequirements || ''} ${message || ''}`.trim(),
      status: 'Pending'
    });

    await enquiry.save();

    res.render('enquiries/success', {
      title: 'Custom Request Received — M N & SONS',
      enquiry
    });
  } catch (err) {
    console.error('Custom Enquiry Error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to submit enquiry. Please try again.'
    });
  }
});

module.exports = router;