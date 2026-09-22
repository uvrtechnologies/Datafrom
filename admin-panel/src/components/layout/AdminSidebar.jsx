import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  IconLayoutDashboard,
  IconDatabase,
  IconBarChart3,
  IconChevronLeft,
  IconChevronRight,
  IconLogOut,
  IconX,
} from '../common/Icons';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
  { to: '/families', label: 'Family Records', icon: IconDatabase },
  { to: '/analytics', label: 'Analytics', icon: IconBarChart3 },
];

function isActive(pathname, to) {
  if (to === '/families') return pathname === '/families' || pathname.startsWith('/families/');
  return pathname === to;
}

export default function AdminSidebar({
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onMobileClose,
  isMobile = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleNav = (to) => {
    navigate(to);
    if (isMobile && onMobileClose) onMobileClose();
  };

  const roleLabel = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    viewer: 'Viewer',
  }[admin?.role] || admin?.role || 'Admin';

  const initials = admin?.name
    ? admin.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() || '')
        .join('')
    : 'A';

  const sidebarContent = (
    <>
      {/* Brand */}
      <div
        className={`flex items-center justify-between px-4 py-4 border-b border-gray-100/60 ${
          collapsed && !isMobile ? 'justify-center px-2' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-brand-600/20">
            DS
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <div className="font-serif font-bold text-navy-900 leading-tight truncate">
                DataSync Pro
              </div>
              <div className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase">
                Admin Console
              </div>
            </div>
          )}
        </div>
        {isMobile && mobileOpen ? (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <IconX size={18} />
          </button>
        ) : !isMobile ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`p-1.5 rounded-lg text-gray-500 hover:text-navy-900 hover:bg-gray-100 transition-colors ${
              collapsed ? 'mx-auto' : ''
            }`}
          >
            {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
          </button>
        ) : null}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {(!collapsed || isMobile) && (
          <div className="px-3 pb-2 pt-0 mb-1">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
              Navigation
            </p>
          </div>
        )}
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isActive(location.pathname, to);
          return (
            <button
              key={to}
              type="button"
              onClick={() => handleNav(to)}
              title={collapsed && !isMobile ? label : undefined}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                active
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                  : 'text-gray-600 hover:text-navy-900 hover:bg-gray-100/70'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
            >
              <Icon size={20} className={`flex-shrink-0 ${active ? 'text-white' : ''}`} />
              {(!collapsed || isMobile) && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Profile block */}
      <div
        className={`border-t border-gray-100/60 p-3 ${
          collapsed && !isMobile ? 'px-2' : ''
        }`}
      >
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed && !isMobile ? 'Logout' : undefined}
          className={`w-full group flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-red-50 ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
        >
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-sm`}
          >
            {initials}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-semibold text-navy-900 truncate">
                {admin?.name || 'Admin'}
              </div>
              <div className="text-[11px] text-gray-500 truncate">{roleLabel}</div>
            </div>
          )}
          {(!collapsed || isMobile) && (
            <span className="p-1.5 rounded-lg text-gray-400 group-hover:text-red-600 transition-colors">
              <IconLogOut size={16} />
            </span>
          )}
        </button>
        {(!collapsed || isMobile) && admin?.email && (
          <p className="mt-2 px-2 text-[11px] text-gray-400 truncate">{admin.email}</p>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-navy-900/50 backdrop-blur-sm transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onMobileClose}
          aria-hidden="true"
        />
        {/* Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Sidebar"
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop fixed sidebar
  return (
    <aside
      className={`hidden lg:flex fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200/70 shadow-sm flex-col transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
      aria-label="Sidebar"
    >
      {sidebarContent}
    </aside>
  );
}
