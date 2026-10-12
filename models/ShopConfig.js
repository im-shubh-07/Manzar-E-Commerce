const mongoose = require('mongoose');

const shopConfigSchema = new mongoose.Schema({
    stage2Name: {
        type: String,
        default: 'Under Fabrication'
    },
    stage3Name: {
        type: String,
        default: 'Powder Coating'
    }
});

module.exports = mongoose.model('ShopConfig', shopConfigSchema);