import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  IconMenu,
  IconSearch,
  IconBell,
  IconUser,
  IconSettings,
  IconLogOut,
  IconChevronDown,
  IconHome,
  IconChevronRight,
} from '../common/Icons';

const ROUTE_META = {
  '/dashboard': { title: 'Dashboard', crumbs: [{ label: 'Dashboard' }] },
  '/families': { title: 'All Family Records', crumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Family Records' }] },
  '/analytics': { title: 'Analytics', crumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Analytics' }] },
};

function getRouteMeta(pathname) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  if (pathname.startsWith('/families/')) {
    return {
      title: 'Family Record Details',
      crumbs: [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Family Records', to: '/families' },
        { label: 'Record' },
      ],
    };
  }
  return { title: 'Admin Console', crumbs: [{ label: 'Dashboard' }] };
}

function ProfileDropdown({ open, onClose, onLogout, admin }) {
  const ref = useRef(null);
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

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-2.5 w-72 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-900/5 ring-1 ring-black/5 z-40 overflow-hidden"
      role="menu"
      aria-orientation="vertical"
    >
      <div className="p-4 bg-gradient-to-br from-brand-50/80 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-navy-900 truncate">{admin?.name || 'Admin User'}</div>
            <div className="text-xs text-gray-500 truncate">{admin?.email}</div>
            <div className="mt-0.5">
              <span className="inline-flex items-center text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="py-1.5">
        <button
          type="button"
          disabled
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 opacity-70 cursor-not-allowed"
          title="Coming soon"
        >
          <IconUser size={18} />
          <span>View Profile</span>
        </button>
        <button
          type="button"
          disabled
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 opacity-70 cursor-not-allowed"
          title="Coming soon"
        >
          <IconSettings size={18} />
          <span>Settings</span>
        </button>
      </div>
      <div className="border-t border-gray-100 py-1.5">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold"
        >
          <IconLogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminHeader({
  title,
  breadcrumbs,
  onToggleSidebar,
  onOpenMobileSidebar,
  showSearch = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const meta = getRouteMeta(location.pathname);
  const finalTitle = title || meta.title;
  const finalCrumbs = breadcrumbs || meta.crumbs || [];

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/families?search=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
    }
  };

  const initials = admin?.name
    ? admin.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() || '')
        .join('')
    : 'A';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200/70">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16">
        {/* Left: toggles + breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
            className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-navy-900 hover:bg-gray-100 transition-colors"
          >
            <IconMenu size={20} />
          </button>
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onOpenMobileSidebar}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-navy-900 hover:bg-gray-100 transition-colors"
          >
            <IconMenu size={20} />
          </button>

          <div className="min-w-0 hidden sm:block">
            <nav aria-label="Breadcrumb" className="flex items-center text-xs text-gray-500 mb-0.5 truncate">
              {finalCrumbs.map((c, i) => {
                const isLast = i === finalCrumbs.length - 1;
                const content = c.to ? (
                  <RouterLink
                    to={c.to}
                    className="inline-flex items-center hover:text-brand-600 transition-colors"
                  >
                    {i === 0 ? <IconHome size={12} className="mr-1" /> : null}
                    {c.label}
                  </RouterLink>
                ) : (
                  <span className={isLast ? 'text-gray-700 font-semibold' : ''}>{c.label}</span>
                );
                return (
                  <span key={i} className="inline-flex items-center">
                    {content}
                    {!isLast && <IconChevronRight size={12} className="mx-1.5 text-gray-300" />}
                  </span>
                );
              })}
            </nav>
            <h1 className="font-serif font-bold text-navy-900 text-lg leading-tight truncate">
              {finalTitle}
            </h1>
          </div>

          <h1 className="sm:hidden font-serif font-bold text-navy-900 text-base truncate flex-1">
            {finalTitle}
          </h1>
        </div>

        {/* Right: search, bell, avatar */}
        <div className="flex items-center gap-1 sm:gap-2">
          {showSearch && (
            <form
              onSubmit={handleSearchSubmit}
              className="relative hidden md:block"
            >
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search records…"
                className="w-64 lg:w-80 pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all placeholder:text-gray-400"
              />
            </form>
          )}
          {showSearch && (
            <button
              type="button"
              aria-label="Search"
              onClick={() => navigate('/families')}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-navy-900 hover:bg-gray-100 transition-colors"
            >
              <IconSearch size={19} />
            </button>
          )}

          <button
            type="button"
            title="No new notifications"
            aria-label="Notifications"
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-navy-900 hover:bg-gray-100 transition-colors"
          >
            <IconBell size={19} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="ml-1 inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <span className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {initials}
              </span>
              <span className="hidden sm:block text-left">
                <span className="block text-xs font-semibold text-navy-900 leading-tight">
                  {admin?.name || 'Admin'}
                </span>
                <span className="block text-[10px] text-gray-500 leading-tight">
                  {admin?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                </span>
              </span>
              <IconChevronDown size={14} className="hidden sm:block text-gray-400" />
            </button>

            <ProfileDropdown
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              onLogout={handleLogout}
              admin={admin}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
