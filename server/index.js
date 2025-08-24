const { mongodb } = require("./config/mongodb");

require("dotenv").config();
mongodb();
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
const { createServer } = require("node:http");
const auth = require("./middlewares/auth");
const server = createServer(app);
const io = require("./middlewares/socket.header")(server);
const socket = require("./socket");

app.set("socket", io);
socket.connect(io);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1", auth, require("./routes/routes"));

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}/api/v1`);
});
