// controllers/unitController.js
const db = require('../db');

exports.getAllUnits = (req, res) => {
    db.all('SELECT * FROM Unit ORDER BY ID DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ Unit: rows });
    });
};

exports.getOneUnit = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM Unit WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Unit not found' });
        res.json(row);
    });
};

// 🟢 Update unit (also updates updated_at timestamp)
exports.updateUnit = (req, res) => {
    const { name, status, id } = req.body;
    const updatedAt = new Date().toISOString(); // current timestamp in ISO format

    const sql = 'UPDATE Unit SET name = ?, status = ?, updated_at = ? WHERE id = ?';

    db.run(sql, [name, status, updatedAt, id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Unit not updated (ID not found)' });
        return res.status(200).json({ message: 'Unit updated successfully', status: "true" });
    });
};

// 🟢 Add unit (also adds created_at & updated_at timestamps)
exports.addUnit = (req, res) => {
    const { name, status } = req.body;
    const now = new Date().toISOString();

    const sql = 'INSERT INTO Unit (name, status, created_at, updated_at) VALUES (?, ?, ?, ?)';

    db.run(sql, [name, status, now, now], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Unit added successfully' });
    });
};