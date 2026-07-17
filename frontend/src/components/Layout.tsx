import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ServerStatusWidget from './ServerStatusWidget';

const navItems = [
  { to: '/', label: 'Dashboard', icon: HomeIcon },
  { to: '/posts', label: 'Posts', icon: DocumentTextIcon },
  { to: '/personas', label: 'Personas', icon: UserGroupIcon },
  { to: '/templates', label: 'Templates', icon: DocumentDuplicateIcon },
  { to: '/scheduler', label: 'Scheduler', icon: ClockIcon },
] as const;

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-paper-1 overflow-hidden font-body">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-1/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating Sidebar (Desktop) / Slide-in (Mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-bounce lg:translate-x-0 lg:static lg:inset-auto p-4 lg:p-6 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="bg-paper-2 h-full w-full rounded-[2rem] shadow-sm border border-border flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 lg:p-8">
            <h1 className="text-2xl font-bold font-display text-accent tracking-tight">
              Crypto<span className="text-ink-1">KOL</span>
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-ink-3 hover:text-accent lg:hidden transition-colors bg-accent-subtle p-2 rounded-full"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 lg:px-6 space-y-2 overflow-y-auto pb-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-accent text-white shadow-md shadow-accent/20 translate-x-1'
                      : 'text-ink-2 hover:bg-accent-subtle hover:text-accent hover:translate-x-1'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="w-6 h-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <ServerStatusWidget />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Top bar */}
        <header className="h-20 lg:hidden flex items-center px-6 shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-ink-1 hover:text-accent bg-paper-2 p-3 rounded-2xl shadow-sm border border-border transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center pr-12">
            <h1 className="text-xl font-bold font-display text-accent tracking-tight">
              Crypto<span className="text-ink-1">KOL</span>
            </h1>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:py-6 lg:pr-6 lg:pl-0 w-full rounded-tl-3xl lg:rounded-none">
          <div className="bg-paper-2 min-h-full rounded-[2rem] lg:rounded-[2.5rem] shadow-sm border border-border p-6 lg:p-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
