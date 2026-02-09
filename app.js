// Final Back end for DevAlliance

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

// --- REQUEST LOGGER ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("Origin:", req.headers.origin);
  next();
});

// --- CORS CONFIGURATION START ---
// Use standard cors package with origin: true (reflects request origin)
// Use standard cors package with origin: true (reflects request origin)
const corsOptions = {
  origin: true, // Allow any origin to connect, reflecting the request origin
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "device-remember-token",
    "Access-Control-Allow-Origin",
    "Origin",
    "Accept",
  ],
};

console.log("--- SERVER STARTING ---");
console.log("CORS ALLOWED ORIGINS:", corsOptions.origin);
app.use(cors(corsOptions));
// --- CORS CONFIGURATION END ---

// Health Check Route
app.get("/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", message: "Server is running and CORS is active" });
});

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: true, // Allow all origins for Socket.io
    credentials: true,
  },
});

app.use(cp());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/", userRouter);
app.use("/", profileRouter);
app.use("/", connectRouter);
const chatRouter = require("./Routers/chatRouter");
app.use("/", chatRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error Stack:", err.stack);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
    details: err.message,
  });
});

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

  // Track online users
  socket.on("addNewUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("Online users:", Array.from(onlineUsers.keys()));
    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
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

// Serve Frontend Static Files
const path = require("path");
const fs = require("fs");

// Check for common frontend directory names
const possibleFrontendPaths = [
  path.join(__dirname, "../Frontend/dist"),
  path.join(__dirname, "../DevAlliance-FE/dist"),
];

let frontendPath = possibleFrontendPaths.find((p) => fs.existsSync(p));

if (frontendPath) {
  console.log("Serving Frontend from:", frontendPath);
  app.use(express.static(frontendPath));
} else {
  console.error(
    "CRITICAL: Frontend build not found. Checked:",
    possibleFrontendPaths,
  );
  // Fallback to standard path specifically to show the error in the browser if possible
  frontendPath = path.join(__dirname, "../Frontend/dist");
}

// Handle SPA 404 (Wildcard Route) - Must be after all API routes
app.use((req, res, next) => {
  if (req.method === "GET") {
    console.log(`Fallback for SPA: ${req.url}`);
    res.sendFile(path.join(frontendPath, "index.html"), (err) => {
      if (err) {
        console.error("Error serving index.html:", err);
        // If index.html is missing, it means the frontend isn't built or path is wrong.
        // Send a clear 404/500 message to the client.
        res
          .status(500)
          .send(
            `Server Error: Frontend build not found. Checked: ${possibleFrontendPaths.map((p) => path.basename(path.dirname(p))).join(", ")}. Please run 'npm run build' in the frontend directory.`,
          );
      }
    });
  } else {
    next();
  }
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
