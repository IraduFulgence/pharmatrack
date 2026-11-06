import React from 'react';
import { Building2, Users, Clock, ShieldCheck } from 'lucide-react';

const AdminDashboardOverView = () => {
  const stats = [
    { title: 'Total Pharmacies', value: '124', icon: <Building2 size={24} />, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Pending Approvals', value: '8', icon: <Clock size={24} />, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'Registered Patients', value: '15,402', icon: <Users size={24} />, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'System Health', value: '99.9%', icon: <ShieldCheck size={24} />, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Overview</h1>
        <p className="text-gray-500 dark:text-gray-400">Monitor platform activity and manage approvals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{stat.title}</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
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