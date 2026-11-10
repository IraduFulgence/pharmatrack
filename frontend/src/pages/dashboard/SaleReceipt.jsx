import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Printer, ArrowLeft, Loader2, AlertCircle, 
  CheckCircle2, Pill, MapPin, Phone, Calendar 
} from 'lucide-react';
import { salesService } from '../../services/salesService';
const SaleReceipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [receipt, setReceipt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReceipt();
  }, [id]);

  const fetchReceipt = async () => {
    try {
      setIsLoading(true);
      
      const response = await salesService.getReceipt(id, 'JSON');
      const receiptData = response.data?.receipt || response.data;
     
      setReceipt(receiptData);
    } catch (err) {
      setError(err.message || "Failed to load receipt.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-[#007a55]" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-red-500">
        <AlertCircle size={48} className="mb-4" />
        <p>{error}</p>
        <button onClick={() => navigate('/pharmacy/dashboard/sales/pos')} className="mt-4 text-[#007a55] hover:underline">
          Return to POS
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Hide this header when printing */}
      <div className="flex justify-between items-center print:hidden">
        <Link to="/pharmacy/dashboard/sales/pos" className="text-sm text-[#007a55] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to POS
        </Link>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[#007a55] text-white rounded-lg font-semibold text-sm hover:bg-[#006645] transition-colors shadow-sm"
        >
          <Printer size={16} /> Print Receipt
        </button>
      </div>

      {/* Success Banner, Hidden on Print */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700 print:hidden">
        <CheckCircle2 size={24} />
        <div>
          <h2 className="font-bold">Sale Completed Successfully!</h2>
          <p className="text-sm text-green-600">The inventory has been updated automatically.</p>
        </div>
      </div>

      {/*printable receipt */}
      <div id="printable-receipt" className="bg-white text-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0">
        
        {/* Pharmacy Header */}
        <div className="text-center border-b border-dashed border-gray-300 pb-6 mb-6">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-[#007a55] rounded-lg text-white print:bg-black">
              <Pill size={24} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{receipt?.pharmacy?.name || 'Pharmacy Name'}</h1>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
            <MapPin size={12} /> {receipt?.pharmacy?.address || 'Kigali, Rwanda'}
          </p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <Phone size={12} /> {receipt?.pharmacy?.phone || '+250 788 000 000'}
          </p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
            TIN: {receipt?.pharmacy?.tin || 'N/A'}
          </p>
        </div>

        {/* Receipt Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-500">Receipt No:</p>
            <p className="font-bold">{receipt?.receiptNumber || receipt?.saleId}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Date:</p>
            <p className="font-bold flex items-center justify-end gap-1">
              <Calendar size={12}/> {new Date(receipt?.createdAt || Date.now()).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Patient:</p>
            <p className="font-bold">{receipt?.customer?.name || 'Walk-in Customer'}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Served By:</p>
            <p className="font-bold">{receipt?.pharmacistName || 'Pharmacist'}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 font-bold">Item</th>
              <th className="text-center py-2 font-bold">Qty</th>
              <th className="text-right py-2 font-bold">Price</th>
              <th className="text-right py-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {receipt?.items?.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 text-left">
                  <p className="font-medium">{item.medicineName}</p>
                  <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                </td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-right py-2">{Number(item.unitPrice).toLocaleString()}</td>
                <td className="text-right py-2 font-medium">{Number(item.totalPrice || (item.unitPrice * item.quantity)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t-2 border-gray-300 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{Number(receipt?.financials?.grossTotal || 0).toLocaleString()} RWF</span>
          </div>
          {receipt?.finacials?.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{Number(receipt?.financials?.discountAmount).toLocaleString()} RWF</span>
            </div>
          )}
          {receipt?.financials?.insuranceContribution > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>Insurance Covered</span>
              <span>-{Number(receipt.financials?.insuranceContribution).toLocaleString()} RWF</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
            <span>Total Paid</span>
            <span className="text-[#007a55] print:text-black">{Number(receipt?.financials?.amountPaid || 0).toLocaleString()} RWF</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Payment Method</span>
            <span className="font-semibold uppercase">{receipt?.paymentMethod || 'CASH'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-dashed border-gray-300">
          <p className="text-sm font-bold text-gray-900">Thank you for your business!</p>
          <p className="text-xs text-gray-500 mt-1">Medicine should be kept out of reach of children.</p>
          <p className="text-xs text-gray-500 mt-4">Powered by Pharmatrack</p>
        </div>

      </div>
    </div>
  );
};

export default SaleReceipt;