const mongoose = require("mongoose");
const connectDB = require("../DBconnect");
const User = require("../Models/userSchema");
const bcrypt = require("bcrypt");

const seedUsers = async () => {
    try {
        await connectDB();
        console.log("Database connected for seeding...");

        const users = [];
        const passwordHash = await bcrypt.hash("123456", 10);

        // User 0: test@test.com
        // Users 1-99: test1@test.com ... test99@test.com
        for (let i = 0; i < 100; i++) {
            const email = i === 0 ? "test@test.com" : `test${i}@test.com`;

            users.push({
                fname: `TestUser${i}`,
                lname: "Dev",
                email: email,
                age: Math.floor(Math.random() * (40 - 20 + 1)) + 20, // Random age 20-40
                gender: ["Male", "Female", "Others"][Math.floor(Math.random() * 3)],
                bio: `This is a bio for test user ${i}. I love coding!`,
                skills: "JavaScript, React, Node.js, MongoDB",
                photoURL: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp",
                developerType: ["Frontend Developer", "Backend Developer", "Full Stack Developer"][Math.floor(Math.random() * 3)],
                password: passwordHash, // All share the same hashed password
            });
        }

        // Optional: Clear existing test users if needed, but for now just appending.
        // Actually, to avoid duplicate key errors if run multiple times, might be good to check.
        // But user just asked to "add". I'll wrap in try-catch to ignore duplicate email errors or just let it fail if they exist.
        // Better: use insertMany with ordered: false to skip duplicates?
        // Or just let it run. If test@test.com exists, it will error. 
        // I will assume the db is either empty or these users don't exist.

        try {
            await User.insertMany(users, { ordered: false });
            console.log("Successfully added 100 test users!");
        } catch (error) {
            if (error.code === 11000) {
                console.log("Some users already exist (Duplicate Key Error). Added the rest.");
            } else {
                throw error;
            }
        }

        mongoose.connection.close();
        console.log("Database connection closed.");
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seedUsers();
