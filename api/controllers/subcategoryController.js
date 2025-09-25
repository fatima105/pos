// controllers/SubCategoryController.js
const db = require('../db');

exports.getAllSubCategory = (req, res) => {
db.all(`
    SELECT 
        SubCategory.id,
        SubCategory.category_id,
        SubCategory.name,
        SubCategory.description,
        SubCategory.status,
        Category.name AS category_name
    FROM 
        SubCategory
    INNER JOIN 
        Category ON SubCategory.category_id = Category.id
    ORDER BY 
        SubCategory.id DESC
`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ SubCategory: rows, status: "true" });
});

};
exports.getSubCategoriesByCategory = (req, res) => {
    const categoryId = req.params.id;
    console.log('Category ID:', categoryId);
    // Ensure that category_id is provided
    if (!categoryId) {
        return res.status(400).json({ error: 'Category ID is required' });
    }

    // Query the database for SubCategories with the given category_id
    db.all('SELECT * FROM SubCategory WHERE category_id = ?', [categoryId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Respond with the retrieved subcategories and the category_id
        res.json({
            category_id: categoryId,
            SubCategory: rows,
            status: "true"
        });
    });
};



exports.getOneSubCategory = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM SubCategory WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'SubCategory not found' });
        res.json(row);

    });
};

exports.updateSubCategory = (req, res) => {
    const { name,category_id, status,description, id } = req.body;

    const sql = 'UPDATE SubCategory SET name = ?,category_id=?,description=?, status = ? WHERE id = ?';

    db.run(sql, [name,category_id,description, status, id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'SubCategory not updated' });
        return res.status(200).json({ message: 'SubCategory updated successfully', status: "success" });
    });
};

exports.addSubCategory = (req, res) => {
    const { name,category_id,description, status } = req.body;

    db.run('INSERT INTO SubCategory (name,category_id,description, status) VALUES (?,?, ?,?)', [name,category_id,description, status], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID,status:"success" });
    });
};
