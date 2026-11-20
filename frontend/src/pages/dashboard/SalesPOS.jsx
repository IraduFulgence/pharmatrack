import React, { useState, useEffect } from 'react';
import { 
  Search, Package, User, Plus, Minus, Trash2, ShieldCheck,
  CreditCard, Loader2, X, CheckCircle2, ArrowRight,
  Store, History, Inbox, UserPlus, Printer, Pill, MapPin, Phone, Calendar,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { salesService } from '../../services/salesService';
import PatientSelectorModal from '../../components/sales/PatientSelectorModal';
import SalesHistory from './SalesHistory';
// MOCK DATA
const MOCK_ONLINE_ORDERS = [
  {
    id: 'ONL-001',
    patientName: 'Jean Paul',
    phone: '0788111222',
    total: 4500,
    status: 'PENDING',
    items: [
      { inventoryId: 101, medicineName: 'Amoxicillin 500mg', batchNumber: 'BATCH-A1', unitPrice: 1500, quantity: 2, availableQuantity: 50, medicineId: 1 },
    ]
  }
];

const MOCK_HISTORY = [
  { id: 'ORD-8842', date: '10:30 AM', customer: 'Walk-in', total: 3500, status: 'Completed' },
];

const SalesPOS = () => {
  const navigate = useNavigate();

  // --- NAVIGATION ---
  const [activeTab, setActiveTab] = useState('terminal');
  const [isPOSOpen, setIsPOSOpen] = useState(false);

  // Online Orders & History
  const [onlineOrders, setOnlineOrders] = useState(MOCK_ONLINE_ORDERS);
  const [salesHistory, setSalesHistory] = useState(MOCK_HISTORY);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cart & Transaction State
  const [cart, setCart] = useState([]);
  const [patient, setPatient] = useState(null);
  const [insuranceProviders, setInsuranceProviders] = useState([]);
  const [selectedInsurance, setSelectedInsurance] = useState(null);
  const [insuranceCardNumber, setInsuranceCardNumber] = useState('');
  
  // Checkout State
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  
  const [receiptData, setReceiptData] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isFetchingReceipt, setIsFetchingReceipt] = useState(false);

 
  useEffect(() => {
    const fetchInsurance = async () => {
      try {
        const res = await salesService.getInsuranceProviders();
        setInsuranceProviders(res.data || []);
      } catch (err) {
        console.error("Failed to load insurances", err);
      }
    };
    fetchInsurance();
  }, []);

  // medicine search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery.length > 2) handleSearchMedicines();
      else setSearchResults([]); 
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSearchMedicines = async () => {
    try {
      setIsSearching(true);
      const res = await salesService.searchMedicines(searchQuery);
      
      let flattened = [];
      (res.data || []).forEach(med => {
        if (med.batches?.length > 0) {
          med.batches.forEach(batch => {
            flattened.push({
              medicineId: med.medicine_id,
              medicineName: med.medicine_name,
              strength: med.strength,
              inventoryId: batch.inventory_id,
              batchNumber: batch.batch_number,
              unitPrice: Number(batch.unit_price),
              availableQuantity: Number(batch.quantity),
            });
          });
        }
      });

      const lowerQuery = searchQuery.toLowerCase();
      setSearchResults(flattened.filter(item => 
        item.medicineName.toLowerCase().includes(lowerQuery)
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // cart actions
  const addToCart = (batchItem) => {
    const existing = cart.find(item => item.inventoryId === batchItem.inventoryId);
    if (existing) {
      if (existing.quantity >= batchItem.availableQuantity) {
        alert(`Only ${batchItem.availableQuantity} units available.`);
        return;
      }
      setCart(cart.map(item => 
        item.inventoryId === existing.inventoryId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...batchItem, quantity: 1 }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Allow temporary empty input while the user is typing.
  const setItemQuantityInput = (inventoryId, value) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.inventoryId === inventoryId
          ? { ...item, quantity: value }
          : item
      )
    );
  };

  // Validate and normalize the quantity when the input loses focus.
  const commitItemQuantity = (inventoryId, value) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.inventoryId !== inventoryId) return item;

        const available = Number(item.availableQuantity);
        let quantity = Number(value);

        if (!Number.isFinite(quantity) || quantity < 1) {
          quantity = 1;
        } else {
          quantity = Math.floor(quantity);
        }

        if (Number.isFinite(available) && available >= 0) {
          quantity = Math.min(quantity, available);
        }

        return { ...item, quantity };
      })
    );
  };

  // Increment/decrement using the same stock limits as manual entry.
  const adjustQuantity = (inventoryId, delta) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.inventoryId !== inventoryId) return item;

        const currentQuantity = Number(item.quantity) || 0;
        const available = Number(item.availableQuantity);
        const nextQuantity = currentQuantity + delta;

        if (nextQuantity < 1) return item;
        if (Number.isFinite(available) && nextQuantity > available) return item;

        return { ...item, quantity: nextQuantity };
      })
    );
  };

  const removeFromCart = (inventoryId) => {
    setCart(cart.filter(item => item.inventoryId !== inventoryId));
  };

  // ONLINE ORDERS
  const loadOnlineOrder = (order) => {
    setPatient({ id: order.id, full_name: order.patientName, phone_number: order.phone });
    setCart(order.items);
    setOnlineOrders(onlineOrders.filter(o => o.id !== order.id));
    setActiveTab('terminal');
    setIsPOSOpen(true);
  };

  
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.unitPrice) * (Number(item.quantity) || 0)), 0);
  let insuranceAmount = 0;
  let patientAmount = subtotal;
  
  if (selectedInsurance) {
    const coverage = Number(selectedInsurance.default_coverage_percentage);
    insuranceAmount = (subtotal * coverage) / 100;
    patientAmount = subtotal - insuranceAmount;
  }

 
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const hasInvalidQuantity = cart.some(item => {
      const quantity = Number(item.quantity);
      const available = Number(item.availableQuantity);

      return (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        !Number.isFinite(available) ||
        quantity > available
      );
    });

    if (hasInvalidQuantity) {
      setError("Please enter a valid whole-number quantity within the available stock for every medicine.");
      return;
    }

    if (!patient) {
      setError("Please select or register a patient first.");
      setIsPatientModalOpen(true); 
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const payload = {
        paymentCategory: selectedInsurance ? 'INSURANCE' : 'PRIVATE',
        paymentMethod,
        items: cart.map(item => ({
          inventoryId: Number(item.inventoryId),
          quantity: Number(item.quantity),
          isInsuranceCovered: !!selectedInsurance,
          customCoveragePercentage: selectedInsurance ? Number(selectedInsurance.default_coverage_percentage) : 0
        })),
        amountPaid: Math.round(patientAmount),
        patientId: Number(patient.id || patient.patientId || 1),
        customerName: patient.full_name || patient.name || 'Walk-in',
        customerPhone: patient.phone_number || patient.phone || '',
        providerId: selectedInsurance ? Number(selectedInsurance.provider_id) : null,
        insuranceCardNumber: selectedInsurance ? insuranceCardNumber : null,
        discountAmount: 0,
      };

    
      const res = await salesService.createSale(payload);
      const saleId = res.data?.saleId || res.data?.id || res.data?.sale_id;
      
      // Reset the POS Cart
      setCart([]);
      setPatient(null);
      setSelectedInsurance(null);
      setInsuranceCardNumber('');
      setIsPOSOpen(false);
      
      // Add to local history list
      setSalesHistory([{ id: saleId, date: 'Just now', customer: patient.full_name, total: patientAmount, status: 'Completed' }, ...salesHistory]);
      
     
      setIsFetchingReceipt(true);
      setIsReceiptModalOpen(true);
      
      try {
        const receiptRes = await salesService.getReceipt(saleId, 'JSON');
        const officialReceipt = receiptRes.data?.receipt || receiptRes.data;
        setReceiptData(officialReceipt);
      } catch (receiptErr) {
        console.error("Failed to fetch receipt details:", receiptErr);
        setReceiptData({
          saleId: saleId,
          createdAt: new Date().toISOString(),
          customer: { name: patient.full_name || 'Walk-in' },
          items: payload.items,
          financials: {
            grossTotal: subtotal,
            insuranceContribution: insuranceAmount,
            amountPaid: patientAmount
          },
          paymentMethod: paymentMethod,
        });
      } finally {
        setIsFetchingReceipt(false);
      }

    } catch (err) {
      setError(err.message || "Failed to process sale.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-gray-50 dark:bg-gray-950 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 print:hidden">
      
      {/* tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 print:hidden">
        <button onClick={() => [setActiveTab('terminal'), setIsPOSOpen(true)]} className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm border-b-2 ${activeTab === 'terminal' ? 'border-[#007a55] text-[#007a55]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          <Store size={18} /> Sales Point
        </button>
        <button onClick={() => setActiveTab('online-orders')} className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm border-b-2 relative ${activeTab === 'online-orders' ? 'border-[#007a55] text-[#007a55]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          <Inbox size={18} /> Online Requests
          {onlineOrders.length > 0 && <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{onlineOrders.length}</span>}
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm border-b-2 ${activeTab === 'history' ? 'border-[#007a55] text-[#007a55]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          <History size={18} /> Sales History
        </button>
      </div>

      {/*  */}
      <div className="flex-grow p-6 overflow-y-auto print:hidden">
        
        {activeTab === 'terminal' && !isPOSOpen && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-[#e6f4ef] rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard size={48} className="text-[#007a55]" />
            </div>
            {/* <h1 className="text-2xl font-bold mb-2">Ready to sell</h1> */}
            <button onClick={() => setIsPOSOpen(true)} className="mt-4 px-8 py-4 bg-[#007a55] text-white rounded-xl font-bold text-lg">Open POS terminal to sell</button>
          </div>
        )}

        {/* THE POS Screen */}
        {activeTab === 'terminal' && isPOSOpen && (
          <div className="grid lg:grid-cols-3 gap-6 h-full">
            
            <div className="lg:col-span-2 flex flex-col gap-4 h-full">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border shadow-sm relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400 dark:text-white" size={20} />
                  <input type="text" placeholder="Search medicine..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#007a55] text-lg dark:text-white" />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border dark:text-white rounded-xl shadow-xl max-h-96 overflow-y-auto z-10">
                    {searchResults.map(batch => (
                      <div key={batch.inventoryId} onClick={() => addToCart(batch)} className="p-4 border-b  cursor-pointer flex justify-between items-center">
                        <div><p className="font-bold">{batch.medicineName} {batch.strength}</p><p className="text-xs text-gray-500">Batch: {batch.batchNumber} • {batch.availableQuantity} left</p></div>
                        <p className="font-bold text-[#007a55]">{batch.unitPrice} RWF</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 border rounded-xl flex-grow flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-gray-50 dark:bg-gray-800/50 dark:text-white">
                <h3 className="font-bold">Current Cart ({cart.length} items)</h3>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3 dark:text-white">
                  {cart.map(item => (
                    <div key={item.inventoryId} className="flex justify-between items-center p-3 border rounded-lg">
                      <div><p className="font-semibold">{item.medicineName}</p><p className="text-xs text-gray-500">Batch: {item.batchNumber}</p></div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(item.inventoryId, -1)}
                            disabled={Number(item.quantity) <= 1}
                            aria-label={`Decrease ${item.medicineName} quantity`}
                            className="p-1 hover:text-[#007a55] disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus size={14} />
                          </button>

                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max={item.availableQuantity}
                            step="1"
                            value={item.quantity}
                            onChange={(e) => setItemQuantityInput(item.inventoryId, e.target.value)}
                            onBlur={(e) => commitItemQuantity(item.inventoryId, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            aria-label={`Quantity for ${item.medicineName}`}
                            className="w-14 text-center font-bold bg-transparent outline-none border-b border-gray-300 focus:border-[#007a55] dark:text-white"
                          />

                          <button
                            type="button"
                            onClick={() => adjustQuantity(item.inventoryId, 1)}
                            disabled={Number(item.quantity) >= Number(item.availableQuantity)}
                            aria-label={`Increase ${item.medicineName} quantity`}
                            className="p-1 hover:text-[#007a55] disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="font-bold w-24 text-right">
                          {(Number(item.unitPrice) * (Number(item.quantity) || 0)).toLocaleString()} RWF
                        </p>
                        <button onClick={() => removeFromCart(item.inventoryId)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            
            <div className="flex flex-col gap-4 h-full">
              <div className="bg-white dark:bg-gray-900 dark:text-white p-4 rounded-xl border shadow-sm">
                <h3 className="font-bold mb-3 text-sm flex items-center gap-2"><User size={16}/> Customer</h3>
                {patient ? (
                  <div className="flex justify-between items-center p-3 bg-[#e6f4ef] rounded-lg">
                    <div><p className="font-bold text-[#007a55]">{patient.full_name}</p><p className="text-xs">{patient.phone_number}</p></div>
                    <button onClick={() => setPatient(null)} className="text-xs text-red-600 font-semibold">Change</button>
                  </div>
                ) : (
                  <button onClick={() => setIsPatientModalOpen(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 dark:text-white hover:border-[#007a55] flex items-center justify-center gap-2 font-medium"><UserPlus size={18} /> Select Patient</button>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl dark:text-white border shadow-sm">
                <h3 className="font-bold mb-3 text-sm flex items-center gap-2"><ShieldCheck size={16} className="text-blue-500"/> Insurance</h3>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {insuranceProviders.map(ins => (
                    <button key={ins.provider_id} onClick={() => setSelectedInsurance(selectedInsurance?.provider_id === ins.provider_id ? null : ins)} className={`p-2 text-xs font-semibold border rounded-lg text-left truncate ${selectedInsurance?.provider_id === ins.provider_id ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200'}`}>{ins.provider_name}</button>
                  ))}
                </div>
                {selectedInsurance && (
                  <div className="mt-3"><label className="block text-xs mb-1">Card Number</label><input type="text" value={insuranceCardNumber} onChange={(e) => setInsuranceCardNumber(e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border shadow-sm mt-auto dark:text-white">
                <div className="flex justify-between mb-2 text-sm"><span>Subtotal</span><span>{subtotal.toLocaleString()} RWF</span></div>
                {selectedInsurance && <div className="flex justify-between mb-2 text-sm text-blue-600"><span>Insurance Pays</span><span>-{insuranceAmount.toLocaleString()} RWF</span></div>}
                <div className="flex justify-between font-bold text-lg border-t pt-3 mb-4"><span>Patient Pays</span><span className="text-[#007a55]">{patientAmount.toLocaleString()} RWF</span></div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => setPaymentMethod('CASH')} className={`py-2 rounded-lg font-semibold border ${paymentMethod === 'CASH' ? 'bg-gray-900 text-white' : 'bg-gray-50 dark:bg-gray-800'}`}>Cash</button>
                  <button onClick={() => setPaymentMethod('MOMO')} className={`py-2 rounded-lg font-semibold border ${paymentMethod === 'MOMO' ? 'bg-gray-900 text-white' : 'bg-gray-50 dark:bg-gray-800'}`}>MoMo</button>
                </div>

                {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

                <button onClick={handleCheckout} disabled={cart.length === 0 || isProcessing} className="w-full py-4 bg-[#007a55] text-white rounded-xl font-bold flex justify-center items-center gap-2">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Complete Sale
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ONLINE ORDERS */}
        {activeTab === 'online-orders' && (
          <div className="max-w-full mx-auto space-y-4">
            <h2 className="text-xl font-bold mb-4">Incoming Online Requests</h2>
            {onlineOrders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center">
                <div><p className="font-bold text-lg">{order.id} <span className="text-orange-500 text-xs ml-2">PENDING</span></p><p className="text-sm text-gray-600">{order.patientName} ({order.phone})</p><p className="text-sm font-bold mt-1">{order.total.toLocaleString()} RWF</p></div>
                <button onClick={() => loadOnlineOrder(order)} className="px-5 py-2.5 bg-[#007a55] text-white font-semibold text-sm rounded-xl flex items-center gap-2">Process in POS <ArrowRight size={16} /></button>
              </div>
            ))}
          </div>
        )}

        {/* history tab */}
        {activeTab === 'history' && (
          // <div className="max-w-3xl mx-auto bg-white border rounded-2xl overflow-hidden">
          //   <table className="w-full text-left">
          //     <thead className="bg-gray-50 border-b text-xs text-gray-500"><tr><th className="px-4 py-3">Order ID</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead>
          //     <tbody className="divide-y text-sm">
          //       {salesHistory.map(sale => (
          //         <tr key={sale.id}><td className="px-4 py-3 font-medium">{sale.id}</td><td className="px-4 py-3">{sale.customer}</td><td className="px-4 py-3 font-bold">{sale.total.toLocaleString()} RWF</td><td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">{sale.status}</span></td></tr>
          //       ))}
          //     </tbody>
          //   </table>
          // </div>
          <SalesHistory isEmbedded={true} />
        )}
      </div>

      {/* receipt modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white text-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-h-full">
            
            {/* Modal Header*/}
            <div className="p-4 border-b flex justify-between items-center print:hidden bg-gray-50">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Sale Completed</h3>
                <p className="text-xs text-gray-500">Receipt generated successfully</p>
              </div>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            {/* Loading State */}
            {isFetchingReceipt ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#007a55]" size={40} />
                <p className="text-gray-500 mt-4 text-sm">Generating official receipt...</p>
              </div>
            ) : receiptData ? (
              /* Printable Receipt Area */
              <div id="printable-receipt" className="p-8 overflow-y-auto print:p-0">
                
                {/* Pharmacy Header */}
                <div className="text-center border-b border-dashed border-gray-300 pb-6 mb-6">
                  <div className="flex justify-center mb-2">
                    <div className="p-2 bg-[#007a55] rounded-lg text-white print:bg-black">
                      <Pill size={24} />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{receiptData?.pharmacy?.name || 'Pharmacy Name'}</h1>
                  <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                    <MapPin size={12} /> {receiptData?.pharmacy?.address || 'Kigali, Rwanda'}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    <Phone size={12} /> {receiptData?.pharmacy?.phone || '+250 788 000 000'}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                    TIN: {receiptData?.pharmacy?.tin || 'N/A'}
                  </p>
                </div>

                {/* Receipt Meta */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div>
                    <p className="text-gray-500">Receipt No:</p>
                    <p className="font-bold">{receiptData?.receiptNumber || receiptData?.saleId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Date:</p>
                    <p className="font-bold flex items-center justify-end gap-1">
                      <Calendar size={12}/> {new Date(receiptData?.createdAt || Date.now()).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Patient:</p>
                    <p className="font-bold">{receiptData?.customer?.name || 'Walk-in Customer'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Served By:</p>
                    <p className="font-bold">{receiptData?.pharmacistName || 'Pharmacist'}</p>
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
                    {receiptData?.items?.map((item, idx) => (
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
                    <span>{Number(receiptData?.financials?.grossTotal || 0).toLocaleString()} RWF</span>
                  </div>
                  {receiptData?.financials?.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{Number(receiptData?.financials?.discountAmount).toLocaleString()} RWF</span>
                    </div>
                  )}
                  {receiptData?.financials?.insuranceContribution > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Insurance Covered</span>
                      <span>-{Number(receiptData.financials?.insuranceContribution).toLocaleString()} RWF</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                    <span>Total Paid</span>
                    <span className="text-[#007a55] print:text-black">{Number(receiptData?.financials?.amountPaid || 0).toLocaleString()} RWF</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Payment Method</span>
                    <span className="font-semibold uppercase">{receiptData?.paymentMethod || 'CASH'}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 pt-6 border-t border-dashed border-gray-300">
                  <p className="text-sm font-bold text-gray-900">Thank you!</p>
                  <p className="text-xs text-gray-500 mt-1">Medicine should be kept out of reach of children.</p>
                  <p className="text-xs text-gray-500 mt-4">Powered by Pharmatrack</p>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-red-500">
                <AlertCircle size={40} className="mb-4" />
                <p>Failed to load receipt details.</p>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50 flex gap-3 print:hidden">
              <button onClick={() => setIsReceiptModalOpen(false)} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50">Close</button>
              <button onClick={handlePrint} disabled={isFetchingReceipt || !receiptData} className="flex-1 py-2.5 bg-[#007a55] text-white rounded-lg font-semibold hover:bg-[#006645] flex items-center justify-center gap-2 disabled:opacity-50"><Printer size={18}/> Print Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* patient modal*/}
      <PatientSelectorModal 
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSelectPatient={(selectedPatient) => setPatient(selectedPatient)}
      />
    </div>
  );
};

export default SalesPOS;