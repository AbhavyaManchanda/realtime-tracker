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
