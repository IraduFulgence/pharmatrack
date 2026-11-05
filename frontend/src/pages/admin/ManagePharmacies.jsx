import React, { useState, useEffect } from 'react';
import { 
  Search, CheckCircle2, XCircle, Eye, X, FileText, 
  Download, Loader2, AlertCircle 
} from 'lucide-react';
import { adminService } from '../../services/AdminServices';
const ManagePharmacies = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Reject Reason State
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState(null);

  // Fetch Pharmacies
  useEffect(() => {
    fetchPharmacies();
  }, []);

  const fetchPharmacies = async () => {
    try {
      setIsLoading(true);
      const response = await adminService.getAllPharmacies();
      console.log(response);
      let list = [];
      if (response?.data?.pharmacies) list = response.data.pharmacies;
      else if (Array.isArray(response?.data)) list = response.data;
      else if (Array.isArray(response)) list = response;

      setPharmacies(list);
    } catch (err) {
      console.error("Failed to load pharmacies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Frontend filter 
  const filteredPharmacies = Array.isArray(pharmacies) ? pharmacies.filter(ph => {
    const name = ph.pharmacyName || ph.name || '';
    const tin = ph.tin || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || tin.includes(searchTerm);
  }) : [];

  // Action Handlers
  const handleApprove = async (id) => {
    setIsActionLoading(true);
    setApiError(null);
    try {
      await adminService.approvePharmacy(id);
      // Update local state without re-fetching
      setPharmacies(pharmacies.map(p => 
        (p.id === id || p.pharmacyId === id) ? { ...p, verificationStatus: 'APPROVED' } : p
      ));
      closeModal();
    } catch (err) {
      setApiError(err.message || "Failed to approve pharmacy.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      setRejectError("A reason is required to reject.");
      return;
    }

    setIsActionLoading(true);
    setApiError(null);
    setRejectError(null);
    
    try {
      await adminService.rejectPharmacy(id, rejectReason);
      // Update local state
      setPharmacies(pharmacies.map(p => 
        (p.id === id || p.pharmacyId === id) ? { ...p, verificationStatus: 'REJECTED' } : p
      ));
      closeModal();
    } catch (err) {
      setApiError(err.message || "Failed to reject pharmacy.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedPharmacy(null);
    setShowRejectInput(false);
    setRejectReason('');
    setApiError(null);
    setRejectError(null);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Pharmacies</h1>
          <p className="text-gray-500 dark:text-gray-400">Review applications and manage access.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or TIN..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Pharmacy Name</th>
                <th className="px-6 py-4">TIN</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading pharmacies...
                  </td>
                </tr>
              ) : filteredPharmacies.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No pharmacies found.
                  </td>
                </tr>
              ) : (
                filteredPharmacies.map((ph) => (
                  <tr key={ph.id || ph.pharmacyId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {ph.pharmacyName || ph.name}
                    </td>
                    <td className="px-6 py-4">{ph.tin}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(ph.verificationStatus)}`}>
                        {ph.verificationStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedPharmacy(ph)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Eye size={16} /> Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pharmacy Details</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              
              {apiError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle size={16} /> {apiError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Name</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPharmacy.pharmacyName}</p></div>
                <div><p className="text-gray-500">TIN</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPharmacy.tin}</p></div>
                <div><p className="text-gray-500">Email</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPharmacy.email}</p></div>
                <div><p className="text-gray-500">Phone</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPharmacy.phoneNumber}</p></div>
              </div>

              {/* Documents Section */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Verification Documents</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <span className="text-sm flex items-center gap-2 font-medium"><FileText size={18} className="text-blue-500"/> Pharmacy License</span>
                    {/* Note: Real download requires a special fetch call to handle binary files. For now, it's a placeholder */}
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Download size={18}/></button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <span className="text-sm flex items-center gap-2 font-medium"><FileText size={18} className="text-blue-500"/> RDB Certificate</span>
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Download size={18}/></button>
                  </div>
                </div>
              </div>

              {/* Reject Input Section */}
              {showRejectInput && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-red-600 mb-1">Reason for Rejection (Required)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (rejectError) setRejectError(null);
                    }}
                    rows="3"
                    className={`w-full bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white ${rejectError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="e.g., RDB certificate is expired or unreadable..."
                  />
                  {rejectError && <p className="text-red-500 text-xs mt-1">{rejectError}</p>}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-3">
              
              {selectedPharmacy.verificationStatus === 'PENDING' && (
                <>
                  {showRejectInput ? (
                    <div className="flex gap-3 w-full">
                      <button 
                        onClick={() => setShowRejectInput(false)}
                        disabled={isActionLoading}
                        className="w-1/3 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleReject(selectedPharmacy.id || selectedPharmacy.pharmacyId)}
                        disabled={isActionLoading}
                        className="w-2/3 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg font-semibold transition-colors"
                      >
                        {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Reject'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 w-full">
                      <button 
                        onClick={() => setShowRejectInput(true)}
                        disabled={isActionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-semibold transition-colors"
                      >
                        <XCircle size={18} /> Reject
                      </button>
                      <button 
                        onClick={() => handleApprove(selectedPharmacy.id || selectedPharmacy.pharmacyId)}
                        disabled={isActionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-semibold transition-colors"
                      >
                        {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> Approve</>}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* If already approved or rejected, show a close button */}
              {selectedPharmacy.verificationStatus !== 'PENDING' && (
                <button 
                  onClick={closeModal}
                  className="w-full py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePharmacies;