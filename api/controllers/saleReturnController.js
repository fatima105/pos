const db = require('../db');

// // Improved and cleaned version of `addReturnSale` WITH purchase_stocks entry
// exports.addReturnSale = (req, res) => {
//   const {
//     sale_id,
//     location_id,
//     customer_id,
//     user_id,
//     voucher_no,
//     sale_date,
//     sale_return_date,
//     amount,
//     products = [],
//     created_at,
//     updated_at
//   } = req.body;
// for (const product of products) {
//   const { product_id, quantity, discount, retail } = product;

// const updateQuery = `
//   UPDATE sale_details
//   SET returned_quantity = returned_quantity + ?
//   WHERE sale_id = ? AND product_id = ?
// `;
//   db.run(updateQuery, [quantity, sale_id, product_id], function (err) {
//     if (err) {
//       console.error(`❌ Error updating returned_quantity for product_id ${product_id}:`, err.message);
//     } else {
//       console.log(`✅ returned_quantity set to ${quantity} for product_id ${product_id}`);
//     }
//   });
// }

//   const insertReturnQuery = `
//     INSERT INTO sale_return 
//     (sale_id, location_id, customer_id, user_id, voucher_no, sale_date, sale_return_date, amount, created_at, updated_at)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;

//   const returnValues = [
//     sale_id, location_id, customer_id, user_id,
//     voucher_no, sale_date, sale_return_date,
//     amount, created_at, updated_at
//   ];

//   db.serialize(() => {
//     db.run(insertReturnQuery, returnValues, function (err) {
//       if (err) {
//         return res.status(400).json({ error: "Failed to insert into sale_return", detail: err.message });
//       }

//       const sale_return_id = this.lastID;

//       const insertDetailQuery = `
//         INSERT INTO sale_return_detail
//         (location_id, sale_return_id, sale_id, product_id, amount, quantity, discount, net_amount, tax, created_at, updated_at)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `;

//       const insertStockQuery = `
//         INSERT INTO purchase_stocks
//         (user_id, location_id, sale_id, sale_return_id, product_id, quantity, process, created_at, updated_at)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `;

//       const insertTransactionQuery = `
//         INSERT INTO "Transaction" 
//         (location_id, type, type_id, date, user_id, created_at, updated_at)
//         VALUES (?, 'Sale Return', ?, ?, ?, ?, ?)
//       `;

//       const detailStmt = db.prepare(insertDetailQuery);
//       const stockStmt = db.prepare(insertStockQuery);

//       if (products.length === 0) {
//         detailStmt.finalize();
//         stockStmt.finalize();

//         db.run(insertTransactionQuery, [
//           location_id, sale_return_id, sale_return_date, user_id, created_at, updated_at
//         ], function (err) {
//           if (err) {
//             return res.status(500).json({ error: "Failed to insert into Transaction table", detail: err.message });
//           }

//           return res.status(200).json({
//             message: 'Sale return saved successfully (no products)',
//             sale_return_id
//           });
//         });
//         return;
//       }

//       let completed = 0;
//       for (const product of products) {
//         const { product_id, quantity, discount, retail } = product;

//         const amount = parseFloat(retail || 0);
//         const disc = parseFloat(discount || 0);
//         const qty = parseFloat(quantity || 0);
//         const net_amount = (amount - disc) * qty;
//         const tax = 0;

//         // Insert into sale_return_detail
//         detailStmt.run([
//           location_id, sale_return_id, sale_id,
//           product_id, amount, qty, disc, net_amount, tax, created_at, updated_at
//         ], function (err) {
//           if (err) console.error("❌ Detail insert error:", err.message);

//           // Insert into purchase_stocks
//           stockStmt.run([
//             user_id, location_id, sale_id, sale_return_id,
//             product_id, qty, 'return', created_at, updated_at
//           ], function (err) {
//             if (err) console.error("❌ Stock insert error:", err.message);

//             completed++;
//             if (completed === products.length) {
//               detailStmt.finalize();
//               stockStmt.finalize();

//               db.run(insertTransactionQuery, [
//                 location_id, sale_return_id, sale_return_date, user_id, created_at, updated_at
//               ], function (err) {
//                 if (err) {
//                   return res.status(500).json({ error: "Failed to insert into Transaction table", detail: err.message });
//                 }

//                 const transactionId = this.lastID;
//                 const isWalkIn = customer_id === '1';

//                 if (isWalkIn) {
//                   const inventorySql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Inventory'`;
//                   const cashSql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Cash In Hand'`;
//                   const revenueSql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Revenue'`;

