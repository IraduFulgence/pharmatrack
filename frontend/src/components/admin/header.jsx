import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
const DashboardHeader = ({ setIsOpen }) => {

  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);

  const dropdownRef = useRef(null);

  // load user

  useEffect(() =>{

    const userString = localStorage.getItem('user');
    
    if (userString){
      try {
        setUser(JSON.parse(userString));
      } catch (error) {
        console.error("Failed to parse user data");
      }
    }
  },[]);

// handle on side clcik to close dropdown

useEffect(() =>{
  const handleClickOutside = (event) =>{

  if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () =>{
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  // get initials from either full name or pharmacy name
  const getInitials = (name) =>{
    if(!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1){
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // determine the display name based on the role
  const displayName = user?.fullName || user?.pharmacyName || 'User';
  const userRole = user?.role || 'GUEST';
  const userEmail = user?.email || 'No email';


return (
    <header className="h-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8">
      
      {/* Left: Mobile Menu Toggle */}
      <div className="flex items-center gap-4">
        <button onClick={() => setIsOpen(true)} className="lg:hidden text-gray-500">
          <Menu size={24} />
        </button>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4">
        
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          
          {/* Trigger Button */}
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#e6f4ef] text-[#007a55] flex items-center justify-center font-bold text-sm">
              {getInitials(displayName)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {userRole.toLowerCase()}
              </p>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Header inside dropdown */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{userEmail}</p>
              </div>

              {/* Links */}
              <div className="p-2 space-y-1">
                <Link 
                  to="/dashboard/profile" 
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  <User size={16} /> My Profile
                </Link>
                <Link 
                  to="/dashboard/settings" 
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings size={16} /> Settings
                </Link>
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
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