import React, { useState, useEffect } from 'react';
import { 
  Search, UserPlus, X, Loader2, AlertCircle, 
  User, Phone, CheckCircle2, ArrowLeft 
} from 'lucide-react';
import { salesService } from '../../services/salesService';

const PatientSelectorModal = ({ isOpen, onClose, onSelectPatient }) => {
  const [mode, setMode] = useState('search'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Walk-in Registration State
  const [newPatient, setNewPatient] = useState({ fullName: '', phoneNumber: '', gender: 'Male' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);

  // Debounced Search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery.length >= 3) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const res = await salesService.searchPatients(searchQuery);
      console.log('user found',res);
      setSearchResults(res.data?.patients || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    setError(null);
    try {
      const res = await salesService.registerWalkIn(newPatient);
      // Pass the newly created patient back to the POS
      onSelectPatient(res.data.patient || res.data);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to register walk-in patient.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {mode === 'search' ? 'Select Patient' : 'Register Walk-in Patient'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Search*/}
        {mode === 'search' && (
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or phone number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
                autoFocus
              />
              {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-[#007a55]" size={18} />}
            </div>

            {/* Results List */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.length > 0 ? (
                searchResults.map((patient) => (
                  <div 
                    key={patient.id}
                    onClick={() => { onSelectPatient(patient); onClose(); }}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer border border-transparent hover:border-[#007a55] transition-all"
                  >
                    
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{patient.full_name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={12}/> {patient.phone_number}</p>
                    </div>
                  </div>
                ))
              ) : searchQuery.length >= 3 && !isSearching ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-3">No patient found with that name.</p>
                  <button 
                    onClick={() => { setMode('register'); setNewPatient(prev => ({ ...prev, full_name: searchQuery })); }}
                    className="text-sm font-semibold text-[#007a55] hover:underline"
                  >
                    + Register "{searchQuery}" as Walk-in
                  </button>
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <button 
                onClick={() => setMode('register')}
                className="w-full py-2.5 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                <UserPlus size={18} /> Register New Walk-in Patient
              </button>
            </div>
          </div>
        )}

        {/* register patient */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="p-4 space-y-4">
            <button 
              type="button"
              onClick={() => setMode('search')} 
              className="text-xs text-gray-500 hover:underline flex items-center gap-1 mb-2"
            >
              <ArrowLeft size={12} /> Back to search
            </button>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  required
                  value={newPatient.fullName}
                  onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 py-2.5 focus:ring-2 focus:ring-[#007a55] dark:text-white"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="tel" 
                  required
                  value={newPatient.phoneNumber}
                  onChange={(e) => setNewPatient({ ...newPatient, phoneNumber: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 py-2.5 focus:ring-2 focus:ring-[#007a55] dark:text-white"
                  placeholder="+250 78..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007a55] dark:text-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={isRegistering}
              className="w-full mt-2 py-3 bg-[#007a55] text-white rounded-lg font-bold hover:bg-[#006645] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isRegistering ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {isRegistering ? 'Registering...' : 'Register & Select'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default PatientSelectorModal;