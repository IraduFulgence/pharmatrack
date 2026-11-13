import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, ShoppingBag, CheckCircle2, AlertTriangle, 
  Plus, ChevronRight, Loader2, Clock 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { inventoryService } from '../../services/inventoryService';

const StatCard = ({ title, value, trend, trendColor, subtext, icon, iconColor, iconBg }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">{title}</h3>
      <div className={`p-2 rounded-xl ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
    <div className="flex items-end gap-3 mb-2">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{value}</h2>
      {trend && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trendColor}`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-xs text-gray-500 font-medium">{subtext}</p>
  </div>
);

const DashboardOverView = () => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({
    stats: null,
    alerts: [],
    chartData: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user info
    const userString = localStorage.getItem('user');
    if (userString) setUser(JSON.parse(userString));

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
     
      const [invDashRes, invAlertsRes] = await Promise.all([
        inventoryService.getDashboard(),
        inventoryService.getAlerts()
      ]);

      const invSummary = invDashRes.data?.summary || {};
      
      
      let combinedAlerts = [];
      if (invAlertsRes?.data) {
        const { lowStockItems, outOfStockItems, expiredBatches, nearExpiryBatches } = invAlertsRes.data;
        if (lowStockItems) combinedAlerts.push(...lowStockItems);
        if (outOfStockItems) combinedAlerts.push(...outOfStockItems);
        if (expiredBatches) combinedAlerts.push(...expiredBatches);
        if (nearExpiryBatches) combinedAlerts.push(...nearExpiryBatches);
      }

      // Dummy Chart Data (Replace this with a real endpoint if you have one)
      const chartData = [
        { name: 'Mon', Received: 10, Completed: 5 },
        { name: 'Tue', Received: 15, Completed: 12 },
        { name: 'Wed', Received: 25, Completed: 20 },
        { name: 'Thu', Received: 22, Completed: 18 },
        { name: 'Fri', Received: 30, Completed: 25 },
        { name: 'Sat', Received: 28, Completed: 22 },
        { name: 'Sun', Received: 35, Completed: 30 },
      ];

      setData({
        stats: invSummary,
        alerts: combinedAlerts.slice(0, 3), // Only show top 3 critical tasks
        chartData: chartData
      });

    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const pharmacyName = user?.pharmacyName || 'Pharmacy';
  const location = user?.locationAddress || 'Kigali';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-[#007a55]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Hello, {pharmacyName}.
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {/* Here's what's happening at {pharmacyName} today. */}
          </p>
        </div>
        <Link 
          to="/pharmacy/dashboard/sales/pos" 
          className="flex items-center gap-2 bg-[#007a55] hover:bg-[#006645] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus size={18} />
          New walk-in order
        </Link>
      </div>

      {/* Stats Grid - Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          title="Total Medicines" 
          value={data.stats?.totalMedicines || 0} 
          trend="+12%" // You can calculate this if you track historical data
          trendColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          subtext="In catalogue"
          icon={<FileText size={20} />}
          iconColor="text-[#007a55]"
          iconBg="bg-[#e6f4ef]"
        />
        <StatCard 
          title="Total Stock Value" 
          value={`${Number(data.stats?.totalInventoryValuation || 0).toLocaleString()} RWF`} 
          trend="+4%" 
          trendColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          subtext="Current valuation"
          icon={<ShoppingBag size={20} />}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard 
          title="Low Stock Items" 
          value={data.stats?.lowStockCount || 0} 
          trend={data.stats?.lowStockCount > 0 ? "Action Required" : "Healthy"} 
          trendColor={data.stats?.lowStockCount > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}
          subtext="Need reordering"
          icon={<CheckCircle2 size={20} />}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard 
          title="Expiring Soon" 
          value={data.stats?.totalExpiringSoon || 0} 
          trend={data.stats?.totalExpiringSoon > 0 ? "Warning" : "Healthy"} 
          trendColor={data.stats?.totalExpiringSoon > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}
          subtext="Within 90 days"
          icon={<AlertTriangle size={20} />}
          iconColor="text-orange-600"
          iconBg="bg-orange-50 dark:bg-orange-900/20"
        />
      </div>

      {/* Middle Section: Chart & Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Chart Area */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Prescription activity</h3>
              <p className="text-sm text-gray-500">Requests received and completed</p>
            </div>
            <select className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg px-3 py-1.5 focus:outline-none text-gray-700 dark:text-gray-300">
              <option>7 days</option>
              <option>30 days</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007a55" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#007a55" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="Received" stroke="#007a55" strokeWidth={3} fillOpacity={1} fill="url(#colorReceived)" />
                <Area type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actionable Tasks Area */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Required</h3>
              <p className="text-sm text-gray-500">{data.alerts.length} critical alerts</p>
            </div>
            <Link to="/pharmacy/dashboard/inventory/alerts" className="p-1.5 bg-[#e6f4ef] text-[#007a55] rounded-lg hover:bg-[#d1eae1] transition-colors">
              <ChevronRight size={18} />
            </Link>
          </div>

          <div className="space-y-3 flex-grow">
            {data.alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No critical alerts. Everything looks good!
              </div>
            ) : (
              data.alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${
                    alert.quantity === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {alert.quantity === 0 ? <AlertTriangle size={14} /> : <Clock size={14} />}
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {alert.medicine_name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {alert.quantity === 0 
                        ? 'Out of stock!' 
                        : `Only ${alert.quantity} left (Batch: ${alert.batch_number})`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <Link to="/pharmacy/dashboard/inventory/alerts" className="mt-4 block text-center text-sm font-semibold text-[#007a55] hover:text-[#006645] py-2 border-t border-gray-100 dark:border-gray-800">
            View All Alerts
          </Link>
        </div>
      </div>

      {/* Bottom Section: Navigation Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link to="/pharmacy/dashboard/prescriptions" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex justify-between items-center group hover:border-[#007a55] transition-colors">
           <div>
             <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#007a55] transition-colors">Prescription queue</h3>
             <p className="text-sm text-gray-500">Incoming patient requests</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-[#e6f4ef] transition-colors">
             <ChevronRight size={20} className="text-gray-400 group-hover:text-[#007a55]" />
           </div>
        </Link>

        <Link to="/pharmacy/dashboard/inventory" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex justify-between items-center group hover:border-[#007a55] transition-colors">
           <div>
             <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#007a55] transition-colors">Inventory Status</h3>
             <p className="text-sm text-gray-500">Monitor stock and batches</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-[#e6f4ef] transition-colors">
             <ChevronRight size={20} className="text-gray-400 group-hover:text-[#007a55]" />
           </div>
        </Link>
      </div>

    </div>
  );
};

export default DashboardOverView;