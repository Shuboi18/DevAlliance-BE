const mongoose = require("mongoose");

const connectReqSchema = new mongoose.Schema(
  {
    fromUserID: {
      type: mongoose.Schema.Types.ObjectId,
      ref:"User",
      required: true,
    },
    toUserID: {
      type: mongoose.Schema.Types.ObjectId,
      ref:"User",
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ["ignored", "interested", "accepted", "rejected"],
        message: "{VALUE} is not supported",
      },
    },
  },
  { timestamps: true }
);

connectReqSchema.index({ fromUserID: 1, toUserID: 1 });



// connectReqSchema.pre("save", function (next) {
//   const ConnectRequest = this;
//   if (ConnectRequest.fromUserID.equals(connectSchemaInstance.toUserID)) {
//     throw new Error("Cannot send a connection request to yourself");
//   }
//   next();
// });

module.exports = mongoose.model("ConnectRequest", connectReqSchema);
