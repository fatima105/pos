const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const db = require('./db.js');

// 1️⃣ Drop Supplier table if exists
db.run(`DROP TABLE IF EXISTS Supplier`, (err) => {
  if (err) {
    console.error('❌ Error dropping Supplier table:', err.message);
    return;
  }
  console.log('🗑 Supplier table dropped.');

  // 2️⃣ Create Supplier table
  db.run(
    `CREATE TABLE Supplier (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id VARCHAR(255) NOT NULL,
      code TEXT NOT NULL,
      company VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      contact VARCHAR(255) NOT NULL,
      cnic VARCHAR(255) NOT NULL,
      city VARCHAR(255)  NULL,
      city_area VARCHAR(255)  NULL,
      coa_id VARCHAR(255) NULL,
      status VARCHAR(255) NOT NULL,
      deleted_at VARCHAR(255),
      created_at VARCHAR(255),
      updated_at VARCHAR(255)
    )`,
    (err) => {
      if (err) {
        console.error('❌ Error creating Supplier table:', err.message);
      } else {
        console.log('✅ Supplier table created successfully.');
        insertFromCSV();
      }
    }
  );
});

// 3️⃣ Prepare INSERT statement
const insertSql = `
  INSERT INTO Supplier 
    (id, location_id, code, company, name, email, contact, cnic, city, city_area, coa_id, status, deleted_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// 4️⃣ Convert CSV "NULL" or empty strings to actual null
function parseValue(val) {
  if (!val || val.toUpperCase() === "NULL") return null;
  return val;
}

// 5️⃣ Path to your CSV file
const csvFilePath = path.join(__dirname, 'suppliers.csv');

// 6️⃣ Function to read CSV and insert into DB
function insertFromCSV() {
  const rows = [];
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      const values = [
        parseValue(row.id),
        parseValue(row.location_id),
        parseValue(row.code),
        parseValue(row.company),
        parseValue(row.name),
        parseValue(row.email),
        parseValue(row.contact),
        parseValue(row.cnic),
        parseValue(row.city),
        parseValue(row.city_area),
        parseValue(row.coa_id),
        parseValue(row.status),
        parseValue(row.deleted_at),
        parseValue(row.created_at),
        parseValue(row.updated_at),
      ];
      rows.push(values);
    })
    .on('end', () => {
      console.log(`✅ CSV read complete. Inserting ${rows.length} rows into Supplier table...`);

      db.serialize(() => {
        const stmt = db.prepare(insertSql);

        rows.forEach(row => {
          stmt.run(row, (err) => {
            if (err) console.error("❌ Error inserting row:", row, err.message);
          });
        });

        stmt.finalize(() => {
          console.log("✅ All Supplier rows inserted successfully.");
          db.close();
        });
      });
    });
}
