const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect("mongodb+srv://admin:root@cluster0.pe5s8er.mongodb.net/");
}



module.exports = connectDB; 