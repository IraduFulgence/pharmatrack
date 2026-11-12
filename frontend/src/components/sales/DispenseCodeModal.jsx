import React, { useState } from 'react';
import { 
  Search, X, FileText, Loader2, CheckCircle2, 
  AlertCircle, ShieldCheck, Pill, AlertTriangle 
} from 'lucide-react';
import { salesService } from '../../services/salesService';
import mockPrescriptions from '../../data/mockPrescriptions.json';

const DispenseCodeModal = ({ isOpen, onClose, onAddToCart, onSelectPatient, onSelectInsurance }) => {
  const [code, setCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSearching(true);
    setError(null);
    setPrescription(null);

    setTimeout(() => {
      const found = mockPrescriptions.find(
        p => p.rxNumber.toLowerCase() === code.trim().toLowerCase()
      );

      if (!found) {
        setError("No prescription found. Try 'RX-998877' or 'RX-112233'.");
      } else {
        setPrescription(found);
      }
      setIsSearching(false);
    }, 300);
  };

  const handleDispense = async () => {
    if (!prescription) return;


    // We will check each prescribed medicine against the real backend inventory
    const verifiedItems = [];
    const missingItems = [];

    for (const item of prescription.items) {
      try {
        // Query the live inventory for this specific medicine name
        const res = await salesService.searchMedicines(item.medicineName);
        const availableMedicines = res.data || [];

        // Flatten the batches to find a matching one with stock > 0
        let foundBatch = null;
        availableMedicines.forEach(med => {
          if (med.batches) {
            med.batches.forEach(batch => {
              if (Number(batch.quantity) > 0 && !foundBatch) {
                foundBatch = {
                  inventoryId: batch.inventory_id,
                  medicineName: med.medicine_name,
                  batchNumber: batch.batch_number,
                  unitPrice: Number(batch.unit_price),
                  availableQuantity: Number(batch.quantity),
                };
              }
            });
          }
        });

        if (foundBatch) {
          
          verifiedItems.push({ 
            ...foundBatch, 
            quantity: item.quantity,
            prescribedDosage: item.dosage 
          });
        } else {
          missingItems.push(item.medicineName);
        }

      } catch (err) {
        console.error("Verification failed for:", item.medicineName);
        missingItems.push(item.medicineName);
      }
    }

  
    if (missingItems.length > 0) {
      const proceed = window.confirm(
        `The following medicines are NOT in your inventory:\n\n- ${missingItems.join('\n- ')}\n\nDo you want to continue and only add the available medicines to the cart?`
      );
      
      if (!proceed) return; 
    }

    if (verifiedItems.length === 0) {
      setError("None of the prescribed medicines are available in your inventory.");
      return;
    }

    // Auto-select patient
    if (prescription.patientName) {
      onSelectPatient({
        id: prescription.patientId,
        fullName: prescription.patientName,
        phoneNumber: prescription.patientPhone
      });
    }

    // Auto-select insurance
    if (prescription.insuranceProviderId) {
      onSelectInsurance(prescription.insuranceProviderId, prescription.insuranceCardNumber);
    }

    // Add verified items to cart
    verifiedItems.forEach(item => {
      onAddToCart(item);
    });

    onClose();
    setCode('');
    setPrescription(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-200 overflow-hidden flex flex-col">
        
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-[#007a55]" size={20} /> Dispense Hospital Prescription
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-6">
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Enter RX Code (e.g. RX-998877)..." 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 py-3 focus:outline-none focus:border-[#007a55] font-mono text-lg tracking-wider"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching || !code.trim()}
              className="px-6 bg-[#007a55] text-white font-bold rounded-lg hover:bg-[#006645] disabled:opacity-50 transition-colors"
            >
              {isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Fetch'}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {prescription && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              
              <div className="bg-[#e6f4ef] dark:bg-[#007a55]/20 p-4 rounded-xl border border-[#007a55]/30">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs font-bold text-[#007a55] uppercase tracking-wider">Patient</p>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">
                      {prescription.patientName}
                    </p>
                  </div>
                  <ShieldCheck className="text-[#007a55]" size={24} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div>
                    <p className="text-gray-500 text-xs">Insurance</p>
                    <p className="font-semibold text-gray-900">{prescription.insuranceName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Hospital</p>
                    <p className="font-semibold">{prescription.hospital}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Prescribed Medicines</p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {prescription.items?.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                          <Pill size={16} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">{med.medicineName}</p>
                          <p className="text-xs text-gray-500">Dosage: {med.dosage || med.strength || 'As directed'}</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm bg-white dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                        x{med.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            

              <button 
                onClick={handleDispense}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#007a55] text-white rounded-xl font-bold hover:bg-[#006645] transition-colors shadow-sm"
              >
                <CheckCircle2 size={20} /> Verify Stock & Add to Cart
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DispenseCodeModal;