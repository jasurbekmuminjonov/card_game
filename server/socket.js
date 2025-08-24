const userSockets = new Map();

class Socket {
  async connect(io) {
    io.on("connection", (socket) => {
      const { user_id } = socket.handshake.query;

      if (user_id) {
        userSockets.set(user_id, socket.id);
        console.log(`User ${user_id} socketga ulandi`);
      }

      socket.on("users", () => {
        socket.emit("users", Array.from(userSockets.keys()));
      });

      socket.on("disconnect", () => {
        if (user_id) {
          userSockets.delete(user_id);
          console.log(`User ${user_id} socketdan chiqdi`);
        }
      });
    });
  }

  sendToUser(io, user_id, event, data) {
    const socketId = userSockets.get(user_id);
    if (socketId) {
      io.to(socketId).emit(event, data);
    }
  }
}

module.exports = new Socket();
