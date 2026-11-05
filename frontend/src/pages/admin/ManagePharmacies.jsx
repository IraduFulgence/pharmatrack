import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, Eye, X, FileText, Download } from 'lucide-react';

const ManagePharmacies = () => {
  
  const [pharmacies, setPharmacies] = useState([
    { id: 1, name: 'Ineza Pharmacy', tin: '123456789', owner: 'John Doe', phone: '+250788111222', status: 'PENDING', date: '2024-05-20' },
    { id: 2, name: 'Kigali Care', tin: '987654321', owner: 'Jane Smith', phone: '+250788333444', status: 'APPROVED', date: '2024-05-18' },
    { id: 3, name: 'Remera Meds', tin: '555666777', owner: 'Eric N.', phone: '+250788555666', status: 'REJECTED', date: '2024-05-15' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  const filteredPharmacies = pharmacies.filter(ph => 
    ph.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ph.tin.includes(searchTerm)
  );

  const updateStatus = (id, newStatus) => {
   
    setPharmacies(pharmacies.map(ph => 
      ph.id === id ? { ...ph, status: newStatus } : ph
    ));
    setSelectedPharmacy(null); 
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Pharmacies</h1>
          <p className="text-gray-500 dark:text-gray-400">Review applications and manage access.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or TIN..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
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
            {filteredPharmacies.map((ph) => (
              <tr key={ph.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{ph.name}</td>
                <td className="px-6 py-4">{ph.tin}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(ph.status)}`}>
                    {ph.status}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pharmacy Application</h2>
              <button onClick={() => setSelectedPharmacy(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Name</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPharmacy.name}</p></div>
                <div><p className="text-gray-500">TIN</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPharmacy.tin}</p></div>
                <div><p className="text-gray-500">Owner</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPharmacy.owner}</p></div>
                <div><p className="text-gray-500">Phone</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPharmacy.phone}</p></div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Uploaded Documents</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                    <span className="text-sm flex items-center gap-2"><FileText size={16}/> Pharmacy License.pdf</span>
                    <button className="text-blue-600"><Download size={16}/></button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                    <span className="text-sm flex items-center gap-2"><FileText size={16}/> RDB Certificate.pdf</span>
                    <button className="text-blue-600"><Download size={16}/></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 bg-gray-50 dark:bg-gray-900/50">
              <button 
                onClick={() => updateStatus(selectedPharmacy.id, 'REJECTED')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-semibold transition-colors"
              >
                <XCircle size={18} /> Reject
              </button>
              <button 
                onClick={() => updateStatus(selectedPharmacy.id, 'APPROVED')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-semibold transition-colors"
              >
                <CheckCircle2 size={18} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePharmacies;