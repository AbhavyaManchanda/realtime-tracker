const socket = io();
let map;
const connectedSockets = new Map(); // socketId → { latitude, longitude, connectedAt }
const markers = {}; // socketId → marker
const markerPositions = {};
const locationCounts = {};
let panelExpanded = false;

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

// Socket panel toggle
const toggleBtn = document.getElementById("socket-toggle");
const tableContainer = document.getElementById("socket-table-container");
const expandIcon = document.getElementById("socket-expand-icon");

toggleBtn.addEventListener("click", () => {
  panelExpanded = !panelExpanded;
  tableContainer.classList.toggle("hidden");
  expandIcon.classList.toggle("expanded");
});

function updateConnectedSockets() {
  // Update emoji preview
  const preview = document.getElementById("socket-emoji-preview");
  const emojis = Array.from(connectedSockets.keys()).map(() => "🗺️").join(" ");
  preview.textContent = `Connected: ${emojis || "none"}`;
  
  // Update table
  updateSocketTable();
}

function updateSocketTable() {
  const tbody = document.getElementById("socket-tbody");
  tbody.innerHTML = "";
  
  connectedSockets.forEach((data, socketId) => {
    const row = document.createElement("tr");
    const shortId = socketId.slice(0, 12) + "...";
    const lat = data.latitude ? data.latitude.toFixed(6) : "—";
    const lng = data.longitude ? data.longitude.toFixed(6) : "—";
    const connTime = new Date(data.connectedAt).toLocaleTimeString();
    
    row.innerHTML = `
      <td title="${socketId}">${shortId}</td>
      <td>${lat}</td>
      <td>${lng}</td>
      <td>${connTime}</td>
    `;
    tbody.appendChild(row);
  });
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
  
  // Add or update socket info
  if (!connectedSockets.has(id)) {
    connectedSockets.set(id, {
      latitude,
      longitude,
      connectedAt: new Date().toISOString(),
    });
  } else {
    const existing = connectedSockets.get(id);
    existing.latitude = latitude;
    existing.longitude = longitude;
  }
  
  updateConnectedSockets();

  const markerPos = getMarkerPosition(id, latitude, longitude);

  if (markers[id]) {
    markers[id].setLatLng(markerPos);
  } else {
    markers[id] = L.marker(markerPos, {
      icon: L.divIcon({
        className: "custom-icon",
        html: "📍",
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
