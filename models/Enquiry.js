const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  customerName: {
    type: String,
    default: 'Valued Customer'
  },
  phone: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    default: 'Custom Steel Almirah'
  },
  productImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=300&q=80'
  },
  color: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: ''
  },
  designRequirements: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Converted to Order'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Enquiry', enquirySchema);