const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "alimart.db");
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(Unit);", [], (err, rows) => {
  if (err) {
    console.error("❌ Error fetching table info:", err.message);
    return;
  }

  console.log("📋 Unit Table Structure:");
  rows.forEach((row) => {
    console.log(JSON.stringify(row, null, 2)); // nicely formatted
  });
});
