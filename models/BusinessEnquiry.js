const mongoose = require('mongoose');

const businessEnquirySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Bulk Wholesale', 'Franchise Dealership'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    organization: {
        type: String,
        default: '' // School, Hostel, Hotel, Shop Name
    },
    city: {
        type: String,
        default: 'Purnia'
    },
    quantityOrInvestment: {
        type: String,
        default: '' // e.g. "25 Almirahs" or "₹2-5 Lakhs"
    },
    message: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'Contacted', 'Closed'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BusinessEnquiry', businessEnquirySchema);