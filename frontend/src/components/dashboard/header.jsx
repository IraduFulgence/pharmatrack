import React from 'react';
import { Search, Bell, Menu, Plus } from 'lucide-react';

const DashboardHeader = ({ setIsOpen }) => {
  return (
    <header className="h-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8">
      
      {/* Left: Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button onClick={() => setIsOpen(true)} className="lg:hidden text-gray-500">
          <Menu size={24} />
        </button>
        <div className="hidden sm:flex items-center text-sm text-gray-500 font-medium">
          <span>Workspace</span>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 dark:text-white">Overview</span>
        </div>
      </div>

      {/* Middle: Search Bar */}
      <div className="hidden md:flex flex-grow max-w-xl mx-8 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input 
          type="text" 
          placeholder="Search patient, order, or medicine..." 
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-10 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-xs text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5">⌘ K</span>
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Status Pill */}
        <div className="hidden lg:flex items-center gap-2 bg-[#e6f4ef] dark:bg-[#007a55]/20 text-[#007a55] dark:text-[#34d399] px-3 py-1.5 rounded-full text-sm font-semibold">
          <div className="w-2 h-2 rounded-full bg-[#007a55] dark:bg-[#34d399]"></div>
          Pharmacy open
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
        </button>

        {/* Avatar */}
        <button className="w-10 h-10 rounded-full bg-[#e6f4ef] dark:bg-gray-800 text-[#007a55] dark:text-[#34d399] font-bold text-sm flex items-center justify-center border border-gray-200 dark:border-gray-700">
          AM
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;