# Campus Bus Tracker

Stack: React + Vite, Leaflet/OpenStreetMap, Node.js + Express, Socket.io, MongoDB, JWT.

## Run it
1. Install MongoDB locally, or create a free Atlas cluster and use its URI.
2. Server:
   cd server && cp .env.example .env   (edit MONGO_URI and JWT_SECRET)
   npm install && npm run seed && npm run dev
3. Client (new terminal):
   cd client && npm install && npm run dev
4. Open http://localhost:5173

## Test logins (password: password123)
driver@college.edu, student@college.edu, admin@college.edu

Open the driver in one browser window and the student in another to watch the bus move.
Phones need HTTPS for GPS (deploy, or use a tunnel such as ngrok).
