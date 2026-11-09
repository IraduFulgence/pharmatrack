import React, { useState, useEffect } from 'react';
import { 
  Package, AlertTriangle, Clock, Bell, 
  Loader2, RefreshCw, CheckCircle2, ChevronRight, List, 
  ArrowRight, ShieldAlert, ArrowRightLeft,BarChart2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';

const Inventory = () => {
  const [data, setData] = useState({
    summary: null,
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

      //  Extract Summary
      const summary = dashRes.data?.summary || null;

      //Combine all alert types into one flat list for the dashboard
      let combinedAlerts = [];
      if (alertsRes?.data) {
        const { lowStockItems, outOfStockItems, expiredBatches, nearExpiryBatches } = alertsRes.data;
        
        if (lowStockItems) combinedAlerts.push(...lowStockItems.map(a => ({...a, type: 'LOW_STOCK'})));
        if (outOfStockItems) combinedAlerts.push(...outOfStockItems.map(a => ({...a, type: 'OUT_OF_STOCK'})));
        if (expiredBatches) combinedAlerts.push(...expiredBatches.map(a => ({...a, type: 'EXPIRED'})));
        if (nearExpiryBatches) combinedAlerts.push(...nearExpiryBatches.map(a => ({...a, type: 'NEAR_EXPIRY'})));
      }

      // Notifications
      let notificationsList = notifRes.data?.notifications || [];

      setData({
        summary: summary,
        alerts: combinedAlerts,
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
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleScanAlerts}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning...' : 'Scan for Alerts'}
          </button>
          <Link 
  to="/pharmacy/dashboard/inventory/transactions" 
  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
>
  <ArrowRightLeft size={16} /> History
</Link>
<Link 
  to="/pharmacy/dashboard/inventory/reports" 
  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
>
  <BarChart2 size={16} /> Reports
</Link>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Medicines" 
          value={data.summary?.totalMedicines || 0} 
          icon={<Package />} 
          color="text-blue-600" 
          bg="bg-blue-100 dark:bg-blue-900/30" 
        />
        <StatCard 
          title="Low Stock Items" 
          value={data.summary?.lowStockCount || 0} 
          icon={<AlertTriangle />} 
          color="text-orange-600" 
          bg="bg-orange-100 dark:bg-orange-900/30" 
        />
        <StatCard 
          title="Expiring Soon" 
          value={data.summary?.totalExpiringSoon || 0} 
          icon={<Clock />} 
          color="text-red-600" 
          bg="bg-red-100 dark:bg-red-900/30" 
        />
        <StatCard 
          title="Stock Value" 
          value={`${Number(data.summary?.totalInventoryValuation || 0).toLocaleString()} RWF`} 
          icon={<CheckCircle2 />} 
          color="text-green-600" 
          bg="bg-green-100 dark:bg-green-900/30" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Alerts Column */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" /> Critical Alerts
            </h3>
            <Link to="/pharmacy/dashboard/inventory/alerts" className="text-xs font-semibold text-[#007a55] hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto h-[400px]">
            {data.alerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center justify-center h-full">
                <CheckCircle2 size={32} className="text-green-400 mb-2" />
                No active alerts. Inventory is healthy.
              </div>
            ) : (
              data.alerts.slice(0, 15).map((alert, idx) => {
                const isDanger = alert.type === 'EXPIRED' || alert.type === 'OUT_OF_STOCK';
                const Icon = alert.type === 'EXPIRED' ? ShieldAlert : alert.type === 'OUT_OF_STOCK' ? AlertTriangle : Clock;
                
                return (
                  <div key={idx} className="p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={`p-2 rounded-lg mt-0.5 ${isDanger ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {alert.medicine_name} <span className="text-xs font-normal text-gray-500">({alert.batch_number})</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {alert.type === 'LOW_STOCK' && `Only ${alert.quantity} left (Reorder at ${alert.reorder_level})`}
                        {alert.type === 'OUT_OF_STOCK' && `Out of stock!`}
                        {alert.type === 'EXPIRED' && `Expired on ${new Date(alert.expiry_date).toLocaleDateString()}`}
                        {alert.type === 'NEAR_EXPIRY' && `Expires in ${alert.days_until_expiry} days`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notifications Column */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={18} className="text-blue-500" /> Recent Notifications
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto h-[400px]">
            {data.notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center justify-center h-full">
                No new notifications.
              </div>
            ) : (
              data.notifications.slice(0, 15).map((notif, idx) => (
                <div key={idx} className={`p-4 flex items-start gap-3 ${notif.is_read ? 'opacity-60' : ''}`}>
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${notif.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
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

// Reusable Stat Card
const StatCard = ({ title, value, icon, color, bg }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bg} ${color}`}>
      {icon}
    </div>
    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">{value}</p>
  </div>
);

export default Inventory;