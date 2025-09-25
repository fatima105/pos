const db = require('../db');
exports.addcashpayment = (req, res) => {
  const { location_id, date, user_id, paid_from, items, total_amount } = req.body;
  const created_at = new Date().toISOString();
  const year = new Date().getFullYear();

  const getLatestcashpaymentIdSql = `SELECT MAX(id) AS max_id FROM cash_payments`;

  db.get(getLatestcashpaymentIdSql, (err, row) => {
    if (err) {
      console.error('❌ Error fetching latest cashpayment ID:', err.message);
      return res.status(500).json({ error: 'Failed to generate voucher number' });
    }

    const nextId = (row?.max_id || 0) + 1;
    const voucher = `CP-${year}-${nextId}`;
console.log(voucher);
    const insertCashPaymentSql = `
      INSERT INTO cash_payments (location_id, voucher_no, date, paid_from, user_id, amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const cashpaymentParams = [location_id, voucher, date, paid_from, user_id, total_amount, created_at];

    db.run(insertCashPaymentSql, cashpaymentParams, function (err) {
      if (err) {
        console.error('❌ Error inserting cashpayment:', err.message);
        return res.status(500).json({ error: 'Failed to add cashpayment' });
      }

      const cashpayment_id = this.lastID;

      const insertDetails = items.map((item) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO cash_payment_details (location_id, cash_payment_id, supplier_id, remarks, amount, updated_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [location_id, cashpayment_id, item.supplier_id || null, item.remarks, item.amount, created_at, created_at],
            (err) => {
              if (err) {
                console.error('❌ Error inserting cashpayment detail:', err.message);
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
              [location_id, 'cash_payments', cashpayment_id, date, user_id, created_at, created_at],
              function (err) {
                if (err) {
                  console.error('❌ Error inserting transaction:', err.message);
                  return reject(err);
                }
                resolve(this.lastID);
              }
            );
          });
        })
        .then((transactionId) => {
          return new Promise((resolve, reject) => {
            db.get(
              `SELECT head_code, head_name FROM chart_of_accounts WHERE head_name = 'Cash In Hand'`,
              (err, cashRow) => {
                if (err || !cashRow) {
                  return reject(new Error("❌ 'Cash In Hand' account not found."));
                }

                const transactionDetailsPromises = items.map((item) => {
                  return new Promise((resolveDetail, rejectDetail) => {
                    db.get(
                      `SELECT head_code, head_name FROM chart_of_accounts WHERE supplier_id = ?`,
                      [item.supplier_id],
                      (err, supplierRow) => {
                        if (err || !supplierRow) {
                          return rejectDetail(new Error(`❌ Supplier account not found for ID ${item.supplier_id}`));
                        }

                        const supplierNarration = `Cash paid to ${supplierRow.head_name}`;
                        const cashNarration = 'Cash In Hand';

                        // Insert Debit to Supplier
                        db.run(
                          `INSERT INTO Transaction_details 
                          (location_id, transaction_details, v_id, coa_id, narration, debit, credit)
                          VALUES (?, ?, ?, ?, ?, ?, ?)`,
                          [location_id, 'Cash Payment', transactionId, supplierRow.head_code, supplierNarration, item.amount, 0],
                          (err) => {
                            if (err) return rejectDetail(err);

                            // Insert Credit to Cash In Hand
                            db.run(
                              `INSERT INTO Transaction_details 
                              (location_id, transaction_details, v_id, coa_id, narration, debit, credit)
                              VALUES (?, ?, ?, ?, ?, ?, ?)`,
                              [location_id, 'Cash Payment', transactionId, cashRow.head_code, cashNarration, 0, item.amount],
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
            message: '✅ Cashpayment, details, transaction, and transaction_details inserted successfully',
            cashpayment_id,
            transaction_id: transactionId,
            voucher_no: voucher,
          });
        })
        .catch((err) => {
          console.error('❌ Final Error:', err.message);
          res.status(500).json({
            success: false,
            message: 'Failed to complete full cashpayment process',
            detail: err.message,
          });
        });
    });
  });
};





exports.getcashpayment = (req, res) => {
  const sql = `
    SELECT 
*
   FROM cash_payments order by id desc
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error retrieving cash_payments:', err.message);
      return res.status(500).json({ error: 'Failed to fetch cash_payments' });
    }

    res.json({
      message: '✅ cash_payments fetched successfully',
      data: rows
    });
  });
};
exports.getSpecificPayable = (req, res) => {
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

      // Then calculate payable
      db.get(
        "SELECT SUM(credit) AS total_credit, SUM(debit) AS total_debit FROM transaction_details WHERE coa_id = ?",
        [headCode],
        (err, transRow) => {
          if (err) return res.status(500).json({ error: "Error calculating payable" });

          const totalCredit = transRow.total_credit || 0;
          const totalDebit = transRow.total_debit || 0;
          const payable = totalCredit - totalDebit;

          res.json({
            head_code: headCode,
            pay_able: payable
          });
        }
      );
    });
  });
};
exports.getSpecific = (req, res) => {
  const { id } = req.params;
  console.log("🔎 Received ID:", id);

  const sql = `
    SELECT 
      cp.id AS cash_payment_id,
      cp.voucher_no,
      cp.date,
      cp.paid_from,
      cp.user_id,
      cp.amount AS total_amount,
      cpd.id AS detail_id,
      cpd.remarks,
      cpd.amount,
      sup.name AS supplier_name
    FROM cash_payments cp
    INNER JOIN cash_payment_details cpd ON cpd.cash_payment_id = cp.id
    LEFT JOIN Supplier sup ON sup.id = cpd.supplier_id
    WHERE cp.id = ?
  `;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error("❌ Error retrieving specific cash payment:", err.message);
      return res.status(500).json({ error: "Failed to fetch cash payment data" });
    }

    console.log("✅ Query Result:", rows); // log results in console

    res.json({
      message: `✅ Cash payment details for ID ${id} fetched successfully`,
      data: rows
    });
  });
};




