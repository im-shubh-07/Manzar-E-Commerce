const express = require('express');
const router = express.Router();
const BusinessEnquiry = require('../models/BusinessEnquiry');

// POST /business/enquiry (Handles both Bulk & Franchise)
router.post('/enquiry', async (req, res) => {
    try {
        const { type, name, phone, organization, city, quantityOrInvestment, message } = req.body;

        // 🛡️ VALIDATION: Require valid 10-digit mobile number
        const cleanPhone = (phone || '').replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
            return res.status(400).render('error', {
                title: 'Valid Contact Number Required',
                message: 'Please provide a valid 10-digit phone number for commercial or franchise discussions.'
            });
        }

        const formattedPhone = cleanPhone.slice(-10);

        const enquiry = new BusinessEnquiry({
            type: type || 'Bulk Wholesale',
            name: (name || '').trim() || 'Valued Commercial Partner',
            phone: formattedPhone,
            organization: (organization || '').trim() || '',
            city: (city || '').trim() || 'Purnia, Bihar',
            quantityOrInvestment: (quantityOrInvestment || '').trim() || '',
            message: (message || '').trim() || ''
        });

        await enquiry.save();

        // Prepare direct WhatsApp message
        const waText = encodeURIComponent(
            `Hello M N & SONS, I am interested in ${enquiry.type}.\nName: ${enquiry.name}\nPhone: ${enquiry.phone}\nOrg/City: ${enquiry.organization} (${enquiry.city})\nDetails: ${enquiry.quantityOrInvestment} ${enquiry.message}`
        );

        res.render('business/success', {
            title: 'Application Received — M N & SONS',
            enquiry,
            waLink: `https://wa.me/917782091388?text=${waText}`
        });
    } catch (err) {
        console.error('Business enquiry error:', err);
        res.status(500).redirect('/');
    }
});

module.exports = router;