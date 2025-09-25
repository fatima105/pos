const db = require('../db');
exports.addreceivedpayment = (req, res) => {
  const { location_id, date, user_id, received_in, items, total_amount } = req.body;
  const created_at = new Date().toISOString();
  const year = new Date().getFullYear();

  const getLatestIdSql = `SELECT MAX(id) AS max_id FROM cash_received`;

  db.get(getLatestIdSql, (err, row) => {
    if (err) {
      console.error('❌ Error fetching latest cash_received ID:', err.message);
      return res.status(500).json({ error: 'Failed to generate voucher number' });
    }

    const nextId = (row?.max_id || 0) + 1;
    const voucher = `EV-${year}-${nextId}`;

    const insertSql = `
      INSERT INTO cash_received (location_id, voucher_no, date, received_in, user_id, amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [location_id, voucher, date, received_in, user_id, total_amount, created_at];

    db.run(insertSql, params, function (err) {
      if (err) {
        console.error('❌ Error inserting into cash_received:', err.message);
        return res.status(500).json({ error: 'Failed to add cash_received' });
      }

      const cash_received_id = this.lastID;

      const insertDetails = items.map((item) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO cash_received_details (location_id, cash_received_id, customer_id, remarks, amount, updated_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [location_id, cash_received_id, item.customer_id || null, item.remarks, item.amount, created_at, created_at],
            (err) => {
              if (err) {
                console.error('❌ Error inserting cash_received detail:', err.message);
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
            const insertTransactionSql = `
              INSERT INTO "Transaction" (
                location_id, type, type_id, date, user_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(
              insertTransactionSql,
              [location_id, 'cash_received', cash_received_id, date, user_id, created_at, created_at],
              function (err) {
                if (err) {
                  console.error('❌ Error inserting into Transaction:', err.message);
                  return reject(err);
                }
                resolve(this.lastID); // transaction ID
              }
            );
          });
        })
        .then((transactionId) => {
          return new Promise((resolve, reject) => {
            // Get Cash In Hand head_code
            db.get(
              `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Cash In Hand'`,
              (err, cashRow) => {
                if (err || !cashRow) {
                  return reject(new Error('❌ "Cash In Hand" account not found.'));
                }

                const transactionDetailsPromises = items.map((item) => {
                  return new Promise((resolveDetail, rejectDetail) => {
                    // Get customer head_code
                    db.get(
                      `SELECT head_code, head_name FROM chart_of_accounts WHERE customer_id = ?`,
                      [item.customer_id],
                      (err, customerRow) => {
                        if (err || !customerRow) {
                          return rejectDetail(new Error(`❌ Customer account not found for ID ${item.customer_id}`));
                        }

                        const customerNarration = `Cash received from ${customerRow.head_name}`;
                        const cashNarration = 'Cash In Hand';

                        // 1. Debit Cash In Hand
                        db.run(
                          `INSERT INTO Transaction_details 
                          (location_id, transaction_details, v_id, coa_id, narration, debit, credit)
                          VALUES (?, ?, ?, ?, ?, ?, ?)`,
                          [location_id, 'Cash Received', transactionId, cashRow.head_code, cashNarration, item.amount, 0],
                          (err) => {
                            if (err) return rejectDetail(err);

                            // 2. Credit Customer
                            db.run(
                              `INSERT INTO Transaction_details 
                              (location_id, transaction_details, v_id, coa_id, narration, debit, credit)
                              VALUES (?, ?, ?, ?, ?, ?, ?)`,
                              [location_id, 'Cash Received', transactionId, customerRow.head_code, customerNarration, 0, item.amount],
                              (err2) => {
                                if (err2) return rejectDetail(err2);
                                resolveDetail();
                              }
                            );
                          }
                        );
                      }
                    );
                  });
                });

                Promise.all(transactionDetailsPromises)
                  .then(() => resolve(transactionId))
                  .catch(reject);
              }
            );
          });
        })
        .then((transactionId) => {
          res.status(201).json({
            message: '✅ Cash received, details, transaction, and transaction_details inserted successfully',
            cash_received_id,
            transaction_id: transactionId,
            voucher_no: voucher,
          });
        })
        .catch((err) => {
          console.error('❌ Final Error:', err.message);
          res.status(500).json({
            success: false,
            message: 'Failed to complete full cash_received process',
            detail: err.message,
          });
        });
    });
  });
};


exports.getSpecificReceieveable= (req, res) => {
  const { id } = req.params;

  // First, get the customer
  db.get("SELECT * FROM Customer WHERE id = ?", [id], (err, customerRow) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!customerRow) return res.status(404).json({ error: "Customer not found" });

    // Then get head_code
    db.get("SELECT head_code FROM chart_of_accounts WHERE customer_id = ?", [id], (err, coaRow) => {
      if (err) return res.status(500).json({ error: "Error fetching chart of accounts" });
      if (!coaRow) return res.status(404).json({ error: "Chart of account not found" });

      const headCode = coaRow.head_code;

      // Then calculate receivable
      db.get(
        "SELECT SUM(credit) AS total_credit, SUM(debit) AS total_debit FROM transaction_details WHERE coa_id = ?",
        [headCode],
        (err, transRow) => {
          if (err) return res.status(500).json({ error: "Error calculating receivable" });

          const totalCredit = transRow.total_credit || 0;
          const totalDebit = transRow.total_debit || 0;
          const receivable = totalDebit - totalCredit;

          res.json({
            head_code: headCode,
            receivable: receivable,
            customer: customerRow
          });
        }
      );
    });
  });
};

exports.getreceivedcashpayment = (req, res) => {
  const sql = `
    SELECT 
*
   FROM cash_received order by id desc
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error retrieving cash_received:', err.message);
      return res.status(500).json({ error: 'Failed to fetch cash_receiveds' });
    }

    res.json({
      message: '✅ cash_receiveds fetched successfully',
      data: rows
    });
  });
};
exports.getreceivedpayment = (req, res) => {
  const { id } = req.params;

  // First, get the supplier
  db.get("SELECT * FROM Supplier WHERE id = ?", [id], (err, supplierRow) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!supplierRow) return res.status(404).json({ error: "Supplier not found" });

    // Then get head_code
    db.get("SELECT head_code FROM chart_of_accounts WHERE supplier_id = ?", [id], (err, coaRow) => {
      if (err) return res.status(500).json({ error: "Error fetching chart of accounts" });
      if (!coaRow) return res.status(404).json({ error: "Chart of account not found" });

      const headCode = coaRow.head_code;

      // Then calculatereceieveable
      db.get(
        "SELECT SUM(credit) AS total_credit, SUM(debit) AS total_debit FROM transaction_details WHERE coa_id = ?",
        [headCode],
        (err, transRow) => {
          if (err) return res.status(500).json({ error: "Error calculatingreceieveable" });

          const totalCredit = transRow.total_credit || 0;
          const totalDebit = transRow.total_debit || 0;
          constreceieveable = totalCredit - totalDebit;

          res.json({
            head_code: headCode,
            pay_able:receieveable
          });
        }
      );
    });
  });
};

exports.getSpecific = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      cr.id AS cash_received_id,
      cr.voucher_no,
      cr.date,
      cr.received_in,
      cr.user_id,
      crd.id AS detail_id,
      crd.remarks,
      crd.amount,
      cs.name AS customer_name
    FROM cash_received cr
    INNER JOIN cash_received_details crd ON crd.cash_received_id = cr.id
    LEFT JOIN Customer cs ON cs.id = crd.customer_id
    WHERE cr.id = ?
  `;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error('❌ Error retrieving specific cash payment:', err.message);
      return res.status(500).json({ error: 'Failed to fetch cash payment data' });
    }

    res.json({
      message: `✅ Cash payment details for ID ${id} fetched successfully`,
      data: rows
    });
  });
};



