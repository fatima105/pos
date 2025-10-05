
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
  db.all(`SELECT * FROM users`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
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

//   Delete User
exports.deleteUser = (req, res) => {
  db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "  User deleted successfully", changes: this.changes });
  });
};
