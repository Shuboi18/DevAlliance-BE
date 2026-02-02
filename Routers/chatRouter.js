const express = require("express");
const Chat = require("../Models/chatSchema");
const { userAuth } = require("../userAuth");

const chatRouter = express.Router();

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const userId = req.user._id;

        const chats = await Chat.find({
            $or: [
                { senderId: userId, receiverId: targetUserId },
                { senderId: targetUserId, receiverId: userId },
            ],
        }).sort({ createdAt: 1 });

        res.json(chats);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = chatRouter;
