const db = require('../db');


exports.addReturnSale = (req, res) => {
  

  const {
    sale_id,
    location_id,
    customer_id,
    user_id,
    voucher_no,
    sale_date,
    sale_return_date,
    totalRetail,
    totalDiscount,
    totalPurchase,
    amount,
    products = [],
    created_at,
    updated_at
  } = req.body;

  const TotalProfit = totalRetail - totalPurchase;
  console.log("PRODUCTS", products);




  // ✅ Clean amount (remove commas, ensure number)
  const cleanAmount = parseFloat(String(amount).replace(/,/g, "")) || 0;

  // Update returned_quantity in sale_details
  for (const product of products) {
    const { product_id, quantity, sale_detail_id } = product;

    const updateQuery = `
      UPDATE sale_details
      SET returned_quantity = returned_quantity + ?
      WHERE product_id = ? AND id = ?
    `;

    db.run(updateQuery, [quantity, product_id, sale_detail_id], function (err) {
      if (err) {
        console.error(`❌ Error updating returned_quantity for product_id ${product_id}:`, err.message);
      } else {
        console.log(`✅ returned_quantity +${quantity} for product_id ${product_id}, sale_detail_id ${sale_detail_id}`);
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
        (user_id, location_id, sale_id, sale_return_id, product_id, quantity, process, sale_detail_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        const { product_id, quantity, discount, retail, sale_detail_id } = product;

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
            product_id, qty, 'return v', sale_detail_id, created_at, updated_at
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


                              if(totalDiscount>0){
const insertDiscount = `
  INSERT INTO Sale_Discount (sale_id, remarks, amount, created_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
`;
db.run(insertDiscount, [sale_id, `Discount Applied on Sales Return ${voucher_no}`, totalDiscount], (err) => {
  if (err) throw new Error("Insert Discount Failed: " + err.message);
});
        }

                // ✅ Transaction details
                if (totalDiscount > 0) {
                  addTransactionDetail(transactionId, "Expenses", "Discount Applied on Sale Return",0,totalDiscount);
                }

                addTransactionDetail(transactionId, "Inventory", "Inventory Reduction Sale Return",  totalPurchase,0);
                addTransactionDetail(transactionId, customer_id, "Cash In hand Return", 0, totalRetail, true);
                addTransactionDetail(transactionId, "Revenue", "Revenue on Sale Return", TotalProfit,0);

                return res.status(200).json({
                  message: 'Sale return saved successfully',
                  sale_return_id,
                  transactionId
                });
              });
            }
          });
        });
      }

      // ✅ Helper function
      function addTransactionDetail(transactionId, account, narration, debit, credit, isCustomer = false) {
        let sql, param;
        if (isCustomer) {
          sql = `SELECT head_code FROM chart_of_accounts WHERE customer_id=? LIMIT 1`;
          param = [account];
        } else {
          sql = `SELECT head_code FROM chart_of_accounts WHERE head_name=? LIMIT 1`;
          param = [account];
        }

        db.get(sql, param, (err, row) => {
          if (err || !row) {
            console.error("❌ Head Code not found for", account);
            return;
          }
          const values = [location_id, null, transactionId, row.head_code, narration, debit, credit];
          db.run(
            `INSERT INTO transaction_details(location_id, transaction_details, v_id, coa_id, narration, debit, credit)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            values,
            (err) => {
              if (err) console.error("❌ Transaction detail insert error:", err.message);
            }
          );
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
