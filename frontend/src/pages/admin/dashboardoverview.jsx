import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Clock, ShieldCheck, 
  CheckCircle2, XCircle, Loader2, AlertCircle 
} from 'lucide-react';
import { adminService } from '../../services/AdminServices';

const AdminDashboardOverView = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await adminService.getDashboardStats();
        
        
        setStats(response.data);
      } catch (err) {
        console.error("Failed to load stats:", err);
        setError(err.message || "Failed to load dashboard statistics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-lg font-medium">Loading system statistics...</p>
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

  
  const statCards = [
    { 
      title: 'Total Pharmacies', 
      value: stats?.totalPharmacies?.toLocaleString() || '0', 
      icon: <Building2 size={24} />, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100 dark:bg-blue-900/30' 
    },
    { 
      title: 'Pending Approvals', 
      value: stats?.pendingPharmacies?.toLocaleString() || '0', 
      icon: <Clock size={24} />, 
      color: 'text-orange-600', 
      bg: 'bg-orange-100 dark:bg-orange-900/30' 
    },
    { 
      title: 'Registered Patients', 
      value: stats?.totalPatients?.toLocaleString() || '0', 
      icon: <Users size={24} />, 
      color: 'text-green-600', 
      bg: 'bg-green-100 dark:bg-green-900/30' 
    },
    { 
      title: 'System Admins', 
      value: stats?.totalAdmins?.toLocaleString() || '0', 
      icon: <ShieldCheck size={24} />, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100 dark:bg-purple-900/30' 
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Overview</h1>
        <p className="text-gray-500 dark:text-gray-400">Monitor platform activity and manage approvals.</p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{stat.title}</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pharmacy Verification Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Approved Pharmacies</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.approvedPharmacies || 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Rejected Pharmacies</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.rejectedPharmacies || 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Review</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.pendingPharmacies || 0}</p>
          </div>
        </div>
      </div>

      {/* Placeholder for a recent activity table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent System Activity</h3>
        <div className="text-sm text-gray-500 text-center py-8">
          Activity logs will appear here.
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardOverView;