const express = require("express");
const connectRouter = express.Router();
const ConnectRequest = require("../Models/connectReqSchema");
const { userAuth } = require("../userAuth");
const User = require("../Models/userSchema");
const requestedFields = ["fname", "lname", "age", "gender", "bio", "skills", "photoURL"];

connectRouter.post(
  "/connect/request/:status/:toUserID",
  userAuth,
  async (req, res) => {
    try {
      const fromUserID = req.user._id;
      const toUserID = req.params.toUserID;
      const status = req.params.status;
      const allowedStatus = ["ignored", "interested"];

      if (fromUserID.toString() === toUserID.toString()) {
        return res.status(400).send("Cannot send a request to yourself");
      }
      if (!allowedStatus.includes(status)) {
        return res.status(400).send("Bad Request");
      }
      const checkValidConnection = await User.findById(toUserID);
      if (!checkValidConnection) {
        return res.status(400).send("User does not exist please check again");
      }
      const existingConnection = await ConnectRequest.findOne({
        $or: [
          { fromUserID, toUserID },
          { fromUserID: toUserID, toUserID: fromUserID },
        ],
      });
      if (existingConnection) {
        return res.status(400).send("Connect Request already exists");
      }

      const connectReq = new ConnectRequest({
        fromUserID,
        toUserID,
        status,
      });
      await connectReq.save();
      res.send("Connection Request Sent Succesfully");
    } catch (err) {
      res.status(400).send("Something went wrong");
    }
  }
);

//doubt
connectRouter.post(
  "/connect/response/:status/:_id",
  userAuth,
  async (req, res) => {
    try {
      const allowedStatus = ["accepted", "rejected"];
      const loggedUser = req.user;
      const { status, _id } = req.params;
      if (!allowedStatus.includes(status)) {
        return res.status(400).send("Bad Request");
      }
      const connectRes = await ConnectRequest.findOne({
        _id: _id,
        toUserID: loggedUser._id,
        status: "interested",
      });
      if (!connectRes) {
        return res.status(404).send("No such connection request found");
      }

      connectRes.status = status;
      const data = await connectRes.save();
      res.json({
        message: "Connection Request " + status + " successfully",
        data: data,
      });
    } catch (err) {
      res.status(400).send("Something went wrong");
    }
  },
);

connectRouter.get("/connect/pendingConnections", userAuth, async (req, res) => {
  try {
    const user = req.user._id;
    const pendingConnections = await ConnectRequest.find({
      toUserID: user,
      status: "interested",
    })
      .select("_id fromUserID")
      .populate("fromUserID", requestedFields);
    if (!pendingConnections) {
      return res.send("No requests to show");
    }
    res.send(pendingConnections);
  } catch (err) {
    res.status(400).send("Something went wrong");
  }
});

connectRouter.get("/connect/myConnections", userAuth, async (req, res) => {
  try {
    const user = req.user._id;
    const myConnections = await ConnectRequest.find({
      $or: [
        { toUserID: user, status: "accepted" },
        { fromUserID: user, status: "accepted" },
      ],
    })
      .populate("fromUserID", requestedFields)
      .populate("toUserID", requestedFields);

    const filteredConnections = myConnections.map((connection) => {
      if (connection.fromUserID._id.toString() === user.toString()) {
        return connection.toUserID;
      }
      return connection.fromUserID;
    });

    res.json({
      data: filteredConnections,
    });
  } catch (err) {
    res.status(400).send("Something went wrong");
  }
});

module.exports = connectRouter;
