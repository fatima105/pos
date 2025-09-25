


const db = require("../db");

exports.getAllPurchase = (req, res) => {
  db.all(
    `
    SELECT 
        purchase.id, 
        purchase.invoice_no, 
        purchase.user_id, 
          purchase.supplier_id, 
        purchase.amount, 
        purchase.payment_status, 
        purchase.created_at,
        purchase.tax,
        purchase.tax_id,
        purchase.voucher_no, 
        supplier.name,
        purchase.purchase_date
    FROM 
        purchase
    INNER JOIN 
        supplier 
    ON 
        purchase.supplier_id = supplier.id
    WHERE 
        purchase.deleted_at IS NULL
        ORDER BY 
    purchase.id DESC;
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ Purchase: rows });
    }
  );
};

exports.getAllPurchaseProduct = (req, res) => {
const query = `
  SELECT 
    pch.*, 
    pd.*, 
    pr.name AS product_name,
    sup.name AS supplier_name
  FROM purchase pch
  INNER JOIN purchase_detail pd 
    ON pch.id = pd.purchase_id
  INNER JOIN product pr 
    ON pd.product_id = pr.id
  INNER JOIN supplier sup
    ON pch.supplier_id = sup.id
  WHERE pd.product_id = ?
`;

  const productId = req.body.product_id || 1; // fallback to 1 if not provided

  db.all(query, [productId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(200).json({ success: true, Purchase: rows });
  });
};

exports.getAllPurchaseDetail = (req, res) => {

  db.all(`
    SELECT 
     * from purchase_detail 
 
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ PurchaseDetails: rows });
  });
};
exports.getPurchaseDetailOne = (req, res) => {
  const purchaseId = req.params.id;

  const query = `
    SELECT 
      pd.*,
      pr.name AS product_name,
      pch.supplier_id,
      pch.purchase_date,
      psupp.name AS supplier_name,
      pd.barcode,
      pd.retail_price,
      pd.quantity AS available_quantity,
      pd.quantity,
      (
        SELECT SUM(quantity)
        FROM purchase_return_details sub
        WHERE sub.purchase_id = pd.purchase_id 
          AND sub.product_id = pd.product_id 
          AND (sub.soft_delete IS NULL OR sub.soft_delete = 0)
      ) AS total_returned_quantity,
      pch.voucher_no,
      pch.invoice_no
    FROM 
      purchase_detail pd
    LEFT JOIN 
      product pr ON pd.product_id = pr.id
    LEFT JOIN 
      purchase pch ON pch.id = pd.purchase_id
    LEFT JOIN 
      Supplier psupp ON pch.supplier_id = psupp.id
    WHERE 
      pd.purchase_id = ?
  `;

  db.all(query, [purchaseId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ PurchaseDetail: rows });
  });
};

