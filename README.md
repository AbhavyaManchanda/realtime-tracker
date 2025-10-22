This project is a real-time multi-user location tracker. Each connected user can see everyone else’s location on a live map.

User Opens the Page

The browser loads index.ejs, which displays a Leaflet map.

script.js runs, connecting the client to the server via Socket.IO.

Tracking User Location

navigator.geolocation.watchPosition continuously fetches the user’s latitude and longitude.

Each new location is sent to the server with the user’s unique clientId.

Server Side (app.js)

Receives location updates and stores them in memory (locations).

Broadcasts the update to all connected clients.

When a user disconnects, removes their location and notifies others.

Updating the Map

Each client listens for locationUpdate events.

If a marker exists for a user, it moves the marker to the new position.

If a new user appears, a new marker is created.

When someone disconnects, their marker is removed.

User Experience

All users see each other moving live on the map.

Clicking a marker shows that user’s latitude and longitude.

The map view automatically adjusts to include all visible markers.

Flow Diagram (Text Version)
+-----------+        +-------------+        +-------------+
|   Client  | <----> |   Server    | <----> | Other Clients |
| (Browser) |        | (app.js)    |        | (Browsers)   |
+-----------+        +-------------+        +-------------+
      |                     |                     |
      | watchPosition       |                     |
      |-------------------> |                     |
      | location {id, lat, lng}                   |
      |                     |                     |
      |                     | io.emit("locationUpdate") 
      |                     |------------------->|
      |                     |                     |
      | io.on("locationUpdate")                  |
      |<-----------------------------------------|
      | update / create markers                  |
      |                     |                     |
      |<--- user-disconnected -------------------|
      | remove marker                             |


In one line: “Each browser tells the server where it is, the server shares it with everyone, and everyone updates their maps live.”





app.js
 
### **1. Imports and Setup**

```js
const express = require("express");
const path = require("path");
const app = express();
const server = require("http").createServer(app);
const socketio = require("socket.io");
const io = socketio(server);
```

* **express**: Web framework for serving routes and static files.
* **path**: Node utility for handling file paths.
* **http.createServer(app)**: Creates an HTTP server from the Express app. Needed for Socket.IO to hook into.
* **socket.io**: Enables real-time bidirectional communication between clients and server.

`io` is your Socket.IO server instance.

---

### **2. Data Structures**

```js
const locations = {}; // clientId → { lat, lng }
const socketToClient = {}; // socket.id → clientId
```

* `locations` keeps the latest latitude & longitude for each client by their **client ID**.
* `socketToClient` maps the **socket connection** to the **client ID**, so when a socket disconnects, you know which client it belonged to.

---

### **3. Express Configuration**

```js
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
```

* Using **EJS** for rendering HTML templates.
* Serves static files (JS, CSS, images) from the `public` folder.

---

### **4. Socket.IO Connection Handling**

```js
io.on("connection", (socket) => {
  console.log("🟢 New WebSocket connection:", socket.id);
```

* Triggered whenever a new client connects. `socket.id` is unique for each connection.

---

#### **4a. Send Existing Locations**

```js
for (let id in locations) {
  socket.emit("locationUpdate", { id, ...locations[id] });
}
```

* When a new client joins, send them the **current locations of all other clients**.

---

#### **4b. Receiving Location Updates**

```js
socket.on("location", (data) => {
  const { id, latitude, longitude } = data;
  socketToClient[socket.id] = id;
  locations[id] = { latitude, longitude };
  io.emit("locationUpdate", { id, latitude, longitude });
});
```

* When a client sends their location:

  1. Store which socket belongs to which client.
  2. Update `locations` with their new coordinates.
  3. Broadcast the updated location to **all clients**, including the sender.

---

#### **4c. Handling Disconnects**

```js
socket.on("disconnect", () => {
  const clientId = socketToClient[socket.id];
  if (clientId) {
    delete locations[clientId];
    delete socketToClient[socket.id];
    io.emit("user-disconnected", clientId);
    console.log("🔴 Disconnected:", clientId);
  }
});
```

* When a client leaves:

  1. Find which client ID was associated with that socket.
  2. Remove them from `locations` and `socketToClient`.
  3. Notify all other clients that this user disconnected.

---

### **5. Express Route**

```js
app.get("/", (req, res) => {
  res.render("index");
});
```

* Renders the `index.ejs` page when someone visits `/`.

---

### **6. Start Server**

```js
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

* Starts the server on port 3000 (or any port defined in environment).


SCRIPT.JS
1. Socket.IO and Client ID
const socket = io();
const clientId = Math.random().toString(36).substring(2, 10); // unique ID per tab


io() connects the browser to the server’s Socket.IO.

clientId is a random short string identifying this user/tab.

Note: You’re not using localStorage anymore, so every tab gets a new ID.

2. Map Initialization
function initMap() {
  map = L.map("map").setView([30.3431, 76.3554], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);


Creates a Leaflet map centered at a default location ([30.3431, 76.3554]).

15 is the zoom level.

Adds OpenStreetMap tiles.

3. Watching User Location
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      socket.emit("location", { id: clientId, latitude, longitude });
    },
    (err) => console.error("Geolocation error:", err),
    { enableHighAccuracy: true }
  );
}


navigator.geolocation.watchPosition continuously tracks the user’s location.

Sends the location to the server using socket.emit("location", { id, latitude, longitude }).

enableHighAccuracy: true asks the browser for the best available location data.

This is the real-time part of the app: your location keeps being broadcasted.

4. Markers Storage
const markers = {}; // clientId → marker


Keeps track of Leaflet markers for all clients.

Each marker is keyed by clientId so we can update or remove it later.

5. Listening for Updates
socket.on("locationUpdate", (data) => {
  const { id, latitude, longitude } = data;

  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
  } else {
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(`Latitude: ${latitude}<br>Longitude: ${longitude}`);
  }
});


Receives real-time locations from the server.

If a marker for that client already exists → update its position.

If not → create a new marker with a popup showing latitude and longitude.

6. Handling Disconnects
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});


When the server tells us a user left:

Remove their marker from the map.

Delete it from the markers object.

 



