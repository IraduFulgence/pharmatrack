export interface ReceiptData {
  pharmacy: {
    name: string;
    phone: string;
    email: string;
    tin?: string;
    address?: string;
  };
  receiptNumber: string;
  transactionDate: string;
  pharmacistName: string;
  customer: {
    name: string;
    phone?: string;
    type: string;
  };
  paymentCategory: 'PRIVATE' | 'INSURANCE';
  insurance?: {
    providerName: string;
    providerCode: string;
    cardNumber: string;
    claimNumber?: string;
  };
  items: Array<{
    medicineName: string;
    strength?: string;
    dosageForm?: string;
    batchNumber: string;
    expiryDate?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    isInsuranceCovered: boolean;
    coveragePercentage: number;
    insuranceContribution: number;
    patientContribution: number;
  }>;
  financials: {
    grossTotal: number;
    discountAmount: number;
    netTotal: number;
    insuranceContribution: number;
    patientContribution: number;
    amountPaid: number;
    outstandingBalance: number;
    changeAmount: number;
    currency: string;
  };
  paymentMethod: string;
  paymentReference?: string;
  paymentStatus: string;
  saleStatus: string;
  prescriptionReference?: string;
}

/**
 * Format currency with RWF symbol and comma thousand separators
 */
export function formatRwf(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return `${rounded.toLocaleString('en-US')} RWF`;
}

/**
 * Generate a printable, responsive HTML receipt for browser printing / PDF generation
 */
