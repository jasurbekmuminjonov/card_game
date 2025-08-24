const User = require("../models/user.model");
const mongoose = require("mongoose");

exports.registerUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    const data = {
      username: user.username,
      user_id: user._id,
    };
    return res.status(201).json({ status: "success", data });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (user) {
      return res.json({ status: "username_is_occupied" });
    } else {
      return res.json({ status: "username_is_free" });
    }
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.transferMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { user_id } = req.params;
    const { username, amount } = req.body;

    const sender = await User.findById(user_id).session(session);

    if (!sender) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ status: "sender_not_found" });
    }

    if (sender.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ status: "insufficient_funds" });
    }

    sender.balance -= amount;
    await sender.save({ session });

    const receiver = await User.findOneAndUpdate(
      { username },
      { $inc: { balance: amount } },
      { new: true, session }
    );

    if (!receiver) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ status: "receiver_not_found" });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ status: "transfer_success" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};
