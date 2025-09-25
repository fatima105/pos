// controllers/unitController.js
const db = require("../db");

exports.getAllSupplier = (req, res) => {
  db.all("SELECT * FROM Supplier WHERE deleted_at IS NULL ORDER BY ID DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ Supplier: rows });
  });
};

exports.getOneSupplier = (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM Supplier WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "Supplier not found" });
    res.json(row);
  });
};
exports.deleteSupplier = (req, res) => {
  const { id } = req.params;
  const updated_at = new Date().toISOString(); // Get the current time in ISO format

  console.log("Attempting to update supplier with ID:", id);

  db.run(
    "UPDATE Supplier SET deleted_at = ?, updated_at = ? WHERE id = ?",
    [updated_at, updated_at, id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0)
        return res.status(404).json({ error: "Supplier not found" });
      res.json({ message: "Supplier status updated successfully" });
    }
  );
};

exports.updateSupplier = (req, res) => {
  const now = new Date();
  const updated_at = now.toISOString(); // Use full timestamp format

  const { id, name, contact, city, city_area, status } = req.body;

  console.log("Incoming updateSupplier request:", req.body);

  if (!id || !name || !contact || !city || !city_area || !status) {
    const missingFields = {};
    if (!id) missingFields.id = id;
    if (!name) missingFields.name = name;
    if (!contact) missingFields.contact = contact;
    if (!city) missingFields.city = city;
    if (!city_area) missingFields.city_area = city_area;
    if (!status) missingFields.status = status;

    console.error("Missing required fields:", missingFields);

    return res.status(400).json({
      error: "",
      missing: missingFields,
    });
  }

  const sql = `
        UPDATE Supplier SET
            name = ?,
            contact = ?,
            city = ?,
            city_area = ?,
            status = ?,
            updated_at = ?
        WHERE id = ?
    `;

  const values = [name, contact, city, city_area, status, updated_at, id];

  db.run(sql, values, function (err) {
    if (err) {
      console.error("Database error:", err.message);
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });
    }

    if (this.changes === 0) {
      console.warn("No supplier updated. ID may not exist:", id);
      return res
        .status(404)
        .json({ error: "Supplier not found or no changes made" });
    }

    console.log("Supplier updated successfully. ID:", id);
    return res.status(200).json({
      message: "Supplier updated successfully",
      supplier_id: id,
    });
  });
};

exports.addSupplier = (req, res) => {
  const {
    location_id,
    company,
    name,
    email,
    cnic,
    contact,
    city,
    city_area,
    status,
    deleted_at,
    updated_at,
  } = req.body;

  // Step 0: Validate required fields
  if (
  
    !company ||
    !name ||
    !email ||
    !contact ||
    !city ||
    !city_area ||

    !status
  ) {
    return res.status(400).json({ error: "Missing required supplier fields" });
  }

  // Step 1: Get the latest supplier code
  const getLatestCodeSql = `
        SELECT code FROM Supplier 
        WHERE code LIKE 'S-%'
        ORDER BY CAST(SUBSTRING(code, 3) AS UNSIGNED) DESC
        LIMIT 1
    `;

  db.get(getLatestCodeSql, [], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({
          error: "Database error while fetching code",
          details: err.message,
        });
    }

    // Step 2: Generate new supplier code
    let newCode = "S-0001";
    if (row && row.code) {
      const numPart = parseInt(row.code.split("-")[1], 10);
      if (!isNaN(numPart)) {
        newCode = `S-${(numPart + 1).toString().padStart(4, "0")}`;
      }
    }

    // Step 3: Insert new supplier
    const created_at = new Date().toISOString();

    const insertSql = `
            INSERT INTO Supplier (
                location_id, code, company, name, email, cnic, contact, city, city_area,
                coa_id, status, deleted_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const supplierValues = [
      '1',
      newCode,
      company,
      name,
      email,
      cnic,
      contact,
      city,
      city_area,
      null,
      status,
      deleted_at || null,
      created_at,
      updated_at || null,
    ];

    db.run(insertSql, supplierValues, function (err) {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error inserting supplier", details: err.message });
      }

      const supplierId = this.lastID;

      // Step 4: Count total suppliers
      const countQuery = `SELECT COUNT(*) AS total FROM Supplier`;
      db.get(countQuery, [], (err, countRow) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Error counting suppliers", details: err.message });
        }

        const countSupplier = countRow.total;
        console.log("supplier"+countSupplier);
        const headcode = 50614000001 + (countSupplier + 1);
        const headname = `${name} ${newCode}`;

        // Step 5: Insert into chart_of_accounts
        const coaSql = `
                    INSERT INTO chart_of_accounts (
                        location_id, head_code, head_name, parent_id, level,
                        supplier_id, customer_id, deleted_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

        const coaValues = [
          location_id,
          headcode,
          headname,
          10,
          2,
          supplierId,
         null,
          null,
          created_at,
          null,
        ];

        db.run(coaSql, coaValues, function (err) {
          if (err) {
            return res
              .status(500)
              .json({
                error: "Error inserting into chart_of_accounts",
                details: err.message,
              });
          }
          console.log("Chart of Accounts inserted successfully"); // Log successful insert
      
          return res.status(201).json({
            message: "Supplier and Chart of Accounts added successfully",
            code: newCode,
            supplier_id: supplierId,
          });
        });
      });
    });
  });
};
// supplierController.js

exports.getAccountOfSales = (req, res) => {
    // SQL query to fetch data from the chart_of_accounts table (or relevant table)
    const sqlQuery = `
      SELECT * FROM chart_of_accounts
 
    `;
  
    // Execute the SQL query
    db.all(sqlQuery, [], (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: "Database error while fetching account of sales records",
          details: err.message,
        });
      }
  console.log("g" + JSON.stringify(db, null, 2));
      // Return the fetched records as a JSON response
      return res.status(200).json({
        message: "Account of Sales records retrieved successfully",
        data: rows,
      });
    });
  };
  