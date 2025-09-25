const db = require('../db');
exports.addexpense = (req, res) => {
  const { location_id, date, user_id, paid_from, items } = req.body;
  const created_at = new Date().toISOString();
  const year = new Date().getFullYear();

  // Get the latest expense ID for voucher generation
  const getLatestExpenseIdSql = `SELECT MAX(id) AS max_id FROM expenses`;

  db.get(getLatestExpenseIdSql, (err, row) => {
    if (err) {
      console.error('❌ Error fetching latest expense ID:', err.message);
      return res.status(500).json({ error: 'Failed to generate voucher number' });
    }

    const nextId = (row?.max_id || 0) + 1;
    const voucher = `EV-${year}-${nextId}`;

    // Insert into expenses
    const insertExpenseSql = `
      INSERT INTO expenses (location_id, voucher_no, date, paid_from, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const expenseParams = [location_id, voucher, date, paid_from, user_id, created_at];

    db.run(insertExpenseSql, expenseParams, function (err) {
      if (err) {
        console.error('❌ Error inserting expense:', err.message);
        return res.status(500).json({ error: 'Failed to add expense' });
      }

      const expense_id = this.lastID;

      // Insert into expense_details
      const insertDetails = items.map((item) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO expense_details (expense_id, location_id, remarks, amount, updated_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [expense_id, location_id, item.remarks, item.amount, created_at, created_at],
            (err) => {
              if (err) {
                console.error('❌ Error inserting expense detail:', err.message);
                return reject(err);
              }
              resolve();
            }
          );
        });
      });

      Promise.all(insertDetails)
        .then(() => {
          return new Promise((resolve, reject) => {
            // Insert into transaction
            const insertTransactionSql = `
              INSERT INTO "Transaction" (
                location_id, type, type_id, date, user_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(
              insertTransactionSql,
              [location_id, 'EXPENSES', expense_id, date, user_id, created_at, created_at],
              function (err) {
                if (err) {
                  console.error('❌ Error inserting transaction:', err.message);
                  return reject(err);
                }
                resolve(this.lastID); // return transactionId
              }
            );
          });
        })
        .then((transactionId) => {
          // Get Expense Head Code
          db.get(
            `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Expenses'`,
            (errExpenses, expenseRow) => {
              if (errExpenses || !expenseRow) {
                console.error('❌ Error getting Expenses head_code:', errExpenses?.message);
                return res.status(500).json({ error: 'Missing Expenses head_code' });
              }

              const expenseHeadCode = expenseRow.head_code;

              // Get Cash Head Code
              db.get(
                `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Cash In Hand'`,
                (errCash, cashRow) => {
                  if (errCash || !cashRow) {
                    console.error('❌ Error getting Cash head_code:', errCash?.message);
                    return res.status(500).json({ error: 'Missing Cash head_code' });
                  }

                  const cashHeadCode = cashRow.head_code;

                  const insertDetailSql = `
                    INSERT INTO transaction_details (
                      location_id, transaction_details, v_id, coa_id, narration, debit, credit
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                  `;

                  const txnPromises = [];

                  items.forEach((item) => {
                    const amount = parseFloat(item.amount);
                    const narration = item.remarks || 'Expense Entry';

                    // Debit Expense
                    txnPromises.push(
                      new Promise((resolve, reject) => {
                        db.run(
                          insertDetailSql,
                          [location_id, null, transactionId, expenseHeadCode, narration, amount, 0],
                          (err) => {
                            if (err) return reject(err);
                            resolve();
                          }
                        );
                      })
                    );

                    // Credit Cash
                    txnPromises.push(
                      new Promise((resolve, reject) => {
                        db.run(
                          insertDetailSql,
                          [location_id, null, transactionId, cashHeadCode, narration, 0, amount],
                          (err) => {
                            if (err) return reject(err);
                            resolve();
                          }
                        );
                      })
                    );
                  });

                  Promise.all(txnPromises)
                    .then(() => {
                      res.status(201).json({
                        message: '✅ Expense, details, transaction, and accounting entries added successfully',
                        expense_id,
                        voucher_no: voucher,
                      });
                    })
                    .catch((err) => {
                      console.error('❌ Error inserting transaction details:', err.message);
                      res.status(500).json({ error: 'Failed to insert transaction details' });
                    });
                }
              );
            }
          );
        })
        .catch((err) => {
          console.error('❌ Final Error:', err.message);
          res.status(500).json({
            success: false,
            message: 'Failed to complete expense entry process',
            detail: err.message,
          });
        });
    });
  });
};



exports.getexpense = (req, res) => {
const sql = `
  SELECT 
    e.*, 
    ed.remarks,
    ed.amount
  FROM expenses e
  LEFT JOIN expense_details ed ON ed.expense_id = e.id
  ORDER BY e.id DESC
`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error retrieving expenses:', err.message);
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }

    res.json({
      message: '✅ Expenses fetched successfully',
      data: rows
    });
  });
};

exports.getSpecific = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      e.*,
      ex.id AS expense_id,
      ex.date,
      ex.voucher_no,
      ex.paid_from,
      ex.user_id
    FROM expense_details e
    INNER JOIN expenses ex ON e.expense_id = ex.id
    WHERE e.expense_id = ?
  `;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error('❌ Error retrieving joined expense details:', err.message);
      return res.status(500).json({ error: 'Failed to fetch expense data' });
    }

    res.json({
      message: `✅ Expense details for ID ${id} fetched successfully`,
      data: rows
    });
  });
};


