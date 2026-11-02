import React from 'react';
import { 
  LayoutGrid, FileText, ShoppingBag, Package, Users, 
  MessageSquare, Settings, HelpCircle, Plus, X 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardSidebar = ({ isOpen, setIsOpen }) => {
  const navItems = [
    { icon: <LayoutGrid size={20} />, label: 'Overview', active: true },
    { icon: <FileText size={20} />, label: 'Prescriptions', badge: '8' },
    { icon: <ShoppingBag size={20} />, label: 'Orders', badge: '12' },
    { icon: <Package size={20} />, label: 'Inventory' },
    { icon: <Users size={20} />, label: 'Customers' },
    { icon: <MessageSquare size={20} />, label: 'Messages', badge: '3' },
  ];

  const bottomItems = [
    { icon: <Settings size={20} />, label: 'Settings' },
    { icon: <HelpCircle size={20} />, label: 'Help center' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static'}
      `}>
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-[#007a55] p-1.5 rounded-lg">
              <Plus className="text-white w-5 h-5 rotate-45" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">pharmafind</span>
            <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wider ml-1">Partner</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="ml-auto lg:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* Pharmacy Profile Card */}
        <div className="p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-3 shadow-sm cursor-pointer hover:border-[#007a55] transition-colors">
            <div className="bg-[#007a55] text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg">
              +
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">WellCare Pharmacy</h3>
              <p className="text-xs text-gray-500">Green Street · #2048</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-grow overflow-y-auto px-4 py-2 space-y-6">
          <div>
            <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Workspace</p>
            <nav className="space-y-1">
              {navItems.map((item, idx) => (
                <a 
                  key={idx} 
                  href="#" 
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${item.active 
                      ? 'bg-[#e6f4ef] text-[#007a55] dark:bg-[#007a55]/10 dark:text-[#34d399]' 
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={item.active ? 'text-[#007a55] dark:text-[#34d399]' : 'text-gray-400'}>{item.icon}</span>
                    {item.label}
                  </div>
                  {item.badge && (
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
          {bottomItems.map((item, idx) => (
            <a key={idx} href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
              <span className="text-gray-400">{item.icon}</span>
              {item.label}
            </a>
          ))}

          {/* Help Widget */}
          <div className="mt-4 bg-[#0c3b2e] rounded-xl p-4 text-white relative overflow-hidden">
             <div className="relative z-10">
               <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center mb-3">
                 <MessageSquare size={16} />
               </div>
               <h4 className="font-bold text-sm mb-1">Need a hand?</h4>
               <p className="text-xs text-gray-300 mb-3">Our partner team is here to help.</p>
               <a href="#" className="text-xs font-semibold underline decoration-white/30 hover:decoration-white">Contact support</a>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;