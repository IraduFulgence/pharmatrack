import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Calendar, Shield, 
  FileText, Loader2, AlertCircle, 
  LogOut, CheckCircle2
} from 'lucide-react';
import { authService } from '../../services/authentication';

const ProfileContent = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await authService.getProfile();
        setProfile(response.data);
        // Sync local storage so the Header/Sidebar reflect any name changes
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (err) {
        setError(err.message || "Failed to load profile.");
        if (err.message.includes('Unauthorized') || err.message.includes('401')) {
          localStorage.clear();
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <Loader2 className="animate-spin mb-4 text-[#007a55]" size={40} />
        <p className="text-lg font-medium">Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-red-500">
        <AlertCircle size={48} className="mb-4" />
        <p className="text-lg font-medium">{error}</p>
      </div>
    );
  }

  const isPharmacy = profile?.role === 'PHARMACY';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-[#e6f4ef] dark:bg-[#007a55]/20 text-[#007a55] dark:text-[#34d399] flex items-center justify-center text-3xl font-bold uppercase">
          {profile?.fullName?.charAt(0) || profile?.pharmacyName?.charAt(0) || 'U'}
        </div>
        <div className="flex-grow text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {profile?.fullName || profile?.pharmacyName}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{profile?.email}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <Shield size={14} /> {profile?.role}
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Account Information</h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.email || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.phoneNumber || 'N/A'}</p>
            </div>
          </div>

          {profile?.role === 'PATIENT' && (
            <>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500"><Calendar size={20} /></div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date of Birth</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.dateOfBirth || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500"><User size={20} /></div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Gender</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.gender || 'N/A'}</p>
                </div>
              </div>
            </>
          )}

          {isPharmacy && (
            <>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500"><FileText size={20} /></div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">TIN Number</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.tin || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500"><CheckCircle2 size={20} /></div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Verification</p>
                  <p className={`text-sm font-semibold ${profile?.verificationStatus === 'APPROVED' ? 'text-green-600' : 'text-orange-500'}`}>
                    {profile?.verificationStatus || 'PENDING'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Session Management</h3>
          <p className="text-xs text-gray-500 mt-1">Log out of your account on this device.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg font-semibold text-sm transition-colors"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>

    </div>
  );
};

export default ProfileContent;