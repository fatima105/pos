// ledgerController.js

const db = require('../db'); // your SQLite DB instance
const util = require("util");
// controllers/ReportsController.js

exports.getSalesReport = async (req, res) => {
  try {
    const { start_date, end_date, filter } = req.body;
console.log(start_date, end_date, filter);
    if (!start_date || !end_date || !filter) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let query, params;

    if (filter === "VoucherWise") {
      query = `
        SELECT 
          s.id AS sale_id, 
          s.invoice_no, 
          s.sale_date,
          sd.product_id, 
          sd.quantity, 
          sd.retail, 
          sd.discount,
          p.name AS product_name
        FROM sale s
        JOIN sale_details sd ON s.id = sd.sale_id
        JOIN product p ON sd.product_id = p.id
        WHERE s.sale_date BETWEEN ? AND ?
          AND s.soft_delete IS NULL
        ORDER BY s.invoice_no DESC
      `;
      params = [start_date, end_date];
    } 
    
    else if (filter === "ItemWise") {
      query = `
        SELECT 
          p.name AS product_name,
          s.sale_date,
          s.invoice_no,
          sd.quantity,
          sd.retail,
          sd.discount
        FROM sale s
        JOIN sale_details sd ON s.id = sd.sale_id
        JOIN product p ON sd.product_id = p.id
        WHERE s.sale_date BETWEEN ? AND ?
          AND s.soft_delete IS NULL
        ORDER BY p.name ASC, s.sale_date ASC, s.invoice_no ASC
      `;
      params = [start_date, end_date];
    } 
    
    else {
      return res.status(400).json({ message: "Invalid filter type" });
    }

    // ✅ Run query safely
    const rows = await new Promise((resolve, reject) => {
      db.all(query, params, (err, result) => {
        if (err) {
          console.error("SQL Error:", err.message);
          return reject(err);
        }
        resolve(result || []);
      });
    });

    if (filter === "VoucherWise") {
      // Group by invoice_no
      const grouped = {};
      rows.forEach(r => {
        if (!grouped[r.invoice_no]) {
          grouped[r.invoice_no] = {
            invoice_no: r.invoice_no,
            sale_date: r.sale_date,
            products: []
          };
        }
        grouped[r.invoice_no].products.push({
          product_name: r.product_name,
          quantity: r.quantity,
          retail: r.retail,
          discount: r.discount
        });
      });

      return res.json({ message: "success", data: Object.values(grouped) });
    }

    if (filter === "ItemWise") {
      // Group by product_name
      const grouped = {};
      rows.forEach(r => {
        if (!grouped[r.product_name]) {
          grouped[r.product_name] = {
            product_name: r.product_name,
            sales: []
          };
        }
        grouped[r.product_name].sales.push({
          sale_date: r.sale_date,
          invoice_no: r.invoice_no,
          quantity: r.quantity,
          retail: r.retail,
          discount: r.discount
        });
      });

      return res.json({ message: "success", data: Object.values(grouped) });
    }

  } catch (err) {
    console.error("Error in getSalesReport:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};




// Low Stock Product Report API
exports.getLowStockReport = (req, res) => {
  try {
    const query = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        c.name AS category_name,
        sc.name AS sub_category_name,
        IFNULL(SUM(ps.quantity), 0) AS total_stock
      FROM purchase_stocks ps
      JOIN Product p ON p.id = ps.product_id
      LEFT JOIN Category c ON c.id = p.category_id
      LEFT JOIN SubCategory sc ON sc.id = p.sub_category_id
      GROUP BY p.id, p.name, c.name, sc.name
      HAVING total_stock < 3
      ORDER BY total_stock ASC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("💥 DB Error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "No low stock products found." });
      }

      // Add flag for frontend styling
      const report = rows.map(row => ({
        product_id: row.product_id,
        product_name: row.product_name,
        category: row.category_name || "N/A",
        sub_category: row.sub_category_name || "N/A",
        total_stock: row.total_stock,
        lowStock: row.total_stock < 3 // highlight condition
      }));

      res.status(200).json({ report });
    });
  } catch (error) {
    console.error("💥 Error in getLowStockReport:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
// 📌 Controller: Fetch Expense Head Codes with Opening and Closing
exports.getLedgerReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
console.log(start_date, end_date );
    if (!start_date || !end_date) {
      return res.status(400).json({
        error: "start_date and end_date are required",
      });
    }

    // ✅ Promisify sqlite3
    const dbAll = util.promisify(db.all).bind(db);
    const dbGet = util.promisify(db.get).bind(db);

    // ✅ Fetch Expense Head Codes
    const headCodes = await dbAll(`
      SELECT head_code
      FROM chart_of_accounts
      WHERE head_name = 'Expenses'
    `);

    const results = [];

    for (const row of headCodes) {
      const head_code = row.head_code;

      // 🔎 Opening Balance
      const openingRow = await dbGet(
        `SELECT IFNULL(SUM(td.debit - td.credit), 0) as opening_balance
         FROM Transaction_details td
         JOIN "Transaction" t ON t.id = td.v_id
         WHERE td.coa_id = ?
           AND t.type = 'EXPENSES'
           AND t.date < ?`,
        [head_code, start_date]
      );

      const opening_balance = Number(openingRow?.opening_balance || 0);

      // 🔎 Ledger Rows (transactions in range)
      const ledgerRows =
        (await dbAll(
          `SELECT trx.date, td.narration,
                  COALESCE(td.debit,0) AS debit,
                  COALESCE(td.credit,0) AS credit
           FROM Transaction_details td
           JOIN "Transaction" trx ON td.v_id = trx.id
           WHERE td.coa_id = ? 
             AND trx.date BETWEEN ? AND ?
           ORDER BY trx.date ASC`,
          [head_code, start_date, end_date]
        )) || [];

      // 🔎 Closing Balance
      const closingRow =
        (await dbGet(
          `SELECT COALESCE(SUM(td.debit),0) AS debit, 
                  COALESCE(SUM(td.credit),0) AS credit
           FROM Transaction_details td
           JOIN "Transaction" trx ON td.v_id = trx.id
           WHERE td.coa_id = ? 
             AND trx.date <= ?`,
          [head_code, end_date]
        )) || { debit: 0, credit: 0 };

      const closing_balance =
        Number(closingRow.debit) - Number(closingRow.credit);

      // ✅ Push into results
      results.push({
        head_code,
        opening_balance,
        ledgerRows,
        closing_balance,
      });
    }

    return res.json({
      message: "Expense Ledger Report fetched successfully",
      data: results,
    });
  } catch (error) {
    console.error("❌ Error in getLedgerReport:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch expense head ledger report" });
  }
};
exports.getCashFlowSimple = (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    const location_id = 1; 

    if (!start_date || !end_date) {
      return res.status(400).json({ error: "start_date and end_date are required." });
    }

    // Helper for formatting
const formatAmount = (val) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(val || 0));
};


    // 1️⃣ Get Cash In Hand account
    const cashAccountQuery = `
      SELECT head_code, head_name
      FROM chart_of_accounts
      WHERE head_name = 'Cash In Hand'
    `;

    db.get(cashAccountQuery, [], (err, cashAccount) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!cashAccount) return res.status(404).json({ error: "Cash In Hand account not found." });

      const { head_code, head_name } = cashAccount;

      // 2️⃣ Opening Balance
      const openingQuery = `
        SELECT IFNULL(SUM(td.debit),0) - IFNULL(SUM(td.credit),0) AS balance
        FROM "Transaction_details" td
        JOIN "Transaction" trx ON td.v_id = trx.id
        WHERE td.coa_id = ? 
          AND trx.location_id = ? 
          AND date(trx.date) < date(?)
      `;

      db.get(openingQuery, [head_code, location_id, start_date], (err, openingRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const opening_balance = Number(openingRow.balance) || 0;

        // 3️⃣ Ledger Entries
        const ledgerQuery = `
          SELECT trx.date, td.narration,
                 COALESCE(td.debit,0) AS debit,
                 COALESCE(td.credit,0) AS credit
          FROM "Transaction_details" td
          JOIN "Transaction" trx ON td.v_id = trx.id
          WHERE td.coa_id = ? 
            AND trx.location_id = ? 
            AND date(trx.date) BETWEEN date(?) AND date(?)
          ORDER BY trx.date ASC
        `;

        db.all(ledgerQuery, [head_code, location_id, start_date, end_date], (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });

          let runningBalance = opening_balance;
          const ledger = rows.map((row, idx) => {
            const debit =row.debit || 0;
            const credit =row.credit || 0;
            runningBalance += debit - credit;
            return {
              sr: idx + 1,
              date: row.date,
              narration: row.narration || "",
              debit: formatAmount(debit),
              credit: formatAmount(credit),
              balance: formatAmount(runningBalance)
            };
          });

          // 4️⃣ Closing Balance
          const closingQuery = `
            SELECT IFNULL(SUM(td.debit),0) - IFNULL(SUM(td.credit),0) AS balance
            FROM "Transaction_details" td
            JOIN "Transaction" trx ON td.v_id = trx.id
            WHERE td.coa_id = ? 
              AND trx.location_id = ? 
              AND date(trx.date) <= date(?)
          `;

          db.get(closingQuery, [head_code, location_id, end_date], (err, closingRow) => {
            if (err) return res.status(500).json({ error: err.message });
            const closing_balance = closingRow.balance || 0;

            // 5️⃣ Return final result
            return res.status(200).json({
              account_namee: head_name,
              opening_balance: formatAmount(opening_balance),
              closing_balance: formatAmount(closing_balance),
              ledger,
              message: rows.length === 0 ? "No transactions found in the given date range." : undefined
            });
          });
        });
      });
    });

  } catch (error) {
    console.error("💥 Error fetching cash flow:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};


exports.payableReport = (req, res) => {
  try {
    const sql = `
      SELECT 
        s.id AS supplier_id,
        s.name AS supplier_name,
        COALESCE(SUM(td.debit), 0) AS total_debit,
        COALESCE(SUM(td.credit), 0) AS total_credit,
        COALESCE(SUM(td.credit) - SUM(td.debit), 0) AS balance
      FROM supplier s
      INNER JOIN chart_of_accounts c 
        ON c.supplier_id = s.id
      LEFT JOIN transaction_details td 
        ON td.coa_id = c.head_code
      GROUP BY s.id, s.name
      ORDER BY s.id DESC;
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching payable report:", err.message);
        return res.status(500).json({ error: "Database error" });
      }

      let finalRows = [];
      let grandTotalPayable = 0;

      rows.forEach(r => {
        let debit = 0, credit = 0;

        if (r.balance > 0) {
          // Positive → Credit
          credit = r.balance;
          grandTotalPayable += credit;
        } else if (r.balance < 0) {
          // Negative → Debit
          debit = Math.abs(r.balance);
        }

        // 👉 Log each supplier totals in console
        console.log(
          `Supplier: ${r.supplier_name} | Total Debit: ${r.total_debit} | Total Credit: ${r.total_credit} | Balance: ${r.balance}`
        );

        finalRows.push({
          supplier_id: r.supplier_id,
          supplier_name: r.supplier_name,
          total_debit: r.total_debit,
          total_credit: r.total_credit,
          debit,
          credit
        });
      });

      return res.status(200).json({
        success: true,
        data: finalRows,
        grandTotalPayable
      });
    });
  } catch (error) {
    console.error("❌ Exception in payableReport:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// controllers/reportController.js
exports.ProfitLossReport = (req, res) => {
  try {
    const { start_date, end_date } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: "Start and end dates are required" });
    }

    const sqlSales = `
      SELECT id, invoice_no, sale_date, amount, discount
      FROM sale
      WHERE sale_date BETWEEN ? AND ?
      AND soft_delete IS NULL
    `;

    db.all(sqlSales, [start_date, end_date], (err, sales) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!sales.length) {
        return res.json({ message: "No sales found in given date range", data: [] });
      }

      const report = [];
      let pending = sales.length;

      let totalRetail = 0;
      let totalDiscount = 0;
      let totalPrice = 0;
      let totalCost = 0;
      let totalProfit = 0;

      sales.forEach((sale) => {
        const sqlTxn = `
          SELECT id FROM "Transaction"
          WHERE type = 'Sale' 
          AND type_id = ?
          AND soft_delete IS NULL
        `;

        db.get(sqlTxn, [sale.id], (err, txn) => {
          if (err) return res.status(500).json({ error: err.message });

          const sqlDetails = `
            SELECT SUM(CASE WHEN debit > 0 THEN debit ELSE 0 END) AS total_debit
            FROM Transaction_details
            WHERE v_id = ?
            AND soft_delete IS NULL
          `;

          const handleRow = (cost) => {
            const retail = sale.amount;
            const discount = sale.discount || 0;
            const price = retail - discount;
            const profit = price - cost;

            report.push({
              date: sale.sale_date,
              voucher: sale.invoice_no,
              retail,
              discount,
              price,
              cost,
              profit,
            });

            totalRetail += retail;
            totalDiscount += discount;
            totalPrice += price;
            totalCost += cost;
            totalProfit += profit;

            if (!--pending) {
              report.push({
                date: "Grand Total",
                voucher: "",
                retail: totalRetail,
                discount: totalDiscount,
                price: totalPrice,
                cost: totalCost,
                profit: totalProfit,
              });
              return res.json({ data: report });
            }
          };

          if (!txn) {
            handleRow(0);
          } else {
            db.get(sqlDetails, [txn.id], (err, details) => {
              if (err) return res.status(500).json({ error: err.message });
              const cost = details?.total_debit || 0;
              handleRow(cost);
            });
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Customer Receivable Report
exports.receivableReport = (req, res) => {
  try {
    const sql = `
      SELECT 
        cst.id AS customer_id,
        cst.name AS customer_name,
        coa.head_code,
        COALESCE(SUM(td.debit), 0) AS total_debit,
        COALESCE(SUM(td.credit), 0) AS total_credit,
        (COALESCE(SUM(td.debit), 0) - COALESCE(SUM(td.credit), 0)) AS balance
      FROM Customer cst
      LEFT JOIN chart_of_accounts coa 
        ON coa.customer_id = cst.id
      LEFT JOIN transaction_details td 
        ON td.coa_id = coa.head_code
      WHERE coa.head_code IS NOT NULL
      GROUP BY cst.id, coa.head_code
      ORDER BY cst.name
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching receivable report:", err.message);
        return res.status(500).json({ error: "Database error" });
      }

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows,
      });
    });
  } catch (error) {
    console.error("❌ Exception in receivableReport:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getCustomerHeadCode = (req, res) => {
  const { customer_id, start_date, end_date } = req.body;
  console.log("➡️ Incoming Request Body:", req.body);

  if (!customer_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'customer_id, start_date, and end_date are required' });
  }

  if (isNaN(new Date(start_date)) || isNaN(new Date(end_date))) {
    return res.status(400).json({ error: "Invalid date format. Must be valid YYYY-MM-DD" });
  }

  const query = `SELECT head_code, head_name FROM chart_of_accounts WHERE customer_id = ?`;
  db.get(query, [customer_id], (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { head_code, head_name } = customer;
    console.log("✅ Customer Found:", customer);

    // Opening balance
    const openingQuery = `
      SELECT SUM(td.debit) - SUM(td.credit) AS balance
      FROM "Transaction_details" td
      JOIN "Transaction" trx ON td.v_id = trx.id
      WHERE td.coa_id = ? AND trx.date < ?
    `;
    db.get(openingQuery, [head_code, start_date], (err, openingRow) => {
      if (err) return res.status(500).json({ error: err.message });
      const opening_balance = openingRow?.balance || 0;
      console.log("➡️ Opening Balance:", opening_balance);

      // All transaction_details entries (with coa_id logging)
      const ledgerQuery = `
        SELECT trx.date,
               td.id AS detail_id, td.v_id, td.coa_id,
               td.narration, td.debit, td.credit
        FROM "Transaction_details" td
        JOIN "Transaction" trx ON td.v_id = trx.id
        WHERE trx.date BETWEEN ? AND ?
        ORDER BY trx.date ASC, td.id ASC
      `;
      db.all(ledgerQuery, [start_date, end_date], (err, allRows) => {
        if (err) return res.status(500).json({ error: err.message });

        console.log("📄 Transaction_details Rows Fetched (raw):", allRows.length);

        // Filter + log mismatches
        const ledgerRows = [];
        allRows.forEach((row, idx) => {
          if (row.coa_id === head_code) {
            ledgerRows.push(row);
          } else {
            console.warn(`⚠️ Row skipped [detail_id=${row.detail_id}, v_id=${row.v_id}] → coa_id "${row.coa_id}" does NOT match head_code "${head_code}"`);
          }
        });

        console.log("✅ Ledger Rows After Filtering:", ledgerRows.length);

        let runningBalance = opening_balance;
        const ledger = ledgerRows.map((row, idx) => {
          const debit = row.debit || 0;
          const credit = row.credit || 0;
          runningBalance += debit - credit;

          const rowData = {
            sr: idx + 1,
            date: row.date,
            v_id: row.v_id,
            detail_id: row.detail_id,
            narration: row.narration || "",
            debit,
            credit,
            balance: runningBalance
          };

          console.log(`🔢 Ledger Entry [${idx + 1}]:`, rowData);
          return rowData;
        });

        // Closing balance
        const closingQuery = `
          SELECT SUM(td.debit) - SUM(td.credit) AS balance
          FROM "Transaction_details" td
          JOIN "Transaction" trx ON td.v_id = trx.id
          WHERE td.coa_id = ? AND trx.date <= ?
        `;
        db.get(closingQuery, [head_code, end_date], (err, closingRow) => {
          if (err) return res.status(500).json({ error: err.message });
          const closing_balance = closingRow?.balance || 0;
          console.log("➡️ Closing Balance:", closing_balance);

          const response = {
            customer_id,
            customer_name: head_name,
            head_code,
            start_date,
            end_date,
            opening_balance,
            closing_balance,
            ledger
          };

          console.log("✅ Final Response:", response);
          return res.status(200).json(response);
        });
      });
    });
  });
};


