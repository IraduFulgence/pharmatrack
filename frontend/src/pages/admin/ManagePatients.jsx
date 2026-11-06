import React, { useState, useEffect } from 'react';
import { 
  Search, User, Mail, Phone, Calendar, Edit, 
  ShieldAlert, ShieldCheck, X, Loader2, AlertCircle, Save 
} from 'lucide-react';

import { adminService } from '../../services/AdminServices';
const ManagePatients = () => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Form State 
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: ''
  });

  
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const response = await adminService.getAllPatients();
      
      
      let list = [];
      if (response?.data?.patients) list = response.data.patients;
      else if (Array.isArray(response?.data)) list = response.data;
      else if (Array.isArray(response)) list = response;

      setPatients(list);
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter
  const filteredPatients = Array.isArray(patients) ? patients.filter(p => {
    const name = p.fullName || p.name || '';
    const phone = p.phoneNumber || p.phone || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
  }) : [];

  
  const openModal = (patient) => {
    setSelectedPatient(patient);
    setEditForm({
      fullName: patient.fullName || '',
      email: patient.email || '',
      phoneNumber: patient.phoneNumber || '',
      gender: patient.gender || 'Male',
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '' // Ensure YYYY-MM-DD
    });
    setIsEditing(false);
    setApiError(null);
  };

  const closeModal = () => {
    setSelectedPatient(null);
    setIsEditing(false);
    setApiError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);
    setApiError(null);
    try {
      await adminService.updatePatient(selectedPatient.id, editForm);
      
      setPatients(patients.map(p => p.id === selectedPatient.id ? { ...p, ...editForm } : p));
      setIsEditing(false);
    } catch (err) {
      setApiError(err.message || "Failed to update patient.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsActionLoading(true);
    setApiError(null);
    try {
      await adminService.togglePatientStatus(selectedPatient.id);
      
      const newStatus = !selectedPatient.isActive;
      setPatients(patients.map(p => p.id === selectedPatient.id ? { ...p, isActive: newStatus } : p));
      setSelectedPatient({ ...selectedPatient, isActive: newStatus });
    } catch (err) {
      setApiError(err.message || "Failed to toggle status.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Patients</h1>
          <p className="text-gray-500 dark:text-gray-400">View, edit, and manage patient accounts.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading patients...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No patients found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                        <User size={16} />
                      </div>
                      {p.fullName || p.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-gray-400"/> {p.phoneNumber || p.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Mail size={14} className="text-gray-400"/> {p.email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        p.isActive === false 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {p.isActive === false ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* manage patient */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <User size={20} className="text-red-500" /> Patient Profile
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              
              {apiError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle size={16} /> {apiError}
                </div>
              )}

              {!isEditing ? (
                /* view modal */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-gray-500">Full Name</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPatient.fullName}</p></div>
                    <div><p className="text-gray-500">Gender</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPatient.gender}</p></div>
                    <div><p className="text-gray-500">Email</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPatient.email || 'N/A'}</p></div>
                    <div><p className="text-gray-500">Phone</p><p className="font-semibold text-gray-900 dark:text-white">{selectedPatient.phoneNumber}</p></div>
                    <div><p className="text-gray-500">Date of Birth</p><p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1"><Calendar size={14}/> {selectedPatient.dateOfBirth || 'N/A'}</p></div>
                    <div>
                      <p className="text-gray-500">Account Status</p>
                      <p className={`font-semibold ${selectedPatient.isActive === false ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedPatient.isActive === false ? 'Suspended' : 'Active'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
                    >
                      <Edit size={18} /> Edit Information
                    </button>
                    <button 
                      onClick={handleToggleStatus}
                      disabled={isActionLoading}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold transition-colors ${
                        selectedPatient.isActive === false 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : 
                        selectedPatient.isActive === false ? <><ShieldCheck size={18} /> Activate Account</> : <><ShieldAlert size={18} /> Suspend Account</>
                      }
                    </button>
                  </div>
                </div>
              ) : (
                /* --- EDIT MODE --- */
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={editForm.fullName}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input 
                      type="email" 
                      name="email"
                      value={editForm.email}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      name="phoneNumber"
                      value={editForm.phoneNumber}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                      <select 
                        name="gender"
                        value={editForm.gender}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        name="dateOfBirth"
                        value={editForm.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isActionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-70"
                    >
                      {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18}/> Save</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePatients;