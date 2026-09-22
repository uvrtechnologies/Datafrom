import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from './layout/AdminSidebar';
import AdminHeader from './layout/AdminHeader';

const COLLAPSE_STORAGE_KEY = 'admin_sidebar_collapsed';

export default function AdminLayout({ children, title }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname, location.search]);

  // Persist sidebar collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore storage errors */
    }
  }, [sidebarCollapsed]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileDrawerOpen]);

  const toggleSidebar = () => setSidebarCollapsed((c) => !c);
  const openMobileDrawer = () => setMobileDrawerOpen(true);
  const closeMobileDrawer = () => setMobileDrawerOpen(false);

  return (
    <div className="min-h-screen bg-slate-100/60">
      {/* Desktop sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        isMobile={false}
      />

      {/* Mobile drawer */}
      <div className="lg:hidden">
        <AdminSidebar
          isMobile={true}
          mobileOpen={mobileDrawerOpen}
          onMobileClose={closeMobileDrawer}
        />
      </div>

      {/* Main region (right of sidebar on desktop, full on mobile) */}
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out
          ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}
      >
        <AdminHeader
          title={title}
          onToggleSidebar={toggleSidebar}
          onOpenMobileSidebar={openMobileDrawer}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full overflow-x-hidden">
          {children}
        </main>

        <footer className="hidden sm:block border-t border-gray-200/70 bg-white/60 py-4 px-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} DataSync Pro · Admin Console
        </footer>
      </div>
    </div>
  );
}
