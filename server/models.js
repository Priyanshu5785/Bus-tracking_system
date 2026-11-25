import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "driver", "admin"], default: "student" },
});

const busSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  routeName: { type: String, required: true },
  stops: [{ name: String, lat: Number, lng: Number }],
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  active: { type: Boolean, default: false },
  lastLocation: { lat: Number, lng: Number, speed: Number, at: Date },
});

export const User = mongoose.model("User", userSchema);
export const Bus = mongoose.model("Bus", busSchema);
