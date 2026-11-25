import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "./models.js";

const sign = (u) =>
  jwt.sign({ id: String(u._id), role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const verify = (token) => jwt.verify(token, process.env.JWT_SECRET);

export function requireAuth(roles = []) {
  return (req, res, next) => {
    try {
      const token = (req.headers.authorization || "").replace("Bearer ", "");
      req.user = verify(token);
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "You don't have access to this." });
      }
      next();
    } catch {
      res.status(401).json({ error: "Please log in again." });
    }
  };
}

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ error: "Enter a name, email and a password of 6+ characters." });
    }
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "student" });
    res.status(201).json({ token: sign(user), user: { id: user._id, name: user.name, role: user.role } });
  } catch (e) {
    res.status(400).json({ error: e.code === 11000 ? "That email is already registered." : e.message });
  }
});

router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) {
    return res.status(401).json({ error: "Email or password is wrong." });
  }
  res.json({ token: sign(user), user: { id: user._id, name: user.name, role: user.role } });
});

export default router;
