import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, Package, Calendar, FileSpreadsheet, PlusSquare, 
  Loader2, CheckCircle2, AlertCircle, Plus, FileText, AlertTriangle, Pill,
  DollarSign, TrendingUp
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import BulkStockImport from '../../components/inventory/importstock';

const StockIn = () => {
  const navigate = useNavigate();

  // Search & Catalogue State
  const [catalogue, setCatalogue] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [importMode, setImportMode] = useState('manual');
  
  // New Medicine State
  const [isNewMedicineMode, setIsNewMedicineMode] = useState(false);
  const [newMedicineData, setNewMedicineData] = useState({
    medicineName: '',
    genericName: '',
    brandName: '',
    strength: '',
    dosageForm: 'Tablet',
    description: '',
    requiresPrescription: false
  });

  
  const [formData, setFormData] = useState({
    batchNumber: '',
    quantityReceived: '',
    purchasePrice: '',
    sellingPrice: '',
    unitPrice: '', 
    expiryDate: '',
    reorderLevel: '10',
    notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const getPharmacyId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.id || user?.pharmacyId;
    } catch {
      return null;
    }
  };

  // Search Catalogue
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length > 1) {
        searchCatalogue();
      } else {
        setCatalogue([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const searchCatalogue = async () => {
    try {
      setIsSearching(true);
      const res = await inventoryService.getCatalogue(searchTerm);
      
      let list = [];
      if (res?.data?.medicines) list = res.data.medicines;
      else if (Array.isArray(res?.data)) list = res.data;
      
      setCatalogue(list);
    } catch (err) {
      console.error("Catalogue search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleNewMedicineInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewMedicineData({ 
      ...newMedicineData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleRegisterMedicine = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await inventoryService.registerMedicine(newMedicineData);
      const createdMed = res.data.medicine || res.data; 
      
      setSelectedMedicine(createdMed);
      setIsNewMedicineMode(false);
      
    } catch (err) {
      setError(err.message || "Failed to register new medicine.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const pharmacyId = getPharmacyId();
      if (!pharmacyId) throw new Error("Pharmacy ID missing. Please re-login.");
        
      const payload = {
        medicineId: Number(selectedMedicine.id || selectedMedicine.medicine_id || selectedMedicine.medicineId),
        batchNumber: formData.batchNumber,
        quantityReceived: Number(formData.quantityReceived),
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
        sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : undefined,
        unitPrice: formData.unitPrice ? Number(formData.unitPrice) : undefined,
        expiryDate: formData.expiryDate,
        reorderLevel: formData.reorderLevel ? Number(formData.reorderLevel) : 10,
        notes: formData.notes
      };

      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      await inventoryService.receiveStock(pharmacyId, payload);
      
      setSuccess(true);
      setTimeout(() => navigate('/pharmacy/dashboard/inventory'), 2000);
      
    } catch (err) {
      setError(err.message || "Failed to receive stock.");
    } finally {
      setIsLoading(false);
    }
  };

  // Success Screen 
  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Stock Received!</h2>
        <p className="text-gray-500">The new batch has been added to your inventory.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <Link to="/pharmacy/dashboard/inventory" className="text-sm text-[#007a55] hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Back to Inventory
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receive Stock</h1>
        <p className="text-gray-500 dark:text-gray-400">Add a new batch of medicine to your pharmacy.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full max-w-md mx-auto mb-6">
        <button
          onClick={() => setImportMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            importMode === 'manual' 
              ? 'bg-white dark:bg-gray-900 text-[#007a55] shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <PlusSquare size={18} /> Manual Entry
        </button>
        <button
          onClick={() => setImportMode('bulk')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            importMode === 'bulk' 
              ? 'bg-white dark:bg-gray-900 text-[#007a55] shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <FileSpreadsheet size={18} /> Bulk Import
        </button>
      </div>

      {importMode === 'bulk' ? (
        <BulkStockImport 
          pharmacyId={getPharmacyId()} 
          onSuccess={() => {
            setSuccess(true);
            setTimeout(() => navigate('/pharmacy/dashboard/inventory'), 2000);
          }} 
        />
      ) : (
        <>
          {/* Select Medicine */}
          {!selectedMedicine && !isNewMedicineMode && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">
                Search Central Catalogue
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search medicine (e.g. Paracetamol)..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
                />
                {isSearching && <Loader2 size={18} className="absolute right-3 top-3 animate-spin text-gray-400" />}
              </div>

              {catalogue.length > 0 && (
                <div className="mt-4 border border-gray-100 dark:border-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto">
                  {catalogue.map((med) => (
                    <div 
                      key={med.id || med.medicineId}
                      onClick={() => setSelectedMedicine(med)}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{med.medicineName || med.name}</p>
                        <p className="text-xs text-gray-500">{med.genericName} {med.strength && `• ${med.strength}`}</p>
                      </div>
                      <Plus size={16} className="text-[#007a55]" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                <p className="text-sm text-gray-500 mb-3">Can't find the medicine?</p>
                <button 
                  onClick={() => setIsNewMedicineMode(true)}
                  className="text-sm font-semibold text-[#007a55] hover:underline"
                >
                  + Register New Medicine in Catalogue
                </button>
              </div>
            </div>
          )}

          {/* Register New Medicine */}
          {isNewMedicineMode && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Pill className="text-[#007a55]" size={20} /> Register New Medicine
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Add this to the global catalogue.</p>
                </div>
                <button onClick={() => setIsNewMedicineMode(false)} className="text-sm text-gray-500 hover:text-red-500 hover:underline">Cancel</button>
              </div>
              
              <form onSubmit={handleRegisterMedicine} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Medicine Name *</label>
                    <input type="text" name="medicineName" required value={newMedicineData.medicineName} onChange={handleNewMedicineInputChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" placeholder="e.g. Amoxicillin 500mg Capsules" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Generic Name *</label>
                    <input type="text" name="genericName" required value={newMedicineData.genericName} onChange={handleNewMedicineInputChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" placeholder="e.g. Amoxicillin" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Brand Name</label>
                    <input type="text" name="brandName" value={newMedicineData.brandName} onChange={handleNewMedicineInputChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" placeholder="e.g. Amoxil" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Strength</label>
                    <input type="text" name="strength" value={newMedicineData.strength} onChange={handleNewMedicineInputChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" placeholder="e.g. 500mg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Dosage Form</label>
                    <select name="dosageForm" value={newMedicineData.dosageForm} onChange={handleNewMedicineInputChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white">
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                      <option value="Cream">Cream</option>
                      <option value="Drops">Drops</option>
                    </select>
                  </div>
                  <div className="flex items-center mt-6">
                    <input type="checkbox" name="requiresPrescription" checked={newMedicineData.requiresPrescription} onChange={handleNewMedicineInputChange} className="w-4 h-4 text-[#007a55] border-gray-300 rounded focus:ring-[#007a55]" />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Requires Prescription</label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea name="description" rows="2" value={newMedicineData.description} onChange={handleNewMedicineInputChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white resize-none" placeholder="e.g. Broad-spectrum antibiotic for bacterial infections." />
                </div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2.5 bg-[#007a55] text-white rounded-lg font-semibold text-sm hover:bg-[#006645] transition-colors disabled:opacity-70">
                  {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  {isLoading ? 'Registering...' : 'Save to Catalogue & Continue'}
                </button>
              </form>
            </div>
          )}

          {/* Enter Batch Details */}
          {selectedMedicine && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{selectedMedicine.medicineName || selectedMedicine.name}</h3>
                    <p className="text-xs text-gray-500">{selectedMedicine.genericName}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMedicine(null)} className="text-sm text-red-500 hover:underline">Change Medicine</button>
              </div>

              <form onSubmit={handleStockIn} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Batch Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number</label>
                    <div className="relative">
                      <Package size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="text" name="batchNumber" required value={formData.batchNumber} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" placeholder="e.g. BATCH-2026-001" />
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="date" name="expiryDate" required value={formData.expiryDate} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Received</label>
                    <div className="relative">
                      <Plus size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="number" name="quantityReceived" required min="1" value={formData.quantityReceived} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" placeholder="e.g. 100" />
                    </div>
                  </div>

                  {/* Reorder Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Level (Low Stock Alert)</label>
                    <div className="relative">
                      <AlertTriangle size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="number" name="reorderLevel" required min="0" value={formData.reorderLevel} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" placeholder="e.g. 10" />
                    </div>
                  </div>

                  {/* Purchase Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price (Cost)</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="number" name="purchasePrice" min="0" step="0.01" value={formData.purchasePrice} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" placeholder="e.g. 12.00 (Optional)" />
                    </div>
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price (Unit Price)</label>
                    <div className="relative">
                      <TrendingUp size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="number" name="sellingPrice" min="0" step="0.01" value={formData.sellingPrice} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" placeholder="e.g. 15.50" />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
                    <textarea name="notes" rows="2" value={formData.notes} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white resize-none" placeholder="e.g. Initial stock from supplier" />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 bg-[#007a55] text-white rounded-lg font-bold hover:bg-[#006645] transition-colors disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Package className="mr-2" size={20} />}
                  {isLoading ? 'Saving Batch...' : 'Receive Stock'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StockIn;