//                   db.get(inventorySql, (errInv, invRow) => {
//                     if (errInv || !invRow) {
//                       return res.status(500).json({ error: "Failed to get inventory head_code", detail: errInv?.message });
//                     }

//                     db.get(cashSql, (errCash, cashRow) => {
//                       if (errCash || !cashRow) {
//                         return res.status(500).json({ error: "Failed to get cash head_code", detail: errCash?.message });
//                       }

//                       db.get(revenueSql, (errRev, revRow) => {
//                         if (errRev || !revRow) {
//                           return res.status(500).json({ error: "Failed to get revenue head_code", detail: errRev?.message });
//                         }

//                         const insertTxnDetail = `
//                           INSERT INTO transaction_details 
//                           (location_id, transaction_details, v_id, coa_id, narration, debit, credit)
//                           VALUES (?, ?, ?, ?, ?, ?, ?)
//                         `;

//                         const txns = [
//                           [location_id, null, transactionId, invRow.head_code, 'Inventory', amount, 0],
//                           [location_id, null, transactionId, cashRow.head_code, 'Cash In Hand', 0, amount],
//                           [location_id, null, transactionId, revRow.head_code, 'Revenue', amount, 0]
//                         ];

//                         let inserted = 0;
//                         for (const t of txns) {
//                           db.run(insertTxnDetail, t, function (errT) {
//                             if (errT) {
//                               return res.status(500).json({ error: "Failed to insert transaction detail", detail: errT.message });
//                             }

//                             inserted++;
//                             if (inserted === txns.length) {
//                               return res.status(200).json({
//                                 success: true,
//                                 message: "✅ Sale return and walk-in transaction entries added successfully",
//                                 sale_return_id,
//                                 transaction_id: transactionId
//                               });
//                             }
//                           });
//                         }
//                       });
//                     });
//                   });
//                 } else {
//                   const getCustomerHeadSql = `SELECT head_code FROM chart_of_accounts WHERE customer_id = ?`;
//                   db.get(getCustomerHeadSql, [customer_id], (errCust, custRow) => {
//                     if (errCust || !custRow) {
//                       return res.status(500).json({ error: "Failed to get customer head_code", detail: errCust?.message });
//                     }

//                     const insertTxnDetail = `
//                       INSERT INTO transaction_details 
//                       (location_id, transaction_details, v_id, coa_id, narration, debit, credit)
//                       VALUES (?, ?, ?, ?, ?, ?, ?)
//                     `;

//                     db.get(`SELECT head_code FROM chart_of_accounts WHERE head_name = 'Inventory'`, (errInv, invRow) => {
//                       if (errInv || !invRow) {
//                         return res.status(500).json({ error: "Failed to get inventory head_code", detail: errInv?.message });
//                       }

//                       db.get(`SELECT head_code FROM chart_of_accounts WHERE head_name = 'Revenue'`, (errRev, revRow) => {
//                         if (errRev || !revRow) {
//                           return res.status(500).json({ error: "Failed to get revenue head_code", detail: errRev?.message });
//                         }

//                         const txns = [
//                           [location_id, null, transactionId, invRow.head_code, 'Inventory', amount, 0],
//                           [location_id, null, transactionId, custRow.head_code, 'Customer', 0, amount],
//                           [location_id, null, transactionId, revRow.head_code, 'Revenue', amount, 0]
//                         ];

//                         let inserted = 0;
//                         for (const t of txns) {
//                           db.run(insertTxnDetail, t, function (errT) {
//                             if (errT) {
//                               return res.status(500).json({ error: "Failed to insert transaction detail", detail: errT.message });
//                             }

//                             inserted++;
//                             if (inserted === txns.length) {
//                               return res.status(200).json({
//                                 success: true,
//                                 message: "✅ Sale return and credit customer transaction entries added successfully",
//                                 sale_return_id,
//                                 transaction_id: transactionId
//                               });
//                             }
//                           });
//                         }
//                       });
//                     });
//                   });
//                 }
//               });
//             }
//           });
//         });
//       }
//     });
//   });
// };

