// CRM Server v1.0.3 - Final Paper Details Sync
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import next from "next";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const isDev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev: isDev, dir: rootDir });
const nextHandler = nextApp.getRequestHandler();

// Load ENV. Root .env wins locally; server/.env remains a packaged fallback.
const rootEnvPath = path.join(rootDir, ".env");
const serverEnvPath = path.join(__dirname, ".env");
const loadedEnvFiles = [];

const loadEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    const result = dotenv.config({ path: filePath, override: false });
    if (result.error) {
        console.warn(`ENV WARN: Could not load ${filePath}: ${result.error.message}`);
        return;
    }
    loadedEnvFiles.push(filePath);
};

loadEnvFile(rootEnvPath);
loadEnvFile(serverEnvPath);

const maskMongoUri = (uri = "") => (
    uri.replace(/\/\/([^:/@]+):([^@]*)@/i, (_, username) => `//${username}:****@`)
);

const getMongoUriInfo = (uri = "") => {
    const match = uri.match(/^(mongodb(?:\+srv)?):\/\/(?:([^:/@]+):([^@]*)@)?([^/?]+)(\/[^?]*)?(\?.*)?$/i);
    if (!match) {
        return {
            valid: false,
            protocol: "unknown",
            hosts: [],
            database: "",
        };
    }

    return {
        valid: true,
        protocol: match[1],
        isSrv: match[1].toLowerCase() === "mongodb+srv",
        hosts: match[4].split(","),
        database: (match[5] || "").replace("/", "") || "(default)",
    };
};

const classifyMongoError = (error) => {
    const message = `${error?.message || ""} ${error?.reason?.toString?.() || ""}`;
    if (/querySrv|ENOTFOUND|ETIMEOUT|getaddrinfo|DNS/i.test(message)) return "DNS resolution issue";
    if (/Authentication failed|bad auth|auth failed|SCRAM|credentials/i.test(message)) return "Authentication issue";
    if (/TLS|SSL|certificate|self signed|CERT_/i.test(message)) return "TLS/certificate issue";
    if (/whitelist|not whitelisted|ReplicaSetNoPrimary|server selection timed out/i.test(message)) return "Atlas network access or replica set reachability issue";
    return "Unknown MongoDB connection issue";
};

// Debug
const mongoUriInfo = getMongoUriInfo(process.env.MONGO_URI);
console.log("------------------------------------------");
console.log(`ENV CHECK: loaded files: ${loadedEnvFiles.length ? loadedEnvFiles.join(", ") : "none"}`);
console.log(`ENV CHECK: MONGO_URI ${process.env.MONGO_URI ? 'configured' : 'missing'}`);
console.log(`ENV CHECK: MONGO_URI used: ${process.env.MONGO_URI ? maskMongoUri(process.env.MONGO_URI) : "missing"}`);
console.log(`ENV CHECK: Mongo protocol: ${mongoUriInfo.protocol}${mongoUriInfo.valid ? ` (${mongoUriInfo.isSrv ? "SRV" : "standard"})` : " (invalid URI format)"}`);
console.log(`ENV CHECK: Mongo hosts: ${mongoUriInfo.hosts.join(", ") || "none"}`);
console.log(`ENV CHECK: Mongo database: ${mongoUriInfo.database}`);
console.log("------------------------------------------");

mongoose.connection.on("connected", () => {
    console.log("MongoDB connection event: connected");
});

mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection event error:", {
        name: error.name,
        message: error.message,
        code: error.code,
        category: classifyMongoError(error),
    });
});

mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB connection event: disconnected");
});

// Routes
import jobCardRoutes from "./routes/jobCardRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import challanRoutes from "./routes/challanRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paperStockRoutes from "./routes/paperStockRoutes.js";
import plateStockRoutes from "./routes/plateStockRoutes.js";
import statementRoutes from "./routes/statementRoutes.js";
import estimateRoutes from "./routes/estimateRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import { seedStaffAndRoles } from "./utils/seedStaff.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DB CONNECT ================= */
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing. Add it to .env or server/.env.");
        }

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });

        console.log("MongoDB Connected Successfully");
        await seedStaffAndRoles();
        console.log("Staff roles seeded");
    } catch (error) {
        console.error("Full Mongo Error:", error);
        console.error("Mongo Error Summary:", {
            name: error.name,
            message: error.message,
            code: error.code,
            category: classifyMongoError(error),
            uriUsed: maskMongoUri(process.env.MONGO_URI || ""),
            protocol: mongoUriInfo.protocol,
            hosts: mongoUriInfo.hosts,
        });
    }
};

/* ================= ROUTES ================= */
app.use("/api/jobcard", jobCardRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/challan", challanRoutes);
app.use("/api/payment-type", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/paper-stock", paperStockRoutes);
app.use("/api/plate-stock", plateStockRoutes);
app.use("/api/statements", statementRoutes);
app.use("/api/estimate", estimateRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/roles", roleRoutes);

// API Test Route (Internal)
app.get("/api/health", (req, res) => {
    res.json({
        status: "Active",
        database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        message: "CRM API running stable 🚀"
    });
});

app.get('/ping', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is alive'
    });
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

/* ================= NEXT FRONTEND ROUTING ================= */
app.use((req, res) => {
    return nextHandler(req, res);
});

/* ================= SERVER START ================= */
const startServer = async (port) => {
    await nextApp.prepare();

    const server = app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.warn(`⚠️ Port ${port} busy, trying ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error("Critical Server Error:", err);
            process.exit(1);
        }
    });

    process.on("SIGINT", () => { server.close(); process.exit(); });
    process.on("SIGTERM", () => { server.close(); process.exit(); });
};

/* ================= INIT ================= */
const PORT = process.env.PORT || 5011;

connectDB();      // ✅ ONLY ONE TIME
startServer(PORT).catch((error) => {
  console.error("Failed to start Next server:", error);
  process.exit(1);
});