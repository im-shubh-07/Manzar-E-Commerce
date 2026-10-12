const mongoose = require('mongoose');
const initData = require('./data.js');
const Product = require('../models/Product.js');

// MongoDB Database Connection
const MONGO_URL = 'mongodb://127.0.0.1:27017/mn_and_sons';

main()
    .then(() => {
        console.log('✅ Connected to MongoDB Database');
    })
    .catch((err) => {
        console.log('❌ DB Connection Error:', err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

// Data Initialize Function
const initDB = async () => {
    await Product.deleteMany({});
    console.log('🗑️ Old products deleted');

    await Product.insertMany(initData.data);
    console.log('✨ M N & SONS: Data was successfully initialized with 6 steel almirahs!');
};

initDB();