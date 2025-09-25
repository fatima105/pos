const db = require('../db');

exports.addOrders = (req, res) => {
  const {
    user_id,
    location_id,
    product_id,
    purchase_id,
    sale_id,
    sale_detail_id,
    retail,
    quantity,
    tax_type,
    tax,
    discount,
    net_amount
  } = req.body;

  const created_at = new Date().toISOString();
const today = new Date();
const currentDate = today.toISOString().slice(0, 10);

console.log(currentDate);
      const insertQuery = `
        INSERT INTO orders (
          user_id,
          location_id,
          product_id,
          purchase_id,
          sale_id,
          sale_detail_id,
          retail,
          quantity,
          tax_type,
          tax,
          discount,
          net_amount,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        user_id,
        location_id,
        product_id,
        purchase_id,
        sale_id,
        sale_detail_id,
        retail,
        quantity,
        tax_type,
        tax,
        discount,
        net_amount,
        created_at
      ];

      db.run(insertQuery, params, function (err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'Order Successfully Created' });
      });
 
    }

exports.checkStock = (req, res) => {
  const { product_id, quantity } = req.body;

  const checkQuery = `SELECT SUM(quantity) AS total FROM purchase_stocks WHERE product_id = ?`;
  db.get(checkQuery, [product_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const availableStock = row.total || 0;

    if (availableStock >= quantity) {
      res.status(200).json({ status: true, available: availableStock });
    } else {
      res.status(200).json({ status: false, available: availableStock, message: "Product out of stock" });
    }
  });
};
exports.getDiscount = (req, res) => {
    db.all('SELECT * from Sale_Discount', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ Sale_Discount: rows,status:"true" });
    });
};
exports.AddPurchaseStock = (req, res) => {
  let{ paymentToInput} =req.body;
  const { sessionId, products, user_id, customer, amount, paymentProfitAmount } = req.body;
console.log("Customer",customer);

let   TotalDiscount=0;
    products.forEach(item => {

    const discount = parseFloat(item.discount) || 0;

  if (discount > 0) {
    TotalDiscount += discount;
  }
});
console.log("paymenttOINPUT",paymentToInput);
db.get(`SELECT name FROM Customer WHERE id = ?`, [customer], (err, row) => {
  if (err) {
    console.error("❌ Query failed:", err.message);
    return;
  }
  
  if (row) {
    if(row.name=='Walk-in'){
      paymentToInput= amount;
      console.log("changed",paymentToInput);
    }
    console.log("🧑‍💼 Customer Name:", row.name);
  } else {
    console.log("⚠️ No customer found with that ID");
  }
});
  const today = new Date();
  const currentDate = today.toISOString().slice(0, 10);
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    try {
      // 1. Update draft order status
      db.run(
        `UPDATE draft_orders SET status = 'completed' WHERE order_session = ? AND status != 'completed'`,
        [sessionId]
      );



// ✅ Query for stock check with purchase_detail
const stockSql = `
  SELECT 
    ps.purchase_detail_id,
    pd.purchase_id,
    SUM(ps.quantity) AS totalQty, 
    pd.purchase_amount AS amount,   -- alias as 'amount'
    pd.created_at
  FROM purchase_stocks ps
  LEFT JOIN purchase_detail pd 
    ON ps.purchase_detail_id = pd.id
  WHERE ps.product_id = ?
  GROUP BY ps.purchase_detail_id
  HAVING totalQty > 0
  ORDER BY pd.created_at DESC   -- latest shipment first
`;
let total_cost_of_all_products = 0;

// Loop through each product from user array
products.forEach((product, idx) => {
  const userQty = Number(product.quantity);
  console.log(`\n🛒 Product #${idx + 1} | ID: ${product.product_id} | Requested Qty: ${userQty}`);

  // Run the same stockSql for each product
  db.all(stockSql, [product.product_id], (err, rows) => {
    if (err) {
      console.error("❌ Stock Query Failed:", err.message);
      return;
    }

    console.log("📊 Stock by Purchase Detail with Amount (latest first):");
    rows.forEach(r => {
      console.log(
        `purchase_detail_id: ${r.purchase_detail_id}\t totalQty: ${r.totalQty}\t amount: ${r.amount}\t created_at: ${r.created_at}\t purchase_id: ${r.purchase_id}`
      );
    });

    // ✅ Your original latest shipment log (unchanged)
    if (rows.length > 0) {
      const latest = rows[0];
      console.log("🚚 Latest Shipment to Pick From:");
      console.log(
        `purchase_detail_id: ${latest.purchase_detail_id}\t totalQty: ${latest.totalQty}\t amount: ${latest.amount}\t created_at: ${latest.created_at}\t purchase_id: ${latest.purchase_id}`
      );
    } else {
      console.log("⚠️ No stock available for this product.");
    }

    // ✅ Extra: cost calculation (does not change your logging logic above)
    let remainingQty = userQty;

    rows.forEach(r => {
      if (remainingQty <= 0) return;

      const available = r.totalQty;
      const unitCost = r.amount;

      let takenQty = 0;
      if (available >= remainingQty) {
        takenQty = remainingQty;
        remainingQty = 0;
      } else {
        takenQty = available;
        remainingQty -= available;
      }

      const cost = takenQty * unitCost;
      total_cost_of_all_products += cost;

      console.log(
        `💲 CostCalc => purchase_detail_id: ${r.purchase_detail_id}\t available: ${available}\t taken: ${takenQty}\t unitCost: ${unitCost}\t cost: ${cost}`
      );
    });

    if (remainingQty > 0) {
      console.log(`⚠️ Not enough stock, still need ${remainingQty} units.`);
    }

    console.log(`💰 Total Cost so far (including this product): ${total_cost_of_all_products}`);
  });
});

