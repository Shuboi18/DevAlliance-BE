const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect("mongodb+srv://admin:root@cluster0.pe5s8er.mongodb.net/");
}

connectDB().then(() => {
    console.log("Database connected successfully");
}).catch((err) => {
    console.error("Database connection failed:", err);
});

module.exports = connectDB; 