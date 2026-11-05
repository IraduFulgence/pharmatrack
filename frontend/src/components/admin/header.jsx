import React from 'react';
import { Menu, Bell, Shield } from 'lucide-react';

const DashboardHeader = ({ setIsOpen }) => {
  return (
    <header className="h-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button onClick={() => setIsOpen(true)} className="lg:hidden text-gray-500">
          <Menu size={24} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">System Administration</h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
            AD
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Super Admin</p>
            <p className="text-xs text-gray-500">admin@pharmatrack.com</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;