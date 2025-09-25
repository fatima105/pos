// controllers/CustomerController.js
const db = require('../db');

exports.getAllCustomer = (req, res) => {
    db.all('SELECT * FROM customer ORDER BY ID DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ Customer: rows });
    });
};
exports.deleteCustomer = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM Customer WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ message: 'Customer deleted successfully' });
    });
};

exports.getOneCustomer = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM Customer WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Customer not found' });
        res.json(row);
    });
};

exports.updateCustomer = (req, res) => {
    const {
        customer_id,
        name,
        company,
        cnic,
        mobile,
        email,
        land_line,
        city,
        status,
        credit_limit
    } = req.body;

    const updated_at = new Date().toISOString();

    const sql = `
        UPDATE Customer SET
            name = ?,
            company = ?,
            cnic = ?,
            mobile = ?,
            email = ?,
            land_line = ?,
            city = ?,
            status = ?,
            credit_limit = ?,
            updated_at = ?
        WHERE id = ?
    `;

    const values = [
        name, company, cnic, mobile,
        email, land_line, city, status,
        credit_limit, updated_at, customer_id
    ];

    db.run(sql, values, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Customer not updated (ID not found)' });
        }
        return res.status(200).json({ message: 'Customer updated successfully', status: true });
    });
};

exports.addCustomer = (req, res) => {
  const {
    name,
    company,
    cnic,
    mobile,
    email,
    land_line,
    city,
    status,
    credit_limit
  } = req.body;

  // Step 0: Validate required fields
  if (!name || !company || !mobile || !city || !status) {
    return res.status(400).json({ error: "Missing required customer fields" });
  }

  // Step 1: Generate created_at timestamp
  const created_at = new Date().toISOString();

  // Step 2: Insert new customer
  const insertCustomerSql = `
    INSERT INTO customer (
      name, company, cnic, mobile, email, land_line, city, status,
      credit_limit, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const customerValues = [
    name,
    company,
    cnic,
    mobile,
    email,
    land_line,
    city,
    status,
    credit_limit,
    created_at
  ];

  db.run(insertCustomerSql, customerValues, function (err) {
    if (err) {
      return res.status(500).json({ error: "Error inserting customer", details: err.message });
    }

    const customerId = this.lastID;

    // Step 3: Count total customers
    const countQuery = `SELECT COUNT(*) AS total FROM customer`;
    db.get(countQuery, [], (err, countRow) => {
      if (err) {
        return res.status(500).json({ error: "Error counting customers", details: err.message });
      }

      const countCustomer = countRow.total;
      console.log("customer " + countCustomer);

      // Step 4: Generate headcode and headname
        const baseHeadCode = BigInt(2001312000); // start base as BigInt
      const headname = `${name} C-${customerId}`;
 const headcode = (baseHeadCode + BigInt(countCustomer + 1)).toString(); 
      // Step 5: Insert into chart_of_accounts
      const coaSql = `
        INSERT INTO chart_of_accounts (
          location_id, head_code, head_name, parent_id, level,
          supplier_id, customer_id, deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const coaValues = [
        1,              // location_id (hardcoded like supplier)
        headcode,
        headname,
        20,             // parent_id for Customers (change as per your COA hierarchy)
        2,              // level (consistent with Supplier logic)
        null,           // supplier_id
        customerId,     // customer_id link
        null,           // deleted_at
        created_at,
        null            // updated_at
      ];

      db.run(coaSql, coaValues, function (err) {
        if (err) {
          return res.status(500).json({
            error: "Error inserting into chart_of_accounts",
            details: err.message
          });
        }

        console.log("Chart of Accounts inserted successfully for customer");

        return res.status(201).json({
          message: "Customer and Chart of Accounts added successfully",
          customer_id: customerId,
          headcode: headcode
        });
      });
    });
  });
};



