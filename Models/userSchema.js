const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: {
      values: ["Male", "Female", "Others"],
      message: "Please select a valid gender",
    },
  },
  bio: {
    type: String,
    required: true,
  },
  skills: {
    type: String,
    required: true,
  },
  photoURL: {
    type: String,
    required: true,
  },
  developerType: {
    type: String,
    // required: true, // Making it optional for now to avoid issues with existing users, or handle it in application logic
    required: true,
    default: "Developer"
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
});

UserSchema.methods.getJWT = async function () {
  const user = this;
  const token = await jwt.sign({ _id: user._id }, "onlythe@server.knows", { expiresIn: "1d" });
  return token;
}

UserSchema.methods.validatePassword = async function (passwordInput) {
  const user = this;
  const isMatch = await bcrypt.compare(passwordInput, user.password);
  return isMatch;
}


module.exports = mongoose.model('User', UserSchema);