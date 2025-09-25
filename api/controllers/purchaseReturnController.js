
const db = require('../db'); // Ensure this is your correct DB file path
exports.addPurchaseReturn = (req, res) => {
  const {
    purchase_id,
    location_id,
    invoice_no,
    supplier_id,
    voucher_no,
    purchase_date,
    return_date,
    amount,
    narration,
    user_id,
    products = []
  } = req.body;
console.log(supplier_id);
  const created_at = new Date().toISOString();
  const updated_at = created_at;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      message: "❌ No valid products provided for purchase return."
    });
  }

  const insertReturnQuery = `
    INSERT INTO purchase_return (
      purchase_id, supplier_id, invoice_no, voucher_no, purchase_date,
      return_date, user_id, narration, amount, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    insertReturnQuery,
    [
      purchase_id, supplier_id, invoice_no, voucher_no,
      purchase_date, return_date, user_id, narration, amount, created_at
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "❌ Failed to add purchase return",
          detail: err.message
        });
      }

      const returnId = this.lastID;

      const insertDetailQuery = `
        INSERT INTO purchase_return_details (
          location_id, purchase_id, purchase_return_id,
          product_id, purchase_amount, quantity, net_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const insertStockQuery = `
        INSERT INTO purchase_stocks (
          user_id, location_id, purchase_id, purchase_return_id,
          product_id, quantity, process, purchase_detail_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const detailInsertPromises = products.map(product => {
        return new Promise((resolve, reject) => {
          if (
            !product.product_id ||
            typeof product.price !== 'number' ||
            typeof product.qty !== 'number'
          ) {
            return reject(new Error("Invalid product format: " + JSON.stringify(product)));
          }

          const netAmount = product.qty * product.price;

          db.run(
            insertDetailQuery,
            [
              location_id, purchase_id, returnId,
              product.product_id, product.price, product.qty, netAmount
            ],
            function (err) {
              if (err) return reject(new Error("Detail Insert Failed: " + err.message));

              const purchaseDetailId = this.lastID;

              db.run(
                insertStockQuery,
                [
                  user_id, location_id, purchase_id, returnId,
                  product.product_id,-Math.abs(product.qty), 'purchase_return',
                  purchaseDetailId, created_at
                ],
                err => {
                  if (err) return reject(new Error("Stock Insert Failed: " + err.message));
                  resolve();
                }
              );
            }
          );
        });
      });

      Promise.all(detailInsertPromises)
        .then(() => {
          const insertTransactionQuery = `
            INSERT INTO "Transaction" (
              location_id, type, type_id, date, user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(
            insertTransactionQuery,
            [
              location_id,
              'purchase_return',
              returnId,
              return_date,
              user_id,
              created_at,
              updated_at
            ],
            function (err) {
              if (err) {
                return res.status(500).json({
                  success: false,
                  message: "⚠️ Purchase return added but failed to insert transaction record.",
                  purchase_return_id: returnId,
                  detail: err.message
                });
              }

              const transactionId = this.lastID;

              // Get Inventory Head Code
              const getInventoryHeadCodeSql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Inventory'`;

              db.get(getInventoryHeadCodeSql, (err, inventoryRow) => {
                if (err || !inventoryRow) {
                  return res.status(500).json({
                    success: false,
                    message: "⚠️ Inventory head_code fetch failed.",
                    detail: err?.message || "Inventory head not found"
                  });
                }

                const inventoryHeadCode = inventoryRow.head_code;

                const insertInventorySql = `
                  INSERT INTO transaction_details (
                    location_id, transaction_details, v_id, coa_id, narration, debit, credit
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                const inventoryValues = [
                  location_id,
                  null,
                  transactionId,
                  inventoryHeadCode,
                  "Inventory",
                  0,
                  amount
                ];

                db.run(insertInventorySql, inventoryValues, function (errInventory) {
                  if (errInventory) {
                    return res.status(500).json({
                      success: false,
                      message: "❌ Failed to insert inventory transaction",
                      detail: errInventory.message
                    });
                  }

                  // Get Supplier COA
                  const getSupplierHeadCodeSql = `SELECT head_code FROM chart_of_accounts WHERE supplier_id = ?`;

                  db.get(getSupplierHeadCodeSql, [supplier_id], function (errSupplier, supplierRow) {
                    if (errSupplier || !supplierRow) {
                      return res.status(500).json({
                        success: false,
                        message: "❌ Supplier head_code error",
                        detail: errSupplier?.message || "Supplier not found"
                      });
                    }

                    const supplierHeadCode = supplierRow.head_code;

                    const insertSupplierTransactionSql = `
                      INSERT INTO transaction_details (
                        location_id, transaction_details, v_id, coa_id, narration, debit, credit
                      ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;

                    const supplierTransactionValues = [
                      location_id,
                      null,
                      transactionId,
                      supplierHeadCode,
                      "Purchase Return",
                      amount,
                      0
                    ];

                    db.run(insertSupplierTransactionSql, supplierTransactionValues, function (errSupplierTxn) {
                      if (errSupplierTxn) {
                        return res.status(500).json({
                          success: false,
                          message: "❌ Failed to insert supplier transaction",
                          detail: errSupplierTxn.message
                        });
                      }

                      return res.status(200).json({
                        success: true,
                        message: "✅ Purchase return, details, stock, transaction, and financial entries added successfully.",
                        purchase_return_id: returnId,
                        transaction_id: transactionId
                      });
                    });
                  });
                });
              });
            }
          );
        })
        .catch(error => {
          res.status(500).json({
            success: false,
            message: "❌ Failed to add purchase return details or stock.",
            purchase_return_id: returnId,
            detail: error.message
          });
        });
    }
  );
};





