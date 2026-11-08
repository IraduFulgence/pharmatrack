import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Package, AlertTriangle, ChevronRight, X, 
  Loader2, Calendar, FileText, ArrowLeft 
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
const InventoryList = () => {
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for viewing batches
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [batches, setBatches] = useState([]);
  const [isBatchesLoading, setIsBatchesLoading] = useState(false);

  //Fetch aggregated medicines
  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getPharmacyMedicines();
      // console.log("RAW BACKEND RESPONSE:", JSON.stringify(response, null, 2));
      let list = [];
      if (response?.data?.medicines) list = response.data.medicines;
      else if (Array.isArray(response?.data)) list = response.data;
      else if (Array.isArray(response)) list = response;
     //console.log("PARSED LIST TO SET IN STATE:", list); 
      setMedicines(list);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch batches when a medicine is clicked
  const handleViewBatches = async (medicine) => {
    setSelectedMedicine(medicine);
    setIsBatchesLoading(true);
    try {
      const response = await inventoryService.getMedicineDetails(medicine.id || medicine.medicineId || medicine.medicine_id);
      console.log('batches',response);
      let batchList = [];
      if (response?.data?.batches) batchList = response.data.batches;
      else if (Array.isArray(response?.data)) batchList = response.data;
      else if (Array.isArray(response)) batchList = response;

      setBatches(batchList);
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setIsBatchesLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedMedicine(null);
    setBatches([]);
  };

  // Filter medicines
  const filteredMedicines = Array.isArray(medicines) ? medicines.filter(med => {
    const name = med.name || med.medicine_name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  }) : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to="/dashboard/inventory" className="text-sm text-[#007a55] hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Overview
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory List</h1>
          <p className="text-gray-500 dark:text-gray-400">View all medicines currently in your pharmacy.</p>
        </div>
        <Link 
          to="/pharmacy/dashboard/inventory/stock-in"
          className="flex items-center gap-2 px-4 py-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] transition-colors text-sm font-semibold"
        >
          <Package size={16} /> Receive Stock
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search medicine by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Medicine Name</th>
                <th className="px-6 py-4">Total Stock</th>
                <th className="px-6 py-4">Batches</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No medicines found. Start by receiving stock.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((med) => {
                  const stock = med.totalQuantity || med.quantity || med.total_quantity || 0;
                  const isLowStock = stock <= (med.reorderLevel || 10);
                  
                  return (
                    <tr key={med.id || med.medicineId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                          <Package size={18} />
                        </div>
                        {med.name || med.medicine_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          isLowStock 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {stock} units
                        </span>
                        {isLowStock && <AlertTriangle size={14} className="inline ml-2 text-orange-500" />}
                      </td>
                      <td className="px-6 py-4">{med.batchCount || 1} active</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleViewBatches(med)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#007a55] bg-[#e6f4ef] hover:bg-[#d1eae1] rounded-lg transition-colors"
                        >
                          View Batches <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* batches modal*/}
      {selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedMedicine.name || selectedMedicine.medicineName}
                </h2>
                <p className="text-sm text-gray-500">Specific batches & expirations</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {isBatchesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-[#007a55]" size={32} />
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No active batches found for this medicine.</div>
              ) : (
                <div className="space-y-4">
                  {batches.map((batch) => (
                    <div key={batch.id || batch.batchId} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <FileText size={16} className="text-gray-400"/> 
                          Batch: {batch.batch_number || batch.batchNo}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Calendar size={14} /> Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Qty: {batch.quantity}
                        </p>
                        <p className="text-xs text-gray-500">
                          Unit Price: {batch.unitPrice || batch.unit_price} RWF
                        </p>
                        <p className="text-xs text-gray-500">
                          Total Price: {batch.unit_price * batch.quantity} RWF
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-end">
              <button 
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;