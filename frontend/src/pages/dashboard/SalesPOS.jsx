import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Package, User, Plus, Minus, Trash2, 
  CreditCard, ShieldCheck, Loader2, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { salesService } from '../../services/salesService';

const SalesPOS = () => {
  const navigate = useNavigate();
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cart & Patient State
  const [cart, setCart] = useState([]);
  const [patient, setPatient] = useState(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  // Checkout State
  const [billDetails, setBillDetails] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState(null);

  // Search Medicines 
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery.length > 2) {
        handleSearchMedicines();
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSearchMedicines = async () => {
    try {
      setIsSearching(true);
      const res = await salesService.searchMedicines(searchQuery);
      setSearchResults(res.data?.medicines || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Search Patients
  const handleSearchPatient = async () => {
    if (patientQuery.length < 3) return;
    try {
      setIsSearchingPatient(true);
      const res = await salesService.searchPatients(patientQuery);
      setPatientResults(res.data?.patients || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  // Cart Actions
  const addToCart = (medicine) => {
 
    const existingItem = cart.find(item => item.inventoryId === (medicine.inventory_id || medicine.inventoryId));
    
    if (existingItem) {
      if (existingItem.quantity >= (medicine.available_quantity || medicine.quantity)) {
        alert("Cannot add more than available stock.");
        return;
      }
      setCart(cart.map(item => 
        item.inventoryId === existingItem.inventoryId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, {
        inventoryId: medicine.inventory_id || medicine.inventoryId,
        medicineId: medicine.medicine_id || medicine.medicineId,
        name: medicine.medicine_name || medicine.name,
        batchNumber: medicine.batch_number,
        price: Number(medicine.unit_price || medicine.price || 0),
        quantity: 1,
        maxQuantity: Number(medicine.available_quantity || medicine.quantity || 100)
      }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (inventoryId, delta) => {
    setCart(cart.map(item => {
      if (item.inventoryId === inventoryId) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= item.maxQuantity) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (inventoryId) => {
    setCart(cart.filter(item => item.inventoryId !== inventoryId));
  };

  // Calculate Bill 
  useEffect(() => {
    if (cart.length === 0) {
      setBillDetails(null);
      return;
    }

    const calculate = async () => {
      try {
        setIsCalculating(true);
        const payload = {
          items: cart.map(item => ({ inventoryId: item.inventoryId, quantity: item.quantity })),
          patientId: patient?.id || null,
          insuranceProviderId: null 
        };
        
        
        const res = await salesService.calculateBill(payload);
        setBillDetails(res.data);
      } catch (err) {
        console.error("Failed to calculate bill", err);
      } finally {
        setIsCalculating(false);
      }
    };
    
    const timeout = setTimeout(calculate, 500);
    return () => clearTimeout(timeout);
  }, [cart, patient]);


  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const payload = {
        items: cart.map(item => ({ inventoryId: item.inventoryId, quantity: item.quantity })),
        patientId: patient?.id || null,
        paymentMethod,
        
      };

      const res = await salesService.createSale(payload);
      const saleId = res.data?.saleId || res.data?.id;
      
      // Success! Navigate to receipt or reset
      alert("Sale completed successfully!");
      navigate(`/pharmacy/dashboard/sales/${saleId}/receipt`);

    } catch (err) {
      setError(err.message || "Failed to process sale.");
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      
      {/* Search & Products */}
      <div className="flex-grow flex flex-col space-y-4">
        
        {/* Medicine Search */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative z-20">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search medicine to add to cart..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#007a55] text-lg"
            />
            {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-[#007a55]" size={20} />}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-96 overflow-y-auto">
              {searchResults.map((med) => (
                <div 
                  key={med.inventory_id || med.inventoryId}
                  onClick={() => addToCart(med)}
                  className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{med.medicine_name || med.name}</p>
                    <p className="text-xs text-gray-500">Batch: {med.batch_number} • Exp: {med.expiry_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#007a55]">{Number(med.unit_price || med.price).toLocaleString()} RWF</p>
                    <p className="text-xs text-gray-500">{med.available_quantity || med.quantity} available</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex-grow overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-bold text-gray-900 dark:text-white">Current Cart ({cart.length} items)</h3>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Package size={48} className="mb-2 opacity-20" />
                <p>Cart is empty. Search for a medicine to start.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.inventoryId} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.inventoryId, -1)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded shadow-sm"><Minus size={14}/></button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.inventoryId, 1)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded shadow-sm"><Plus size={14}/></button>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white w-24 text-right">
                      {(item.price * item.quantity).toLocaleString()} RWF
                    </p>
                    <button onClick={() => removeFromCart(item.inventoryId)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Checkout Panel */}
      <div className="w-[400px] flex flex-col space-y-4">
        
        {/* Patient Selection */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Patient</h3>
          
          {patient ? (
            <div className="flex items-center justify-between p-2 bg-[#e6f4ef] dark:bg-[#007a55]/20 rounded-lg border border-[#007a55]/30">
              <div className="flex items-center gap-2">
                <User size={16} className="text-[#007a55]" />
                <span className="font-semibold text-[#007a55]">{patient.fullName}</span>
              </div>
              <button onClick={() => setPatient(null)} className="text-xs text-red-600 hover:underline">Clear</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Search by name/phone..." 
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="flex-grow bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#007a55]"
                />
                <button onClick={handleSearchPatient} className="px-3 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-semibold">Search</button>
              </div>
              
              {/* Patient Results */}
              {patientResults.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto mt-2">
                  {patientResults.map(p => (
                    <div key={p.id} onClick={() => { setPatient(p); setPatientResults([]); }} className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-0">
                      {p.fullName} <span className="text-gray-400 text-xs">({p.phoneNumber})</span>
                    </div>
                  ))}
                </div>
              )}
              
              <button className="text-xs font-semibold text-[#007a55] hover:underline">+ Register Walk-in Patient</button>
            </div>
          )}
        </div>

        {/* Bill Summary */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex-grow">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Payment Summary</h3>
          
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString()} RWF</span>
            </div>
            {/* Add Tax, Insurance, Discount*/}
            
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between font-bold text-lg text-gray-900 dark:text-white">
              <span>Total</span>
              <span className="text-[#007a55]">{billDetails?.totalAmount ? Number(billDetails.totalAmount).toLocaleString() : subtotal.toLocaleString()} RWF</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentMethod('CASH')} className={`py-2 rounded-lg text-sm font-semibold border ${paymentMethod === 'CASH' ? 'bg-[#007a55] text-white border-[#007a55]' : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}>Cash</button>
              <button onClick={() => setPaymentMethod('MOMO')} className={`py-2 rounded-lg text-sm font-semibold border ${paymentMethod === 'MOMO' ? 'bg-[#007a55] text-white border-[#007a55]' : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}>MoMo</button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-4 bg-[#007a55] hover:bg-[#006645] text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <CreditCard size={24} />}
            {isProcessing ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SalesPOS;