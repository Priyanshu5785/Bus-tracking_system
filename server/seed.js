import dns from "node:dns";
dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User, Bus } from "./models.js";

await mongoose.connect(process.env.MONGO_URI);
await User.deleteMany({});
await Bus.deleteMany({});

const hash = await bcrypt.hash("password123", 10);
const [, driver] = await User.create([
  { name: "Admin", email: "admin@college.edu", password: hash, role: "admin" },
  { name: "Ravi (driver)", email: "driver@college.edu", password: hash, role: "driver" },
  { name: "Asha (student)", email: "student@college.edu", password: hash, role: "student" },
]);

// Replace these coordinates with your own college route
await Bus.create({
  number: "BUS-01",
  routeName: "City Centre to Campus",
  driver: driver._id,
  stops: [
    { name: "City Centre", lat: 28.6315, lng: 77.2167 },
    { name: "Market Road", lat: 28.6205, lng: 77.2105 },
    { name: "College Gate", lat: 28.6139, lng: 77.209 },
  ],
});

console.log("Seeded. Logins use password: password123");
await mongoose.disconnect();
