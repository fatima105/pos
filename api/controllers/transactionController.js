// controllers/TransactionController.js
const db = require('../db');

exports.getAllTransactions = (req, res) => {
    db.all('SELECT * FROM "Transaction" ORDER BY ID DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ Transaction: rows });
    });
};
exports.getAllTransactionsDetail = (req, res) => {
    db.all('SELECT * FROM "Transaction_details" ORDER BY ID DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ Transaction: rows });
    });
};
exports.deleteTransaction = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM Transaction WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ message: 'Transaction deleted successfully' });
    });
};

exports.getOneTransaction = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM Transaction WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Transaction not found' });
        res.json(row);
    });
};

exports.updateTransaction = (req, res) => {
    const { name,Transaction_rate, status, id } = req.body;

    const sql = 'UPDATE Transaction SET name = ?, Transaction_rate=? ,status = ? WHERE id = ?';

    db.run(sql, [name, Transaction_rate, status, id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Transaction not updated (ID not found)' });
        return res.status(200).json({ message: 'Transaction updated successfully', status: "success" });
    });
};



exports.addTransaction = (req, res) => {
    const { type, type_id, user_id } = req.body;
  
    const location_id = 1;
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const date = formattedDate;
    const created_at = formattedDate;
    const updated_at = formattedDate;
    const deleted_at = null;
  
    const query = `
      INSERT INTO "Transaction"
      (location_id, type, type_id, date, user_id, deleted_at, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  
    const values = [location_id, type, type_id, date, user_id, deleted_at, created_at, updated_at];
  
    db.run(query, values, function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(200).json({ id: this.lastID ,
        status:true,
        message:"Data successfully inserted"});
    });
  };
  
