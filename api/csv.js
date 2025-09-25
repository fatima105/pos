const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const db = require('./db.js');

// 1️⃣ Prepare the INSERT statement
const insertSql = `
  INSERT INTO chart_of_accounts 
    (id, location_id, head_code, head_name, parent_id, level, supplier_id, customer_id, deleted_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// 2️⃣ Convert CSV "NULL" or empty strings to actual null
function parseValue(val) {
  if (!val || val.toUpperCase() === "NULL") return null;
  return val;
}

// 3️⃣ Path to your CSV file
const csvFilePath = path.join(__dirname, 'chart_of_accounts.csv');

// 4️⃣ Read CSV and insert into DB
const rows = [];
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    // Convert CSV row object to array of values
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
    console.log(`✅ CSV read complete. Inserting ${rows.length} rows into DB...`);

    db.serialize(() => {
      const stmt = db.prepare(insertSql);

      rows.forEach(row => {
        stmt.run(row, (err) => {
          if (err) {
            console.error("❌ Error inserting row:", row, err.message);
          }
        });
      });

      stmt.finalize(() => {
        console.log("✅ All rows inserted successfully.");
        db.close();
      });
    });
  });
