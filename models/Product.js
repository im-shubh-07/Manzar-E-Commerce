const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
  },
  category: {
    type: String,
    default: 'General',
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  discountPrice: {
    type: Number,
    min: 0,
  },
  color: {
    type: String,
    default: 'Steel Grey',
    trim: true,
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&auto=format&fit=crop&q=80',
  },
  sheetThickness: {
    type: String,
    default: '18 Gauge (1.2mm)',
  },
  weightKg: {
    type: Number,
    default: 95,
  },
  lockType: {
    type: String,
    default: 'Ultra-Secure Lever Lock',
  },
  dimensions: {
    type: String,
    default: '78"H x 36"W x 20"D',
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Backward compatibility virtuals for storefront templates
productSchema.virtual('name')
  .get(function() { return this.title; })
  .set(function(v) { this.title = v; });

productSchema.virtual('gauge')
  .get(function() { return this.sheetThickness; })
  .set(function(v) { this.sheetThickness = v; });

productSchema.virtual('featured')
  .get(function() { return this.isFeatured; })
  .set(function(v) { this.isFeatured = v; });

module.exports = mongoose.model('Product', productSchema);