// 2. Get All Purchase Returns
exports.getAllPurchaseReturns = (req, res) => {
  const query = `
    SELECT 
      pr.*,
      s.name AS supplier_name
    FROM purchase_return pr
    LEFT JOIN supplier s ON pr.supplier_id = s.id
    ORDER BY pr.id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to fetch purchase returns',
        detail: err.message
      });
    }
    res.status(200).json({purchaseReturn:rows});
  });
};

exports.getcountdashboard = (req, res) => {
  const counts = {};

  // Count Products
  db.get(`SELECT COUNT(*) as count FROM Product`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    counts.products = row.count;

    // Sum Debit - Credit for coa_id = '10013000001'
    db.get(
      `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS balance 
       FROM transaction_details 
       WHERE coa_id = "10013000001"`,
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        counts.purchase_stock_range = row.balance;

        // Count Customers
        db.get(`SELECT COUNT(*) as count FROM customer`, (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          counts.customers = row.count;

          // Count Suppliers
          db.get(`SELECT COUNT(*) as count FROM Supplier`, (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            counts.suppliers = row.count;

            // ✅ Send final response only when all queries finished
            res.json(counts);
          });
        });
      }
    );
  });
};


// 3. Get All Purchase Return Details
exports.getAllPurchaseReturnDetails = (req, res) => {
  const query = `
    SELECT * FROM purchase_return_details
    ORDER BY id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to fetch purchase return details',
        detail: err.message
      });
    }
    res.status(200).json(rows);
  });
};
exports.getAllPurchaseReturnSpecificDetails = (req, res) => {
  const id = req.body.id;

const query = `
  SELECT 
    prd.*, 
    pch.*,
    sup.name AS supplier_name,
    pd.quantity AS available_quantity,
    p.name AS product_name,
    (
      SELECT SUM(quantity)
      FROM purchase_return_details sub
      WHERE sub.purchase_id = prd.purchase_id 
        AND sub.product_id = prd.product_id 
        AND (sub.soft_delete IS NULL OR sub.soft_delete = 0)
    ) AS total_returned_quantity
  FROM purchase_return_details prd
  INNER JOIN purchase_return pch 
    ON prd.purchase_return_id = pch.id
  INNER JOIN product p 
    ON prd.product_id = p.id
  INNER JOIN supplier sup
    ON sup.id = pch.supplier_id
  INNER JOIN purchase_detail pd
    ON prd.purchase_id = pd.purchase_id AND prd.product_id = pd.product_id
  WHERE prd.purchase_return_id = ?
`;

  db.all(query, [id], (err, row) => {
    if (err) {
      console.error("❌ Failed to fetch purchase return details:", err.message);
      return res.status(500).json({
        success: false,
        message: "❌ Failed to fetch purchase return detail",
        error: err.message
      });
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "❌ No record found with this ID."
      });
    }

    res.status(200).json({
      success: true,
      data: row
    });
  });
};
