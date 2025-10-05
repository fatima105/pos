const db = require('../db');

// Assign module to user
exports.assignModule = (req, res) => {
  const { user_id, module_ids } = req.body;

  if (!user_id || !Array.isArray(module_ids) || module_ids.length === 0) {
    return res
      .status(400)
      .json({ error: "user_id and module_ids[] are required" });
  }

  const checkSql = `SELECT 1 FROM module_assign_user WHERE user_id = ? AND module_id = ?`;
  const insertSql = `INSERT INTO module_assign_user (user_id, module_id) VALUES (?, ?)`;

  try {
    module_ids.forEach((module_id) => {
      db.get(checkSql, [user_id, module_id], (err, row) => {
        if (err) {
          console.error("Error checking module:", err.message);
          return;
        }

        // ✅ Insert only if not already assigned
        if (!row) {
          db.run(insertSql, [user_id, module_id], (err) => {
            if (err) {
              console.error("Error inserting module:", err.message);
            }
          });
        }
      });
    });

    res.json({ success: true, message: "Modules assigned successfully (duplicates skipped)" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// Get all modules assigned to a user
exports.getUserModules = (req, res) => {
  console.log("hitted");
  const { userId } = req.params;

  const sql = `
    SELECT m.id, m.name, m.description
    FROM module_assign_user am
    JOIN modules m ON am.module_id = m.id
    WHERE am.user_id = ?
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "No modules found for this user" });
    }

    res.json({ user_id: userId, modules: rows });
  });
};
