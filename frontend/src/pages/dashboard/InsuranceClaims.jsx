import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Clock, DollarSign, 
  Loader2, Edit, X, Save, Calendar 
} from 'lucide-react';
import { salesService } from '../../services/salesService';

const InsuranceClaims = () => {
  const [claims, setClaims] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'ALL',
    startDate: '',
    endDate: '',
  });

  // Modal State
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    claimstatus: 'APPROVED',
   
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
     
      const [claimsRes, summaryRes] = await Promise.all([
        salesService.getInsuranceClaims(filters),
        salesService.getClaimsSummary()
      ]);

      
      setClaims(claimsRes.data?.claims || claimsRes.data || []);
      setSummary(summaryRes.data || null);

    } catch (err) {
      setError(err.message || "Failed to load claims.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const openUpdateModal = (claim) => {
    setSelectedClaim(claim);
    setUpdateForm({
      claimStatus: claim.claim_status === 'PENDING' ? 'APPROVED' : claim.claim_status,
      notes: claim.notes || ''
    });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const claimId = selectedClaim.claim_id;
      await salesService.updateClaimStatus(claimId, {
         claimStatus: updateForm.claimStatus,
        notes: updateForm.notes
      });
      
    
      await fetchData();
      setSelectedClaim(null);
      
    } catch (err) {
      alert(err.message || "Failed to update claim.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'APPROVED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insurance Claims</h1>
        <p className="text-gray-500 dark:text-gray-400">Track and manage claims submitted to insurance providers.</p>
      </div>

      {/* Summary Cards - Updated to match backend 'breakdown' structure */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Claims</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary?.breakdown?.pending || 0}
            </p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary?.breakdown?.approved || 0}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Outstanding Balance</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {Number(summary?.totalOutstanding || 0).toLocaleString()} RWF
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Recovered</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {Number(summary?.totalPaid || 0).toLocaleString()} RWF
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select 
            name="status" 
            value={filters.status} 
            onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#007a55]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
          <input 
            type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
          <input 
            type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Claim Info</th>
                <th className="px-6 py-4">Patient & Provider</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Insurance Pays</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto mb-2 text-[#007a55]" size={24} />
                    Loading claims...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No insurance claims found.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => {
                  // Safe fallback keys for the table data
                  const claimId = claim.id || claim.claimId || claim.claim_id;
                  const claimNumber = claim.claimNumber || claim.claim_number || `CLM-${claimId}`;
                  const cardNumber = claim.cardNumber || claim.card_number || claim.insurance_card_number || 'N/A';
                  const patientName = claim.patientName || claim.patient_name || claim.customer_name || 'Unknown';
                  const providerName = claim.providerName || claim.provider_name || claim.insurance?.providerName || 'Insurance';
                  const totalAmount = claim.totalAmount || claim.total_claimed_amount || claim.grossTotal || 0;
                  const insurancePays = claim.paid_amount || claim.insurance_contribution || claim.insuranceAmount || 0;
                  const status = claim.claim_status || 'PENDING';
                  const createdAt = claim.createdAt || claim.created_at;

                  return (
                    <tr key={claimId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 dark:text-white">{claimNumber}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar size={12}/> 
                          {createdAt && !isNaN(new Date(createdAt).getTime()) 
                            ? new Date(createdAt).toLocaleDateString() 
                            : 'Invalid Date'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Card: {cardNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{patientName}</p>
                        <p className="text-xs text-blue-600 mt-1">{providerName}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {Number(totalAmount).toLocaleString()} RWF
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#007a55]">
                        {Number(insurancePays).toLocaleString()} RWF
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openUpdateModal(claim)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Edit size={14} /> Update
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

      {/* Update Claim Modal  */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white">Update Claim Status</h3>
              <button onClick={() => setSelectedClaim(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-4 space-y-4">
              
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm mb-2">
                <p><span className="text-gray-500">Claim:</span> <span className="font-bold">{selectedClaim.claimNumber || selectedClaim.claim_number}</span></p>
                <p><span className="text-gray-500">Patient:</span> {selectedClaim.patientName || selectedClaim.customer_name}</p>
                <p><span className="text-gray-500">Provider:</span> {selectedClaim.providerName || selectedClaim.provider_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
                <select 
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007a55] dark:text-white"
                >
                  <option value="PENDING">Pending (Waiting for Insurance)</option>
                  <option value="APPROVED">Approved (Insurance agreed to pay)</option>
                  <option value="PAID">Paid (Money received)</option>
                  <option value="REJECTED">Rejected (Insurance refused)</option>
                </select>
              </div>

              {updateForm.status === 'PAID' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Received</label>
                  <input 
                    type="number"
                    value={updateForm.insurancePaymentAmount}
                    onChange={(e) => setUpdateForm({ ...updateForm, insurancePaymentAmount: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007a55] dark:text-white"
                    placeholder="e.g. 2933"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes / Reference</label>
                <textarea 
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  rows="2"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#007a55] dark:text-white resize-none"
                  placeholder="e.g. Approved by RAMA agent on 12th Nov..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-[#007a55] text-white rounded-lg font-semibold hover:bg-[#006645] transition-colors disabled:opacity-70"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceClaims;