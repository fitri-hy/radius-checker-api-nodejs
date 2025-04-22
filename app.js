const express = require('express');
const path = require('path');
const geolib = require('geolib');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function validateParams(params) {
  return params.every(param => param !== undefined);
}

function getDistance(lat1, lon1, lat2, lon2) {
  return geolib.getDistance({ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 });
}

function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

app.post('/api/check-radius', (req, res) => {
  const {
    office_name,
    office_lat,
    office_lon,
    user_name,
    user_lat,
    user_lon,
    radius = 100
  } = req.body;

  if (!validateParams([office_name, office_lat, office_lon, user_name, user_lat, user_lon])) {
    return res.status(400).json({
      message: 'Office and user information (name and coordinates) are required.'
    });
  }

  if (isNaN(office_lat) || isNaN(office_lon) || isNaN(user_lat) || isNaN(user_lon)) {
    return res.status(400).json({ message: 'Invalid latitude or longitude values.' });
  }

  const distance = getDistance(office_lat, office_lon, user_lat, user_lon);
  const isInside = distance <= radius;

  const mapParams = { office_name, office_lat, office_lon, user_name, user_lat, user_lon, radius };
  const preview_url = `http://localhost:${port}/map?${new URLSearchParams(mapParams).toString()}`;

  const currentDateTime = getCurrentDateTime();

  res.json({
    isInside,
    message: isInside ? 'User is within the radius' : 'User is outside the radius',
    distance: Math.round(distance),
    radius,
    preview_url,
    timestamp: currentDateTime
  });
});

app.get('/map', (req, res) => {
  const { office_name, office_lat, office_lon, user_name, user_lat, user_lon, radius } = req.query;

  if (!validateParams([office_name, office_lat, office_lon, user_name, user_lat, user_lon, radius])) {
    return res.send('Missing parameters!');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Map Preview</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
      <style>#map { height: 100vh; margin: 0; }</style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
      <script>
        const map = L.map('map').setView([${office_lat}, ${office_lon}], 17);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const officeIcon = L.icon({
          iconUrl: '/office.png',
          iconSize: [45, 45],
          iconAnchor: [22, 45],
          popupAnchor: [0, -45]
        });

        const userIcon = L.icon({
          iconUrl: '/user.png',
          iconSize: [45, 45],
          iconAnchor: [22, 45],
          popupAnchor: [0, -45]
        });

        L.marker([${office_lat}, ${office_lon}], { icon: officeIcon }).addTo(map)
          .bindPopup("${office_name}").openPopup();

        L.marker([${user_lat}, ${user_lon}], { icon: userIcon }).addTo(map)
          .bindPopup("${user_name}");

        L.circle([${office_lat}, ${office_lon}], {
          radius: ${radius},
          color: 'blue',
          fillColor: '#cce5ff',
          fillOpacity: 0.3
        }).addTo(map);
      </script>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
