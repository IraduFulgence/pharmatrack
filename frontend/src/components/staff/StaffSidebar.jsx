import React, { useMemo } from 'react';
import { LayoutGrid, ShoppingBag, History, MessageSquare, X } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { STAFF_DASHBOARD } from '../../utils/dashboardBase';

const ROLE_LABELS = { SALES_OFFICER: 'Sales Officer', PHARMACIST: 'Pharmacist' };

const NAV_ITEMS = [
  { icon: <LayoutGrid size={20} />, label: 'Overview', path: STAFF_DASHBOARD, end: true },
  { icon: <ShoppingBag size={20} />, label: 'Point of Sale', path: `${STAFF_DASHBOARD}/sales/pos` },
  { icon: <History size={20} />, label: 'Sales History', path: `${STAFF_DASHBOARD}/sales/history` },
  { icon: <MessageSquare size={20} />, label: 'Messages', path: `${STAFF_DASHBOARD}/messages`, badgeKey: 'messages' },
];

const StaffSidebar = ({ isOpen, setIsOpen, badges = {} }) => {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  }, []);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static'}
      `}>
        <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-[#007a55] p-1.5 rounded-lg">
              <img src={logo} height={40} alt="logo" className="h-6 w-auto" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Pharmatrack</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="ml-auto lg:hidden text-gray-500" aria-label="Close menu">
            <X size={24} />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.fullName || 'Staff member'}</h3>
            <p className="text-xs text-gray-500 truncate">
              {ROLE_LABELS[user.role] || 'Staff'}{user.pharmacyName ? ` · ${user.pharmacyName}` : ''}
            </p>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto px-4 py-2">
          <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Workspace</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setIsOpen(false)}
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
                      <span className={isActive ? 'text-[#007a55] dark:text-[#34d399]' : 'text-gray-400'}>{item.icon}</span>
                      {item.label}
                    </div>
                    {item.badgeKey && badges[item.badgeKey] > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {badges[item.badgeKey]}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default StaffSidebar;
