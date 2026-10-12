const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true
    },
    icon: {
        type: String,
        default: 'bi-grid'
    },
    description: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

categorySchema.pre('save', function (next) {
    if (this.name) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    }
    next();
});

module.exports = mongoose.model('Category', categorySchema);