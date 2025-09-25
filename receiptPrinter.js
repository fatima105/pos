function printReceipt(data, products,paymentToInput) {
  const totalDiscount = products.reduce((sum, p) => sum + (p.discount || 0), 0);

  let receiptWindow = window.open('', '_blank');

  let receiptHTML = `
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            padding: 10px;
            font-size: 14px;
          }
          h2 {
            text-align: center;
            margin-bottom: 0;
          }
          p {
            text-align: center;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
          }
          .summary {
            margin-top: 10px;
            text-align: right;
          }
          hr {
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <h2>Sale Receipt</h2>
        <p><strong>Invoice No:</strong> ${data.invoiceNo}</p>
        <hr />
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Disc</th>
            </tr>
          </thead>
          <tbody>
            ${products.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${p.quantity}</td>
                <td>${p.price}</td>
                <td>${p.discount}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: left; padding: 15px;">
                <div class="summary">
                  <h3>Total: ${paymentToInput}</h3>
                  <h3>Total Discount: ${totalDiscount}</h3>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>

        <script>
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
    </html>
  `;

  receiptWindow.document.open();
  receiptWindow.document.write(receiptHTML);
  receiptWindow.document.close();
}
