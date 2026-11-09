import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, AlertTriangle, Clock, ShieldAlert, CheckCircle2, 
  Loader2, Bell, RefreshCw, ChevronRight, X 
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

const InventoryAlerts = () => {
  const [activeTab, setActiveTab] = useState('LOW_STOCK');
  const [data, setData] = useState({
    summary: null,
    lowStockItems: [],
    outOfStockItems: [],
    expiredBatches: [],
    nearExpiryBatches: []
  });
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAlertsAndNotifications();
  }, []);

  const fetchAlertsAndNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [alertsRes, notifRes] = await Promise.all([
        inventoryService.getAlerts(),
        inventoryService.getNotifications()
      ]);

      setData(alertsRes.data);
      setNotifications(notifRes.data?.notifications || []);
      
    } catch (err) {
      setError(err.message || "Failed to load alerts.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanAlerts = async () => {
    try {
      setIsScanning(true);
      await inventoryService.scanAlerts();
      // Refresh data after scanning
      await fetchAlertsAndNotifications();
    } catch (err) {
      alert("Failed to scan alerts: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await inventoryService.markNotificationRead(id);
      // Update local state instantly
      setNotifications(notifications.map(n => 
        n.notification_id === id ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  // Helper to render the active table
  const renderAlertTable = () => {
    let items = [];
    if (activeTab === 'LOW_STOCK') items = data.lowStockItems;
    else if (activeTab === 'OUT_OF_STOCK') items = data.outOfStockItems;
    else if (activeTab === 'EXPIRED') items = data.expiredBatches;
    else if (activeTab === 'NEAR_EXPIRY') items = data.nearExpiryBatches;

    if (items.length === 0) {
      return (
        <div className="p-12 text-center text-gray-500">
          <CheckCircle2 size={48} className="mx-auto text-green-400 mb-4" />
          <p className="text-lg font-medium">All clear!</p>
          <p className="text-sm">No items found in this category.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-6 py-4">Medicine</th>
              <th className="px-6 py-4">Batch</th>
              <th className="px-6 py-4">Qty</th>
              <th className="px-6 py-4">Expiry</th>
              {activeTab === 'LOW_STOCK' && <th className="px-6 py-4">Reorder Lvl</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {items.map((item) => (
              <tr key={item.inventory_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {item.medicine_name} <span className="text-xs text-gray-500">{item.strength}</span>
                </td>
                <td className="px-6 py-4">{item.batch_number}</td>
                <td className="px-6 py-4 font-bold">{item.quantity}</td>
                <td className="px-6 py-4">
                  {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                  {activeTab === 'NEAR_EXPIRY' && item.days_until_expiry !== undefined && (
                    <span className="ml-2 text-xs text-orange-500">({item.days_until_expiry} days)</span>
                  )}
                </td>
                {activeTab === 'LOW_STOCK' && <td className="px-6 py-4">{item.reorder_level}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
          <Link to="/pharmacy/dashboard/inventory" className="text-sm text-[#007a55] hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Overview
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts & Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400">Monitor stock levels, expiries, and system alerts.</p>
        </div>
        <button 
          onClick={handleScanAlerts}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] transition-colors text-sm font-semibold disabled:opacity-70"
        >
          <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
          {isScanning ? 'Scanning...' : 'Scan Inventory Now'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800">
          <TabButton active={activeTab === 'LOW_STOCK'} onClick={() => setActiveTab('LOW_STOCK')} icon={<AlertTriangle size={16}/>} label="Low Stock" count={data.summary?.lowStockCount} color="text-orange-500" />
          <TabButton active={activeTab === 'OUT_OF_STOCK'} onClick={() => setActiveTab('OUT_OF_STOCK')} icon={<X size={16}/>} label="Out of Stock" count={data.summary?.outOfStockCount} color="text-red-500" />
          <TabButton active={activeTab === 'NEAR_EXPIRY'} onClick={() => setActiveTab('NEAR_EXPIRY')} icon={<Clock size={16}/>} label="Near Expiry" count={data.summary?.nearExpiryCount} color="text-yellow-500" />
          <TabButton active={activeTab === 'EXPIRED'} onClick={() => setActiveTab('EXPIRED')} icon={<ShieldAlert size={16}/>} label="Expired" count={data.summary?.expiredCount} color="text-red-700" />
        </div>
        
        {renderAlertTable()}
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
          <Bell size={18} className="text-blue-500" />
          <h2 className="font-bold text-gray-900 dark:text-white">Recent System Notifications</h2>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No notifications yet.</div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.notification_id} 
                className={`p-4 flex items-start gap-4 transition-colors ${notif.is_read ? 'opacity-60 bg-transparent' : 'bg-blue-50/30 dark:bg-blue-900/10'}`}
              >
                <div className={`mt-1 p-2 rounded-lg ${notif.notification_type === 'LOW_STOCK' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                   {notif.notification_type === 'LOW_STOCK' ? <AlertTriangle size={16}/> : <Clock size={16}/>}
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{notif.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                </div>
                {!notif.is_read && (
                  <button 
                    onClick={() => handleMarkRead(notif.notification_id)}
                    className="text-xs font-semibold text-blue-600 hover:underline px-2 py-1"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

// Sub-component for Tabs
const TabButton = ({ active, onClick, icon, label, count, color }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active 
        ? 'border-[#007a55] text-[#007a55] bg-[#e6f4ef]/30 dark:bg-[#007a55]/10' 
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`}
  >
    <span className={active ? 'text-[#007a55]' : color}>{icon}</span>
    {label}
    {count > 0 && (
      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
        active ? 'bg-[#007a55] text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
      }`}>
        {count}
      </span>
    )}
  </button>
);

export default InventoryAlerts;