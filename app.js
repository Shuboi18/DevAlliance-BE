const express = require("express");
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({ path: "config/config.env" });
}
const cors = require("cors");
const app = express();
const port = 3000;
const connectDB = require("./DBconnect");
const User = require("./Models/userSchema");
const cp = require("cookie-parser");
const { userAuth } = require("./userAuth");
const userRouter = require("./Routers/userRouter");
const profileRouter = require("./Routers/profileRouter");
const connectRouter = require("./Routers/connectRouter");

// --- MANUALLY REFLECT CORS HEADERS TO ALLOW ALL HOSTS ---
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Dynamically set the Access-Control-Allow-Origin header to the request's Origin
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // For non-browser requests (Postman, etc), generally safe to allow
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, device-remember-token, Access-Control-Allow-Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Respond OK to preflight OPTIONS requests immediately
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: true, // Socket.io handles this internally to allow all
    credentials: true,
  },
});
// --- END CORS CONFIGURATION ---

app.use(cp());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/", userRouter);
app.use("/", profileRouter);
app.use("/", connectRouter);
const chatRouter = require("./Routers/chatRouter");
app.use("/", chatRouter);

const Chat = require("./Models/chatSchema");

const onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
  console.log("A user connected: " + socket.id);

  socket.on("join_chat", ({ userId, targetUserId }) => {
    // simple room id generation: sort IDs to ensure both users join the same room
    const roomId = [userId, targetUserId].sort().join("_");
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
  });

  // Track online users for direct calling
  socket.on("addNewUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("Online users:", Array.from(onlineUsers.keys()));
    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
  });

  // Call Events
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    const socketId = onlineUsers.get(userToCall);
    if (socketId) {
      io.to(socketId).emit("callUser", { signal: signalData, from, name });
    }
  });

  socket.on("answerCall", (data) => {
    const socketId = onlineUsers.get(data.to);
    if (socketId) {
      io.to(socketId).emit("callAccepted", data.signal);
    }
  });

  // Handle ICE candidates for stability (optional but recommended for simple-peer if strictly needed, mostly handled by signal data)
  // simple-peer wraps ice candidates in the signal data usually.

  socket.on("endCall", ({ to }) => {
    const socketId = onlineUsers.get(to);
    if (socketId) {
      io.to(socketId).emit("callEnded");
    }
  });

  socket.on("send_message", async ({ senderId, receiverId, message }) => {
    try {
      const newChat = new Chat({ senderId, receiverId, message });
      await newChat.save();
      const roomId = [senderId, receiverId].sort().join("_");
      io.to(roomId).emit("receive_message", newChat);
    } catch (err) {
      console.error("Error saving chat:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // Remove user from onlineUsers map
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
        break;
      }
    }
  });
});

connectDB()
  .then(() => {
    console.log("Database connected successfully");
    server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });




