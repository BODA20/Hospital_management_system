import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from './Breadcrumbs';

export const RoleShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const openSidebar  = useCallback(() => setMobileSidebarOpen(true),  []);
  const closeSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMobileMenuClick={openSidebar} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
};
