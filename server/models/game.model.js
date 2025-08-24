const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    game_code: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Z0-9]{6}$/,
    },
    players: {
      type: [
        {
          player: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
          },
          hand: {
            type: [String],
            default: [],
          },
        },
      ],
      default: [],
    },
    settings: {
      type: {
        card_count: {
          type: Number,
          required: true,
          min: 4,
          max: 15,
          default: 6,
        },
        bet_amount: {
          type: Number,
          required: true,
          min: 100,
          max: 10000,
          default: 100,
        },
      },
    },
    status: {
      type: String,
      enum: ["lobby", "ongoing", "waiting_next_round", "finished"],
      default: "lobby",
    },
    losers: {
      type: [{ type: mongoose.Types.ObjectId, ref: "User" }],
      default: [],
    },
    round: {
      type: Number,
      default: 0,
    },
    stacking: { type: Array, default: [] },
    current_suit: {
      type: String,
      default: null,
    },
    current_rank: {
      type: String,
      default: null,
    },
    current_turn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deck: {
      type: [String],
      default: [],
    },
    discard_pile: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Game", GameSchema);
