
const express = require("express");
const path = require("path");
const app = express();
const server = require("http").createServer(app);
const socketio = require("socket.io");
const io = socketio(server);

const locations = {}; // socketId → { latitude, longitude }

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("🟢 New WebSocket connection:", socket.id);

  // Send all existing locations to the newly connected client
  for (let id in locations) {
    socket.emit("locationUpdate", { id, ...locations[id] });
  }

  // When we receive a location from a client
  socket.on("location", (data) => {
    const { latitude, longitude } = data;
    const id = socket.id;

    // Save the socket's latest location
    locations[id] = { latitude, longitude };

    // Send update to everyone (including sender)
    io.emit("locationUpdate", { id, latitude, longitude });
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    const id = socket.id;
    if (locations[id]) {
      delete locations[id];
      io.emit("user-disconnected", id);
      console.log("🔴 Disconnected:", id);
    }
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
