
const express = require("express");
const path = require("path");
const app = express();
const server = require("http").createServer(app);
const socketio = require("socket.io");
const io = socketio(server);

const locations = {}; // socketId → { latitude, longitude, deviceId, deviceName }

// Known devices registry: deviceId → friendlyName
const knownDevices = {
  // Add known devices here:
  // "device-uuid-123": "Mom's iPhone",
  // "device-uuid-456": "Dad's Phone",
};

function getDeviceName(deviceId) {
  return knownDevices[deviceId] || "Unknown Device";
}

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("🟢 New WebSocket connection:", socket.id);

  // Send all existing locations to the newly connected client
  for (let id in locations) {
    socket.emit("locationUpdate", { id, ...locations[id] });
  }
  
  // Send the known devices list to this client
  socket.emit("knownDevices", knownDevices);

  // When we receive a location from a client
  socket.on("location", (data) => {
    const { latitude, longitude, deviceId } = data;
    const id = socket.id;
    const deviceName = getDeviceName(deviceId);

    // Save the socket's latest location with device info
    locations[id] = { latitude, longitude, deviceId, deviceName };

    // Send update to everyone (including sender)
    io.emit("locationUpdate", { id, latitude, longitude, deviceId, deviceName });
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
