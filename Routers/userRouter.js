const express = require("express");
const userRouter = express.Router();
const User = require("../Models/userSchema");
const bcrypt = require("bcrypt");
const { userAuth } = require("../userAuth");
const ConnectRequest = require("../Models/connectReqSchema");
const sendEmail = require("../utils/sendEmail");
const upload = require("../middlewares/uploadMiddleware");
const requestedFields = "fname lname age gender bio skills photoURL";
userRouter.post("/user/signup", upload.single("photo"), async (req, res) => {
  // Signup logic will go here
  try {
    const { fname, lname, email, age, gender, bio, skills, password, developerType } =
      req.body;

    let photoURL = "https://geographyandyou.com/images/user-profile.png"; // Default image
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      photoURL = `${baseUrl}/uploads/profile/${req.file.filename}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const lowercaseEmail = email.toLowerCase();
    const user = new User({
      fname,
      lname,
      email: lowercaseEmail,
      age,
      gender,
      developerType,
      bio,
      skills,
      photoURL,
      password: hashedPassword,
    });
    await user.save();
    res.send("User signed up successfully");
  } catch (err) {
    res.status(500).send("Error signing up user");
  }
});

userRouter.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const lowercaseEmail = email.toLowerCase();

    const user = await User.findOne({ email: lowercaseEmail });
    if (!user) {
      return res.status(400).send("User not found");
    }
    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return res.status(401).send("Invalid password");
    } else {
      const token = await user.getJWT();
      res.cookie("loginToken", token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      res.status(200).json({ message: "Login successful", data: user });
    }
  } catch (err) {
    res.status(500).send("Error logging in user");
  }
});

userRouter.post("/user/logout", async (req, res) => {
  try {
    res.cookie("loginToken", "", { expires: new Date(Date.now()) });
    res.send("User logged out successfully");
  } catch (err) {
    res.status(500).send("Error logging out user");
  }
});

userRouter.post("/user/forgotPassword", async (req, res) => {
  try {
    const { email } = req.body;

    const lowercaseEmail = email.toLowerCase();

    const user = await User.findOne({ email: lowercaseEmail });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Nodemailer configuration would go here.
    // For now, logging to console.

    console.log("---------------------------------------------------");
    console.log(`PASSWORD RESET OTP for ${lowercaseEmail}:`);
    console.log(`OTP: ${otp}`);
    console.log("---------------------------------------------------");

    const message = `Your password reset token is :- \n\n ${otp} \n\nIf you have not requested this email then, please ignore it.`;

    try {
      await sendEmail({
        email: user.email,
        subject: `DevAlliance Password Recovery`,
        message,
      });
      res.status(200).send(`Email sent to ${user.email} successfully`);
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error(err);
      return res.status(500).send(err.message);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error sending OTP");
  }
});

userRouter.post("/user/resetPassword", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const lowercaseEmail = email.toLowerCase();

    const user = await User.findOne({
      email: lowercaseEmail,
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Invalid OTP or expired");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).send("Password has been reset successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error resetting password");
  }
});

userRouter.get("/user/getUserFeed", userAuth, async (req, res) => {
  try {
    const user = req.user._id;
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    limit = limit > 50 ? 50 : limit;

    const allConnections = await ConnectRequest.find({
      $or: [{ fromUserID: user }, { toUserID: user }],
    }).select("fromUserID toUserID");
    const hiddenUsersSet = new Set();

    hiddenUsersSet.add(user.toString());

    allConnections.forEach((req) => {
      hiddenUsersSet.add(req.fromUserID.toString());
      hiddenUsersSet.add(req.toUserID.toString());
    });

    const userFeed = await User.find({
      _id: { $nin: Array.from(hiddenUsersSet) },
    })
      .select(requestedFields)
      .skip(skip)
      .limit(limit);
    res.send(userFeed);
  } catch (err) {
    res.status(500).send("Error retrieving user feed");
  }
});

module.exports = userRouter;
