const socket = io();
let map;
const connectedSockets = new Set();
const markers = {}; // socketId → marker
const markerPositions = {};
const locationCounts = {};

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
        socket.emit("location", { latitude, longitude });
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );
  }
}

initMap();

function updateConnectedSockets() {
  const container = document.getElementById("connected-sockets");
  if (!container) return;
  const icons = Array.from(connectedSockets).map(() => "🗺️").join(" ");
  container.textContent = `Connected sockets: ${icons}`;
}

function getMarkerPosition(id, latitude, longitude) {
  if (markerPositions[id]) {
    return markerPositions[id];
  }

  const key = `${latitude.toFixed(6)}|${longitude.toFixed(6)}`;
  const count = locationCounts[key] || 0;
  locationCounts[key] = count + 1;

  const offset = 0.00008 * count;
  const pos = [latitude + offset, longitude + offset];
  markerPositions[id] = pos;
  return pos;
}

// Listen for location updates from ANY client
socket.on("locationUpdate", (data) => {
  const { id, latitude, longitude } = data;
  connectedSockets.add(id);
  updateConnectedSockets();

  const markerPos = getMarkerPosition(id, latitude, longitude);

  if (markers[id]) {
    markers[id].setLatLng(markerPos);
  } else {
    markers[id] = L.marker(markerPos, {
      icon: L.divIcon({
        className: "custom-icon",
        html: "🗺️",
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      }),
    })
      .addTo(map)
      .bindPopup(`Socket: ${id}<br>Latitude: ${latitude}<br>Longitude: ${longitude}`);
  }
});

// Remove marker when someone disconnects
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
  connectedSockets.delete(id);
  updateConnectedSockets();
});
