const socket = require("../socket");

const sendGameToPlayers = (req, players) => {
  if (!Array.isArray(players)) return;
  const io = req.app.get("socket");
  console.log(players);

  players.forEach((player) => {
    if (player?.player) {
      socket.sendToUser(io, player.player?.toString(), "get_game");
    }
  });
};
module.exports = { sendGameToPlayers };
