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

exports.updateUnit = (req, res) => {
    const { name, status, id } = req.body;

    const sql = 'UPDATE Unit SET name = ?, status = ? WHERE id = ?';

    db.run(sql, [name, status, id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Unit not updated (ID not found)' });
        return res.status(200).json({ message: 'Unit updated successfully', status: "true" });
    });
};

exports.addUnit = (req, res) => {
    const { name, status } = req.body;

    db.run('INSERT INTO Unit (name, status) VALUES (?, ?)', [name, status], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID });
    });
};
