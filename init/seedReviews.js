const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');

const MONGO_URI = 'mongodb://127.0.0.1:27017/mn_and_sons';

const sampleReviews = [
    {
        rating: 5,
        authorName: 'Rajesh Kumar (Madhubani, Purnia)',
        comment: 'Heavy gauge steel hai sach me! Weld finishing aur powder coating bilkul smooth hai. Purnia me aisa heavy quality almirah milna mushkil tha pehle. Godrej level finishing!'
    },
    {
        rating: 5,
        authorName: 'Md. Tariq Anwar (Bhatta Bazar)',
        comment: 'Internal locker system bohot secure aur strong hai. Brass locks chalane me bohot smooth hain. On-time delivery mili workshop se. Very satisfied!'
    },
    {
        rating: 4,
        authorName: 'Suman Roy (Gulabbagh)',
        comment: 'Shandaar build quality! 20-gauge sheet sach me solid hai, door band karte waqt solid thud sound aati hai. Royal Green color bedroom me bohot classy lagta hai.'
    },
    {
        rating: 5,
        authorName: 'Amit Sharma (Line Bazar)',
        comment: 'Custom shelves ke sath order kiya tha, exact dimension ke sath fabricate kiya M N & SONS ne. Advance 30% diya tha, delivery ke baad balance liya. Trustworthy service.'
    },
    {
        rating: 5,
        authorName: 'Pooja Verma (Navratan Hatta)',
        comment: 'Purnia me best steel fabrication workshop! Paint scratch-resistant hai aur weight kaafi heavy hai. Generations tak chalne wali cheez hai.'
    }
];

async function seedReviews() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB for Review Seeding');

        // Find any user or create a fallback user ID
        let dummyUser = await User.findOne();
        if (!dummyUser) {
            dummyUser = await User.create({
                name: 'Verified Customer',
                email: 'customer@mnandsons.com',
                phone: '9876543210',
                password: 'password123'
            });
        }

        // Get all products
        const products = await Product.find();
        if (products.length === 0) {
            console.log('⚠️ No products found. Please seed products first.');
            process.exit();
        }

        // Clear old reviews
        await Review.deleteMany({});
        console.log('🧹 Cleared old reviews');

        // Add 2-3 reviews per product
        let totalAdded = 0;
        for (let product of products) {
            // Pick 2 or 3 reviews for each product
            const reviewCount = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < reviewCount; i++) {
                const template = sampleReviews[(totalAdded + i) % sampleReviews.length];
                await Review.create({
                    product: product._id,
                    user: dummyUser._id,
                    authorName: template.authorName,
                    rating: template.rating,
                    comment: template.comment,
                    isVerifiedBuyer: true,
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 10 * 86400000)) // within last 10 days
                });
                totalAdded++;
            }
        }

        console.log(`🎉 Successfully seeded ${totalAdded} verified customer reviews across all products!`);
        mongoose.connection.close();
    } catch (err) {
        console.error('❌ Error seeding reviews:', err);
        mongoose.connection.close();
    }
}

seedReviews();