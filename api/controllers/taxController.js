// controllers/TaxController.js
const db = require('../db');

exports.getAllTaxs = (req, res) => {
    db.all('SELECT * FROM Tax ORDER BY ID DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ Tax: rows });
    });
};
exports.deleteTax = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM Tax WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Tax not found' });
        }

        res.json({ message: 'Tax deleted successfully' });
    });
};

exports.getOneTax = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM Tax WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Tax not found' });
        res.json(row);
    });
};

exports.updateTax = (req, res) => {
    const { name,tax_rate, status, id } = req.body;

    const sql = 'UPDATE Tax SET name = ?, tax_rate=? ,status = ? WHERE id = ?';

    db.run(sql, [name, tax_rate, status, id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Tax not updated (ID not found)' });
        return res.status(200).json({ message: 'Tax updated successfully', status: "success" });
    });
};

exports.addTax = (req, res) => {
    const { name, status,tax_rate } = req.body;

    db.run('INSERT INTO Tax (name, tax_rate, status) VALUES (?, ?,?)', [name, tax_rate, status], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID });
    });
};
