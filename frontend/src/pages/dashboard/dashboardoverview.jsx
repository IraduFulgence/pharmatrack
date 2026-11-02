import React, { useState } from 'react';
import { 
  FileText, ShoppingBag, CheckCircle2, AlertTriangle, 
  Plus, ChevronRight 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Dummy data for the chart
const chartData = [
  { name: 'Mon', Received: 10, Completed: 5 },
  { name: 'Tue', Received: 15, Completed: 12 },
  { name: 'Wed', Received: 25, Completed: 20 },
  { name: 'Thu', Received: 22, Completed: 18 },
  { name: 'Fri', Received: 30, Completed: 25 },
  { name: 'Sat', Received: 28, Completed: 22 },
  { name: 'Sun', Received: 35, Completed: 30 },
];

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-950 flex">
    
      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 lg:ml-0">
        
        <main className="flex-grow p-4 lg:p-8 overflow-y-auto">
          
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Good morning, Ineza.
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Here's what's happening at Ineza Pharmacy today.
              </p>
            </div>
            <button className="flex items-center gap-2 bg-[#007a55] hover:bg-[#006645] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
              <Plus size={18} />
              New walk-in order
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard 
              title="New prescriptions" 
              value="24" 
              trend="+12%" 
              trendColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              subtext="vs. yesterday"
              icon={<FileText size={20} />}
              iconColor="text-[#007a55]"
              iconBg="bg-[#e6f4ef]"
            />
            <StatCard 
              title="Orders in progress" 
              value="18" 
              trend="+4%" 
              trendColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              subtext="vs. yesterday"
              icon={<ShoppingBag size={20} />}
              iconColor="text-blue-600"
              iconBg="bg-blue-50 dark:bg-blue-900/20"
            />
            <StatCard 
              title="Ready for pickup" 
              value="11" 
              trend="-" 
              trendColor="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              subtext="5 awaiting notification"
              icon={<CheckCircle2 size={20} />}
              iconColor="text-purple-600"
              iconBg="bg-purple-50 dark:bg-purple-900/20"
            />
            <StatCard 
              title="Low stock items" 
              value="7" 
              trend="-2" 
              trendColor="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              subtext="since yesterday"
              icon={<AlertTriangle size={20} />}
              iconColor="text-orange-600"
              iconBg="bg-orange-50 dark:bg-orange-900/20"
            />
          </div>

          {/* Middle Section: Chart & Tasks */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            
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
              
              {/* Recharts Area Chart */}
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007a55" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#007a55" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="Received" stroke="#007a55" strokeWidth={3} fillOpacity={1} fill="url(#colorReceived)" />
                    <Area type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tasks Area */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Today's tasks</h3>
                  <p className="text-sm text-gray-500">2 tasks remaining</p>
                </div>
                <button className="p-1.5 bg-[#e6f4ef] text-[#007a55] rounded-lg hover:bg-[#d1eae1] transition-colors">
                  <Plus size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Task 1 */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 cursor-pointer"></div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Review expiring stock</h4>
                    <p className="text-xs text-gray-500 mt-0.5">12 items expire within 30 days</p>
                  </div>
                </div>

                {/* Task 2 */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 cursor-pointer"></div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Confirm supplier delivery</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Expected today by 2:00 PM</p>
                  </div>
                </div>

                {/* Task 3 (Completed) */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 opacity-60">
                  <div className="mt-0.5 w-5 h-5 rounded bg-[#007a55] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-through">Update holiday hours</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Thanksgiving schedule</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex justify-between items-center">
               <div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">Prescription queue</h3>
                 <p className="text-sm text-gray-500">Incoming patient requests</p>
               </div>
               <button className="flex items-center gap-1 text-sm font-semibold text-[#007a55] hover:text-[#006645]">
                 View all <ChevronRight size={16} />
               </button>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex justify-between items-center">
               <div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inventory alerts</h3>
                 <p className="text-sm text-gray-500">Items that need attention</p>
               </div>
               <button className="flex items-center gap-1 text-sm font-semibold text-[#007a55] hover:text-[#006645]">
                 Inventory <ChevronRight size={16} />
               </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default DashboardOverView;