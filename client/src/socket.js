import io from "socket.io-client";

// const SOCKET_URL = `http://localhost:8080`;
const SOCKET_URL = `https://apicardgame.balerion.uz`;
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  query: {
    user_id: localStorage.getItem("user_id"),
  },
});

export default socket;