exports.addReturnSale = (req, res) => {
  const {
    sale_id,
    location_id,
    customer_id,
    user_id,
    voucher_no,
    sale_date,
    sale_return_date,
    amount,
    products = [],
    created_at,
    updated_at
  } = req.body;

  // ✅ Clean amount (remove commas, ensure number)
  const cleanAmount = parseFloat(String(amount).replace(/,/g, "")) || 0;

  for (const product of products) {
    const { product_id, quantity } = product;

    const updateQuery = `
      UPDATE sale_details
      SET returned_quantity = returned_quantity + ?
      WHERE sale_id = ? AND product_id = ?
    `;
    db.run(updateQuery, [quantity, sale_id, product_id], function (err) {
      if (err) {
        console.error(`❌ Error updating returned_quantity for product_id ${product_id}:`, err.message);
      } else {
        console.log(`✅ returned_quantity +${quantity} for product_id ${product_id}`);
      }
    });
  }

  const insertReturnQuery = `
    INSERT INTO sale_return 
    (sale_id, location_id, customer_id, user_id, voucher_no, sale_date, sale_return_date, amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const returnValues = [
    sale_id, location_id, customer_id, user_id,
    voucher_no, sale_date, sale_return_date,
    cleanAmount, created_at, updated_at
  ];

  db.serialize(() => {
    db.run(insertReturnQuery, returnValues, function (err) {
      if (err) {
        return res.status(400).json({ error: "Failed to insert into sale_return", detail: err.message });
      }

      const sale_return_id = this.lastID;

      const insertDetailQuery = `
        INSERT INTO sale_return_detail
        (location_id, sale_return_id, sale_id, product_id, amount, quantity, discount, net_amount, tax, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertStockQuery = `
        INSERT INTO purchase_stocks
        (user_id, location_id, sale_id, sale_return_id, product_id, quantity, process, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertTransactionQuery = `
        INSERT INTO "Transaction" 
        (location_id, type, type_id, date, user_id, created_at, updated_at)
        VALUES (?, 'Sale Return', ?, ?, ?, ?, ?)
      `;

      const detailStmt = db.prepare(insertDetailQuery);
      const stockStmt = db.prepare(insertStockQuery);

      if (products.length === 0) {
        detailStmt.finalize();
        stockStmt.finalize();

        db.run(insertTransactionQuery, [
          location_id, sale_return_id, sale_return_date, user_id, created_at, updated_at
        ], function (err) {
          if (err) {
            return res.status(500).json({ error: "Failed to insert into Transaction table", detail: err.message });
          }

          return res.status(200).json({
            message: 'Sale return saved successfully (no products)',
            sale_return_id
          });
        });
        return;
      }

      let completed = 0;
      for (const product of products) {
        const { product_id, quantity, discount, retail } = product;

        const prodAmount = parseFloat(String(retail || 0).replace(/,/g, "")) || 0;
        const disc = parseFloat(String(discount || 0).replace(/,/g, "")) || 0;
        const qty = parseFloat(String(quantity || 0).replace(/,/g, "")) || 0;
        const net_amount = (prodAmount - disc) * qty;
        const tax = 0;

        // Insert into sale_return_detail
        detailStmt.run([
          location_id, sale_return_id, sale_id,
          product_id, prodAmount, qty, disc, net_amount, tax, created_at, updated_at
        ], function (err) {
          if (err) console.error("❌ Detail insert error:", err.message);

          // Insert into purchase_stocks
          stockStmt.run([
            user_id, location_id, sale_id, sale_return_id,
            product_id, qty, 'return', created_at, updated_at
          ], function (err) {
            if (err) console.error("❌ Stock insert error:", err.message);

            completed++;
            if (completed === products.length) {
              detailStmt.finalize();
              stockStmt.finalize();

              db.run(insertTransactionQuery, [
                location_id, sale_return_id, sale_return_date, user_id, created_at, updated_at
              ], function (err) {
                if (err) {
                  return res.status(500).json({ error: "Failed to insert into Transaction table", detail: err.message });
                }

                const transactionId = this.lastID;
                const isWalkIn = customer_id === '3';

                const insertTxnDetail = `
                  INSERT INTO transaction_details 
                  (location_id, transaction_details, v_id, coa_id, narration, debit, credit)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                if (isWalkIn) {
                  // Walk-in case
                  const inventorySql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Inventory'`;
                  const cashSql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Cash In Hand'`;
                  const revenueSql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Revenue'`;

                  db.get(inventorySql, (errInv, invRow) => {
                    if (errInv || !invRow) {
                      return res.status(500).json({ error: "Failed to get inventory head_code", detail: errInv?.message });
                    }

                    db.get(cashSql, (errCash, cashRow) => {
                      if (errCash || !cashRow) {
                        return res.status(500).json({ error: "Failed to get cash head_code", detail: errCash?.message });
                      }

                      db.get(revenueSql, (errRev, revRow) => {
                        if (errRev || !revRow) {
                          return res.status(500).json({ error: "Failed to get revenue head_code", detail: errRev?.message });
                        }

                        const txns = [
                          [location_id, null, transactionId, invRow.head_code, 'Inventory', cleanAmount, 0],
                          [location_id, null, transactionId, cashRow.head_code, 'Cash In Hand', 0, cleanAmount],
                          [location_id, null, transactionId, revRow.head_code, 'Revenue', cleanAmount, 0]
                        ];

                        let inserted = 0;
                        for (const t of txns) {
                          db.run(insertTxnDetail, t, function (errT) {
                            if (errT) {
                              return res.status(500).json({ error: "Failed to insert transaction detail", detail: errT.message });
                            }

                            inserted++;
                            if (inserted === txns.length) {
                              return res.status(200).json({
                                success: true,
                                message: "✅ Sale return and walk-in transaction entries added successfully",
                                sale_return_id,
                                transaction_id: transactionId
                              });
                            }
                          });
                        }
                      });
                    });
                  });
                } else {
                  // Credit customer case
                  const getCustomerHeadSql = `SELECT head_code FROM chart_of_accounts WHERE customer_id = ?`;
                  db.get(getCustomerHeadSql, [customer_id], (errCust, custRow) => {
                    if (errCust || !custRow) {
                      return res.status(500).json({ error: "Failed to get customer head_code", detail: errCust?.message });
                    }

                    db.get(`SELECT head_code FROM chart_of_accounts WHERE head_name = 'Inventory'`, (errInv, invRow) => {
                      if (errInv || !invRow) {
                        return res.status(500).json({ error: "Failed to get inventory head_code", detail: errInv?.message });
                      }

                      db.get(`SELECT head_code FROM chart_of_accounts WHERE head_name = 'Revenue'`, (errRev, revRow) => {
                        if (errRev || !revRow) {
                          return res.status(500).json({ error: "Failed to get revenue head_code", detail: errRev?.message });
                        }

                        const txns = [
                          [location_id, null, transactionId, invRow.head_code, 'Inventory', cleanAmount, 0],
                          [location_id, null, transactionId, custRow.head_code, 'Customer', 0, cleanAmount],
                          [location_id, null, transactionId, revRow.head_code, 'Revenue', cleanAmount, 0]
                        ];

                        let inserted = 0;
                        for (const t of txns) {
                          db.run(insertTxnDetail, t, function (errT) {
                            if (errT) {
                              return res.status(500).json({ error: "Failed to insert transaction detail", detail: errT.message });
                            }

                            inserted++;
                            if (inserted === txns.length) {
                              return res.status(200).json({
                                success: true,
                                message: "✅ Sale return and credit customer transaction entries added successfully",
                                sale_return_id,
                                transaction_id: transactionId
                              });
                            }
                          });
                        }
                      });
                    });
                  });
                }
              });
            }
          });
        });
      }
    });
  });
};


