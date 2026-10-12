const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    customerName: {
        type: String,
        default: 'Valued Customer'
    },
    phone: {
        type: String,
        default: ''
    },
    title: {
        type: String,
        default: 'Custom Fabricated Steel Almirah'
    },
    color: String,
    size: String,
    designRequirements: String,

    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            title: String,
            price: Number,
            quantity: {
                type: Number,
                default: 1
            },
            image: String
        }
    ],

    totalAmount: {
        type: Number,
        required: true
    },
    paymentType: {
        type: String,
        enum: ['partial', 'full'],
        default: 'partial'
    },
    advancePaid: {
        type: Number,
        default: 0
    },
    remainingAmount: {
        type: Number,
        default: 0
    },
    deliveryAddress: {
        type: String,
        required: true,
        default: 'Purnia, Bihar'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Advance Paid', 'Fully Paid'],
        default: 'Pending'
    },

    // 🚚 5-Step Live Tracking Status for Customer:
    orderStatus: {
        type: String,
        enum: ['Confirmed', 'Under Fabrication', 'Powder Coating', 'Dispatched', 'Delivered'],
        default: 'Confirmed'
    },

    // 👉 Custom Workshop Note for Buyer (According to Product Fabrication)
    statusMessage: {
        type: String,
        default: ''
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);