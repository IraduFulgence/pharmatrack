import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Menu, User, LogOut, Settings, ChevronDown } from 'lucide-react';

const DashboardHeader = ({ setIsOpen }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load user data on mount
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        setUser(JSON.parse(userString));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user?.pharmacyName || user?.fullName || 'Pharmacy User';
  const userRole = user?.role || 'PHARMACY';

  return (
    <header className="h-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8">
      
      {/* Left: Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button onClick={() => setIsOpen(true)} className="lg:hidden text-gray-500">
          <Menu size={24} />
        </button>
        <div className="hidden sm:flex items-center text-sm text-gray-500 font-medium">
          <span>Workspace</span>
          
                  </div>
      </div>

      {/* Search Bar */}
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

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#e6f4ef] dark:bg-gray-800 text-[#007a55] dark:text-[#34d399] font-bold text-sm flex items-center justify-center border border-gray-200 dark:border-gray-700">
              {getInitials(displayName)}
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email || 'No email'}</p>
              </div>
              <div className="p-2 space-y-1">
                <Link to="/dashboard/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                  <User size={16} /> My Profile
                </Link>
                <Link to="/dashboard/settings" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                  <Settings size={16} /> Settings
                </Link>
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;