exports.getAllPurchaseStock = (req, res) => {

  db.all(`
    SELECT 
     * from purchase_stocks ORDER BY ID DESC 
 
 
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ PurchaseStock: rows });
  });
};
exports.getOnePurchase = (req, res) => {
  const { id } = req.params;

const query = `
  SELECT 
    p.*, 
    s.name AS supplier_name,
    prod.name AS product_name,
    prod.SKU AS SKU,
    pd.quantity,
    pd.purchase_amount
  FROM purchase p
  JOIN supplier s ON s.id = p.supplier_id
  JOIN purchase_detail pd ON pd.purchase_id = p.id
  JOIN product prod ON prod.id = pd.product_id
  WHERE p.id = ?;
`;

  db.get(query, [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "Purchase not found" });
    res.json(row);
  });
};


exports.deletePurchase = (req, res) => {
  const { id } = req.params;
  const current_at = new Date().toISOString(); // Get the current time in ISO format



  db.run(
    "UPDATE purchase SET deleted_at = ?  WHERE id = ?",
    [current_at, id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0)
        return res.status(404).json({ error: "Purchase not found" });
      res.json({ message: "Purchase status updated successfully" });
    }
  );
};

exports.updatePurchase = (req, res) => {
  const now = new Date();
  const updated_at = now.toISOString();

  const {
    id,
    supplier_id,
    invoice_no,
    voucher_no,
    amount,
  
    payment_status,

  } = req.body;

  console.log("Incoming update Purchase request:", req.body);

  // Validate required fields
  const missingFields = {};
  if (!id) missingFields.id = id;
  if (!supplier_id) missingFields.supplier_id = supplier_id;
  if (!invoice_no) missingFields.invoice_no = invoice_no;
  if (!voucher_no) missingFields.voucher_no = voucher_no;
  if (!amount) missingFields.amount = amount;

  if (!payment_status) missingFields.payment_status = payment_status;
  if (!status) missingFields.status = status;

  if (Object.keys(missingFields).length > 0) {
    console.error("Missing required fields:", missingFields);
    return res.status(400).json({
      error: "Missing required fields",
      missing: missingFields,
    });
  }

  const sql = `
    UPDATE purchase SET
      supplier_id = ?,
      invoice_no = ?,
      voucher_no = ?,
      amount = ?,
      payment_status = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
  `;

  const values = [
    supplier_id,
    invoice_no,
    voucher_no,
    amount,
    payment_status,
    status,
    updated_at,
    id,
  ];

  db.run(sql, values, function (err) {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({
        error: "Database error",
        details: err.message,
      });
    }

    if (this.changes === 0) {
      console.warn("No Purchase updated. ID may not exist:", id);
      return res.status(404).json({
        error: "Purchase not found or no changes made",
      });
    }

    console.log("Purchase updated successfully. ID:", id);
    return res.status(200).json({
      message: "Purchase updated successfully",
      purchase_id: id,
    });
  });
};

exports.addPurchase = (req, res) => {
  const {
    supplier_id,
    invoice_no,
    voucher_no,
    barcode,
    purchase_date,
    amount_paid,
    amount,
    payment_status,
    deleted_at,
    updated_at,
    products,
  } = req.body;

  if (!supplier_id || !invoice_no || !voucher_no || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const now = new Date();
  const formattedNow = now.toISOString().slice(0, 19).replace('T', ' ');
  const user_id = 7;
  const location_id = 1;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
  
    const insertPurchaseSql = `INSERT INTO purchase (
      supplier_id, location_id, tax_id, invoice_no, voucher_no, purchase_date,
      amount, tax, payment_status, user_id, deleted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
    const purchaseValues = [
      supplier_id,
      location_id,
      null,
      invoice_no,
      voucher_no,
     purchase_date,
      amount,
      0,
      payment_status,
      user_id,
      deleted_at || null,
      now.toISOString(),
      updated_at || null,
    ];
  
    db.run(insertPurchaseSql, purchaseValues, function (err) {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: "Error inserting Purchase", details: err.message });
      }
  
      const purchaseId = this.lastID;
  
      const insertTransactionSql = `INSERT INTO "Transaction" (
        location_id, type, type_id, date, user_id, deleted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
      const transactionValues = [
        location_id, "Purchase", purchaseId, formattedNow,
        user_id, null, formattedNow, null
      ];
  
      db.run(insertTransactionSql, transactionValues, function (errTransaction) {
        if (errTransaction) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: "Failed to insert Transaction", details: errTransaction.message });
        }
  
        const transactionId = this.lastID;
  
        const insertDetailSql = `INSERT INTO purchase_detail (
          purchase_id, location_id, category_id, sub_category_id, product_id,
          tax_id, barcode, purchase_amount, quantity, tax_type, tax, retail_price,
          discount, net_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
        const insertStockSql = `INSERT INTO purchase_stocks (
          user_id, location_id, purchase_id, purchase_return_id, sale_id,
          sale_return_id, product_id, quantity, process, purchase_detail_id,
          sale_return_detail_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
        let insertErrors = [];
        let completed = 0;
  
        if (products.length === 0) {
          db.run("ROLLBACK");
          return res.status(400).json({ error: "Products array is empty" });
        }
  
        products.forEach((product, index) => {
          const { product_id, quantity, unit_price,discount } = product;
          const net_amount = quantity * unit_price;
  
          const purchaseDetailValues = [
            purchaseId, location_id, 0, 0, product_id,
            null, barcode, unit_price, quantity,
            0, 0, unit_price, discount, net_amount, now.toISOString()
          ];
  
          db.run(insertDetailSql, purchaseDetailValues, function (err2) {
            if (err2) {
              insertErrors.push({ index, error: err2.message, product_id });
              finalize();
            } else {
              const purchaseDetailId = this.lastID;
  
              const stockValues = [
                user_id, location_id, purchaseId, null, null,
                null, product_id, quantity, "purchase",
                purchaseDetailId, null, now.toISOString(), null
              ];
  
              db.run(insertStockSql, stockValues, function (err3) {
                if (err3) {
                  insertErrors.push({ index, error: err3.message, product_id, step: "stock insert" });
                }
                finalize();
              });
            }
          });
        });
  
        function finalize() {
          completed++;
          if (completed === products.length) {
            if (insertErrors.length > 0) {
              db.run("ROLLBACK");
              return res.status(500).json({
                error: "Failed inserting some purchase details or stocks",
                details: insertErrors,
              });
            }
            
            // Now process the accounting entries - no nested transaction
            const getInventoryHeadCodeSql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Inventory'`;
        
            db.get(getInventoryHeadCodeSql, function (err, inventoryRow) {
              if (err || !inventoryRow) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: "Inventory head_code error", details: err?.message || "Not found" });
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
                "Purchase Items",
                amount,
                0
              ];
        
              db.run(insertInventorySql, inventoryValues, function (errInventory) {
                if (errInventory) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: "Failed to insert inventory transaction", details: errInventory.message });
                }
        
                // FULLY UNPAID
                if (amount_paid === 0) {
                  const getSupplierHeadCodeSql = `SELECT head_code FROM chart_of_accounts WHERE supplier_id = ?`;
        
                  db.get(getSupplierHeadCodeSql, [supplier_id], function (errSupplier, supplierRow) {
                    if (errSupplier || !supplierRow) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: "Supplier head_code error", details: errSupplier?.message || "Not found" });
                    }
        
                    const supplierHeadCode = supplierRow.head_code;
                    const supplierCredit = [
                      location_id,
                      null,
                      transactionId,
                      supplierHeadCode,
                      "Purchase Items",
                      0,
                      amount
                    ];
        
                    db.run(insertInventorySql, supplierCredit, function (errCredit) {
                      if (errCredit) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: "Failed to insert supplier credit", details: errCredit.message });
                      }
        
                      db.run("COMMIT");
                      return res.status(201).json({ message: "Transaction successful", purchase_id: purchaseId, transaction_id: transactionId });
                    });
                  });
        
                }
                // FULLY PAID
                else if (amount_paid === amount) {
                  const getCashHeadCodeSql = `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Cash In Hand'`;
        
                  db.get(getCashHeadCodeSql, function (errCash, cashRow) {
                    if (errCash || !cashRow) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: "Cash head_code error", details: errCash?.message || "Not found" });
                    }
        
                    const cashHeadCode = cashRow.head_code;
                    const cashCredit = [
                      location_id,
                      null,
                      transactionId,
                      cashHeadCode,
                      "Purchase Items",
                      0,
                      amount
                    ];
        
                    db.run(insertInventorySql, cashCredit, function (errCredit) {
                      if (errCredit) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: "Failed to insert cash credit", details: errCredit.message });
                      }
        
                      db.run("COMMIT");
                      return res.status(201).json({ message: "Transaction successful", purchase_id: purchaseId, transaction_id: transactionId });
                    });
                  });
        
                }
                // PARTIALLY PAID
                else {
                  const getSupplierAndCashSql = `
                  SELECT head_code, supplier_id, head_name 
                  FROM chart_of_accounts 
                  WHERE (supplier_id = ? OR head_name = 'Cash In Hand')
                `;
                
                db.all(getSupplierAndCashSql, [supplier_id], function (errBoth, rows) {
                  if (errBoth || !rows || rows.length < 2) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: "Failed to retrieve cash/supplier head codes", details: errBoth?.message || "Missing head codes" });
                  }
                
                  console.log("All rows returned:", rows); // Log all rows to see what's coming back
                
                  const cashRow = rows.find(r => r.head_name === 'Cash In Hand');
                  
                  // Convert supplier_id to string for comparison if needed
                  const supplierIdStr = String(supplier_id);
                  // Try both direct comparison and string comparison
                  const supplierRow = rows.find(r => 
                    r.supplier_id === supplier_id || 
                    String(r.supplier_id) === supplierIdStr
                  );
                  
                  console.log("Supplier ID from request:", supplier_id, "Type:", typeof supplier_id);
                  console.log("Supplier Row:", supplierRow);
                
                  if (!cashRow || !supplierRow) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: "Incomplete head code data" });
                  }
                
                  const cashCredit = [
                    location_id,
                    null,
                    transactionId,
                    cashRow.head_code,
                    "Purchase Items",
                    0,
                    amount_paid
                  ];
                  
                  console.log("Supplier Info:", {
                    supplier_id: supplier_id,
                    head_code: supplierRow.head_code,
                    typeof_db_supplier_id: typeof supplierRow.supplier_id
                  });
                  
                  const supplierCredit = [
                    location_id,
                    null,
                    transactionId,
                    supplierRow.head_code,
                    "Purchase Items",
                    0,
                    amount - amount_paid
                  ];
                
                  db.run(insertInventorySql, cashCredit, function (errCashCredit) {
                    if (errCashCredit) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: "Failed to insert cash credit", details: errCashCredit.message });
                    }
                
                    db.run(insertInventorySql, supplierCredit, function (errSupplierCredit) {
                      if (errSupplierCredit) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: "Failed to insert supplier credit", details: errSupplierCredit.message });
                      }
                
                      db.run("COMMIT");
                      return res.status(201).json({ message: "Transaction successful", purchase_id: purchaseId, transaction_id: transactionId });
                    });
                  });
                });
                }
              });
            });
          }
        }
      });
    });
  });
};








