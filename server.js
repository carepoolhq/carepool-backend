import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import crypto from "crypto";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
  })
);

const DB_FILE = "./db.json";

let db = {
  letters: {},
  companies: {},
  usedSerials: [],
};

function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DB_FILE));
    db = raw;
  }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

loadDB();

function generateCode() {
  return "CP-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

function generateSerial() {
  let num;
  do {
    num = Math.floor(Math.random() * 30000) + 1;
  } while (db.usedSerials.includes(num));

  db.usedSerials.push(num);
  return num;
}

/* BUY LICENSE */
app.post("/buy", (req, res) => {
  const { company, quota = 1 } = req.body;

  const codes = [];

  for (let i = 0; i < quota; i++) {
    const code = generateCode();

    db.letters[code] = {
      company,
      used: false,
      serial: null,
      employee: null,
      createdAt: Date.now(),
    };

    codes.push(code);
  }

  saveDB();

  res.json({ company, codes });
});

/* VALIDATE CODE (FIRST OPEN ONLY) */
app.post("/validate-code", (req, res) => {
  const { code, employee } = req.body;

  const entry = db.letters[code];

  if (!entry) {
    return res.json({ valid: false, message: "Invalid code" });
  }

  if (entry.used) {
    return res.json({ valid: false, message: "Already opened" });
  }

  const serial = generateSerial();

  entry.used = true;
  entry.employee = employee;
  entry.serial = serial;
  entry.openedAt = Date.now();

  saveDB();

  res.json({
    valid: true,
    serial,
    firstOpen: true,
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("CarePool backend running on port 3000");
});