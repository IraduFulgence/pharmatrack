import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardHeader from '../../components/dashboard/header';
import StaffSidebar from '../../components/staff/StaffSidebar';
import { messagingService } from '../../services/messagingService';

const BADGE_POLL_MS = 60000;

// Layout for sales officers and pharmacists: sales and patient messages only.
const StaffDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(0);

  const refreshBadges = useCallback(async () => {
    try {
      const res = await messagingService.getConversations();
      const conversations = res.data?.conversations || [];
      setAwaitingReply(conversations.filter((c) => c.last_message_sender === 'PATIENT').length);
    } catch {
      // Badge is best-effort; the Messages page shows real errors.
    }
  }, []);

  useEffect(() => {
    refreshBadges();
    const timer = setInterval(refreshBadges, BADGE_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshBadges]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-950 flex">
      <StaffSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} badges={{ messages: awaitingReply }} />
      <div className="flex-grow flex flex-col min-w-0">
        <DashboardHeader setIsOpen={setIsSidebarOpen} showAccountLinks={false} />
        <main className="flex-grow p-4 lg:p-8 overflow-y-auto">
          <Outlet context={{ refreshBadges, awaitingReply }} />
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;
