// controllers/ProductController.js
const db = require('../db');
exports.getAllProducts = (req, res) => {
  const query = `
    SELECT 
      Product.id,
      Product.name,
      Product.description,
      Product.SKU,
      Product.tax,
      Product.retail_price,
      Product.status,
      Category.name AS category_name,
      SubCategory.name AS sub_category_name,
      Unit.name AS unit_name,
      COALESCE(SUM(purchase_stocks.quantity), 0) AS available_products
    FROM Product
    LEFT JOIN Category ON Product.category_id = Category.id
    LEFT JOIN SubCategory ON Product.sub_category_id = SubCategory.id
    LEFT JOIN Unit ON Product.Unit = Unit.id
    LEFT JOIN purchase_stocks ON purchase_stocks.product_id = Product.id
    GROUP BY Product.id
    ORDER BY Product.id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ Product: rows, status: "true" });
  });
};



exports.getOneProduct = (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!id || isNaN(id)) {
    console.log("Invalid product ID:", id); // 👈 log invalid ID
    return res.status(400).json({ error: "Invalid product ID" });
  }

  console.log("Fetching product with ID:", id); // 👈 check incoming ID

  db.get(
    `
    SELECT 
      p.*, 
      u.name AS unit_name
    FROM Product p
    LEFT JOIN Unit u ON p.Unit = u.id
    WHERE p.id = ?
    `,
    [id],
    (err, productRow) => {
      if (err) {
        console.error("Database error:", err); // 👈 log DB error
        return res.status(500).json({ error: "Database error" });
      }

      if (!productRow) {
        console.log("Product not found for ID:", id); // 👈 log not found
        return res.status(404).json({ error: "Product not found" });
      }

      console.log("Product row:", productRow); // 👈 log product data

      // Now run your avgQuery
      const avgQuery = `
        SELECT 
            AVG(purchase_amount) AS averageAmount,
            SUM(purchase_amount) AS totalAmount,
            COUNT(*) AS totalEntries
        FROM (
            SELECT purchase_amount
            FROM purchase_detail 
            WHERE product_id = ?
            ORDER BY created_at DESC
            LIMIT 2
        ) AS recent_purchases
      `;

      db.get(avgQuery, [id], (err, resultRow) => {
        if (err) {
          console.error(
            "Database error while calculating average:",
            err
          ); // 👈 log error in avgQuery
          return res.status(500).json({
            error: "Database error while calculating average",
          });
        }

        console.log("Average query result:", resultRow); // 👈 log average query result

        const totalAmount = resultRow.totalAmount || 0;
        const totalEntries = resultRow.totalEntries || 0;
        const average = totalEntries > 0 ? totalAmount / totalEntries : 0;

        productRow.average_purchase_amount = Number(average.toFixed(2));
        productRow.total_purchases = totalEntries;
        productRow.total_amount = totalAmount;

        console.log("Final product response:", productRow); // 👈 log final response

        res.json(productRow);
      });
    }
  );
};

// Controller Method
exports.getOneSku = (req, res) => {
  const { SKU } = req.params;
console.log(SKU);
  // ✅ Validate SKU
  if (!SKU) {
    return res.status(400).json({ error: 'Invalid product SKU' });
  }

  // ✅ Fetch product by SKU
  db.get('SELECT * FROM Product WHERE SKU = ?', [SKU], (err, productRow) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!productRow) {
      return res.status(404).json({ error: 'Productkj notff found' });
    }

    const productId = productRow.id;

    // ✅ Calculate average from last 2 purchase entries
    const avgQuery = `
      SELECT 
        AVG(purchase_amount) AS averageAmount,
        SUM(purchase_amount) AS totalAmount,
        COUNT(*) AS totalEntries
      FROM (
        SELECT purchase_amount
        FROM purchase_detail 
        WHERE product_id = ?
        ORDER BY created_at DESC
        LIMIT 2
      ) AS recent_purchases
    `;

    db.get(avgQuery, [productId], (err, resultRow) => {
      if (err) {
        console.error('Error calculating purchase average:', err);
        return res.status(500).json({ error: 'Error calculating average' });
      }

      const totalAmount = resultRow?.totalAmount || 0;
      const totalEntries = resultRow?.totalEntries || 0;
      const average = totalEntries > 0 ? totalAmount / totalEntries : 0;

      // Attach to response
      productRow.average_purchase_amount = Number(average.toFixed(2));
      productRow.total_purchases = totalEntries;
      productRow.total_amount = totalAmount;

      // ✅ Stock availability check
      const stockQuery = `
        SELECT SUM(quantity) AS total 
        FROM purchase_stocks 
        WHERE product_id = ?
      `;

      db.get(stockQuery, [productId], (err, stockRow) => {
        if (err) {
          console.error('Error checking stock:', err);
          return res.status(500).json({ error: 'Error checking stock availability' });
        }

        const availableStock = stockRow?.total || 0;
        productRow.stock_available = availableStock > 0;
        productRow.available_stock = availableStock;

        // ✅ Final response
        res.json(productRow);
      });
    });
  });
};





exports.deleteProduct = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM Product WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Product not found' });

        // Proceed to delete
        db.run('DELETE FROM Product WHERE id = ?', [id], function (deleteErr) {
            if (deleteErr) return res.status(500).json({ error: 'Failed to delete product' });

            return res.json({ message: 'Product deleted successfully', deletedProduct: row });
        });
    });
};

exports.updateProduct = (req, res) => {
  const {
    category_id,
    sub_category_id,
    unit_id,
    name,
    SKU,
    retail_price,
    tax,
    description,
    status,
    id
  } = req.body;
  console.log("🟢 unit_id received in request:", unit_id);
  // Check SKU uniqueness (except same product)
  const checkQuery = `SELECT id FROM Product WHERE SKU = ? AND id != ?`;
  db.get(checkQuery, [SKU, id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error while checking SKU' });
    }

    if (row) {
      // ⚠️ Duplicate found
      return res.status(400).json({ error: 'SKU already exists for another product' });
    }

    // No duplicates → update
    const sql = `
      UPDATE Product
      SET name = ?, category_id = ?, sub_category_id = ?, Unit = ?, SKU = ?, tax = ?, retail_price = ?, status = ?, description = ?
      WHERE id = ?
    `;

    const values = [name, category_id, sub_category_id, unit_id, SKU, tax, retail_price, status, description, id];

    db.run(sql, values, function (err) {
      if (err) return res.status(500).json({ error: 'Database error while updating' });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not updated (ID not found)' });

      return res.status(200).json({ message: 'Product updated successfully', status: "success" });
    });
  });
};


exports.addProduct = (req, res) => {
  const { category_id, SKU, sub_category_id, Unit, name, description, tax, retail_price, status } = req.body;

  db.get('SELECT * FROM Product WHERE SKU = ?', [SKU], (err, row) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error while checking for existing SKU.",
        errorCode: "DB_ERROR"
      });
    }

    if (row) {
      return res.status(400).json({
        success: false,
        message: "This SKU already exists.",
        errorCode: "DUPLICATE_SKU"
      });
    }

    db.run(
      'INSERT INTO Product (category_id, sub_category_id, Unit, name, description, SKU, tax, retail_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [category_id, sub_category_id, Unit, name, description, SKU, tax, retail_price, status],
      function (err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Error while inserting product.",
            errorCode: "INSERT_ERROR"
          });
        }

        res.status(201).json({
          success: true,
          message: "Product added successfully.",
          data: {
            id: this.lastID,
            SKU,
            name
          }
        });
      }
    );
  });
};

