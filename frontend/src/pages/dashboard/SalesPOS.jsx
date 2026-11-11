import React, { useState, useEffect } from 'react';
import { 
  Search, Package, User, Plus, Minus, Trash2, ShieldCheck,
  CreditCard, Loader2,FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { salesService } from '../../services/salesService';
import PatientSelectorModal from '../../components/sales/PatientSelectorModal';
import DispenseCodeModal from '../../components/sales/DispenseCodeModal';


const SalesPOS = () => {
  
  const navigate = useNavigate();

  // Search State
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cart & Patient State
  const [cart, setCart] = useState([]);
  const [patient, setPatient] = useState(null);
  const [insuranceProviders, setInsuranceProviders] = useState([]);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState(null);
  const [insuranceCardNumber, setInsuranceCardNumber] = useState(''); 
  // Checkout State
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState(null);

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  // Fetch Insurance Providers on Load
  useEffect(() => {
    const fetchInsuranceProviders = async () => {
      try {
        const res = await salesService.getInsuranceProviders();
        console.log('insurances',res);
        const providers = res.data || res.data?.providers || [];
        setInsuranceProviders(providers);
      } catch (err) {
        console.error("Failed to load insurance providers", err);
      }
    };
    fetchInsuranceProviders();
  }, []);
  // handle auto select insurance
   const handleAutoSelectInsurance = (providerId, cardNumber) => {
    const ins = insuranceProviders.find(p => Number(p.provider_id) === Number(providerId));
    if (ins) {
      setSelectedInsurance(ins);
      if (cardNumber) setInsuranceCardNumber(cardNumber);
    }
  };
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
      
      const medicines = res.data || [];
      
      
      let flattenedResults = [];
      medicines.forEach(med => {
        if (med.batches && med.batches.length > 0) {
          med.batches.forEach(batch => {
            flattenedResults.push({
              // Medicine Info
              medicineId: med.medicine_id,
              medicineName: med.medicine_name,
              genericName: med.generic_name,
              strength: med.strength,
              dosageForm: med.dosage_form,
              
              inventoryId: batch.inventory_id,
              batchNumber: batch.batch_number,
              unitPrice: Number(batch.unit_price),
              availableQuantity: Number(batch.quantity),
              expiryDate: batch.expiry_date
            });
          });
       
        }
      });

     const lowerQuery = searchQuery.toLowerCase();
      const filteredResults = flattenedResults.filter(item => 
        item.medicineName.toLowerCase().includes(lowerQuery) ||
        (item.genericName && item.genericName.toLowerCase().includes(lowerQuery))
      );
      setSearchResults(flattenedResults);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };


  // Cart Actions
  const addToCart = (batchItem) => {
    
    const existingItem = cart.find(item => item.inventoryId === batchItem.inventoryId);
    
    if (existingItem) {
      if (existingItem.quantity >= batchItem.availableQuantity) {
        alert(`Cannot add more. Only ${batchItem.availableQuantity} units available for this batch.`);
        return;
      }
      setCart(cart.map(item => 
        item.inventoryId === existingItem.inventoryId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, {
        ...batchItem,
        quantity: 1
      }]);
    }
    
    // Clear search after adding
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (inventoryId, delta) => {
    setCart(cart.map(item => {
      if (item.inventoryId === inventoryId) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= item.availableQuantity) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (inventoryId) => {
    setCart(cart.filter(item => item.inventoryId !== inventoryId));
  };

  // Calculate subtotal
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
 // Calculate Insurance Split
  let insuranceAmount = 0;
  let patientAmount = subtotal;
  let coveragePercentage = 0;

  if (selectedInsurance) {
    coveragePercentage = Number(selectedInsurance.default_coverage_percentage);
    insuranceAmount = (subtotal * coveragePercentage)/100;
    patientAmount = subtotal-insuranceAmount;
  }
  // Complete Sale 
    const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!patient) {
      setError("Please select or register a patient before completing the sale.");
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
          // If they have insurance, pass the custom coverage % (e.g. 80)
          customCoveragePercentage: selectedInsurance ? Number(selectedInsurance.default_coverage_percentage) : 0
        })),

        // The Amount the patient is paying cash/momo
        amountPaid: Math.round(patientAmount),

        // Patient Details
        patientId: Number(patient.id || patient.patientId),
        customerName: patient.full_name || patient.name || 'Walk-in',
        customerPhone: patient.phone_number || patient.phone || '',

        // Insurance Provider (if selected)
        providerId: selectedInsurance ? Number(selectedInsurance.provider_id) : null,
        
        insuranceCardNumber: selectedInsurance ? insuranceCardNumber : null, 
        discountAmount: 0,
        notes: `Sale processed via POS by Pharmacy ${JSON.parse(localStorage.getItem('user'))?.id || ''}`,
      };

      console.log("Submitting Final Swagger Payload:", payload);
      
      const res = await salesService.createSale(payload);
      
      const saleId = res.data?.saleId || res.data?.id || res.data?.sale_id;
      if (!saleId) throw new Error("Sale created but no ID returned.");

      setCart([]);
      navigate(`/pharmacy/dashboard/sales/${saleId}/receipt`);

    } catch (err) {
      setError(err.message || "Failed to process sale.");
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      
      {/* Search & Products */}
      <div className="flex-grow flex flex-col space-y-4 relative">
        
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
         
           {/* Dispense by Code Button */}
          <button 
            onClick={() => setIsPrescriptionModalOpen(true)}
            className="flex items-center gap-2 mt-5 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition-colors text-sm border border-blue-200"
          >
            <FileText size={18} /> Dispense by Prescription Code
          </button>
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-96 overflow-y-auto">
              {searchResults.map((batch) => (
                <div 
                  key={batch.inventoryId}
                  onClick={() => addToCart(batch)}
                  className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {batch.medicineName} <span className="text-sm font-normal text-gray-500">{batch.strength}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Batch: {batch.batchNumber} • Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#007a55]">{batch.unitPrice.toLocaleString()} RWF</p>
                    <p className="text-xs text-gray-500">{batch.availableQuantity} available</p>
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
                    <p className="font-semibold text-gray-900 dark:text-white">{item.medicineName}</p>
                    <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.inventoryId, -1)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded shadow-sm"><Minus size={14}/></button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.inventoryId, 1)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded shadow-sm"><Plus size={14}/></button>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white w-24 text-right">
                      {(item.unitPrice * item.quantity).toLocaleString()} RWF
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
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Customer</h3>
          
          {patient ? (
            <div className="flex items-center justify-between p-3 bg-[#e6f4ef] dark:bg-[#007a55]/20 rounded-lg border border-[#007a55]/30">
              <div className="flex items-center gap-3">
                
                <div>
                  <p className="font-semibold text-[#007a55] text-sm">{patient.full_name}</p>
                  <p className="text-xs text-[#007a55]/70">{patient.phone_number}</p>
                </div>
              </div>
              <button onClick={() => setPatient(null)} className="text-xs font-semibold text-red-600 hover:underline">
                Change
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsPatientModalOpen(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 hover:border-[#007a55] hover:text-[#007a55] hover:bg-[#e6f4ef]/50 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <User size={18} /> Select or Register Customer
            </button>
          )}
        </div>
          {/* Insurance Selection */}
         <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-500"/> Select Insurance (Optional)
          </h3>
          
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
            {insuranceProviders.map(ins => (
              <button
                key={ins.provider_id}
                onClick={() => setSelectedInsurance(selectedInsurance?.provider_id === ins.provider_id ? null : ins)}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-colors text-left truncate ${
                  selectedInsurance?.provider_id === ins.provider_id 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                {ins.provider_name}
                <span className="block text-[10px] font-normal opacity-70">
                  {ins.default_coverage_percentage}% covered
                </span>
              </button>
            ))}
          </div>
            {selectedInsurance && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Insurance Card Number *
              </label>
              <input 
                type="text"
                value={insuranceCardNumber}
                onChange={(e) => setInsuranceCardNumber(e.target.value)}
                placeholder="e.g. RAMA-123456789"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#007a55] dark:text-white"
              />
            </div>
          )}
          
          {selectedInsurance && (
            
            <p className="text-xs text-blue-600 mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
              <span>Coverage applied: {selectedInsurance.default_coverage_percentage}%</span>
              <button onClick={() => setSelectedInsurance(null)} className="text-red-500 hover:underline font-semibold">Remove</button>
            </p>
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
            
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between font-bold text-lg text-gray-900 dark:text-white">
              <span>Total</span>
              <span className="text-[#007a55]">{subtotal.toLocaleString()} RWF</span>
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
      <PatientSelectorModal 
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSelectPatient={(selectedPatient) => setPatient(selectedPatient)}
      />
      {/* <PrescriptionSearchModal 
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        onAddToCart={addToCart} // Re-use the existing addToCart function!
      /> */}
      <DispenseCodeModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        onSelectPatient={(selectedPatient) => setPatient(selectedPatient)}
        onAddToCart={addToCart}
        onSelectInsurance={handleAutoSelectInsurance}
      />
    </div>
  );
};

export default SalesPOS;