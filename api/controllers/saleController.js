// controllers/SaleController.js
const db = require('../db');

exports.getAllSale = (req, res) => {
  const query = `
    SELECT 
      s.*,

      c.name AS customer_name 
    FROM 
      sale s
    LEFT JOIN 
      customer c ON s.customer_id = c.id

    ORDER BY 
      s.id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ Sale: rows });
  });
};

exports.getSpecificSaleDetail = (req, res) => {
  const { id } = req.params;
  console.log("➡️ API called: getSpecificSaleDetail with sale_id =", id);

  const query = `
    SELECT 
      sale.id AS sale_id,
      sale.invoice_no, 
      sale.customer_id,
      sale.sale_date,
      sale.amount,
      customer.name AS customer_name,

      sale_details.id AS sale_detail_id,
      sale_details.product_id,
      sale_details.returned_quantity,
      sale_details.quantity,
      sale_details.retail,
      sale_details.discount,
      sale_details.net_amount,

      Product.name AS product_name
    FROM 
      sale
    LEFT JOIN customer ON sale.customer_id = customer.id
    LEFT JOIN sale_details ON sale.id = sale_details.sale_id
    LEFT JOIN Product ON sale_details.product_id = Product.id
    WHERE sale.id = ?
    ORDER BY sale.id DESC
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching sale/sale_details:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!rows || rows.length === 0) {
      console.warn("⚠️ No sale found for id =", id);
      return res.status(404).json({ message: 'Sale not found' });
    }

    console.log("✅ Sale + Sale_Details fetched:", rows);

    const {
      invoice_no,
      sale_id,
      customer_id,
      customer_name,
      sale_date,
      amount
    } = rows[0];

    let totalDiscount = 0;

    // prepare product list (without purchase info yet)
    const products = rows.map(row => {
      const quantity = parseFloat(row.quantity) || 0;
      const discount = parseFloat(row.discount) || 0;
      const netAmount = parseFloat(row.net_amount) || 0;

      const adjustedNetAmount = netAmount - (discount * quantity);
      totalDiscount += discount;

      return {
        sale_detail_id: row.sale_detail_id,
        product_id: row.product_id,
        product_name: row.product_name,
        returned_quantity: row.returned_quantity,
        quantity: row.quantity,
        retail: row.retail,
        discount: row.discount,
        adjusted_net_amount: adjustedNetAmount.toFixed(2),
        purchase_detail_id: null,   // will be filled later
        purchase_amount: null       // will be filled later
      };
    });

    console.log("🛒 Products prepared:", products);

    const saleDetailIds = products.map(p => p.sale_detail_id).filter(Boolean);
    console.log("🔍 Sale_Detail_IDs for purchase_stocks lookup:", saleDetailIds);

    if (saleDetailIds.length === 0) {
      console.warn("⚠️ No sale_detail_ids found, returning sale only.");
      return res.json({
        sale_id,
        invoice_no,
        customer_id,
        customer_name,
        sale_date,
        amount,
        total_discount_from_table: totalDiscount.toFixed(2),
        products
      });
    }

    const stockQuery = `
      SELECT 
        ps.sale_detail_id, 
        ps.purchase_detail_id,
        pd.purchase_amount
      FROM purchase_stocks ps
      LEFT JOIN purchase_detail pd 
        ON ps.purchase_detail_id = pd.id
      WHERE ps.sale_detail_id IN (${saleDetailIds.map(() => '?').join(',')})
    `;

    console.log("📄 Executing stockQuery with params:", saleDetailIds);

    db.all(stockQuery, saleDetailIds, (err2, stockRows) => {
      if (err2) {
        console.error("❌ Error fetching purchase_stocks/purchase_detail:", err2.message);
        return res.status(500).json({ error: err2.message });
      }

      console.log("✅ Purchase_Stocks + Purchase_Detail fetched:", stockRows);

      // attach directly into product objects
      products.forEach(prod => {
        const match = stockRows.find(r => r.sale_detail_id === prod.sale_detail_id);
        if (match) {
          prod.purchase_detail_id = match.purchase_detail_id;
          prod.purchase_amount = match.purchase_amount;
          console.log(`🔗 Linked sale_detail_id ${prod.sale_detail_id} → purchase_detail_id ${match.purchase_detail_id}, purchase_amount ${match.purchase_amount}`);
        }
      });

      const result = {
        sale_id,
        invoice_no,
        customer_id,
        customer_name,
        sale_date,
        amount,
        total_discount_from_table: totalDiscount.toFixed(2),
        products
      };

      console.log("🚀 Final Response:", JSON.stringify(result, null, 2));
      res.json(result);
    });
  });
};



exports.getSaleReturnDisc=(req,res)=>{
    db.all('SELECT * FROM Sale_Discount ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ SaleReturnDiscount: rows });
    });
};
exports.getAllSaleDetails = (req, res) => {
    db.all('SELECT * FROM sale_details ORDER BY ID DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ SaleDetails: rows });
    });
};
exports.deleteSale = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM sale WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.json({ message: 'Sale deleted successfully' });
    });
};

exports.getOneSale = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM sale WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Sale not found' });
        res.json(row);
    });
};

exports.updateSale = (req, res) => {
    const { name,Sale_rate, status, id } = req.body;

    const sql = 'UPDATE sale SET name = ?, Sale_rate=? ,status = ? WHERE id = ?';

    db.run(sql, [name, Sale_rate, status, id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Sale not updated (ID not found)' });
        return res.status(200).json({ message: 'Sale updated successfully', status: "success" });
    });
};

exports.addSale = (req, res) => {
    const { name, status,Sale_rate } = req.body;

    db.run('INSERT INTO Sale (name, Sale_rate, status) VALUES (?, ?,?)', [name, Sale_rate, status], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID });
    });
};
exports.Return = (req, res) => {
    const { name, status,Sale_rate } = req.body;

    db.run('INSERT INTO Sale (name, Sale_rate, status) VALUES (?, ?,?)', [name, Sale_rate, status], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID });
    });
};