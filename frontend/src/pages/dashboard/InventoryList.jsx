import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Package, AlertTriangle, ChevronRight, X, 
  Loader2, Calendar, FileText, ArrowLeft, Edit, Save, ShieldAlert
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import MedicineClassificationFields, { MedicineClassificationBadges, agesAreValid, classificationPayload } from '../../components/inventory/MedicineClassificationFields';

/** Form values for the category/tags/ages fields, from a medicine as the API returns it. */
const classificationFromMedicine = (m) => ({
  categoryId: m?.category_id != null ? String(m.category_id) : '',
  indications: m?.indications || [],
  minAgeYears: m?.min_age_years ?? '',
  maxAgeYears: m?.max_age_years ?? '',
  dosageNotes: m?.dosage_notes || '',
});

const InventoryList = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Main Modal State
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [batches, setBatches] = useState([]);
  const [isBatchesLoading, setIsBatchesLoading] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  // Category, tags, age limits and dosage notes (edited together, sent as snake_case).
  const [editClassification, setEditClassification] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // 🚨 NEW: Adjust Sub-Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState(null);
  const [adjustData, setAdjustData] = useState({
    adjustmentType: 'DAMAGED',
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    fetchMedicines();
  }, []);

  const getPharmacyId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.id || user?.pharmacyId;
    } catch {
      return null;
    }
  };

  const fetchMedicines = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getPharmacyMedicines();
      
      let list = [];
      if (response?.data?.medicines) list = response.data.medicines;
      else if (Array.isArray(response?.data)) list = response.data;
      else if (Array.isArray(response)) list = response;

      setMedicines(list);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewBatches = async (medicine) => {
    setSelectedMedicine(medicine);
    setIsEditing(false);
    setIsBatchesLoading(true);
    
    setEditFormData({
      medicine_name: medicine.medicine_name || medicine.medicineName || '',
      generic_name: medicine.generic_name || medicine.genericName || '',
      brand_name: medicine.brand_name || medicine.brandName || '',
      strength: medicine.strength || '',
      dosage_form: medicine.dosage_form || medicine.dosageForm || 'Tablet',
      description: medicine.description || '',
      requires_prescription: medicine.requires_prescription ?? medicine.requiresPrescription ?? false,
    });
    setEditClassification(classificationFromMedicine(medicine));

    try {
      const medicineId = medicine.id || medicine.medicineId || medicine.medicine_id;
      const response = await inventoryService.getMedicineDetails(medicineId);
      
      let batchList = [];
      if (Array.isArray(response?.data?.batches)) batchList = response.data.batches;
      else if (Array.isArray(response?.data?.medicine?.batches)) batchList = response.data.medicine.batches;
      else if (Array.isArray(response?.batches)) batchList = response.batches;
      else if (Array.isArray(response?.data)) batchList = response.data;

      setBatches(batchList);
      // The details include the latest category, tags and ages.
      const details = response?.data?.medicine;
      if (details && !Array.isArray(details)) {
        setSelectedMedicine((prev) => ({ ...prev, ...details }));
        setEditClassification(classificationFromMedicine(details));
      }
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setIsBatchesLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!agesAreValid(editClassification)) {
      setEditError('Minimum age cannot be above the maximum age.');
      return;
    }
    setIsSaving(true);
    setEditError(null);

    try {
      const medicineId = selectedMedicine.id || selectedMedicine.medicineId || selectedMedicine.medicine_id;
      const cls = classificationPayload(editClassification);
      const changes = {
        ...editFormData,
        category_id: cls.categoryId,
        indications: cls.indications,
        min_age_years: cls.minAgeYears,
        max_age_years: cls.maxAgeYears,
        dosage_notes: cls.dosageNotes,
      };
      const res = await inventoryService.updateMedicine(medicineId, changes);
      const saved = res?.data && !Array.isArray(res.data) ? res.data : changes;

      setSelectedMedicine({ ...selectedMedicine, ...editFormData, ...saved });
      setIsEditing(false);
      // Reload so the list shows the new category name, tags and ages.
      fetchMedicines();
    } catch (err) {
      setEditError(err.message || "Failed to update medicine.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setSelectedMedicine(null);
    setBatches([]);
    setIsEditing(false);
    setEditError(null);
    setIsAdjustModalOpen(false);
    setSelectedBatch(null);
  };

  // 🚨 NEW: Open Adjust Modal
  const openAdjustModal = (batch) => {
    setSelectedBatch(batch);
    setAdjustData({ adjustmentType: 'DAMAGED', quantity: '', reason: '' });
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  // 🚨 NEW: Submit Adjustment
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustData.quantity || Number(adjustData.quantity) <= 0) {
      setAdjustError("Please enter a valid quantity.");
      return;
    }
    if (!adjustData.reason.trim()) {
      setAdjustError("Please provide a reason.");
      return;
    }

    setIsAdjusting(true);
    setAdjustError(null);

    try {
      const pharmacyId = getPharmacyId();
      const batchId = selectedBatch.id || selectedBatch.inventory_id || selectedBatch.batchId;

      await inventoryService.adjustStock(pharmacyId, {
        inventoryId: Number(batchId),
        adjustmentType: adjustData.adjustmentType,
        quantity: Number(adjustData.quantity),
        reason: adjustData.reason,
      });

      setIsAdjustModalOpen(false);
      // Refresh the batches to show the new quantity
      await handleViewBatches(selectedMedicine);
      
    } catch (err) {
      setAdjustError(err.message || "Failed to adjust stock.");
    } finally {
      setIsAdjusting(false);
    }
  };

  // Search by name, category or tag.
  const filteredMedicines = Array.isArray(medicines) ? medicines.filter(med => {
    const term = searchTerm.toLowerCase();
    const haystack = [
      med.name || med.medicineName || med.medicine_name || '',
      med.category_name || '',
      ...(med.indications || []),
    ].join(' ').toLowerCase();
    return haystack.includes(term);
  }) : [];

  return (
    <div className="space-y-6 mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to="/pharmacy/dashboard/inventory" className="text-sm text-[#007a55] hover:underline flex items-center gap-1 mb-2">
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
                  const stock = med.total_quantity ?? med.quantity ?? med.totalStock ?? 0;
                  const isLowStock = stock <= (med.reorderLevel || 10);
                  
                  return (
                    <tr key={med.id || med.medicineId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                          <Package size={18} />
                        </div>
                        <div>
                          {med.name || med.medicineName || med.medicine_name}
                          <MedicineClassificationBadges medicine={med} />
                        </div>
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
                      <td className="px-6 py-4">{med.batchCount ?? 1} active</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleViewBatches(med)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#007a55] bg-[#e6f4ef] hover:bg-[#d1eae1] rounded-lg transition-colors"
                        >
                          View / Edit <ChevronRight size={16} />
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

      {/* MAIN EDIT MEDICINE MODAL */}
      {selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isEditing ? 'Edit Medicine Details' : (selectedMedicine.medicine_name || selectedMedicine.medicineName)}
                </h2>
                <p className="text-sm text-gray-500">
                  {isEditing ? 'Update the information in the central catalogue.' : 'Specific batches & expirations'}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              
              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {editError}
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Medicine Name *</label>
                      <input type="text" name="medicine_name" required value={editFormData.medicine_name || ''} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Generic Name *</label>
                      <input type="text" name="generic_name" required value={editFormData.generic_name || ''} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Brand Name</label>
                      <input type="text" name="brand_name" value={editFormData.brand_name || ''} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Strength</label>
                      <input type="text" name="strength" value={editFormData.strength || ''} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Dosage Form</label>
                      <select name="dosage_form" value={editFormData.dosage_form || 'Tablet'} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white">
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Injection">Injection</option>
                        <option value="Cream">Cream</option>
                        <option value="Drops">Drops</option>
                      </select>
                    </div>
                    <div className="flex items-center mt-6">
                      <input type="checkbox" name="requires_prescription" checked={editFormData.requires_prescription || false} onChange={handleEditChange} className="w-4 h-4 text-[#007a55] border-gray-300 rounded focus:ring-[#007a55]" />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Requires Prescription</label>
                    </div>
                  </div>
                  <MedicineClassificationFields
                    idPrefix="edit-med"
                    value={editClassification}
                    onChange={(patch) => setEditClassification((prev) => ({ ...prev, ...patch }))}
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea name="description" rows="3" value={editFormData.description || ''} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white resize-none" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSaving} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-[#007a55] text-white rounded-lg font-semibold hover:bg-[#006645] transition-colors disabled:opacity-70">
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                    <MedicineClassificationBadges medicine={selectedMedicine} maxTags={20} />
                    {selectedMedicine.dosage_notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2"><span className="font-semibold">Dosage:</span> {selectedMedicine.dosage_notes}</p>
                    )}
                  </div>
                  {isBatchesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-[#007a55]" size={32} />
                    </div>
                  ) : batches.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No active batches found for this medicine.</div>
                  ) : (
                    <div className="space-y-4">
                      {batches.map((batch) => (
                        <div key={batch.id || batch.inventory_id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 gap-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <FileText size={16} className="text-gray-400"/> 
                              Batch: {batch.batchNumber || batch.batch_number || batch.batchNo}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              <Calendar size={14} /> Expires: {new Date(batch.expiryDate || batch.expiry_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="text-left sm:text-right">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Qty: {batch.quantity ?? batch.quantity_remaining ?? batch.quantityReceived}
                              </p>
                              <p className="text-xs text-gray-500">
                                Price: {batch.unitPrice || batch.unit_price} RWF
                              </p>
                            </div>
                            
                            {/* ADJUST BUTTON */}
                            <button
                              onClick={() => openAdjustModal(batch)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-100 dark:border-red-900/50"
                            >
                              <ShieldAlert size={14} /> Adjust
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-between items-center">
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Edit size={16} /> Edit Details
                </button>
              )}
              <button 
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isAdjustModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-7xl overflow-hidden">
            
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-red-50 dark:bg-red-900/10">
              <h3 className="font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle size={20} /> Adjust Stock
              </h3>
              <p className="text-xs text-red-500 mt-1">Record damages, expiries, or corrections.</p>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Batch: {selectedBatch.batch_number || selectedBatch.batchNumber}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Current: {selectedBatch.quantity}</span>
              </div>

              {adjustError && (
                <p className="text-sm text-red-500">{adjustError}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adjustment Type</label>
                <select 
                  value={adjustData.adjustmentType}
                  onChange={(e) => setAdjustData({...adjustData, adjustmentType: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
                >
                  <option value="DAMAGED">Damaged</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="LOST">Lost / Stolen</option>
                  <option value="PHYSICAL_COUNT">Physical Count Correction</option>
                  <option value="INCREASE">Increase (Found extra)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <input 
                  type="number" required min="1"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({...adjustData, quantity: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
                <textarea 
                  required rows="2"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({...adjustData, reason: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white resize-none"
                  placeholder="e.g. Water damage during storage."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold">Cancel</button>
                <button type="submit" disabled={isAdjusting} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50">
                  {isAdjusting ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;