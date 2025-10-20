const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, "alimart.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error connecting to SQLite:", err.message);
  } else {
    console.log("✅ Connected to ALiMart SQLite database:", dbPath);
  }
});

// Array of modules with updated links
const modulesToUpdate = [
  { name: 'Dashboard', link: 'index.html' },
  { name: 'Items Import', link: 'items-import.html' },
  { name: 'Items Import Report', link: 'items-import-report.html' },
  { name: 'Products', link: 'products.html' },
  { name: 'View Products Units', link: 'units.html' },
  { name: 'View Categories', link: 'Categories.html' },
  { name: 'View Sub Categories', link: 'SubCategories.html' },
  { name: 'View Taxes', link: 'Tax.html' },
  { name: 'Change Password', link: 'change-password.html' },
  { name: 'Add Users', link: 'add-users.html' },
  { name: 'Assign Modules', link: 'assign-modules.html' },
  { name: 'Create Modules', link: 'create-modules.html' },
  { name: 'View Profile', link: 'profile.html' },
  { name: 'Expense Voucher', link: 'expense-voucher.html' },
  { name: 'Cash Payment Voucher', link: 'cash-payment-voucher.html' },
  { name: 'Cash Received Voucher', link: 'cash-received-voucher.html' },
  { name: 'Journal Payment Voucher', link: 'Journal-voucher.html' },
  { name: 'View Suppliers', link: 'view-suppliers.html' },
  { name: 'View Purchases', link: 'view-purchases.html' },
  { name: 'View Purchase Return', link: 'view-purchase-return.html' },
  { name: 'Sale Register', link: 'sale-register.html' },
  { name: 'View Customers', link: 'view-customers.html' },
  { name: 'View Sales', link: 'view-sales.html' },
  { name: 'View Sales Returns', link: 'view-sales-returns.html' },
  { name: 'Discount Report', link: 'Discount-Report.html' },
  { name: 'Sale Report', link: 'Sale-Report.html' },
  { name: 'Profit/Loss Report', link: 'Profit_Loss_Report.html' },
  { name: 'Receiveable Report', link: 'RecieveableReport.html' },
  { name: 'Payable Report', link: 'Payable-Report.html' },
  { name: 'Low Stock Ledger', link: 'low-stock-ledge.html' },
  { name: 'Supplier Ledger', link: 'view-suppliers-ledge.html' },
  { name: 'Income Statement', link: 'income-statement.html' },
  { name: 'Customer Ledger', link: 'view-customer-ledger.html' },
  { name: 'Cash Flow', link: 'view-cash-flow.html' },
  { name: 'Expense Ledger', link: 'view-expense-ledger.html' },
  { name: 'Logout', link: 'logout.html' }
];

// Update each module’s link
modulesToUpdate.forEach(module => {
  const sql = `UPDATE modules SET link = ? WHERE name = ?`;
  db.run(sql, [module.link, module.name], function (err) {
    if (err) {
      console.error(`❌ Error updating ${module.name}:`, err.message);
    } else if (this.changes > 0) {
      console.log(`✅ Updated link for: ${module.name}`);
    } else {
      console.warn(`⚠️ No match found for: ${module.name}`);
    }
  });
});

// Close connection after updates
setTimeout(() => {
  db.close();
  console.log("✅ Database connection closed.");
}, 2000);
