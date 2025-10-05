const db = require('../db');

// Create new module
exports.createModule = (req, res) => {
  const { name, description } = req.body;
  db.run(
    `INSERT INTO modules (name, description) VALUES (?, ?)`,
    [name, description],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, name, description });
    }
  );
};

// Get all modules
exports.getModules = (req, res) => {
  db.all(`SELECT * FROM modules`, [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
};
