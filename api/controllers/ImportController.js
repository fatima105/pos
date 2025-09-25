const fs = require("fs");
const csv = require("csv-parser");
const db = require("../db");
const PDFDocument = require("pdfkit");
const path = require("path");

// Main PDF Generation Export Function
// Main PDF Generation Export Function
exports.PdfGenerate = async (req, res) => {
  try {
    const filePath = req.file?.path;
    const supplier_id = req.body.supplier_id || req.body.supplier || 1;
    const head_code = req.body.head_code || req.body.headCode || '';

    if (!filePath) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    // Step 1: Parse CSV
    const csvData = await parseCSVFile(filePath);

    // Step 2: Compare with DB
    const comparisonResults = await compareWithDatabase(csvData, supplier_id, head_code);

    // Step 3: Generate PDF directly into response
    const fileName = `Import-Comparison-Report-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    doc.pipe(res); // ⬅️ directly stream to client

    // --- Your PDF content builder here ---
    doc.fontSize(18).font("Helvetica-Bold").text("Items Import Comparison Report", { align: "center" });
    doc.moveDown(1);

    let y = doc.y;
    const colWidths = [30, 160, 80, 160, 80];
    const rowHeight = 20;

    // Header row
    doc.fontSize(9).font("Helvetica-Bold");
    drawTableRow(doc, 30, y, colWidths, rowHeight, ["Sr.", "CSV Name", "CSV SKU", "Database Name", "Database SKU"], true, "#f0f0f0");
    y += rowHeight;

    doc.font("Helvetica").fontSize(8);

    for (const result of comparisonResults) {
      drawTableRow(doc, 30, y, colWidths, rowHeight, [
        result.serialNo,
        result.csvProduct.name,
        result.csvProduct.sku,
        result.dbProducts[0]?.name || "NEW PRODUCT",
        result.dbProducts[0]?.SKU || "N/A"
      ], true, result.hasConflict ? "#ffeeee" : "#ffffff");
      y += rowHeight;
    }

    doc.end();

    // Step 4: Cleanup temp file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  } catch (error) {
    console.error("❌ Error in PdfGenerate:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};


// Helper function to parse CSV file
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Handle different possible column names
        const csvProduct = {
          name: data['Old Name'] || data['PRODUCT_NAME'] || data['Product Name'] || data['name'] || data['Name'] || '',
          sku: data['CSV SKU'] || data['SKU'] || data['sku'] || data['Code'] || '',
          newName: data['New Name'] || data['NEW_NAME'] || '',
          // Add other fields that might be useful
          sale_price: data['SALE_PRICE'] || data['Sale Price'] || data['Price'] || '',
          cost_price: data['COST_PRICE'] || data['Cost Price'] || '',
          quantity: data['QUANTITY'] || data['Quantity'] || data['Qty'] || ''
        };
        
        // Only add if we have either name or SKU
        if (csvProduct.name.trim() || csvProduct.sku.trim()) {
          results.push(csvProduct);
        }
      })
      .on('end', () => {
        console.log(`✅ Successfully parsed ${results.length} products from CSV`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error("❌ Error parsing CSV:", error);
        reject(error);
      });
  });
}

// Helper function to compare CSV data with database
function compareWithDatabase(csvData, supplier_id, head_code) {
  return new Promise((resolve, reject) => {
    const comparisonResults = [];
    let pending = csvData.length;

    if (pending === 0) {
      return resolve(comparisonResults);
    }

    csvData.forEach((csvProduct, index) => {
      // Find matching products in database by SKU
      const skuQuery = `
        SELECT id, name, SKU, category_id, sub_category_id, retail_price, status 
        FROM Product 
        WHERE SKU = ? AND status = 'active'
      `;
      
      db.all(skuQuery, [csvProduct.sku], (err, productsBySKU) => {
        if (err) {
          console.error("❌ Error querying products by SKU:", err);
          comparisonResults.push({
            serialNo: index + 1,
            csvProduct: csvProduct,
            dbProducts: [],
            matchType: 'ERROR',
            hasConflict: false,
            error: err.message
          });
          pending--;
          if (pending === 0) resolve(comparisonResults);
          return;
        }

        // Find matching products by name
        const nameQuery = `
          SELECT id, name, SKU, category_id, sub_category_id, retail_price, status 
          FROM Product 
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND status = 'active'
        `;

        db.all(nameQuery, [csvProduct.name], (err, productsByName) => {
          if (err) {
            console.error("❌ Error querying products by name:", err);
            comparisonResults.push({
              serialNo: index + 1,
              csvProduct: csvProduct,
              dbProducts: [],
              matchType: 'ERROR',
              hasConflict: false,
              error: err.message
            });
            pending--;
            if (pending === 0) resolve(comparisonResults);
            return;
          }

          // Combine and deduplicate results
          const allDbProducts = deduplicateProducts([...productsBySKU, ...productsByName]);
          
          // Determine match type and conflicts
          const matchType = determineMatchType(csvProduct, allDbProducts);
          const hasConflict = checkForConflicts(csvProduct, allDbProducts);

          comparisonResults.push({
            serialNo: index + 1,
            csvProduct: csvProduct,
            dbProducts: allDbProducts,
            matchType: matchType,
            hasConflict: hasConflict
          });

          pending--;
          if (pending === 0) {
            // Sort results by serial number
            comparisonResults.sort((a, b) => a.serialNo - b.serialNo);
            resolve(comparisonResults);
          }
        });
      });
    });
  });
}

// Helper function to remove duplicate products
function deduplicateProducts(products) {
  const seen = new Set();
  return products.filter(product => {
    const key = `${product.id}-${product.SKU}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Helper function to determine match type
function determineMatchType(csvProduct, dbProducts) {
  if (dbProducts.length === 0) {
    return 'NEW_PRODUCT';
  }

  const exactSKUMatch = dbProducts.some(db => db.SKU === csvProduct.sku);
  const exactNameMatch = dbProducts.some(db => 
    db.name.toLowerCase().trim() === csvProduct.name.toLowerCase().trim()
  );

  if (exactSKUMatch && exactNameMatch) {
    return 'EXACT_MATCH';
  } else if (exactSKUMatch) {
    return 'SKU_MATCH';
  } else if (exactNameMatch) {
    return 'NAME_MATCH';
  } else {
    return 'PARTIAL_MATCH';
  }
}

// Helper function to check for conflicts
function checkForConflicts(csvProduct, dbProducts) {
  for (const dbProduct of dbProducts) {
    // Same SKU but different product name (conflict)
    if (dbProduct.SKU === csvProduct.sku && 
        dbProduct.name.toLowerCase().trim() !== csvProduct.name.toLowerCase().trim()) {
      return true;
    }
    
    // Same product name but different SKU (conflict)
    if (dbProduct.name.toLowerCase().trim() === csvProduct.name.toLowerCase().trim() && 
        dbProduct.SKU !== csvProduct.sku) {
      return true;
    }
  }
  return false;
}

// Helper function to generate PDF report
// Helper function to generate PDF report
function generateComparisonPDF(comparisonResults, supplier_id, head_code) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const fileName = `comparison-report-${Date.now()}.pdf`;

      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const filePath = path.join(tempDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(18).font('Helvetica-Bold')
         .text('Items Import Comparison Report', { align: 'center' });
      doc.moveDown(1);

      // Table setup
      const startX = 30;
      let currentY = doc.y;
      const colWidths = [30, 160, 80, 160, 80]; // wider name columns
      const rowHeight = 20;

      // Table header
      doc.fontSize(9).font('Helvetica-Bold');
      drawTableRow(doc, startX, currentY, colWidths, rowHeight, 
        ['Sr.', 'CSV Name', 'CSV SKU', 'Database Name', 'Database SKU'], 
        true, '#f0f0f0');

      currentY += rowHeight;
      doc.font('Helvetica').fontSize(8);

      // ✅ If no results, show a message row
      if (comparisonResults.length === 0) {
        drawTableRow(doc, startX, currentY, colWidths, rowHeight, [
          '', 
          'No duplicate records found', 
          '', 
          '', 
          ''
        ], true, '#e8f5e9'); // light green row
        currentY += rowHeight;

        doc.end();
        stream.on('finish', () => resolve(filePath));
        stream.on('error', (error) => reject(error));
        return; // stop here, no loop needed
      }

      // Rows loop (if results exist)
      for (const result of comparisonResults) {
        const csvProduct = result.csvProduct;
        const dbProducts = result.dbProducts;

        if (currentY > 750) {
          doc.addPage();
          currentY = 50;

          doc.fontSize(9).font('Helvetica-Bold');
          drawTableRow(doc, startX, currentY, colWidths, rowHeight, 
            ['Sr.', 'CSV Name', 'CSV SKU', 'Database Name', 'Database SKU'], 
            true, '#f0f0f0');
          currentY += rowHeight;
          doc.font('Helvetica').fontSize(8);
        }

        if (dbProducts.length === 0) {
          drawTableRow(doc, startX, currentY, colWidths, rowHeight, [
            result.serialNo.toString(),
            csvProduct.name,
            csvProduct.sku,
            'NEW PRODUCT',
            'N/A'
          ], true, result.hasConflict ? '#ffeeee' : '#ffffff');

          currentY += rowHeight;
        } else {
          let isFirstRow = true;
          for (const dbProduct of dbProducts) {
            drawTableRow(doc, startX, currentY, colWidths, rowHeight, [
              isFirstRow ? result.serialNo.toString() : '',
              isFirstRow ? csvProduct.name : '',
              isFirstRow ? csvProduct.sku : '',
              dbProduct.name,
              dbProduct.SKU
            ], true, result.hasConflict ? '#ffeeee' : '#ffffff');

            currentY += rowHeight;
            isFirstRow = false;
          }
        }
      }

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (error) => reject(error));

    } catch (error) {
      reject(error);
    }
  });
}



// Helper function to draw table rows
function drawTableRow(doc, startX, startY, colWidths, rowHeight, data, withBorder = true, backgroundColor = '#ffffff') {
  if (backgroundColor !== '#ffffff') {
    doc.fillColor(backgroundColor);
    doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill();
    doc.fillColor('black');
  }

  if (withBorder) {
    doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight).stroke();
  }

  let currentX = startX;
  for (let i = 0; i < data.length && i < colWidths.length; i++) {
    if (withBorder && i > 0) {
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke();
    }
    
    doc.text(data[i] || '', currentX + 2, startY + 5, { 
      width: colWidths[i] - 4,
      height: rowHeight - 10
    });
    
    currentX += colWidths[i];
  }
}




// ----------------- ADD IMPORT -----------------
exports.AddImport = (req, res) => {
  try {
    const filePath = req.file?.path;
    if (!filePath) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const cat_id = 1,
      sub_cat_id = 1,
      unit_id = 1,
      location_id = 1;

    const supplier_id = req.body.supplier || 1;
    const user_id = 1;
    const results = [];

    // Step 1: Create purchase record
    db.get(`SELECT id FROM purchase ORDER BY id DESC LIMIT 1`, (err, row) => {
      if (err) {
        console.error("❌ Error fetching purchase id:", err.message);
        return res.status(500).json({ error: err.message });
      }

      let v_num = row ? row.id + 1 : 1;
      const purchase_date = new Date().toISOString();
      const voucher_no = `PV-${v_num}`;
      const payment_status = "unpaid";
      const invoice_no = "78665";

      db.run(
        `INSERT INTO purchase 
          (supplier_id, location_id, invoice_no, voucher_no, purchase_date, amount, payment_status, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplier_id,
          location_id,
          invoice_no,
          voucher_no,
          purchase_date,
          0,
          payment_status,
          user_id,
        ],
        function (err) {
          if (err) {
            console.error("❌ Error inserting purchase:", err.message);
            return res.status(500).json({ error: err.message });
          }

          const purchase_id = this.lastID;
          console.log("✅ Created purchase with ID:", purchase_id);

          let grand_total = 0;
          const processed = [];

          // Step 2: Parse CSV
          fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => results.push(row))
            .on("end", () => {
              let pending = results.length;

              results.forEach((item) => {
                const { SKU, PRODUCT_NAME, SALE_PRICE, COST_PRICE, QUANTITY } = item;

                if (!SKU) {
                  pending--;
                  return;
                }

                db.get(
                  `SELECT id FROM Product WHERE SKU = ?`,
                  [SKU],
                  (err, existing) => {
                    if (err) {
                      console.error("❌ Error fetching product by SKU:", SKU, err.message);
                      pending--;
                      return;
                    }

                    const handleProduct = (product_id) => {
                      const quantity = parseFloat(QUANTITY || 0);
                      const cost_price = parseFloat(COST_PRICE || 0);
                      const sale_price = parseFloat(SALE_PRICE || 0);
                      const net_amount = quantity * cost_price;

                      grand_total += net_amount;

                      db.run(
                        `INSERT INTO purchase_detail
                          (purchase_id, location_id, category_id, sub_category_id, product_id, barcode, purchase_amount, quantity, retail_price, net_amount, created_at, updated_at, soft_delete)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)`,
                        [
                          purchase_id,
                          location_id,
                          cat_id,
                          sub_cat_id,
                          product_id,
                          SKU,
                          cost_price,
                          quantity,
                          sale_price,
                          net_amount,
                        ],
                        function (err) {
                          if (err) {
                            console.error("❌ Error inserting purchase_detail:", err.message);
                            pending--;
                            return;
                          }

                          const purchase_detail_id = this.lastID;

                          db.run(
                            `INSERT INTO purchase_stocks
                              (purchase_id, purchase_detail_id, product_id, quantity, created_at)
                             VALUES (?, ?, ?, ?, datetime('now'))`,
                            [purchase_id, purchase_detail_id, product_id, quantity],
                            function (err) {
                              if (err) {
                                console.error("❌ Error inserting purchase_stock:", err.message);
                              } else {
                                console.log("✅ Purchase stock inserted ID:", this.lastID);
                              }
                            }
                          );

                          processed.push({ product_id, SKU, status: "linked" });

                          pending--;
                    if (pending === 0) {
  db.run(
    `UPDATE purchase SET amount = ? WHERE id = ?`,
    [grand_total, purchase_id],
    function (err) {
      if (err) {
        console.error("❌ Error updating purchase amount:", err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log("✅ Purchase amount updated:", grand_total);

      // Insert into Transactions
      const txnDate = new Date().toISOString();
      db.run(
        `INSERT INTO "Transaction" 
          (location_id, type, type_id, user_id, date, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [location_id, "Purchase Through Excel", purchase_id, user_id, txnDate],
        function (err) {
          if (err) {
            console.error("❌ Error inserting transaction:", err.message);
            return res.status(500).json({ error: err.message });
          }

          const transactionId = this.lastID;
          console.log("✅ Transaction inserted ID:", transactionId);

          // Start accounting entries
          db.run("BEGIN", () => {
            const getInventoryHeadCodeSql =
              `SELECT head_code FROM chart_of_accounts WHERE head_name = 'Inventory'`;

            db.get(getInventoryHeadCodeSql, (err, inventoryRow) => {
              if (err || !inventoryRow) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: "Inventory head_code error", details: err?.message || "Not found" });
              }

              const inventoryHeadCode = inventoryRow.head_code;
              const insertDetailsSql = `
                INSERT INTO transaction_details 
                (location_id, transaction_details, v_id, coa_id, narration, debit, credit)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `;

              // Debit Inventory
              db.run(
                insertDetailsSql,
                [location_id, 'null', transactionId, inventoryHeadCode, "Purchase Items", grand_total, 0],
                function (errInventory) {
                  if (errInventory) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: "Failed to insert inventory transaction", details: errInventory.message });
                  }

                  // Credit Supplier
                  const getSupplierHeadCodeSql = `SELECT head_code FROM chart_of_accounts WHERE supplier_id = ?`;
                  db.get(getSupplierHeadCodeSql, [supplier_id], (errSupplier, supplierRow) => {
                    if (errSupplier || !supplierRow) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: "Supplier head_code error", details: errSupplier?.message || "Not found" });
                    }

                    const supplierHeadCode = supplierRow.head_code;
                    db.run(
                      insertDetailsSql,
                      [location_id, null, transactionId, supplierHeadCode, "Purchase Items through excel", 0, grand_total],
                      function (errCredit) {
                        if (errCredit) {
                          db.run("ROLLBACK");
                          return res.status(500).json({ error: "Failed to insert supplier credit", details: errCredit.message });
                        }

                        db.run("COMMIT");
                        return res.status(201).json({
                          success: true,
                          message: "Import + Accounting completed",
                          purchase_id,
                          transaction_id: transactionId,
                          total_rows: results.length,
                          grand_total,
                          processed,
                        });
                      }
                    );
                  });
                }
              );
            });
          });
        }
      );
    }
  );
}

                        }
                      );
                    };

                    if (existing) {
                      handleProduct(existing.id);
                    } else {
                      db.run(
                        `INSERT INTO Product 
                          (category_id, sub_category_id, Unit, name, description, SKU, tax, retail_price, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                          cat_id,
                          sub_cat_id,
                          unit_id,
                          PRODUCT_NAME,
                          PRODUCT_NAME,
                          SKU,
                          "0",
                          SALE_PRICE || 0,
                          "active",
                        ],
                        function (err) {
                          if (err) {
                            console.error("❌ Error inserting product:", PRODUCT_NAME, err.message);
                            pending--;
                            return;
                          }
                          handleProduct(this.lastID);
                        }
                      );
                    }
                  }
                );
              });
            });
        }
      );
    });
  } catch (error) {
    console.error("❌ Caught exception in AddImport:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

