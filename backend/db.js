// Tiny JSON file-based data store. No native dependencies — reliable to run anywhere.
// For production, swap this module for PostgreSQL/MongoDB with the same method signatures.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "data", "db.json");

const DEFAULT_DATA = { users: [], analyses: [] };

function ensureFile() {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(DB_PATH)) writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
}

function read() {
  ensureFile();
  try {
    return JSON.parse(readFileSync(DB_PATH, "utf8"));
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function write(data) {
  ensureFile();
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const db = {
  findUserByPhone(phone) {
    return read().users.find((u) => u.phone === phone) || null;
  },
  findUserById(id) {
    return read().users.find((u) => u.id === id) || null;
  },
  createUser(user) {
    const data = read();
    data.users.push(user);
    write(data);
    return user;
  },
  addAnalysis(record) {
    const data = read();
    data.analyses.push(record);
    write(data);
    return record;
  },
  listAnalysesByUser(userId) {
    return read()
      .analyses.filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
};
