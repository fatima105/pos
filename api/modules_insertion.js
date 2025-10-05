const fs = require('fs');
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


// Insert multiple rows
const insertModules = `
INSERT INTO modules (name, description, link) VALUES
('Dashboard', 'Dashboard main page', '/dashboard'),
('Items Import', 'Import items into system', '/items-import'),
('Items Import Report', 'View imported items report', '/items-import-report'),
('Products', 'Manage products', '/products'),
('View Products Units', 'View and manage product units', '/products/units'),
('View Categories', 'Manage product categories', '/categories'),
('View Sub Categories', 'Manage product sub categories', '/sub-categories'),
('View Taxes', 'Manage tax settings', '/taxes'),
('Change Password', 'Change your password', '/change-password'),
('Add Users', 'Create new users', '/users/add'),
('Assign Modules', 'Assign modules to users', '/modules/assign'),
('Create Modules', 'Create or manage system modules', '/modules/create'),
('View Profile', 'View your user profile', '/profile'),
('Expense Voucher', 'Record expense vouchers', '/expense-voucher'),
('Cash Payment Voucher', 'Record cash payment vouchers', '/cash-payment-voucher'),
('Cash Received Voucher', 'Record received cash vouchers', '/cash-received-voucher'),
('Journal Payment Voucher', 'Record journal payment vouchers', '/journal-payment-voucher'),
('View Suppliers', 'List and manage suppliers', '/suppliers'),
('View Purchases', 'List and manage purchases', '/purchases'),
('View Purchase Return', 'View returned purchases', '/purchase-return'),
('Sale Register', 'Register new sales', '/sale-register'),
('View Customers', 'Manage customers', '/customers'),
('View Sales', 'List all sales', '/sales'),
('View Sales Returns', 'View returned sales', '/sales-return'),
('Discount Report', 'Report of discounts applied', '/discount-report'),
('Sale Report', 'View sales reports', '/sales-report'),
('Profit/Loss Report', 'Profit and loss analysis', '/profit-loss-report'),
('Receiveable Report', 'Outstanding receivables report', '/receiveable-report'),
('Payable Report', 'Outstanding payables report', '/payable-report'),
('Low Stock Ledger', 'Track low stock items', '/low-stock-ledger'),
('Supplier Ledger', 'Supplier transaction ledger', '/supplier-ledger'),
('Income Statement', 'View income statement', '/income-statement'),
('Customer Ledger', 'Customer transaction ledger', '/customer-ledger'),
('Cash Flow', 'Cash flow report', '/cash-flow'),
('Expense Ledger', 'Expense tracking ledger', '/expense-ledger'),
('Logout', 'Logout from the system', '/logout');
`;

db.run(insertModules, (err) => {
  if (err) {
    console.error("❌ Error inserting modules:", err.message);
  } else {
    console.log("✅ Modules inserted successfully!");
  }
  db.close();
});
