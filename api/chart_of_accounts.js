const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = require('./db.js');

// 1️⃣ Drop chart_of_accounts table if exists
db.run(`DROP TABLE IF EXISTS chart_of_accounts`, (err) => {
  if (err) {
    console.error('❌ Error dropping chart_of_accounts table:', err.message);
    return;
  }
  console.log('🗑 chart_of_accounts table dropped.');

  // 2️⃣ Create chart_of_accounts table
  db.run(
    `CREATE TABLE chart_of_accounts (
      id INTEGER PRIMARY KEY,
      location_id INTEGER,
      head_code TEXT,
      head_name TEXT,
      parent_id INTEGER,
      level INTEGER,
      supplier_id INTEGER,
      customer_id INTEGER,
      deleted_at TEXT,
      created_at TEXT,
      updated_at TEXT
    )`,
    (err) => {
      if (err) {
        console.error('❌ Error creating chart_of_accounts table:', err.message);
      } else {
        console.log('✅ chart_of_accounts table created successfully.');
        insertFromCSV();
      }
    }
  );
});

// 3️⃣ Prepare INSERT statement
const insertSql = `
  INSERT INTO chart_of_accounts 
    (id, location_id, head_code, head_name, parent_id, level, supplier_id, customer_id, deleted_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// 4️⃣ Convert CSV "NULL" or empty strings to actual null
function parseValue(val) {
  if (!val || val.toUpperCase() === "NULL") return null;
  return val;
}

// 5️⃣ Path to your CSV file
const csvFilePath = path.join(__dirname, 'chart_of_accounts.csv');

// 6️⃣ Function to read CSV and insert into DB
function insertFromCSV() {
  const rows = [];
  fs.createReadStream(csvFilePath)
    .pipe(require('csv-parser')())
    .on('data', (row) => {
      const values = [
        parseValue(row.id),
        parseValue(row.location_id),
        parseValue(row.head_code),
        parseValue(row.head_name),
        parseValue(row.parent_id),
        parseValue(row.level),
        parseValue(row.supplier_id),
        parseValue(row.customer_id),
        parseValue(row.deleted_at),
        parseValue(row.created_at),
        parseValue(row.updated_at),
      ];
      rows.push(values);
    })
    .on('end', () => {
      console.log(`✅ CSV read complete. Inserting ${rows.length} rows into chart_of_accounts table...`);

      db.serialize(() => {
        const stmt = db.prepare(insertSql);

        rows.forEach(row => {
          stmt.run(row, (err) => {
            if (err) console.error("❌ Error inserting row:", row, err.message);
          });
        });

        stmt.finalize(() => {
          console.log("✅ All chart_of_accounts rows inserted successfully.");
          db.close();
        });
      });
    });
}
