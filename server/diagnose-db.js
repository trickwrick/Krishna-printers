import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dns from "dns";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const loadedEnvFiles = [];

const loadEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    const result = dotenv.config({ path: filePath, override: false });
    if (!result.error) loadedEnvFiles.push(filePath);
};

loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(__dirname, ".env"));

function maskMongoUri(uri = "") {
    return uri.replace(/\/\/([^:/@]+):([^@]*)@/i, (_, username) => `//${username}:****@`);
}

function getMongoHost() {
    const uri = process.env.MONGO_URI || "";
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@]+@)?([^/?]+)/i);
    return match ? match[1].split(",")[0] : "";
}

async function diagnose() {
    console.log("------------------------------------------");
    console.log("🔍 MongoDB Connection Deep Diagnosis (Fast Mode)");
    console.log(`📁 ENV files loaded: ${loadedEnvFiles.length ? loadedEnvFiles.join(", ") : "none"}`);
    console.log(`📡 URI Detected: ${process.env.MONGO_URI ? 'YES' : 'MISSING'}`);
    console.log(`📡 URI Used: ${process.env.MONGO_URI ? maskMongoUri(process.env.MONGO_URI) : 'MISSING'}`);
    console.log("------------------------------------------");

    // 1. IP TEST
    console.log("1. Checking Your Public IP...");
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        console.log(`✅ Your Public IP is: ${data.ip}`);
        console.log(`📡 Is this IP whitelisted in Atlas? (Or 0.0.0.0/0)`);
    } catch (e) {
        console.warn("⚠️ IP Check failed (Maybe no internet?)");
    }

    // 2. DNS TEST
    console.log("\n2. Testing Atlas DNS...");
    const host = getMongoHost();
    if (!host) {
        console.error("❌ DNS test skipped: MONGO_URI host is missing.");
        return;
    }
    try {
        const addr = await dns.promises.resolve(host, 'ANY');
        console.log(`✅ Host ${host} found!`);
    } catch (e) {
        console.error(`❌ DNS Failure for ${host}: ${e.message}`);
        console.log("💡 Try changing your PC's DNS to 8.8.8.8 (Google DNS).");
    }

    // 3. PORT TEST (27017)
    console.log("\n3. Testing Port 27017 reachability...");
    const shardHost = host;
    const socket = new net.Socket();
    const portPromise = new Promise((resolve) => {
        socket.setTimeout(3000);
        socket.on('connect', () => { 
            console.log(`✅ Port 27017 on ${shardHost} is OPEN!`); 
            socket.destroy(); 
            resolve(true); 
        });
        socket.on('timeout', () => { 
            console.error(`❌ Port 27017 Timeout! Your ISP/Firewall is blocking MongoDB connections.`); 
            socket.destroy(); 
            resolve(false); 
        });
        socket.on('error', (e) => { 
            console.error(`❌ Connection Error to ${shardHost}: ${e.message}`); 
            resolve(false); 
        });
        socket.connect(27017, shardHost);
    });
    await portPromise;

    // 4. HANDSHAKE TEST
    console.log("\n4. Final Driver Handshake Test...");
    try {
        mongoose.set("bufferCommands", false);
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ SUCCESS: Application is now connected to Cloud!");
        await mongoose.disconnect();
    } catch (e) {
        console.error("❌ Handshake Failed:", e);
    }
    console.log("------------------------------------------");
}

diagnose();