// ✅ Date validation helper
function isValidDate(dateStr) {
  // Must match YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  // Check if real date
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateStr;
}

exports.getAllSupplierLedger = (req, res) => {
  try {
    const { supplier_id, start_date, end_date } = req.body;
    const location_id = 1; // fixed location

    if (!supplier_id || !start_date || !end_date) {
      return res.status(400).json({ error: "supplier_id, start_date, and end_date are required" });
    }

    // 1️⃣ Fetch head_code for the supplier
    const coaQuery = `
      SELECT head_code, head_name
      FROM chart_of_accounts
      WHERE supplier_id = ?
    `;

    db.get(coaQuery, [supplier_id], (err, supplier) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });

      const head_code = supplier.head_code;
      const supplier_name = supplier.head_name;

      // 2️⃣ Opening Balance
      const openingQuery = `
        SELECT IFNULL(SUM(td.credit) - SUM(td.debit), 0) AS balance
        FROM "Transaction_details" td
        JOIN "Transaction" t ON t.id = td.v_id
        WHERE td.coa_id = ? 
          AND t.location_id = ? 
          AND date(t.date) < date(?)
      `;

      db.get(openingQuery, [head_code, location_id, start_date], (err, openingRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const opening_balance = openingRow.balance || 0;

        // 3️⃣ Ledger Entries
        const ledgerQuery = `
          SELECT t.date, td.narration, td.debit, td.credit
          FROM "Transaction_details" td
          JOIN "Transaction" t ON t.id = td.v_id
          WHERE td.coa_id = ? 
            AND t.location_id = ? 
            AND date(t.date) BETWEEN date(?) AND date(?)
          ORDER BY date(t.date) ASC
        `;

        db.all(ledgerQuery, [head_code, location_id, start_date, end_date], (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });

          if (!rows || rows.length === 0) {
            // ✅ No records found
            return res.status(200).json({
              supplier_id,
              supplier_name,
              head_code,
              start_date,
              end_date,
              opening_balance: opening_balance.toFixed(2),
              closing_balance: opening_balance.toFixed(2), // same as opening if no txn
              ledger: [],
              message: "No records found in the given date range"
            });
          }

          // If records exist
          let runningBalance = opening_balance;
          const ledger = rows.map((row, index) => {
            const debit = Number(row.debit) || 0;
            const credit = Number(row.credit) || 0;
            runningBalance += credit - debit;
            return {
              sr: index + 1,
              date: row.date,
              narration: row.narration || "",
              debit: debit.toFixed(2),
              credit: credit.toFixed(2),
              balance: runningBalance.toFixed(2)
            };
          });

          // 4️⃣ Closing Balance
          const closingQuery = `
            SELECT IFNULL(SUM(td.credit) - SUM(td.debit), 0) AS balance
            FROM "Transaction_details" td
            JOIN "Transaction" t ON t.id = td.v_id
            WHERE td.coa_id = ? 
              AND t.location_id = ? 
              AND date(t.date) <= date(?)
          `;

          db.get(closingQuery, [head_code, location_id, end_date], (err, closingRow) => {
            if (err) return res.status(500).json({ error: err.message });
            const closing_balance = closingRow.balance || opening_balance;

            res.status(200).json({
              supplier_id,
              supplier_name,
              head_code,
              start_date,
              end_date,
              opening_balance: opening_balance.toFixed(2),
              closing_balance: closing_balance.toFixed(2),
              ledger
            });
          });
        });
      });
    });
  } catch (error) {
    console.error("💥 Error in getAllSupplierLedger:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};


exports.incomeStatements = async (req, res) => {
  const locationId = 1; // Fixed location

  const { fromDate, toDate } = req.body;
  if (!fromDate || !toDate) {
    return res.status(400).json({ error: "fromDate and toDate are required" });
  }

  try {
    // ---------- Step 2 & 3: Total Sale ----------
    const saleIds = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id FROM sale WHERE sale_date BETWEEN ? AND ? AND location_id=?`,
        [fromDate, toDate, locationId],
        (err, rows) => err ? reject(err) : resolve(rows.map(r => r.id))
      );
    });

    const totalSale = saleIds.length > 0
      ? await new Promise((resolve, reject) => {
          const placeholders = saleIds.map(() => "?").join(",");
          db.get(
            `SELECT SUM(net_amount) as total FROM sale_details WHERE sale_id IN (${placeholders})`,
            saleIds,
            (err, row) => err ? reject(err) : resolve(row?.total || 0)
          );
        })
      : 0;

    // ---------- Step 4 & 5: Total Sale Return ----------
    const returnIds = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id FROM sale_return WHERE sale_date BETWEEN ? AND ? AND location_id=?`,
        [fromDate, toDate, locationId],
        (err, rows) => err ? reject(err) : resolve(rows.map(r => r.id))
      );
    });

    const totalSaleReturn = returnIds.length > 0
      ? await new Promise((resolve, reject) => {
          const placeholders = returnIds.map(() => "?").join(",");
          db.get(
            `SELECT SUM(net_amount) as total FROM sale_return_detail WHERE sale_return_id IN (${placeholders})`,
            returnIds,
            (err, row) => err ? reject(err) : resolve(row?.total || 0)
          );
        })
      : 0;

    // ---------- Step 6: Total COGS ----------
    const inventoryCode = await new Promise((resolve, reject) => {
      db.get(
        `SELECT head_code FROM chart_of_accounts WHERE LOWER(head_name)=LOWER('Inventory') AND location_id=?`,
        [locationId],
        (err, row) => err ? reject(err) : resolve(row?.head_code)
      );
    });

    const saleTransactionIds = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id FROM "Transaction" WHERE type='Sale' AND date BETWEEN ? AND ? AND location_id=?`,
        [fromDate, toDate, locationId],
        (err, rows) => err ? reject(err) : resolve(rows.map(r => r.id))
      );
    });

    const totalCOGS = saleTransactionIds.length > 0
      ? await new Promise((resolve, reject) => {
          const placeholders = saleTransactionIds.map(() => "?").join(",");
          db.get(
            `SELECT SUM(credit) as total FROM "Transaction_details" WHERE v_id IN (${placeholders}) AND coa_id=?`,
            [...saleTransactionIds, inventoryCode],
            (err, row) => err ? reject(err) : resolve(row?.total || 0)
          );
        })
      : 0;

    // ---------- Step 7: Total Return COGS ----------
    const returnTransactionIds = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id FROM "Transaction" WHERE type='Sale Return' AND date BETWEEN ? AND ? AND location_id=?`,
        [fromDate, toDate, locationId],
        (err, rows) => err ? reject(err) : resolve(rows.map(r => r.id))
      );
    });

    const totalReturnCOGS = returnTransactionIds.length > 0
      ? await new Promise((resolve, reject) => {
          const placeholders = returnTransactionIds.map(() => "?").join(",");
          db.get(
            `SELECT SUM(debit) as total FROM "Transaction_details" WHERE v_id IN (${placeholders}) AND coa_id=?`,
            [...returnTransactionIds, inventoryCode],
            (err, row) => err ? reject(err) : resolve(row?.total || 0)
          );
        })
      : 0;

    // ---------- Step 8: Total Expenses ----------
    const totalExpense = await new Promise((resolve, reject) => {
      db.get(
        `SELECT SUM(ed.amount) as total 
         FROM expenses e 
         JOIN expense_details ed ON e.id=ed.expense_id
         WHERE e.date BETWEEN ? AND ? AND e.location_id=?`,
        [fromDate, toDate, locationId],
        (err, row) => err ? reject(err) : resolve(row?.total || 0)
      );
    });

    // ---------- Step 9: Net Calculations ----------
    const netSale = totalSale - totalSaleReturn;
    const netCOGS = totalCOGS - totalReturnCOGS;
    const profitOnSale = netSale - netCOGS;
    const netProfitLoss = profitOnSale - totalExpense;

    res.json({
      totalSale,
      totalSaleReturn,
      totalCOGS,
      totalReturnCOGS,
      totalExpense,
      netSale,
      netCOGS,
      profitOnSale,
      netProfitLoss
    });

  } catch (error) {
    console.error("❌ Error fetching income statements:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// exports.getAllCustomer = (req, res) => {
//   try {
//     const { start_date, end_date, customer_id } = req.body;
//     if (!start_date || !end_date || !customer_id) return res.status(400).json({ error: "start_date, end_date, and customer_id are required." });

//     const customer = db.prepare(`
//       SELECT head_code, head_name 
//       FROM chart_of_accounts 
//       WHERE customer_id = ?
//     `).get(customer_id);

//     if (!customer) return res.status(404).json({ error: "Customer not found." });

//     const { head_code, head_name } = customer;

//     const openingRow = db.prepare(`
//       SELECT COALESCE(SUM(td.debit),0) - COALESCE(SUM(td.credit),0) AS balance
//       FROM Transaction_details td
//       JOIN "Transaction" trx ON td.v_id = trx.id
//       WHERE td.coa_id = ? AND trx.date < ?
//     `).get(head_code, start_date) || { balance: 0 };

//     const opening_balance = Number(openingRow.balance);

//     let ledgerRows = db.prepare(`
//       SELECT trx.date, td.narration,
//              COALESCE(td.debit,0) AS debit,
//              COALESCE(td.credit,0) AS credit
//       FROM Transaction_details td
//       JOIN "Transaction" trx ON td.v_id = trx.id
//       WHERE td.coa_id = ? AND trx.date BETWEEN ? AND ?
//       ORDER BY trx.date ASC
//     `).all(head_code, start_date, end_date);

//     ledgerRows = Array.isArray(ledgerRows) ? ledgerRows : [];

//     let runningBalance = opening_balance;
//     const ledger = ledgerRows.map((row, idx) => {
//       const debit = Number(row.debit) || 0;
//       const credit = Number(row.credit) || 0;
//       runningBalance += debit - credit;
//       return {
//         sr: idx + 1,
//         date: row.date,
//         narration: row.narration || "",
//         debit: debit.toFixed(2),
//         credit: credit.toFixed(2),
//         balance: runningBalance.toFixed(2)
//       };
//     });

//     const closingRow = db.prepare(`
//       SELECT COALESCE(SUM(td.debit),0) - COALESCE(SUM(td.credit),0) AS balance
//       FROM Transaction_details td
//       JOIN "Transaction" trx ON td.v_id = trx.id
//       WHERE td.coa_id = ? AND trx.date <= ?
//     `).get(head_code, end_date) || { balance: 0 };

//     const closing_balance = Number(closingRow.balance);

//     return res.status(200).json({
//       customer_id,
//       customer_name: head_name,
//       head_code,
//       start_date,
//       end_date,
//       opening_balance: opening_balance.toFixed(2),
//       closing_balance: closing_balance.toFixed(2),
//       ledger
//     });

//   } catch (error) {
//     console.error("Error fetching customer ledger:", error);
//     return res.status(500).json({ error: "Internal server error", details: error.message });
//   }
// };

