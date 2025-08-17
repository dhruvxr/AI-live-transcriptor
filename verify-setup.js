#!/usr/bin/env node

/**
 * Quick setup verification script for AI Live Transcriptor
 * Run with: node verify-setup.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 AI Live Transcriptor - Setup Verification\n");

const checks = [];

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.substring(1).split(".")[0]);
checks.push({
  name: "Node.js Version",
  status: majorVersion >= 18,
  message:
    majorVersion >= 18
      ? `✅ ${nodeVersion} (Good)`
      : `❌ ${nodeVersion} (Need v18+)`,
});

// Check if package.json exists
const packageJsonExists = fs.existsSync(path.join(__dirname, "package.json"));
checks.push({
  name: "package.json",
  status: packageJsonExists,
  message: packageJsonExists ? "✅ Found" : "❌ Missing",
});

// Check if node_modules exists
const nodeModulesExists = fs.existsSync(path.join(__dirname, "node_modules"));
checks.push({
  name: "Dependencies",
  status: nodeModulesExists,
  message: nodeModulesExists ? "✅ Installed" : "❌ Run: npm install",
});

// Check if .env exists
const envExists = fs.existsSync(path.join(__dirname, ".env"));
checks.push({
  name: "Environment File",
  status: envExists,
  message: envExists ? "✅ Found" : "⚠️  Copy .env.example to .env",
});

// Check key directories
const keyDirs = ["src", "components", "extension"];
keyDirs.forEach((dir) => {
  const exists = fs.existsSync(path.join(__dirname, dir));
  checks.push({
    name: `${dir}/ directory`,
    status: exists,
    message: exists ? "✅ Found" : "❌ Missing",
  });
});

// Display results
checks.forEach((check) => {
  console.log(`${check.message.padEnd(40)} - ${check.name}`);
});

const allPassed = checks.every((check) => check.status);
const warnings = checks.filter((check) => check.message.includes("⚠️")).length;

console.log("\n" + "=".repeat(60));

if (allPassed && warnings === 0) {
  console.log("🎉 All checks passed! You're ready to start developing.");
  console.log("\nNext steps:");
  console.log("1. Configure Azure services in .env file");
  console.log("2. Run: npm run dev");
  console.log("3. Open: http://localhost:5173");
} else if (
  warnings > 0 &&
  checks.filter((check) => !check.status && !check.message.includes("⚠️"))
    .length === 0
) {
  console.log("⚠️  Setup mostly complete with warnings.");
  console.log(
    "You can start development, but some features may not work without proper configuration."
  );
} else {
  console.log("❌ Setup incomplete. Please address the issues above.");
  console.log("\nQuick fixes:");
  if (!nodeModulesExists) console.log("- Run: npm install");
  if (!envExists) console.log("- Run: cp .env.example .env");
}

console.log("\n📖 For detailed setup instructions, see: SETUP.md");
