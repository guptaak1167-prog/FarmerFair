import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

const SECRET = process.env.JWT_SECRET || "farmer-project-dev-secret-change-me";
const router = Router();

function sign(user) {
  return jwt.sign({ id: user.id, phone: user.phone }, SECRET, { expiresIn: "30d" });
}

function publicUser(u) {
  return { id: u.id, name: u.name, phone: u.phone, state: u.state, lang: u.lang };
}

// Middleware: attaches req.user when a valid Bearer token is present.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "auth_required" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

router.post("/register", async (req, res) => {
  const { name, phone, password, state, lang } = req.body || {};
  if (!phone || !password || !name) {
    return res.status(400).json({ error: "missing_fields", message: "name, phone and password are required" });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: "weak_password", message: "password must be at least 4 characters" });
  }
  if (db.findUserByPhone(phone)) {
    return res.status(409).json({ error: "phone_exists", message: "an account with this phone already exists" });
  }
  const user = {
    id: randomUUID(),
    name: String(name).trim(),
    phone: String(phone).trim(),
    passwordHash: await bcrypt.hash(String(password), 10),
    state: state || "",
    lang: lang || "hi",
    createdAt: new Date().toISOString(),
  };
  db.createUser(user);
  res.json({ token: sign(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { phone, password } = req.body || {};
  const user = phone ? db.findUserByPhone(String(phone).trim()) : null;
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) {
    return res.status(401).json({ error: "invalid_credentials", message: "wrong phone or password" });
  }
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json({ user: publicUser(user) });
});

export default router;
