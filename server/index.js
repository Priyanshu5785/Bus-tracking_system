import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Server } from "socket.io";
import authRoutes, { requireAuth, verify } from "./auth.js";
import { Bus, User } from "./models.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.get("/api/buses", requireAuth(), async (_req, res) => res.json(await Bus.find().lean()));
app.post("/api/buses", requireAuth(["admin"]), async (req, res) => {
  try {
    const { number, routeName, driver, stops } = req.body;
    res.status(201).json(await Bus.create({ number, routeName, driver: driver || undefined, stops }));
  } catch (e) {
    res.status(400).json({ error: e.code === 11000 ? "That bus number already exists." : e.message });
  }
});

app.delete("/api/buses/:id", requireAuth(["admin"]), async (req, res) => {
  await Bus.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get("/api/drivers", requireAuth(["admin"]), async (_req, res) =>
  res.json(await User.find({ role: "driver" }).select("name email").lean())
);

app.post("/api/drivers", requireAuth(["admin"]), async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "Enter a name, email and a password of 6+ characters." });
  }
  try {
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "driver" });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email });
  } catch (e) {
    res.status(400).json({ error: e.code === 11000 ? "That email is already registered." : e.message });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || "*" } });

io.use((socket, next) => {
  try {
    socket.user = verify(socket.handshake.auth.token);
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

const room = (busId) => `bus:${busId}`;
const safe = (fn) => async (...args) => {
  try { await fn(...args); } catch (e) { console.error("Socket error:", e.message); }
};

io.on("connection", (socket) => {
  const isDriver = socket.user.role === "driver";
  const mine = (busId) => ({ _id: busId, driver: socket.user.id });

  socket.on("bus:join", safe(async (busId) => {
    socket.join(room(busId));
    const bus = await Bus.findById(busId).lean();
    if (bus?.lastLocation?.lat != null) {
      socket.emit("location:update", { busId, ...bus.lastLocation, active: bus.active });
    }
  }));

  socket.on("bus:leave", (busId) => socket.leave(room(busId)));

  socket.on("trip:start", safe(async ({ busId }) => {
    if (!isDriver) return;
    if (await Bus.findOneAndUpdate(mine(busId), { active: true })) {
      io.to(room(busId)).emit("trip:status", { busId, active: true });
    }
  }));

  socket.on("location:update", safe(async ({ busId, lat, lng, speed }) => {
    if (!isDriver || typeof lat !== "number" || typeof lng !== "number") return;
    const at = new Date();
    const updated = await Bus.findOneAndUpdate(mine(busId), {
      lastLocation: { lat, lng, speed: speed ?? 0, at }, active: true,
    });
    if (updated) io.to(room(busId)).emit("location:update", { busId, lat, lng, speed: speed ?? 0, at, active: true });
  }));

  socket.on("trip:end", safe(async ({ busId }) => {
    if (!isDriver) return;
    if (await Bus.findOneAndUpdate(mine(busId), { active: false })) {
      io.to(room(busId)).emit("trip:status", { busId, active: false });
    }
  }));
});

await mongoose.connect(process.env.MONGO_URI);
server.listen(process.env.PORT || 5000, () => console.log("Server running on port", process.env.PORT || 5000));