// 🚀 Final total after async queries finish
setTimeout(() => {
  console.log("\n✅ Final Global Total Cost of ALL Products:", total_cost_of_all_products);
}, 9000);




      // 2. Insert Sale
      const insertSaleSql = `
        INSERT INTO sale (
          customer_id, location_id, invoice_no, sale_date, amount,
          discount, payment_status, user_id, fbr_invoice, deleted_at, created_at, updated_at
        ) VALUES (?, 1, NULL, ?, ?, 0, 1, ?, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      db.run(insertSaleSql, [customer, currentDate, amount, user_id], function (err) {
        if (err) throw new Error("Insert Sale Failed: " + err.message);

        const saleId = this.lastID;
        const invoiceNo = `SV-${month}-${year}-${saleId}`;



              if(TotalDiscount>0){
const insertDiscount = `
  INSERT INTO Sale_Discount (sale_id, remarks, amount, created_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
`;
db.run(insertDiscount, [saleId, 'Discount Applied on Sales', TotalDiscount], (err) => {
  if (err) throw new Error("Insert Discount Failed: " + err.message);
});
        }
        // 3. Insert Transaction
        const insertTransSql = `
          INSERT INTO "transaction"(location_id, type, type_id, date, user_id, created_at, updated_at)
          VALUES (1, 'Sale', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        db.run(insertTransSql, [saleId, currentDate, user_id], function (err) {
          if (err) throw new Error("Insert Transaction Failed: " + err.message);

          const transactionId = this.lastID;

          // === ACCOUNTING ENTRIES ===
          const amountInventory =  total_cost_of_all_products;

const cleanedAmount = amount.replace(/,/g, ""); // removes commas
const numericAmount = parseFloat(cleanedAmount); // convert to number

console.log("AMOUNT", amount);
console.log("CLEANED", cleanedAmount);
console.log("NUMERIC", numericAmount);

const cleanedPaymentToInput = paymentToInput.replace(/,/g, ""); // removes commas
const numericPaymentToInput = parseFloat(cleanedPaymentToInput); // convert to number

console.log("PAYMENT INPUT (raw):", paymentToInput);
console.log("CLEANED PAYMENT INPUT:", cleanedPaymentToInput);
console.log("NUMERIC PAYMENT INPUT:", numericPaymentToInput);

const total_profit = numericAmount - total_cost_of_all_products;
console.log("totalPROFIT", total_profit);
          // Inventory Cr
          addTransactionDetail(transactionId, "Inventory", "Inventory Reduction", 0, amountInventory);

          // Revenue Cr
    
              addTransactionDetail(transactionId, "Revenue", "Revenue on Sale", 0,  total_profit);
     
          if (numericPaymentToInput === numericAmount) {
            // FULL CASH
            addTransactionDetail(transactionId, "Cash In Hand", "Cash Sale", numericAmount, 0);
          } else if (numericPaymentToInput === 0) {
            // FULL CREDIT
            addTransactionDetail(transactionId, customer, "Credit -- Sale", numericAmount, 0, true);
          } else {
            // PARTIAL PAYMENT
            addTransactionDetail(transactionId, "Cash In Hand", "Cash Received",numericPaymentToInput, 0);
            addTransactionDetail(transactionId, customer, "Receivable Balance",numericAmount - numericPaymentToInput, 0, true);
          }
                   if(TotalDiscount>0){
                    
            addTransactionDetail(transactionId, "Expenses","Discount Applied ", TotalDiscount, 0);
    }

          // 4. Update Sale Invoice No
          db.run("UPDATE sale SET invoice_no=? WHERE id=?", [invoiceNo, saleId]);

          // 5. Insert Sale Details + Stock
          insertSaleDetailAndStock(saleId, products, user_id)
            .then((stockIds) => {
              db.run("COMMIT");
              return res.status(201).json({
                message: "Sale Recorded Successfully",
                saleId,
                transactionId,
                invoiceNo,
                stockIds,
              });
            })
            .catch((err) => {
              db.run("ROLLBACK");
              return res.status(500).json({ error: "Stock/Sale detail failed", details: err });
            });
        });
      });
    } catch (err) {
      db.run("ROLLBACK");
      return res.status(500).json({ error: err.message });
    }
  });

  // === Helper Functions ===
  function addTransactionDetail(transactionId, account, narration, debit, credit, isCustomer = false) {
    let sql = `SELECT head_code FROM chart_of_accounts WHERE head_name=? LIMIT 1`;
    let param = [account];
    if (isCustomer) {
      sql = `SELECT head_code FROM chart_of_accounts WHERE customer_id=? LIMIT 1`;
      param = [account];
    }

    db.get(sql, param, (err, row) => {
      if (err || !row) throw new Error("Head Code not found for " + account);
      const values = [1, null, transactionId, row.head_code, narration, debit, credit];
      db.run(
        `INSERT INTO transaction_details(location_id, transaction_details, v_id, coa_id, narration, debit, credit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        values
      );
    });
  }
function insertSaleDetailAndStock(saleId, products, user_id) {
  // returns Promise that resolves to an array describing inserted stock rows per product
  return Promise.all(products.map((p) => {
    return new Promise((resolve, reject) => {
      let TotalUserQuantity=Number(p.quantity);
      const product_id = Number(p.product_id);
      console.log("UserQuantity," ,p.quantity);
      let qtyRemaining = Number(p.quantity);

      const price = Number(p.price);
let ProductWiseDiscount=p.discount;
      console.log("ARRAY PRODUCTS",products,p.discount)
      if (!product_id || qtyRemaining <= 0) {
        return reject(`Invalid product or quantity for product_id=${product_id}`);
      }

      // 1) Fetch product info
      db.get(
        `SELECT category_id, sub_category_id FROM Product WHERE id = ? LIMIT 1`,
        [product_id],
        (err, prodRow) => {
          if (err) return reject("DB error fetching product: " + err.message);
          if (!prodRow) return reject(`Product not found: ${product_id}`);

          // 2) Fetch stock by purchase_detail (latest first)
          const stockSql = `
            SELECT
              pd.id AS purchase_detail_id,
              pd.purchase_id,
              IFNULL(SUM(ps.quantity), 0) AS totalQty,
              pd.purchase_amount AS amount,
              pd.created_at
            FROM purchase_detail pd
            LEFT JOIN purchase_stocks ps
              ON ps.purchase_detail_id = pd.id AND ps.product_id = ?
            WHERE pd.product_id = ?
            GROUP BY pd.id
            HAVING totalQty > 0
            ORDER BY pd.created_at DESC
          `;

          db.all(stockSql, [product_id, product_id], (err2, rows) => {
            if (err2) return reject("Stock query failed: " + err2.message);
            if (!rows || rows.length === 0) {
              return reject(`No stock available for product ${product_id}`);
            }

            const insertedStocks = []; // track stock + sale detail rows

            (function processRow(index) {
              if (qtyRemaining <= 0) {
                // all qty covered
                return resolve({ product_id, insertedStocks });
              }
              if (index >= rows.length) {
                // ran out of shipments
                return reject(`Not enough stock for product ${product_id}. Missing: ${qtyRemaining}`);
              }

              const r = rows[index];
              const available = Number(r.totalQty);
              if (available <= 0) {
                return processRow(index + 1);
              }

              const deductQty = Math.min(qtyRemaining, available);
              console.log("check",deductQty);
              const netAmount = deductQty * price;
let change=(ProductWiseDiscount/TotalUserQuantity)*deductQty;
console.log(change);
              // 3a) Insert into sale_details (now with purchase_id)
              db.run(
                `INSERT INTO sale_details (
                   sale_id, location_id, sub_category_id, category_id,
                   product_id, retail, quantity,discount,net_amount, purchase_id,
                   created_at, updated_at
                 ) VALUES (?, 1, ?, ?, ?, ?, ?, ?,?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [saleId, prodRow.sub_category_id, prodRow.category_id,
                 product_id, price, deductQty,change, netAmount, r.purchase_id],
                function (err3) {
                  if (err3) return reject("Insert sale_details failed: " + err3.message);
                  const saleDetailId = this.lastID;

                  // 3b) Insert into purchase_stocks (negative qty for sale)
                  db.run(
                    `INSERT INTO purchase_stocks (
                       user_id, location_id, sale_id, product_id,
                       purchase_detail_id,sale_detail_id, quantity, process, created_at, updated_at
                     ) VALUES (?, 1, ?, ?, ?,?, ?, 'sale', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [user_id, saleId, product_id, r.purchase_detail_id,saleDetailId, -deductQty],
                    function (err4) {
                      if (err4) return reject("Insert purchase_stocks failed: " + err4.message);

                      insertedStocks.push({
                        purchase_stock_id: this.lastID,
                        purchase_detail_id: r.purchase_detail_id,
                        purchase_id: r.purchase_id,
                        sale_detail_id: saleDetailId,
                        deductedQty: deductQty
                      });

                      qtyRemaining -= deductQty;
                      processRow(index + 1); // go next
                    }
                  );
                }
              );
            })(0);
          });
        }
      );
    });
  }));
}


};

exports.Delete = (req, res) => {
  const session = req.body.order_session;

  if (!session) {
    return res.status(400).json({ success: false, message: "order_session is required" });
  }

  const sql = `DELETE FROM draft_orders WHERE order_session = ?`;
  db.run(sql, [session], function (err) {
    if (err) {
      console.error("❌ DB error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({
      success: true,
      message: `Deleted ${this.changes} draft(s) with session: ${session}`
    });
  });
};
exports.DeleteAll = (req, res) => {
  const sql = `DELETE FROM draft_orders`;

  db.run(sql, function (err) {
    if (err) {
      console.error("❌ DB error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({
      success: true,
      message: `All draft orders deleted successfully.`,
      deletedRows: this.changes // shows how many rows were deleted
    });
  });
};

exports.insertDraftOrders = (req, res) => {
  const { user_id, location_id, products, status,draft_name } = req.body;
  console.log("hi"+draft_name);
  const created_at = new Date().toISOString();

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "Products must be a non-empty array." });
  }

  const order_session = `${Date.now()}`; // to group all products together
  const insertQuery = `
    INSERT INTO draft_orders (
      order_session,
      user_id,
      location_id,
      product_id,
      unit_name,
      quantity,
      retail,
      discount,
      status,
      created_at,
      draft_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
  `;

  const stmt = db.prepare(insertQuery);

  try {
    for (const product of products) {
      stmt.run(
        order_session,
        user_id,
        location_id,
        product.product_id,
        product.unit_name || 'N/A',
        product.quantity,
        product.retail,
        product.discount,
        status || 'draft',
        created_at,
        draft_name
      );
    }

    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Draft orders inserted successfully.' });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.GetAllDrafts = (req, res) => { 
  const selectQuery = `
    SELECT draft_orders.*, Product.name AS product_name 
    FROM draft_orders
    INNER JOIN Product ON draft_orders.product_id = Product.id
    WHERE draft_orders.status = 'draft'
  `;

  db.all(selectQuery, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(200).json({ drafts: rows });
  });
};
exports.GetOneDraftsBySession = (req, res) => {
  const { order_session } = req.body; // or req.query if using GET

  const selectQuery = `
    SELECT draft_orders.*, Product.name AS product_name 
    FROM draft_orders
    INNER JOIN Product ON draft_orders.product_id = Product.id
    WHERE draft_orders.order_session = ?
  `;

  db.all(selectQuery, [order_session], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(200).json({ drafts: rows });
  });
};




exports.UpdateDraft = (req, res) => {
  const { order_session } = req.body;

  if (!order_session) {
    return res.status(400).json({ error: "order_session is required." });
  }

  const updateQuery = `
    UPDATE draft_orders 
    SET status = 'completed'
    WHERE order_session = ?
  `;

  db.run(updateQuery, [order_session], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // 'this.changes' gives number of rows affected
    return res.status(200).json({ message: "Draft updated successfully", affectedRows: this.changes });
  });
};

