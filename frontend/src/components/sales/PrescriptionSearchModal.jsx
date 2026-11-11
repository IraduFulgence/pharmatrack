import React, { useState, useEffect } from 'react';
import { Search, X, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { salesService } from '../../services/salesService';

const PrescriptionSearchModal = ({ isOpen, onClose, onAddToCart }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.length > 2) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [query]);

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const res = await salesService.searchPrescriptions(query);
      setResults(res.data?.prescriptions || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (prescription) => {
    if (prescription.items && prescription.items.length > 0) {
      prescription.items.forEach(item => {
        onAddToCart({
          inventoryId: item.inventoryId || item.inventory_id,
          medicineId: item.medicineId || item.medicine_id,
          medicineName: item.medicineName || item.medicine_name,
          batchNumber: item.batchNumber || item.batch_number || 'PRESCRIPTION',
          unitPrice: Number(item.unitPrice || item.unit_price || 0),
          availableQuantity: 999, 
        });
      });
      onClose();
    } else {
      alert("This prescription has no medicines attached.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Dispense Prescription</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by RX Number or Patient Name..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
              autoFocus
            />
            {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-[#007a55]" size={18} />}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {results.map((rx) => (
              <div 
                key={rx.id || rx.prescriptionId}
                onClick={() => handleSelect(rx)}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer border border-transparent hover:border-[#007a55] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{rx.prescriptionNumber || `RX-${rx.id}`}</p>
                    <p className="text-xs text-gray-500">{rx.patientName || rx.patient_name || 'Unknown'}</p>
                  </div>
                </div>
                <CheckCircle2 size={18} className="text-gray-300 hover:text-[#007a55]"/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionSearchModal;