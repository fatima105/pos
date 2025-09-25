const db = require('../db');

exports.getSpecificBalance = (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM chart_of_accounts WHERE id = ?", [id], (err, coaRow) => {
    if (err) return res.status(500).json({ error: "Error fetching chart of accounts" });
    if (!coaRow) return res.status(404).json({ error: "Chart of account not found" });

    const headCode = coaRow.head_code;

    db.get(
      "SELECT SUM(credit) AS total_credit, SUM(debit) AS total_debit FROM transaction_details WHERE coa_id = ?",
      [headCode],
      (err, transRow) => {
        if (err) return res.status(500).json({ error: "Error calculating balance" });

        const totalCredit = transRow.total_credit || 0;
        const totalDebit = transRow.total_debit || 0;
        const balance = totalDebit - totalCredit;

        res.json({
          head_code: headCode,
          balance: balance
        });
      }
    );
  });
};



exports.addjournalpayment = (req, res) => {
  const { items, location_id, date, user_id } = req.body;
  let transaction_id;
const now = new Date().toISOString();
  // Wrap the insert into a Promise
  new Promise((resolve, reject) => {
    const insertTransactionSql = `
      INSERT INTO "Transaction" (
        location_id, type, type_id, date, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertTransactionSql,
      [location_id, 'JV', '0', date, user_id, now,now],
      function (err) {
        if (err) {
          console.error('❌ Error inserting into Transaction:', err.message);
          return reject(err);
        }
        transaction_id = this.lastID;
        resolve();
      }
    );
  })
    .then(() => {
      const detailPromises = items.map((item) => {
        return new Promise((resolve, reject) => {
          const insertDetailSql = `
            INSERT INTO Transaction_Details (
              location_id,
              transaction_details,
              v_id,
              coa_id,
              narration,
              debit,
              credit
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(
            insertDetailSql,
            [
              location_id,
              'Journal Payment',
              transaction_id,
              item.head_code,
              item.remarks,
              item.debit,
              item.credit
            ],
            function (err) {
              if (err) {
                console.error('❌ Error inserting into Transaction_Details:', err.message);
                return reject(err);
              }
              resolve();
            }
          );
        });
      });

      return Promise.all(detailPromises);
    })
    .then(() => {
      res.status(201).json({
        success: true,
        message: '✅ Journal payment recorded successfully',
        transaction_id
      });
    })
    .catch((err) => {
      console.error('❌ Final Error:', err.message);
      res.status(500).json({
        success: false,
        message: 'Failed to complete journal payment entry process',
        detail: err.message,
      });
    });
};

exports.getjournalpayment = (req, res) => {
  const sql = `
    SELECT 
      t.id,
      t.date,
      td.narration,
      td.credit,
      t.user_id,
      'JV-' || strftime('%Y', t.date) || '-' || t.id AS code
    FROM "Transaction" t
    JOIN (
      SELECT v_id, narration, credit
      FROM "Transaction_details"
      WHERE credit > 0
      GROUP BY v_id
    ) td ON td.v_id = t.id
    WHERE t.type = 'JV'
    ORDER BY t.id DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch journal payments.' });
    }
    res.json({ data: rows });
  });
};


exports.gDeletejournalpayment = (req, res) => {
  const id = req.params.id;

  const deleteDetailsSql = `DELETE FROM "Transaction_details" WHERE v_id = ?`;
  const deleteTransactionSql = `DELETE FROM "Transaction" WHERE id = ?`;

  db.run(deleteDetailsSql, [id], function (err) {
    if (err) {
      console.error('Failed to delete transaction details:', err);
      return res.status(500).json({ error: 'Failed to delete transaction details.' });
    }

    db.run(deleteTransactionSql, [id], function (err) {
      if (err) {
        console.error('Failed to delete transaction:', err);
        return res.status(500).json({ error: 'Failed to delete transaction.' });
      }

      res.json({ message: 'Journal payment deleted successfully.' });
    });
  });
};

exports.getspecificjournalpayment = (req, res) => {
  const transactionId = req.params.id;

  const sql = `
    SELECT 
      t.id,
      t.date,
      td.narration,
      td.coa_id,
      coa.head_name,
      td.debit,
      td.credit,
      t.user_id,
      'JV-' || strftime('%Y', t.date) || '-' || t.id AS code
    FROM "Transaction" t
    JOIN "Transaction_details" td ON td.v_id = t.id
    LEFT JOIN chart_of_accounts coa ON td.coa_id = coa.head_code
    WHERE t.id = ?
    ORDER BY td.id ASC
  `;

  db.all(sql, [transactionId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch journal payment.' });
    }
    res.json({ data: rows });
  });
};