exports.getSaleReturn = (req, res) => {
  const query = `
    SELECT 
      sale_return.*,
      customer.name AS customer_name
    FROM sale_return
    LEFT JOIN customer ON customer.id = sale_return.customer_id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(rows);
  });
};

exports.getSaleReturnDetail = (req, res) => {
  const { id } = req.body;

  const query = `
    SELECT 
      sale_return.voucher_no,
      sale_return.sale_date,
      sale_return.sale_return_date,
      sale_return.customer_id,
      customer.name AS customer_name,
      sale_return_detail.product_id,
      sale_return_detail.quantity,
      sale_return_detail.amount AS price,
      sale_return_detail.net_amount,
      product.name AS product_name
    FROM sale_return_detail
    LEFT JOIN sale_return ON sale_return_detail.sale_return_id = sale_return.id
    LEFT JOIN customer ON customer.id = sale_return.customer_id
    LEFT JOIN product ON product.id = sale_return_detail.product_id
   WHERE sale_return_detail.sale_return_id = ?
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "No sale return data found." });
    }

    const {
      voucher_no,
      sale_date,
      sale_return_date,
      customer_id,
      customer_name
    } = rows[0]; // Common sale-level info

    const products = rows.map(row => ({
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: row.quantity,
      price: row.price,
      net_amount: row.net_amount
    }));

    res.json({
      voucher_no,
      sale_date,
      sale_return_date,
      customer_id,
      customer_name,
      products
    });
  });
};
