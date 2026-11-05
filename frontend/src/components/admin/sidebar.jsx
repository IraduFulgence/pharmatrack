import React from 'react';
import { 
  Users, 
  Settings, HelpCircle, X,
  LogOut, Building2, LayoutDashboard, Activity, ShieldAlert
} from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import logo from "../../assets/logo.png";

const AdminSidebar = ({ isOpen, setIsOpen }) => {
 const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'System Overview', path: '/admin/dashboard' },
    { icon: <Building2 size={20} />, label: 'Pharmacies', path: '/admin/dashboard/pharmacies' },
    { icon: <Users size={20} />, label: 'Patients', path: '/admin/dashboard/patients' },
    { icon: <ShieldAlert size={20} />, label: 'System Users', path: '/admin/users' },
    { icon: <Activity size={20} />, label: 'System Logs', path: '/admin/logs' },
  ];

 
  const bottomItems = [
    { icon: <Settings size={20} />, label: 'Settings & Profile', path: '/dashboard/profile' },
    { icon: <HelpCircle size={20} />, label: 'Help center', path: '/dashboard/help' },
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

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static'}
      `}>
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-[#007a55] p-1.5 rounded-lg">
              <img src={logo} height={40} alt="logo" className="h-6 w-auto" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Pharmatrack</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="ml-auto lg:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

      
        {/* Main Navigation */}
        <div className="flex-grow overflow-y-auto px-4 py-2 space-y-6">
          <div>
            <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Workspace</p>
            <nav className="space-y-1">
              {navItems.map((item, idx) => (
                <NavLink 
                  key={idx} 
                  to={item.path}
                  onClick={() => setIsOpen(false)} 
                  end={item.path === '/admin/dashboard'}
                  className={({ isActive }) => `
                    flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-[#e6f4ef] text-[#007a55] dark:bg-[#007a55]/10 dark:text-[#34d399]' 
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <span className={isActive ? 'text-[#007a55] dark:text-[#34d399]' : 'text-gray-400'}>
                          {item.icon}
                        </span>
                        {item.label}
                      </div>
                      {item.badge && (
                        <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Section Navigation */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
          {bottomItems.map((item, idx) => (
            <NavLink 
              key={idx} 
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-[#e6f4ef] text-[#007a55] dark:bg-[#007a55]/10 dark:text-[#34d399]' 
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}
              `}
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-[#007a55] dark:text-[#34d399]' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;