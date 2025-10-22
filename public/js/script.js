// if (!localStorage.getItem("clientId")) {
//   // Random short ID like 'k3f8x2p'
//   localStorage.setItem("clientId", Math.random().toString(36).substring(2, 10));
// }
// const clientId = localStorage.getItem("clientId");

// const socket = io();

// // Get user's location and emit to server
// // Check if geolocation is supported

// if (navigator.geolocation) {
//   navigator.geolocation.watchPosition(
//     (position) => {
//       const latitude = position.coords.latitude;
//       const longitude = position.coords.longitude;
//       socket.emit("location", { latitude, longitude });
//     },
//     (error) => {
//       console.error("Error getting location: ", error);
//     },
//     {
//       enableHighAccuracy: true,
//       maximumAge: 0, //no cached data
//       timeout: 5000,
//     }
//   );
// }

// const map = L.map("map").setView([0, 0], 10);

// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   attribution:
//     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
// }).addTo(map);

// const markers = {}; // Object to hold markers by socket.id
// const positions = {}; // Object to hold positions by socket.id

// socket.on("locationUpdate", (data) => {
//   console.log("Location update received: ", data);
//   const { id, latitude, longitude } = data;
//   if (markers[id]) {
//     markers[id].setLatLng([latitude, longitude]);
//     positions[id] = [latitude, longitude];
//   } else {
//     markers[id] = L.marker([latitude, longitude]).addTo(map);
//     positions[id] = [latitude, longitude];
//   }
//   markers[id]
//     .bindPopup(`Latitude: ${latitude}<br>Longitude: ${longitude}`)
//     .openPopup();
//   // Fit map to all positions
//   const allPositions = Object.values(positions);
//   if (allPositions.length > 0) {
//     map.fitBounds(allPositions);
//   }
// });

// socket.on("user-disconnected", (id) => {
//   if (markers[id]) {
//     map.removeLayer(markers[id]);
//     delete markers[id];
//     delete positions[id];
//   }
//   console.log("User disconnected: ", id);
//   // Fit map to remaining positions
//   const allPositions = Object.values(positions);
//   if (allPositions.length > 0) {
//     map.fitBounds(allPositions);
//   } else {
//     map.setView([0, 0], 10); // Reset to default if no markers
//   }
// });

const socket = io();
const clientId = Math.random().toString(36).substring(2, 10); // unique ID per tab
let map, marker;

function initMap() {
  map = L.map("map").setView([30.3431, 76.3554], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // When your own location updates, send to server
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
}

initMap();

const markers = {}; // clientId → marker

// Listen for location updates from ANY client
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

// Remove marker when someone disconnects
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});
