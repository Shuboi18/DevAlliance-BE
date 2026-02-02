const User = require("./Models/userSchema");
const jwt = require("jsonwebtoken");

const userAuth = async (req, res, next) => {
  try {
    const { loginToken } = req.cookies;
    if (!loginToken) {
      return res.status(401).send("Unauthorized: No token provided");
    }
    const verifyingUser = await jwt.verify(loginToken, "onlythe@server.knows");
    const { _id } = verifyingUser;
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send("User not found");
    }
    req.user = user;
  } catch (err) {
    return res.status(401).send("Unauthorized: Invalid token");
  }
  next();
};
module.exports = { userAuth };
