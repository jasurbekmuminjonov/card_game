const express = require("express");
const {
  registerUser,
  checkUsername,
  transferMoney,
  loginUser,
} = require("../controllers/user.controller");

const {
  createGame,
  joinGame,
  startGame,
  playTurn,
  getFromDeck,
  refillDeck,
  kickPlayer,
  exitGame,
  startAnotherRound,
  getUserGame,
} = require("../controllers/game.controller");
const rt = express.Router();

//user routes
rt.post("/register", registerUser);
rt.post("/login", loginUser);
rt.post("/username/check", checkUsername);
rt.post("/transfer", transferMoney);

//game routes
rt.post("/game/create", createGame);
rt.post("/game/join", joinGame);
rt.post("/game/start", startGame);
rt.post("/game/turn", playTurn);
rt.post("/game/deck/get", getFromDeck);
rt.post("/game/deck/refill", refillDeck);
rt.post("/game/player/kick", kickPlayer);
rt.post("/game/exit", exitGame);
rt.post("/game/start/another", startAnotherRound);
rt.get("/game/get", getUserGame);

module.exports = rt;
