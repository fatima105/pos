// server.js
const express = require('express');
const cors = require('cors');

const unitRoutes = require('./routes/unitRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const taxRoutes = require('./routes/taxRoutes');
const productRoutes = require('./routes/productRoutes');
const subcategoryRoutes = require('./routes/subcategoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const ordersRoutes = require('./routes/ordersRoutes');
const saleReturnRoutes = require('./routes/saleReturnRoutes');
const saleRoutes= require('./routes/saleRoutes');
const customerRoutes = require('./routes/customerRoutes');
const purchaseReturnRoutes = require('./routes/purchaseReturnRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const CashPaymentRoutes = require('./routes/cashPaymentRoutes');
const cashJournalVoucher = require('./routes/cashJournalVoucherRoutes');
const  cashReceivedRoutes = require('./routes/cashReceivedRoutes');
const  Reports = require('./routes/Reports');
const importRoutes = require('./routes/Import'); 
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API server running.');
});

app.use('/api/import', importRoutes); 
// Mount routes
app.use('/api/Unit', unitRoutes);
// Mount routes
app.use('/api/Category', categoryRoutes);

app.use('/api/Tax', taxRoutes);

app.use('/api/SubCategory', subcategoryRoutes);
app.use('/api/Product', productRoutes);
app.use('/api/Supplier', supplierRoutes);
app.use('/api/Purchase', purchaseRoutes);
app.use('/api/Transaction', transactionRoutes);
app.use('/api/Order', ordersRoutes);
app.use('/api/Sale', saleRoutes);
app.use('/api/SaleReturn', saleReturnRoutes);
app.use('/api/Customer', customerRoutes);
app.use('/api/purchaseReturnRoutes',purchaseReturnRoutes);
app.use('/api/expenses', expenseRoutes); 
app.use('/api/CashPayment', CashPaymentRoutes); 
app.use('/api/CashReceived', cashReceivedRoutes); 
app.use('/api/CashJournalVoucher', cashJournalVoucher); 
app.use('/api/Reports', Reports); 
Reports.stack.forEach((r) => {
    if (r.route && r.route.path) {
        const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
        console.log(`${methods} /api/Reports${r.route.path}`);
    }
});
const PORT = 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
