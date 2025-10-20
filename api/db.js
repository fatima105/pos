const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, 'alimart.db'); // Save in project root





const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to SQLite:', err.message);
    } else {
        console.log('✅ Connected to ALiMart SQLite database:', dbPath);
    }
});


// function showTableInfo(tableName) {
//   db.all(`PRAGMA table_info(${tableName});`, (err, rows) => {
//     if (err) {
//       console.error(`❌ Error retrieving ${tableName} table structure:`, err.message);
//     } else if (rows.length === 0) {
//       console.warn(`⚠️ ${tableName} table does NOT exist or has no columns.`);
//     } else {
//       console.log(`✅ ${tableName} table structure:`);
//       rows.forEach(column => {
//         console.log(`- ${column.name} (${column.type})${column.notnull ? ' NOT NULL' : ''}${column.pk ? ' PRIMARY KEY' : ''}`);
//       });
//     }
//   });
// }

// ['sale', 'sale_details', 'sale_return', 'sale_return_detail'].forEach(showTableInfo);





db.serialize(() => {

    // Create Unit table
    db.run(
        `CREATE TABLE IF NOT EXISTS Unit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            status TEXT NOT NULL
        )`,
        (err) => {
            if (err) {
                console.error('❌ Error creating Unit table:', err.message);
            } else {
                console.log('✅ Unit table created successfully.');
            }
        }
    );
    // Create Category table
    db.run(
        `CREATE TABLE IF NOT EXISTS Category (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status TEXT NOT NULL
        )`,
        (err) => {
            if (err) {
                console.error('❌ Error creating Category table:', err.message);
            } else {
                console.log('✅ Category table created successfully.');
            }
        }
    );
  // // 🔥 DROP EXISTING TABLES (FIXED)
  //   db.run("DROP TABLE IF EXISTS chart_of_accounts", (err) => {
  //       if (err) {
  //           console.error('❌ Error dropping chart_of_accounts:', err.message);
  //       } else {
  //           console.log('🗑️ chart_of_accounts table dropped successfully.');
  //       }
  //   });

  //   db.run("DROP TABLE IF EXISTS Supplier", (err) => {
  //       if (err) {
  //           console.error('❌ Error dropping Supplier:', err.message);
  //       } else {
  //           console.log('🗑️ Supplier table dropped successfully.');
  //       }
  //   });

    // Create Tax table
    db.run(
        `CREATE TABLE IF NOT EXISTS Tax (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            tax_rate TEXT,
            status TEXT NOT NULL
        )`,
        (err) => {
            if (err) {
                console.error('❌ Error creating Tax table:', err.message);
            } else {
                console.log('✅ Tax table created successfully.');
            }
        }
    );
    // Create SubCategory table
    db.run(
        `CREATE TABLE IF NOT EXISTS SubCategory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES Category(id)
        )`,
        (err) => {
            if (err) {
                console.error('❌ Error creating SubCategory table:', err.message);
            } else {
                console.log('✅ SubCategory table created successfully.');
            }
        }
    );
// Create Product table
db.run("ALTER TABLE Product ADD COLUMN unit_id INTEGER", (err) => {
  if (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("⚠️ Column 'unit_id' already exists, skipping...");
    } else {
      console.error("❌ Error adding unit_id column:", err.message);
    }
  } else {
    console.log("✅ unit_id column added successfully.");
  }
});


    db.run(
            `CREATE TABLE IF NOT EXISTS Product (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER,
                sub_category_id INTEGER,
                Unit INTEGER,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                SKU VARCHAR(255),
                tax VARCHAR(255),
                retail_price INTEGER,
                status VARCHAR(50) NOT NULL,
                FOREIGN KEY (category_id) REFERENCES Category(id),
                FOREIGN KEY (sub_category_id) REFERENCES SubCategory(id),
                FOREIGN KEY (Unit) REFERENCES Unit(id)
            )`,
            (err) => {
                if (err) {
                    console.error('❌ Error creating Product table:', err.message);
                } else {
                    console.log('✅ Product table created successfully.');
                }
            }
        );
    // Create Supplier table
  
      
//           db.serialize(() => {
//   db.all(
//     `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name == 'chart_of_accounts';`,
//     (err, tables) => {
//       if (err) {
//         console.error('❌ Error fetching table names:', err.message);
//         return;
//       }

//       if (tables.length === 0) {
//         console.log('⚠️ No tables found to clean.');
//         return;
//       }

//       tables.forEach((table) => {
//         const tableName = table.name;
//         db.run(`DELETE FROM "${tableName}";`, (err) => {
//           if (err) {
//             console.error(`❌ Error deleting data from ${tableName}:`, err.message);
//           } else {
//             console.log(`🗑️ Cleared data from ${tableName}`);
//           }
//         });
//       });
//     }
//   );
// });



module.exports = db;


// delete from chart_of_accounts first, then suppliers
// db.run(
//   "DELETE FROM chart_of_accounts WHERE supplier_id = ?",
//   [1],
//   function (err) {
//     if (err) {
//       console.error("❌ Error deleting from chart_of_accounts:", err.message);
//       return;
//     }
//     console.log(`✅ Deleted ${this.changes} row(s) from chart_of_accounts`);

//     // now delete from suppliers
//     db.run(
//       "DELETE FROM Supplier WHERE id = ?",
//       [1],
//       function (err) {
//         if (err) {
//           console.error("❌ Error deleting from suppliers:", err.message);
//           return;
//         }
//         console.log(`✅ Deleted ${this.changes} row(s) from suppliers`);
//       }
//     );
//   }
// );

          // Create the table after successfully dropping it
          db.run(
            `CREATE TABLE IF NOT EXISTS Supplier (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              location_id VARCHAR(255) NOT NULL,
              code TEXT NOT NULL,
              company VARCHAR(255) NOT NULL,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL,
              contact VARCHAR(255) NOT NULL,
              cnic VARCHAR(255) NOT NULL,
              city VARCHAR(255) NOT NULL,
              city_area VARCHAR(255) NOT NULL,
              coa_id VARCHAR(255) NULL,
              status VARCHAR(255) NOT NULL,
              deleted_at VARCHAR(255),
              created_at VARCHAR(255),
              updated_at VARCHAR(255)
            )`,
            (err) => {
              if (err) {
                console.error('❌ Error creating Supplier table:', err.message);
              } else {
                console.log('✅ Supplier table created successfully.');
              }
            }
          );
        
    

             db.run(
            `CREATE TABLE IF NOT EXISTS Sale_Discount (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              sale_id VARCHAR(255) NOT NULL,
              remarks TEXT NOT NULL,
              amount VARCHAR(255) NOT NULL,
              created_at VARCHAR(255),
              updated_at VARCHAR(255)
            )`,
            (err) => {
              if (err) {
                console.error('❌ Error creating Sale_Discount table:', err.message);
              } else {
                console.log('✅ Sale_Discount table created successfully.');
              }
            }
          );

// Create table
db.run(
  `CREATE TABLE chart_of_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    head_code TEXT NULL,
    location_id VARCHAR(255) NULL,
    head_name VARCHAR(255) NULL,
    parent_id VARCHAR(255) NULL,
    level VARCHAR(255) NULL,
    supplier_id INTEGER NULL,
    customer_id INTEGER NULL, -- NULL allowed
    deleted_at VARCHAR(255),
    created_at VARCHAR(255),
    updated_at VARCHAR(255),
    FOREIGN KEY (supplier_id) REFERENCES Supplier(id)
  )`,
  (err) => {
    if (err) {
      console.error('❌ Error creating chart_of_accounts table:', err.message);
    } else {
      console.log('✅ chart_of_accounts table created successfully.');
    }
  }
);

// Insert data



// Create purchase table
db.run(
    `CREATE TABLE IF NOT EXISTS purchase (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      location_id VARCHAR(255) NOT NULL,
      tax_id VARCHAR(255),
      invoice_no VARCHAR(255) NOT NULL,
      voucher_no VARCHAR(255) NOT NULL,
      purchase_date VARCHAR(255),
      amount VARCHAR(255),
      tax VARCHAR(255),
      payment_status VARCHAR(255),
      user_id VARCHAR(255),
      deleted_at VARCHAR(255),
      created_at VARCHAR(255),
      updated_at VARCHAR(255),
    soft_delete TEXT,
      FOREIGN KEY (supplier_id) REFERENCES Supplier(id)
    )`,
    (err) => {
      if (err) {
        console.error('❌ Error creating purchase table:', err.message);
      } else {
        console.log('✅ purchase table created successfully.');
      }
    }
  );

db.run(
  `CREATE TABLE IF NOT EXISTS draft_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_session TEXT,        
    user_id INTEGER,
    location_id INTEGER,
    product_id INTEGER,
    unit_name TEXT,
    quantity REAL,
    retail REAL,
    discount REAL,
    status TEXT,
    created_at TEXT,
    draft_name TEXT
  );`,
  (err) => {
    if (err) {
      console.error('❌ Error creating draft_orders table:', err.message);
    } else {
      console.log('✅ draft_orders table created successfully with draft_name column.');
    }
  }
);
db.run(`
  CREATE TABLE IF NOT EXISTS sale_return (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    location_id TEXT NOT NULL,
    customer_id TEXT,
    user_id TEXT,
   
    voucher_no TEXT,
    sale_date TEXT,
    sale_return_date REAL,
    amount REAL,
    narration TEXT,
    created_at REAL,
    updated_at REAL,z
    deleted_at REAL,
    soft_delete TEXT,
    FOREIGN KEY (sale_id) REFERENCES Sale(id)
  );
`, (err) => {
  if (err) {
    console.error(' Error creating sale_return table:', err.message);
  } else {
    console.log(' sale_return table created successfully.');
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'active'
  )
`, (err) => {
  if (err) {
    console.error('❌ Error creating users table:', err.message);
  } else {
    console.log('✅ users table created successfully.');

    // Insert a default superadmin user if not exists
    const insertSuperAdmin = `
      INSERT OR IGNORE INTO users (location_id, name, email, role, password, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const bcrypt = require('bcrypt');
    const hashedPassword = bcrypt.hashSync('admin123', 10); // Replace with a secure password

    db.run(
      insertSuperAdmin,
      [1, 'Super Admin', 'superadmin@gmail.com', 'superadmin', hashedPassword, 'active'],
      (err) => {
        if (err) {
          console.error('❌ Error inserting superadmin:', err.message);
        } else {
          console.log('✅ Superadmin user inserted (if not already present).');
        }
      }
    );
  }
});


db.run(`
  CREATE TABLE IF NOT EXISTS license (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    issue_date date,
    expiry_date date
  )
`, (err) => {
  if (err) console.error('❌ Error creating license table:', err.message);
  else console.log('✅ license table created successfully.');
});

// Drop table if exists, then create it again


db.run(`
  CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
  )
`, (err) => {
  if (err) console.error('❌ Error creating modules table:', err.message);
  else console.log('✅ modules table created successfully.');
});


db.run(`
  CREATE TABLE IF NOT EXISTS module_assign_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (module_id) REFERENCES modules(id)
  )
`, (err) => {
  if (err) console.error(' Error creating module_assign_user table:', err.message);
  else console.log('module_assign_user table created successfully.');
});
db.run(`
  CREATE TABLE IF NOT EXISTS sale_return_detail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id TEXT,
    sale_return_id INTEGER,
    sale_id INTEGER,
    product_id INTEGER,
    amount REAL,
    quantity REAL,
    discount REAL,
    net_amount REAL,
    tax REAL,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT,
    soft_delete TEXT,
    FOREIGN KEY (sale_return_id) REFERENCES sale_return(id),
    FOREIGN KEY (sale_id) REFERENCES sale(id),
    FOREIGN KEY (product_id) REFERENCES product(id)
  )
`, (err) => {
  if (err) {
    console.error(' Error creating sale_return_detail table:', err.message);
  } else {
    console.log('sale_return_detail table created successfully.');
  }
});

  db.run(
    `CREATE TABLE IF NOT EXISTS purchase_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER,
  location_id TEXT NOT NULL,
  category_id TEXT,
  sub_category_id TEXT,
  product_id INTEGER,
  tax_id TEXT,
  barcode TEXT,
  purchase_amount NULL,
  quantity REAL,
  tax_type TEXT,
  tax REAL,
  retail_price NULL,
  discount REAL,
  net_amount REAL,
  deleted_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  soft_delete TEXT,
  FOREIGN KEY (purchase_id) REFERENCES purchase(id),
  FOREIGN KEY (product_id) REFERENCES product(id)
);
`,
    (err) => {
      if (err) {
        console.error('❌ Error creating purchase_detail table:', err.message);
      } else {
        console.log('✅ purchase_detail table created successfully.');
      }
    }
  );

db.run(`CREATE TABLE IF NOT EXISTS purchase_return_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER,
  purchase_id INTEGER,
  purchase_return_id INTEGER,
  product_id INTEGER,
  purchase_amount REAL,
  quantity REAL,
  net_amount REAL,
  deleted_at TEXT,
  updated_at TEXT,
  soft_delete INTEGER,
  created_at TEXT,
  FOREIGN KEY (purchase_id) REFERENCES purchase(id),
  FOREIGN KEY (product_id) REFERENCES product(id),
  FOREIGN KEY (purchase_return_id) REFERENCES purchase_return(id)
)`,
  (err) => {
    if (err) {
      console.error('❌ Error creating purchase_return_detail table:', err.message);
    } else {
      console.log('✅ purchase_return_detail table created successfully.');
    }
  }
);
//expense & expense_detail
db.run(`CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER,
  voucher_no TEXT,
  date TEXT,
  paid_from TEXT,
  user_id INTEGER,
  deleted_at TEXT,
  updated_at TEXT,
  soft_delete INTEGER,
  created_at TEXT
)`,

    (err) => {
      if (err) {
        console.error('❌ Error creating expenses table:', err.message);
      } else {
        console.log('✅ expenses table created successfully.');
      }
    });

db.run(`CREATE TABLE expense_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER,
  location_id INTEGER,
 remarks INTEGER,
  amount INTEGER
  deleted_at TEXT,
  updated_at TEXT,
  soft_delete INTEGER,
  created_at TEXT
)`,
    (err) => {
      if (err) {
        console.error('❌ Error creating expenses_details table:', err.message);
      } else {
        console.log('✅ expenses_details table created successfully.');
      }
    });

db.run(`CREATE TABLE cash_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER,
voucher_no TEXT,
date TEXT,
paid_from TEXT,
 user_id TEXT,
 amount TEXT,
   deleted_at TEXT,
  updated_at TEXT,
  soft_delete INTEGER,
  created_at TEXT
)`,
    (err) => {
      if (err) {
        console.error('❌ Error creating Cash Payments table:', err.message);
      } else {
        console.log('✅ Cash Payments  table created successfully.');
      }
    });
    

    db.run(`CREATE TABLE cash_received(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER,
voucher_no TEXT,
date TEXT,
received_in TEXT,
 user_id TEXT,
 amount TEXT,
   deleted_at TEXT,
  updated_at TEXT,
  soft_delete INTEGER,
  created_at TEXT
)`,
    (err) => {
      if (err) {
        console.error('❌ Error creating Cash received table:', err.message);
      } else {
        console.log('✅ Cash received table created successfully.');
      }
    });



        db.run(`CREATE TABLE cash_received_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER,
cash_received_id TEXT,
customer_id TEXT,
remarks TEXT,
 amount TEXT,
   deleted_at TEXT,
  updated_at TEXT,
  soft_delete INTEGER,
  created_at TEXT
)`,
    (err) => {
      if (err) {
        console.error('❌ Error creating Cash received Details table:', err.message);
      } else { 
        console.log('✅ Cash received Detail table created successfully.');
      }
    });
    db.run(`CREATE TABLE cash_payment_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER,
cash_payment_id TEXT,
supplier_id TEXT,
remarks TEXT,
 amount TEXT,
   deleted_at TEXT,
  updated_at TEXT,
  soft_delete INTEGER,
  created_at TEXT
)`,
    (err) => {
      if (err) {
        console.error('❌ Error creating Cash Payments Details table:', err.message);
      } else {
        console.log('✅ Cash Payments Detail table created successfully.');
      }
    });
db.run(`CREATE TABLE purchase_return (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER,
  location_id INTEGER,
  supplier_id INTEGER,
  invoice_no TEXT,
  voucher_no TEXT,
  purchase_date TEXT,
  return_date TEXT,
  amount REAL,
  narration TEXT,
  user_id INTEGER,
  deleted_at TEXT,
  updated_at TEXT,
  soft_delete INTEGER,
  created_at TEXT
)`,
    (err) => {
      if (err) {
        console.error('❌ Error creating purchase_return table:', err.message);
      } else {
        console.log('✅ purchase_return table created successfully.');
      }
    });
db.run(
  `CREATE TABLE IF NOT EXISTS sale_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    location_id INTEGER,
    barcode TEXT,
    purchase_id INTEGER,
    sub_category_id INTEGER,
    category_id INTEGER,
    product_id INTEGER NOT NULL,
    retail REAL NOT NULL,
    quantity INTEGER NOT NULL,
    tax_type INTEGER DEFAULT 0,  -- 0=Inclusive, 1=Exclusive
    tax REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    net_amount REAL,
    created_at TEXT,
    updated_at TEXT
  )`,
  (err) => {
    if (err) {
      console.error('❌ Error creating sale_details table:', err.message);
    } else {
      console.log('✅ sale_details table created successfully.');

      // Add returned_quantity column after table creation
      db.run(`ALTER TABLE sale_details ADD COLUMN returned_quantity INTEGER DEFAULT 0`, (err) => {
        if (err) {
          if (err.message.includes("duplicate column name")) {
            console.log("⚠️ Column 'returned_quantity' already exists, skipping...");
          } else {
            console.error("❌ Error adding returned_quantity column:", err.message);
          }
        } else {
          console.log("✅ returned_quantity column added successfully.");
        }
      });
    }
  }
);

  db.run(
    ` CREATE TABLE purchase_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    location_id INTEGER,
    purchase_id INTEGER,
    purchase_return_id INTEGER,
    sale_id INTEGER,
    sale_return_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    process TEXT,
    purchase_detail_id INTEGER,
    sale_detail_id INTEGER,
    sale_return_detail_id INTEGER,
    created_at TEXT,
    updated_at TEXT,
soft_delete TEXT
    )`,
    (err) => {
      if (err) {
        console.error('❌ Error creating purchase_stock table:', err.message);
      } else {
        console.log('✅ purchase_stock table created successfully.');
      }
    }
  );
  db.run(
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    location_id INTEGER,
    product_id INTEGER, 
    purchase_id INTEGER,
    sale_id INTEGER,
    sale_detail_id INTEGER,
    retail TEXT,
    quantity INTEGER,
    tax_type TEXT,
    tax TEXT,
    discount TEXT,
    net_amount TEXT,
    deleted_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    soft_delete TEXT
  )`,
  (err) => {
    if (err) {
      console.error('❌ Error creating orders table:', err.message);
    } else {
      console.log('✅ orders table created successfully.');
    }
  }
);

db.run(
  `CREATE TABLE IF NOT EXISTS customer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    company TEXT,
    cnic TEXT,
    mobile TEXT, 
    email TEXT, 
    land_line TEXT, 
    city TEXT, 
    status TEXT,
    credit_limit TEXT,
    deleted_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    soft_delete TEXT
  )`,
  (err) => {
    if (err) {
      console.error('Error creating Customer table:', err.message);
    } else {
      console.log('Customer table created successfully.');
    }
  }
);


  db.run(
  `CREATE TABLE IF NOT EXISTS sale (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    location_id INTEGER,
    invoice_no INTEGER,
    sale_date INTEGER, 
    amount INTEGER,
    discount INTEGER,
   payment_status INTEGER,
    user_id TEXT,
   fbr_invoice INTEGER,

    deleted_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    soft_delete TEXT
  )`,
  (err) => {
    if (err) {
      console.error('Error creating Sale table:', err.message);
    } else {
      console.log('Sale table created successfully.');
    }
  }
);
 



db.run(
    `CREATE TABLE IF NOT EXISTS "Transaction" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id VARCHAR(255) NOT NULL,
      type VARCHAR(255),
      type_id VARCHAR(255),
      user_id VARCHAR(255),
      date TEXT,
      deleted_at TEXT,
      created_at TEXT,
      updated_at TEXT,
soft_delete TEXT
    )`,
    (err) => {
      if (err) {
        console.error('❌ Error creating Transaction table:', err.message);
      } else {
        console.log('✅ Transaction table created successfully.');
      }
    }
  );
  

  

  db.run(
    `CREATE TABLE IF NOT EXISTS "Transaction_details" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id VARCHAR(255) NOT NULL,
      transaction_details VARCHAR(255),
      v_id VARCHAR(255),
      coa_id VARCHAR(255),
       narration VARCHAR(255),
      debit TEXT,
      credit TEXT,
soft_delete TEXT
    
    )`,
    (err) => {
      if (err) {
        console.error(' Error creating Transaction Detail table:', err.message);
      } else {
        console.log(' Transaction Detail table created successfully.');
      }
    }
  );
});


module.exports = db;