// controllers/CategoryController.js
const db = require('../db');

exports.getAllcategory = (req, res) => {
    db.all('SELECT * FROM Category ORDER BY ID DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ Category: rows,status:"true" });
    });
};

exports.getOnecategory = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM Category WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Category not found' });
        res.json(row);

    });
};

exports.updatecategory = (req, res) => {
    const { name, status,description, id } = req.body;

    const sql = 'UPDATE Category SET name = ?,description=?, status = ? WHERE id = ?';

    db.run(sql, [name,description, status, id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Category not updated' });
        return res.status(200).json({ message: 'Category updated successfully', status: "success" });
    });
};

exports.addcategory = (req, res) => {
    const { name,description, status } = req.body;

    db.run('INSERT INTO Category (name,description, status) VALUES (?, ?,?)', [name,description, status], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID,status:"success" });
    });
};
