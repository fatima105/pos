const db = require('../db');
const axios = require("axios");


const BASEURL = "https://stagging-alimart.mk-teknology.com/api/";

exports.SyncData = async (req, res) => {
  console.log("🔄 Sync started...");
  try {
    // ========== STEP 1: LOGIN ==========
    const loginResponse = await axios.post(`${BASEURL}user/login`, {
      email: "api@gmail.com",
      password: "123456",
    });

    const token = loginResponse.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log("✅ Token fetched:", token);

    // Helper for safe table sync
    const safeSync = async (table, fn) => {
      try {
        await fn();
        console.log(`✅ ${table} synced successfully!`);
      } catch (err) {
        console.error(`❌ Failed to sync ${table}:`, err.message);
      }
    };


    await safeSync("Transaction_details", async () => {
  const { data } = await axios.get(`${BASEURL}fetch-transaction-detail`, { headers });

  const stmt = db.prepare(`
    INSERT INTO Transaction_details (
      id,
      location_id,
      transaction_details,
      v_id,
      coa_id,
      narration,
      debit,
      credit,
      soft_delete
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of data) {
    stmt.run(
      t.id,
      t.location_id || 0,
      t.transaction_details,
      t.v_id,
      t.coa_id,
      t.narration,
      t.debit,
      t.credit,
      t.soft_delete
    );
  }

  stmt.finalize();
});
await safeSync("cash_received_details", async () => {
  const { data } = await axios.get(`${BASEURL}fetch-cr-detial`, { headers });

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO cash_received_details (
      id, location_id, cash_received_id, customer_id,
      remarks, amount, deleted_at, created_at,
      updated_at, soft_delete
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of data) {
    stmt.run(
      t.id,
      t.location_id ?? null,
      t.cash_received_id,
      t.customer_id,
      t.remarks,
      t.amount,
      t.deleted_at,
      t.created_at,
      t.updated_at,
      0
    );
  }

  stmt.finalize();
});




  await safeSync("Cash Payment Details", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-cp-detail`, { headers });
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO cash_payment_details (
          id, location_id, cash_payment_id, supplier_id, remarks,
          amount, deleted_at, created_at, updated_at, soft_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of data) {
        stmt.run(
          d.id, d.location_id ?? null, d.cash_payment_id, d.supplier_id,
          d.remarks ?? "", d.amount ?? 0, d.deleted_at, d.created_at,
          d.updated_at, d.soft_delete ?? 0
        );
      }
      stmt.finalize();
      return data.length;
    });
await safeSync("cash_received", async () => {
  const { data } = await axios.get(`${BASEURL}fetch-cr`, { headers });

  const stmt = db.prepare(`
    INSERT INTO cash_received (
      id,
      voucher_no,
      date,
      received_in,
      location_id,
      user_id,
      amount,
      deleted_at,
      created_at,
      updated_at,
      soft_delete
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of data) {
    stmt.run(
      t.id,
      t.voucher_no,
      t.date,
      t.received_in,
      t.location_id,
      t.user_id,
      t.amount,
      t.deleted_at,
      t.created_at,
      t.updated_at,
      0 // soft_delete default to 0 since not in response
    );
  }

  stmt.finalize();
});




    // ========== UNITS ==========
    await safeSync("Unit", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-unit`, { headers });
      const stmt = db.prepare(`
        INSERT INTO Unit (id, name, status, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const u of data) {
        stmt.run(u.id, u.unit, u.status, u.created_at, u.updated_at, u.deleted_at);
      }
      stmt.finalize();
    });

    // ========== SUPPLIERS ==========
    await safeSync("Supplier", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-supplier`, { headers });
      const stmt = db.prepare(`
        INSERT INTO Supplier (
          id, location_id, code, company, name, email, contact,
          cnic, city, city_area, coa_id, status, deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of data) {
        stmt.run(
          s.id, s.location_id, s.code, s.company, s.name, s.email, s.contact,
          s.cnic, s.city, s.city_area ?? "", s.coa_id ?? "", s.status,
          s.deleted_at, s.created_at, s.updated_at
        );
      }
      stmt.finalize();
    });

    // ========== CUSTOMERS ==========
    await safeSync("Customer", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-customer`, { headers });
      const stmt = db.prepare(`
        INSERT INTO customer (
          id, name, company, cnic, mobile, email, land_line, city,
          status, credit_limit, deleted_at, created_at, updated_at, soft_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of data) {
        stmt.run(
          c.id, c.name, c.company_name ?? "", c.cnic, c.mobile, c.email,
          c.land_line ?? "", c.city, c.status ?? "1", c.limit ?? "0",
          c.deleted_at, c.created_at, c.updated_at, null
        );
      }
      stmt.finalize();
    });

    // ========== CHART OF ACCOUNTS ==========
    await safeSync("Chart of Accounts", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-coa`, { headers });
      const stmt = db.prepare(`
        INSERT INTO chart_of_accounts (
          id, head_code, location_id, head_name, parent_id,
          level, supplier_id, customer_id, deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of data) {
        stmt.run(
          c.id, c.head_code ?? "", c.location_id ?? "", c.head_name ?? "",
          c.parent_id ?? "", c.level ?? "", c.supplier_id ?? null,
          c.customer_id ?? null, c.deleted_at, c.created_at, c.updated_at
        );
      }
      stmt.finalize();
    });

    // ========== PRODUCT ==========
    await safeSync("Product", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-product`, { headers });
      const stmt = db.prepare(`
        INSERT INTO Product (
          id, category_id, sub_category_id, Unit, name,
          description, SKU, tax, retail_price, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of data) {
        stmt.run(
          p.id, p.category_id, p.sub_category_id, p.unit_id,
          p.name, p.description ?? "", p.sku ?? "", p.tax_type ?? 0,
          p.retail_price ?? 0, p.status ?? 1
        );
      }
      stmt.finalize();
    });

    // ========== PURCHASE ==========
    await safeSync("Purchase", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-purchase`, { headers });
      const stmt = db.prepare(`
        INSERT INTO purchase (
          id, supplier_id, location_id, tax_id, invoice_no, voucher_no,
          purchase_date, amount, tax, payment_status, user_id,
          deleted_at, created_at, updated_at, soft_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of data) {
        stmt.run(
          p.id, p.supplier_id, p.location_id, p.tax_id, p.invoice_no,
          p.voucher_no, p.purchase_date, p.amount, p.tax,
          p.payment_status, p.user_id, p.deleted_at,
          p.created_at, p.updated_at, 0
        );
      }
      stmt.finalize();
    });



    // ✅ Category Sync
await safeSync("Category", async () => {
  const { data } = await axios.get(`${BASEURL}fetch-category`, { headers });

  const stmt = db.prepare(`
    INSERT INTO Category (
      id, name, description, status,
      created_at, updated_at, deleted_at
    ) VALUES (?, ?,  ?, ?, ?, ?, ?)
  `);

  for (const c of data) {
    stmt.run(
      c.id,
    
      c.name ?? "",
      c.description ?? "",
      c.status ?? 1,
      c.created_at ?? "",
      c.updated_at ?? "",
      c.deleted_at ?? null
    );
  }

  stmt.finalize();
});

// ✅ SubCategory Sync
await safeSync("SubCategory", async () => {
  const { data } = await axios.get(`${BASEURL}fetch-subCategory`, { headers });

  const stmt = db.prepare(`
    INSERT INTO SubCategory (
      id, category_id, name, description, status,
      created_at, updated_at, deleted_at
    ) VALUES (?,  ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of data) {
    stmt.run(
      s.id,
  
      s.category_id ?? null,
      s.name ?? "",
      s.description ?? "",
      s.status ?? 1,
      s.created_at ?? "",
      s.updated_at ?? "",
      s.deleted_at ?? null
    );
  }

  stmt.finalize();
});

    // ========== PURCHASE DETAIL ==========
    await safeSync("Purchase Detail", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-purchase-detail`, { headers });
      const stmt = db.prepare(`
        INSERT INTO purchase_detail (
          id, purchase_id, location_id, category_id, sub_category_id,
          product_id, tax_id, barcode, purchase_amount, quantity,
          tax_type, tax, retail_price, discount, net_amount,
          deleted_at, created_at, updated_at, soft_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of data) {
        stmt.run(
          d.id, d.purchase_id, d.location_id ?? 0, d.category_id, d.sub_category_id,
          d.product_id, d.tax_id, d.barcode, d.purcahse_amount ?? 0, d.quantity ?? 0,
          d.tax_type ?? 0, d.tax ?? 0, d.retail_price ?? 0, d.discount ?? 0,
          d.net_amount ?? 0, d.deleted_at, d.created_at, d.updated_at, 0
        );
      }
      stmt.finalize();
    });
// ========== STEP XX: SALE DETAILS ==========

await safeSync("Transaction", async () => {
  const { data } = await axios.get(`${BASEURL}fetch-transaction`, { headers });

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO "Transaction" (
      id, location_id, type, type_id, date,
      user_id, deleted_at, created_at, updated_at, soft_delete
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of data) {
    stmt.run(
      t.id,
      t.location_id ?? null, // ✅ handles missing location_id safely
      t.type,
      t.type_id,
      t.date,
      t.user_id,
      t.deleted_at,
      t.created_at,
      t.updated_at,
      0 // ✅ default value for soft_delete
    );
  }

  stmt.finalize();
});

// ================= SALE DETAILS =================
await safeSync("Sale Details", async () => {
  try {
    console.log("📦 Fetching Sale Details...");
    const resData = await axios.get(`${BASEURL}fetch-sale-detail`, { headers });
    const saleDetails = resData.data;

    console.log(`📊 Total Sale Detail records fetched: ${saleDetails.length}`);

    const stmt = db.prepare(`
      INSERT INTO sale_details (
        id, sale_id, location_id, barcode, purchase_id,
        sub_category_id, category_id, product_id, retail,
        quantity, tax_type, tax, discount, net_amount,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let insertedCount = 0;
    let failedCount = 0;

    for (const s of saleDetails) {
      try {
        stmt.run(
          s.id,
          s.sale_id,
          s.location_id ?? null,
          s.barcode ?? "",
          s.purchase_id ?? null,
          s.sub_category_id ?? null,
          s.category_id ?? null,
          s.product_id,
          s.retail ?? 0,
          s.quantity ?? 0,
          s.tax_type ?? 0,
          s.tax ?? 0,
          s.discount ?? 0,
          s.net_amount ?? 0,
          s.created_at ?? null,
          s.updated_at ?? null
        );
        insertedCount++;
      } catch (err) {
        failedCount++;
        console.error(`❌ Failed to insert Sale Detail ID: ${s.id} — ${err.message}`);
      }
    }

    stmt.finalize();
    console.log(`✅ Sale Details inserted: ${insertedCount}`);
    if (failedCount > 0) console.warn(`⚠️ Failed Sale Detail inserts: ${failedCount}`);
    console.log("✅ Sale Details sync completed successfully!");
  } catch (err) {
    console.error("❌ Sale Details sync failed:", err.message);
  }
});

// ================= PURCHASE STOCK =================
await safeSync("Purchase Stock", async () => {
  try {
    console.log("📦 Fetching Purchase Stock...");
    const { data } = await axios.get(`${BASEURL}fetch-purchase-stock`, { headers });
    console.log(`📊 Total Purchase Stock records fetched: ${data.length}`);

    const stmt = db.prepare(`
      INSERT INTO purchase_stocks (
        id, user_id, location_id, purchase_id, purchase_return_id,
        sale_id, sale_return_id, product_id, quantity, process,
        purchase_detail_id, sale_detail_id, sale_return_detail_id,
        created_at, updated_at, soft_delete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let insertedCount = 0;
    let failedCount = 0;

    for (const s of data) {
      try {
        stmt.run(
          s.id,
          s.user_id ?? null,
          s.location_id ?? null,
          s.purchase_id ?? null,
          s.purchase_return_id ?? null,
          s.sale_id ?? null,
          s.sale_return_id ?? null,
          s.product_id ?? null,
          s.quantity ?? 0,
          s.process ?? "",
          s.purchase_detail_id ?? null,
          s.sale_detail_id ?? null,
          s.sale_return_detail_id ?? null,
          s.created_at ?? null,
          s.updated_at ?? null,
          0
        );
        insertedCount++;
      } catch (err) {
        failedCount++;
        console.error(`❌ Failed to insert Purchase Stock ID: ${s.id} — ${err.message}`);
      }
    }

    stmt.finalize();
    console.log(`✅ Purchase Stock inserted: ${insertedCount}`);
    if (failedCount > 0) console.warn(`⚠️ Failed Purchase Stock inserts: ${failedCount}`);
    console.log("✅ Purchase Stock sync completed successfully!");
  } catch (err) {
    console.error("❌ Purchase Stock sync failed:", err.message);
  }
});


    // ========== SALE ==========
    await safeSync("Sale", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-sale`, { headers });
      const stmt = db.prepare(`
        INSERT INTO sale (
          id, customer_id, location_id, invoice_no, sale_date,
          amount, discount, payment_status, user_id, fbr_invoice,
          deleted_at, created_at, updated_at, soft_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of data) {
        stmt.run(
          s.id, s.customer_id, s.location_id, s.invoice_no, s.sale_date,
          s.amount, s.discount, s.payment_status, s.user_id, s.fbr_invoice,
          s.deleted_at, s.created_at, s.updated_at, 0
        );
      }
      stmt.finalize();
    });

    // ========== SALE DISCOUNT ==========
    await safeSync("Sale Discount", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-discount`, { headers });
      const stmt = db.prepare(`
        INSERT INTO Sale_Discount (id, sale_id, remarks, amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const d of data) {
        stmt.run(d.id, d.sale_id, d.remarks ?? "", d.amount ?? 0, d.created_at, d.updated_at);
      }
      stmt.finalize();
    });

    // ========== EXPENSE ==========
    await safeSync("Expense", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-expense`, { headers });
      const stmt = db.prepare(`
        INSERT INTO expenses (
          id, location_id, voucher_no, date, paid_from, user_id,
          deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const e of data) {
        stmt.run(
          e.id, e.location_id, e.voucher_no, e.date, e.paid_from,
          e.user_id, e.deleted_at, e.created_at, e.updated_at
        );
      }
      stmt.finalize();
    });

    // ========== EXPENSE DETAIL ==========
    await safeSync("Expense Detail", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-expense-detail`, { headers });
      const stmt = db.prepare(`
        INSERT INTO expense_details (
          id, expense_id, location_id, remarks, amount,
          deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of data) {
        stmt.run(
          d.id, d.expense_id, d.location_id, d.remarks ?? "",
          d.amount ?? 0, d.deleted_at, d.created_at, d.updated_at
        );
      }
      stmt.finalize();
    });

    // ========== CASH PAYMENTS ==========
    await safeSync("Cash Payments", async () => {
      const { data } = await axios.get(`${BASEURL}fetch-cp`, { headers });
      const stmt = db.prepare(`
        INSERT INTO cash_payments (
          id, location_id, voucher_no, date, paid_from,
          user_id, amount, deleted_at, updated_at, soft_delete, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of data) {
        stmt.run(
          c.id, c.location_id, c.voucher_no, c.date, c.paid_from,
          c.user_id, c.amount, c.deleted_at, c.updated_at, 0, c.created_at
        );
      }
      stmt.finalize();
    });

    // ========== PURCHASE RETURN ==========
await safeSync("Purchase Return", async () => {
  const resData = await axios.get(`${BASEURL}fetch-purchase-return`, { headers });
  const data = resData.data;

  const stmt = db.prepare(`
    INSERT INTO purchase_return (
      id, purchase_id, location_id, supplier_id, invoice_no, voucher_no,
      purchase_date, return_date, amount, narration,
      user_id, deleted_at, created_at, updated_at, soft_delete
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of data) {
    stmt.run(
      p.id,
      p.purchase_id,
      p.location_id,
      p.supplier_id,
      p.invoice_no ?? "",
      p.voucher_no ?? "",
      p.purchase_date ?? "",
      p.return_date ?? "",
      p.amount ?? 0,
      p.narration ?? "",
      p.user_id ?? null,
      p.deleted_at ?? null,
      p.created_at ?? null,
      p.updated_at ?? null,
      0
    );
  }
  stmt.finalize();
});

// // ========== PURCHASE RETURN DETAIL ==========
await safeSync("Purchase Return Detail", async () => {
  const resData = await axios.get(`${BASEURL}fetch-purchase-return-detail`, { headers });
  const data = resData.data;

  const stmt = db.prepare(`
    INSERT INTO purchase_return_details (
      id, location_id, purchase_id, purchase_return_id, product_id,
      purchase_amount, quantity, net_amount, deleted_at, updated_at, soft_delete, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const d of data) {
    stmt.run(
      d.id,
      d.location_id ?? 1,
      d.purchase_id,
      d.purchase_return_id,
      d.product_id,
      d.purcahse_amount ?? 0, // note spelling from API
      d.quantity ?? 0,
      d.net_amount ?? 0,
      d.deleted_at ?? null,
      d.updated_at ?? null,
      0,
      d.created_at ?? null
    );
  }
  stmt.finalize();
});

    // ✅ Final response
    res.status(200).json({ message: "All tables synced successfully ✅" });
  } catch (error) {
    console.error("❌ Fatal Sync Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Create new module
exports.createModule = (req, res) => {
  const { name, description } = req.body;
  db.run(
    `INSERT INTO modules (name, description) VALUES (?, ?)`,
    [name, description],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, name, description });
    }
  );
};


// Get all modules
exports.getModules = (req, res) => {
  db.all(`SELECT * FROM modules`, [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
};
