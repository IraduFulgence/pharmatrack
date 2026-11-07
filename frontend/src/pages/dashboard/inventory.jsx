import React, { useState, useEffect } from 'react';
import { 
  Package, AlertTriangle, Clock, Bell, 
  Loader2, RefreshCw, CheckCircle2, ChevronRight, List 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
const Inventory = () => {
  const [data, setData] = useState({
    stats: null,
    alerts: [],
    notifications: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [dashRes, alertsRes, notifRes] = await Promise.all([
        inventoryService.getDashboard(),
        inventoryService.getAlerts(),
        inventoryService.getNotifications()
      ]);

      console.log("Alerts API Response:", alertsRes); 
      console.log("Notifications API Response:", notifRes);

      // Safely extract alerts array
      let alertsList = [];
      if (Array.isArray(alertsRes?.data)) {
        alertsList = alertsRes.data;
      } else if (Array.isArray(alertsRes?.data?.alerts)) {
        alertsList = alertsRes.data.alerts;
      } else if (Array.isArray(alertsRes)) {
        alertsList = alertsRes;
      }

      // Safely extract notifications array
      let notificationsList = [];
      if (Array.isArray(notifRes?.data)) {
        notificationsList = notifRes.data;
      } else if (Array.isArray(notifRes?.data?.notifications)) {
        notificationsList = notifRes.data.notifications;
      } else if (Array.isArray(notifRes)) {
        notificationsList = notifRes;
      }

      setData({
        stats: dashRes.data || {},
        alerts: alertsList,
        notifications: notificationsList
      });
    } catch (err) {
      console.error("Failed to load inventory data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanAlerts = async () => {
    try {
      setIsScanning(true);
      await inventoryService.scanAlerts();
      await fetchDashboardData(); 
    } catch (err) {
      alert("Failed to scan alerts");
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-[#007a55]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Overview</h1>
          <p className="text-gray-500 dark:text-gray-400">Monitor stock levels, expirations, and alerts.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleScanAlerts}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning...' : 'Scan for Alerts'}
          </button>
          <Link 
           to="/pharmacy/dashboard/inventory/list" 
           className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
           >
            <List size={16} /> Full Inventory
          </Link>
          <Link 
            to="/pharmacy/dashboard/inventory/stock-in" 
            className="flex items-center gap-2 px-4 py-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] transition-colors text-sm font-semibold"
          >
            <Package size={16} /> Receive Stock
          </Link>
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Medicines" value={data.stats?.totalMedicines || 0} icon={<Package />} color="text-blue-600" bg="bg-blue-100" />
        <StatCard title="Low Stock Items" value={data.stats?.lowStockCount || 0} icon={<AlertTriangle />} color="text-orange-600" bg="bg-orange-100" />
        <StatCard title="Expiring Soon" value={data.stats?.expiringSoonCount || 0} icon={<Clock />} color="text-red-600" bg="bg-red-100" />
        <StatCard title="Total Batches" value={data.stats?.totalBatches || 0} icon={<CheckCircle2 />} color="text-green-600" bg="bg-green-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Alerts Column */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" /> Stock Alerts
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
            {data.alerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No active alerts. Inventory is healthy.</div>
            ) : (
              data.alerts.map((alert, idx) => (
                <div key={idx} className="p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className={`p-2 rounded-lg mt-0.5 ${alert.type === 'LOW_STOCK' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                    {alert.type === 'LOW_STOCK' ? <AlertTriangle size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{alert.medicineName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {alert.type === 'LOW_STOCK' 
                        ? `Only ${alert.currentQuantity} left (Reorder at ${alert.reorderLevel})` 
                        : `Expires on ${new Date(alert.expiryDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications Column */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={18} className="text-blue-500" /> Recent Notifications
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
            {data.notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No new notifications.</div>
            ) : (
              data.notifications.map((notif, idx) => (
                <div key={idx} className={`p-4 flex items-start gap-3 ${notif.isRead ? 'opacity-60' : ''}`}>
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${notif.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};


const StatCard = ({ title, value, icon, color, bg }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bg} ${color}`}>
      {icon}
    </div>
    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
  </div>
);

export default Inventory;