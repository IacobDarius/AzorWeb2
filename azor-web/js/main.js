import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import multer from "multer";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new sqlite3.Database("database.db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "cheie-secreta-random",
    resave: false,
    saveUninitialized: false,
  })
);

const upload = multer({ dest: "public/img/uploads/" });

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS dogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    image TEXT
  )`);

  db.get("SELECT * FROM admins LIMIT 1", async (err, row) => {
    if (!row) {
      const hash = await bcrypt.hash("admin123", 10);
      db.run("INSERT INTO admins (username, password) VALUES (?, ?)", [
        "admin",
        hash,
      ]);
      console.log("Cont implicit creat: admin / admin123");
    }
  });
});

app.get("/admin", (req, res) => {
  if (!req.session.user) return res.redirect("/login.html");
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM admins WHERE username = ?", [username], async (err, user) => {
    if (!user) return res.status(401).send("Date incorecte");
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).send("Date incorecte");
    req.session.user = { id: user.id, username: user.username };
    res.redirect("/admin");
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

app.post("/dogs", upload.single("image"), (req, res) => {
  if (!req.session.user) return res.status(403).send("Acces interzis");
  const { name, description } = req.body;
  const imagePath = req.file ? `/img/uploads/${req.file.filename}` : null;
  db.run(
    "INSERT INTO dogs (name, description, image) VALUES (?, ?, ?)",
    [name, description, imagePath],
    (err) => {
      if (err) return res.status(500).send("Eroare la salvare");
      res.redirect("/admin");
    }
  );
});

app.get("/dogs", (req, res) => {
  db.all("SELECT * FROM dogs", (err, rows) => {
    if (err) return res.status(500).send("Eroare DB");
    res.json(rows);
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server pornit pe http://localhost:${PORT}`));
