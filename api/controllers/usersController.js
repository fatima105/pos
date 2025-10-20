
const db = require('../db');
const bcrypt = require("bcryptjs");


exports.createUser = async (req, res) => {
  const { location_id, name, email, role, password, status } = req.body;

  // ✅ Validate required fields
  if (!name || !email || !role || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, role, and password are required" });
  }

  try {
    // ✅ Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (location_id, name, email, role, password, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [location_id || 1, name, email, role, hashedPassword, status || "active"],
      function (err) {
        if (err) {
          console.error("❌ Error inserting user:", err.message);
          return res.status(500).json({ error: "Failed to create user" });
        }

        res.json({
          success: true,
          message: "✅ User created successfully",
          user_id: this.lastID,
        });
      }
    );
  } catch (err) {
    console.error("❌ Error hashing password:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createUserLicense = async (req, res) => {
  const { user_id, issue_date, expiry_date } = req.body;

  if (!user_id || !issue_date || !expiry_date) {
    return res
      .status(400)
      .json({ error: "user_id, issue_date, and expiry_date are required" });
  }

  try {
    // Check if license already exists for this user
    db.get(
      `SELECT * FROM license WHERE user_id = ?`,
      [user_id],
      (err, row) => {
        if (err) {
          console.error("❌ Error checking license:", err.message);
          return res.status(500).json({ error: "Failed to check license" });
        }

        if (row) {
          // License already exists — update it
          db.run(
            `UPDATE license SET issue_date = ?, expiry_date = ? WHERE user_id = ?`,
            [issue_date, expiry_date, user_id],
            function (err) {
              if (err) {
                console.error("❌ Error updating license:", err.message);
                return res.status(500).json({ error: "Failed to update license" });
              }

              res.json({
                success: true,
                message: "✅ License updated successfully",
              });
            }
          );
        } else {
          // No license yet — insert a new one
          db.run(
            `INSERT INTO license (user_id, issue_date, expiry_date) VALUES (?, ?, ?)`,
            [user_id, issue_date, expiry_date],
            function (err) {
              if (err) {
                console.error("❌ Error inserting license:", err.message);
                return res.status(500).json({ error: "Failed to create license" });
              }

              res.json({
                success: true,
                message: "✅ License created successfully",
                license_id: this.lastID,
              });
            }
          );
        }
      }
    );
  } catch (err) {
    console.error("❌ Error creating license:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.UpdateUser = async (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: "Name and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.run(
      "UPDATE users SET name = ?, password = ? WHERE id = ?",
      [name, hashedPassword, userId]
    );

 

    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("UpdateUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  // ✅ Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // ✅ Check if user exists
  const sql = `SELECT * FROM users WHERE email = ?`;
  db.get(sql, [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    try {
      // ✅ Compare password using bcrypt
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // ✅ Success response
      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });
};



exports.getUsers = (req, res) => {
  console.log("HAD");
  const query = `
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      u.role, 
      u.status,
      CASE 
        WHEN l.user_id IS NOT NULL THEN 'Added'
        ELSE 'Not Added'
      END AS license
    FROM users u
    LEFT JOIN license l ON u.id = l.user_id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};


//   Get User by ID
exports.getUserById = (req, res) => {
  db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json(row);
  });
};

exports.getlicenseById = (req, res) => {
  const userId = req.params.id;
  console.log("📩 License API called for user ID:", userId);

  db.get(`SELECT * FROM license WHERE user_id = ?`, [userId], (err, row) => {
    if (err) {
      console.error("❌ Database error while fetching license:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      console.warn("⚠️ No license found for user ID:", userId);
      return res.status(404).json({ error: "License not found" });
    }

    // ✅ Check expiry date
    const currentDate = new Date();
    const expiryDate = new Date(row.expiry_date);
    const isExpired = expiryDate < currentDate;

    // Add status info to response
    const licenseData = {
      ...row,
      expired: isExpired,
      status: isExpired ? "Expired License" : "Active License"
    };

    console.log("✅ License data found:", licenseData);
    res.json(licenseData);
  });
};


//   Delete User
exports.deleteUser = (req, res) => {
  db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "  User deleted successfully", changes: this.changes });
  });
};
