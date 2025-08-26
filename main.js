import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Read env vars
const PORT = process.env.PORT || 4000;
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const BASIC_USER = process.env.BASIC_AUTH_USER;
const BASIC_PASS = process.env.BASIC_AUTH_PASS;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Ensure base upload folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------- Basic Auth Middleware ----------
app.use((req, res, next) => {
  if (req.path.startsWith("/upload")) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Basic ")) {
      res.set("WWW-Authenticate", "Basic realm=Restricted");
      return res.status(401).send("Authentication required");
    }

    const credentials = Buffer.from(auth.split(" ")[1], "base64").toString();
    const [user, pass] = credentials.split(":");

    if (user !== BASIC_USER || pass !== BASIC_PASS) {
      return res.status(403).send("Forbidden");
    }
  }
  next();
});

// ---------- Multer Config ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.query.category || "general";
    const uploadPath = path.join(UPLOADS_DIR, category);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ---------- Routes ----------

// Upload a file
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Category must match how multer stored it
  const category = req.query.category || "general";

  // Build URL with category subfolder
  const fileUrl = `${APP_URL}/media/${category}/${req.file.filename}`;
  res.json({ url:fileUrl });
});

// Serve uploaded files (all categories)
app.use("/media", express.static(UPLOADS_DIR));

// Root
app.get("/", (req, res) => {
  res.send("Media server running 🚀");
});

// Start
app.listen(PORT, () => {
  console.log(`Server running at ${APP_URL}`);
});