export function generateHtmlReceipt(data: ReceiptData): string {
  const { pharmacy, customer, financials, items, insurance } = data;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 6px 4px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.medicineName}</strong> ${item.strength ? `(${item.strength})` : ''}
          <div style="font-size: 11px; color: #6b7280;">Batch: ${item.batchNumber}${item.expiryDate ? ` | Exp: ${item.expiryDate}` : ''}</div>
          ${
            data.paymentCategory === 'INSURANCE'
              ? `<div style="font-size: 10px; color: #059669;">${item.isInsuranceCovered ? `Covered (${item.coveragePercentage}%)` : 'Not Covered'}</div>`
              : ''
          }
        </td>
        <td style="padding: 6px 4px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
        <td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #e5e7eb;">${formatRwf(item.unitPrice)}</td>
        <td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${formatRwf(item.subtotal)}</td>
      </tr>
    `,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${data.receiptNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #1f2937; background: #fff; }
    .receipt-container { max-width: 480px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { text-align: center; border-bottom: 2px dashed #d1d5db; padding-bottom: 16px; margin-bottom: 16px; }
    .pharmacy-name { font-size: 20px; font-weight: bold; color: #111827; }
    .pharmacy-info { font-size: 12px; color: #4b5563; margin-top: 4px; }
    .receipt-title { font-size: 16px; font-weight: bold; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; }
    .meta-table { width: 100%; font-size: 12px; margin-bottom: 16px; }
    .meta-table td { padding: 3px 0; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    .items-table th { background: #f3f4f6; padding: 6px 4px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 11px; text-transform: uppercase; color: #4b5563; }
    .summary-table { width: 100%; font-size: 12px; border-top: 2px dashed #d1d5db; padding-top: 12px; margin-bottom: 16px; }
    .summary-table td { padding: 4px 0; }
    .total-row { font-size: 15px; font-weight: bold; border-top: 1px solid #111827; border-bottom: 1px solid #111827; padding: 6px 0 !important; color: #111827; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-paid { background: #d1fae5; color: #065f46; }
    .badge-partial { background: #fef3c7; color: #92400e; }
    .footer { text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 16px; }
    @media print {
      body { padding: 0; }
      .receipt-container { border: none; box-shadow: none; padding: 0; width: 100%; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="pharmacy-name">${pharmacy.name}</div>
      <div class="pharmacy-info">${pharmacy.address || 'Kigali, Rwanda'}</div>
      <div class="pharmacy-info">Phone: ${pharmacy.phone} | Email: ${pharmacy.email}</div>
      ${pharmacy.tin ? `<div class="pharmacy-info">TIN: ${pharmacy.tin}</div>` : ''}
      <div class="receipt-title">Official Medical Sales Receipt</div>
    </div>

    <table class="meta-table">
      <tr>
        <td><strong>Receipt No:</strong> ${data.receiptNumber}</td>
        <td style="text-align: right;"><strong>Date:</strong> ${data.transactionDate}</td>
      </tr>
      <tr>
        <td><strong>Customer:</strong> ${customer.name}</td>
        <td style="text-align: right;"><strong>Category:</strong> ${data.paymentCategory}</td>
      </tr>
      ${customer.phone ? `<tr><td><strong>Phone:</strong> ${customer.phone}</td><td style="text-align: right;"><strong>Pharmacist:</strong> ${data.pharmacistName}</td></tr>` : `<tr><td colspan="2"><strong>Pharmacist:</strong> ${data.pharmacistName}</td></tr>`}
      ${data.prescriptionReference ? `<tr><td colspan="2"><strong>Prescription Ref:</strong> ${data.prescriptionReference}</td></tr>` : ''}
      ${
        insurance
          ? `<tr>
              <td><strong>Insurance:</strong> ${insurance.providerName}</td>
              <td style="text-align: right;"><strong>Card No:</strong> ${insurance.cardNumber}</td>
            </tr>
            ${insurance.claimNumber ? `<tr><td colspan="2"><strong>Claim Ref:</strong> ${insurance.claimNumber}</td></tr>` : ''}`
          : ''
      }
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item / Batch</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <table class="summary-table">
      <tr>
        <td>Gross Medicine Total:</td>
        <td style="text-align: right; font-weight: 500;">${formatRwf(financials.grossTotal)}</td>
      </tr>
      ${
        financials.discountAmount > 0
          ? `<tr>
              <td>Discount Applied:</td>
              <td style="text-align: right; color: #dc2626;">-${formatRwf(financials.discountAmount)}</td>
            </tr>
            <tr>
              <td>Net Payable:</td>
              <td style="text-align: right; font-weight: 500;">${formatRwf(financials.netTotal)}</td>
            </tr>`
          : ''
      }
      ${
        data.paymentCategory === 'INSURANCE'
          ? `<tr>
              <td>Insurance Contribution:</td>
              <td style="text-align: right; color: #059669; font-weight: 600;">-${formatRwf(financials.insuranceContribution)}</td>
            </tr>
            <tr>
              <td><strong>Patient Co-Payment:</strong></td>
              <td style="text-align: right; font-weight: 700; color: #111827;">${formatRwf(financials.patientContribution)}</td>
            </tr>`
          : ''
      }
      <tr class="total-row">
        <td><strong>Total Due:</strong></td>
        <td style="text-align: right;"><strong>${formatRwf(data.paymentCategory === 'INSURANCE' ? financials.patientContribution : financials.netTotal)}</strong></td>
      </tr>
      <tr>
        <td>Amount Paid (${data.paymentMethod}):</td>
        <td style="text-align: right; font-weight: 600;">${formatRwf(financials.amountPaid)}</td>
      </tr>
      ${
        financials.outstandingBalance > 0
          ? `<tr>
              <td style="color: #dc2626; font-weight: bold;">Outstanding Balance:</td>
              <td style="text-align: right; color: #dc2626; font-weight: bold;">${formatRwf(financials.outstandingBalance)}</td>
            </tr>`
          : ''
      }
      ${
        financials.changeAmount > 0
          ? `<tr>
              <td>Change Returned:</td>
              <td style="text-align: right;">${formatRwf(financials.changeAmount)}</td>
            </tr>`
          : ''
      }
      <tr>
        <td>Payment Status:</td>
        <td style="text-align: right;"><span class="badge ${financials.outstandingBalance > 0 ? 'badge-partial' : 'badge-paid'}">${data.paymentStatus}</span></td>
      </tr>
    </table>

    <div class="footer">
      <div>Thank you for choosing ${pharmacy.name}.</div>
      <div style="margin-top: 4px;">Medicines dispensed cannot be returned once unsealed. Keep in a dry, cool place.</div>
      <div style="margin-top: 6px; font-size: 10px; color: #9ca3af;">Generated automatically by PharmTrack Pharmacy System</div>
    </div>
  </div>
</body>
</html>`;
}

