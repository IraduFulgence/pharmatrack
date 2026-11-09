import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, AlertTriangle, ShieldAlert, FileText, 
  Loader2, CheckCircle2, AlertCircle, HelpCircle
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

const AdjustStock = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // If navigated from a specific batch, we get the data from state
  const preSelectedBatch = location.state?.batch;
  //console.log('batches',preSelectedBatch);
  const preSelectedMedicine = location.state?.medicineName;

  // Form State
  const [formData, setFormData] = useState({
    inventoryId: preSelectedBatch?.inventory_id || preSelectedBatch?.batchId || '',
    adjustmentType: 'DAMAGED',
    quantity: '',
    reason: '',
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const pharmacyId = getPharmacyId();
      if (!pharmacyId) throw new Error("Pharmacy ID missing. Please re-login.");

      const payload = {
        inventoryId: Number(formData.inventoryId),
        adjustmentType: formData.adjustmentType,
        quantity: Number(formData.quantity),
        reason: formData.reason,
        notes: formData.notes
      };

      await inventoryService.adjustStock(pharmacyId, payload);
      
      setSuccess(true);
      setTimeout(() => navigate('/pharmacy/dashboard/inventory'), 2000);
      
    } catch (err) {
      setError(err.message || "Failed to submit adjustment.");
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Adjustment Recorded!</h2>
        <p className="text-gray-500">The inventory batch has been updated.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <Link to="/pharmacy/dashboard/inventory/list" className="text-sm text-[#007a55] hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Back to Inventory
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Adjustment</h1>
        <p className="text-gray-500 dark:text-gray-400">Record damages, expiries, losses, or physical counts.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        
        {preSelectedMedicine && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Adjusting Batch For</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{preSelectedMedicine}</p>
              <p className="text-xs text-gray-500">Batch: {preSelectedBatch?.batchNumber || preSelectedBatch?.batch_number}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* If not pre-selected, ask for the Inventory Batch ID */}
          {!preSelectedBatch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Inventory Batch ID
              </label>
              <div className="relative">
                <HelpCircle size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="number" name="inventoryId" required 
                  value={formData.inventoryId} onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" 
                  placeholder="e.g. 1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">You can find this ID in the specific batch details.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Adjustment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adjustment Type</label>
              <div className="relative">
                <AlertTriangle size={16} className="absolute left-3 top-3 text-gray-400" />
                <select 
                  name="adjustmentType" required
                  value={formData.adjustmentType} onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white"
                >
                  <option value="DAMAGED">Damaged</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="LOST">Lost / Stolen</option>
                  <option value="PHYSICAL_COUNT">Physical Count Correction</option>
                  <option value="INCREASE">Increase (Found extra)</option>
                  <option value="DECREASE">Decrease (General)</option>
                </select>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <div className="relative">
                <ShieldAlert size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="number" name="quantity" required min="1"
                  value={formData.quantity} onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" 
                  placeholder="e.g. 5"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
            <input 
              type="text" name="reason" required 
              value={formData.reason} onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white" 
              placeholder="e.g. Water damage during storage inspection."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
              <textarea 
                name="notes" rows="3" 
                value={formData.notes} onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#007a55] dark:bg-gray-800 dark:text-white resize-none" 
                placeholder="e.g. Inspected by Pharmacist on duty."
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 bg-green-800 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <AlertTriangle className="mr-2" size={20} />}
            {isLoading ? 'Submitting...' : 'Submit Adjustment'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdjustStock;