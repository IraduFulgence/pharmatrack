import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PendingVerification = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-950 p-8 rounded-2xl shadow-xl text-center border border-gray-100 dark:border-gray-800">
        <div className="mx-auto w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-6">
          <Clock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Under Review</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Your pharmacy account is currently pending verification by our admin team. 
          This usually takes 24-48 hours. We will notify you once your account is approved.
        </p>
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </div>
  );
};

export default PendingVerification;