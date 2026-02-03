const express = require('express');
const profileRouter = express.Router();
const User = require("../Models/userSchema");
const { userAuth } = require("../userAuth");

const upload = require("../middlewares/uploadMiddleware");

profileRouter.get("/profile/getProfile", userAuth, async (req, res) => {
  try {
    const user = req.user;

    res.send(user);
  } catch (err) {
    res.status(500).send("Error retrieving profile");
  }
});

profileRouter.patch("/profile/editProfile", userAuth, upload.single("photo"), async (req, res) => {
  const user = req.user;
  const { fname, lname, gender, bio, skills, developerType } = req.body;

  const updateFields = {
    fname,
    lname,
    gender,
    bio,
    skills,
    developerType,
  };

  if (req.file) {
    updateFields.photoURL = `http://3.106.248.229:3000/uploads/profile/${req.file.filename}`;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(user._id, updateFields);
    res.send("user profile updated successfully");
  } catch (err) {
    res.status(500).send("Error updating profile");
  }
});

profileRouter.delete("/profile/deleteProfile", userAuth, async (req, res) => {
  const user = req.user;
  try {
    const deleteUser = await User.findByIdAndDelete(user._id);
    res.send("user profile deleted successfully");
  } catch (err) {
    res.status(500).send("Error updating profile");
  }
});

module.exports = profileRouter;