// const express = require('express');
// const path = require('path');
// const app = express();

// const server=require('http').createServer(app);

// const socketio = require('socket.io');

// const io = socketio(server);

// const locations = {}; // Store locations by socket.id

// app.set('view engine', 'ejs');
// //this app.set is used to set the view engine to ejs
// //so that we can render ejs files from the views folder
// //view engine is used to set the template engine
// //ejs is a template engine that allows us to write html code with embedded javascript

// app.use(express.static(path.join(__dirname, 'public')));

// const socketToClient = {}; // Map socket.id to client id
// io.on('connection', (socket) => {
//     console.log('New WebSocket connection');

//     // Send all existing locations to the new client
//     for (let id in locations) {
//         socket.emit('locationUpdate', {id, ...locations[id]});
//     }

//     socket.on('location', (data) => {
//         const { id, latitude, longitude } = data;
//         locations[id] = { latitude, longitude };
//         io.emit("locationUpdate", { id, latitude, longitude });
//     });
//     socket.on('disconnect', () => {
//         const clientId = socketToClient[socket.id];
//         delete locations[clientId];
//         delete socketToClient[socket.id];
//         io.emit("user-disconnected", clientId);
//     })
        
// });

// app.get("/", function (req, res) {
//     res.render("index");
// })

// server.listen(3000, function () {
//     console.log("server started at port 3000");
// })

const express = require("express");
const path = require("path");
const app = express();
const server = require("http").createServer(app);
const socketio = require("socket.io");
const io = socketio(server);

const locations = {}; // clientId → { lat, lng }
const socketToClient = {}; // socket.id → clientId

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
    const { id, latitude, longitude } = data;

    // Remember which socket belongs to which client ID
    socketToClient[socket.id] = id;

    // Save the client’s latest location
    locations[id] = { latitude, longitude };

    // Send update to everyone (including sender)
    io.emit("locationUpdate", { id, latitude, longitude });
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    const clientId = socketToClient[socket.id];
    if (clientId) {
      delete locations[clientId];
      delete socketToClient[socket.id];
      io.emit("user-disconnected", clientId);
      console.log("🔴 Disconnected:", clientId);
    }
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
