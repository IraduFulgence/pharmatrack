import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardHeader from '../../components/admin/header';
import AdminSidebar from '../../components/admin/sidebar';
const AdminDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-950 flex">
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-grow flex flex-col min-w-0 lg:ml-0">
        <DashboardHeader setIsOpen={setIsSidebarOpen} />
        
        
        <main className="flex-grow p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;