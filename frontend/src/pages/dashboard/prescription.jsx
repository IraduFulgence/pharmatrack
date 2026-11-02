import React, { useState } from 'react';
import { 
  Search, FileText, CheckCircle2, Clock, XCircle, 
  Eye, X, User, Calendar, Download, Plus, UploadCloud 
} from 'lucide-react';

const Prescriptions = () => {

  const [prescriptions, setPrescriptions] = useState([
    {
      id: 'RX-1042',
      patientName: 'Alice Mukamana',
      date: '2024-05-20',
      status: 'Pending',
      doctor: 'Dr. Jean Paul',
      fileUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
      notes: 'Patient needs 3 months supply.'
    },
    {
      id: 'RX-1043',
      patientName: 'David Habimana',
      date: '2024-05-20',
      status: 'Processing',
      doctor: 'Dr. Marie Claire',
      fileUrl: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=800&auto=format&fit=crop',
      notes: 'Urgent request.'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRx, setSelectedRx] = useState(null);


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRxData, setNewRxData] = useState({
    patientName: '',
    doctor: '',
    notes: '',
    file: null 
  });


  const filteredPrescriptions = prescriptions.filter(rx => 
    rx.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    rx.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateStatus = (id, newStatus) => {
    setPrescriptions(prescriptions.map(rx => 
      rx.id === id ? { ...rx, status: newStatus } : rx
    ));
    if (selectedRx && selectedRx.id === id) {
      setSelectedRx({ ...selectedRx, status: newStatus });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRxData({ ...newRxData, [name]: value });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setNewRxData({ ...newRxData, file: file });
  };

  const handleCreatePrescription = (e) => {
    e.preventDefault();
    
    
    const newId = `RX-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Create the new object
    const newPrescription = {
      id: newId,
      patientName: newRxData.patientName,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending', 
      doctor: newRxData.doctor,
      notes: newRxData.notes,
      
      fileUrl: newRxData.file 
        ? URL.createObjectURL(newRxData.file) 
        : 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop' 
    };

    
    setPrescriptions([newPrescription, ...prescriptions]);
    

    setNewRxData({ patientName: '', doctor: '', notes: '', file: null });
    setIsAddModalOpen(false);
  };


  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Processing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Ready': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prescriptions</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage incoming patient prescriptions and update their status.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#007a55] hover:bg-[#006645] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Prescription
        </button>
      </div>

      {/* Toolbar  */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Search by patient name or RX number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
          />
        </div>
      </div>

      {/* Table  */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">RX Number</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Date Received</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredPrescriptions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No prescriptions found.
                  </td>
                </tr>
              ) : (
                filteredPrescriptions.map((rx) => (
                  <tr key={rx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      {rx.id}
                    </td>
                    <td className="px-6 py-4">{rx.patientName}</td>
                    <td className="px-6 py-4">{rx.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(rx.status)}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedRx(rx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#007a55] bg-[#e6f4ef] hover:bg-[#d1eae1] dark:bg-[#007a55]/10 dark:text-[#34d399] dark:hover:bg-[#007a55]/20 rounded-lg transition-colors"
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

      {/* --- CREATE MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Prescription</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient Name</label>
                  <input 
                    type="text" 
                    name="patientName"
                    required
                    value={newRxData.patientName}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:text-white"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prescribing Doctor</label>
                  <input 
                    type="text" 
                    name="doctor"
                    required
                    value={newRxData.doctor}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:text-white"
                    placeholder="e.g. Dr. Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Prescription (Image/PDF)</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <UploadCloud size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {newRxData.file ? newRxData.file.name : "Click to upload file"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                <textarea 
                  name="notes"
                  rows="3"
                  value={newRxData.notes}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55] dark:text-white resize-none"
                  placeholder="Any special instructions..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#007a55] hover:bg-[#006645] text-white rounded-lg font-semibold transition-colors"
                >
                  Create Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REVIEW MODAL  --- */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200">
           
             <div className="w-full md:w-1/2 bg-gray-100 dark:bg-gray-950 p-4 flex flex-col relative min-h-[300px]">
               <button onClick={() => setSelectedRx(null)} className="absolute top-4 left-4 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 z-10 md:hidden"><X size={20} /></button>
               <div className="flex-grow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-white">
                  <img src={selectedRx.fileUrl} alt="Prescription" className="w-full h-full object-cover object-top" />
               </div>
               <div className="mt-4 flex justify-center">
                 <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"><Download size={16} /> Download Original</button>
               </div>
            </div>
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Prescription Details</h2>
                  <p className="text-sm text-gray-500">RX Number: {selectedRx.id}</p>
                </div>
                <button onClick={() => setSelectedRx(null)} className="hidden md:block text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
              </div>
              <div className="space-y-6 flex-grow">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm"><User size={18} className="text-gray-400" /><span className="font-medium text-gray-900 dark:text-white">{selectedRx.patientName}</span></div>
                  <div className="flex items-center gap-3 text-sm"><Calendar size={18} className="text-gray-400" /><span className="text-gray-600 dark:text-gray-300">Received on {selectedRx.date}</span></div>
                  <div className="flex items-center gap-3 text-sm"><FileText size={18} className="text-gray-400" /><span className="text-gray-600 dark:text-gray-300">Prescribed by {selectedRx.doctor}</span></div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Patient Notes</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">{selectedRx.notes || "No additional notes provided."}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Update Status</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => updateStatus(selectedRx.id, 'Processing')} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors border ${selectedRx.status === 'Processing' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}><Clock size={16} /> Processing</button>
                    <button onClick={() => updateStatus(selectedRx.id, 'Ready')} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors border ${selectedRx.status === 'Ready' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}><CheckCircle2 size={16} /> Ready</button>
                    <button onClick={() => updateStatus(selectedRx.id, 'Rejected')} className={`col-span-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors border ${selectedRx.status === 'Rejected' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}><XCircle size={16} /> Reject Prescription</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;